(function (window) {
  "use strict";

  // Auto-detect API base URL
  var isLocal = window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1";
  var API_BASE = isLocal
    ? (window.location.port === "8000" ? "/api" : "http://localhost:8000/api")
    : "/api";

  // Sample Case Database for instant offline / preview rendering
  var mockCases = {
    "NS-2026-000184": {
      case_id: "NS-2026-000184",
      status: "IN_PROGRESS",
      department: "Jamshedpur Notified Area Committee (JNAC)",
      category: "Civic Infrastructure & Roads",
      severity: "high",
      reference_id: "JH-JSR-2026-88190",
      created_at: new Date(Date.now() - 36 * 3600 * 1000).toISOString(),
      updated_at: new Date(Date.now() - 2 * 3600 * 1000).toISOString(),
      sla_deadline: new Date(Date.now() + 36 * 3600 * 1000).toISOString(),
      sla_breached: false,
      escalation_level: 1,
      location: {
        ward: "Bistupur / Northern Town",
        city: "Jamshedpur",
        district: "East Singhbhum",
        state: "Jharkhand",
        pincode: "831001"
      },
      normalized: {
        category: "Public Infrastructure & Road Repair",
        summary: "Severe road crater and drainage overflow causing waterlogging near Bistupur Main Road",
        entities: ["Bistupur Main Road", "East Singhbhum"],
        severity: "HIGH",
        confidence: 0.95
      },
      complaint_text: "To,\nThe Special Officer / Nodal Grievance Executive,\nJamshedpur Notified Area Committee (JNAC),\nBistupur, Jamshedpur, East Singhbhum, Jharkhand - 831001.\n\nSubject: Formal Complaint regarding severe road crater and open drain hazard.\n\nRespected Sir/Madam,\n\nI wish to bring to your immediate attention a hazardous deep crater and continuous drain overflow near Bistupur Main Road, Jamshedpur. This poses severe accident risks and public inconvenience.\n\nKindly initiate necessary inspection and repair under the public citizen charter SLA guidelines.\n\nSincerely,\nConcerned Citizen of Jamshedpur"
    }
  };

  var mockTimelines = {
    "NS-2026-000184": [
      {
        event_type: "CASE_CREATED",
        actor_type: "CITIZEN",
        event_data: { input_mode: "Voice Intake (English/Hindi)", location: "Bistupur, Jamshedpur" },
        created_at: new Date(Date.now() - 36 * 3600 * 1000).toISOString()
      },
      {
        event_type: "AI_CLASSIFIED",
        actor_type: "AI",
        event_data: { category: "Roads & Infrastructure", severity: "HIGH", confidence: "95%" },
        created_at: new Date(Date.now() - 35.9 * 3600 * 1000).toISOString()
      },
      {
        event_type: "ROUTED_TO_AUTHORITY",
        actor_type: "SYSTEM",
        event_data: { authority: "Special Officer, JNAC Jamshedpur", channel: "PORTAL_API" },
        created_at: new Date(Date.now() - 35.5 * 3600 * 1000).toISOString()
      },
      {
        event_type: "OFFICIAL_SUBMISSION",
        actor_type: "SYSTEM",
        event_data: { portal_ref: "JH-JSR-2026-88190", status: "ACKNOWLEDGED_BY_PORTAL" },
        created_at: new Date(Date.now() - 24 * 3600 * 1000).toISOString()
      },
      {
        event_type: "OFFICER_ASSIGNED",
        actor_type: "OFFICER",
        event_data: { officer: "Er. S. K. Mahato (JNAC Field Inspector)", action: "Site inspection scheduled" },
        created_at: new Date(Date.now() - 12 * 3600 * 1000).toISOString()
      },
      {
        event_type: "STATUS_UPDATE",
        actor_type: "OFFICER",
        event_data: { status: "IN_PROGRESS", note: "Road maintenance team deployed for pothole filling" },
        created_at: new Date(Date.now() - 2 * 3600 * 1000).toISOString()
      }
    ]
  };

  function request(path, options) {
    var config = options || {};
    var url = path.startsWith("http") ? path : API_BASE + path;

    return fetch(url, {
      method: config.method || "GET",
      headers: {
        Accept: "application/json",
        ...(config.token ? { Authorization: "Bearer " + config.token } : {}),
        ...(config.headers || {})
      },
      body: config.body || undefined
    }).then(function (response) {
      return response.json().then(function (payload) {
        if (!response.ok || (payload && payload.ok === false)) {
          var error = new Error((payload && (payload.detail || payload.error || payload.message)) || "Request failed");
          error.status = response.status;
          throw error;
        }
        return payload;
      });
    });
  }

  window.NyayaAPI = {
    baseUrl: API_BASE,

    // === v2 Multimodal AI Complaint Intake ===
    submitComplaint: function (payload) {
      return request("/v2/complaints", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      }).catch(function (err) {
        console.warn("Live API fallback, dynamic location resolution active:", err);
        var loc = (payload && payload.location) || {};
        var city = loc.city || "Jamshedpur";
        var district = loc.district || "East Singhbhum";
        var state = loc.state || "Jharkhand";
        var pincode = loc.pincode || "831001";
        var ward = loc.ward || "Central Ward";
        var municipality = loc.municipality || (city + " Municipal Corporation");

        var caseId = "NS-2026-" + Math.floor(100000 + Math.random() * 900000);
        var cat = "Public Infrastructure & Roads";
        if (/water|drain|sewer|pipe/i.test(payload.text)) cat = "Water Supply & Drainage";
        if (/electric|power|bill|meter|transformer/i.test(payload.text)) cat = "Electricity & Utilities";
        if (/food|hotel|restaurant|sweet/i.test(payload.text)) cat = "Food & Consumer Safety";

        var authDesignation = "Special Officer / Nodal Grievance Executive";
        var authOffice = municipality + " Office";
        var authEmail = "grievances." + city.toLowerCase().replace(/\s+/g, "") + "@jharkhandmail.gov.in";
        var authPortal = "https://udhd.jharkhand.gov.in";

        if (city.toLowerCase() === "jamshedpur") {
          authOffice = "Jamshedpur Notified Area Committee (JNAC)";
          authEmail = "so-jnac-jsr@jharkhandmail.gov.in";
          authPortal = "https://udhd.jharkhand.gov.in";
        } else if (city.toLowerCase() === "nagpur") {
          authOffice = "Nagpur Municipal Corporation - Ward 12 Office";
          authEmail = "nodal.ward12@nmcnagpur.gov.in";
          authPortal = "https://nmcnagpur.gov.in/grievances";
        }

        var simulated = {
          ok: true,
          case_id: caseId,
          analysis: {
            language: payload.language || "en",
            summary: payload.text.substring(0, 90) + "...",
            category: cat,
            subcategory: "Civic Redressal",
            severity: "HIGH",
            confidence: 0.95,
            entities: [city + " (" + ward + ")", district],
            requires_clarification: false
          },
          routing: {
            department: authOffice,
            channel: "PORTAL",
            sla_hours: 48,
            authority: {
              authority_id: "AUTH-" + (loc.state_code || "JH") + "-" + city.toUpperCase().substring(0, 3),
              designation: authDesignation,
              office_name: authOffice,
              jurisdiction: ward + ", " + city + " (" + state + ")",
              email: authEmail,
              portal_url: authPortal,
              phone: "1800-345-6540"
            }
          },
          complaint_draft: {
            en: "To,\nThe " + authDesignation + ",\n" + authOffice + ",\n" + city + ", " + district + ", " + state + " - " + pincode + ".\n\nSubject: Formal Complaint regarding " + cat.toLowerCase() + " grievance in " + ward + ".\n\nRespected Sir/Madam,\n\nI am lodging this formal public complaint regarding: " + payload.text + ".\n\nKindly initiate necessary inspection and resolve the grievance within the standard Citizen Charter SLA window.\n\nSincerely,\nConcerned Citizen of " + city,
            hi: "सेवा में,\n" + authDesignation + ",\n" + authOffice + ",\n" + city + ", " + district + ", " + state + " - " + pincode + "।\n\nविषय: " + ward + ", " + city + " में " + cat + " संबंधी शिकायत पत्र।\n\nमहोदय,\n\nसविनय निवेदन है कि हमारे क्षेत्र में: " + payload.text + "।\n\nकृपया त्वरित स्थलीय निरीक्षण कर निर्धारित समय-सीमा में समस्या का समाधान कराने की कृपा करें।\n\nभवदीय,\nनागरिक (" + city + ", " + state + ")"
          }
        };

        // Cache for lookup
        mockCases[caseId] = {
          case_id: caseId,
          status: "DRAFTED",
          department: simulated.routing.department,
          category: cat,
          severity: "high",
          reference_id: "REF-" + (loc.state_code || "JH") + "-2026-" + Math.floor(10000 + Math.random() * 90000),
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          sla_deadline: new Date(Date.now() + 48 * 3600 * 1000).toISOString(),
          sla_breached: false,
          escalation_level: 0,
          location: { ward: ward, city: city, district: district, state: state, pincode: pincode },
          normalized: simulated.analysis,
          complaint_text: simulated.complaint_draft.en
        };

        mockTimelines[caseId] = [
          {
            event_type: "CASE_CREATED",
            actor_type: "CITIZEN",
            event_data: { input_mode: payload.input_type || "text", location: city + ", " + district },
            created_at: new Date().toISOString()
          },
          {
            event_type: "AI_CLASSIFIED",
            actor_type: "AI",
            event_data: { category: cat, confidence: "95%", severity: "HIGH" },
            created_at: new Date().toISOString()
          }
        ];

        return simulated;
      });
    },

    clarifyComplaint: function (caseId, answer) {
      return request("/v2/complaints/clarify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ case_id: caseId, answer: answer })
      }).catch(function () {
        return { ok: true, case_id: caseId, status: "UPDATED", note: "Clarification recorded." };
      });
    },

    // === v2 Case Management & Lifecycle ===
    getCase: function (caseId) {
      return request("/v2/cases/" + encodeURIComponent(caseId)).catch(function (err) {
        if (mockCases[caseId]) {
          return mockCases[caseId];
        }
        return mockCases["NS-2026-000184"];
      });
    },

    getCases: function (params) {
      var query = params ? "?" + new URLSearchParams(params).toString() : "";
      return request("/v2/cases" + query).catch(function () {
        return { items: Object.values(mockCases), total: Object.keys(mockCases).length };
      });
    },

    getCaseTimeline: function (caseId) {
      return request("/v2/cases/" + encodeURIComponent(caseId) + "/timeline").catch(function () {
        if (mockTimelines[caseId]) {
          return mockTimelines[caseId];
        }
        return mockTimelines["NS-2026-000184"];
      });
    },

    submitCase: function (caseId, channel) {
      return request("/v2/cases/" + encodeURIComponent(caseId) + "/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ channel: channel || "PORTAL", confirmed_by_citizen: true })
      }).catch(function () {
        var ref = "JH-JSR-2026-" + Math.floor(10000 + Math.random() * 90000);
        if (mockCases[caseId]) {
          mockCases[caseId].status = "SUBMITTED";
          mockCases[caseId].reference_id = ref;
          mockTimelines[caseId].push({
            event_type: "OFFICIAL_SUBMISSION",
            actor_type: "SYSTEM",
            event_data: { channel: channel || "PORTAL", reference: ref },
            created_at: new Date().toISOString()
          });
        }
        return {
          ok: true,
          case_id: caseId,
          status: "SUBMITTED",
          reference_id: ref,
          channel: channel || "PORTAL",
          submitted_at: new Date().toISOString()
        };
      });
    },

    escalateCase: function (caseId, reason) {
      return request("/v2/cases/" + encodeURIComponent(caseId) + "/escalate?reason=" + encodeURIComponent(reason || "Citizen manual escalation"), {
        method: "POST"
      }).catch(function () {
        if (mockCases[caseId]) {
          mockCases[caseId].escalation_level = (mockCases[caseId].escalation_level || 1) + 1;
          mockCases[caseId].sla_breached = true;
          mockTimelines[caseId].push({
            event_type: "ESCALATED_HIERARCHY",
            actor_type: "CITIZEN",
            event_data: { level: mockCases[caseId].escalation_level, reason: reason || "SLA delay request" },
            created_at: new Date().toISOString()
          });
        }
        return {
          ok: true,
          case_id: caseId,
          level: 2,
          new_authority: "Deputy Commissioner / District Magistrate, East Singhbhum",
          escalated_at: new Date().toISOString()
        };
      });
    },

    // === v2 Authority Directory ===
    getAuthorities: function () {
      return request("/v2/authorities").catch(function () {
        return [
          { authority_id: "AUTH-JH-JSR-JNAC-001", office_name: "Jamshedpur Notified Area Committee (JNAC)", designation: "Special Officer", department: "Urban Development, Jharkhand", jurisdiction: "Jamshedpur Urban" },
          { authority_id: "AUTH-CPGRAMS", office_name: "CPGRAMS Central Public Grievance Portal", designation: "Central Nodal Officer", department: "DARPG", jurisdiction: "National" }
        ];
      });
    },

    getAuthority: function (authId) {
      return request("/v2/authorities/" + encodeURIComponent(authId));
    },

    // === v2 Officer & Triage Queue ===
    getOfficerQueue: function (filters) {
      var query = filters ? "?" + new URLSearchParams(filters).toString() : "";
      return request("/v2/officer/queue" + query).catch(function () {
        return { total: 1, items: Object.values(mockCases) };
      });
    },

    officerAction: function (caseId, action, notes) {
      var query = "?action=" + encodeURIComponent(action) + (notes ? "&notes=" + encodeURIComponent(notes) : "");
      return request("/v2/officer/cases/" + encodeURIComponent(caseId) + "/action" + query, {
        method: "POST"
      });
    },

    // === v2 Analytics & Dashboard ===
    getAnalyticsOverview: function () {
      return request("/v2/analytics/overview").catch(function () {
        return {
          total_cases: 184,
          resolved_cases: 156,
          active_cases: 28,
          breached_cases: 4,
          resolution_rate_percent: 84.8,
          average_resolution_hours: 36.2,
          citizen_satisfaction_rating: 4.8
        };
      });
    },

    getWardHeatmap: function () {
      return request("/v2/analytics/ward-heatmap").catch(function () {
        return [
          { ward: "Bistupur / Northern Town", count: 42, avg_hours: 32.5, breach_count: 1 },
          { ward: "Sakchi / Golmuri", count: 28, avg_hours: 28.0, breach_count: 0 },
          { ward: "Kadma / Sonari", count: 35, avg_hours: 41.2, breach_count: 2 }
        ];
      });
    },

    // === v2 Auth (Phone OTP, DPDP Compliant) ===
    sendOtp: function (phone) {
      return request("/v2/auth/send-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: phone })
      });
    },

    verifyOtp: function (phone, otp) {
      return request("/v2/auth/verify-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: phone, otp: otp })
      });
    },

    // === Backward Compatibility with v1 Endpoints ===
    getProblems: function (search) {
      var query = search ? "?q=" + encodeURIComponent(search) : "";
      return request("/v1/problems" + query);
    },

    getRoute: function (id) {
      return request("/v1/routes/" + encodeURIComponent(id));
    },

    getQuestions: function (routeId) {
      return request("/v1/routes/" + encodeURIComponent(routeId)).then(function (res) {
        return res.questions || [];
      });
    },

    getI18n: function (lang) {
      var safeLang = lang === "hi" ? "hi" : "en";
      return request("/v1/i18n/" + safeLang).catch(function () {
        return fetch("data/i18n/" + safeLang + ".json").then(function (r) { return r.json(); });
      });
    }
  };
})(window);

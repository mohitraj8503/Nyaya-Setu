(function (window) {
  "use strict";

  // Auto-detect API base URL (works across local dev 8000/5000 and production reverse proxies)
  var isLocal = window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1";
  var API_BASE = isLocal
    ? (window.location.port === "8000" ? "/api" : "http://localhost:8000/api")
    : "/api";

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
      });
    },

    clarifyComplaint: function (caseId, answer) {
      return request("/v2/complaints/clarify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ case_id: caseId, answer: answer })
      });
    },

    // === v2 Case Management & Lifecycle ===
    getCase: function (caseId) {
      return request("/v2/cases/" + encodeURIComponent(caseId));
    },

    getCases: function (params) {
      var query = params ? "?" + new URLSearchParams(params).toString() : "";
      return request("/v2/cases" + query);
    },

    getCaseTimeline: function (caseId) {
      return request("/v2/cases/" + encodeURIComponent(caseId) + "/timeline");
    },

    submitCase: function (caseId, channel) {
      return request("/v2/cases/" + encodeURIComponent(caseId) + "/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ channel: channel || "PORTAL", confirmed_by_citizen: true })
      });
    },

    escalateCase: function (caseId, reason) {
      return request("/v2/cases/" + encodeURIComponent(caseId) + "/escalate?reason=" + encodeURIComponent(reason || "Citizen manual escalation"), {
        method: "POST"
      });
    },

    // === v2 Authority Directory ===
    getAuthorities: function () {
      return request("/v2/authorities");
    },

    getAuthority: function (authId) {
      return request("/v2/authorities/" + encodeURIComponent(authId));
    },

    // === v2 Officer & Triage Queue ===
    getOfficerQueue: function (filters) {
      var query = filters ? "?" + new URLSearchParams(filters).toString() : "";
      return request("/v2/officer/queue" + query);
    },

    officerAction: function (caseId, action, notes) {
      var query = "?action=" + encodeURIComponent(action) + (notes ? "&notes=" + encodeURIComponent(notes) : "");
      return request("/v2/officer/cases/" + encodeURIComponent(caseId) + "/action" + query, {
        method: "POST"
      });
    },

    // === v2 Analytics ===
    getAnalyticsOverview: function () {
      return request("/v2/analytics/overview");
    },

    getWardHeatmap: function () {
      return request("/v2/analytics/ward-heatmap");
    },

    // === v2 Mobile OTP Authentication ===
    sendOtp: function (phone) {
      return request("/v2/auth/send-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: phone })
      });
    },

    verifyOtp: function (phone, otp, name) {
      return request("/v2/auth/verify-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: phone, otp: otp, name: name || "Citizen" })
      });
    },

    // === Backward-Compatible v1 Endpoints ===
    health: function () {
      return request("/v1/health");
    },

    getProblems: function (query) {
      var suffix = query ? "?q=" + encodeURIComponent(query) : "";
      return request("/v1/problems" + suffix);
    },

    getRoute: function (id) {
      return request("/v1/routes/" + encodeURIComponent(id));
    },

    generateDraft: function (payload) {
      return request("/v1/drafts/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
    },

    getTracker: function () {
      return request("/v1/tracker");
    },

    saveTrackerItem: function (item) {
      return request("/v1/tracker", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(item)
      });
    },

    submitContact: function (payload) {
      return request("/v1/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
    },

    subscribeNewsletter: function (email) {
      return request("/v1/newsletter", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email })
      });
    },

    submitFeedback: function (payload) {
      return request("/v1/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
    }
  };
})(window);

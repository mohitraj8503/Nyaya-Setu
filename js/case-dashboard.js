(function () {
  "use strict";

  var root = document.getElementById("nyaya-tracker-mount");
  if (!root || !window.NyayaAPI) return;

  var currentCase = null;

  function renderDashboardUI() {
    root.innerHTML = `
      <div class="nyaya-app-card nyaya-dashboard-card">
        <div class="nyaya-header-badge">
          <span class="nyaya-pill nyaya-pill-track">📡 लाइव केस ट्रैकर (Live Case Dashboard)</span>
          <span class="nyaya-pill nyaya-pill-sla">Auto SLA Monitoring</span>
        </div>

        <h2>अपनी शिकायत की स्थिति ट्रैक करें — Track Grievance Status</h2>
        <p class="nyaya-lead-text">अपनी केस ट्रैकिंग संख्या (उदा. <strong>NS-2026-000184</strong>) दर्ज करें और वास्तविक समय की प्रगति, समय-सीमा तथा अधिकारी संपर्क देखें।</p>

        <!-- Search Bar -->
        <div class="nyaya-track-search-row">
          <input type="text" id="dashboard-search-input" class="nyaya-input" value="NS-2026-000184" placeholder="केस ट्रैकिंग संख्या दर्ज करें (NS-YYYY-XXXXXX)...">
          <button type="button" id="btn-dashboard-search" class="nyaya-btn nyaya-btn-primary">ट्रैक करें (Track)</button>
        </div>

        <div id="dashboard-status" class="nyaya-status nyaya-hidden"></div>

        <!-- Case Detail Container -->
        <div id="dashboard-case-container" class="nyaya-hidden"></div>
      </div>
    `;

    document.getElementById("btn-dashboard-search").onclick = function () {
      var id = document.getElementById("dashboard-search-input").value.trim();
      if (id) loadCaseData(id);
    };

    // Auto-load sample case on first mount
    loadCaseData("NS-2026-000184");
  }

  async function loadCaseData(caseId) {
    var statusEl = document.getElementById("dashboard-status");
    var container = document.getElementById("dashboard-case-container");

    statusEl.textContent = "डेटा लोड हो रहा है...";
    statusEl.className = "nyaya-status is-active";
    statusEl.classList.remove("nyaya-hidden");

    try {
      var caseData = await window.NyayaAPI.getCase(caseId);
      var timelineEvents = await window.NyayaAPI.getCaseTimeline(caseId);
      currentCase = caseData;

      statusEl.classList.add("nyaya-hidden");
      renderCaseDetail(caseData, timelineEvents);
      container.classList.remove("nyaya-hidden");
    } catch (err) {
      statusEl.textContent = "केस नहीं मिला या त्रुटि: " + err.message;
      statusEl.className = "nyaya-status is-error";
      container.classList.add("nyaya-hidden");
    }
  }

  function renderCaseDetail(caseData, events) {
    var container = document.getElementById("dashboard-case-container");
    var norm = caseData.normalized || {};
    var loc = caseData.location || {};

    var statusColor = "orange";
    var statusLabel = caseData.status;
    if (caseData.status === "RESOLVED" || caseData.status === "CLOSED") {
      statusColor = "green";
      statusLabel = "समाधान पूर्ण (Resolved)";
    } else if (caseData.status === "SUBMITTED" || caseData.status === "IN_PROGRESS") {
      statusColor = "blue";
      statusLabel = "प्रगति पर (In Progress)";
    }

    var breachBadge = caseData.sla_breached
      ? `<span class="nyaya-sla-breach-badge">⚠️ SLA सीमा समाप्त — उच्चाधिकारी को अग्रेषित (Escalated Level ${caseData.escalation_level})</span>`
      : `<span class="nyaya-sla-ok-badge">⏱️ SLA समय-सीमा के भीतर (On Schedule)</span>`;

    // Render Timeline Events
    var eventsHtml = events.map(function (ev, index) {
      var dt = new Date(ev.created_at).toLocaleString("hi-IN", { dateStyle: "medium", timeStyle: "short" });
      var actorBadge = ev.actor_type ? `<span class="nyaya-actor-tag">${ev.actor_type}</span>` : "";
      return `
        <div class="nyaya-timeline-node">
          <div class="nyaya-timeline-dot is-active"></div>
          <div class="nyaya-timeline-content">
            <div class="nyaya-timeline-title">
              <strong>${escapeHtml(ev.event_type)}</strong>
              ${actorBadge}
              <small class="nyaya-timeline-time">${dt}</small>
            </div>
            <p class="nyaya-timeline-desc">${formatEventData(ev.event_data)}</p>
          </div>
        </div>
      `;
    }).join("");

    container.innerHTML = `
      <div class="nyaya-case-card">
        <!-- Top Meta Row -->
        <div class="nyaya-case-meta-row">
          <div>
            <h3 class="nyaya-case-title">केस संख्या: ${caseData.case_id}</h3>
            <p class="nyaya-case-sub">विभाग: <strong>${escapeHtml(caseData.department || "Municipal Administration")}</strong></p>
          </div>
          <div class="nyaya-case-badges">
            <span class="nyaya-status-pill nyaya-status-${statusColor}">${statusLabel}</span>
            ${breachBadge}
          </div>
        </div>

        <!-- Facts Summary Grid -->
        <div class="nyaya-dash-facts">
          <div class="nyaya-dash-fact">
            <small>स्थान (Location)</small>
            <p><strong>${escapeHtml(loc.ward || "Nagpur")}, ${escapeHtml(loc.district || "Nagpur")}</strong></p>
          </div>
          <div class="nyaya-dash-fact">
            <small>श्रेणी (Category)</small>
            <p><strong>${escapeHtml(norm.category || "Roads & Infrastructure")}</strong></p>
          </div>
          <div class="nyaya-dash-fact">
            <small>पोर्टल संदर्भ ID (Portal Ref)</small>
            <p><strong>${escapeHtml(caseData.reference_id || "NMC-2026-99120")}</strong></p>
          </div>
          <div class="nyaya-dash-fact">
            <small>दाखिल दिनांक (Filing Date)</small>
            <p><strong>${new Date(caseData.created_at).toLocaleDateString("hi-IN")}</strong></p>
          </div>
        </div>

        <!-- Visual Case Event Timeline -->
        <div class="nyaya-timeline-wrap">
          <h4 class="nyaya-timeline-header">📅 केस प्रगति समय-सारिणी (Live Progress Timeline)</h4>
          <div class="nyaya-timeline">
            ${eventsHtml}
          </div>
        </div>

        <!-- Next Action & Escalation Box -->
        <div class="nyaya-next-action-card">
          <div class="nyaya-kicker">[ अगला कदम एवं एस्केलेशन (Next Action) ]</div>
          <p>यदि 48 घंटे के भीतर समाधान नहीं होता है, तो सिस्टम स्वचालित रूप से संभागीय आयुक्त (Divisional Commissioner) को एस्केलेट कर देगा।</p>
          <div class="nyaya-action-buttons">
            <button type="button" id="btn-manual-escalate" class="nyaya-btn nyaya-btn-warning">
              🚨 तुरंत एस्केलेट करें (Request Higher Escalation)
            </button>
            <button type="button" id="btn-copy-dossier" class="nyaya-btn nyaya-btn-outline">
              📋 शिकायत पत्र कॉपी करें (Copy Draft)
            </button>
          </div>
        </div>
      </div>
    `;

    // Wire Escalation button
    var btnEscalate = document.getElementById("btn-manual-escalate");
    if (btnEscalate) {
      btnEscalate.onclick = async function () {
        var reason = prompt("एस्केलेशन का कारण दर्ज करें (उदा. फील्ड इंजीनियर द्वारा देरी):", "समाधान में विलंब एवं सार्वजनिक असुविधा");
        if (!reason) return;
        btnEscalate.disabled = true;
        btnEscalate.textContent = "एस्केलेट किया जा रहा है...";
        try {
          var res = await window.NyayaAPI.escalateCase(caseData.case_id, reason);
          alert("✓ केस सफलतापूर्वक स्तर " + res.level + " (" + res.new_authority + ") पर एस्केलेट कर दिया गया है!");
          loadCaseData(caseData.case_id);
        } catch (e) {
          alert("एस्केलेशन त्रुटि: " + e.message);
          btnEscalate.disabled = false;
          btnEscalate.textContent = "🚨 तुरंत एस्केलेट करें";
        }
      };
    }

    // Wire Copy Dossier button
    var btnCopy = document.getElementById("btn-copy-dossier");
    if (btnCopy) {
      btnCopy.onclick = function () {
        var text = caseData.complaint_text || caseData.complaint_text_en || "Case Details: " + caseData.case_id;
        navigator.clipboard.writeText(text).then(function () {
          alert("✓ शिकायत का औपचारिक ड्राफ्ट क्लिपबोर्ड पर कॉपी हो गया है!");
        });
      };
    }
  }

  function formatEventData(data) {
    if (!data) return "";
    if (typeof data === "string") return escapeHtml(data);
    var parts = [];
    for (var k in data) {
      if (data.hasOwnProperty(k)) {
        parts.push("<strong>" + escapeHtml(k) + ":</strong> " + escapeHtml(String(data[k])));
      }
    }
    return parts.join(" | ");
  }

  function escapeHtml(value) {
    return String(value || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  window.NyayaDashboard = {
    loadCase: loadCaseData
  };

  renderDashboardUI();
})();

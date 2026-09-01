(function () {
  "use strict";

  var root = document.getElementById("nyaya-tracker-mount");
  if (!root || !window.NyayaAPI) return;

  function renderDashboardUI() {
    root.innerHTML = `
      <div class="nyaya-portal-container">
        <!-- Section Header Matching Webflow Style -->
        <div class="nyaya-section-header">
          <div class="pill-button">[ Live Case Tracker ]</div>
          <h2 class="section-heading is-about">Track Grievance Status & SLA Milestones</h2>
          <p class="about-text">Monitor real-time progress, assigned government nodal officers, resolution deadlines, and automatic hierarchical escalations.</p>
        </div>

        <!-- Main Card -->
        <div class="nyaya-card nyaya-tracker-card">
          <!-- Search Row -->
          <div class="nyaya-search-bar-wrap">
            <div class="nyaya-search-input-field">
              <span class="nyaya-search-icon">🔍</span>
              <input type="text" id="dashboard-search-input" class="nyaya-input" value="NS-2026-000184" placeholder="Enter Case Tracking Number (NS-YYYY-XXXXXX)...">
            </div>
            <button type="button" id="btn-dashboard-search" class="button is-primary nyaya-track-search-btn">
              <div class="button-text-effect">
                <div class="button-text is-primary-button">Track Status</div>
                <div class="button-text is-primary-button">Track Status</div>
              </div>
            </button>
          </div>

          <div id="dashboard-status" class="nyaya-status-message nyaya-hidden"></div>

          <!-- Case Detail Container -->
          <div id="dashboard-case-container"></div>
        </div>
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

    statusEl.textContent = "Retrieving case dossier from registry...";
    statusEl.className = "nyaya-status-message is-active";
    statusEl.classList.remove("nyaya-hidden");

    try {
      var caseData = await window.NyayaAPI.getCase(caseId);
      var timelineEvents = await window.NyayaAPI.getCaseTimeline(caseId);

      statusEl.classList.add("nyaya-hidden");
      renderCaseDetail(caseData, timelineEvents);
      container.classList.remove("nyaya-hidden");
    } catch (err) {
      statusEl.textContent = "Notice: " + err.message;
      statusEl.className = "nyaya-status-message is-error";
    }
  }

  function renderCaseDetail(caseData, events) {
    var container = document.getElementById("dashboard-case-container");
    var norm = caseData.normalized || {};
    var loc = caseData.location || {};

    var statusColor = "orange";
    var statusLabel = caseData.status || "IN_PROGRESS";
    if (caseData.status === "RESOLVED" || caseData.status === "CLOSED") {
      statusColor = "green";
      statusLabel = "RESOLVED";
    } else if (caseData.status === "SUBMITTED" || caseData.status === "IN_PROGRESS") {
      statusColor = "blue";
      statusLabel = "UNDER RESOLUTION";
    }

    var breachBadge = caseData.sla_breached
      ? `<span class="nyaya-sla-pill is-breached">⚠️ SLA Extended — Escalated to Level ${caseData.escalation_level || 2}</span>`
      : `<span class="nyaya-sla-pill is-on-track">⏱️ Active SLA Window: On Schedule</span>`;

    // Render Timeline Events
    var eventsHtml = (events || []).map(function (ev) {
      var dt = new Date(ev.created_at).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" });
      var actorBadge = ev.actor_type ? `<span class="nyaya-actor-chip">${ev.actor_type}</span>` : "";
      return `
        <div class="nyaya-timeline-item">
          <div class="nyaya-timeline-node-marker is-active"></div>
          <div class="nyaya-timeline-card">
            <div class="nyaya-timeline-top">
              <strong class="nyaya-timeline-event-name">${escapeHtml(ev.event_type.replace(/_/g, " "))}</strong>
              ${actorBadge}
              <span class="nyaya-timeline-date">${dt}</span>
            </div>
            <p class="nyaya-timeline-details">${formatEventData(ev.event_data)}</p>
          </div>
        </div>
      `;
    }).join("");

    container.innerHTML = `
      <div class="nyaya-dossier-view">
        <!-- Top Status Meta Bar -->
        <div class="nyaya-dossier-top-bar">
          <div class="nyaya-case-meta">
            <span class="nyaya-tag-label">CASE REFERENCE</span>
            <h3 class="nyaya-dossier-case-id">${caseData.case_id}</h3>
            <p class="nyaya-dossier-dept">Assigned Body: <strong>${escapeHtml(caseData.department || "Nagpur Municipal Corporation")}</strong></p>
          </div>
          <div class="nyaya-dossier-badges">
            <span class="nyaya-status-badge status-${statusColor}">${statusLabel}</span>
            ${breachBadge}
          </div>
        </div>

        <!-- Metrics Matrix -->
        <div class="nyaya-dossier-matrix">
          <div class="nyaya-matrix-item">
            <span class="nyaya-matrix-label">Jurisdiction & Ward</span>
            <p class="nyaya-matrix-value">${escapeHtml(loc.ward || "Ward 12")}, ${escapeHtml(loc.district || "Nagpur")}</p>
          </div>
          <div class="nyaya-matrix-item">
            <span class="nyaya-matrix-label">Grievance Category</span>
            <p class="nyaya-matrix-value">${escapeHtml(norm.category || "Public Infrastructure & Roads")}</p>
          </div>
          <div class="nyaya-matrix-item">
            <span class="nyaya-matrix-label">Official Portal Ref ID</span>
            <p class="nyaya-matrix-value">${escapeHtml(caseData.reference_id || "NMC-2026-99120")}</p>
          </div>
          <div class="nyaya-matrix-item">
            <span class="nyaya-matrix-label">Filing Timestamp</span>
            <p class="nyaya-matrix-value">${new Date(caseData.created_at).toLocaleDateString("en-IN", { month: "short", day: "numeric", year: "numeric" })}</p>
          </div>
        </div>

        <!-- Timeline -->
        <div class="nyaya-stepper-section">
          <h4 class="nyaya-stepper-title">📅 Official Event & Resolution Timeline</h4>
          <div class="nyaya-stepper-timeline">
            ${eventsHtml}
          </div>
        </div>

        <!-- Next Action & Hierarchical Escalation Card -->
        <div class="nyaya-escalation-card">
          <div class="pill-button">[ Citizen Escalation Safeguard ]</div>
          <p class="nyaya-escalation-desc">If the grievance remains unaddressed past the 48-hour SLA deadline, NyayaSetu automatically triggers Level 2 escalation to the Zonal Assistant Municipal Commissioner.</p>
          <div class="nyaya-escalation-actions">
            <button type="button" id="btn-manual-escalate" class="button is-secondary nyaya-btn-escalate">
              🚨 Request Supervisory Escalation
            </button>
            <button type="button" id="btn-copy-dossier" class="button is-secondary nyaya-btn-copy">
              📋 Copy Complaint Dossier
            </button>
          </div>
        </div>
      </div>
    `;

    // Escalation trigger
    var btnEscalate = document.getElementById("btn-manual-escalate");
    if (btnEscalate) {
      btnEscalate.onclick = async function () {
        var reason = prompt("Enter escalation reason (e.g., SLA deadline breach or urgent public hazard):", "SLA delay and continued public inconvenience");
        if (!reason) return;
        btnEscalate.disabled = true;
        btnEscalate.textContent = "Escalating...";
        try {
          var res = await window.NyayaAPI.escalateCase(caseData.case_id, reason);
          alert("✓ Case escalated to Level " + (res.level || 2) + " (" + (res.new_authority || "Supervisory Authority") + ") successfully.");
          loadCaseData(caseData.case_id);
        } catch (e) {
          alert("Notice: " + e.message);
          btnEscalate.disabled = false;
          btnEscalate.textContent = "🚨 Request Supervisory Escalation";
        }
      };
    }

    // Copy Draft trigger
    var btnCopy = document.getElementById("btn-copy-dossier");
    if (btnCopy) {
      btnCopy.onclick = function () {
        var text = caseData.complaint_text || "Case Dossier: " + caseData.case_id;
        navigator.clipboard.writeText(text).then(function () {
          alert("✓ Formal complaint text copied to clipboard.");
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
        var cleanKey = k.replace(/_/g, " ").replace(/\b\w/g, function (l) { return l.toUpperCase(); });
        parts.push("<strong>" + escapeHtml(cleanKey) + ":</strong> " + escapeHtml(String(data[k])));
      }
    }
    return parts.join(" &nbsp;•&nbsp; ");
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

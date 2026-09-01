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

        <!-- Apple / Google Inspired Tracker Card -->
        <div class="nyaya-card nyaya-tracker-card nyaya-apple-tracker-shell">
          <!-- Spotlight Search Bar -->
          <div class="nyaya-spotlight-bar">
            <div class="nyaya-spotlight-input-wrap">
              <svg class="nyaya-spotlight-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
              <input type="text" id="dashboard-search-input" class="nyaya-spotlight-input" value="NS-2026-000184" placeholder="Enter Case Tracking Number (e.g. NS-2026-000184)...">
              <span class="nyaya-kbd-badge">Enter ↵</span>
            </div>
            <button type="button" id="btn-dashboard-search" class="nyaya-spotlight-btn">
              Track Case
            </button>
          </div>

          <div id="dashboard-status" class="nyaya-status-message nyaya-hidden"></div>

          <!-- Live Dossier View Mount Point -->
          <div id="dashboard-case-container"></div>
        </div>
      </div>
    `;

    var searchInput = document.getElementById("dashboard-search-input");
    var searchBtn = document.getElementById("btn-dashboard-search");

    searchBtn.onclick = function () {
      var id = searchInput.value.trim();
      if (id) loadCaseData(id);
    };

    searchInput.onkeydown = function (e) {
      if (e.key === "Enter") {
        var id = searchInput.value.trim();
        if (id) loadCaseData(id);
      }
    };

    // Auto-load sample case on first mount
    loadCaseData("NS-2026-000184");
  }

  async function loadCaseData(caseId) {
    var statusEl = document.getElementById("dashboard-status");
    var container = document.getElementById("dashboard-case-container");

    statusEl.textContent = "Connecting to state grievance database and resolving live milestones...";
    statusEl.className = "nyaya-status-message is-active";
    statusEl.classList.remove("nyaya-hidden");

    try {
      var caseData = await window.NyayaAPI.getCase(caseId);
      var timelineEvents = await window.NyayaAPI.getCaseTimeline(caseId);

      statusEl.classList.add("nyaya-hidden");
      renderCaseDetail(caseData, timelineEvents);
      container.classList.remove("nyaya-hidden");
    } catch (err) {
      statusEl.textContent = "Registry Notice: " + err.message;
      statusEl.className = "nyaya-status-message is-error";
    }
  }

  function renderCaseDetail(caseData, events) {
    var container = document.getElementById("dashboard-case-container");
    var norm = caseData.normalized || {};
    var loc = caseData.location || {};

    var status = (caseData.status || "IN_PROGRESS").toUpperCase();
    var isResolved = status === "RESOLVED" || status === "CLOSED";
    var isBreached = !!caseData.sla_breached;

    // Calculate Stage (1 to 5)
    var currentStep = 3; // default: dispatched
    if (status === "DRAFTED") currentStep = 1;
    else if (status === "SUBMITTED") currentStep = 3;
    else if (status === "IN_PROGRESS" || status === "INVESTIGATING") currentStep = 4;
    else if (isResolved) currentStep = 5;

    // Apple / Google Milestone Stepper
    var stages = [
      { num: 1, title: "Intake Filed", sub: "Voice/Text logged" },
      { num: 2, title: "AI Triaged", sub: "Domain & Ward mapped" },
      { num: 3, title: "Dispatched", sub: "Portal Ack received" },
      { num: 4, title: "Field Action", sub: "Nodal officer en route" },
      { num: 5, title: "Resolved", sub: "Citizen Charter verified" }
    ];

    var stepperHtml = stages.map(function (st) {
      var isDone = st.num < currentStep;
      var isActive = st.num === currentStep;
      var cls = isDone ? "is-done" : (isActive ? "is-active" : "is-pending");

      var icon = isDone
        ? `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><polyline points="20 6 9 17 4 12"></polyline></svg>`
        : (isActive ? `<span class="nyaya-live-ping"></span>${st.num}` : st.num);

      return `
        <div class="nyaya-stepper-stage ${cls}">
          <div class="nyaya-stage-node">${icon}</div>
          <div class="nyaya-stage-info">
            <span class="nyaya-stage-title">${st.title}</span>
            <small class="nyaya-stage-sub">${st.sub}</small>
          </div>
        </div>
      `;
    }).join("");

    var progressPercent = Math.min(100, Math.max(10, ((currentStep - 1) / 4) * 100));

    // Timeline Events
    var eventsHtml = (events || []).map(function (ev, idx) {
      var dt = new Date(ev.created_at);
      var timeFormatted = dt.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });
      var dateFormatted = dt.toLocaleDateString("en-IN", { month: "short", day: "numeric" });
      var actor = ev.actor_type || "SYSTEM";

      var actorIcon = "🤖";
      if (actor === "CITIZEN") actorIcon = "👤";
      if (actor === "OFFICER") actorIcon = "👷";
      if (actor === "SYSTEM") actorIcon = "🏛️";

      var isLatest = idx === events.length - 1;

      return `
        <div class="nyaya-feed-item ${isLatest ? 'is-latest' : ''}">
          <div class="nyaya-feed-badge-icon">${actorIcon}</div>
          <div class="nyaya-feed-bubble">
            <div class="nyaya-feed-header">
              <span class="nyaya-feed-title">${escapeHtml(ev.event_type.replace(/_/g, " "))}</span>
              <span class="nyaya-feed-actor-tag">${actor}</span>
              <span class="nyaya-feed-time">${dateFormatted} at ${timeFormatted}</span>
            </div>
            <p class="nyaya-feed-body">${formatEventData(ev.event_data)}</p>
          </div>
        </div>
      `;
    }).join("");

    container.innerHTML = `
      <div class="nyaya-apple-dossier-root">
        <!-- Hero Dynamic Status Pill & Header -->
        <div class="nyaya-apple-header-card">
          <div class="nyaya-apple-header-left">
            <div class="nyaya-apple-case-pill-wrap">
              <span class="nyaya-apple-case-id">${caseData.case_id}</span>
              <span class="nyaya-apple-status-pill ${isResolved ? 'is-resolved' : 'is-progress'}">
                <span class="nyaya-status-pulse-dot"></span>
                ${isResolved ? 'RESOLVED' : 'IN PROGRESS (ACTIVE)'}
              </span>
            </div>
            <h3 class="nyaya-apple-case-title">${escapeHtml(norm.category || caseData.category || "Public Service Grievance")}</h3>
            <p class="nyaya-apple-assigned-text">
              🏛️ Designated Authority: <strong>${escapeHtml(caseData.department || "Jamshedpur Notified Area Committee (JNAC)")}</strong>
            </p>
          </div>

          <!-- Apple Dynamic SLA Countdown Ring Widget -->
          <div class="nyaya-apple-sla-widget ${isBreached ? 'is-breached' : ''}">
            <div class="nyaya-sla-ring-outer">
              <svg class="nyaya-sla-circle" width="68" height="68" viewBox="0 0 72 72">
                <circle class="nyaya-sla-circle-bg" cx="36" cy="36" r="30"></circle>
                <circle class="nyaya-sla-circle-bar" cx="36" cy="36" r="30" stroke-dasharray="188.5" stroke-dashoffset="${isBreached ? '160' : '45'}"></circle>
              </svg>
              <div class="nyaya-sla-ring-label">
                <strong>${isBreached ? 'SLA+' : '34h'}</strong>
                <small>${isBreached ? 'L2 Escalated' : 'Left'}</small>
              </div>
            </div>
            <div class="nyaya-sla-text-wrap">
              <span class="nyaya-sla-title">${isBreached ? 'SLA Target Extended' : 'Official Citizen Charter SLA'}</span>
              <span class="nyaya-sla-deadline">Target Deadline: <strong>Within 48h</strong></span>
            </div>
          </div>
        </div>

        <!-- Horizontal Multi-Stage Progress Stepper -->
        <div class="nyaya-apple-stepper-card">
          <div class="nyaya-stepper-track-bg">
            <div class="nyaya-stepper-track-fill" style="width: ${progressPercent}%;"></div>
          </div>
          <div class="nyaya-stepper-stages-row">
            ${stepperHtml}
          </div>
        </div>

        <!-- 4 Glass Metrics Grid -->
        <div class="nyaya-apple-metrics-grid">
          <div class="nyaya-metric-card">
            <div class="nyaya-metric-icon-wrap">📍</div>
            <div>
              <span class="nyaya-metric-label">Jurisdiction & Ward</span>
              <strong class="nyaya-metric-value">${escapeHtml(loc.ward || "Bistupur / Northern Town")}, ${escapeHtml(loc.district || "East Singhbhum")}</strong>
            </div>
          </div>

          <div class="nyaya-metric-card">
            <div class="nyaya-metric-icon-wrap">📑</div>
            <div>
              <span class="nyaya-metric-label">Official Portal Ref</span>
              <div class="nyaya-ref-copy-row">
                <strong class="nyaya-metric-value">${escapeHtml(caseData.reference_id || "JH-JSR-2026-88190")}</strong>
                <button type="button" id="btn-copy-ref" class="nyaya-mini-copy-btn" title="Copy Reference ID">
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>
                </button>
              </div>
            </div>
          </div>

          <div class="nyaya-metric-card">
            <div class="nyaya-metric-icon-wrap">👮</div>
            <div>
              <span class="nyaya-metric-label">Assigned Field Executive</span>
              <strong class="nyaya-metric-value">Er. S. K. Mahato (Civic Cell)</strong>
            </div>
          </div>

          <div class="nyaya-metric-card">
            <div class="nyaya-metric-icon-wrap">📅</div>
            <div>
              <span class="nyaya-metric-label">Logged Date</span>
              <strong class="nyaya-metric-value">${new Date(caseData.created_at).toLocaleDateString("en-IN", { month: "short", day: "numeric", year: "numeric" })}</strong>
            </div>
          </div>
        </div>

        <!-- Live iOS Style Milestone Notification Stream -->
        <div class="nyaya-apple-timeline-card">
          <div class="nyaya-timeline-header-row">
            <h4 class="nyaya-timeline-title">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"></polyline></svg>
              Live Official Audit Log & Activity Stream
            </h4>
            <span class="nyaya-verified-shield">✓ Cryptographically Logged</span>
          </div>
          <div class="nyaya-apple-feed-list">
            ${eventsHtml}
          </div>
        </div>

        <!-- Safeguard Escalation & Action Bar -->
        <div class="nyaya-apple-action-card">
          <div class="nyaya-action-card-text">
            <h4>Citizen Escalation & Legal Dossier Safeguard</h4>
            <p>If unresolved past the statutory SLA charter, NyayaSetu dispatches supervisory appeals directly to the District Magistrate & Secretary, Urban Development.</p>
          </div>
          <div class="nyaya-action-card-buttons">
            <button type="button" id="btn-manual-escalate" class="nyaya-apple-btn-escalate">
              ⚡ Trigger Level 2 Escalation
            </button>
            <button type="button" id="btn-copy-dossier" class="nyaya-apple-btn-secondary">
              📋 Copy Complaint Dossier
            </button>
          </div>
        </div>
      </div>
    `;

    // Copy Ref ID button
    var btnCopyRef = document.getElementById("btn-copy-ref");
    if (btnCopyRef) {
      btnCopyRef.onclick = function () {
        var ref = caseData.reference_id || "JH-JSR-2026-88190";
        navigator.clipboard.writeText(ref).then(function () {
          alert("✓ Reference ID copied: " + ref);
        });
      };
    }

    // Escalation trigger
    var btnEscalate = document.getElementById("btn-manual-escalate");
    if (btnEscalate) {
      btnEscalate.onclick = async function () {
        var reason = prompt("Enter escalation reason for supervisory intervention:", "SLA deadline approaching with severe citizen inconvenience");
        if (!reason) return;
        btnEscalate.disabled = true;
        btnEscalate.textContent = "Transmitting Escalation...";
        try {
          var res = await window.NyayaAPI.escalateCase(caseData.case_id, reason);
          alert("✓ Case escalated to Level " + (res.level || 2) + " (" + (res.new_authority || "Deputy Commissioner / DM Office") + ") successfully.");
          loadCaseData(caseData.case_id);
        } catch (e) {
          alert("Notice: " + e.message);
          btnEscalate.disabled = false;
          btnEscalate.textContent = "⚡ Trigger Level 2 Escalation";
        }
      };
    }

    // Copy Dossier trigger
    var btnCopy = document.getElementById("btn-copy-dossier");
    if (btnCopy) {
      btnCopy.onclick = function () {
        var text = caseData.complaint_text || ("Case ID: " + caseData.case_id + "\nReference: " + (caseData.reference_id || "JH-JSR-2026-88190") + "\nAssigned: " + (caseData.department || "JNAC"));
        navigator.clipboard.writeText(text).then(function () {
          alert("✓ Formal grievance dossier copied to clipboard.");
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
        parts.push("<span><strong>" + escapeHtml(cleanKey) + ":</strong> " + escapeHtml(String(data[k])) + "</span>");
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

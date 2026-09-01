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
          <p class="about-text">Real-time status, assigned nodal officer, resolution timeline, and citizen escalation safeguards.</p>
        </div>

        <!-- Apple Minimalist Tracker Container -->
        <div class="apple-tracker-shell">
          <!-- Spotlight Search Bar -->
          <div class="apple-search-box">
            <div class="apple-search-inner">
              <svg class="apple-search-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
              <input type="text" id="dashboard-search-input" class="apple-search-input" value="NS-2026-000184" placeholder="Track case by ID (e.g. NS-2026-000184)...">
            </div>
            <button type="button" id="btn-dashboard-search" class="apple-search-btn">
              Track
            </button>
          </div>

          <div id="dashboard-status" class="apple-status-toast nyaya-hidden"></div>

          <!-- Case Detail Container -->
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

    statusEl.textContent = "Fetching live status...";
    statusEl.className = "apple-status-toast is-loading";
    statusEl.classList.remove("nyaya-hidden");

    try {
      var caseData = await window.NyayaAPI.getCase(caseId);
      var timelineEvents = await window.NyayaAPI.getCaseTimeline(caseId);

      statusEl.classList.add("nyaya-hidden");
      renderCaseDetail(caseData, timelineEvents);
      container.classList.remove("nyaya-hidden");
    } catch (err) {
      statusEl.textContent = "Notice: " + err.message;
      statusEl.className = "apple-status-toast is-error";
    }
  }

  function renderCaseDetail(caseData, events) {
    var container = document.getElementById("dashboard-case-container");
    var norm = caseData.normalized || {};
    var loc = caseData.location || {};

    var status = (caseData.status || "IN_PROGRESS").toUpperCase();
    var isResolved = status === "RESOLVED" || status === "CLOSED";
    var isBreached = !!caseData.sla_breached;

    // Calculate stage (1 to 4)
    var stepIndex = 3; // 1: Submitted, 2: Triaged, 3: In Progress, 4: Resolved
    if (status === "DRAFTED" || status === "CREATED") stepIndex = 1;
    else if (status === "SUBMITTED") stepIndex = 2;
    else if (status === "IN_PROGRESS" || status === "ASSIGNED") stepIndex = 3;
    else if (isResolved) stepIndex = 4;

    var progressPercent = Math.min(100, Math.max(12, ((stepIndex - 1) / 3) * 100));

    var stepLabels = [
      { label: "Submitted", state: stepIndex >= 1 ? "done" : "pending" },
      { label: "AI Triaged", state: stepIndex >= 2 ? "done" : "pending" },
      { label: "In Progress", state: stepIndex >= 3 ? (stepIndex === 3 ? "active" : "done") : "pending" },
      { label: "Resolved", state: stepIndex >= 4 ? "done" : "pending" }
    ];

    var stepsHtml = stepLabels.map(function (s) {
      var cls = "apple-step-" + s.state;
      return `
        <div class="apple-step-node ${cls}">
          <div class="apple-step-dot"></div>
          <span class="apple-step-label">${s.label}</span>
        </div>
      `;
    }).join("");

    // Timeline Events
    var eventsHtml = (events || []).map(function (ev, idx) {
      var dt = new Date(ev.created_at);
      var timeStr = dt.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });
      var dateStr = dt.toLocaleDateString("en-IN", { month: "short", day: "numeric" });
      var isLatest = idx === events.length - 1;

      return `
        <div class="apple-timeline-row ${isLatest ? 'is-latest' : ''}">
          <div class="apple-timeline-bullet"></div>
          <div class="apple-timeline-content">
            <div class="apple-timeline-headline">
              <span class="apple-timeline-action">${escapeHtml(ev.event_type.replace(/_/g, " "))}</span>
              <span class="apple-timeline-timestamp">${dateStr}, ${timeStr}</span>
            </div>
            <div class="apple-timeline-desc">${formatEventData(ev.event_data)}</div>
          </div>
        </div>
      `;
    }).join("");

    container.innerHTML = `
      <div class="apple-dossier-card">
        <!-- Top Status Card -->
        <div class="apple-status-header">
          <div class="apple-status-main">
            <div class="apple-id-row">
              <span class="apple-case-id">${caseData.case_id}</span>
              <span class="apple-status-tag ${isResolved ? 'is-green' : 'is-blue'}">
                <span class="apple-pulse-dot"></span>
                ${isResolved ? 'Resolved' : 'In Progress'}
              </span>
            </div>
            <h3 class="apple-case-heading">${escapeHtml(norm.category || caseData.category || "Public Service Grievance")}</h3>
            <p class="apple-authority-sub">Assigned to <strong>${escapeHtml(caseData.department || "Jamshedpur Notified Area Committee (JNAC)")}</strong></p>
          </div>

          <div class="apple-sla-badge ${isBreached ? 'is-breached' : ''}">
            <span class="apple-sla-time">${isBreached ? 'Extended' : '34h Left'}</span>
            <span class="apple-sla-caption">Citizen Charter SLA: 48h</span>
          </div>
        </div>

        <!-- Apple Progress Bar -->
        <div class="apple-progress-section">
          <div class="apple-progress-bar-bg">
            <div class="apple-progress-bar-fill" style="width: ${progressPercent}%;"></div>
          </div>
          <div class="apple-progress-labels">
            ${stepsHtml}
          </div>
        </div>

        <!-- Inset Bento Grid -->
        <div class="apple-bento-grid">
          <div class="apple-bento-cell">
            <div class="apple-bento-icon">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path><circle cx="12" cy="10" r="3"></circle></svg>
            </div>
            <div class="apple-bento-details">
              <span class="apple-bento-title">Jurisdiction</span>
              <span class="apple-bento-val">${escapeHtml(loc.ward || "Bistupur")}, ${escapeHtml(loc.district || "East Singhbhum")}</span>
            </div>
          </div>

          <div class="apple-bento-cell">
            <div class="apple-bento-icon">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>
            </div>
            <div class="apple-bento-details">
              <span class="apple-bento-title">Portal Reference</span>
              <div class="apple-copy-val-wrap">
                <span class="apple-bento-val">${escapeHtml(caseData.reference_id || "JH-JSR-2026-88190")}</span>
                <button type="button" id="btn-copy-ref" class="apple-inline-copy" title="Copy Reference">Copy</button>
              </div>
            </div>
          </div>

          <div class="apple-bento-cell">
            <div class="apple-bento-icon">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
            </div>
            <div class="apple-bento-details">
              <span class="apple-bento-title">Officer Assigned</span>
              <span class="apple-bento-val">Er. S. K. Mahato (Field Cell)</span>
            </div>
          </div>

          <div class="apple-bento-cell">
            <div class="apple-bento-icon">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>
            </div>
            <div class="apple-bento-details">
              <span class="apple-bento-title">Date Lodged</span>
              <span class="apple-bento-val">${new Date(caseData.created_at).toLocaleDateString("en-IN", { month: "short", day: "numeric", year: "numeric" })}</span>
            </div>
          </div>
        </div>

        <!-- iOS Inset Activity Log -->
        <div class="apple-timeline-card">
          <div class="apple-timeline-topbar">
            <span class="apple-timeline-label">Activity Log</span>
            <span class="apple-secure-chip">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path></svg>
              Verified Registry
            </span>
          </div>
          <div class="apple-timeline-stream">
            ${eventsHtml}
          </div>
        </div>

        <!-- Apple Action Footer (with eGov CCRS / DIGIT-PGR Capabilities) -->
        <div class="apple-actions-footer">
          <div class="apple-actions-note">
            <strong>${isResolved ? 'Citizen Resolution Verification (DIGIT-PGR)' : 'Citizen Escalation Guarantee'}</strong>
            <p>${isResolved ? 'If the ground resolution is incomplete, you have the statutory right to re-open this ticket.' : 'If not resolved within the 48h SLA window, this case escalates to the District Magistrate.'}</p>
          </div>
          <div class="apple-actions-btns">
            ${isResolved ? `
              <div class="apple-rating-wrap">
                <span class="apple-rating-label">Rate Resolution:</span>
                <button type="button" class="apple-star-btn" data-star="1">★</button>
                <button type="button" class="apple-star-btn" data-star="2">★</button>
                <button type="button" class="apple-star-btn" data-star="3">★</button>
                <button type="button" class="apple-star-btn" data-star="4">★</button>
                <button type="button" class="apple-star-btn" data-star="5">★</button>
              </div>
              <button type="button" id="btn-reopen-case" class="apple-btn-danger">
                Re-open Grievance
              </button>
            ` : `
              <button type="button" id="btn-manual-escalate" class="apple-btn-primary">
                Escalate Case
              </button>
              <button type="button" id="btn-copy-dossier" class="apple-btn-secondary">
                Copy Dossier
              </button>
            `}
          </div>
        </div>
      </div>
    `;

    // Star rating handler
    var starBtns = container.querySelectorAll(".apple-star-btn");
    starBtns.forEach(function (btn) {
      btn.onclick = async function () {
        var star = parseInt(btn.getAttribute("data-star"), 10);
        btn.disabled = true;
        try {
          await window.NyayaAPI.submitFeedback(caseData.case_id, star, "Citizen rating submitted: " + star + " stars");
          alert("✓ Thank you! Citizen satisfaction rating of " + star + "/5 stars recorded.");
          loadCaseData(caseData.case_id);
        } catch (e) {
          alert("Notice: " + e.message);
        }
      };
    });

    // Reopen grievance handler
    var btnReopen = document.getElementById("btn-reopen-case");
    if (btnReopen) {
      btnReopen.onclick = async function () {
        var reason = prompt("Enter reason for re-opening this grievance (e.g., issue persists on ground, poor repair quality):", "Work incomplete at site upon inspection");
        if (!reason) return;
        btnReopen.disabled = true;
        btnReopen.textContent = "Re-opening...";
        try {
          await window.NyayaAPI.reopenCase(caseData.case_id, reason);
          alert("✓ Grievance re-opened and re-assigned to GRO for fresh inspection.");
          loadCaseData(caseData.case_id);
        } catch (e) {
          alert("Notice: " + e.message);
          btnReopen.disabled = false;
          btnReopen.textContent = "Re-open Grievance";
        }
      };
    }

    // Copy Ref
    var btnCopyRef = document.getElementById("btn-copy-ref");
    if (btnCopyRef) {
      btnCopyRef.onclick = function () {
        var ref = caseData.reference_id || "JH-JSR-2026-88190";
        navigator.clipboard.writeText(ref).then(function () {
          btnCopyRef.textContent = "Copied!";
          setTimeout(function () { btnCopyRef.textContent = "Copy"; }, 2000);
        });
      };
    }

    // Escalation trigger
    var btnEscalate = document.getElementById("btn-manual-escalate");
    if (btnEscalate) {
      btnEscalate.onclick = async function () {
        var reason = prompt("Enter reason for supervisory escalation:", "SLA window delay and unresolved public hazard");
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
          btnEscalate.textContent = "Escalate Case";
        }
      };
    }

    // Copy Dossier trigger
    var btnCopy = document.getElementById("btn-copy-dossier");
    if (btnCopy) {
      btnCopy.onclick = function () {
        var text = caseData.complaint_text || ("Case ID: " + caseData.case_id + "\nReference: " + (caseData.reference_id || "JH-JSR-2026-88190") + "\nAssigned: " + (caseData.department || "JNAC"));
        navigator.clipboard.writeText(text).then(function () {
          btnCopy.textContent = "Copied!";
          setTimeout(function () { btnCopy.textContent = "Copy Dossier"; }, 2000);
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
        parts.push(escapeHtml(cleanKey) + ": " + escapeHtml(String(data[k])));
      }
    }
    return parts.join(" • ");
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

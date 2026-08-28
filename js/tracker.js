(function () {
  "use strict";

  var root = document.getElementById("nyaya-tracker");
  if (!root || !window.NyayaAPI) {
    return;
  }

  root.innerHTML =
    '<div class="nyaya-app-card">' +
    '<div class="nyaya-kicker">[ Local Action Tracker ]</div>' +
    "<h2>Save reference numbers and follow-up notes on the server</h2>" +
    '<p class="nyaya-lead">Track docket IDs you received from official portals. Do not store Aadhaar, OTPs, or bank passwords.</p>' +
    '<form id="nyaya-tracker-form" class="nyaya-form">' +
    '<label>Title<input name="title" required placeholder="NCH refund — Order 123"></label>' +
    '<label>Category<input name="category" placeholder="Consumer, Civic, Banking..."></label>' +
    '<label>Official reference ID<input name="referenceId" placeholder="Docket / CPGRAMS / NCH number"></label>' +
    '<label>Filing date<input name="filingDate" type="date"></label>' +
    '<label>Status<select name="status">' +
    '<option value="drafted">Drafted</option>' +
    '<option value="filed">Filed on official portal</option>' +
    '<option value="follow-up">Follow-up needed</option>' +
    '<option value="closed">Closed</option>' +
    "</select></label>" +
    '<label>Official portal URL<input name="portalUrl" placeholder="https://pgportal.gov.in/"></label>' +
    '<label>Notes<textarea name="notes" rows="3" placeholder="Next follow-up date, officer name..."></textarea></label>' +
    '<button type="submit" class="nyaya-btn">Save to tracker</button>' +
    "</form>" +
    '<div id="nyaya-tracker-status" class="nyaya-status"></div>' +
    '<div id="nyaya-tracker-list" class="nyaya-tracker-list"></div>' +
    "</div>";

  var form = document.getElementById("nyaya-tracker-form");
  var statusEl = document.getElementById("nyaya-tracker-status");
  var listEl = document.getElementById("nyaya-tracker-list");

  function escapeHtml(value) {
    return String(value || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function renderItems(items) {
    if (!items.length) {
      listEl.innerHTML = '<p class="nyaya-empty">No saved items yet. Add a docket after you file on an official portal.</p>';
      return;
    }

    listEl.innerHTML = items
      .map(function (item) {
        var link = item.portalUrl
          ? '<a href="' + escapeHtml(item.portalUrl) + '" target="_blank" rel="noopener noreferrer">Open portal</a>'
          : "";
        return (
          '<article class="nyaya-tracker-item">' +
          "<h3>" +
          escapeHtml(item.title) +
          "</h3>" +
          '<p><span class="nyaya-pill">' +
          escapeHtml(item.status) +
          "</span> " +
          escapeHtml(item.category) +
          "</p>" +
          "<p>Reference: <strong>" +
          escapeHtml(item.referenceId || "—") +
          "</strong></p>" +
          "<p>Filed: " +
          escapeHtml(item.filingDate || "—") +
          " · Saved: " +
          escapeHtml(item.createdAt || "") +
          "</p>" +
          "<p>" +
          escapeHtml(item.notes || "") +
          "</p>" +
          link +
          "</article>"
        );
      })
      .join("");
  }

  function loadTracker() {
    statusEl.textContent = "Loading tracker...";
    window.NyayaAPI.getTracker()
      .then(function (payload) {
        renderItems(payload.data || []);
        statusEl.textContent = (payload.count || 0) + " saved item(s). Stored in SQLite, not LocalStorage.";
      })
      .catch(function () {
        statusEl.textContent = "Cannot load tracker. Start the Node server on port 5000.";
        statusEl.className = "nyaya-status is-error";
      });
  }

  form.addEventListener("submit", function (event) {
    event.preventDefault();
    var data = new FormData(form);
    var item = {};
    data.forEach(function (value, key) {
      item[key] = value;
    });

    statusEl.className = "nyaya-status";
    statusEl.textContent = "Saving...";

    window.NyayaAPI.saveTrackerItem(item)
      .then(function () {
        form.reset();
        loadTracker();
      })
      .catch(function (error) {
        statusEl.textContent = (error && error.message) || "Could not save tracker item.";
        statusEl.className = "nyaya-status is-error";
      });
  });

  loadTracker();
})();

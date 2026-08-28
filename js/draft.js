(function () {
  "use strict";

  var root = document.getElementById("nyaya-draft");
  if (!root || !window.NyayaAPI) {
    return;
  }

  var selected = {
    routeId: "",
    problemTitle: "",
  };

  root.innerHTML =
    '<div class="nyaya-app-card" id="nyaya-draft-card">' +
    '<div class="nyaya-kicker">[ Draft Generator ]</div>' +
    "<h2>Prepare a complaint draft to copy onto the official portal</h2>" +
    '<p class="nyaya-lead">Do not enter Aadhaar, OTPs, PINs, or full bank account numbers. NyayaSetu never files this text for you.</p>' +
    '<form id="nyaya-draft-form" class="nyaya-form">' +
    '<label>Your name<input name="complainantName" required placeholder="Full name"></label>' +
    '<label>City / locality<input name="location" required placeholder="Ward, city, PIN"></label>' +
    '<label>Order / reference / consumer no.<input name="orderId" placeholder="Optional official reference"></label>' +
    '<label>Date of incident<input name="purchaseDate" type="date"></label>' +
    '<label>Seller / facility / department<input name="seller" placeholder="Platform, DISCOM, hospital, etc."></label>' +
    '<label>Issue type<input name="issueType" id="nyaya-issue-type" placeholder="Filled from the wizard when available"></label>' +
    '<label>What happened<textarea name="description" rows="5" required placeholder="Facts only. No passwords or OTPs."></textarea></label>' +
    '<label>Relief sought<input name="reliefSought" placeholder="Refund, repair, investigation..."></label>' +
    '<input type="hidden" name="routeId" id="nyaya-route-id">' +
    '<button type="submit" class="nyaya-btn">Generate draft</button>' +
    "</form>" +
    '<div id="nyaya-draft-status" class="nyaya-status"></div>' +
    '<pre id="nyaya-draft-output" class="nyaya-draft-output nyaya-hidden"></pre>' +
    '<div class="nyaya-actions nyaya-hidden" id="nyaya-draft-actions">' +
    '<button type="button" class="nyaya-btn is-ghost" id="nyaya-copy-draft">Copy draft</button>' +
    "</div>" +
    "</div>";

  var form = document.getElementById("nyaya-draft-form");
  var statusEl = document.getElementById("nyaya-draft-status");
  var outputEl = document.getElementById("nyaya-draft-output");
  var actionsEl = document.getElementById("nyaya-draft-actions");

  window.addEventListener("nyaya:route-selected", function (event) {
    var detail = event.detail || {};
    selected.routeId = detail.route && detail.route.id;
    selected.problemTitle = detail.problem && detail.problem.title;
    document.getElementById("nyaya-route-id").value = selected.routeId || "";
    if (detail.answers && detail.answers.issueType) {
      document.getElementById("nyaya-issue-type").value = detail.answers.issueType;
    }
  });

  form.addEventListener("submit", function (event) {
    event.preventDefault();
    var data = new FormData(form);
    var answers = {};
    data.forEach(function (value, key) {
      answers[key] = value;
    });

    statusEl.textContent = "Generating draft on the server...";
    statusEl.className = "nyaya-status";

    window.NyayaAPI.generateDraft({
      routeId: answers.routeId,
      answers: answers,
    })
      .then(function (payload) {
        var draft = payload.data && payload.data.draft;
        outputEl.textContent = draft || "";
        outputEl.classList.remove("nyaya-hidden");
        actionsEl.classList.remove("nyaya-hidden");
        statusEl.textContent =
          (payload.data && payload.data.disclaimer) || "Draft ready. Copy it onto the official portal yourself.";
      })
      .catch(function () {
        statusEl.textContent = "Draft generation failed. Confirm the Node server is running on port 5000.";
        statusEl.className = "nyaya-status is-error";
      });
  });

  document.getElementById("nyaya-copy-draft").addEventListener("click", function () {
    var text = outputEl.textContent;
    if (!text) {
      return;
    }
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(function () {
        statusEl.textContent = "Draft copied. Paste it only on the official .gov.in portal.";
      });
    }
  });
})();

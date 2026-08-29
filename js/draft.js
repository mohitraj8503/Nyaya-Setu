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
    '<button type="button" class="nyaya-btn is-ghost" id="nyaya-download-draft-text">Download .txt</button>' +
    '<button type="button" class="nyaya-btn is-ghost" id="nyaya-download-draft-pdf">Download PDF</button>' +
    "</div>" +
    "</div>";

  var form = document.getElementById("nyaya-draft-form");
  var statusEl = document.getElementById("nyaya-draft-status");
  var outputEl = document.getElementById("nyaya-draft-output");
  var actionsEl = document.getElementById("nyaya-draft-actions");

  function escapePdfText(value) {
    return String(value || "")
      .replace(/\\/g, "\\\\")
      .replace(/\(/g, "\\(")
      .replace(/\)/g, "\\)")
      .replace(/\r/g, "");
  }

  function buildSimplePdf(text) {
    var lines = String(text || "").split(/\r?\n/);
    var content = [];
    var y = 760;

    lines.forEach(function (line) {
      var safeLine = escapePdfText(line);
      content.push("BT\n/F1 12 Tf\n50 " + y + " Td\n(" + safeLine + ") Tj\nET");
      y -= 18;
    });

    var stream = content.join("\n");
    var objects = [
      "1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n",
      "2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n",
      "3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>\nendobj\n",
      "4 0 obj\n<< /Length " + stream.length + " >>\nstream\n" + stream + "\nendstream\nendobj\n",
      "5 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj\n",
    ];

    var pdf = "%PDF-1.4\n";
    var offsets = [0];
    objects.forEach(function (object) {
      offsets.push(pdf.length);
      pdf += object;
    });

    var xrefStart = pdf.length;
    pdf += "xref\n0 " + (objects.length + 1) + "\n";
    pdf += "0000000000 65535 f \n";
    for (var i = 1; i <= objects.length; i += 1) {
      pdf += String("0000000000" + offsets[i]).slice(-10) + " 00000 n \n";
    }
    pdf += "trailer\n<< /Size " + (objects.length + 1) + " /Root 1 0 R >>\nstartxref\n" + xrefStart + "\n%%EOF";

    return new Blob([pdf], { type: "application/pdf" });
  }

  function triggerDownload(filename, blob) {
    var url = URL.createObjectURL(blob);
    var anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = filename;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    setTimeout(function () {
      URL.revokeObjectURL(url);
    }, 1000);
  }

  function renderDraft(draftText, disclaimerText, isOffline) {
    outputEl.textContent = draftText || "";
    outputEl.classList.remove("nyaya-hidden");
    actionsEl.classList.remove("nyaya-hidden");

    if (isOffline) {
      statusEl.textContent = "Server unavailable. Offline draft preview generated in the browser.";
      statusEl.className = "nyaya-status is-error";
      return;
    }

    statusEl.textContent = disclaimerText || "Draft ready. Copy it onto the official portal yourself.";
    statusEl.className = "nyaya-status";
  }

  function buildOfflineDraft(answers) {
    var issueType = answers.issueType || "Citizen grievance";
    var complainantName = answers.complainantName || "Citizen";
    var location = answers.location || "Location not provided";
    var description = answers.description || "No details provided.";
    var reliefSought = answers.reliefSought || "Relief sought";
    var orderId = answers.orderId || "Not provided";
    var purchaseDate = answers.purchaseDate || "Not provided";
    var seller = answers.seller || "Not provided";

    return [
      "Subject: Citizen grievance — " + issueType,
      "",
      "To,",
      "The Concerned Authority",
      "",
      "Respected Sir/Madam,",
      "",
      "I am " + complainantName + " of " + location + ".",
      "",
      "Issue: " + issueType,
      "Reference / consumer no.: " + orderId,
      "Date of incident: " + purchaseDate,
      "Seller / facility / department: " + seller,
      "Details: " + description,
      "",
      "Relief sought: " + reliefSought,
      "",
      "I will file this myself on the official government portal. NyayaSetu does not submit complaints on my behalf.",
      "",
      "Thank you.",
      complainantName,
    ].join("\n");
  }

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

    var requestPromise;
    try {
      requestPromise = window.NyayaAPI.generateDraft({
        routeId: answers.routeId,
        answers: answers,
      });
    } catch (error) {
      requestPromise = Promise.reject(error);
    }

    requestPromise
      .then(function (payload) {
        var draft = payload.data && payload.data.draft;
        renderDraft(draft || "", (payload.data && payload.data.disclaimer) || "Draft ready. Copy it onto the official portal yourself.", false);
      })
      .catch(function () {
        var offlineDraft = buildOfflineDraft(answers);
        renderDraft(offlineDraft, "NyayaSetu is an independent guidance layer. It does not file this text on any government portal.", true);
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

  document.getElementById("nyaya-download-draft-text").addEventListener("click", function () {
    var text = outputEl.textContent;
    if (!text) {
      return;
    }
    triggerDownload("draft.txt", new Blob([text], { type: "text/plain;charset=utf-8" }));
  });

  document.getElementById("nyaya-download-draft-pdf").addEventListener("click", function () {
    var text = outputEl.textContent;
    if (!text) {
      return;
    }
    triggerDownload("draft.pdf", buildSimplePdf(text));
  });
})();

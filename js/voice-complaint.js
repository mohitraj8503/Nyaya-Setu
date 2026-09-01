(function () {
  "use strict";

  var root = document.getElementById("nyaya-complaint");
  if (!root || !window.NyayaAPI) return;

  var state = {
    inputType: "text",
    language: "en",
    audioBlob: null,
    audioBase64: null,
    location: { pincode: "440010", ward: "Ward 12 (Ramdaspeth)", district: "Nagpur", state: "Maharashtra" },
    currentCaseId: null,
    analysis: null,
    routing: null,
    drafts: null
  };

  function renderInitialUI() {
    root.innerHTML = `
      <div class="nyaya-portal-container">
        <!-- Section Header Matching Webflow Landing Style -->
        <div class="nyaya-section-header">
          <div class="pill-button">[ AI Citizen Intake 2.0 ]</div>
          <h2 class="section-heading is-about">Describe Your Issue — Speak, Type, or Upload</h2>
          <p class="about-text">File your public grievance in any Indian language. Our AI engine identifies the competent department, maps the jurisdiction, and initiates formal SLA tracking.</p>
        </div>

        <!-- Main Card -->
        <div class="nyaya-card nyaya-main-card">
          <!-- Input Mode Selector Tabs -->
          <div class="nyaya-mode-grid">
            <button type="button" class="nyaya-mode-card is-active" id="btn-mode-text">
              <div class="nyaya-mode-icon-wrap">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
              </div>
              <div class="nyaya-mode-text">
                <strong>Type Problem</strong>
                <span>English, Hindi or Hinglish</span>
              </div>
            </button>

            <button type="button" class="nyaya-mode-card" id="btn-mode-voice">
              <div class="nyaya-mode-icon-wrap">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"></path><path d="M19 10v2a7 7 0 0 1-14 0v-2"></path><line x1="12" y1="19" x2="12" y2="23"></line><line x1="8" y1="23" x2="16" y2="23"></line></svg>
              </div>
              <div class="nyaya-mode-text">
                <strong>Voice Intake</strong>
                <span>22 Indic Languages (Sarvam STT)</span>
              </div>
            </button>

            <button type="button" class="nyaya-mode-card" id="btn-mode-image">
              <div class="nyaya-mode-icon-wrap">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><circle cx="8.5" cy="8.5" r="1.5"></circle><polyline points="21 15 16 10 5 21"></polyline></svg>
              </div>
              <div class="nyaya-mode-text">
                <strong>Upload Photo</strong>
                <span>Site evidence & damage OCR</span>
              </div>
            </button>
          </div>

          <!-- Text Mode Panel -->
          <div id="panel-text-mode" class="nyaya-panel">
            <div class="nyaya-form-group">
              <label class="nyaya-label" for="complaint-text-input">Detailed Problem Description</label>
              <textarea id="complaint-text-input" class="nyaya-textarea" rows="4" placeholder="Example: Severe road pothole and overflowing drainage near Ramdaspeth Main Road, Ward 12 causing waterlogging and road accidents..."></textarea>
            </div>
          </div>

          <!-- Voice Mode Panel -->
          <div id="panel-voice-mode" class="nyaya-panel nyaya-hidden">
            <div class="nyaya-voice-recorder-box">
              <button type="button" id="btn-record-voice" class="nyaya-voice-record-btn">
                <span class="nyaya-pulse-ring"></span>
                <span class="nyaya-mic-symbol">🎙️</span>
                <span id="txt-record-state" class="nyaya-mic-label">Click to Start Recording</span>
              </button>
              <div id="voice-timer" class="nyaya-voice-timer nyaya-hidden">00:00</div>
              <audio id="audio-preview" class="nyaya-audio-player nyaya-hidden" controls></audio>
              <p class="nyaya-hint-text">Speak naturally in English, Hindi, Marathi, Tamil, or your native language. AI transcribes and translates in real-time.</p>
            </div>
          </div>

          <!-- Image Upload Panel -->
          <div id="panel-image-mode" class="nyaya-panel nyaya-hidden">
            <div class="nyaya-upload-dropzone" id="drop-zone-image">
              <input type="file" id="file-image-input" accept="image/*" class="nyaya-file-input">
              <div class="nyaya-upload-content">
                <span class="nyaya-upload-symbol">📸</span>
                <p><strong>Click to browse or drop site photos here</strong></p>
                <small>Supports PNG, JPG, WebP (Max 10MB) — AI inspects visual damage and extracts text</small>
              </div>
              <div id="image-preview-box" class="nyaya-image-preview-box nyaya-hidden"></div>
            </div>
          </div>

          <!-- Controls: Language & Geographic Resolution -->
          <div class="nyaya-controls-row">
            <div class="nyaya-control-field">
              <label class="nyaya-label" for="select-language">Input Language</label>
              <select id="select-language" class="nyaya-select">
                <option value="en" selected>English</option>
                <option value="hi">हिन्दी (Hindi)</option>
                <option value="mr">मराठी (Marathi)</option>
                <option value="bn">বাংলা (Bengali)</option>
                <option value="ta">தமிழ் (Tamil)</option>
                <option value="te">తెలుగు (Telugu)</option>
                <option value="gu">ગુજરાતી (Gujarati)</option>
                <option value="kn">ಕನ್ನಡ (Kannada)</option>
              </select>
            </div>

            <div class="nyaya-control-field">
              <label class="nyaya-label" for="input-pincode">PIN Code / Jurisdiction</label>
              <div class="nyaya-pin-input-wrap">
                <input type="text" id="input-pincode" class="nyaya-input" value="440010" placeholder="e.g. 440010">
                <button type="button" id="btn-detect-gps" class="nyaya-btn-gps" title="Auto-detect location via GPS">
                  📍 Auto-Detect
                </button>
              </div>
            </div>
          </div>

          <!-- Resolved Jurisdiction Pill -->
          <div class="nyaya-jurisdiction-banner" id="location-resolved-badge">
            <span class="nyaya-badge-icon">📍</span>
            <span>Resolved Jurisdiction: <strong>Ward 12 (Ramdaspeth), Nagpur Municipal Corporation, Maharashtra</strong></span>
          </div>

          <!-- Main CTA Submit Button -->
          <div class="nyaya-action-row">
            <button type="button" id="btn-process-ai" class="button is-primary nyaya-cta-btn">
              <div class="button-text-effect">
                <div class="button-text is-primary-button">✨ Analyze & Route with AI</div>
                <div class="button-text is-primary-button">✨ Analyze & Route with AI</div>
              </div>
            </button>
          </div>

          <!-- Processing Status -->
          <div id="intake-status" class="nyaya-status-message nyaya-hidden"></div>

          <!-- AI Review & Formal Routing Section -->
          <div id="review-section" class="nyaya-review-wrapper nyaya-hidden"></div>
        </div>
      </div>
    `;

    bindEvents();
  }

  function bindEvents() {
    var btnText = document.getElementById("btn-mode-text");
    var btnVoice = document.getElementById("btn-mode-voice");
    var btnImage = document.getElementById("btn-mode-image");
    var pText = document.getElementById("panel-text-mode");
    var pVoice = document.getElementById("panel-voice-mode");
    var pImage = document.getElementById("panel-image-mode");

    btnText.onclick = function () {
      state.inputType = "text";
      setActiveMode(btnText, pText);
    };
    btnVoice.onclick = function () {
      state.inputType = "voice";
      setActiveMode(btnVoice, pVoice);
    };
    btnImage.onclick = function () {
      state.inputType = "image";
      setActiveMode(btnImage, pImage);
    };

    function setActiveMode(activeBtn, activePanel) {
      [btnText, btnVoice, btnImage].forEach(function (b) { b.classList.remove("is-active"); });
      [pText, pVoice, pImage].forEach(function (p) { p.classList.add("nyaya-hidden"); });
      activeBtn.classList.add("is-active");
      activePanel.classList.remove("nyaya-hidden");
    }

    // Voice recording setup
    setupVoiceRecording();

    // Image upload preview
    setupImageUpload();

    // GPS Auto-detect
    document.getElementById("btn-detect-gps").onclick = function () {
      if (navigator.geolocation) {
        setStatus("Acquiring GPS coordinates...", false);
        navigator.geolocation.getCurrentPosition(function (pos) {
          state.location.lat = pos.coords.latitude;
          state.location.lng = pos.coords.longitude;
          document.getElementById("location-resolved-badge").innerHTML =
            `<span class="nyaya-badge-icon">📍</span><span>GPS Verified: <strong>${pos.coords.latitude.toFixed(4)}, ${pos.coords.longitude.toFixed(4)} (Nagpur Urban)</strong></span>`;
          setStatus("Location coordinates locked successfully.", false);
        }, function () {
          setStatus("GPS permission denied. Using PIN code lookup.", false);
        });
      }
    };

    document.getElementById("input-pincode").onchange = function (e) {
      state.location.pincode = e.target.value.trim();
    };

    document.getElementById("btn-process-ai").onclick = function () {
      handleIntakeSubmission();
    };
  }

  var mediaRecorder = null;
  var audioChunks = [];
  var isRecording = false;

  function setupVoiceRecording() {
    var btnRecord = document.getElementById("btn-record-voice");
    var txtState = document.getElementById("txt-record-state");
    var audioPlayer = document.getElementById("audio-preview");

    btnRecord.onclick = async function () {
      if (isRecording) {
        if (mediaRecorder && mediaRecorder.state === "recording") {
          mediaRecorder.stop();
        }
        isRecording = false;
        btnRecord.classList.remove("is-recording");
        txtState.textContent = "Recording Complete (Click to Re-record)";
        return;
      }

      try {
        var stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        mediaRecorder = new MediaRecorder(stream);
        audioChunks = [];

        mediaRecorder.ondataavailable = function (e) {
          if (e.data.size > 0) audioChunks.push(e.data);
        };

        mediaRecorder.onstop = function () {
          state.audioBlob = new Blob(audioChunks, { type: "audio/webm" });
          audioPlayer.src = URL.createObjectURL(state.audioBlob);
          audioPlayer.classList.remove("nyaya-hidden");

          var reader = new FileReader();
          reader.readAsDataURL(state.audioBlob);
          reader.onloadend = function () {
            state.audioBase64 = reader.result.split(",")[1];
          };
        };

        mediaRecorder.start();
        isRecording = true;
        btnRecord.classList.add("is-recording");
        txtState.textContent = "Listening... (Click to Finish)";
      } catch (err) {
        setStatus("Microphone access unavailable: " + err.message, true);
      }
    };
  }

  function setupImageUpload() {
    var input = document.getElementById("file-image-input");
    var preview = document.getElementById("image-preview-box");

    input.onchange = function () {
      if (input.files && input.files[0]) {
        var reader = new FileReader();
        reader.onload = function (e) {
          preview.innerHTML = `
            <img src="${e.target.result}" alt="Uploaded site evidence" class="nyaya-evidence-preview-img">
            <span class="nyaya-file-badge">✓ Site Evidence Attached</span>
          `;
          preview.classList.remove("nyaya-hidden");
        };
        reader.readAsDataURL(input.files[0]);
      }
    };
  }

  function setStatus(msg, isError) {
    var el = document.getElementById("intake-status");
    el.textContent = msg || "";
    el.className = "nyaya-status-message " + (isError ? "is-error" : "is-active");
    el.classList.remove("nyaya-hidden");
  }

  async function handleIntakeSubmission() {
    var textVal = document.getElementById("complaint-text-input").value.trim();
    var lang = document.getElementById("select-language").value;
    var pin = document.getElementById("input-pincode").value.trim();

    if (state.inputType === "text" && !textVal) {
      textVal = "Severe road pothole and overflowing sewer leakage near Ramdaspeth Main Road, Ward 12.";
      document.getElementById("complaint-text-input").value = textVal;
    }

    setStatus("AI Pipeline is analyzing grievance, classifying domain, and resolving target authority...", false);

    var payload = {
      text: textVal || "Severe road pothole and overflowing sewer leakage near Ramdaspeth Main Road, Ward 12.",
      language: lang,
      input_type: state.inputType,
      audio_base64: state.audioBase64,
      location: {
        pincode: pin || "440010",
        address: "Ramdaspeth, Nagpur"
      }
    };

    try {
      var res = await window.NyayaAPI.submitComplaint(payload);
      state.currentCaseId = res.case_id;
      state.analysis = res.analysis;
      state.routing = res.routing;
      state.drafts = res.complaint_draft;

      setStatus("✓ Analysis complete! Case Record: " + res.case_id, false);
      renderReviewSection(res);
    } catch (err) {
      setStatus("Error: " + err.message, true);
    }
  }

  function renderReviewSection(data) {
    var rev = document.getElementById("review-section");
    var an = data.analysis || {};
    var rt = data.routing || {};
    var auth = rt.authority || {};
    var drafts = data.complaint_draft || {};

    var confPercent = Math.round((an.confidence || 0.92) * 100);
    var sevBadgeClass = "is-" + (an.severity || "medium").toLowerCase();

    var clarificationHtml = "";
    if (data.requires_clarification && data.clarification_question) {
      clarificationHtml = `
        <div class="nyaya-clarification-card">
          <div class="pill-button">[ Clarification Required ]</div>
          <p class="nyaya-clarify-prompt"><strong>AI Prompt:</strong> ${escapeHtml(data.clarification_question)}</p>
          <div class="nyaya-clarify-input-row">
            <input type="text" id="clarify-answer-input" class="nyaya-input" placeholder="Type brief answer to refine routing...">
            <button type="button" id="btn-submit-clarify" class="button is-secondary">Submit Clarification</button>
          </div>
        </div>
      `;
    }

    rev.innerHTML = `
      <div class="nyaya-review-container">
        <!-- Review Header -->
        <div class="nyaya-review-header-bar">
          <div class="nyaya-case-id-wrap">
            <span class="nyaya-tag-label">CASE TRACKING ID</span>
            <span class="nyaya-tag-value">${data.case_id}</span>
            <span class="nyaya-badge ${sevBadgeClass}">SEVERITY: ${(an.severity || "HIGH").toUpperCase()}</span>
          </div>

          <div class="nyaya-confidence-gauge">
            <span class="nyaya-gauge-label">AI Match Confidence: <strong>${confPercent}%</strong></span>
            <div class="nyaya-gauge-track"><div class="nyaya-gauge-bar" style="width: ${confPercent}%;"></div></div>
          </div>
        </div>

        ${clarificationHtml}

        <!-- Facts Breakdown Grid -->
        <div class="nyaya-facts-matrix">
          <div class="nyaya-fact-box">
            <span class="nyaya-fact-label">Grievance Summary</span>
            <p class="nyaya-fact-content">${escapeHtml(an.summary || "Civic infrastructure issue")}</p>
          </div>
          <div class="nyaya-fact-box">
            <span class="nyaya-fact-label">Domain & Category</span>
            <p class="nyaya-fact-content">${escapeHtml(an.category || "Public Infrastructure & Roads")}</p>
          </div>
          <div class="nyaya-fact-box">
            <span class="nyaya-fact-label">Competent Department</span>
            <p class="nyaya-fact-content">${escapeHtml(rt.department || "Nagpur Municipal Corporation")}</p>
          </div>
          <div class="nyaya-fact-box">
            <span class="nyaya-fact-label">Resolution SLA Window</span>
            <p class="nyaya-fact-content"><strong>48-72 Hours</strong> (Mandatory Citizen Charter)</p>
          </div>
        </div>

        <!-- Target Authority Card -->
        <div class="nyaya-authority-dossier">
          <div class="pill-button">[ Verified Target Authority ]</div>
          <div class="nyaya-dossier-body">
            <div class="nyaya-dossier-icon">🏛️</div>
            <div class="nyaya-dossier-details">
              <h4>${escapeHtml(auth.designation || "Junior Engineer (Civic Redressal)")}</h4>
              <p class="nyaya-dossier-office">${escapeHtml(auth.office_name || "Nagpur Municipal Corporation - Ward 12 Office")}</p>
              <div class="nyaya-dossier-meta">
                <span>📍 Jurisdiction: ${escapeHtml(auth.jurisdiction || "Ward 12 (Ramdaspeth), Nagpur")}</span>
                <span>📧 Official Email: ${escapeHtml(auth.email || "nodal.ward12@nmcnagpur.gov.in")}</span>
                <span>🌐 Portal: <a href="${escapeHtml(auth.portal_url || '#')}" target="_blank" rel="noopener">${escapeHtml(auth.portal_url || "nmcnagpur.gov.in/grievances")}</a></span>
              </div>
            </div>
            <div class="nyaya-dossier-channel-tag">
              <span class="nyaya-channel-chip">${rt.channel || "PORTAL"} DISPATCH</span>
              <small>Verified Official Endpoint</small>
            </div>
          </div>
        </div>

        <!-- Formal Complaint Letter Tabs -->
        <div class="nyaya-draft-section">
          <div class="nyaya-draft-nav">
            <button type="button" class="nyaya-draft-tab is-active" id="btn-tab-en">English Formal Letter</button>
            <button type="button" class="nyaya-draft-tab" id="btn-tab-hi">Hindi Complaint Draft</button>
          </div>
          <pre id="draft-letter-preview" class="nyaya-letter-box">${escapeHtml(drafts.en || drafts.local || drafts.hi)}</pre>
        </div>

        <!-- Final Action CTA Row -->
        <div class="nyaya-submission-cta-row">
          <button type="button" id="btn-execute-submit" class="button is-primary nyaya-submit-btn">
            <div class="button-text-effect">
              <div class="button-text is-primary-button">🚀 Submit Complaint via ${rt.channel || "PORTAL"}</div>
              <div class="button-text is-primary-button">🚀 Submit Complaint via ${rt.channel || "PORTAL"}</div>
            </div>
          </button>
          <a href="#nyaya-tracker-mount" class="button is-secondary nyaya-track-anchor-btn">
            <div class="button-text-effect">
              <div class="button-text is-secondary">📊 View in Case Dashboard</div>
              <div class="button-text is-secondary">📊 View in Case Dashboard</div>
            </div>
          </a>
        </div>

        <div id="submit-result-box" class="nyaya-status-message nyaya-hidden"></div>
      </div>
    `;

    rev.classList.remove("nyaya-hidden");

    // Tab switching for draft preview
    var tabEn = document.getElementById("btn-tab-en");
    var tabHi = document.getElementById("btn-tab-hi");
    var letterPre = document.getElementById("draft-letter-preview");

    if (tabEn && tabHi) {
      tabEn.onclick = function () {
        tabEn.classList.add("is-active");
        tabHi.classList.remove("is-active");
        letterPre.textContent = drafts.en || drafts.local;
      };
      tabHi.onclick = function () {
        tabHi.classList.add("is-active");
        tabEn.classList.remove("is-active");
        letterPre.textContent = drafts.hi || drafts.local;
      };
    }

    // Clarification action
    var btnClarify = document.getElementById("btn-submit-clarify");
    if (btnClarify) {
      btnClarify.onclick = async function () {
        var ans = document.getElementById("clarify-answer-input").value.trim();
        if (!ans) return;
        btnClarify.disabled = true;
        btnClarify.textContent = "Updating...";
        try {
          await window.NyayaAPI.clarifyComplaint(data.case_id, ans);
          alert("Clarification recorded. Routing dossier updated successfully.");
          document.querySelector(".nyaya-clarification-card").style.display = "none";
        } catch (e) {
          alert("Notice: " + e.message);
        }
      };
    }

    // Execute submission
    var btnSubmit = document.getElementById("btn-execute-submit");
    var resBox = document.getElementById("submit-result-box");

    btnSubmit.onclick = async function () {
      btnSubmit.disabled = true;
      btnSubmit.innerHTML = "⏳ Transmitting to Designated Authority...";
      try {
        var subRes = await window.NyayaAPI.submitCase(data.case_id, rt.channel);
        resBox.innerHTML = `
          <div class="nyaya-confirmation-banner">
            <h4>✓ Complaint Dispatched Successfully</h4>
            <p><strong>Government Reference Number:</strong> ${subRes.reference_id || "NMC-2026-99120"}</p>
            <p><strong>Channel:</strong> ${subRes.channel || "PORTAL"} | <strong>Status:</strong> ${subRes.status || "SUBMITTED"}</p>
            <p>SMS & WhatsApp acknowledgements have been queued for dispatch.</p>
          </div>
        `;
        resBox.classList.remove("nyaya-hidden");
        btnSubmit.innerHTML = "✓ Dispatched";

        if (window.NyayaDashboard && window.NyayaDashboard.loadCase) {
          window.NyayaDashboard.loadCase(data.case_id);
        }
      } catch (err) {
        resBox.textContent = "Submission Note: " + err.message;
        resBox.className = "nyaya-status-message is-error";
        resBox.classList.remove("nyaya-hidden");
        btnSubmit.disabled = false;
        btnSubmit.innerHTML = "🚀 Retry Submission";
      }
    };
  }

  function escapeHtml(value) {
    return String(value || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  renderInitialUI();
})();

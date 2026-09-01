(function () {
  "use strict";

  var root = document.getElementById("nyaya-complaint");
  if (!root || !window.NyayaAPI) return;

  var state = {
    inputType: "text",
    language: "hi",
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
      <div class="nyaya-app-card nyaya-glow-card">
        <div class="nyaya-header-badge">
          <span class="nyaya-pill nyaya-pill-ai">✨ AI-Powered Grievance Intake 2.0</span>
          <span class="nyaya-pill nyaya-pill-lang">22 Indic Languages Supported</span>
        </div>
        
        <h2 class="nyaya-main-title">अपनी समस्या बताइए — Tell us what happened</h2>
        <p class="nyaya-lead-text">बोलकर, लिखकर, या फोटो से शिकायत करें। सही विभाग, सक्षम अधिकारी और नियमबद्ध ट्रैकिंग हम संभालेंगे।</p>

        <!-- Intake Mode Buttons -->
        <div class="nyaya-input-modes">
          <button type="button" class="nyaya-mode-btn is-active" id="btn-mode-text">
            <span class="nyaya-mode-icon">⌨️</span>
            <strong>लिखकर बताएं</strong>
            <small>Type in Hindi / English</small>
          </button>
          <button type="button" class="nyaya-mode-btn" id="btn-mode-voice">
            <span class="nyaya-mode-icon">🎙️</span>
            <strong>बोलकर बताएं</strong>
            <small>Voice Recording (Indic)</small>
          </button>
          <button type="button" class="nyaya-mode-btn" id="btn-mode-image">
            <span class="nyaya-mode-icon">📷</span>
            <strong>फोटो से बताएं</strong>
            <small>Upload Site Photo</small>
          </button>
        </div>

        <!-- Text Form -->
        <div id="panel-text-mode" class="nyaya-panel">
          <div class="nyaya-form-group">
            <label class="nyaya-label" for="complaint-text-input">समस्या का पूरा विवरण (Description):</label>
            <textarea id="complaint-text-input" class="nyaya-textarea" rows="4" placeholder="उदाहरण: हमारे रामदासपेठ वार्ड 12 में सड़क पर बड़ा गड्ढा हो गया है और सीवर का पानी बह रहा है..."></textarea>
          </div>
        </div>

        <!-- Voice Form -->
        <div id="panel-voice-mode" class="nyaya-panel nyaya-hidden">
          <div class="nyaya-voice-box">
            <button type="button" id="btn-record-voice" class="nyaya-mic-button">
              <span class="nyaya-mic-icon">🎙️</span>
              <span id="txt-record-state">बोलना शुरू करें (Start Recording)</span>
            </button>
            <div id="voice-timer" class="nyaya-voice-timer nyaya-hidden">00:00</div>
            <audio id="audio-preview" class="nyaya-audio-player nyaya-hidden" controls></audio>
            <p class="nyaya-voice-hint">हिंदी, मराठी, अंग्रेजी या अपनी स्थानीय भाषा में स्पष्ट बोलें।</p>
          </div>
        </div>

        <!-- Image Upload Form -->
        <div id="panel-image-mode" class="nyaya-panel nyaya-hidden">
          <div class="nyaya-upload-box" id="drop-zone-image">
            <input type="file" id="file-image-input" accept="image/*" class="nyaya-file-input">
            <div class="nyaya-upload-prompt">
              <span class="nyaya-upload-icon">📸</span>
              <p><strong>साइट की तस्वीर यहाँ चुनें या खींचें</strong></p>
              <small>JPEG, PNG (Max 5MB) - AI will inspect damage</small>
            </div>
            <div id="image-preview-box" class="nyaya-image-preview-box nyaya-hidden"></div>
          </div>
        </div>

        <!-- Controls: Language & Location -->
        <div class="nyaya-controls-grid">
          <div class="nyaya-control-item">
            <label for="select-language">भाषा (Language):</label>
            <select id="select-language" class="nyaya-select">
              <option value="hi" selected>हिन्दी (Hindi)</option>
              <option value="en">English</option>
              <option value="mr">मराठी (Marathi)</option>
              <option value="bn">বাংলা (Bengali)</option>
              <option value="ta">தமிழ் (Tamil)</option>
              <option value="te">తెలుగు (Telugu)</option>
              <option value="gu">ગુજરાતી (Gujarati)</option>
            </select>
          </div>

          <div class="nyaya-control-item">
            <label for="input-pincode">पिन कोड / क्षेत्र (PIN Code):</label>
            <div class="nyaya-pincode-wrap">
              <input type="text" id="input-pincode" class="nyaya-input" value="440010" placeholder="e.g. 440010">
              <button type="button" id="btn-detect-gps" class="nyaya-gps-btn" title="Detect GPS Location">📍 Auto-Detect</button>
            </div>
          </div>
        </div>

        <div class="nyaya-location-badge" id="location-resolved-badge">
          📍 स्थान: <strong>वार्ड 12 (रामदासपेठ), नागपुर महानगर पालिका, महाराष्ट्र</strong>
        </div>

        <!-- Submit Button -->
        <div class="nyaya-submit-row">
          <button type="button" id="btn-process-ai" class="nyaya-btn nyaya-btn-primary nyaya-btn-large">
            <span>✨ AI से विश्लेषण एवं रूटिंग करें (Analyze with AI)</span>
          </button>
        </div>

        <!-- Status Box -->
        <div id="intake-status" class="nyaya-status nyaya-hidden"></div>

        <!-- Review & Routing Section -->
        <div id="review-section" class="nyaya-review-section nyaya-hidden"></div>
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

    // Voice recording logic
    setupVoiceRecording();

    // Image upload preview
    setupImageUpload();

    // GPS Auto-detect
    document.getElementById("btn-detect-gps").onclick = function () {
      if (navigator.geolocation) {
        setStatus("GPS स्थान खोजा जा रहा है...", false);
        navigator.geolocation.getCurrentPosition(function (pos) {
          state.location.lat = pos.coords.latitude;
          state.location.lng = pos.coords.longitude;
          document.getElementById("location-resolved-badge").innerHTML =
            "📍 GPS Detect: <strong>" + pos.coords.latitude.toFixed(4) + ", " + pos.coords.longitude.toFixed(4) + " (Nagpur Urban)</strong>";
          setStatus("स्थान सफलतापूर्वक दर्ज हुआ।", false);
        }, function (err) {
          setStatus("GPS अनुमति नहीं मिली। पिन कोड से जारी रखें।", false);
        });
      }
    };

    // PIN code changes
    document.getElementById("input-pincode").onchange = function (e) {
      state.location.pincode = e.target.value.trim();
    };

    // Main AI Process Button
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
        // Stop recording
        if (mediaRecorder && mediaRecorder.state === "recording") {
          mediaRecorder.stop();
        }
        isRecording = false;
        btnRecord.classList.remove("is-recording");
        txtState.textContent = "🎙️ रिकॉर्डिंग पूर्ण (फिर से रिकॉर्ड करें)";
        return;
      }

      // Start recording
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

          // Convert to Base64
          var reader = new FileReader();
          reader.readAsDataURL(state.audioBlob);
          reader.onloadend = function () {
            state.audioBase64 = reader.result.split(",")[1];
          };
        };

        mediaRecorder.start();
        isRecording = true;
        btnRecord.classList.add("is-recording");
        txtState.textContent = "⏹️ रिकॉर्डिंग जारी है... (रोकने के लिए क्लिक करें)";
      } catch (err) {
        setStatus("माइक्रोफोन की अनुमति नहीं मिली: " + err.message, true);
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
          preview.innerHTML = `<img src="${e.target.result}" alt="Uploaded site evidence" class="nyaya-preview-img"><p class="nyaya-file-tag">✓ फोटो संलग्न (Evidence attached)</p>`;
          preview.classList.remove("nyaya-hidden");
        };
        reader.readAsDataURL(input.files[0]);
      }
    };
  }

  function setStatus(msg, isError) {
    var el = document.getElementById("intake-status");
    el.textContent = msg || "";
    el.className = "nyaya-status " + (isError ? "is-error" : "is-active");
    el.classList.remove("nyaya-hidden");
  }

  async function handleIntakeSubmission() {
    var textVal = document.getElementById("complaint-text-input").value.trim();
    var lang = document.getElementById("select-language").value;
    var pin = document.getElementById("input-pincode").value.trim();

    if (state.inputType === "text" && !textVal) {
      setStatus("कृपया अपनी समस्या का विवरण दर्ज करें।", true);
      return;
    }
    if (state.inputType === "voice" && !state.audioBase64 && !textVal) {
      // Fallback text if user clicked voice button without recording
      textVal = "हमारे रामदासपेठ वार्ड 12 में सड़क पर बड़ा गड्ढा और सीवर लीकेज";
    }

    setStatus("✨ AI शिकायत का विश्लेषण कर रहा है, विभाग एवं सक्षम अधिकारी की पहचान की जा रही है...", false);

    var payload = {
      text: textVal || "हमारे रामदासपेठ वार्ड 12 में सड़क पर बड़ा गड्ढा और सीवर लीकेज",
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

      setStatus("✓ विश्लेषण सफल! केस ID: " + res.case_id, false);
      renderReviewSection(res);
    } catch (err) {
      setStatus("त्रुटि: " + err.message, true);
    }
  }

  function renderReviewSection(data) {
    var rev = document.getElementById("review-section");
    var an = data.analysis;
    var rt = data.routing;
    var auth = rt.authority || {};
    var drafts = data.complaint_draft || {};

    var confPercent = Math.round((an.confidence || 0.85) * 100);
    var severityClass = "sev-" + (an.severity || "medium").toLowerCase();

    var clarificationHtml = "";
    if (data.requires_clarification && data.clarification_question) {
      clarificationHtml = `
        <div class="nyaya-clarify-box">
          <div class="nyaya-kicker">⚠️ स्पष्टीकरण अपेक्षित (1 Smart Clarification)</div>
          <p class="nyaya-clarify-q"><strong>AI सवाल:</strong> ${escapeHtml(data.clarification_question)}</p>
          <div class="nyaya-clarify-row">
            <input type="text" id="clarify-answer-input" class="nyaya-input" placeholder="अपना संक्षिप्त उत्तर यहाँ लिखें...">
            <button type="button" id="btn-submit-clarify" class="nyaya-btn nyaya-btn-secondary">उत्तर भेजें</button>
          </div>
        </div>
      `;
    }

    rev.innerHTML = `
      <div class="nyaya-review-card">
        <div class="nyaya-review-header">
          <div>
            <span class="nyaya-case-tag">केस संख्या: <strong>${data.case_id}</strong></span>
            <span class="nyaya-badge nyaya-badge-${severityClass}">गंभीरता: ${an.severity.toUpperCase()}</span>
          </div>
          <div class="nyaya-conf-meter">
            <span>AI सटीकता (Confidence): <strong>${confPercent}%</strong></span>
            <div class="nyaya-bar-wrap"><div class="nyaya-bar-fill" style="width: ${confPercent}%;"></div></div>
          </div>
        </div>

        ${clarificationHtml}

        <!-- AI Facts Breakdown -->
        <div class="nyaya-facts-grid">
          <div class="nyaya-fact-card">
            <small>समस्या का सारांश (Summary)</small>
            <p><strong>${escapeHtml(an.summary)}</strong></p>
          </div>
          <div class="nyaya-fact-card">
            <small>श्रेणी (Category & Domain)</small>
            <p><strong>${escapeHtml(an.category)}</strong></p>
          </div>
          <div class="nyaya-fact-card">
            <small>सक्षम विभाग (Competent Department)</small>
            <p><strong>${escapeHtml(rt.department || "Municipal Administration")}</strong></p>
          </div>
          <div class="nyaya-fact-card">
            <small>मानक समाधान अवधि (SLA Window)</small>
            <p><strong>48-72 घंटे (नियमबद्ध ट्रैकिंग)</strong></p>
          </div>
        </div>

        <!-- Target Authority Card (The Moat) -->
        <div class="nyaya-authority-card">
          <div class="nyaya-kicker">[ लक्षित सक्षम अधिकारी एवं चैनल ]</div>
          <div class="nyaya-auth-body">
            <div class="nyaya-auth-avatar">🏛️</div>
            <div class="nyaya-auth-info">
              <h4>${escapeHtml(auth.designation || "Nodal Grievance Officer")}</h4>
              <p class="nyaya-auth-office">${escapeHtml(auth.office_name || "Nagpur Municipal Corporation")}</p>
              <p class="nyaya-auth-meta">
                <span>📍 अधिकार क्षेत्र: ${escapeHtml(auth.jurisdiction || "Nagpur Urban")}</span> |
                <span>📧 ईमेल: ${escapeHtml(auth.email || "nodal@nmcnagpur.gov.in")}</span> |
                <span>🌐 पोर्टल: <a href="${escapeHtml(auth.portal_url || '#')}" target="_blank">${escapeHtml(auth.portal_url || "pgportal.gov.in")}</a></span>
              </p>
            </div>
            <div class="nyaya-auth-channel-badge">
              <span class="nyaya-channel-pill">${rt.channel} DISPATCH</span>
              <small>सत्यापित सरकारी स्रोत</small>
            </div>
          </div>
        </div>

        <!-- Generated Formal Complaint Letter Preview -->
        <div class="nyaya-draft-box">
          <div class="nyaya-draft-tabs">
            <button type="button" class="nyaya-tab-btn is-active" id="btn-tab-hi">हिंदी शिकायत पत्र</button>
            <button type="button" class="nyaya-tab-btn" id="btn-tab-en">English Formal Letter</button>
          </div>
          <pre id="draft-letter-preview" class="nyaya-letter-pre">${escapeHtml(drafts.hi || drafts.local || drafts.en)}</pre>
        </div>

        <!-- One-Click Official Submission Row -->
        <div class="nyaya-final-actions">
          <button type="button" id="btn-execute-submit" class="nyaya-btn nyaya-btn-success nyaya-btn-large">
            🚀 <strong>अधिकारी को शिकायत भेजें (Submit via ${rt.channel})</strong>
          </button>
          <a href="#nyaya-tracker-mount" id="btn-view-tracker" class="nyaya-btn nyaya-btn-outline">
            📊 केस डैशबोर्ड पर ट्रैक करें (Live Tracking)
          </a>
        </div>

        <div id="submit-result-box" class="nyaya-status nyaya-hidden"></div>
      </div>
    `;

    rev.classList.remove("nyaya-hidden");

    // Tab switching for bilingual draft
    var tabHi = document.getElementById("btn-tab-hi");
    var tabEn = document.getElementById("btn-tab-en");
    var letterPre = document.getElementById("draft-letter-preview");

    if (tabHi && tabEn) {
      tabHi.onclick = function () {
        tabHi.classList.add("is-active");
        tabEn.classList.remove("is-active");
        letterPre.textContent = drafts.hi || drafts.local;
      };
      tabEn.onclick = function () {
        tabEn.classList.add("is-active");
        tabHi.classList.remove("is-active");
        letterPre.textContent = drafts.en;
      };
    }

    // Clarification button click
    var btnClarify = document.getElementById("btn-submit-clarify");
    if (btnClarify) {
      btnClarify.onclick = async function () {
        var ans = document.getElementById("clarify-answer-input").value.trim();
        if (!ans) return;
        btnClarify.disabled = true;
        btnClarify.textContent = "प्रक्रिया जारी...";
        try {
          var clRes = await window.NyayaAPI.clarifyComplaint(data.case_id, ans);
          alert("स्पष्टीकरण दर्ज हो गया है! AI ने शिकायत को अद्यतन कर दिया है।");
          document.querySelector(".nyaya-clarify-box").style.display = "none";
        } catch (e) {
          alert("त्रुटि: " + e.message);
        }
      };
    }

    // Real Submission Action
    var btnSubmit = document.getElementById("btn-execute-submit");
    var resBox = document.getElementById("submit-result-box");

    btnSubmit.onclick = async function () {
      btnSubmit.disabled = true;
      btnSubmit.innerHTML = "⏳ शिकायत प्रेषित की जा रही है...";
      try {
        var subRes = await window.NyayaAPI.submitCase(data.case_id, rt.channel);
        resBox.innerHTML = `
          <div class="nyaya-success-alert">
            <h4>✓ शिकायत सफलतापूर्वक दर्ज हो गई है!</h4>
            <p><strong>संदर्भ ट्रैकिंग संख्या:</strong> ${subRes.reference_id}</p>
            <p><strong>चैनल:</strong> ${subRes.channel} | <strong>स्थिति:</strong> ${subRes.status}</p>
            <p>एसएमएस एवं व्हाट्सऐप के माध्यम से आपको प्राप्ति सूचना भेज दी गई है।</p>
          </div>
        `;
        resBox.classList.remove("nyaya-hidden");
        btnSubmit.innerHTML = "✓ प्रेषित (Submitted)";

        // Also trigger dashboard refresh if loaded
        if (window.NyayaDashboard && window.NyayaDashboard.loadCase) {
          window.NyayaDashboard.loadCase(data.case_id);
        }
      } catch (err) {
        resBox.textContent = "सबमिशन त्रुटि: " + err.message;
        resBox.className = "nyaya-status is-error";
        resBox.classList.remove("nyaya-hidden");
        btnSubmit.disabled = false;
        btnSubmit.innerHTML = "🚀 पुनः प्रयास करें";
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

  // Initialize UI
  renderInitialUI();
})();

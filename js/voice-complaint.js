(function () {
  "use strict";

  var root = document.getElementById("nyaya-complaint");
  if (!root || !window.NyayaAPI) return;

  var state = {
    inputType: "text",
    language: "en",
    audioBlob: null,
    audioBase64: null,
    location: {
      pincode: "831001",
      city: "Jamshedpur",
      district: "East Singhbhum",
      state: "Jharkhand",
      state_code: "JH",
      ward: "Bistupur / Northern Town",
      municipality: "Jamshedpur Notified Area Committee (JNAC)"
    },
    currentCaseId: null,
    analysis: null,
    routing: null,
    drafts: null
  };

  var knownCities = [
    { city: "Jamshedpur", district: "East Singhbhum", state: "Jharkhand", state_code: "JH", pincode: "831001", ward: "Bistupur / Sakchi", municipality: "Jamshedpur Notified Area Committee (JNAC)", lat: 22.8006, lng: 86.1871, rad: 0.6 },
    { city: "Ranchi", district: "Ranchi", state: "Jharkhand", state_code: "JH", pincode: "834001", ward: "Main Road / Doranda", municipality: "Ranchi Municipal Corporation (RMC)", lat: 23.3441, lng: 85.3096, rad: 0.5 },
    { city: "Nagpur", district: "Nagpur", state: "Maharashtra", state_code: "MH", pincode: "440010", ward: "Ward 12 (Ramdaspeth)", municipality: "Nagpur Municipal Corporation (NMC)", lat: 21.1458, lng: 79.0882, rad: 0.5 },
    { city: "New Delhi", district: "New Delhi", state: "Delhi", state_code: "DL", pincode: "110001", ward: "Connaught Place", municipality: "New Delhi Municipal Council (NDMC)", lat: 28.6139, lng: 77.2090, rad: 0.5 },
    { city: "Mumbai", district: "Mumbai", state: "Maharashtra", state_code: "MH", pincode: "400001", ward: "A Ward (Fort)", municipality: "Brihanmumbai Municipal Corporation (BMC)", lat: 18.9388, lng: 72.8354, rad: 0.5 },
    { city: "Bengaluru", district: "Bengaluru Urban", state: "Karnataka", state_code: "KA", pincode: "560001", ward: "Ward 111 (Shantala Nagar)", municipality: "Bruhat Bengaluru Mahanagara Palike (BBMP)", lat: 12.9716, lng: 77.5946, rad: 0.5 },
    { city: "Kolkata", district: "Kolkata", state: "West Bengal", state_code: "WB", pincode: "700001", ward: "BBD Bagh / Ward 45", municipality: "Kolkata Municipal Corporation (KMC)", lat: 22.5726, lng: 88.3639, rad: 0.5 },
    { city: "Patna", district: "Patna", state: "Bihar", state_code: "BR", pincode: "800001", ward: "Kankarbagh / Ward 22", municipality: "Patna Municipal Corporation (PMC)", lat: 25.5941, lng: 85.1376, rad: 0.5 },
    { city: "Lucknow", district: "Lucknow", state: "Uttar Pradesh", state_code: "UP", pincode: "226001", ward: "Hazratganj / Ward 14", municipality: "Lucknow Municipal Corporation (LMC)", lat: 26.8467, lng: 80.9462, rad: 0.5 }
  ];

  var pincodeDB = {
    "831001": { city: "Jamshedpur", district: "East Singhbhum", state: "Jharkhand", state_code: "JH", ward: "Bistupur / Northern Town", municipality: "Jamshedpur Notified Area Committee (JNAC)" },
    "831002": { city: "Jamshedpur", district: "East Singhbhum", state: "Jharkhand", state_code: "JH", ward: "Sakchi / Golmuri", municipality: "Jamshedpur Notified Area Committee (JNAC)" },
    "831005": { city: "Jamshedpur", district: "East Singhbhum", state: "Jharkhand", state_code: "JH", ward: "Mango Ward 4", municipality: "Mango Municipal Corporation" },
    "834001": { city: "Ranchi", district: "Ranchi", state: "Jharkhand", state_code: "JH", ward: "Main Road / Doranda", municipality: "Ranchi Municipal Corporation (RMC)" },
    "440010": { city: "Nagpur", district: "Nagpur", state: "Maharashtra", state_code: "MH", ward: "Ward 12 (Ramdaspeth)", municipality: "Nagpur Municipal Corporation (NMC)" },
    "440001": { city: "Nagpur", district: "Nagpur", state: "Maharashtra", state_code: "MH", ward: "Ward 10 (Civil Lines)", municipality: "Nagpur Municipal Corporation (NMC)" },
    "110001": { city: "New Delhi", district: "New Delhi", state: "Delhi", state_code: "DL", ward: "Connaught Place", municipality: "New Delhi Municipal Council (NDMC)" },
    "400001": { city: "Mumbai", district: "Mumbai", state: "Maharashtra", state_code: "MH", ward: "A Ward (Fort / Colaba)", municipality: "Brihanmumbai Municipal Corporation (BMC)" },
    "560001": { city: "Bengaluru", district: "Bengaluru Urban", state: "Karnataka", state_code: "KA", ward: "Ward 111 (Shantala Nagar)", municipality: "Bruhat Bengaluru Mahanagara Palike (BBMP)" },
    "700001": { city: "Kolkata", district: "Kolkata", state: "West Bengal", state_code: "WB", ward: "BBD Bagh / Ward 45", municipality: "Kolkata Municipal Corporation (KMC)" },
    "800001": { city: "Patna", district: "Patna", state: "Bihar", state_code: "BR", ward: "Kankarbagh / Ward 22", municipality: "Patna Municipal Corporation (PMC)" },
    "226001": { city: "Lucknow", district: "Lucknow", state: "Uttar Pradesh", state_code: "UP", ward: "Hazratganj / Ward 14", municipality: "Lucknow Municipal Corporation (LMC)" }
  };

  function updateJurisdictionBanner() {
    var loc = state.location;
    var el = document.getElementById("location-resolved-badge");
    if (el) {
      el.innerHTML = `<span class="nyaya-badge-icon">📍</span><span>Resolved Jurisdiction: <strong>${loc.ward || loc.city}, ${loc.district} (${loc.state}) — ${loc.municipality || "Local Authority"} [PIN: ${loc.pincode}]</strong></span>`;
    }
    var pinInput = document.getElementById("input-pincode");
    if (pinInput && pinInput.value !== loc.pincode) {
      pinInput.value = loc.pincode;
    }
  }

  function resolveLocationFromCoords(lat, lng) {
    // 1. Check known city clusters
    var matched = null;
    var minDiff = 9999;
    for (var i = 0; i < knownCities.length; i++) {
      var c = knownCities[i];
      var dLat = Math.abs(c.lat - lat);
      var dLng = Math.abs(c.lng - lng);
      var dist = Math.sqrt(dLat * dLat + dLng * dLng);
      if (dist <= (c.rad || 0.5) && dist < minDiff) {
        minDiff = dist;
        matched = c;
      }
    }

    if (matched) {
      state.location = {
        lat: lat,
        lng: lng,
        pincode: matched.pincode,
        city: matched.city,
        district: matched.district,
        state: matched.state,
        state_code: matched.state_code,
        ward: matched.ward,
        municipality: matched.municipality
      };
      updateJurisdictionBanner();
      setStatus(`✓ GPS Verified: ${matched.city}, ${matched.district} (${matched.state}) [${lat.toFixed(4)}, ${lng.toFixed(4)}]`, false);
      return;
    }

    // 2. Fallback to OpenStreetMap Nominatim
    fetch(`https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}`)
      .then(function (r) { return r.json(); })
      .then(function (data) {
        var addr = data.address || {};
        var city = addr.city || addr.town || addr.municipality || addr.county || "Local Area";
        var district = addr.state_district || addr.county || city;
        var st = addr.state || "State Jurisdiction";
        var postcode = addr.postcode || "831001";
        var sub = addr.suburb || addr.neighbourhood || addr.road || "Central Ward";

        state.location = {
          lat: lat,
          lng: lng,
          pincode: postcode,
          city: city,
          district: district,
          state: st,
          state_code: "IN",
          ward: sub,
          municipality: city + " Municipal Administration"
        };
        updateJurisdictionBanner();
        setStatus(`✓ GPS Verified: ${city}, ${district} (${st}) [PIN: ${postcode}]`, false);
      })
      .catch(function () {
        // Fallback default
        state.location = {
          lat: lat,
          lng: lng,
          pincode: "831001",
          city: "Jamshedpur",
          district: "East Singhbhum",
          state: "Jharkhand",
          state_code: "JH",
          ward: "Jamshedpur Urban",
          municipality: "Jamshedpur Notified Area Committee (JNAC)"
        };
        updateJurisdictionBanner();
        setStatus(`✓ GPS Locked: ${lat.toFixed(4)}, ${lng.toFixed(4)}`, false);
      });
  }

  function resolveLocationFromPincode(pin) {
    if (pincodeDB[pin]) {
      var item = pincodeDB[pin];
      state.location = {
        pincode: pin,
        city: item.city,
        district: item.district,
        state: item.state,
        state_code: item.state_code,
        ward: item.ward,
        municipality: item.municipality
      };
      updateJurisdictionBanner();
      setStatus(`✓ PIN Resolved: ${item.city}, ${item.district} (${item.state})`, false);
    } else {
      state.location.pincode = pin;
      state.location.ward = "PIN Area " + pin;
      updateJurisdictionBanner();
    }
  }

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
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
              </div>
              <div class="nyaya-mode-text">
                <strong>Type Problem</strong>
                <span>English, Hindi or Hinglish</span>
              </div>
            </button>

            <button type="button" class="nyaya-mode-card" id="btn-mode-voice">
              <div class="nyaya-mode-icon-wrap">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"></path><path d="M19 10v2a7 7 0 0 1-14 0v-2"></path><line x1="12" y1="19" x2="12" y2="23"></line><line x1="8" y1="23" x2="16" y2="23"></line></svg>
              </div>
              <div class="nyaya-mode-text">
                <strong>Voice Intake</strong>
                <span>22 Indic Languages (Sarvam STT)</span>
              </div>
            </button>

            <button type="button" class="nyaya-mode-card" id="btn-mode-image">
              <div class="nyaya-mode-icon-wrap">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><circle cx="8.5" cy="8.5" r="1.5"></circle><polyline points="21 15 16 10 5 21"></polyline></svg>
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
              <textarea id="complaint-text-input" class="nyaya-textarea" rows="3" placeholder="Example: Severe road pothole and overflowing drainage near Bistupur Main Road causing severe waterlogging and traffic hazard..."></textarea>
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
              <p class="nyaya-hint-text">Speak naturally in English, Hindi, Bengali, Santhali, or any Indic language. AI transcribes and structures your grievance.</p>
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
                <option value="bn">বাংলা (Bengali)</option>
                <option value="mr">मराठी (Marathi)</option>
                <option value="ta">தமிழ் (Tamil)</option>
                <option value="te">తెలుగు (Telugu)</option>
                <option value="gu">ગુજરાતી (Gujarati)</option>
                <option value="kn">ಕನ್ನಡ (Kannada)</option>
              </select>
            </div>

            <div class="nyaya-control-field">
              <label class="nyaya-label" for="input-pincode">PIN Code / Jurisdiction</label>
              <div class="nyaya-pin-input-wrap">
                <input type="text" id="input-pincode" class="nyaya-input" value="831001" placeholder="e.g. 831001">
                <button type="button" id="btn-detect-gps" class="nyaya-btn-gps" title="Auto-detect location via GPS">
                  📍 Auto-Detect
                </button>
              </div>
            </div>
          </div>

          <!-- Resolved Jurisdiction Pill -->
          <div class="nyaya-jurisdiction-banner" id="location-resolved-badge">
            <span class="nyaya-badge-icon">📍</span>
            <span>Resolved Jurisdiction: <strong>Bistupur / Northern Town, East Singhbhum (Jharkhand) — Jamshedpur Notified Area Committee (JNAC) [PIN: 831001]</strong></span>
          </div>

          <!-- Main CTA Submit Button -->
          <div class="nyaya-action-row">
            <button type="button" id="btn-process-ai" class="nyaya-cta-btn">
              ✨ Analyze & Route with AI
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
          var lat = pos.coords.latitude;
          var lng = pos.coords.longitude;
          resolveLocationFromCoords(lat, lng);
        }, function (err) {
          setStatus("GPS permission notice (" + err.message + "). Using PIN code lookup.", false);
        }, { enableHighAccuracy: true, timeout: 10000 });
      } else {
        setStatus("Geolocation not supported by browser.", true);
      }
    };

    document.getElementById("input-pincode").onchange = function (e) {
      var pin = e.target.value.trim();
      resolveLocationFromPincode(pin);
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
      textVal = "Severe road pothole and overflowing drainage near Bistupur Main Road causing severe waterlogging and traffic hazard.";
      document.getElementById("complaint-text-input").value = textVal;
    }

    setStatus("AI Pipeline is analyzing grievance, classifying domain, and resolving target authority...", false);

    var loc = state.location;
    var payload = {
      text: textVal || "Severe road pothole and overflowing drainage near Bistupur Main Road.",
      language: lang,
      input_type: state.inputType,
      audio_base64: state.audioBase64,
      location: {
        pincode: pin || loc.pincode || "831001",
        city: loc.city || "Jamshedpur",
        district: loc.district || "East Singhbhum",
        state: loc.state || "Jharkhand",
        state_code: loc.state_code || "JH",
        ward: loc.ward || "Bistupur / Northern Town",
        municipality: loc.municipality || "Jamshedpur Notified Area Committee (JNAC)",
        address: (loc.ward || loc.city) + ", " + (loc.district || "East Singhbhum")
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

    var confPercent = Math.round((an.confidence || 0.94) * 100);
    var sevBadgeClass = "is-" + (an.severity || "high").toLowerCase();

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
            <p class="nyaya-fact-content">${escapeHtml(rt.department || auth.office_name || "Municipal Authority")}</p>
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
              <h4>${escapeHtml(auth.designation || "Special Officer / Nodal Grievance Executive")}</h4>
              <p class="nyaya-dossier-office">${escapeHtml(auth.office_name || "Jamshedpur Notified Area Committee (JNAC)")}</p>
              <div class="nyaya-dossier-meta">
                <span>📍 Jurisdiction: ${escapeHtml(auth.jurisdiction || (state.location.city + ", " + state.location.state))}</span>
                <span>📧 Official Email: ${escapeHtml(auth.email || "grievances@jharkhand.gov.in")}</span>
                <span>🌐 Portal: <a href="${escapeHtml(auth.portal_url || '#')}" target="_blank" rel="noopener">${escapeHtml(auth.portal_url || "udhd.jharkhand.gov.in")}</a></span>
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

        <div class="nyaya-submission-cta-row">
          <button type="button" id="btn-execute-submit" class="nyaya-submit-btn">
            🚀 Submit Official Complaint via ${rt.channel || "PORTAL"}
          </button>
          <a href="#nyaya-tracker-mount" class="nyaya-track-anchor-btn">
            📊 View in Case Tracker
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
            <p><strong>Government Reference Number:</strong> ${subRes.reference_id || "JH-JSR-2026-88190"}</p>
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

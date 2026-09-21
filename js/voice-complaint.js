(function () {
  "use strict";

  var root = document.getElementById("nyaya-complaint");

  if (!root || !window.NyayaAPI) {
    return;
  }

  var state = {
    inputType: "text",
    language: "en",
    audioBlob: null,
    audioBase64: null,
    location: {
      pincode: "",
      city: "",
      district: "",
      state: "",
      state_code: "",
      ward: "",
      municipality: ""
    },
    currentCaseId: null,
    analysis: null,
    routing: null,
    drafts: null
  };

  function updateJurisdictionBanner() {
    var loc = state.location;
    var el = document.getElementById("location-resolved-badge");

    if (el) {
      var jurisdiction =
        loc.ward ||
        loc.city ||
        "Location not resolved";

      var district = loc.district || "";
      var stateName = loc.state || "";
      var municipality =
        loc.municipality ||
        "Local Authority";
      var pincode =
        loc.pincode ||
        "Not provided";

      el.innerHTML =
        '<span class="nyaya-badge-icon">📍</span>' +
        "<span>Resolved Jurisdiction: <strong>" +
        escapeHtml(jurisdiction) +
        (district ? ", " + escapeHtml(district) : "") +
        (stateName
          ? " (" + escapeHtml(stateName) + ")"
          : "") +
        " — " +
        escapeHtml(municipality) +
        " [PIN: " +
        escapeHtml(pincode) +
        "]</strong></span>";
    }

    var pinInput =
      document.getElementById("input-pincode");

    if (
      pinInput &&
      state.location.pincode &&
      pinInput.value !== state.location.pincode
    ) {
      pinInput.value = state.location.pincode;
    }
  }

  function resolveLocationFromPincode(pin) {
    var cleanPin = String(pin || "").trim();

    if (!/^\d{6}$/.test(cleanPin)) {
      setStatus(
        "Please enter a valid 6-digit PIN code.",
        true
      );
      return;
    }

    state.location = {
      pincode: cleanPin,
      city: "",
      district: "",
      state: "",
      state_code: "",
      ward: "",
      municipality: ""
    };

    updateJurisdictionBanner();

    setStatus(
      "PIN recorded. Verify the jurisdiction shown by the official portal before filing.",
      false
    );
  }

  function resolveLocationFromCoords(lat, lng) {
    setStatus(
      "Resolving location from GPS coordinates...",
      false
    );

    var url =
      "https://nominatim.openstreetmap.org/reverse" +
      "?format=jsonv2" +
      "&lat=" +
      encodeURIComponent(lat) +
      "&lon=" +
      encodeURIComponent(lng);

    fetch(url, {
      headers: {
        Accept: "application/json"
      }
    })
      .then(function (response) {
        if (!response.ok) {
          throw new Error(
            "Unable to resolve GPS location."
          );
        }

        return response.json();
      })
      .then(function (data) {
        var address = data.address || {};

        var city =
          address.city ||
          address.town ||
          address.municipality ||
          address.village ||
          "";

        var district =
          address.state_district ||
          address.county ||
          "";

        var stateName =
          address.state || "";

        var postcode =
          address.postcode || "";

        var ward =
          address.suburb ||
          address.neighbourhood ||
          address.city_district ||
          "";

        state.location = {
          lat: lat,
          lng: lng,
          pincode: postcode,
          city: city,
          district: district,
          state: stateName,
          state_code: "",
          ward: ward,
          municipality:
            address.municipality ||
            city ||
            ""
        };

        updateJurisdictionBanner();

        setStatus(
          "✓ Location resolved. Verify the displayed jurisdiction before filing.",
          false
        );
      })
      .catch(function (error) {
        setStatus(
          "GPS location could not be resolved. Please enter your PIN code manually.",
          true
        );
      });
  }

  function renderInitialUI() {
    root.innerHTML =
      '<div class="nyaya-portal-container">' +

      '<div class="nyaya-section-header">' +
      '<div class="pill-button">[ AI Citizen Intake 2.0 ]</div>' +
      '<h2 class="section-heading is-about">Describe Your Issue — Speak, Type, or Upload</h2>' +
      '<p class="about-text">Describe your grievance and NyayaSetu will help structure the information and identify relevant guidance. You remain responsible for filing through the official portal.</p>' +
      "</div>" +

      '<div class="nyaya-card nyaya-main-card">' +

      '<div class="nyaya-mode-grid">' +

      '<button type="button" class="nyaya-mode-card is-active" id="btn-mode-text">' +
      '<div class="nyaya-mode-icon-wrap">' +
      '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">' +
      '<path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>' +
      '<path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>' +
      "</svg>" +
      "</div>" +
      '<div class="nyaya-mode-text">' +
      "<strong>Type Problem</strong>" +
      "<span>English, Hindi or Hinglish</span>" +
      "</div>" +
      "</button>" +

      '<button type="button" class="nyaya-mode-card" id="btn-mode-voice">' +
      '<div class="nyaya-mode-icon-wrap">' +
      '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">' +
      '<path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"></path>' +
      '<path d="M19 10v2a7 7 0 0 1-14 0v-2"></path>' +
      '<line x1="12" y1="19" x2="12" y2="23"></line>' +
      '<line x1="8" y1="23" x2="16" y2="23"></line>' +
      "</svg>" +
      "</div>" +
      '<div class="nyaya-mode-text">' +
      "<strong>Voice Intake</strong>" +
      "<span>Record a voice description</span>" +
      "</div>" +
      "</button>" +

      '<button type="button" class="nyaya-mode-card" id="btn-mode-image">' +
      '<div class="nyaya-mode-icon-wrap">' +
      '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">' +
      '<rect x="3" y="3" width="18" height="18" rx="2"></rect>' +
      '<circle cx="8.5" cy="8.5" r="1.5"></circle>' +
      '<polyline points="21 15 16 10 5 21"></polyline>' +
      "</svg>" +
      "</div>" +
      '<div class="nyaya-mode-text">' +
      "<strong>Upload Photo</strong>" +
      "<span>Site evidence & damage reference</span>" +
      "</div>" +
      "</button>" +

      "</div>" +

      '<div id="panel-text-mode" class="nyaya-panel">' +
      '<div class="nyaya-form-group">' +
      '<label class="nyaya-label" for="complaint-text-input">Detailed Problem Description</label>' +
      '<textarea id="complaint-text-input" class="nyaya-textarea" rows="5" placeholder="Describe what happened, where it happened, and what action you need."></textarea>' +
      "</div>" +
      "</div>" +

      '<div id="panel-voice-mode" class="nyaya-panel nyaya-hidden">' +
      '<div class="nyaya-voice-recorder-box">' +
      '<button type="button" id="btn-record-voice" class="nyaya-voice-record-btn">' +
      '<span class="nyaya-pulse-ring"></span>' +
      '<span class="nyaya-mic-symbol">🎙️</span>' +
      '<span id="txt-record-state" class="nyaya-mic-label">Click to Start Recording</span>' +
      "</button>" +
      '<div id="voice-timer" class="nyaya-voice-timer nyaya-hidden">00:00</div>' +
      '<audio id="audio-preview" class="nyaya-audio-player nyaya-hidden" controls></audio>' +
      '<p class="nyaya-hint-text">Speak naturally. Review the information before using any official portal.</p>' +
      "</div>" +
      "</div>" +

      '<div id="panel-image-mode" class="nyaya-panel nyaya-hidden">' +
      '<div class="nyaya-upload-dropzone" id="drop-zone-image">' +
      '<input type="file" id="file-image-input" accept="image/*" class="nyaya-file-input">' +
      '<div class="nyaya-upload-content">' +
      '<span class="nyaya-upload-symbol">📸</span>' +
      "<p><strong>Click to browse or drop site photos here</strong></p>" +
      "<small>Supports PNG, JPG, WebP (Max 10MB)</small>" +
      "</div>" +
      '<div id="image-preview-box" class="nyaya-image-preview-box nyaya-hidden"></div>' +
      "</div>" +
      "</div>" +

      '<div class="nyaya-controls-row">' +

      '<div class="nyaya-control-field">' +
      '<label class="nyaya-label" for="select-language">Input Language</label>' +
      '<select id="select-language" class="nyaya-select">' +
      '<option value="en" selected>English</option>' +
      '<option value="hi">हिन्दी (Hindi)</option>' +
      '<option value="bn">বাংলা (Bengali)</option>' +
      '<option value="mr">मराठी (Marathi)</option>' +
      '<option value="ta">தமிழ் (Tamil)</option>' +
      '<option value="te">తెలుగు (Telugu)</option>' +
      '<option value="gu">ગુજરાતી (Gujarati)</option>' +
      '<option value="kn">ಕನ್ನಡ (Kannada)</option>' +
      "</select>" +
      "</div>" +

      '<div class="nyaya-control-field">' +
      '<label class="nyaya-label" for="input-pincode">PIN Code / Jurisdiction</label>' +
      '<div class="nyaya-pin-input-wrap">' +
      '<input type="text" id="input-pincode" class="nyaya-input" value="" placeholder="Enter 6-digit PIN">' +
      '<button type="button" id="btn-detect-gps" class="nyaya-btn-gps" title="Auto-detect location via GPS">📍 Auto-Detect</button>' +
      "</div>" +
      "</div>" +

      "</div>" +

      '<div class="nyaya-jurisdiction-banner" id="location-resolved-badge">' +
      '<span class="nyaya-badge-icon">📍</span>' +
      "<span>Resolved Jurisdiction: <strong>Enter your PIN code or use Auto-Detect.</strong></span>" +
      "</div>" +

      '<div class="nyaya-action-row">' +
      '<button type="button" id="btn-process-ai" class="nyaya-cta-btn">✨ Analyze & Route with AI</button>' +
      "</div>" +

      '<div id="intake-status" class="nyaya-status-message nyaya-hidden"></div>' +

      '<div id="review-section" class="nyaya-review-wrapper nyaya-hidden"></div>' +

      "</div>" +
      "</div>";

    bindEvents();
  }

  function bindEvents() {
    var btnText =
      document.getElementById("btn-mode-text");
    var btnVoice =
      document.getElementById("btn-mode-voice");
    var btnImage =
      document.getElementById("btn-mode-image");

    var pText =
      document.getElementById("panel-text-mode");
    var pVoice =
      document.getElementById("panel-voice-mode");
    var pImage =
      document.getElementById("panel-image-mode");

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
      [btnText, btnVoice, btnImage].forEach(
        function (button) {
          button.classList.remove("is-active");
        }
      );

      [pText, pVoice, pImage].forEach(
        function (panel) {
          panel.classList.add("nyaya-hidden");
        }
      );

      activeBtn.classList.add("is-active");
      activePanel.classList.remove("nyaya-hidden");
    }

    setupVoiceRecording();
    setupImageUpload();

    document.getElementById(
      "btn-detect-gps"
    ).onclick = function () {
      if (!navigator.geolocation) {
        setStatus(
          "Geolocation is not supported by this browser. Enter your PIN code manually.",
          true
        );
        return;
      }

      setStatus(
        "Acquiring GPS coordinates...",
        false
      );

      navigator.geolocation.getCurrentPosition(
        function (position) {
          resolveLocationFromCoords(
            position.coords.latitude,
            position.coords.longitude
          );
        },
        function () {
          setStatus(
            "GPS permission was unavailable. Please enter your PIN code manually.",
            true
          );
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 300000
        }
      );
    };

    document.getElementById(
      "input-pincode"
    ).onchange = function (event) {
      resolveLocationFromPincode(
        event.target.value
      );
    };

    document.getElementById(
      "select-language"
    ).onchange = function (event) {
      state.language = event.target.value;
    };

    document.getElementById(
      "btn-process-ai"
    ).onclick = function () {
      handleIntakeSubmission();
    };
  }

  var mediaRecorder = null;
  var audioChunks = [];
  var isRecording = false;

  function setupVoiceRecording() {
    var btnRecord =
      document.getElementById("btn-record-voice");

    var txtState =
      document.getElementById("txt-record-state");

    var audioPlayer =
      document.getElementById("audio-preview");

    btnRecord.onclick = async function () {
      if (isRecording) {
        if (
          mediaRecorder &&
          mediaRecorder.state === "recording"
        ) {
          mediaRecorder.stop();
        }

        isRecording = false;
        btnRecord.classList.remove(
          "is-recording"
        );

        txtState.textContent =
          "Recording Complete (Click to Re-record)";

        return;
      }

      if (
        !navigator.mediaDevices ||
        !navigator.mediaDevices.getUserMedia
      ) {
        setStatus(
          "Voice recording is not supported by this browser.",
          true
        );
        return;
      }

      try {
        var stream =
          await navigator.mediaDevices.getUserMedia({
            audio: true
          });

        mediaRecorder =
          new MediaRecorder(stream);

        audioChunks = [];

        mediaRecorder.ondataavailable =
          function (event) {
            if (event.data.size > 0) {
              audioChunks.push(event.data);
            }
          };

        mediaRecorder.onstop = function () {
          stream.getTracks().forEach(
            function (track) {
              track.stop();
            }
          );

          state.audioBlob = new Blob(
            audioChunks,
            {
              type:
                mediaRecorder.mimeType ||
                "audio/webm"
            }
          );

          audioPlayer.src =
            URL.createObjectURL(
              state.audioBlob
            );

          audioPlayer.classList.remove(
            "nyaya-hidden"
          );

          var reader = new FileReader();

          reader.onloadend = function () {
            var result =
              String(reader.result || "");

            state.audioBase64 =
              result.indexOf(",") >= 0
                ? result.split(",")[1]
                : result;
          };

          reader.readAsDataURL(
            state.audioBlob
          );
        };

        mediaRecorder.start();

        isRecording = true;

        btnRecord.classList.add(
          "is-recording"
        );

        txtState.textContent =
          "Listening... (Click to Finish)";
      } catch (error) {
        setStatus(
          "Microphone access unavailable: " +
            (error.message || "Permission denied."),
          true
        );
      }
    };
  }

  function setupImageUpload() {
    var input =
      document.getElementById("file-image-input");

    var preview =
      document.getElementById(
        "image-preview-box"
      );

    input.onchange = function () {
      if (
        !input.files ||
        !input.files[0]
      ) {
        return;
      }

      var file = input.files[0];

      if (file.size > 10 * 1024 * 1024) {
        setStatus(
          "Image is larger than 10 MB. Please choose a smaller file.",
          true
        );

        input.value = "";
        return;
      }

      if (
        file.type &&
        file.type.indexOf("image/") !== 0
      ) {
        setStatus(
          "Please select a valid image file.",
          true
        );

        input.value = "";
        return;
      }

      var reader = new FileReader();

      reader.onload = function (event) {
        preview.innerHTML =
          '<img src="' +
          escapeHtml(event.target.result) +
          '" alt="Uploaded site evidence" class="nyaya-evidence-preview-img">' +
          '<span class="nyaya-file-badge">✓ Site Evidence Attached</span>';

        preview.classList.remove(
          "nyaya-hidden"
        );
      };

      reader.readAsDataURL(file);
    };
  }

  function setStatus(message, isError) {
    var el =
      document.getElementById("intake-status");

    if (!el) {
      return;
    }

    el.textContent = message || "";

    el.className =
      "nyaya-status-message " +
      (isError ? "is-error" : "is-active");

    el.classList.remove(
      "nyaya-hidden"
    );
  }

  async function handleIntakeSubmission() {
    var textInput =
      document.getElementById(
        "complaint-text-input"
      );

    var textVal =
      textInput.value.trim();

    var lang =
      document.getElementById(
        "select-language"
      ).value;

    var pin =
      document.getElementById(
        "input-pincode"
      ).value.trim();

    if (
      state.inputType === "text" &&
      !textVal
    ) {
      setStatus(
        "Please describe your grievance before continuing.",
        true
      );
      textInput.focus();
      return;
    }

    if (
      state.inputType === "voice" &&
      !state.audioBase64
    ) {
      setStatus(
        "Please record your voice description before continuing.",
        true
      );
      return;
    }

    if (
      state.inputType === "image" &&
      !document.getElementById(
        "file-image-input"
      ).files.length
    ) {
      setStatus(
        "Please select an image before continuing.",
        true
      );
      return;
    }

    if (!pin) {
      setStatus(
        "Enter your 6-digit PIN code or use Auto-Detect before continuing.",
        true
      );
      return;
    }

    setStatus(
      "AI Pipeline is analyzing grievance and resolving relevant guidance...",
      false
    );

    var loc = state.location;

    var payload = {
      text:
        textVal ||
        "Citizen grievance submitted through NyayaSetu.",
      language: lang,
      input_type: state.inputType,
      audio_base64: state.audioBase64,
      location: {
        pincode:
          pin ||
          loc.pincode ||
          "",
        city:
          loc.city ||
          "",
        district:
          loc.district ||
          "",
        state:
          loc.state ||
          "",
        state_code:
          loc.state_code ||
          "",
        ward:
          loc.ward ||
          "",
        municipality:
          loc.municipality ||
          "",
        address:
          (loc.ward || loc.city || "") +
          (loc.district
            ? ", " + loc.district
            : "")
      }
    };

    try {
      var response =
        await window.NyayaAPI.submitComplaint(
          payload
        );

      state.currentCaseId =
        response.case_id ||
        null;

      state.analysis =
        response.analysis ||
        {};

      state.routing =
        response.routing ||
        {};

      state.drafts =
        response.complaint_draft ||
        {};

      setStatus(
        "✓ Analysis complete. Review the guidance below.",
        false
      );

      renderReviewSection(response);
    } catch (error) {
      setStatus(
        "Error: " +
          (error.message ||
            "Unable to analyze the grievance."),
        true
      );
    }
  }

  function renderReviewSection(data) {
    var review =
      document.getElementById(
        "review-section"
      );

    var analysis =
      data.analysis || {};

    var routing =
      data.routing || {};

    var authority =
      routing.authority || {};

    var drafts =
      data.complaint_draft || {};

    var confidence =
      Number(analysis.confidence);

    if (!isFinite(confidence)) {
      confidence = 0;
    }

    var confidencePercent =
      Math.max(
        0,
        Math.min(
          100,
          Math.round(
            confidence <= 1
              ? confidence * 100
              : confidence
          )
        )
      );

    var severity =
      String(
        analysis.severity || "normal"
      ).toLowerCase();

    var clarificationHtml = "";

    if (
      data.requires_clarification &&
      data.clarification_question
    ) {
      clarificationHtml =
        '<div class="nyaya-clarification-card">' +
        '<div class="pill-button">[ Clarification Required ]</div>' +
        '<p class="nyaya-clarify-prompt"><strong>Question:</strong> ' +
        escapeHtml(
          data.clarification_question
        ) +
        "</p>" +
        '<div class="nyaya-clarify-input-row">' +
        '<input type="text" id="clarify-answer-input" class="nyaya-input" placeholder="Type a brief answer...">' +
        '<button type="button" id="btn-submit-clarify" class="button is-secondary">Submit Clarification</button>' +
        "</div>" +
        "</div>";
    }

    var authorityName =
      authority.office_name ||
      authority.designation ||
      routing.department ||
      "Relevant Government Authority";

    var portalUrl =
      authority.portal_url ||
      "";

    var portalHtml = portalUrl
      ? '<a href="' +
        escapeHtml(portalUrl) +
        '" target="_blank" rel="noopener noreferrer">' +
        escapeHtml(portalUrl) +
        "</a>"
      : "Use the official portal listed in the route guidance.";

    var englishDraft =
      drafts.en ||
      drafts.local ||
      drafts.hi ||
      "Draft unavailable.";

    var hindiDraft =
      drafts.hi ||
      drafts.local ||
      drafts.en ||
      "Draft unavailable.";

    review.innerHTML =
      '<div class="nyaya-review-container">' +

      '<div class="nyaya-review-header-bar">' +
      '<div class="nyaya-case-id-wrap">' +
      '<span class="nyaya-tag-label">GUIDANCE RECORD</span>' +
      '<span class="nyaya-tag-value">' +
      escapeHtml(
        data.case_id || "Generated"
      ) +
      "</span>" +
      '<span class="nyaya-badge is-' +
      escapeHtml(severity) +
      '">SEVERITY: ' +
      escapeHtml(
        severity.toUpperCase()
      ) +
      "</span>" +
      "</div>" +

      '<div class="nyaya-confidence-gauge">' +
      '<span class="nyaya-gauge-label">AI Match Confidence: <strong>' +
      confidencePercent +
      "%</strong></span>" +
      '<div class="nyaya-gauge-track">' +
      '<div class="nyaya-gauge-bar" style="width: ' +
      confidencePercent +
      '%;"></div>' +
      "</div>" +
      "</div>" +
      "</div>" +

      clarificationHtml +

      '<div class="nyaya-facts-matrix">' +

      '<div class="nyaya-fact-box">' +
      '<span class="nyaya-fact-label">Grievance Summary</span>' +
      '<p class="nyaya-fact-content">' +
      escapeHtml(
        analysis.summary ||
          "Summary generated from the submitted description."
      ) +
      "</p>" +
      "</div>" +

      '<div class="nyaya-fact-box">' +
      '<span class="nyaya-fact-label">Domain & Category</span>' +
      '<p class="nyaya-fact-content">' +
      escapeHtml(
        analysis.category ||
          "Not specified"
      ) +
      "</p>" +
      "</div>" +

      '<div class="nyaya-fact-box">' +
      '<span class="nyaya-fact-label">Relevant Department</span>' +
      '<p class="nyaya-fact-content">' +
      escapeHtml(
        routing.department ||
          authority.office_name ||
          "Not specified"
      ) +
      "</p>" +
      "</div>" +

      '<div class="nyaya-fact-box">' +
      '<span class="nyaya-fact-label">Guidance</span>' +
      '<p class="nyaya-fact-content">Review the route and file through the official portal yourself.</p>' +
      "</div>" +

      "</div>" +

      '<div class="nyaya-authority-dossier">' +
      '<div class="pill-button">[ Target Authority ]</div>' +
      '<div class="nyaya-dossier-body">' +
      '<div class="nyaya-dossier-icon">🏛️</div>' +
      '<div class="nyaya-dossier-details">' +
      "<h4>" +
      escapeHtml(authorityName) +
      "</h4>" +
      '<p class="nyaya-dossier-office">' +
      escapeHtml(
        authority.designation ||
          routing.department ||
          ""
      ) +
      "</p>" +
      '<div class="nyaya-dossier-meta">' +
      "<span>📍 Jurisdiction: " +
      escapeHtml(
        authority.jurisdiction ||
          state.location.city ||
          "Not specified"
      ) +
      "</span>" +
      "<span>🌐 Portal: " +
      portalHtml +
      "</span>" +
      "</div>" +
      "</div>" +
      "</div>" +
      "</div>" +

      '<div class="nyaya-draft-section">' +
      '<div class="nyaya-draft-nav">' +
      '<button type="button" class="nyaya-draft-tab is-active" id="btn-tab-en">English Formal Letter</button>' +
      '<button type="button" class="nyaya-draft-tab" id="btn-tab-hi">Hindi Complaint Draft</button>' +
      "</div>" +
      '<pre id="draft-letter-preview" class="nyaya-letter-box">' +
      escapeHtml(englishDraft) +
      "</pre>" +
      "</div>" +

      '<div class="nyaya-submission-cta-row">' +
      '<a href="#nyaya-tracker-mount" class="nyaya-track-anchor-btn">📊 View Case Tracker</a>' +
      "</div>" +

      '<div class="nyaya-status-message is-active">' +
      "NyayaSetu provides guidance and draft preparation. File the complaint yourself through the official government portal." +
      "</div>" +

      "</div>";

    review.classList.remove(
      "nyaya-hidden"
    );

    var tabEnglish =
      document.getElementById(
        "btn-tab-en"
      );

    var tabHindi =
      document.getElementById(
        "btn-tab-hi"
      );

    var letterPreview =
      document.getElementById(
        "draft-letter-preview"
      );

    if (tabEnglish && tabHindi) {
      tabEnglish.onclick = function () {
        tabEnglish.classList.add(
          "is-active"
        );

        tabHindi.classList.remove(
          "is-active"
        );

        letterPreview.textContent =
          englishDraft;
      };

      tabHindi.onclick = function () {
        tabHindi.classList.add(
          "is-active"
        );

        tabEnglish.classList.remove(
          "is-active"
        );

        letterPreview.textContent =
          hindiDraft;
      };
    }

    var clarifyButton =
      document.getElementById(
        "btn-submit-clarify"
      );

    if (clarifyButton) {
      clarifyButton.onclick =
        async function () {
          var input =
            document.getElementById(
              "clarify-answer-input"
            );

          var answer =
            input.value.trim();

          if (!answer) {
            return;
          }

          clarifyButton.disabled = true;
          clarifyButton.textContent =
            "Updating...";

          try {
            await window.NyayaAPI.clarifyComplaint(
              data.case_id,
              answer
            );

            clarifyButton.textContent =
              "Clarification recorded";

            var card =
              document.querySelector(
                ".nyaya-clarification-card"
              );

            if (card) {
              card.style.display =
                "none";
            }
          } catch (error) {
            clarifyButton.disabled =
              false;

            clarifyButton.textContent =
              "Submit Clarification";

            setStatus(
              "Could not record clarification: " +
                (error.message || "Unknown error."),
              true
            );
          }
        };
    }
  }

  function escapeHtml(value) {
    return String(value || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  renderInitialUI();
})();
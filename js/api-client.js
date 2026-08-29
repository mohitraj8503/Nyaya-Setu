(function (window) {
  "use strict";

  var API_BASE = window.NYAYASETU_API_URL || "http://localhost:5000/api/v1";

  function request(path, options) {
    var config = options || {};
    return fetch(API_BASE + path, {
      method: config.method || "GET",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      body: config.body ? JSON.stringify(config.body) : undefined,
    }).then(function (response) {
      return response.json().then(function (payload) {
        if (!response.ok || (payload && payload.ok === false && payload.success === false)) {
          var error = new Error((payload && (payload.message || payload.error)) || "Request failed");
          error.status = response.status;
          error.payload = payload;
          throw error;
        }
        return payload;
      });
    });
  }

  function showToast(message, type) {
    var toastContainer = document.getElementById("nyaya-toast-container");
    if (!toastContainer) {
      toastContainer = document.createElement("div");
      toastContainer.id = "nyaya-toast-container";
      toastContainer.style.cssText =
        "position:fixed;bottom:24px;right:24px;z-index:999999;display:flex;flex-direction:column;gap:12px;pointer-events:none;font-family:Inter,system-ui,-apple-system,sans-serif;";
      document.body.appendChild(toastContainer);
    }

    var isSuccess = type !== "error";
    var toast = document.createElement("div");
    toast.style.cssText =
      "background:" +
      (isSuccess ? "linear-gradient(135deg,#0f4c3a,#166534)" : "linear-gradient(135deg,#7f1d1d,#991b1b)") +
      ";color:#fff;padding:14px 20px;border-radius:10px;font-size:14px;font-weight:500;box-shadow:0 10px 25px rgba(0,0,0,0.35);border:1px solid " +
      (isSuccess ? "rgba(74,222,128,0.4)" : "rgba(248,113,113,0.4)") +
      ";display:flex;align-items:center;gap:10px;opacity:0;transform:translateY(20px);transition:all 0.3s cubic-bezier(0.16,1,0.3,1);pointer-events:auto;max-width:380px;";

    toast.innerHTML =
      '<span style="font-size:18px;">' +
      (isSuccess ? "✅" : "⚠️") +
      '</span><div style="line-height:1.4;">' +
      String(message || "") +
      "</div>";

    toastContainer.appendChild(toast);

    requestAnimationFrame(function () {
      toast.style.opacity = "1";
      toast.style.transform = "translateY(0)";
    });

    setTimeout(function () {
      toast.style.opacity = "0";
      toast.style.transform = "translateY(10px)";
      setTimeout(function () {
        if (toast.parentNode) {
          toast.parentNode.removeChild(toast);
        }
      }, 300);
    }, 4500);
  }

  function initGlobalForms() {
    // 1. Contact Forms on contact.html and others
    var contactForms = document.querySelectorAll("form#wf-form-Number-Form, form.contant-form");
    contactForms.forEach(function (form) {
      if (form.dataset.nyayaBound) return;
      form.dataset.nyayaBound = "true";

      var parentBlock = form.closest(".form-block") || form.parentElement;
      var successDiv = parentBlock ? parentBlock.querySelector(".w-form-done") : null;
      var failDiv = parentBlock ? parentBlock.querySelector(".w-form-fail") : null;
      var submitBtn = form.querySelector('input[type="submit"], button[type="submit"]');

      form.addEventListener("submit", function (e) {
        e.preventDefault();
        e.stopPropagation();

        var nameInput = form.querySelector('input[name="Name"], #Name, input[name="name"]');
        var emailInput = form.querySelector('input[name="Email"], #Email, input[name="email"]');
        var fieldSelect = form.querySelector('select[name="field"], select[name="Field"], #field');
        var messageInput = form.querySelector('textarea[name="Textarea"], #Textarea, textarea[name="message"]');
        var radioInput = form.querySelector('input[type="radio"], input[type="checkbox"]');

        var name = nameInput ? nameInput.value.trim() : "";
        var email = emailInput ? emailInput.value.trim() : "";
        var field = fieldSelect && fieldSelect.value ? fieldSelect.options[fieldSelect.selectedIndex].text : "General Citizen Inquiry";
        var message = messageInput ? messageInput.value.trim() : "";
        var agreedTerms = radioInput ? radioInput.checked : true;

        if (!name || name.length < 2) {
          showToast("Please enter your name (at least 2 characters).", "error");
          if (nameInput) nameInput.focus();
          return;
        }

        if (!email || !email.includes("@")) {
          showToast("Please enter a valid email address.", "error");
          if (emailInput) emailInput.focus();
          return;
        }

        if (!message || message.length < 10) {
          showToast("Please enter a message with at least 10 characters.", "error");
          if (messageInput) messageInput.focus();
          return;
        }

        var origText = submitBtn ? (submitBtn.value || submitBtn.textContent) : "Send Message";
        if (submitBtn) {
          submitBtn.disabled = true;
          if (submitBtn.tagName === "INPUT") submitBtn.value = "Sending...";
          else submitBtn.textContent = "Sending...";
        }

        window.NyayaAPI.submitContact({
          name: name,
          email: email,
          field: field,
          message: message,
          agreedTerms: agreedTerms,
        })
          .then(function (result) {
            form.reset();
            form.style.display = "none";
            if (successDiv) successDiv.style.display = "block";
            if (failDiv) failDiv.style.display = "none";
            showToast(result.message || "Message submitted successfully!", "success");
          })
          .catch(function (err) {
            console.error("Contact submission error:", err);
            if (failDiv) failDiv.style.display = "block";
            showToast(err.message || "Could not connect to NyayaSetu server.", "error");
          })
          .finally(function () {
            if (submitBtn) {
              submitBtn.disabled = false;
              if (submitBtn.tagName === "INPUT") submitBtn.value = origText;
              else submitBtn.textContent = origText;
            }
          });
      });
    });

    // 2. Newsletter Subscription Forms in footers
    var newsletterForms = document.querySelectorAll("form#email-form-2, form.newslatter-from");
    newsletterForms.forEach(function (form) {
      if (form.dataset.nyayaBound) return;
      form.dataset.nyayaBound = "true";

      var emailInput = form.querySelector('input[type="email"], #email');
      var submitBtn = form.querySelector('input[type="submit"], button[type="submit"]');

      form.addEventListener("submit", function (e) {
        e.preventDefault();
        e.stopPropagation();

        var email = emailInput ? emailInput.value.trim() : "";
        if (!email || !email.includes("@")) {
          showToast("Please enter a valid email address.", "error");
          return;
        }

        if (submitBtn) submitBtn.disabled = true;

        window.NyayaAPI.subscribeNewsletter({
          email: email,
          sourcePage: document.title || window.location.pathname,
        })
          .then(function (result) {
            form.reset();
            showToast(result.message || "Subscribed successfully to NyayaSetu updates!", "success");
          })
          .catch(function (err) {
            console.error("Newsletter error:", err);
            showToast(err.message || "Could not process subscription.", "error");
          })
          .finally(function () {
            if (submitBtn) submitBtn.disabled = false;
          });
      });
    });
  }

  window.NyayaAPI = {
    baseUrl: API_BASE,
    health: function () {
      return request("/health");
    },
    getProblems: function (query) {
      var suffix = query ? "?q=" + encodeURIComponent(query) : "";
      return request("/problems" + suffix);
    },
    getRoute: function (id) {
      return request("/routes/" + encodeURIComponent(id));
    },
    generateDraft: function (payload) {
      return request("/drafts/generate", { method: "POST", body: payload });
    },
    getTracker: function () {
      return request("/tracker");
    },
    saveTrackerItem: function (item) {
      return request("/tracker", { method: "POST", body: item });
    },
    submitContact: function (data) {
      return request("/contact", { method: "POST", body: data });
    },
    getContacts: function (query) {
      var suffix = query ? "?" + query : "";
      return request("/contact" + suffix);
    },
    updateContactStatus: function (id, status) {
      return request("/contact/" + encodeURIComponent(id), {
        method: "PATCH",
        body: { status: status },
      });
    },
    deleteContact: function (id) {
      return request("/contact/" + encodeURIComponent(id), { method: "DELETE" });
    },
    subscribeNewsletter: function (data) {
      return request("/newsletter", { method: "POST", body: data });
    },
    getSubscribers: function () {
      return request("/newsletter");
    },
    deleteSubscriber: function (id) {
      return request("/newsletter/" + encodeURIComponent(id), { method: "DELETE" });
    },
    getStats: function () {
      return request("/stats");
    },
    showToast: showToast,
    initForms: initGlobalForms,
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initGlobalForms);
  } else {
    initGlobalForms();
  }
})(window);


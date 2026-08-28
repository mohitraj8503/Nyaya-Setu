/**
 * NyayaSetu Client API Integration
 * Handles Contact Form submissions & Newsletter subscriptions
 * Communicates with NyayaSetu Express/MongoDB Backend (default: http://localhost:5000)
 */

(function () {
  // Detect backend API host
  const API_BASE = window.NYAYASETU_API_URL || 'http://localhost:5000/api';

  // Toast Notification Helper
  function showToast(message, type = 'success') {
    let toastContainer = document.getElementById('nyayasetu-toast-container');
    if (!toastContainer) {
      toastContainer = document.createElement('div');
      toastContainer.id = 'nyayasetu-toast-container';
      toastContainer.style.cssText = `
        position: fixed;
        bottom: 24px;
        right: 24px;
        z-index: 999999;
        display: flex;
        flex-direction: column;
        gap: 12px;
        pointer-events: none;
        font-family: 'Inter', sans-serif;
      `;
      document.body.appendChild(toastContainer);
    }

    const toast = document.createElement('div');
    const isSuccess = type === 'success';
    toast.style.cssText = `
      background: ${isSuccess ? 'linear-gradient(135deg, #0f4c3a, #166534)' : 'linear-gradient(135deg, #7f1d1d, #991b1b)'};
      color: #fff;
      padding: 14px 20px;
      border-radius: 10px;
      font-size: 14px;
      font-weight: 500;
      box-shadow: 0 10px 25px rgba(0, 0, 0, 0.35);
      border: 1px solid ${isSuccess ? 'rgba(74, 222, 128, 0.4)' : 'rgba(248, 113, 113, 0.4)'};
      display: flex;
      align-items: center;
      gap: 10px;
      opacity: 0;
      transform: translateY(20px);
      transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
      pointer-events: auto;
      max-width: 380px;
    `;

    toast.innerHTML = `
      <span style="font-size: 18px;">${isSuccess ? '✅' : '⚠️'}</span>
      <div style="line-height: 1.4;">${message}</div>
    `;

    toastContainer.appendChild(toast);

    requestAnimationFrame(() => {
      toast.style.opacity = '1';
      toast.style.transform = 'translateY(0)';
    });

    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateY(10px)';
      setTimeout(() => toast.remove(), 300);
    }, 4500);
  }

  // Bind forms when DOM is ready
  function initForms() {
    // 1. Contact Forms
    const contactForms = document.querySelectorAll('form#wf-form-Number-Form, form.contant-form');
    contactForms.forEach((form) => {
      // Prevent duplicate binding
      if (form.dataset.apiBound) return;
      form.dataset.apiBound = 'true';

      const parentBlock = form.closest('.form-block') || form.parentElement;
      const successDiv = parentBlock ? parentBlock.querySelector('.w-form-done') : null;
      const failDiv = parentBlock ? parentBlock.querySelector('.w-form-fail') : null;
      const submitBtn = form.querySelector('input[type="submit"], button[type="submit"]');

      form.addEventListener('submit', async function (e) {
        e.preventDefault();
        e.stopPropagation();

        const nameInput = form.querySelector('input[name="Name"], #Name');
        const emailInput = form.querySelector('input[name="Email"], #Email');
        const fieldSelect = form.querySelector('select[name="field"], select[name="Field"], #field');
        const messageInput = form.querySelector('textarea[name="Textarea"], #Textarea');
        const radioInput = form.querySelector('input[type="radio"], input[type="checkbox"]');

        const name = nameInput ? nameInput.value.trim() : '';
        const email = emailInput ? emailInput.value.trim() : '';
        const field = fieldSelect && fieldSelect.value ? fieldSelect.options[fieldSelect.selectedIndex].text : 'General Citizen Inquiry';
        const message = messageInput ? messageInput.value.trim() : '';
        const agreedTerms = radioInput ? radioInput.checked : true;

        if (!name || !email || !message) {
          showToast('Please fill in your name, email, and message.', 'error');
          return;
        }

        const originalBtnText = submitBtn ? (submitBtn.value || submitBtn.textContent) : 'Send Message';
        if (submitBtn) {
          submitBtn.disabled = true;
          if (submitBtn.tagName === 'INPUT') submitBtn.value = 'Submitting...';
          else submitBtn.textContent = 'Submitting...';
        }

        try {
          const response = await fetch(`${API_BASE}/contact`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              name,
              email,
              field,
              message,
              agreedTerms,
            }),
          });

          const result = await response.json();

          if (response.ok && result.success) {
            form.reset();
            form.style.display = 'none';
            if (successDiv) successDiv.style.display = 'block';
            if (failDiv) failDiv.style.display = 'none';
            showToast('Message submitted successfully! Thank you for reaching out.', 'success');
          } else {
            throw new Error(result.message || 'Failed to submit inquiry.');
          }
        } catch (err) {
          console.error('Contact submission error:', err);
          if (failDiv) failDiv.style.display = 'block';
          showToast(err.message || 'Server connection failed. Please ensure the backend is running.', 'error');
        } finally {
          if (submitBtn) {
            submitBtn.disabled = false;
            if (submitBtn.tagName === 'INPUT') submitBtn.value = originalBtnText;
            else submitBtn.textContent = originalBtnText;
          }
        }
      });
    });

    // 2. Newsletter Subscription Forms
    const newsletterForms = document.querySelectorAll('form#email-form-2, form.newslatter-from');
    newsletterForms.forEach((form) => {
      if (form.dataset.apiBound) return;
      form.dataset.apiBound = 'true';

      const emailInput = form.querySelector('input[type="email"], #email');
      const submitBtn = form.querySelector('input[type="submit"], button[type="submit"]');

      form.addEventListener('submit', async function (e) {
        e.preventDefault();
        e.stopPropagation();

        const email = emailInput ? emailInput.value.trim() : '';
        if (!email) {
          showToast('Please enter a valid email address.', 'error');
          return;
        }

        if (submitBtn) submitBtn.disabled = true;

        try {
          const response = await fetch(`${API_BASE}/newsletter`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ email }),
          });

          const result = await response.json();

          if (response.ok && result.success) {
            form.reset();
            showToast('Subscribed! You will receive citizen updates.', 'success');
          } else {
            throw new Error(result.message || 'Subscription failed.');
          }
        } catch (err) {
          console.error('Newsletter subscription error:', err);
          showToast(err.message || 'Could not connect to subscription service.', 'error');
        } finally {
          if (submitBtn) submitBtn.disabled = false;
        }
      });
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initForms);
  } else {
    initForms();
  }
})();

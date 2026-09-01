document.addEventListener('DOMContentLoaded', () => {
  const widget = document.getElementById('chatbot-widget');
  const chatWindow = document.getElementById('chatbot-window');
  const toggle = document.getElementById('chatbot-toggle');
  const closeBtn = document.getElementById('chatbot-close');
  const messages = document.getElementById('chatbot-messages');
  const form = document.getElementById('chatbot-form');
  const input = document.getElementById('chatbot-input');
  const sendBtn = document.getElementById('chatbot-send');
  const unreadBadge = document.getElementById('chatbot-unread-badge');

  if (!widget || !chatWindow || !toggle || !messages || !form || !input || !sendBtn) {
    return;
  }

  let unreadCount = 0;

  const updateUnreadBadge = () => {
    const hasUnread = unreadCount > 0 && !widget.classList.contains('open');
    toggle.classList.toggle('has-unread', hasUnread);

    if (!unreadBadge) return;

    if (hasUnread) {
      unreadBadge.textContent = unreadCount > 9 ? '9+' : String(unreadCount);
      unreadBadge.removeAttribute('hidden');
    } else {
      unreadBadge.textContent = '';
      unreadBadge.setAttribute('hidden', 'hidden');
    }
  };

  const scrollToLatestMessage = () => {
    const target = messages.scrollHeight;
    if (target <= messages.clientHeight) return;

    messages.scrollTo({
      top: target,
      behavior: 'smooth'
    });

    requestAnimationFrame(() => {
      messages.scrollTop = target;
    });
  };

  const botReply = (message, delayMs = 0) => {
    const text = String(message || '').trim();
    if (!text) return;

    const revealReply = () => {
      const typing = document.getElementById('chatbot-typing');
      if (typing) typing.remove();

      const bubble = document.createElement('div');
      bubble.className = 'chatbot-message bot';
      bubble.textContent = text;
      messages.appendChild(bubble);

      if (!widget.classList.contains('open')) {
        unreadCount += 1;
        updateUnreadBadge();
      }

      scrollToLatestMessage();
    };

    if (delayMs > 0) {
      setTimeout(revealReply, delayMs);
      return;
    }

    revealReply();
  };

  const addUserMessage = (message) => {
    const bubble = document.createElement('div');
    bubble.className = 'chatbot-message user';
    bubble.textContent = message;
    messages.appendChild(bubble);
    scrollToLatestMessage();
  };

  const showTypingIndicator = () => {
    const existing = document.getElementById('chatbot-typing');
    if (existing) return;

    const typing = document.createElement('div');
    typing.id = 'chatbot-typing';
    typing.className = 'chatbot-typing';
    typing.setAttribute('aria-label', 'Bot is typing');
    typing.innerHTML = '<span></span><span></span><span></span>';
    messages.appendChild(typing);
    scrollToLatestMessage();
  };

  const openChat = () => {
    widget.classList.add('open');
    toggle.setAttribute('aria-expanded', 'true');
    unreadCount = 0;
    updateUnreadBadge();
    setTimeout(() => input.focus(), 150);
  };

  const closeChat = () => {
    widget.classList.remove('open');
    toggle.setAttribute('aria-expanded', 'false');
  };

  toggle.addEventListener('click', () => {
    if (widget.classList.contains('open')) {
      closeChat();
    } else {
      openChat();
    }
  });

  if (closeBtn) {
    closeBtn.addEventListener('click', closeChat);
  }

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    const message = input.value.trim();
    if (!message) return;

    addUserMessage(message);
    input.value = '';
    sendBtn.disabled = true;
    sendBtn.textContent = '...';
    showTypingIndicator();

    try {
      const response = await fetch('/api/v1/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message })
      });

      const data = await response.json();
      const reply = data && (data.response || data.message || 'I’m here to help with grievance guidance.');
      botReply(reply, 650);
    } catch (error) {
      botReply('Hello! Good to see you here 😊 I’m here to help you find the right government authority for any civic issue you’re facing — whether it’s roads, utilities, payments, or something else. What’s going on?', 650);
    } finally {
      sendBtn.disabled = false;
      sendBtn.textContent = 'Send';
      scrollToLatestMessage();
    }
  });

  const welcome = document.createElement('div');
  welcome.className = 'chatbot-message bot';
  welcome.textContent = 'Hello! Good to see you here 😊 I’m here to help you find the right government authority for any civic issue you’re facing — whether it’s roads, utilities, payments, or something else. What’s going on?';
  messages.appendChild(welcome);
  scrollToLatestMessage();
  updateUnreadBadge();
});

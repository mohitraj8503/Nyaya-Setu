/* Shared header/footer markup injected into every page for consistency.
 * Public UI carries NO internship/team/mentor wording (per final directive);
 * contributor credits live in README.md only. UI labels load from the
 * centralized i18n dictionary (data/i18n/en.json) with safe fallbacks. */
(function () {
  const FALLBACK = {
    nav: { home: "Home", find: "Find Help", track: "Track", resources: "Resources", about: "About", contact: "Contact", cta: "Start here" },
    tagline: "Made for citizens, with clarity."
  };

  function header(t) {
    return `
  <div class="disclaimer" role="note">NyayaSetu is an <b>independent citizen-guidance platform</b> — not a Government of India website, service or official representative. Always verify details on the linked official portal before acting.</div>
  <header class="site-header">
    <div class="container nav">
      <a class="brand" href="index.html"><span class="leaf" aria-hidden="true">⚖️</span> NyayaSetu</a>
      <button class="menu-btn" aria-label="Toggle menu" aria-expanded="false" aria-controls="nav-links">☰</button>
      <nav class="nav-links" id="nav-links" aria-label="Primary">
        <a href="index.html">${t.nav.home}</a>
        <a href="problems.html">${t.nav.find}</a>
        <a href="tracker.html">${t.nav.track}</a>
        <a href="resources.html">${t.nav.resources}</a>
        <a href="about.html">${t.nav.about}</a>
        <a href="contact.html">${t.nav.contact}</a>
        <a href="problems.html" class="btn btn-primary btn-sm nav-cta magnetic">${t.nav.cta}</a>
      </nav>
    </div>
  </header>`;
  }

  function footer(t) {
    return `
  <footer class="site-footer">
    <div class="container">
      <div class="foot-grid">
        <div>
          <h4>⚖️ NyayaSetu</h4>
          <p style="font-size:.9rem;max-width:34rem">India's Citizen Action Guide. Describe a problem, answer a few questions, and get the right authority, the documents to prepare, a ready draft and the official portal — clearly.</p>
          <p class="foot-disc">NyayaSetu is an independent citizen-guidance platform. It is not a Government of India website, service or official representative. Government portals linked here are external destinations owned by their respective authorities. Always verify information on the official portal before acting. NyayaSetu does not provide legal advice and does not guarantee any outcome.</p>
        </div>
        <div>
          <h4>Product</h4>
          <ul>
            <li><a href="problems.html">Find help</a></li>
            <li><a href="tracker.html">Track a case</a></li>
            <li><a href="resources.html">Official resources</a></li>
            <li><a href="about.html">About</a></li>
          </ul>
        </div>
        <div>
          <h4>Support</h4>
          <ul>
            <li><a href="contact.html">Contact / help</a></li>
            <li><a href="resources.html#emergency">Emergency numbers</a></li>
            <li><a href="about.html#privacy">Privacy</a></li>
          </ul>
        </div>
      </div>
      <div class="foot-bottom">
        <span>© <span data-year>2026</span> NyayaSetu — India's Citizen Action Guide</span>
        <span>${t.tagline}</span>
      </div>
    </div>
  </footer>`;
  }

  function mount(t) {
    const h = document.getElementById("site-header");
    const f = document.getElementById("site-footer");
    if (h) h.innerHTML = header(t);
    if (f) f.innerHTML = footer(t);
    const page = location.pathname.split("/").pop() || "index.html";
    document.querySelectorAll(".nav-links a").forEach((a) => {
      if (a.getAttribute("href") === page) a.style.color = "var(--green-900)";
    });
  }

  // Centralized copy: try the i18n dictionary first, fall back gracefully.
  function boot() {
    fetch("data/i18n/en.json")
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((d) => mount(Object.assign({}, FALLBACK, d)))
      .catch(() => mount(FALLBACK));
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();
})();

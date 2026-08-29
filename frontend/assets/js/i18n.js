(() => {
  const STORAGE_KEY = "nyayasetu-language";
  const state = { lang: localStorage.getItem(STORAGE_KEY) || "en", catalogs: {}, originals: new WeakMap() };
  const script = document.currentScript;
  const dataBase = new URL("../../data/i18n/", script.src);

  async function loadCatalog(lang) {
    if (state.catalogs[lang]) return state.catalogs[lang];
    const response = await fetch(new URL(`${lang}.json`, dataBase));
    if (!response.ok) throw new Error(`Unable to load ${lang} translations`);
    state.catalogs[lang] = await response.json();
    return state.catalogs[lang];
  }

  function preserveWhitespace(original, translated) {
    const lead = original.match(/^\s*/)?.[0] || "";
    const tail = original.match(/\s*$/)?.[0] || "";
    return `${lead}${translated}${tail}`;
  }

  async function applyLanguage(lang) {
    const [en, target] = await Promise.all([loadCatalog("en"), loadCatalog(lang)]);
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    const nodes = [];
    while (walker.nextNode()) nodes.push(walker.currentNode);

    nodes.forEach(node => {
      const original = state.originals.has(node) ? state.originals.get(node) : node.nodeValue;
      if (!state.originals.has(node)) state.originals.set(node, original);
      const key = original.trim();
      if (!key || !Object.prototype.hasOwnProperty.call(en, key)) return;
      const translated = lang === "en" ? en[key] : (target[key] || key);
      node.nodeValue = preserveWhitespace(original, translated);
    });

    document.documentElement.lang = lang === "hi" ? "hi" : "en";
    document.documentElement.setAttribute("data-language", lang);
    localStorage.setItem(STORAGE_KEY, lang);
    document.querySelectorAll("[data-language-toggle]").forEach(button => {
      button.textContent = lang === "en" ? "हिन्दी" : "English";
      button.setAttribute("aria-label", lang === "en" ? "Switch language to Hindi" : "Switch language to English");
    });
  }

  function addToggle() {
    if (document.querySelector("[data-language-toggle]")) return;
    const button = document.createElement("button");
    button.type = "button";
    button.setAttribute("data-language-toggle", "");
    button.className = "nyayasetu-language-toggle";
    button.addEventListener("click", () => applyLanguage(state.lang === "en" ? "hi" : "en").then(() => {
      state.lang = localStorage.getItem(STORAGE_KEY) || "en";
    }).catch(console.error));
    const host = document.querySelector(".nav-button-block") || document.querySelector(".navbar-block") || document.body;
    host.appendChild(button);
  }

  function addStyles() {
    const style = document.createElement("style");
    style.textContent = `.nyayasetu-language-toggle{margin-left:10px;padding:9px 13px;border:1px solid currentColor;border-radius:999px;background:transparent;color:inherit;font:inherit;cursor:pointer;white-space:nowrap}.nyayasetu-language-toggle:hover{opacity:.8}@media(max-width:767px){.nyayasetu-language-toggle{margin-left:6px;padding:7px 10px;font-size:12px}}`;
    document.head.appendChild(style);
  }

  document.addEventListener("DOMContentLoaded", () => {
    addStyles();
    addToggle();
    applyLanguage(state.lang).then(() => { state.lang = localStorage.getItem(STORAGE_KEY) || "en"; }).catch(console.error);
  });
})();

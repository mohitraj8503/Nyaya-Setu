/* NyayaSetu 3D rotating carousel (CSS-3D, dependency-free).
 * Keyboard (←/→), prev/next buttons, drag & touch swipe, auto-rotate,
 * cursor-responsive tilt, reduced-motion & small-screen → flat grid. */
(function () {
  "use strict";
  document.querySelectorAll("[data-carousel3d]").forEach(function (root) {
    const ring = root.querySelector(".c3d-ring");
    const items = Array.from(ring.children);
    const n = items.length;
    if (!n) return;
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const small = window.matchMedia("(max-width: 720px)").matches;

    if (reduceMotion || small) { root.classList.add("flat"); return; }

    const angle = 360 / n;
    const radius = Math.max(260, (items[0].offsetWidth || 220) / (2 * Math.tan(Math.PI / n)) + 30);
    items.forEach((el, i) => {
      el.style.transform = "rotateY(" + i * angle + "deg) translateZ(" + radius + "px)";
    });

    let rot = 0, auto = null, dragging = false, startX = 0, startRot = 0;
    function apply() { ring.style.transform = "translateZ(-" + radius + "px) rotateY(" + rot + "deg)"; }
    function go(dir) { rot -= dir * angle; apply(); restart(); }
    function restart() { clearInterval(auto); auto = setInterval(() => go(1), 4200); }
    apply(); restart();

    root.addEventListener("mouseenter", () => clearInterval(auto));
    root.addEventListener("mouseleave", restart);

    const prev = root.querySelector("[data-c3d-prev]");
    const next = root.querySelector("[data-c3d-next]");
    if (prev) prev.addEventListener("click", () => go(-1));
    if (next) next.addEventListener("click", () => go(1));

    root.tabIndex = 0;
    root.setAttribute("role", "region");
    root.setAttribute("aria-label", "Category carousel — use arrow keys");
    root.addEventListener("keydown", (e) => {
      if (e.key === "ArrowRight") { e.preventDefault(); go(1); }
      if (e.key === "ArrowLeft") { e.preventDefault(); go(-1); }
    });

    function onDown(x) { dragging = true; startX = x; startRot = rot; clearInterval(auto); }
    function onMove(x) { if (!dragging) return; rot = startRot + (x - startX) * 0.25; apply(); }
    function onUp() { if (!dragging) return; dragging = false; rot = Math.round(rot / angle) * angle; apply(); restart(); }
    root.addEventListener("pointerdown", (e) => onDown(e.clientX));
    window.addEventListener("pointermove", (e) => onMove(e.clientX), { passive: true });
    window.addEventListener("pointerup", onUp);

    // subtle cursor-responsive tilt
    root.addEventListener("pointermove", (e) => {
      const r = root.getBoundingClientRect();
      const rx = ((e.clientY - r.top) / r.height - 0.5) * -4;
      ring.style.setProperty("--rx", rx + "deg");
    });
  });
})();

/* NyayaSetu civic-network WebGL visual (Three.js) — home hero only.
 * A citizen node connects through guidance nodes to authority nodes.
 * Fallbacks: no-WebGL / CDN failure / touch / reduced-motion → static SVG.
 * Performance: DPR capped, paused off-screen, small geometry, rAF cleanup. */
(function () {
  "use strict";
  const host = document.getElementById("civic-canvas");
  if (!host) return;
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const isTouch = window.matchMedia("(hover: none), (pointer: coarse)").matches;

  function staticFallback() {
    host.innerHTML =
      '<svg viewBox="0 0 400 300" width="100%" height="100%" role="img" aria-label="Citizen connected to official authorities">' +
      '<g stroke="#8BC34A" stroke-width="2" opacity=".7">' +
      '<line x1="200" y1="150" x2="70" y2="70"/><line x1="200" y1="150" x2="330" y2="70"/>' +
      '<line x1="200" y1="150" x2="70" y2="230"/><line x1="200" y1="150" x2="330" y2="230"/></g>' +
      '<circle cx="200" cy="150" r="26" fill="#176C39"/>' +
      '<circle cx="70" cy="70" r="14" fill="#2E8B57"/><circle cx="330" cy="70" r="14" fill="#2E8B57"/>' +
      '<circle cx="70" cy="230" r="14" fill="#8BC34A"/><circle cx="330" cy="230" r="14" fill="#8BC34A"/></svg>';
  }

  if (reduceMotion || !window.THREE) { staticFallback(); return; }
  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  } catch (e) { staticFallback(); return; }

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(50, 1, 0.1, 100);
  camera.position.z = 8;
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.75));
  host.appendChild(renderer.domElement);
  renderer.domElement.setAttribute("aria-hidden", "true");

  const COLORS = [0x176c39, 0x2e8b57, 0x8bc34a, 0x5e6b64];
  const nodes = [];
  const group = new THREE.Group();
  scene.add(group);

  // central citizen node
  const center = new THREE.Mesh(
    new THREE.SphereGeometry(0.55, 24, 24),
    new THREE.MeshBasicMaterial({ color: COLORS[0] })
  );
  group.add(center);

  // orbiting authority/document nodes + connecting lines
  const N = 14;
  const lineMat = new THREE.LineBasicMaterial({ color: 0x8bc34a, transparent: true, opacity: 0.45 });
  for (let i = 0; i < N; i++) {
    const a = (i / N) * Math.PI * 2;
    const r = 2.2 + (i % 3) * 0.9;
    const y = Math.sin(i * 1.7) * 1.4;
    const m = new THREE.Mesh(
      new THREE.SphereGeometry(0.14 + (i % 3) * 0.05, 12, 12),
      new THREE.MeshBasicMaterial({ color: COLORS[i % COLORS.length] })
    );
    m.position.set(Math.cos(a) * r, y, Math.sin(a) * r);
    m.userData = { a, r, y, speed: 0.15 + (i % 4) * 0.05 };
    nodes.push(m); group.add(m);
    const g = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0, 0, 0), m.position]);
    group.add(new THREE.Line(g, lineMat));
  }

  let mx = 0, my = 0, raf = null, visible = true;
  if (!isTouch) {
    window.addEventListener("pointermove", (e) => {
      mx = (e.clientX / window.innerWidth - 0.5) * 2;
      my = (e.clientY / window.innerHeight - 0.5) * 2;
    }, { passive: true });
  }

  function resize() {
    const w = host.clientWidth, h = host.clientHeight;
    if (!w || !h) return;
    renderer.setSize(w, h, false);
    camera.aspect = w / h; camera.updateProjectionMatrix();
  }
  resize();
  window.addEventListener("resize", resize, { passive: true });

  const clock = new THREE.Clock();
  function tick() {
    raf = null;
    if (!visible) return;
    const t = clock.getElapsedTime();
    group.rotation.y += ((mx * 0.35 + t * 0.05) - group.rotation.y) * 0.04;
    group.rotation.x += ((my * 0.2) - group.rotation.x) * 0.04;
    nodes.forEach((m) => {
      const u = m.userData;
      m.position.y = u.y + Math.sin(t * u.speed * 2 + u.a * 3) * 0.18;
    });
    renderer.render(scene, camera);
    raf = requestAnimationFrame(tick);
  }
  function start() { if (!raf && visible) raf = requestAnimationFrame(tick); }

  if ("IntersectionObserver" in window) {
    new IntersectionObserver((en) => {
      visible = en[0].isIntersecting;
      if (visible) start();
    }, { threshold: 0.05 }).observe(host);
  }
  document.addEventListener("visibilitychange", () => {
    visible = !document.hidden; if (visible) start();
  });
  start();
})();

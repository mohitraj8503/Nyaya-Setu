/* NyayaSetu core JS — shared chrome, motion, magnetic cursor, marquee, a11y helpers.
 * Loads GSAP/ScrollTrigger via CDN; every feature degrades gracefully if absent. */
(function () {
  "use strict";
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const isTouch = window.matchMedia("(hover: none), (pointer: coarse)").matches;

  /* ---------- Mobile nav ---------- */
  const menuBtn = document.querySelector(".menu-btn");
  const navLinks = document.querySelector(".nav-links");
  if (menuBtn && navLinks) {
    menuBtn.addEventListener("click", () => {
      const open = navLinks.classList.toggle("open");
      menuBtn.setAttribute("aria-expanded", open ? "true" : "false");
    });
    navLinks.addEventListener("click", (e) => {
      if (e.target.tagName === "A") navLinks.classList.remove("open");
    });
  }

  /* ---------- Reveal on scroll (GSAP if present, IO fallback) ---------- */
  const reveals = document.querySelectorAll(".reveal");
  if (reduceMotion) {
    reveals.forEach((el) => { el.style.opacity = 1; el.style.transform = "none"; });
  } else if (window.gsap && window.ScrollTrigger) {
    gsap.registerPlugin(ScrollTrigger);
    reveals.forEach((el, i) => {
      gsap.to(el, {
        opacity: 1, y: 0, duration: 0.9, ease: "power3.out",
        delay: (i % 3) * 0.08,
        scrollTrigger: { trigger: el, start: "top 88%" },
      });
    });
    // hero timeline
    const heroBits = document.querySelectorAll(".hero [data-h]");
    if (heroBits.length) {
      gsap.from(heroBits, { opacity: 0, y: 30, stagger: 0.12, duration: 1, ease: "power3.out" });
    }
    // journey node stagger
    const jnodes = document.querySelectorAll(".journey .jnode");
    if (jnodes.length) {
      gsap.from(jnodes, {
        opacity: 0, x: -18, stagger: 0.15, duration: 0.7, ease: "power2.out",
        scrollTrigger: { trigger: ".journey", start: "top 85%" },
      });
    }
  } else if ("IntersectionObserver" in window) {
    const io = new IntersectionObserver((entries) => {
      entries.forEach((en) => {
        if (en.isIntersecting) {
          en.target.style.transition = "opacity .7s ease, transform .7s cubic-bezier(.22,1,.36,1)";
          en.target.style.opacity = 1; en.target.style.transform = "none";
          io.unobserve(en.target);
        }
      });
    }, { threshold: 0.12 });
    reveals.forEach((el) => io.observe(el));
  } else {
    reveals.forEach((el) => { el.style.opacity = 1; el.style.transform = "none"; });
  }

  /* ---------- Magnetic buttons (enhance, never replace cursor) ---------- */
  if (!reduceMotion && !isTouch) {
    document.querySelectorAll(".magnetic").forEach((el) => {
      const strength = 18;
      el.addEventListener("mousemove", (e) => {
        const r = el.getBoundingClientRect();
        const x = ((e.clientX - r.left) / r.width - 0.5) * strength;
        const y = ((e.clientY - r.top) / r.height - 0.5) * strength;
        el.style.transform = `translate(${x}px, ${y}px)`;
      });
      el.addEventListener("mouseleave", () => { el.style.transform = ""; });
    });
    // subtle card tilt
    document.querySelectorAll("[data-tilt]").forEach((el) => {
      el.addEventListener("mousemove", (e) => {
        const r = el.getBoundingClientRect();
        const rx = ((e.clientY - r.top) / r.height - 0.5) * -6;
        const ry = ((e.clientX - r.left) / r.width - 0.5) * 6;
        el.style.transform = `perspective(800px) rotateX(${rx}deg) rotateY(${ry}deg) translateY(-6px)`;
      });
      el.addEventListener("mouseleave", () => { el.style.transform = ""; });
    });
  }

  /* ---------- Toast helper ---------- */
  window.nyToast = function (msg, type) {
    let t = document.querySelector(".toast");
    if (!t) { t = document.createElement("div"); t.className = "toast"; document.body.appendChild(t); }
    t.textContent = msg;
    t.className = "toast show" + (type ? " " + type : "");
    clearTimeout(t._h);
    t._h = setTimeout(() => t.classList.remove("show"), 3200);
  };

  /* ---------- Footer year ---------- */
  const yr = document.querySelector("[data-year]");
  if (yr) yr.textContent = new Date().getFullYear();
})();

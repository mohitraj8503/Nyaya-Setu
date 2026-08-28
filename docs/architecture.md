# NyayaSetu — Architecture (v2, final)

## 1. Citizen guidance flow (static-first core — no backend required)

```
Citizen
   ↓
NyayaSetu UI (static HTML/CSS/JS)
   ↓
Problem Discovery  — findProblems(query, cat)            [assets/js/engine.js]
   ↓
Guided Wizard      — multi-step, validated, state kept   [wizard.html]
   ↓
Deterministic Rules— resolveRouteId(problem, answers)    [engine.js]
                     problem.routes.default / byAnswer   [data/data.js]
   ↓
Curated Route      — routeId → authority, purpose,       [data/data.js :: routes]
                     scope, exclusions, steps
   ↓
Verified Official Portal — source metadata + verifiedOn  [data/data.js :: sources]
   ↓
Action Plan / editable Draft / Checklist                 [recommendation.html]
   ↓
LocalStorage Tracker (local only)                        [engine.js :: tracker]
```

All routing is curated data + deterministic rules. No AI/LLM invents a government destination. Official URLs live only in `data/data.js`.

## 2. Context-dependent routing (examples)

- Roads → wizard asks road type → `roads-national` (NHAI) / `roads-state` (state PWD) / `roads-local` (municipal).
- Consumer → wizard asks stage → `consumer-nch` (National Consumer Helpline) or `consumer-ejagriti` (file case on e-Jagriti, the official e-Daakhil successor).
- Banking/UPI → fraud → `cyber-fraud` (cybercrime.gov.in + 1930); service issue → `bank-rbi` (bank first, then RBI Ombudsman).
- Aadhaar / PAN / Passport → independent routes to UIDAI / Income Tax / Passport Seva (never collapsed).
- Labour → `labour-commissioner`; e-Shram is referenced only as worker registration, not a grievance channel.
- Police → `police-local`; explicit emergency branch directs to 112.

## 3. Optional backend enhancement

```
Contact Form (contact.html)
   ↓ client validation
POST /api/contact → Express (backend/server.js)
   ↓ server validation + sanitization
   ↓ context-aware sensitive-data screen (blocks Aadhaar/PAN/OTP/password/card/CVV;
     allows labelled order/UTR/ref/application IDs)
   ↓ rate limit (10/10min/IP) + honeypot + duplicate guard
PostgreSQL (Supabase/Neon free tier) — contact_messages only
   ↓
201 success / 400 validation / 422 sensitive / 409 duplicate / 503 degraded
```

- `GET /api/health` — service + DB status.
- **CORS:** development allows localhost; `NODE_ENV=production` fails closed unless `ALLOWED_ORIGINS` is set.
- **Degraded mode:** no `DATABASE_URL` → health OK, contact returns 503; frontend preserves the message.

## 4. Enhancement layers & fallbacks

| Layer | File | Fallback |
|---|---|---|
| Three.js civic network | `assets/js/webgl.js` (home hero only) | inline SVG; disabled on reduced-motion / no-WebGL / CDN failure; DPR-capped, paused off-screen |
| 3D category carousel | `assets/js/carousel3d.js` (home) | flat grid on touch / small screens / reduced-motion; keyboard + buttons + drag |
| GSAP/ScrollTrigger | `assets/js/core.js` | IntersectionObserver fallback; instant show on reduced-motion |
| Magnetic cursor / tilt | `core.js` | system cursor always kept; disabled on touch/reduced-motion |
| Animated background | CSS `body::before/::after` | static under reduced-motion |
| Review marquee | CSS animation | pauses on hover; static under reduced-motion |
| i18n | `data/i18n/en.json` + `hi.json` | built-in English fallback strings |

Scroll-frame video: not implemented in this release — see `docs/media-sources.md` (no license-safe civic video available; not forced per "no placeholder" rule). Hook point: add a `data-scroll-video` section on home and drive `video.currentTime = scrollProgress × duration` inside an IntersectionObserver in `core.js`.

## 5. Separation of concerns

Content → `data/data.js` + `data/i18n/*` · Logic → `assets/js/engine.js` · Presentation → `assets/css/design.css` · Local persistence → LocalStorage · Optional non-sensitive persistence → PostgreSQL.

## 6. Deployment

- Frontend: static hosting (GitHub Pages/Netlify/Vercel); `.nojekyll`, `robots.txt`, `sitemap.xml`; relative paths; no API key needed.
- Backend: Node free-tier host; set `DATABASE_URL`, `ALLOWED_ORIGINS`, `NODE_ENV=production`, `PORT`.

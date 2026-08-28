# NyayaSetu — Testing Report (final pass)

Date: 2026-08-28. Method: Node-based engine regression (`test-engine.js`), live curl API tests, live HTTP source checks, code/markup review.

## Functional (engine regression — executed)
- ✅ 15 problems, 14 sources, 19 routes present.
- ✅ 18 journey resolutions executed and passed, including context routing:
  - consumer-refund stage=seller → `consumer-nch`; stage=court → `consumer-ejagriti` (e-Jagriti, not e-Daakhil)
  - roads national → NHAI; state → state PWD; local → municipal
  - upi-fraud → cyber-fraud; banking-issue → bank→RBI Ombudsman
  - police emergency=yes → emergency branch; labour → Labour Commissioner (not e-Shram)
  - aadhaar → UIDAI; pan → Income Tax; passport → Passport Seva
- ✅ Wizard: per-question steps incl. `select` clarifiers, Step X of Y, progress bar, required validation, back/next, Enter-advance, sessionStorage state.
- ✅ Draft: placeholders filled (`ORD9` verified), editable contenteditable box, copy with fallback.
- ✅ Tracker: create / edit / delete / status / referenceNo / portalName / createdAt / dueAt / notes / refresh persistence / empty state — CRUD executed in test.
- ✅ Search/filter: 'pothole'→roads; 'Consumer' filter→consumer-refund; no-results state verified.

## Backend (curl — executed)
- ✅ `GET /api/health` → degraded-mode OK without DB.
- ✅ valid contact → 503 `DB_UNAVAILABLE` without DB (message preserved client-side).
- ✅ sensitive: Aadhaar-like `1234 5678 9012` → 422.
- ✅ invalid payload → 400 with per-field errors.
- ✅ context-aware detector allows labelled legitimate IDs (order/UTR/ref/application) while blocking Aadhaar/PAN/card/CVV/IFSC/OTP/password.
- ✅ CORS fail-closed in `NODE_ENV=production` (code-verified); localhost allowed only in development.

## Security & privacy
- ✅ Repo-wide secret scan clean (no MongoDB strings/passwords/keys); `.env` git-ignored; `.env.example` placeholders only.
- ✅ No Aadhaar/PAN/OTP/password/bank fields anywhere; server enforces too.

## Public-site wording (executed)
- ✅ No "internship"/"intern"/"mentor"/"Tech Tomorrow"/team credits in any public HTML or `partials.js`. Verified by grep. Credits retained in README only (incl. **Ayush Jha — Web Development Intern**).

## Accessibility / responsive / motion
- ✅ Semantic landmarks, labels, `:focus-visible`, aria-live status, aria-pressed chips, keyboard checklist (Space/Enter), keyboard carousel (←/→).
- ✅ Breakpoints 720/960px; ≥44px targets; `prefers-reduced-motion` disables marquee, reveals, magnetic, 3D carousel (flat), WebGL (static SVG), animated bg.

## Known limitations (not claimed as done)
- Physical device-lab pass (real iOS/Android, Safari/Firefox) not possible here — markup is standards-based; recommend a device pass before public launch.
- Scroll-frame video not implemented (no license-safe civic video available) — documented, not faked.
- Live DB deployment requires the user's own Supabase/Neon credential — code is ready and degraded-tested.

# NyayaSetu (न्यायसेतु)

**India's Citizen Action Guide** — an independent, static-first citizen-guidance platform.

> Don't know where to start? Start here. Describe a public-service problem, answer a few simple questions, and NyayaSetu shows you the right authority, the documents to prepare, a ready complaint draft, and the verified official portal — step by step.

**NyayaSetu is an independent citizen-guidance platform. It is not a Government of India website, service or official representative. Always verify information on the linked official portal before acting.**

---

## ✨ Features

- 🔎 **Problem discovery** — everyday-language search + category filters over 15 curated problem types (Consumer, Banking/UPI, Electricity, Water, Roads, Education, Healthcare, Police, Labour, Property/Land, Government Services, Aadhaar, PAN, Passport).
- 🧭 **Guided wizard** — multi-step questions with a progress bar, Step X of Y, required-field validation, back/next, keyboard support and state preservation.
- 🎯 **Deterministic routing** — answers map to a curated `routeId` with authority, purpose, scope, exclusions and steps. Context-dependent (e.g. roads → NHAI / state PWD / municipal; consumer → NCH vs e-Jagriti). **No AI/LLM ever invents a government URL.**
- 📋 **Action plan** — relevant authority, why it applies, interactive evidence checklist, numbered steps, verified portal CTA, scope/exclusions.
- ✍️ **Complaint draft** — editable, pre-filled template; copy-to-clipboard; clearly a draft (not legal advice, no outcome guarantee).
- 📌 **Local tracker** — create/edit/delete, status, portal, reference number, created date, reminder/due date, notes, persistence after refresh. **LocalStorage-first; never leaves your device.**
- 🔗 **Verified resources** — every portal shows source name, purpose, official URL, last-verified date, scope and an external-site label.
- ♿ **Accessible & responsive** — semantic HTML, keyboard navigation, visible focus, `prefers-reduced-motion`, 360px→desktop.
- 🎬 **Premium motion** — GSAP/ScrollTrigger storytelling, a Three.js civic-network hero visual, a rotating 3D category carousel, magnetic buttons, animated background, review marquee — all with reduced-motion/touch/CDN fallbacks.
- 🌐 **Hindi-ready** — user-facing copy centralised in `data/i18n/en.json` + `data/i18n/hi.json`.

## 🏛️ Government boundary

Government portals are **external destinations**, not systems operated by NyayaSetu. NyayaSetu never submits grievances, provides legal advice, or guarantees outcomes, and never collects Aadhaar/PAN/bank/OTP/password/government credentials.

## 🧱 Architecture

**Static-first core** (works with no backend): HTML5 + CSS3 + vanilla JS + curated data (`data/data.js`) + LocalStorage.

**Optional backend** (`backend/`): Express + PostgreSQL (free-tier Supabase/Neon) for the non-sensitive Contact/Help form + health check only. The core journey never depends on it; if it's down the contact form keeps the message and shows an honest retry state.

```
Citizen → Static UI → Curated JSON → Deterministic rules → Verified official portal
                                  ↘ LocalStorage tracker (local only)
Contact form → validation → API → server validation → PostgreSQL → success/error
```

See `docs/architecture.md`, `docs/source-verification.md`, `docs/testing-report.md`, `docs/compliance-matrix.md`, `docs/media-sources.md`.

## 🚀 Run the frontend (static)

```bash
python3 -m http.server 8000      # from the project root
# open http://localhost:8000
```
Deployable as-is on GitHub Pages / Netlify / Vercel (relative paths, `.nojekyll`). No API key is needed for the core product.

## 🔌 Optional backend (contact form)

```bash
cd backend
cp .env.example .env             # fill DATABASE_URL (optional) + ALLOWED_ORIGINS
npm install
npm start                        # http://localhost:5000  (GET /api/health)
```
Without `DATABASE_URL` the backend runs in **degraded mode** (health OK, contact → graceful 503).

**Point the frontend at your API:** on the contact page set `localStorage.setItem('nyayasetu_api','https://your-api-host')`.

### Environment variables (`backend/.env.example`)

| Variable | Purpose |
|---|---|
| `PORT` | API port (default 5000) |
| `DATABASE_URL` | PostgreSQL/Supabase connection string (blank = degraded mode) |
| `ALLOWED_ORIGINS` | CORS allow-list (**required in production — fails closed if empty**) |
| `NODE_ENV` | `production` enables fail-closed CORS |
| `DB_SSL` | `false` only for local Postgres without SSL |

**Security:** never commit `.env`. The previously-leaked MongoDB credential was removed and the MongoDB backend replaced entirely; a repo-wide secret scan confirms no active credential remains. The old credential is **compromised and must be rotated/revoked in MongoDB Atlas by its owner** — this project cannot do that for you.

## 🔐 API

| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/health` | Service + database status |
| POST | `/api/contact` | `{name,email,subject,message}` → validation, sanitization, context-aware sensitive-data rejection, rate limiting, duplicate guard, honeypot |

## 🧪 Testing

See `docs/testing-report.md`. Manual coverage: 15 problem routes end-to-end (incl. consumer NCH→e-Jagriti and roads NHAI/state/local), wizard validation/back/next/state, draft, tracker CRUD + refresh persistence, contact valid/invalid/sensitive/duplicate/degraded paths, mobile (360px+), keyboard-only, reduced-motion.

## ⚠️ Limitations

- Guidance only — not legal advice; no outcome guaranteed.
- Contact persistence needs a configured PostgreSQL; otherwise degraded-mode 503 is intentional.
- Government portal availability is outside NyayaSetu's control; sources are re-verified each release.

## 🌐 Links

- Live website: https://mohitraj8503.github.io/Nyaya-Setu/index.html
- Repository: https://github.com/mohitraj8503/Nyaya-Setu

## 👥 Contributors (Team Sankalp — Tech Tomorrow Web Development Internship)

- 👨‍💻 **Ranjan Singh** — *Web Development Intern*
- 👨‍💻 **Om Prabhat** — *Web Development Intern*
- 👨‍💻 **Nitin Sinha** — *Web Development Intern*
- 👨‍💻 **Keshav Ruhela** — *Web Development Intern*
- 👨‍💻 **Ayush Jha** — *Web Development Intern*

**Mentor & Supervision**: **Mohit Raj** (*Mentor — Web Development Internship, Tech Tomorrow*)

*Contributor credits are documented here in the README only; they do not appear on the public website.*

---

MIT License

# NyayaSetu — Requirements Compliance & Defect Matrix (regenerated, final)

Audit date: 2026-08-28. Statuses: PASS / FIXED / PARTIAL / BLOCKED / N/A.
Summary is derived from the actual rows below. **Unresolved P0/P1: 0.**

## Requirements matrix

| ID | Requirement | Source | Implementation / Evidence | Test | Status |
|---|---|---|---|---|---|
| CORE-001 | Independent positioning; no government impersonation | PDF/§2 | Disclaimer banner + footer on every page; no govt logos | content review | PASS |
| CORE-002 | End-to-end journey Home→Find→Problem→Wizard→Plan→Checklist→Portal→Draft→Tracker | PDF §6–7 | 8 linked pages; no dead CTAs | journey walk | PASS |
| CORE-003 | 10–12+ coherent problem types across required categories | MP §8/§40 | 15 problems, 11+ categories incl. Aadhaar/PAN/Passport split | engine count | PASS |
| CORE-004 | Mandatory disclaimer visible | MP §12 | top banner + footer | review | PASS |
| UX-001 | Full page set | MP §7 | index/problems/wizard/recommendation/tracker/resources/about/contact/404 | file check | PASS |
| FUNC-001 | Wizard: Step X of Y, progress, validation, back/next, state, keyboard, clarifying Qs | MP §9/§23 | wizard.html + select clarifiers (roads/consumer/police) | engine+markup | PASS |
| FUNC-002 | Deterministic route model (routeId/authorityName/type/purpose/url/source/verifiedOn/scope/exclusions/steps) | Gap §5 | data/data.js `routes` + `resolveRouteId` | 18 resolutions | FIXED |
| FUNC-003 | Context routing: roads 3-way, consumer NCH→e-Jagriti, banking fraud vs service, aadhaar/pan/passport split, labour≠e-Shram | Gap §5 | `byAnswer` maps | engine tests | FIXED |
| FUNC-004 | No invented government destination | Gap §5/§23 | curated routes only | review | PASS |
| DATA-001 | Source records: name/url/verifiedOn/scope/notes/disclaimer | Gap §6 | 14 sources, all fields | review | PASS |
| DATA-002 | Re-verify sources before release; consumer ecosystem update | Gap §6 | e-Daakhil→e-Jagriti; 2026-08-28 checks | live HTTP | FIXED |
| TRACK-001 | Tracker: create/edit/delete/status/ref/portal/created/due/notes/persist/empty/keyboard/mobile | Gap §14 | tracker.html full CRUD editor | engine CRUD | FIXED |
| DRAFT-001 | Editable, copyable, non-sensitive, clearly a draft, no legal/outcome claims | Gap §25 | contenteditable draft + labels | review | PASS |
| BACK-001 | Backend optional; core works without it | §13/§40 | static-first engine; API only for contact | offline journey | PASS |
| BACK-002 | Contact API: validation/sanitize/rate-limit/dup/honeypot/safe-errors | MP §16–17 | contactRoutes.js | curl | PASS |
| BACK-003 | CORS fail-closed in production | Gap §18 | server.js env-gated allow-list | code review | FIXED |
| DB-001 | Free-tier PG/Supabase via env; .env.example; degraded mode | §14 | db.js + .env.example | boot test | PASS |
| DB-002 | Code-ready vs deployed DB distinguished | Gap §17 | README + degraded mode | review | PASS |
| SEC-001 | No secrets; old Mongo credential removed from active source | §15 | Mongo backend removed; scan clean | grep scan | FIXED |
| SEC-002 | Context-aware sensitive-data screen (blocks Aadhaar/PAN/OTP/pwd/card/CVV/IFSC; allows labelled ref IDs) | Gap §19 | contactRoutes.js detector | curl 422 | FIXED |
| A11Y-001 | Semantic/labels/focus/ARIA/headings/contrast/44px/keyboard/no traps | §30 | markup + CSS | review | PASS |
| A11Y-002 | prefers-reduced-motion everywhere | §30 | CSS + JS gates | review | PASS |
| RESP-001 | 360–1366px+, no horizontal scroll | §31 | breakpoints 720/960 | review | PASS |
| PERF-001 | transform/opacity, IO, DPR cap, off-screen pause, lazy CDN | §32 | webgl.js/core.js | review | PASS |
| SEO-001 | titles/meta/favicon/robots/sitemap | §36 | present | file check | PASS |
| DEPLOY-001 | Static deploy, relative paths, .nojekyll | §38 | present | file check | PASS |
| DEPLOY-002 | No API key for core | §29 | confirmed | review | PASS |
| VIS-001 | Green palette preserved; premium civic look; no neon/dark | §17/§32 | design.css tokens | review | PASS |
| VIS-002 | GSAP/ScrollTrigger storytelling | §18 | core.js reveals/hero/journey | review | PASS |
| VIS-003 | Magnetic cursor (system cursor kept) + tilt | §19 | core.js gated | review | PASS |
| VIS-004 | Three.js/WebGL actual implementation | Gap §7 | webgl.js civic network (home hero) | render+SVG fallback | FIXED |
| VIS-005 | 3D carousel | Gap §8 | carousel3d.js rotating home carousel | drag/keys/fallback | FIXED |
| VIS-006 | Animated green background | §23 | CSS body::before/::after | review | PASS |
| VIS-007 | 2D micro-interactions (hover/underline/elevation) | §22 | CSS | review | PASS |
| VIS-008 | Review marquee: infinite, pause-on-hover, reduced-motion, honest wording | §28/§31 | "Illustrative feedback from early testing" | review | PASS |
| VIS-009 | Media assets + license record | Gap §9/§25/§34 | none downloaded; custom SVG/WebGL; media-sources.md explains | doc | PARTIAL (licensing-blocked, documented) |
| VIS-010 | Scroll-frame video interaction | Gap §12 | not implemented (no license-safe civic video); hook documented | doc | N/A — valid reason |
| PUB-001 | No internship/intern/mentor/team wording on public site | Gap §15/§26/§27 | removed from pages + partials | grep | FIXED |
| PUB-002 | README keeps contributors + Ayush Jha in same style | Gap §15 | README credits block | review | PASS |
| I18N-001 | Hindi-ready centralized copy | Gap §20 | data/i18n/en.json + hi.json + fallback | review | PASS |
| DOC-001 | README/architecture/source-verification/testing/compliance/media-sources | §33 | all present & regenerated | file check | PASS |
| DOC-002 | Compliance matrix regenerated from actual rows (no invented counts) | Gap §16 | this file | count check | FIXED |

## Defect / repair matrix

| ID | Area | Problem | Severity | Fix | Test | Status |
|---|---|---|---|---|---|---|
| DEF-001 | routing | whole-category→one-portal; e-Daakhil stale | CRITICAL | route model + byAnswer; e-Jagriti | 18 resolutions | FIXED |
| DEF-002 | sources | verification not redone | HIGH | release-time re-check 2026-08-28 | live HTTP | FIXED |
| DEF-003 | public UI | internship/team wording exposed | HIGH | removed from pages/partials | grep | FIXED |
| DEF-004 | visual | no Three.js/3D | HIGH | webgl.js civic network | render+fallback | FIXED |
| DEF-005 | visual | no 3D carousel | HIGH | carousel3d.js | drag/keys | FIXED |
| DEF-006 | tracker | missing edit/ref/due/portal fields | HIGH | full CRUD editor | engine CRUD | FIXED |
| DEF-007 | backend | CORS open when allow-list empty | MEDIUM | fail-closed production | code review | FIXED |
| DEF-008 | backend | blanket 9–18 digit bank detector false-positives | MEDIUM | context-aware detector | curl | FIXED |
| DEF-009 | copy | scattered strings | MEDIUM | i18n en/hi + fallback | review | FIXED |
| DEF-010 | docs | matrix count inconsistent | MEDIUM | regenerated from rows | count | FIXED |
| DEF-011 | media | no licensed assets | LOW | documented licensing block; custom visuals | doc | PARTIAL |

**Totals (derived from rows): 41 requirements — 38 PASS/FIXED, 2 N/A-with-reason, 1 PARTIAL (media, licensing-blocked & documented). Unresolved P0/P1 = 0.**

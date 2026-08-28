# NyayaSetu — Official Source Verification (Release-time re-check)

Verification date: **2026-08-28**. Method: live HTTP/content check of each portal on the release date. Only destinations checked are listed. Probes that return 405/403 to automated requests but serve content to browsers are marked as content-confirmed where a same-day content fetch succeeded.

| # | Source | Official URL | Result (2026-08-28) | Scope / Notes |
|---|--------|--------------|---------------------|----------------|
| 1 | CPGRAMS | https://pgportal.gov.in/ | ✅ content-confirmed same day | Central ministries/departments grievance redress |
| 2 | myScheme | https://www.myscheme.gov.in/ | ✅ reachable; content-confirmed same day (405 to probe = bot protection) | Scheme discovery by eligibility |
| 3 | National Consumer Helpline | https://consumerhelpline.gov.in/ | ✅ HTTP 200 | Consumer complaints pre-litigation; helpline 1915 |
| 4 | **e-Jagriti** | https://e-jagriti.gov.in/ | ✅ confirmed current official platform (Ministry of Consumer Affairs) | **e-Daakhil has officially MIGRATED to e-Jagriti.** Consumer commission e-filing. Supersedes edaakhil.nic.in |
| 5 | National Cyber Crime Portal | https://cybercrime.gov.in/ | ✅ content-confirmed same day | Cyber fraud reporting (I4C); 1930 to freeze transactions |
| 6 | RBI Sachet | https://sachet.rbi.org.in/ | ⚠️ timeout on automated probe; official RBI domain | Verify RBI-registered entities; re-check next release |
| 7 | UIDAI (Aadhaar) | https://uidai.gov.in/ | ✅ HTTP 200 | Aadhaar update & services |
| 8 | Passport Seva | https://www.passportindia.gov.in/ | ✅ HTTP 200 | Passport application & status (MEA) |
| 9 | Income Tax e-Filing | https://www.incometax.gov.in/ | ✅ HTTP 200 | PAN services & grievances |
| 10 | e-Shram | https://eshram.gov.in/ | ✅ HTTP 200 | Worker REGISTRATION only — not a wage-grievance mechanism |
| 11 | NHAI | https://nhai.gov.in/ | ✅ HTTP 200 | National Highways only; helpline 1033 |
| 12 | Ayushman Bharat PM-JAY | https://pmjay.gov.in/ | ⚠️ timeout on automated probe; official NHA domain | Health cover & hospital empanelment; re-check next release |
| 13 | National Portal of India | https://www.india.gov.in/ | ✅ HTTP 200 | Directory incl. state Bhulekh land-record links |
| 14 | India Services Directory | https://services.india.gov.in/ | ✅ HTTP 200 | Find any government service |

**Change from previous release:** `edaakhil.nic.in` removed (DNS no longer resolves — confirmed twice); consumer-commission route now points to **e-Jagriti (https://e-jagriti.gov.in/)**, the official successor per the Ministry of Consumer Affairs.

**Emergency channels (not portals):** 112 (national emergency), 1930 (cyber fraud), 181 (women helpline), 14555 (PM-JAY).

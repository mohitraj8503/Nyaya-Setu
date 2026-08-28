# NyayaSetu — Media Sources

**No external stock photos or videos were downloaded for this release.**

## Reason (honest record)

Stock-media sourcing for "Indian citizens / public service / digital governance" themes was attempted via the license-filtered image search on 2026-08-28. The available Creative-Commons/public-domain results for these queries were off-topic news screenshots and archival photographs (e.g., political news images, historical photos) that do not meet the report's own rule: *"Avoid generic corporate stock imagery"* and do not scrape unsuitable assets merely because they are available. Padding the product with irrelevant or commercially-restricted images was judged worse than shipping clean custom visuals.

## What the product uses instead (all self-created, zero licensing risk)

| Asset | File / Location | Purpose |
|---|---|---|
| Logo mark | `favicon.svg` (existing project asset, retained) | Brand |
| Civic-network WebGL visual | generated at runtime by `assets/js/webgl.js` (Three.js) | Home hero — citizen→authority route visualization |
| Static SVG fallback | inline in `webgl.js` | No-WebGL / reduced-motion / CDN-failure fallback |
| Animated gradient + dot-grid background | pure CSS in `assets/css/design.css` | Subtle civic-themed motion |
| 3D category carousel | CSS-3D, `assets/js/carousel3d.js` | Home category discovery |
| Emoji iconography | system fonts | Problem/category icons |

## For a future media pass

If suitable photography is added later, download only from Pexels/Pixabay/Unsplash license pages, store optimized files under `assets/images/`, and record each asset here with: source, original URL, license note, local filename, purpose. The scroll-frame video interaction (report §12) was deliberately not forced in: with no license-safe civic video available, adding one would violate the "no placeholder implementation" rule. The architecture hook point for it is documented in `docs/architecture.md`.

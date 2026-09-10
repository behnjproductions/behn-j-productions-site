# Prototype Instructions

Run the local server yourself and open the preview in the browser available to this environment. Do not give the user server-start instructions when you can run it.

Before making substantial visual changes, use the Product Design plugin's `get-context` skill when the visual source is unclear or no longer matches the current goal. When the user gives durable prototype-specific design feedback, preferences, or decisions, record them in `AGENTS.md`.

When implementing from a selected generated mock, treat that image as the source of truth for layout, component anatomy, density, spacing, color, typography, visible content, and hierarchy.

Build app UI in `src/`. Keep `.openai/hosting.json`, `worker/index.js`, `scripts/prepare-sites-build.mjs`, and `tests/sites-worker.test.mjs` intact so the same local prototype can be handed to Sites. Before a Sites handoff, run `npm run build` and `npm run test:sites`; the build must leave `dist/client/index.html`, `dist/server/index.js`, and `dist/.openai/hosting.json`.

## Durable brand/site decisions

- Brand palette: red #9F1204 and yellow-orange #FFB604; Anton headings and Alice body text.
- Premium marketing site and school platform remain separate products.
- Marketing site destination: behnjproductions.ca. School platform destination: behnjphotos.ca.
- Official contact email: contact@behnjphoto.com.
- Facebook portfolio URL: https://www.facebook.com/share/1P2sLfxUaz/?mibextid=wwXIfr
- Portfolio imagery is stored as individual files so each photograph can be replaced independently.

- Mobile should preserve the cinematic desktop hierarchy: all three hero images remain visible, media chapters stay full-bleed, and photography cards use touch-friendly horizontal scroll.
- A dedicated “Ils nous font confiance” section follows the testimonial and names ITUM, Ville de Sept-Îles, Chambre de commerce de Sept-Îles–Port-Cartier, Rio Tinto, and Métal 7.
- The school section uses Behn J. Productions’ own family student portraits with the existing cinematic red-and-yellow treatment; do not substitute stock children.
- The Diffusion web chapter includes four priority live-streaming markets: colloquia/conferences, sports, general/community assemblies, and municipal/public consultations.

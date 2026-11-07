# Homepage design QA — November 6, 2026

Source visual truth: /Users/behnjproductions/.codex/generated_images/01a16c95-f8d7-7132-92e5-3dc81c0e2777/exec-e8ed857b-33b6-40ef-8622-e7776978e539.png (1024 × 1536 concept).
Implementation screenshots: /Users/behnjproductions/Documents/Codex/2026-11-06/behn-home/outputs/home-desktop.png (1440 × 2459); home-mobile.png (390 px CSS width). Density 1; compare page-region proportions rather than stretching the full pages to equal height.
State: homepage default, desktop 1440 × 1000 and mobile 390 × 844. Actual site content and photography retained. Browser: headless Chrome through Playwright.

## Comparison and findings
- Typography: Cormorant Garamond display, italic hero/card/contact headings and Inter micro labels reproduce the editorial hierarchy. Scoped to the homepage. Other routes retain brand typography.
- Spacing/layout: ivory navigation, spacious portrait hero, compact festive ribbon, three equal service cards, two-column dark contact and footer. Mobile stacks cards and form; no horizontal overflow. All original navigation routes are accessible (including IA and Boutique).
- Colors: official #9F1204 red and #FFB604 yellow, warm ivory and near-black. Understated borders and red separators.
- Image fidelity: real existing brand logo retained instead of the generated approximation. Existing original marriage/event/design photographs used instead of mock stock images. All images loaded. The real portrait has a taller aspect than the concept: top crop now preserves both complete heads. No replacement of photos with shapes.
- Content: approved French headlines and event dates match the concept. Existing full contact fields and mandatory consent preserved; therefore the contact region is intentionally taller than the simplified mock. No fabricated testimonials.

## Iteration history
1. P1: initial desktop portrait crop clipped the elder's head. Corrected object-position to top; restarted preview and captured again. Both heads fully visible.
2. P2: font-synthesis disabled by existing global styles prevented italic display rendering. Enabled style synthesis only inside homepage; new screenshot confirms italic hierarchy.
3. P2: original textarea height made contact excessively tall. Scoped textarea to 80px, still user-resizable; retained all functional fields.

## Interactions and checks
- Privacy dialog opens and Escape dismisses it.
- Mobile navigation opens, closes with Escape and returns focus.
- No browser page errors; no broken images; no horizontal overflow at 1440 and 390.
- Navigation destinations and services anchors checked against source.
- Production build, four Sites worker tests and eleven contact submission tests pass.
- No real contact submission sent during QA.

Focused evidence: desktop hero and contact regions inspected in the full-resolution screenshot; mobile portrait/menu/form inspected separately. Brand logo is the supplied site's original asset, not an AI redraw.

## Follow-up polish
- Concept uses different stock service photography; implementation deliberately preserves the business's original work.

final result: passed

## Contact refinement
November 6: replaced low-contrast underlined form with an ivory card, bordered fields, Inter labels, clear consent, full-width red CTA, short editorial introduction and quieter backdrop. Preserves existing ContactForm logic and fields. Desktop/mobile browser checks repeated: no overflow, no broken imagery, privacy dialog and mobile menu pass, no page errors. New evidence: form-desktop.png and form-mobile.png in /Users/behnjproductions/Documents/Codex/2026-11-06/behn-home/outputs/. Production build passes. No live submission or publication performed.

final result: passed

## Compact contact revision
User rejected the left editorial text block. Removed it and its paragraph/service list. Contact now has one centered, non-italic heading « Parlons de votre projet. » above the ivory form, with a quiet solid background. Preserved full form behavior. Desktop/mobile browser verification repeated successfully (no overflow, no broken images, privacy dialog, menu and no page errors); build passes. Evidence: contacto-simplificado.png in the task outputs.

final result: passed

## Selected wedding photo
Added user-selected IMG_2257.JPG as an optimized 208 KB WebP, without cropping or text overlays, left of the contact form on desktop and above on mobile. Original file untouched. Browser desktop/mobile checks pass: no overflow, no broken images, no page errors, privacy and menu work. Screenshot: contacto-con-foto.png in task outputs. Publication remains pending user authorization.

final result: passed

## Photo background — user correction
Moved IMG_2257 into a full-section background with a dark overlay. On desktop the ivory form sits right, leaving the bride visible left. Mobile uses the same background with a left-biased crop. Preserved contact fields and submission. Browser checks pass on desktop/mobile with no page errors or overflow; privacy and menu pass. Focused screenshot: contacto-fondo-foto.png in task outputs. Not published.

final result: passed

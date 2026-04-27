# Shared Visual Output Reference

Use this from visual skills to avoid repeating large design blocks.

## Tool Routing

Prefer Cursor Canvas for standalone visual artefacts when available. If Canvas is not available, create a self-contained `.html` file in the repo path requested by the user. Use `GenerateImage` only when the user explicitly asks for an image asset, illustration, or mockup.

## MyMoolah Brand Defaults

For customer-facing MyMoolah visuals:
- Primary green: `#86BE41`.
- Secondary blue: `#2D8CCA`.
- Font: Montserrat when matching product/portal brand.
- Keep financial examples PII-safe: use masked references and fictional-but-clearly-labelled examples for visuals, never real customer names, phone numbers, IDs, or account numbers.

## Routing

- Slide deck: use `slide-deck-builder`.
- Scrolling HTML explainer, landing page, report, or documentation page: use `visual-page-builder`.
- System, workflow, architecture, swimlane, event flow, or data-flow map: use `workflow-visualizer`.
- Single analogy-led infographic or educational graphic: use `explainer-graphic`.

## Quality Checklist

- [ ] Visual hierarchy is obvious within 3 seconds.
- [ ] Text is short and supports the visual, not the other way around.
- [ ] Mobile and print/export states are considered where relevant.
- [ ] Colours pass contrast for important text.
- [ ] No real PII or production secrets appear in examples.

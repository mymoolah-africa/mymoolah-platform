---
name: slide-deck-builder
description: Generate stunning, animated HTML slide decks with rich visual components, presenter mode, and keyboard navigation. Produces self-contained HTML files that open in any browser. Use when asked to make a presentation, create slides, or build a pitch deck.
triggers:
  - make a slide deck
  - create slides
  - build a presentation
  - generate slides
  - pitch deck
  - slide deck
---

# Slide Deck Builder — Presentation Generator

Generate beautiful, animated HTML slide decks with rich visual components, presenter mode, and smooth transitions. No PowerPoint, no Google Slides, no subscriptions. One HTML file, open in any browser, present anywhere.

> Shared guidance: read `../_shared/visual-output-reference.md` for tool routing,
> MyMoolah brand defaults, PII-safe examples, and cross-skill routing.

> **Core principle**: Every slide tells one story with one visual. If a slide needs two ideas, it needs two slides.

---

## Output Method

Use Cursor Canvas when available to create a live HTML artefact. The canvas auto-reloads on edit, making iteration fast. The resulting `.html` file is fully portable — works offline, no internet needed to present.

For slide backgrounds or hero images, use `GenerateImage` and embed as base64 or reference the file path.

---

## Slide Structure

Every deck follows this narrative arc:

| Slide | Purpose | Visual Component |
|-------|---------|-----------------|
| **1. Title** | Set the stage | Big title, subtitle, name/brand, gradient or image background |
| **2. Hook** | Why should they care? | Stat callout, provocative question, or striking image |
| **3. Context** | Frame the problem or opportunity | Comparison panel, timeline, or icon list |
| **4-8. Core** | Deliver the substance | One idea per slide, each with a unique visual component |
| **9. Evidence** | Prove the point | Metric dashboard, quote block, or case study card |
| **10. Takeaway** | Land the message | Summary card, call to action, or next steps flow |

Adjust core slides based on complexity:
- **Lightning talk (5 min)**: 5-7 slides
- **Standard presentation (15 min)**: 8-12 slides
- **Deep dive (30+ min)**: 12-15 slides
- **Never exceed 15 slides** — split into parts if needed

---

## Visual Components

**Every slide MUST have a visual component.** Text-only slides are forbidden.

### Core Components

| Component | Structure | Best For |
|-----------|-----------|----------|
| **Card Grid** | 2-4 cards in a row, each with icon + title + one-line description | Features, benefits, categories |
| **Comparison Panel** | Two columns with a "vs" divider | Old vs new, before/after, tool comparisons |
| **Stat Callout** | One huge number (72-120px) with short label | Growth numbers, costs, impressive data |
| **Step Flow** | Numbered steps with arrows between them | Processes, tutorials, how-it-works |
| **Quote Block** | Large quotation marks, italic text, attribution | Testimonials, expert quotes, key statements |
| **Icon + Label List** | Vertical list with emoji/icons left, labels right | Feature lists, agendas, checklists |
| **Code Block** | Monospace on dark card with syntax coloring | Code examples, CLI commands, configs |
| **Timeline** | Horizontal line with labeled dots | History, roadmap, project phases |
| **Metric Dashboard** | 3-4 stat boxes in a row with labels and values | KPIs, performance data, comparisons |

### Advanced Components

| Component | Structure | Best For |
|-----------|-----------|----------|
| **Animated Counter** | Numbers counting up from 0 to target on slide enter | Revenue, user counts, percentages |
| **Progress Ring** | Circular SVG progress indicator with percentage | Completion rates, scores, quotas |
| **Mermaid Diagram** | Flowchart or sequence diagram via Mermaid.js CDN | Architecture, workflows, decision trees |
| **Gradient Text Hero** | Oversized gradient text filling the slide | Bold statements, chapter transitions |
| **Glassmorphism Card** | Frosted glass card with blur backdrop | Premium feel, overlaying images |
| **Before/After Slider** | Draggable divider between two states | Visual transformations, redesigns |
| **Stacked Bar** | Horizontal segmented bar with labels | Budget allocation, time breakdown |
| **Logo Grid** | Grid of logos or brand marks | Partners, tech stack, client roster |
| **Highlight Box** | Bordered callout with accent background | Key takeaways, warnings, pro tips |
| **Image + Caption** | Full-bleed or centered image with caption overlay | Screenshots, photos, diagrams |

---

## Design System

### Typography

Import distinctive fonts from Google Fonts. NEVER use system fonts, Inter, Roboto, or Arial.

**Recommended pairings by mood:**

| Display Font | Body Font | Mood | Best For |
|-------------|-----------|------|----------|
| Playfair Display | Source Sans 3 | Elegant, editorial | Investor decks, reports |
| Sora | DM Sans | Modern, clean | Tech presentations, product demos |
| Fraunces | Work Sans | Warm, human | Team updates, culture decks |
| Space Mono | Outfit | Technical, hacker | Developer talks, architecture |
| Bricolage Grotesque | Nunito Sans | Bold, energetic | Marketing, sales pitches |
| Instrument Serif | Inter Tight | Sophisticated | Strategy, executive briefs |
| Cabinet Grotesk | Satoshi | Startup, fresh | Pitch decks, launch events |

**Size scale:**
- Slide title: 56-72px (display font, bold)
- Section heading: 36-48px (display font)
- Body text: 24-28px (body font)
- Caption/label: 16-20px (body font, muted color)
- Stat number: 72-120px (display font, accent color)
- Code: 18-20px (monospace)

### Color Themes

Define palettes with CSS variables. Offer variety — not every deck should be dark.

**Dark themes (high impact, best for large screens):**

```css
/* Midnight */
:root { --bg: #0a0a0a; --surface: #161616; --primary: #3b82f6; --text: #f0f0f0; --muted: #666; --border: #222; }

/* Deep Ocean */
:root { --bg: #0c1222; --surface: #162032; --primary: #38bdf8; --text: #e2e8f0; --muted: #64748b; --border: #1e3a5f; }

/* Forest */
:root { --bg: #0a120a; --surface: #142014; --primary: #4ade80; --text: #ecfdf5; --muted: #6b7e6b; --border: #1a3a1a; }
```

**Light themes (clean, best for printed handouts):**

```css
/* Paper */
:root { --bg: #fafaf9; --surface: #ffffff; --primary: #dc2626; --text: #1c1917; --muted: #78716c; --border: #e7e5e4; }

/* Soft Blue */
:root { --bg: #f8fafc; --surface: #ffffff; --primary: #2563eb; --text: #0f172a; --muted: #64748b; --border: #e2e8f0; }
```

**Accent color by topic:**

| Topic | Accent | Hex |
|-------|--------|-----|
| AI / Tech | Electric blue | `#3B82F6` |
| Business / Strategy | Warm amber | `#F59E0B` |
| Design / Creative | Coral pink | `#F43F5E` |
| Finance / Banking | Emerald green | `#10B981` |
| Health / Wellness | Soft teal | `#14B8A6` |
| Education / Learning | Royal purple | `#8B5CF6` |
| Marketing / Sales | Vibrant orange | `#F97316` |
| Security / Compliance | Steel blue | `#6366F1` |

### Spacing

- Slide padding: 60-80px on all sides
- Content max-width: 900px, centered
- Card gap: 24-32px
- Element spacing: Use a 4/8/16/24/32/48/64px scale
- Generous whitespace — crowded slides lose the audience

---

## Animations & Transitions

### Slide Transitions

```css
.slide { opacity: 0; transform: translateX(40px); transition: all 0.5s cubic-bezier(0.4, 0, 0.2, 1); }
.slide.active { opacity: 1; transform: translateX(0); }
```

### Element Entrance (staggered on slide enter)

```css
.slide.active .element { animation: fadeInUp 0.5s ease both; }
.slide.active .element:nth-child(1) { animation-delay: 0.1s; }
.slide.active .element:nth-child(2) { animation-delay: 0.2s; }
.slide.active .element:nth-child(3) { animation-delay: 0.3s; }
.slide.active .element:nth-child(4) { animation-delay: 0.4s; }

@keyframes fadeInUp {
  from { opacity: 0; transform: translateY(24px); }
  to { opacity: 1; transform: translateY(0); }
}
```

### Counter Animation (for stat callouts)

```javascript
function animateCounter(el, target, duration = 1500) {
  let start = 0;
  const step = (ts) => {
    if (!start) start = ts;
    const progress = Math.min((ts - start) / duration, 1);
    const eased = 1 - Math.pow(1 - progress, 3);
    el.textContent = Math.floor(eased * target).toLocaleString();
    if (progress < 1) requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
}
```

### Available Patterns

- **Fade in up**: Default for all elements
- **Scale in**: Cards growing from 0.8 to 1.0
- **Slide from left/right**: Comparison panels entering from sides
- **Typewriter**: Text appearing character by character (title slides)
- **Draw SVG**: SVG paths drawing themselves with `stroke-dashoffset`
- **Counter roll**: Numbers counting up to target value
- **Progress fill**: Bars or rings filling to their value

---

## Navigation & Presenter Features

### Keyboard Navigation (required in every deck)

```javascript
document.addEventListener('keydown', (e) => {
  if (e.key === 'ArrowRight' || e.key === ' ') nextSlide();
  if (e.key === 'ArrowLeft') prevSlide();
  if (e.key === 'Home') goToSlide(0);
  if (e.key === 'End') goToSlide(totalSlides - 1);
  if (e.key === 'f') toggleFullscreen();
  if (e.key === 'p') togglePresenterMode();
  if (e.key === 't') toggleTimer();
  if (e.key === 'Escape') exitPresenterMode();
});
```

### Required UI Elements

- **Slide counter**: Bottom-right corner, `"3 / 12"` format, muted color
- **Progress bar**: Thin bar at top of screen showing deck progress
- **Click/tap to advance**: Full slide area is clickable (for touchscreens)

### Presenter Mode (activated with 'P' key)

When toggled, show a split view:
- Left: current slide (large)
- Right top: next slide preview (small)
- Right bottom: speaker notes for current slide
- Timer showing elapsed time

### Speaker Notes

Store notes as `data-notes` attributes on slide elements:

```html
<div class="slide" data-notes="Key point: explain why this matters to the bottom line. Mention the Q3 numbers.">
  <!-- slide content -->
</div>
```

Notes are hidden during normal presentation, visible in presenter mode.

---

## HTML Template Structure

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>[Presentation Title]</title>
  <link href="https://fonts.googleapis.com/css2?family=[Display]:wght@700;900&family=[Body]:wght@400;600&display=swap" rel="stylesheet">
  <style>
    /* CSS reset, variables, slide layout */
    /* Typography scale */
    /* Visual components */
    /* Animations */
    /* Navigation UI */
    /* Presenter mode */
    /* Print styles */
  </style>
</head>
<body>
  <div class="progress-bar"><div class="progress-fill"></div></div>

  <div class="slide" data-notes="Speaker notes here">
    <!-- Slide 1: Title -->
  </div>

  <div class="slide" data-notes="">
    <!-- Slide 2: Hook -->
  </div>

  <!-- ... more slides ... -->

  <div class="slide-counter">1 / 10</div>

  <script>
    /* Navigation logic */
    /* Animation triggers */
    /* Counter animations */
    /* Presenter mode toggle */
    /* Timer */
    /* Fullscreen API */
  </script>
</body>
</html>
```

### CDN Libraries (optional, for advanced visuals)

```html
<!-- Mermaid for diagrams -->
<script src="https://cdn.jsdelivr.net/npm/mermaid/dist/mermaid.min.js"></script>

<!-- Chart.js for data visualizations -->
<script src="https://cdn.jsdelivr.net/npm/chart.js"></script>

<!-- GSAP for advanced timeline animations -->
<script src="https://cdn.jsdelivr.net/npm/gsap"></script>

<!-- Highlight.js for code syntax coloring -->
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/highlight.js/styles/github-dark.min.css">
<script src="https://cdn.jsdelivr.net/npm/highlight.js"></script>
```

---

## Content Rules

1. **One idea per slide.** Two points = two slides, always
2. **Max 30 words per slide.** Slides support the speaker, they are not documents
3. **Every slide has a visual component.** No exceptions — see the component list
4. **No bullet point dumps.** Use Icon + Label List or Card Grid instead
5. **Big text beats small text.** When in doubt, increase the font size
6. **Whitespace is mandatory.** Crowded slides lose the audience
7. **Consistent accent color.** One accent per deck for highlights, emphasis, and interactive elements
8. **Speaker notes carry the detail.** Put the explanation in notes, not on the slide

---

## Variety Rules

No two decks should look alike. Alternate between:

- Dark and light themes
- Serif and sans-serif display fonts
- Left-aligned and centered layouts
- Warm and cool accent palettes
- Minimal and rich visual density
- Subtle and bold entrance animations
- Full-bleed images and contained cards

---

## Print & Export

Include print styles for PDF export (Cmd+P in browser):

```css
@media print {
  .slide { page-break-after: always; height: 100vh; }
  .progress-bar, .slide-counter { display: none; }
  .slide { opacity: 1 !important; transform: none !important; }
  .element { opacity: 1 !important; transform: none !important; animation: none !important; }
}
```

---

## Example Prompts

- "Make a slide deck about how our PayShap integration works"
- "Create slides for my investor pitch — 10 slides, finance theme"
- "Build a presentation explaining KYC tiers for new team members"
- "Generate a 5-minute lightning talk on API security best practices"
- "Create a dark-theme tech presentation about our double-entry ledger"

---

## Quick Reference Checklist

Before delivering the deck, verify:

- [ ] Narrative arc: Title → Hook → Context → Core → Evidence → Takeaway
- [ ] One idea per slide, max 30 words
- [ ] Every slide has a visual component (no text-only slides)
- [ ] Distinctive Google Fonts loaded (not system fonts)
- [ ] CSS variables define the full color palette
- [ ] Slide transitions and staggered element entrance working
- [ ] Arrow keys, spacebar, and click navigation functional
- [ ] Slide counter and progress bar visible
- [ ] Speaker notes in `data-notes` attributes
- [ ] Presenter mode toggles with 'P' key
- [ ] Print styles produce clean page-per-slide PDF
- [ ] Self-contained HTML file (works offline except fonts)

---
name: visual-page-builder
description: Generate stunning self-contained HTML pages that explain any concept visually. Produces polished, animated, responsive pages with rich components — landing pages, dashboards, documentation, case studies, and more. Use when asked to build a visual page, create an HTML explainer, make a landing page, or design a documentation page.
triggers:
  - visual explanation
  - explain this visually
  - make a visual page
  - build an html explainer
  - landing page
  - documentation page
  - visual page
---

# Visual Page Builder — Rich HTML Page Generator

Generate polished, animated, self-contained HTML pages that explain any concept using rich visual components. No frameworks, no build step. One file that looks like a real product page — open it in any browser.

> **Core principle**: Every section tells its story visually. Text introduces, visuals deliver. If a section has no visual component, it does not belong on the page.

---

## Output Method

Use the browser MCP's `canvas` tool to create a live HTML file. Canvas auto-reloads on edit, making iteration fast. The resulting `.html` file is fully portable.

For hero images, illustrations, or photo backgrounds, use `GenerateImage` and embed as base64 `<img>` or reference the file path.

---

## Page Types

| Type | Best For | Key Components |
|------|----------|---------------|
| **Landing Page** | Products, features, launches | Hero section, feature grid, social proof, CTA |
| **Architecture Overview** | Systems, tech stacks, infrastructure | Flow diagram, component cards, connection lines |
| **Comparison** | Tool vs tool, plan vs plan, before/after | Side-by-side grids, checkmarks, highlight winner |
| **Process Guide** | Tutorials, onboarding, how-to | Numbered steps, arrows, status indicators |
| **Timeline / Roadmap** | Project history, changelogs, plans | Vertical timeline, date markers, milestone cards |
| **Dashboard / Report** | Metrics, KPIs, performance | Stat cards, charts, progress rings, tables |
| **Concept Explainer** | Abstract ideas, frameworks, models | Analogy visuals, layered diagrams, callout boxes |
| **Case Study / Recap** | Project summaries, success stories | Before/after, stats, testimonials, gallery |
| **Documentation** | Technical guides, API refs, setup | Code blocks, tabs, collapsible sections, tables |
| **Magazine / Editorial** | Long-form content, thought leadership | Pull quotes, full-bleed images, editorial typography |

Auto-detect the type from the user's description, or ask if unclear.

---

## Workflow

### Step 1: Gather Content

Extract from the user's request:
- **Title** and subtitle for the page
- **3-8 sections** they want to cover (or suggest based on topic)
- **Key data points** (numbers, stats, comparisons)
- **Relationships** between concepts (what connects to what)
- **Hierarchy** (what is most important, what is supporting)
- **Audience** (developers, executives, customers, general public)
- **Tone** (technical, friendly, corporate, playful)

If the user provides a document, transcript, or notes — extract these elements automatically and confirm before building.

### Step 2: Plan the Layout

Map each section to a visual component. Present the plan:

```
Hero:      "MyMoolah KYC System" → Gradient hero with subtitle + CTA
Section 1: "Three Tiers" → Card grid (3 cards with tier details)
Section 2: "How It Works" → Step flow (4 steps with arrows)
Section 3: "Limits by Tier" → Comparison table with highlighted column
Section 4: "Get Started" → CTA callout box with button
```

Get user approval before building.

### Step 3: Build with the Design System (below)

### Step 4: Iterate

Ask: "How does it look? I can adjust colors, swap components, add sections, or change any text."

---

## Design System

### Typography

Import distinctive fonts from Google Fonts. NEVER default to Inter, Roboto, Arial, or system fonts.

**Pairings by page mood:**

| Display Font | Body Font | Mood | Best For |
|-------------|-----------|------|----------|
| Playfair Display | Source Sans 3 | Elegant, editorial | Case studies, magazine pages |
| Sora | DM Sans | Modern, clean | Product pages, dashboards |
| Fraunces | Work Sans | Warm, approachable | Onboarding, tutorials |
| Space Mono | Outfit | Technical, hacker | Architecture docs, developer guides |
| Bricolage Grotesque | Nunito Sans | Bold, energetic | Landing pages, marketing |
| Instrument Serif | Inter Tight | Sophisticated | Executive reports, strategy docs |
| Cabinet Grotesk | Satoshi | Startup, fresh | Product launches, pitch pages |
| Libre Baskerville | Karla | Classic, trustworthy | Financial reports, compliance docs |

**Size scale:**

| Element | Size | Weight |
|---------|------|--------|
| Page title / Hero | 56-80px | 800-900 |
| Section heading | 36-48px | 700 |
| Subheading | 24-28px | 600 |
| Body text | 16-18px | 400 |
| Caption / label | 13-14px | 400 |
| Stat number | 48-96px | 800 |
| Code | 14-16px | 400 (monospace) |

### Color Themes

Define with CSS variables. Every page needs a deliberate palette — never use the same one twice.

**Dark themes:**

```css
/* Obsidian */
:root { --bg: #0a0a0f; --surface: #141419; --surface-border: #1e1e26; --primary: #3b82f6; --secondary: #f59e0b; --text: #eef2f7; --text-muted: #6b7280; --highlight: #10b981; }

/* Charcoal */
:root { --bg: #111111; --surface: #1a1a1a; --surface-border: #2a2a2a; --primary: #ef4444; --secondary: #a855f7; --text: #fafafa; --text-muted: #737373; --highlight: #22d3ee; }

/* Deep Navy */
:root { --bg: #0b1120; --surface: #111827; --surface-border: #1f2937; --primary: #38bdf8; --secondary: #fb923c; --text: #e2e8f0; --text-muted: #64748b; --highlight: #4ade80; }
```

**Light themes:**

```css
/* Paper */
:root { --bg: #faf9f7; --surface: #ffffff; --surface-border: #e5e2db; --primary: #b91c1c; --secondary: #92400e; --text: #1c1917; --text-muted: #78716c; --highlight: #059669; }

/* Clean */
:root { --bg: #f8fafc; --surface: #ffffff; --surface-border: #e2e8f0; --primary: #2563eb; --secondary: #7c3aed; --text: #0f172a; --text-muted: #64748b; --highlight: #10b981; }

/* Warm */
:root { --bg: #fffbeb; --surface: #ffffff; --surface-border: #fde68a; --primary: #d97706; --secondary: #dc2626; --text: #1c1917; --text-muted: #92400e; --highlight: #059669; }
```

### Layout

- Max content width: `1000px` (explainers), `1200px` (dashboards), `800px` (editorial)
- Section vertical spacing: `80-120px`
- Card gap: `24-32px`
- Card border-radius: `12-16px`
- Page padding: `24px` mobile, `48px` tablet, `80px` desktop
- Use CSS Grid for card layouts, Flexbox for inline elements

### Spacing Scale

Use a consistent `rem` scale: `0.25, 0.5, 0.75, 1, 1.5, 2, 3, 4, 6, 8`

---

## Visual Components

### Core Components

| Component | Structure | Best For |
|-----------|-----------|----------|
| **Hero Section** | Full-width banner with title, subtitle, optional CTA button | Page openers, first impressions |
| **Stat Cards** | Horizontal row, large number + label + optional trend arrow | Key metrics, highlights |
| **Card Grid** | 2-4 column grid, each with icon + title + description | Features, benefits, categories |
| **Comparison Table** | Multi-column grid with checkmarks or values | Plan vs plan, tool vs tool |
| **Step Flow** | Numbered circles connected by lines with title + description | Processes, tutorials, how-to |
| **Timeline** | Vertical line with dots, alternating cards | History, roadmap, changelog |
| **Code Block** | Dark card, monospace, syntax-colored | Technical content, configs, CLI |
| **Callout Box** | Accent left border, icon, highlighted background | Important notes, warnings, tips |
| **Quote Block** | Large quotation marks, italic text, attribution | Testimonials, key statements |
| **Table** | Striped rows, sticky header, responsive scroll | Structured data, specs |
| **Icon Grid** | 2-3 column grid with emoji + title + one-line desc | Feature overviews, tool lists |
| **Progress Bars** | Horizontal bar with fill percentage and label | Completion, capacity, scores |

### Advanced Components

| Component | Structure | Best For |
|-----------|-----------|----------|
| **Gradient Hero** | Full-bleed gradient or mesh background with oversized text | Bold openers, landing pages |
| **Animated Counter** | Number counting up from 0 to target on scroll-into-view | Revenue, user counts, metrics |
| **Progress Ring** | Circular SVG ring with percentage | Scores, completion rates |
| **Pricing Table** | 2-3 columns with price, features, CTA, highlighted "popular" | Plan comparisons, pricing pages |
| **FAQ Accordion** | Clickable questions that expand to show answers | Support pages, onboarding |
| **Tab Panel** | Horizontal tabs switching content below | Multi-view content, code examples |
| **Testimonial Carousel** | Rotating cards with quote, avatar, name, role | Social proof, case studies |
| **Before / After** | Split panel or slider showing transformation | Redesigns, improvements |
| **Glassmorphism Card** | Frosted glass with blur backdrop | Premium feel, overlaying images |
| **Metric Dashboard** | Grid of stat cards + progress rings + mini chart | Executive dashboards, reports |
| **Sticky TOC** | Sidebar table of contents that follows scroll | Long documentation pages |
| **Badge Row** | Horizontal row of colored pill badges | Tags, statuses, tech stack |
| **Image + Caption** | Centered image with overlaid or below caption | Screenshots, diagrams |
| **CTA Banner** | Full-width accent band with text + button | Calls to action, sign-ups |
| **Mermaid Diagram** | Rendered flowchart or sequence diagram | Architecture, workflows |

---

## Animations

### Scroll-Triggered Entrance

Elements animate in as they enter the viewport:

```javascript
const observer = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      entry.target.classList.add('visible');
      observer.unobserve(entry.target);
    }
  });
}, { threshold: 0.15 });

document.querySelectorAll('.animate-on-scroll').forEach(el => observer.observe(el));
```

```css
.animate-on-scroll {
  opacity: 0;
  transform: translateY(30px);
  transition: opacity 0.6s ease, transform 0.6s ease;
}

.animate-on-scroll.visible {
  opacity: 1;
  transform: translateY(0);
}

/* Staggered children */
.animate-on-scroll.visible .stagger:nth-child(1) { transition-delay: 0.1s; }
.animate-on-scroll.visible .stagger:nth-child(2) { transition-delay: 0.2s; }
.animate-on-scroll.visible .stagger:nth-child(3) { transition-delay: 0.3s; }
.animate-on-scroll.visible .stagger:nth-child(4) { transition-delay: 0.4s; }
```

### Counter Animation (scroll-triggered)

```javascript
function animateCounter(el) {
  const target = parseInt(el.dataset.target);
  const suffix = el.dataset.suffix || '';
  const prefix = el.dataset.prefix || '';
  const duration = 1500;
  let start;

  function step(ts) {
    if (!start) start = ts;
    const progress = Math.min((ts - start) / duration, 1);
    const eased = 1 - Math.pow(1 - progress, 3);
    el.textContent = prefix + Math.floor(eased * target).toLocaleString() + suffix;
    if (progress < 1) requestAnimationFrame(step);
  }
  requestAnimationFrame(step);
}
```

### Available Patterns

- **Fade in up**: Default for all sections
- **Scale in**: Cards growing from 0.95 to 1.0
- **Slide from sides**: Left/right for comparison panels
- **Counter roll**: Numbers counting up on scroll
- **Progress fill**: Bars and rings filling to their value on scroll
- **Staggered grid**: Cards entering one by one
- **Parallax background**: Subtle depth on hero sections
- **Smooth scroll**: Anchor links glide to sections

---

## HTML Template Structure

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>[Page Title]</title>
  <meta name="description" content="[One-line description]">
  <link href="https://fonts.googleapis.com/css2?family=[Display]:wght@700;900&family=[Body]:wght@400;600&display=swap" rel="stylesheet">
  <style>
    /* CSS reset */
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

    /* CSS variables */
    :root { /* theme colors */ }

    /* Base typography */
    body {
      font-family: '[Body Font]', sans-serif;
      background: var(--bg);
      color: var(--text);
      line-height: 1.6;
    }

    /* Layout */
    .container { max-width: 1000px; margin: 0 auto; padding: 0 24px; }
    section { padding: 80px 0; }

    /* Component styles */
    /* Animation styles */
    /* Responsive breakpoints */
    @media (max-width: 768px) { /* tablet */ }
    @media (max-width: 480px) { /* mobile */ }

    /* Print styles */
    @media print {
      body { background: white; color: black; }
      .animate-on-scroll { opacity: 1 !important; transform: none !important; }
    }
  </style>
</head>
<body>
  <!-- Hero / Header -->
  <!-- Section 1 -->
  <!-- Section 2 -->
  <!-- ... -->
  <!-- CTA / Footer -->

  <script>
    /* Scroll observer for animations */
    /* Counter animations */
    /* Accordion toggles */
    /* Smooth scroll for anchor links */
    /* Optional: tab switching, carousel */
  </script>
</body>
</html>
```

### CDN Libraries (optional, for advanced components)

```html
<!-- Chart.js for data visualizations -->
<script src="https://cdn.jsdelivr.net/npm/chart.js"></script>

<!-- Mermaid for flowcharts -->
<script src="https://cdn.jsdelivr.net/npm/mermaid/dist/mermaid.min.js"></script>

<!-- Highlight.js for syntax coloring -->
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/highlight.js/styles/github-dark.min.css">
<script src="https://cdn.jsdelivr.net/npm/highlight.js"></script>

<!-- GSAP for advanced animations -->
<script src="https://cdn.jsdelivr.net/npm/gsap"></script>
```

---

## Content Rules

1. **Every section needs a visual component.** No section is just a wall of text. If no obvious visual, use a callout box or icon grid.
2. **Max 50 words before a visual.** Introductory text must be short. The visual does the heavy lifting.
3. **Responsive is mandatory.** Card grids stack on mobile, tables scroll horizontally, stat cards resize.
4. **Content works without JavaScript.** JS enhances (animations, counters, accordions) but all content is visible with JS disabled.
5. **Accessible.** WCAG AA contrast, semantic HTML (`section`, `article`, `nav`, `h1-h6`), alt text on images.
6. **Consistent spacing.** Use the design system spacing scale. Never eyeball padding or margins.
7. **Page title in browser tab.** Set the `<title>` tag.
8. **Under 500KB total.** If inlining images, compress them first.
9. **Smooth scroll on anchor links.** `html { scroll-behavior: smooth; }`
10. **Print-friendly.** `@media print` removes animations, uses white background, black text.

---

## Variety Rules

No two pages should look alike. Alternate between:

- Dark and light themes
- Serif and sans-serif display fonts
- Full-bleed heroes and contained headers
- Warm and cool accent palettes
- Spacious and compact section spacing
- Centered and left-aligned layouts
- Gradient and solid backgrounds
- Editorial and technical tones

---

## Example Prompts

- "Build a visual page explaining our 3-tier KYC system"
- "Create a landing page for MyMoolah's PayShap feature"
- "Make a visual dashboard showing our platform metrics"
- "Build an architecture overview of our H2H integration with Standard Bank"
- "Create a visual onboarding guide for new wallet users"
- "Make a case study page showing before/after of our ledger migration"

---

## Quick Reference Checklist

Before delivering the page, verify:

- [ ] Page type matches the content (landing, docs, dashboard, etc.)
- [ ] Every section has a visual component (no text-only sections)
- [ ] Max 50 words before each visual
- [ ] Distinctive Google Fonts loaded (not Inter/Roboto/Arial)
- [ ] CSS variables define the full color palette
- [ ] Scroll-triggered entrance animations working
- [ ] Counter animations fire on scroll (if stat cards present)
- [ ] Responsive at 480px, 768px, and 1200px breakpoints
- [ ] Content readable with JavaScript disabled
- [ ] WCAG AA contrast on all text
- [ ] Semantic HTML structure (section, article, h1-h6)
- [ ] Print styles produce clean output
- [ ] Smooth scroll on anchor links
- [ ] Total file size under 500KB
- [ ] Self-contained HTML (works offline except fonts/CDN)

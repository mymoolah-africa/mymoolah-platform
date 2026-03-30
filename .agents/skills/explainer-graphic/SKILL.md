---
name: explainer-graphic
description: Create stunning visual infographics and explainer graphics using real-world analogies. Produces live HTML canvases, SVG files, or AI-generated images directly in Cursor. Use when asked to explain something visually, create an infographic, make a diagram, or produce educational graphics.
triggers:
  - explainer graphic
  - make an infographic
  - explain this visually
  - create a graphic
  - visual explainer
  - infographic
  - diagram
---

# Explainer Graphic — Visual Infographic Builder

Create stunning infographics that explain complex topics using real-world analogies anyone can understand. The agent finds the killer analogy, maps every piece, then BUILDS the graphic directly — no handoff to a designer.

> **Core principle**: Analogy first, design second. The analogy makes or breaks the graphic. Get it right before touching a single pixel.

---

## Output Formats

Choose the best format for the request:

| Format | Tool | Best For | Quality |
|--------|------|----------|---------|
| **HTML Canvas** | `canvas` (browser MCP) | Interactive, animated, presentation-grade | Highest |
| **SVG File** | Write tool → `.svg` | Scalable diagrams, clean vector art, embeddable | High |
| **Raster Image** | `GenerateImage` tool | Social media posts, quick visuals, photo-realistic | Medium |

**Default to HTML Canvas** unless the user specifically requests an image file or SVG. Canvas produces the most impressive results — live in the browser, interactive, animated, and pixel-perfect.

---

## Step 1: Find the Killer Analogy

The analogy is everything. Search these categories for the perfect fit:

| Category | Example Analogies | Best For |
|----------|-------------------|----------|
| **Everyday Life** | Kitchen, closet, mailbox, filing cabinet, remote control, vending machine | Organization, storage, interfaces |
| **Jobs & Roles** | Receptionist, translator, librarian, bouncer, air traffic controller, postal worker | Routing, filtering, managing, gatekeeping |
| **Construction** | Blueprint, foundation, scaffolding, plumbing, wiring, renovation | Architecture, infrastructure, building |
| **Cooking** | Recipe, ingredients, oven, blender, mise en place, assembly line | Processes, combining inputs, transformation |
| **Sports** | Playbook, coach, referee, training camp, relay race, substitution bench | Strategy, teamwork, handoffs, rules |
| **Gaming** | Skill tree, inventory, quest log, respawn, power-ups, save points | Progression, upgrades, state management |
| **Nature** | Root system, beehive, food chain, ecosystem, seasons, migration | Networks, hierarchies, cycles |
| **Transportation** | Airport terminal, highway interchange, traffic lights, GPS, train switching | Routing, queuing, flow control, scheduling |
| **Medical** | Immune system, triage, blood circulation, quarantine, vaccination | Defense, prioritization, distribution |
| **Music** | Orchestra conductor, DJ mixing, sheet music, soundboard, tuning | Coordination, composition, configuration |
| **City & Infrastructure** | Power grid, water treatment, zoning, postal system, fire department | Distribution, regulation, emergency response |
| **Pop Culture** | Swiss army knife, Netflix queue, GPS navigation, photo filter, playlist | Multi-tool, curated content, transformation |

### Analogy Selection Criteria

- Does it click in under 3 seconds?
- Would a 10-year-old get it?
- Does it map to at least 3 parts of the concept?
- Is it fresh? (Avoid "it's like a brain" for AI, "it's like a highway" for networks)
- Is it universal? No niche cultural references.

---

## Step 2: Map the Analogy

Every part of the concept MUST map to something in the analogy. If a piece does not map cleanly, the analogy is wrong — go back and pick a better one.

| Real Concept | Analogy Equivalent | Visual Element | Connection |
|-------------|-------------------|----------------|------------|
| [Part 1] | [Analogy part] | [Specific visual — be precise] | [Why this mapping works] |
| [Part 2] | [Analogy part] | [Specific visual — be precise] | [Why this mapping works] |
| [Part 3] | [Analogy part] | [Specific visual — be precise] | [Why this mapping works] |
| [Part 4] | [Analogy part] | [Specific visual — be precise] | [Why this mapping works] |

Be visually specific: "a kitchen counter with three labeled bowls" not "cooking stuff."

---

## Step 3: Choose a Layout

| Layout | Structure | Best For |
|--------|-----------|----------|
| **Split Panel** | Two halves side by side | Comparisons, before/after, real vs analogy |
| **Circular Flow** | Elements in a circle with arrows | Cycles, feedback loops, recurring processes |
| **Stacked Steps** | Vertical stack, top to bottom | Sequential processes, hierarchies, funnels |
| **Comparison Grid** | 2x2 or 3x3 grid of cards | Feature comparisons, category breakdowns |
| **Before / After** | Left side old way, right side new way | Transformations, upgrades, improvements |
| **Pyramid** | Layers building up from base | Foundation concepts, priority levels |
| **Hub & Spoke** | Central element with branches | One-to-many relationships, ecosystems |
| **Timeline** | Left to right progression | Evolution, history, step-by-step |
| **Isometric Scene** | 3D-ish layered perspective | Architecture, infrastructure, systems |
| **Exploded View** | Components pulled apart with labels | Internal structure, anatomy, composition |

---

## Step 4: Design System

### Typography

Import distinctive fonts from Google Fonts. NEVER default to Inter, Roboto, Arial, Space Grotesk, or system fonts.

**Recommended pairings:**

| Display Font | Body Font | Mood |
|-------------|-----------|------|
| Playfair Display | Source Sans 3 | Elegant, editorial |
| Sora | DM Sans | Modern, clean tech |
| Fraunces | Work Sans | Warm, approachable |
| Space Mono | Outfit | Technical, developer |
| Bricolage Grotesque | Nunito Sans | Bold, contemporary |
| Instrument Serif | Inter Tight | Sophisticated, minimal |

### Color Strategy

Define a palette using CSS variables. Every graphic needs:

```css
:root {
  --bg: #0f172a;          /* Background — dark or light, commit to one */
  --surface: #1e293b;     /* Cards, panels */
  --primary: #3b82f6;     /* Main accent — bold, distinctive */
  --secondary: #f59e0b;   /* Supporting accent — contrasting */
  --text: #f8fafc;        /* Primary text */
  --text-muted: #94a3b8;  /* Secondary text */
  --border: #334155;      /* Dividers, outlines */
  --highlight: #10b981;   /* Callouts, success states */
}
```

Rules:
- Dark backgrounds with bright accents produce the most striking infographics
- Never use more than 3 accent colors
- Ensure sufficient contrast (WCAG AA minimum)
- Avoid generic AI color schemes (purple-on-white, blue gradients)

### Spacing & Layout

- Use `rem` units with a consistent scale (0.25, 0.5, 1, 1.5, 2, 3, 4, 6, 8)
- Generous whitespace — density kills readability
- Max content width: 900px for infographics, 1200px for dashboards
- Card border-radius: 12-16px for modern feel
- Subtle box-shadows or border treatments, not both

### Motion & Animation

CSS animations bring infographics to life:

```css
/* Staggered entrance — each element fades in sequentially */
@keyframes fadeInUp {
  from { opacity: 0; transform: translateY(20px); }
  to { opacity: 1; transform: translateY(0); }
}

.section:nth-child(1) { animation: fadeInUp 0.6s ease both 0.1s; }
.section:nth-child(2) { animation: fadeInUp 0.6s ease both 0.2s; }
.section:nth-child(3) { animation: fadeInUp 0.6s ease both 0.3s; }
```

Patterns to use:
- **Staggered entrance**: Elements fade/slide in sequentially on load
- **Hover reveals**: Additional detail appears on hover (interactive canvases only)
- **Pulsing highlights**: Draw attention to the key insight
- **Flowing arrows**: Animated dashes showing direction of flow
- **Counter animations**: Numbers counting up to their final value

### Icons & Visual Elements

- Use emoji for quick visual markers (universally supported)
- Use inline SVG for custom icons (scalable, styleable)
- Use CSS shapes (circles, triangles, arrows) for geometric elements
- For complex illustrations, use the `GenerateImage` tool and embed as `<img>`

---

## Step 5: Build the Graphic

### Option A: HTML Canvas (Default — Best Quality)

Use the browser MCP's `canvas` tool. The canvas creates a live `.html` file that auto-reloads.

Structure:

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>[Graphic Title]</title>
  <link href="https://fonts.googleapis.com/css2?family=[Display+Font]:wght@700&family=[Body+Font]:wght@400;600&display=swap" rel="stylesheet">
  <style>
    /* CSS variables, reset, layout, typography, animations */
  </style>
</head>
<body>
  <!-- Title banner -->
  <!-- Analogy sections with visuals -->
  <!-- Connection arrows / flow indicators -->
  <!-- Key insight callout -->
  <!-- Optional: footer with attribution -->
</body>
</html>
```

Requirements:
- Self-contained single HTML file (inline CSS, no external dependencies except Google Fonts and CDN libraries)
- Responsive — looks good from 375px to 1440px
- Print-friendly — `@media print` styles for clean printout
- All content visible without JavaScript (JS enhances, does not gate content)

Recommended CDN libraries for canvases:
- **D3.js** (`https://esm.sh/d3`) — data-driven diagrams, force layouts
- **GSAP** (`https://cdn.jsdelivr.net/npm/gsap`) — timeline animations
- **Mermaid** (`https://cdn.jsdelivr.net/npm/mermaid`) — flowcharts from text
- **Three.js** (`https://esm.sh/three`) — 3D scenes for isometric views

### Option B: SVG File

Write a `.svg` file using the Write tool. Best for clean vector diagrams.

```xml
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1080 1920">
  <style>/* Embedded CSS */</style>
  <!-- Groups for each section -->
  <!-- Text elements with proper font embedding -->
  <!-- Paths for arrows and connections -->
</svg>
```

### Option C: AI-Generated Image

Use the `GenerateImage` tool with a detailed prompt built from the visual brief. Best for photo-realistic or illustrated styles that CSS cannot achieve.

Include in the prompt:
- Exact layout description from Step 3
- Color palette from Step 4
- All text that should appear on the graphic
- Style direction (flat vector, isometric, watercolor, photographic, etc.)

---

## Content Rules

- **Max 50 words** of text on the entire graphic (less is better)
- **Every section needs a visual element** — not just text in a box
- **The graphic should make sense without reading text** — visuals carry the story
- **One concept per graphic** — if too big, split into a series
- **Title: 8 words max** — punchy, memorable (e.g., "API Keys Are Just VIP Wristbands")
- **Key insight callout** — one highlighted box with the single most important takeaway, styled differently from everything else (bigger, bolder, bordered, different color)

---

## Variety Rules

No two infographics should look alike. Alternate between:

- Light and dark themes
- Serif and sans-serif display fonts
- Horizontal and vertical layouts
- Warm and cool palettes
- Minimal and dense compositions
- Static and animated presentations

---

## Example Prompts

- "Explain how APIs work visually"
- "Create an infographic about our KYC tier system"
- "Make a visual explainer of how PayShap instant payments work"
- "Explain Docker containers with an analogy"
- "Create a graphic showing our double-entry ledger architecture"

---

## Quick Reference Checklist

Before delivering the graphic, verify:

- [ ] Analogy clicks in under 3 seconds
- [ ] Every concept part maps to an analogy part
- [ ] Max 50 words of text
- [ ] Distinctive fonts (not Inter/Roboto/Arial)
- [ ] Color palette defined with CSS variables
- [ ] Staggered entrance animation on sections
- [ ] Key insight callout is visually prominent
- [ ] Responsive layout (works mobile to desktop)
- [ ] Self-contained file (no broken external dependencies)
- [ ] Visuals tell the story even without text

---
name: workflow-visualizer
description: Map any system, workflow, or architecture as a beautiful interactive HTML diagram with animated data flow, zoom/pan, and click-to-explore. Produces live HTML canvases using D3.js or pure CSS. Use when asked to visualize a workflow, diagram a system, map out architecture, or show how something works.
triggers:
  - visualize this workflow
  - map out this system
  - diagram my workflow
  - show how this works
  - system diagram
  - architecture diagram
  - flow diagram
---

# Workflow Visualizer — Interactive System Diagrams

Turn any system description into a beautiful, interactive diagram with animated data flow, zoom/pan navigation, and click-to-explore detail. One self-contained HTML file, open in any browser.

> Shared guidance: read `../_shared/visual-output-reference.md` for tool routing,
> MyMoolah brand defaults, PII-safe examples, and cross-skill routing.

> **Core principle**: A diagram should reveal how a system thinks, not just what it contains. Show the flow, the decisions, and the data transformations.

---

## Output Method

Use Cursor Canvas when available to create a live HTML artefact. For complex diagrams with many nodes, use **D3.js** for automatic force-directed or hierarchical layout. For simpler flows (under 10 nodes), pure CSS grid/flexbox with SVG arrows works well.

| Complexity | Approach | Library |
|-----------|----------|---------|
| Simple (3-8 nodes) | CSS + SVG arrows | None (pure HTML/CSS) |
| Medium (8-15 nodes) | D3.js force layout | `https://esm.sh/d3` |
| Complex (15-20 nodes) | D3.js dagre layout | `https://esm.sh/d3` + `https://esm.sh/dagre` |
| Architecture (grouped) | D3.js with nested groups | `https://esm.sh/d3` |

---

## Step 1: Parse the System

Extract these components from the user's description:

| Component | What to Look For | Icon |
|-----------|-----------------|------|
| **Trigger** | What starts the workflow | Lightning bolt, clock, webhook |
| **Input** | Data entering the system | Inbox, file, upload arrow |
| **Process** | Actions that transform data | Gear, wand, code brackets |
| **Tool / Service** | External APIs or services used | Brand logo, wrench, plug |
| **Decision** | Conditional branches | Diamond, question mark, fork |
| **Output** | Final results or deliverables | Check, send, export arrow |
| **Data Store** | Persistent storage between steps | Database cylinder, folder |
| **Loop** | Recurring or repeating steps | Circular arrow, refresh |
| **Error Handler** | What happens when something fails | Warning triangle, shield |
| **Parallel** | Steps that run simultaneously | Split arrows, parallel lines |
| **Timer / Delay** | Scheduled waits or polling intervals | Hourglass, clock |
| **Human Approval** | Manual review or sign-off gate | User check, hand stop |
| **Queue** | Buffered processing, async handoff | Stack, conveyor belt |

If the user's description is vague, ask clarifying questions before building.

---

## Step 2: Choose a Layout

| Layout | Structure | Best For |
|--------|-----------|----------|
| **Left-to-Right Flow** | Horizontal chain | Linear pipelines, ETL processes |
| **Top-Down Waterfall** | Vertical cascade | Sequential steps, decision trees |
| **Hub & Spoke** | Central node with radial connections | API gateways, service meshes |
| **Swimlane** | Horizontal lanes per team/service | Multi-team handoffs, cross-system flows |
| **Circular** | Loop back to start | Recurring workflows, feedback loops |
| **Layered Architecture** | Stacked horizontal layers | Frontend → API → Service → DB patterns |
| **Event-Driven** | Central event bus with subscribers | Pub/sub, event sourcing, microservices |
| **Pipeline** | Stages with gates between them | CI/CD, approval workflows, funnels |

---

## Step 3: Design System

### Typography

Import distinctive fonts from Google Fonts. NEVER use system fonts.

| Display Font | Body Font | Mood |
|-------------|-----------|------|
| Space Mono | Outfit | Technical, developer |
| JetBrains Mono | DM Sans | Code-oriented, engineering |
| Sora | Inter Tight | Modern, clean systems |
| IBM Plex Sans | IBM Plex Mono | Enterprise, infrastructure |

### Node Colors

| Node Type | Background | Border | Glow Color |
|-----------|-----------|--------|------------|
| **Trigger** | `#0c2d48` | `#3B82F6` (blue) | `rgba(59,130,246,0.3)` |
| **Process** | `#0c3d2e` | `#10B981` (green) | `rgba(16,185,129,0.3)` |
| **Tool / Service** | `#3d2e0c` | `#F59E0B` (amber) | `rgba(245,158,11,0.3)` |
| **Output** | `#3d0c0c` | `#EF4444` (red) | `rgba(239,68,68,0.3)` |
| **Data Store** | `#1a1a3d` | `#6366F1` (indigo) | `rgba(99,102,241,0.3)` |
| **Decision** | `#2e0c3d` | `#A855F7` (purple) | `rgba(168,85,247,0.3)` |
| **Error Handler** | `#3d1a0c` | `#F97316` (orange) | `rgba(249,115,22,0.3)` |
| **Human Approval** | `#0c3d3d` | `#14B8A6` (teal) | `rgba(20,184,166,0.3)` |
| **Queue** | `#1a2e3d` | `#38BDF8` (sky) | `rgba(56,189,248,0.3)` |
| **Timer** | `#2e2e0c` | `#EAB308` (yellow) | `rgba(234,179,8,0.3)` |

### Color Themes

**Dark (default — best for diagrams):**

```css
:root {
  --bg: #0a0a0f;
  --surface: #12121a;
  --text: #e2e8f0;
  --text-muted: #64748b;
  --connection: #334155;
  --connection-active: #60a5fa;
  --grid: rgba(255,255,255,0.03);
}
```

**Light (for documentation embedding):**

```css
:root {
  --bg: #f8fafc;
  --surface: #ffffff;
  --text: #0f172a;
  --text-muted: #64748b;
  --connection: #cbd5e1;
  --connection-active: #2563eb;
  --grid: rgba(0,0,0,0.04);
}
```

**Blueprint (technical/engineering):**

```css
:root {
  --bg: #0a1628;
  --surface: #0f1f3d;
  --text: #93c5fd;
  --text-muted: #3b6eb5;
  --connection: #1e3a6e;
  --connection-active: #60a5fa;
  --grid: rgba(96,165,250,0.06);
}
```

---

## Step 4: Node Design

### Node Content

Each node displays:
- **Icon** (emoji or inline SVG) — top or left
- **Label** (2-4 words, bold) — primary identifier
- **Subtitle** (one short line) — what happens at this step
- **Badge** (optional) — tool name, duration, or status indicator

### Node Shapes

| Type | Shape | CSS |
|------|-------|-----|
| Standard (process, tool, output) | Rounded rectangle | `border-radius: 12px` |
| Decision | Diamond (rotated square) | `transform: rotate(45deg)` with inner counter-rotate |
| Data Store | Cylinder (rounded top/bottom) | SVG path or CSS with border-radius tricks |
| Trigger | Rounded rectangle with lightning badge | Standard + positioned badge |
| Loop | Rounded rectangle with circular arrow | Standard + SVG loop indicator |

### Connection Lines

```css
.connection {
  stroke: var(--connection);
  stroke-width: 2;
  fill: none;
  marker-end: url(#arrowhead);
}

.connection.active {
  stroke: var(--connection-active);
  stroke-width: 3;
  filter: drop-shadow(0 0 4px var(--connection-active));
}

.connection.animated {
  stroke-dasharray: 8 4;
  animation: flowDash 1s linear infinite;
}

@keyframes flowDash {
  to { stroke-dashoffset: -12; }
}
```

**Connection rules:**
- Solid lines for synchronous flow
- Dashed lines for asynchronous/event-driven
- Animated dashes for active/highlighted paths
- Data labels centered on connections (what data passes through)
- Labeled branches on decision nodes ("Yes" / "No" or specific conditions)

---

## Step 5: Interactivity

### Required Interactions

| Action | Behavior |
|--------|----------|
| **Hover node** | Scale 1.05x, border glow, show tooltip with full description |
| **Click node** | Highlight node + all direct connections, dim unrelated nodes. Show detail panel. |
| **Click background** | Reset all highlights |
| **Hover connection** | Highlight and show data label |
| **Scroll wheel** | Zoom in/out (0.5x to 3x range) |
| **Click + drag background** | Pan the diagram |
| **Double-click node** | If subflow exists, drill into it |

### Zoom & Pan (required for 8+ node diagrams)

```javascript
let scale = 1, panX = 0, panY = 0;
const container = document.querySelector('.diagram');

container.addEventListener('wheel', (e) => {
  e.preventDefault();
  const delta = e.deltaY > 0 ? 0.9 : 1.1;
  scale = Math.min(3, Math.max(0.5, scale * delta));
  updateTransform();
});

let dragging = false, startX, startY;
container.addEventListener('mousedown', (e) => {
  if (e.target === container || e.target.classList.contains('grid')) {
    dragging = true; startX = e.clientX - panX; startY = e.clientY - panY;
  }
});
document.addEventListener('mousemove', (e) => {
  if (!dragging) return;
  panX = e.clientX - startX; panY = e.clientY - startY;
  updateTransform();
});
document.addEventListener('mouseup', () => dragging = false);

function updateTransform() {
  document.querySelector('.diagram-inner').style.transform =
    `translate(${panX}px, ${panY}px) scale(${scale})`;
}
```

### Detail Panel (slides in from right on node click)

```html
<div class="detail-panel">
  <h3 class="detail-title"><!-- Node label --></h3>
  <p class="detail-description"><!-- Full description --></p>
  <div class="detail-meta">
    <span class="detail-type"><!-- Node type badge --></span>
    <span class="detail-tool"><!-- Tool/service name --></span>
  </div>
  <div class="detail-connections">
    <h4>Inputs</h4><!-- List of incoming connections with data labels -->
    <h4>Outputs</h4><!-- List of outgoing connections with data labels -->
  </div>
</div>
```

---

## Step 6: Animated Data Flow

For workflows where data movement is the story, add particle animation along connections:

```javascript
function animateParticle(pathEl, color, duration = 2000) {
  const length = pathEl.getTotalLength();
  const particle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
  particle.setAttribute('r', '4');
  particle.setAttribute('fill', color);
  particle.style.filter = `drop-shadow(0 0 6px ${color})`;

  const svg = pathEl.closest('svg');
  svg.appendChild(particle);

  let start;
  function step(ts) {
    if (!start) start = ts;
    const progress = ((ts - start) % duration) / duration;
    const point = pathEl.getPointAtLength(progress * length);
    particle.setAttribute('cx', point.x);
    particle.setAttribute('cy', point.y);
    requestAnimationFrame(step);
  }
  requestAnimationFrame(step);
}
```

Use particles to show:
- Data flowing through the pipeline
- Requests moving from client to server
- Events propagating through a pub/sub system
- Continuous monitoring loops

---

## Step 7: Grouping & Subflows

For complex architectures, group related nodes into labeled containers:

```css
.group {
  border: 1px dashed var(--connection);
  border-radius: 16px;
  padding: 24px;
  position: relative;
}

.group-label {
  position: absolute;
  top: -12px;
  left: 16px;
  background: var(--bg);
  padding: 2px 12px;
  font-size: 12px;
  text-transform: uppercase;
  letter-spacing: 2px;
  color: var(--text-muted);
}
```

Group examples:
- "Frontend" containing UI → State → API Client
- "Backend" containing API Gateway → Auth → Service → DB
- "External" containing Payment Provider → Email Service → SMS

---

## UI Elements

### Header

```html
<div class="header">
  <h1 class="title"><!-- Workflow name --></h1>
  <p class="subtitle"><!-- One-line description --></p>
  <div class="controls">
    <button onclick="resetView()">Reset View</button>
    <button onclick="toggleTheme()">Toggle Theme</button>
    <button onclick="toggleAnimation()">Toggle Flow</button>
  </div>
</div>
```

### Legend (always visible, bottom-left)

Color-coded node type reference. Collapsible on small screens.

### Mini-map (for 12+ node diagrams)

Small overview of the full diagram in the bottom-right corner showing the current viewport position.

### Background Grid

Subtle dot or line grid that moves with pan, providing spatial reference:

```css
.diagram { background-image: radial-gradient(var(--grid) 1px, transparent 1px); background-size: 20px 20px; }
```

---

## Content Rules

1. **Every node must be a specific action.** "Process data" is bad. "Extract invoice total from PDF" is good.
2. **Connections must show what data flows.** Not just that nodes connect, but WHAT passes through.
3. **Decision points need labeled branches.** "Yes"/"No", or the specific conditions.
4. **No floating nodes.** Every node connects to at least one other node.
5. **Max 20 nodes per diagram.** If bigger, split into sub-diagrams or use grouping.
6. **Node labels: 2-4 words max.** Detail goes in the tooltip/detail panel.
7. **One direction of flow.** Left-to-right or top-to-bottom. Never mix.

---

## Variety Rules

Alternate between:

- Dark, light, and blueprint themes
- Mono and sans-serif font pairings
- Horizontal and vertical flow directions
- Particle animation and static diagrams
- Minimal (no groups) and grouped layouts
- Compact and spacious node spacing

---

## Example Prompts

- "Visualize how our PayShap deposit flow works — from bank payment to wallet credit"
- "Map out the KYC verification system — USSD vs web app paths"
- "Diagram our CI/CD pipeline from commit to production"
- "Show how the double-entry ledger processes a VAS purchase"
- "Create an architecture diagram of our SFTP H2H integration with Standard Bank"

---

## Quick Reference Checklist

Before delivering the diagram, verify:

- [ ] Every node is a specific action (not vague labels)
- [ ] Connections show data flow labels
- [ ] Decision branches are labeled
- [ ] No floating/disconnected nodes
- [ ] Distinctive Google Fonts loaded
- [ ] Color palette defined with CSS variables
- [ ] Node types have correct colors and shapes
- [ ] Hover shows tooltip, click shows detail panel
- [ ] Zoom and pan working (8+ node diagrams)
- [ ] Animated data flow particles (where appropriate)
- [ ] Legend is visible and accurate
- [ ] Background grid provides spatial reference
- [ ] Self-contained HTML (works offline except fonts/D3)
- [ ] Flow direction is consistent (one direction only)

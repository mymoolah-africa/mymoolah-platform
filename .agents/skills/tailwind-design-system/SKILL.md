---
name: tailwind-design-system
description: Build scalable design systems with Tailwind CSS v4, design tokens, component libraries, and responsive patterns for MyMoolah's wallet and portal interfaces. Use when creating component libraries, implementing design systems, or standardizing UI patterns.
---

# MyMoolah Tailwind Design System (v4)

Production design system for MyMoolah's digital wallet platform using Tailwind CSS v4
with CSS-first configuration. Covers design tokens, component variants, dark mode,
responsive patterns, and MyMoolah brand implementation.

> **Architecture Notes**:
> - The wallet frontend (`mymoolah-wallet-frontend/`) uses React + Vite + Tailwind.
> - UI primitives are in `components/ui/` (Button, Card, Dialog, etc.) using CVA.
> - Figma-managed pages in `pages/*.tsx` are **read-only** — adapt styling via
>   the design token layer, not by editing page files directly.
> - The admin portal (`portal/`) shares the same design system.
>
> **Note**: This skill targets Tailwind CSS v4. For v3 projects, refer to the
> [upgrade guide](https://tailwindcss.com/docs/upgrade-guide).

## When This Skill Activates

- Creating or modifying UI components in `components/ui/`
- Implementing MyMoolah brand colors and typography
- Building responsive wallet/portal layouts
- Setting up dark mode theming
- Standardizing component patterns across wallet and portal

---

## 1. MyMoolah Theme Configuration

```css
/* app.css — MyMoolah Tailwind v4 theme */
@import "tailwindcss";

@theme {
  /* === MyMoolah Brand Colors (OKLCH for superior perception) === */

  /* Primary — Trust Blue */
  --color-primary: oklch(45% 0.12 220);
  --color-primary-hover: oklch(40% 0.12 220);
  --color-primary-foreground: oklch(98% 0 0);

  /* Secondary — Soft Blue-Gray */
  --color-secondary: oklch(92% 0.02 220);
  --color-secondary-hover: oklch(88% 0.02 220);
  --color-secondary-foreground: oklch(20% 0.02 220);

  /* Accent — Teal */
  --color-accent: oklch(60% 0.15 180);
  --color-accent-foreground: oklch(98% 0 0);

  /* Semantic — Financial Status */
  --color-success: oklch(65% 0.2 145);           /* Credits, deposits */
  --color-success-foreground: oklch(98% 0 0);
  --color-warning: oklch(75% 0.15 80);            /* Pending */
  --color-warning-foreground: oklch(20% 0.03 80);
  --color-error: oklch(55% 0.2 25);               /* Failed, debit */
  --color-error-foreground: oklch(98% 0 0);

  /* Surface — Backgrounds */
  --color-background: oklch(99% 0.005 264);
  --color-foreground: oklch(15% 0.02 264);
  --color-surface: oklch(100% 0 0);
  --color-muted: oklch(96% 0.005 264);
  --color-muted-foreground: oklch(45% 0.02 264);

  /* Borders & Rings */
  --color-border: oklch(92% 0.005 264);
  --color-ring: oklch(45% 0.12 220);
  --color-ring-offset: oklch(99% 0.005 264);

  /* Card */
  --color-card: oklch(100% 0 0);
  --color-card-foreground: oklch(15% 0.02 264);

  /* === Typography === */
  --font-heading: 'Plus Jakarta Sans', 'DM Sans', system-ui, sans-serif;
  --font-body: 'Inter', 'Nunito Sans', system-ui, sans-serif;
  --font-mono: 'JetBrains Mono', 'Fira Code', ui-monospace, monospace;

  /* === Border Radius === */
  --radius-sm: 0.375rem;     /* 6px — inputs, small elements */
  --radius-md: 0.5rem;       /* 8px — cards, buttons */
  --radius-lg: 0.75rem;      /* 12px — modals, sheets */
  --radius-xl: 1rem;         /* 16px — large cards */
  --radius-2xl: 1.5rem;      /* 24px — balance card, hero sections */
  --radius-full: 9999px;     /* Pills, avatars */

  /* === Shadows — Subtle, premium feel === */
  --shadow-sm: 0 1px 2px oklch(0% 0 0 / 0.04);
  --shadow-md: 0 4px 12px oklch(0% 0 0 / 0.06);
  --shadow-lg: 0 8px 24px oklch(0% 0 0 / 0.08);
  --shadow-card: 0 2px 8px oklch(0% 0 0 / 0.04), 0 0 1px oklch(0% 0 0 / 0.08);

  /* === Animations === */
  --animate-fade-in: fade-in 0.2s ease-out;
  --animate-slide-up: slide-up 0.3s ease-out;
  --animate-slide-down: slide-down 0.3s ease-out;
  --animate-scale-in: scale-in 0.2s ease-out;

  @keyframes fade-in {
    from { opacity: 0; }
    to { opacity: 1; }
  }
  @keyframes slide-up {
    from { transform: translateY(0.5rem); opacity: 0; }
    to { transform: translateY(0); opacity: 1; }
  }
  @keyframes slide-down {
    from { transform: translateY(-0.5rem); opacity: 0; }
    to { transform: translateY(0); opacity: 1; }
  }
  @keyframes scale-in {
    from { transform: scale(0.95); opacity: 0; }
    to { transform: scale(1); opacity: 1; }
  }
}

/* Dark mode variant */
@custom-variant dark (&:where(.dark, .dark *));

/* Dark mode overrides */
.dark {
  --color-background: oklch(12% 0.015 264);
  --color-foreground: oklch(96% 0.005 264);
  --color-surface: oklch(16% 0.015 264);

  --color-primary: oklch(65% 0.12 220);
  --color-primary-foreground: oklch(12% 0 0);

  --color-secondary: oklch(22% 0.02 220);
  --color-secondary-foreground: oklch(90% 0.02 220);

  --color-muted: oklch(20% 0.01 264);
  --color-muted-foreground: oklch(65% 0.02 264);

  --color-border: oklch(25% 0.01 264);
  --color-ring: oklch(65% 0.12 220);
  --color-ring-offset: oklch(12% 0.015 264);

  --color-card: oklch(16% 0.015 264);
  --color-card-foreground: oklch(96% 0.005 264);

  --shadow-sm: 0 1px 2px oklch(0% 0 0 / 0.2);
  --shadow-md: 0 4px 12px oklch(0% 0 0 / 0.3);
  --shadow-lg: 0 8px 24px oklch(0% 0 0 / 0.4);
  --shadow-card: 0 2px 8px oklch(0% 0 0 / 0.2), 0 0 1px oklch(0% 0 0 / 0.3);
}

/* Base styles */
@layer base {
  * { @apply border-border; }
  body { @apply bg-background text-foreground antialiased font-body; }
  h1, h2, h3, h4, h5, h6 { font-family: var(--font-heading); }
  .tabular-nums { font-variant-numeric: tabular-nums; }
}
```

---

## 2. Core Component Tokens

### Button Variants (CVA)
```typescript
import { cva, type VariantProps } from 'class-variance-authority';

const buttonVariants = cva(
  'inline-flex items-center justify-center font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50',
  {
    variants: {
      variant: {
        primary: 'bg-primary text-primary-foreground hover:bg-primary-hover shadow-sm',
        secondary: 'bg-secondary text-secondary-foreground hover:bg-secondary-hover',
        outline: 'border border-border bg-transparent hover:bg-muted',
        ghost: 'hover:bg-muted',
        destructive: 'bg-error text-error-foreground hover:bg-error/90',
        success: 'bg-success text-success-foreground hover:bg-success/90',
        link: 'text-primary underline-offset-4 hover:underline p-0 h-auto',
      },
      size: {
        sm: 'h-9 px-3 text-sm rounded-md',
        md: 'h-11 px-5 text-sm rounded-lg',        // Default: 44px tap target
        lg: 'h-12 px-8 text-base rounded-lg',
        icon: 'size-11 rounded-lg',
        full: 'h-12 w-full rounded-xl text-base',   // Full-width mobile CTA
      },
    },
    defaultVariants: { variant: 'primary', size: 'md' },
  }
);
```

### Card Variants
```typescript
const cardVariants = cva('rounded-xl border', {
  variants: {
    variant: {
      default: 'bg-card text-card-foreground shadow-card',
      elevated: 'bg-card text-card-foreground shadow-lg',
      balance: 'bg-gradient-to-br from-primary to-accent text-white shadow-lg rounded-2xl',
      muted: 'bg-muted text-foreground border-transparent',
    },
    padding: {
      sm: 'p-3',
      md: 'p-4',
      lg: 'p-6',
    },
  },
  defaultVariants: { variant: 'default', padding: 'md' },
});
```

---

## 3. Financial-Specific Utilities

### Amount Display
```css
/* Amount classes for consistent financial number display */
@utility amount-display {
  @apply font-mono tabular-nums tracking-tight;
}

@utility amount-lg {
  @apply font-mono tabular-nums text-2xl font-bold tracking-tight;
}

@utility amount-credit {
  @apply text-success font-semibold;
}

@utility amount-debit {
  @apply text-foreground font-semibold;
}
```

### Status Badge Classes
```css
@utility badge-success {
  @apply bg-success/10 text-success text-xs font-medium px-2 py-0.5 rounded-full;
}
@utility badge-warning {
  @apply bg-warning/10 text-warning-foreground text-xs font-medium px-2 py-0.5 rounded-full;
}
@utility badge-error {
  @apply bg-error/10 text-error text-xs font-medium px-2 py-0.5 rounded-full;
}
@utility badge-muted {
  @apply bg-muted text-muted-foreground text-xs font-medium px-2 py-0.5 rounded-full;
}
```

---

## 4. Layout Patterns

### Wallet Mobile Layout
```tsx
function WalletLayout({ children }) {
  return (
    <div className="min-h-screen bg-background">
      {/* Status bar area */}
      <header className="sticky top-0 z-40 bg-background/80 backdrop-blur-sm border-b border-border">
        <div className="flex items-center justify-between px-4 h-14">
          <Logo />
          <NotificationBell />
        </div>
      </header>

      {/* Main content */}
      <main className="pb-20">{children}</main>

      {/* Bottom navigation — thumb zone */}
      <nav className="fixed bottom-0 inset-x-0 bg-background border-t border-border z-40">
        <div className="flex items-center justify-around h-16 px-2">
          <NavItem icon={<HomeIcon />} label="Home" href="/" />
          <NavItem icon={<WalletIcon />} label="Wallet" href="/wallet" />
          <NavItem icon={<ShopIcon />} label="Shop" href="/products" />
          <NavItem icon={<UserIcon />} label="Profile" href="/profile" />
        </div>
      </nav>
    </div>
  );
}
```

### Portal Admin Layout (Desktop)
```tsx
function PortalLayout({ children }) {
  return (
    <div className="flex min-h-screen bg-background">
      {/* Sidebar */}
      <aside className="w-64 border-r border-border bg-surface hidden lg:block">
        <nav className="p-4 space-y-1">
          <SidebarLink icon={<DashboardIcon />} label="Dashboard" href="/portal" />
          <SidebarLink icon={<UsersIcon />} label="Users" href="/portal/users" />
          <SidebarLink icon={<LedgerIcon />} label="Ledger" href="/portal/ledger" />
          <SidebarLink icon={<ReconIcon />} label="Reconciliation" href="/portal/recon" />
          <SidebarLink icon={<SettingsIcon />} label="Settings" href="/portal/settings" />
        </nav>
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col">
        <header className="h-14 border-b border-border flex items-center px-6">
          <h1 className="text-lg font-heading font-semibold">Admin Portal</h1>
        </header>
        <main className="flex-1 p-6">{children}</main>
      </div>
    </div>
  );
}
```

---

## 5. Responsive Strategy

### Mobile-First Breakpoints
```
Base (0-639px)  → Phone (wallet app primary target)
sm (640px+)     → Large phone / small tablet
md (768px+)     → Tablet
lg (1024px+)    → Portal / admin
xl (1280px+)    → Wide portal screens
```

### Grid Patterns
```tsx
// Product grid: 2 cols on mobile, 3 on tablet, 4 on desktop
<div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
  {products.map(p => <ProductCard key={p.id} product={p} />)}
</div>

// Transaction detail: stack on mobile, side-by-side on tablet
<div className="flex flex-col md:flex-row gap-6">
  <div className="md:flex-1">Transaction Details</div>
  <div className="md:w-80">Related Info</div>
</div>
```

---

## 6. Utility Functions

```typescript
// lib/utils.ts
import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Format currency with ZAR symbol
export function formatCurrency(amount: number, currency = 'ZAR') {
  return new Intl.NumberFormat('en-ZA', { style: 'currency', currency }).format(amount);
}
```

---

## 7. Design System Checklist

- [ ] All colors use semantic tokens (not hardcoded hex)
- [ ] Dark mode tokens defined for every semantic color
- [ ] Typography uses `font-heading` for titles, `font-body` for content
- [ ] Amounts always use `font-mono tabular-nums`
- [ ] All interactive elements meet 44px minimum height
- [ ] Cards use consistent `shadow-card` + `rounded-xl`
- [ ] Status uses consistent color coding (success/warning/error)
- [ ] Mobile layout has bottom navigation in thumb zone
- [ ] Reduced motion media query respects user preferences
- [ ] CVA variants used for all component variations

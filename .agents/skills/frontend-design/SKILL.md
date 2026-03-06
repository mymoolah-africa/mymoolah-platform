---
name: frontend-design
description: Create distinctive, production-grade frontend interfaces for MyMoolah's digital wallet. Use this skill when building wallet components, product overlays, transaction views, or portal admin screens. Generates premium, mobile-first fintech UI.
---

# MyMoolah Frontend Design

Create premium, mobile-first fintech UI for MyMoolah's digital wallet platform.
Design should feel trustworthy, fast, and approachable for South African users
across all income levels. All components built with React + Tailwind CSS.

> **Architecture Constraint**: The wallet frontend uses an **overlay-based flow**
> pattern. Product purchases, send money, top-up, and cashout all happen inside
> step-based overlays (e.g., `AirtimeDataOverlay`, `ElectricityOverlay`), not
> separate pages. Pages in `pages/*.tsx` are Figma-managed and read-only.
>
> New UI should be built as **overlay components** in `components/overlays/` or
> **shared components** in `components/ui/`. Never create standalone page files.

## When This Skill Activates

- Building wallet dashboard, transaction history, or balance views
- Creating product purchase overlays (airtime, data, electricity, vouchers)
- Designing portal/admin interfaces
- Building merchant-facing screens
- Creating new overlay flows in `components/overlays/`

---

## 1. MyMoolah Design Language

### Brand Personality
- **Trustworthy**: Clean, structured layouts that signal financial safety
- **Fast**: Minimal decorations, instant visual feedback, skeleton loading
- **Approachable**: Friendly colors, clear iconography, jargon-free copy
- **Premium**: Subtle gradients, refined typography, micro-animations

### Color System (MyMoolah Brand)
```css
/* Primary — Deep trust blue / teal */
--color-primary: oklch(45% 0.12 220);          /* Main actions, CTAs */
--color-primary-hover: oklch(40% 0.12 220);
--color-primary-foreground: oklch(98% 0 0);

/* Accent — Vibrant green for success/money */
--color-success: oklch(65% 0.2 145);           /* Deposits, positive balance */
--color-warning: oklch(75% 0.15 80);           /* Pending states */
--color-error: oklch(55% 0.2 25);              /* Failed transactions, errors */

/* Neutral — Warm grays */
--color-background: oklch(99% 0.005 264);
--color-surface: oklch(100% 0 0);
--color-muted: oklch(95% 0.005 264);
--color-foreground: oklch(15% 0.02 264);
```

### Typography
```css
/* Use a modern, highly legible sans-serif */
--font-heading: 'Plus Jakarta Sans', 'DM Sans', system-ui;
--font-body: 'Inter', 'Nunito Sans', system-ui;
--font-mono: 'JetBrains Mono', 'Fira Code', monospace; /* Amounts, references */
```

### Design Principles for Financial UI
1. **Numbers are king**: Amounts should be the largest, boldest element on screen
2. **Status is color**: Green (credit), Red (debit), Yellow (pending), Gray (cancelled)
3. **Trust through consistency**: Same patterns for similar actions everywhere
4. **Error prevention**: Confirm destructive actions, show previews before submitting
5. **Progressive disclosure**: Show essentials first, details on demand

---

## 2. Key Screen Patterns

### Wallet Dashboard
```
┌─────────────────────────────┐
│  👋 Good morning, Andre     │  ← Personalized greeting
│                              │
│  ┌────────────────────────┐ │
│  │  R 2,450.00            │ │  ← Large, bold balance
│  │  Available Balance     │ │  ← Subtle label below
│  │  [Send] [Top Up] [Pay] │ │  ← Primary action buttons
│  └────────────────────────┘ │
│                              │
│  Quick Actions               │
│  ┌──────┬──────┬──────────┐ │
│  │Airtime│ Data │Electricity│ │  ← Icon + label, not just icons
│  └──────┴──────┴──────────┘ │
│                              │
│  Recent Transactions         │
│  ────────────────────────── │
│  📱 Airtime R30.00    -30.00 │  ← Category icon + amount
│  💰 Deposit          +500.00 │
│  ⚡ Electricity R120  -120.00 │
└─────────────────────────────┘
```

### Transaction Card Component
```tsx
function TransactionCard({ transaction }) {
  const isCredit = ['deposit', 'receive', 'reward'].includes(transaction.type);

  return (
    <div className="flex items-center gap-3 p-3 rounded-lg hover:bg-muted/50 transition-colors">
      {/* Category Icon */}
      <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
        <span className="text-lg">{getCategoryIcon(transaction.type)}</span>
      </div>

      {/* Details */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">{transaction.description}</p>
        <p className="text-xs text-muted-foreground">
          {formatRelativeTime(transaction.createdAt)}
        </p>
      </div>

      {/* Amount — monospace for alignment */}
      <span className={cn(
        'text-sm font-semibold font-mono tabular-nums',
        isCredit ? 'text-success' : 'text-foreground'
      )}>
        {isCredit ? '+' : '-'}{formatCurrency(transaction.amount)}
      </span>
    </div>
  );
}
```

---

## 3. Mobile-First Responsive Rules

### Breakpoints (MyMoolah)
```css
/* Mobile-first: design for 360px width first */
/* sm: 640px  — larger phones */
/* md: 768px  — tablets */
/* lg: 1024px — portal/admin */
/* xl: 1280px — large portal screens */
```

### Touch Target Rules
- Minimum 44x44px for all interactive elements
- 8px minimum gap between touch targets
- Full-width buttons on mobile (easier to tap)
- Bottom navigation for primary actions (thumb zone)

---

## 4. Loading & Empty States

### Financial Data Loading (ALWAYS use skeletons)
```tsx
function TransactionListSkeleton({ count = 5 }) {
  return (
    <div className="space-y-2">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="flex items-center gap-3 p-3 animate-pulse">
          <div className="w-10 h-10 rounded-full bg-muted" />
          <div className="flex-1 space-y-2">
            <div className="h-4 bg-muted rounded w-3/4" />
            <div className="h-3 bg-muted rounded w-1/2" />
          </div>
          <div className="h-4 bg-muted rounded w-16" />
        </div>
      ))}
    </div>
  );
}
```

### Empty States (with actionable CTA)
```tsx
function EmptyTransactions() {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
        <WalletIcon className="w-8 h-8 text-muted-foreground" />
      </div>
      <h3 className="text-lg font-semibold mb-1">No transactions yet</h3>
      <p className="text-sm text-muted-foreground mb-6 max-w-[280px]">
        Top up your wallet to start making purchases and sending money.
      </p>
      <Button>Top Up Wallet</Button>
    </div>
  );
}
```

---

## 5. Design Anti-Patterns (AVOID)

- ❌ Generic purple gradients on white — use MyMoolah brand colors
- ❌ System fonts (Arial, Times) — use brand typography
- ❌ Spinners for data loading — use skeleton screens
- ❌ Text-only buttons without proper sizing — minimum 44px height
- ❌ Amounts in body text size — amounts should be prominent
- ❌ Complex animations on mobile — keep it fast, use CSS transitions
- ❌ Generic "No data" messages — provide actionable empty states
- ❌ Cards without clear visual hierarchy — balance > description > metadata
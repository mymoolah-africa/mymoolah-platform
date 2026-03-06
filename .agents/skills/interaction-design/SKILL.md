---
name: interaction-design
description: Design and implement microinteractions, motion design, transitions, and user feedback patterns. Use when adding polish to UI interactions, implementing loading states, or creating delightful user experiences.
---

# MyMoolah Interaction Design

Microinteractions, transitions, and feedback patterns for MyMoolah's mobile wallet.
Focus on financial operation feedback (payments, deposits, transfers) and trust-building
motion that feels fast and reliable on budget Android devices.

## When This Skill Activates

- Adding loading/success/error feedback to payment flows
- Implementing transaction confirmation animations
- Building pull-to-refresh for transaction lists
- Creating smooth page transitions between wallet screens
- Designing skeleton loading for financial data
- Implementing swipe gestures for mobile navigation

---

## 1. Financial Interaction Principles

### Speed Rules for Fintech UI
| Duration | Use Case (MyMoolah) |
|----------|---------------------|
| 100-150ms | Button press feedback, toggle switches |
| 200-300ms | Bottom sheet slide, dropdown expand |
| 300-500ms | Page transition, modal open/close |
| 500-800ms | Transaction success celebration |
| 1-3s | Loading state before switching to skeleton |

### Trust Through Motion
- **Instant acknowledgment**: Button responds on touch, not on server response
- **Continuous feedback**: Show processing state between request and response
- **Definitive outcome**: Clear success ✅ or failure ❌ animation
- **No jank**: Only animate `transform` and `opacity` (GPU-accelerated)

---

## 2. Payment Flow Interactions

### Send Money Button with Loading States
```tsx
function SendButton({ onSend, isLoading, isSuccess, isError }) {
  return (
    <motion.button
      onClick={onSend}
      disabled={isLoading}
      whileTap={{ scale: 0.97 }}
      className="w-full h-12 rounded-xl bg-primary text-primary-foreground font-semibold relative overflow-hidden"
    >
      <AnimatePresence mode="wait">
        {isLoading ? (
          <motion.div
            key="loading"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex items-center justify-center gap-2"
          >
            <motion.div
              className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full"
              animate={{ rotate: 360 }}
              transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
            />
            <span>Sending...</span>
          </motion.div>
        ) : isSuccess ? (
          <motion.div
            key="success"
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="flex items-center justify-center gap-2 text-white"
          >
            <CheckIcon className="w-5 h-5" />
            <span>Sent!</span>
          </motion.div>
        ) : isError ? (
          <motion.div key="error" initial={{ x: 0 }} animate={{ x: [0, -8, 8, -4, 4, 0] }}>
            <span>Failed — Tap to Retry</span>
          </motion.div>
        ) : (
          <motion.span key="default">Send Money</motion.span>
        )}
      </AnimatePresence>
    </motion.button>
  );
}
```

### Transaction Success Animation
```tsx
function TransactionSuccess({ amount, recipient, onDone }) {
  return (
    <div className="flex flex-col items-center justify-center py-12">
      {/* Success checkmark with scale-in */}
      <motion.div
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 200, damping: 15, delay: 0.1 }}
        className="w-20 h-20 rounded-full bg-success/10 flex items-center justify-center mb-6"
      >
        <motion.div
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 0.4, delay: 0.3 }}
        >
          <CheckCircle className="w-10 h-10 text-success" />
        </motion.div>
      </motion.div>

      {/* Amount with count-up animation */}
      <motion.h2
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="text-2xl font-bold font-mono tabular-nums"
      >
        {formatCurrency(amount)}
      </motion.h2>

      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
        className="text-muted-foreground mt-1"
      >
        sent to {recipient}
      </motion.p>

      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.8 }}>
        <Button onClick={onDone} variant="outline" className="mt-8">Done</Button>
      </motion.div>
    </div>
  );
}
```

---

## 3. List & Navigation Interactions

### Pull-to-Refresh for Transactions
```tsx
function PullToRefreshList({ onRefresh, children }) {
  const [pullDistance, setPullDistance] = useState(0);
  const threshold = 80;

  return (
    <div
      onTouchMove={handleTouchMove}
      onTouchEnd={() => pullDistance > threshold ? onRefresh() : setPullDistance(0)}
    >
      <motion.div
        style={{ height: Math.min(pullDistance, threshold) }}
        className="flex items-center justify-center overflow-hidden"
      >
        <motion.div
          animate={{ rotate: pullDistance > threshold ? 360 : (pullDistance / threshold) * 360 }}
          className="w-6 h-6"
        >
          <RefreshIcon />
        </motion.div>
      </motion.div>
      {children}
    </div>
  );
}
```

### Staggered Transaction List Entry
```tsx
function TransactionList({ transactions }) {
  return (
    <motion.div className="space-y-1">
      {transactions.map((tx, i) => (
        <motion.div
          key={tx.id}
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: i * 0.05, duration: 0.2 }}
        >
          <TransactionCard transaction={tx} />
        </motion.div>
      ))}
    </motion.div>
  );
}
```

---

## 4. Skeleton Loading Patterns

### Always Use Skeletons for Financial Data
```tsx
function WalletDashboardSkeleton() {
  return (
    <div className="p-4 space-y-6 animate-pulse">
      {/* Balance skeleton */}
      <div className="bg-muted rounded-2xl p-6 space-y-3">
        <div className="h-3 bg-muted-foreground/10 rounded w-24" />
        <div className="h-8 bg-muted-foreground/10 rounded w-36" />
        <div className="flex gap-3 mt-4">
          <div className="h-10 bg-muted-foreground/10 rounded-lg flex-1" />
          <div className="h-10 bg-muted-foreground/10 rounded-lg flex-1" />
          <div className="h-10 bg-muted-foreground/10 rounded-lg flex-1" />
        </div>
      </div>

      {/* Quick actions skeleton */}
      <div className="grid grid-cols-4 gap-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="flex flex-col items-center gap-2">
            <div className="w-12 h-12 bg-muted rounded-xl" />
            <div className="h-3 bg-muted rounded w-14" />
          </div>
        ))}
      </div>

      {/* Transaction list skeleton */}
      <div className="space-y-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="flex items-center gap-3">
            <div className="w-10 h-10 bg-muted rounded-full" />
            <div className="flex-1 space-y-2">
              <div className="h-4 bg-muted rounded w-3/4" />
              <div className="h-3 bg-muted rounded w-1/2" />
            </div>
            <div className="h-4 bg-muted rounded w-16" />
          </div>
        ))}
      </div>
    </div>
  );
}
```

---

## 5. Performance Rules

### CSS-Only Animations When Possible
```css
/* Button press feedback — pure CSS, no JS overhead */
.btn-press {
  transition: transform 100ms ease-out;
}
.btn-press:active {
  transform: scale(0.97);
}

/* Card hover — CSS transition */
.card-interactive {
  transition: transform 200ms ease-out, box-shadow 200ms ease-out;
}
.card-interactive:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 24px rgba(0,0,0,0.08);
}
```

### Reduced Motion (MANDATORY)
```tsx
const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

// Use throughout animation config:
<motion.div
  animate={{ opacity: 1 }}
  transition={{ duration: prefersReducedMotion ? 0 : 0.3 }}
/>
```

### Do NOT Animate On Budget Devices
- No `box-shadow` animations (causes repaint)
- No `width`/`height` animations (causes reflow)
- Keep total page animation count under 10 simultaneous
- Use `will-change` only on actively animated elements

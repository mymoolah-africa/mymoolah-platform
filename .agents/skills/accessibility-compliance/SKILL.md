---
name: accessibility-compliance
description: Implement WCAG 2.2 compliant interfaces with mobile accessibility, inclusive design patterns, and assistive technology support for MyMoolah's South African user base. Use when auditing accessibility, implementing ARIA patterns, building for screen readers, or ensuring inclusive user experiences.
---

# MyMoolah Accessibility Compliance

WCAG 2.2 Level AA compliance for MyMoolah's mobile-first digital wallet interface.
Critical for serving South Africa's diverse user base including users with disabilities,
low literacy, low vision, and those using budget Android devices with TalkBack.

> **MyMoolah Context**: The primary target device is a sub-$100 Android phone on
> 3G/4G in South Africa. Many users have low digital literacy. The wallet must work
> with TalkBack (Android screen reader) for all critical flows: checking balance,
> sending money, purchasing airtime, and viewing transaction history.
>
> **Constraint**: Figma-managed pages (`pages/*.tsx`) are read-only. Accessibility
> improvements must be made in overlay components, shared UI components, and the
> design system — not in Figma page files.

## When This Skill Activates

- Building wallet UI components (mymoolah-wallet-frontend/components/)
- Creating payment/transaction overlay flows
- Implementing forms (KYC, send money, beneficiary management)
- Building modals (GlobalPinModal, TransactionDetailModal, OTP dialogs)
- Designing loading/error states for financial operations
- Mobile-first responsive components
- Portal admin interfaces (portal/)

---

## 1. MyMoolah-Specific Accessibility Requirements

### Financial Services A11Y Priorities
| Priority | Requirement | Reason |
|----------|-------------|--------|
| **Critical** | Transaction amounts readable by screen readers | Users must verify amounts before sending |
| **Critical** | OTP input accessible | Authentication required for financial ops |
| **Critical** | Error states clearly announced | Failed transactions need immediate feedback |
| **High** | Balance visible with sufficient contrast | Most-viewed screen element |
| **High** | Touch targets 44x44px minimum | Budget Android devices, older users |
| **High** | Forms have proper labels + errors | KYC, send money, top-up flows |
| **Medium** | Reduced motion support | Prevent vestibular issues |
| **Medium** | Dark mode with proper contrast | Battery savings on OLED, user preference |

### South African Context
- **Multilingual**: Support for 11 official languages (screen readers read in user's language)
- **Budget Devices**: Many users on sub-$100 Android phones — minimize DOM complexity
- **Low Bandwidth**: Skeleton screens over spinners (preserves layout)
- **Feature Phones**: Progressive enhancement where possible
- **Low Literacy**: Icons + text labels together, avoid text-only actions

---

## 2. Core Component Patterns

### Accessible Balance Display
```tsx
function WalletBalance({ balance, currency = 'ZAR' }) {
  const formattedBalance = new Intl.NumberFormat('en-ZA', {
    style: 'currency', currency
  }).format(balance);

  return (
    <div
      role="status"
      aria-label={`Wallet balance: ${formattedBalance}`}
      className="text-3xl font-bold text-foreground"
    >
      <span aria-hidden="true">{formattedBalance}</span>
    </div>
  );
}
```

### Accessible Transaction Confirmation Modal
```tsx
function ConfirmTransactionDialog({ isOpen, onConfirm, onCancel, recipient, amount }) {
  const titleId = useId();
  const descId = useId();

  return (
    <dialog
      open={isOpen}
      role="alertdialog"
      aria-modal="true"
      aria-labelledby={titleId}
      aria-describedby={descId}
    >
      <h2 id={titleId}>Confirm Transaction</h2>
      <p id={descId}>
        Send {formatCurrency(amount)} to {recipient.name}?
        This action cannot be undone.
      </p>

      <div className="flex gap-3 mt-4">
        <button onClick={onCancel} className="min-h-[44px] min-w-[44px]">
          Cancel
        </button>
        <button
          onClick={onConfirm}
          className="min-h-[44px] min-w-[44px] bg-primary text-primary-foreground"
          autoFocus
        >
          Confirm Send
        </button>
      </div>
    </dialog>
  );
}
```

### Accessible OTP Input
```tsx
function OtpInput({ length = 6, onComplete }) {
  const inputs = useRef([]);
  const [values, setValues] = useState(Array(length).fill(''));

  return (
    <fieldset>
      <legend className="text-sm font-medium mb-2">
        Enter the {length}-digit OTP sent to your phone
      </legend>
      <div className="flex gap-2" role="group" aria-label="OTP input">
        {values.map((val, i) => (
          <input
            key={i}
            ref={el => inputs.current[i] = el}
            type="text"
            inputMode="numeric"
            pattern="[0-9]"
            maxLength={1}
            value={val}
            aria-label={`Digit ${i + 1} of ${length}`}
            className="w-12 h-12 text-center text-xl border rounded-md min-h-[44px]"
            onChange={(e) => handleChange(i, e.target.value)}
            onKeyDown={(e) => handleKeyDown(i, e)}
          />
        ))}
      </div>
    </fieldset>
  );
}
```

### Accessible Transaction Status
```tsx
function TransactionStatus({ status, amount, recipient }) {
  const statusConfig = {
    pending:   { icon: '⏳', label: 'Pending', color: 'text-yellow-600' },
    completed: { icon: '✅', label: 'Completed', color: 'text-green-600' },
    failed:    { icon: '❌', label: 'Failed', color: 'text-red-600' }
  };

  const { icon, label, color } = statusConfig[status];

  return (
    <div
      role="status"
      aria-live="polite"
      aria-label={`Transaction to ${recipient}: ${formatCurrency(amount)} — ${label}`}
      className={`flex items-center gap-2 ${color}`}
    >
      <span aria-hidden="true">{icon}</span>
      <span>{label}</span>
    </div>
  );
}
```

---

## 3. Form Accessibility (Send Money, KYC)

### Standard Form Field Pattern
```tsx
function FormField({ id, label, required, error, hint, children }) {
  const errorId = `${id}-error`;
  const hintId = `${id}-hint`;

  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className="text-sm font-medium">
        {label}
        {required && (
          <>
            <span aria-hidden="true" className="text-red-500 ml-1">*</span>
            <span className="sr-only">(required)</span>
          </>
        )}
      </label>

      {React.cloneElement(children, {
        id,
        'aria-required': required,
        'aria-invalid': !!error,
        'aria-describedby': [error ? errorId : null, hint ? hintId : null].filter(Boolean).join(' ') || undefined
      })}

      {hint && !error && (
        <p id={hintId} className="text-xs text-muted-foreground">{hint}</p>
      )}
      {error && (
        <p id={errorId} role="alert" className="text-xs text-red-500">{error}</p>
      )}
    </div>
  );
}
```

---

## 4. Live Region Announcements

### Transaction Result Announcer
```tsx
function useTransactionAnnouncer() {
  const [announcement, setAnnouncement] = useState('');

  const announceSuccess = (amount, recipient) => {
    setAnnouncement(`Transaction successful. ${formatCurrency(amount)} sent to ${recipient}.`);
  };

  const announceError = (message) => {
    setAnnouncement(`Transaction failed: ${message}`);
  };

  const Announcer = () => (
    <div aria-live="assertive" aria-atomic="true" className="sr-only">
      {announcement}
    </div>
  );

  return { announceSuccess, announceError, Announcer };
}
```

---

## 5. Color Contrast Requirements (MyMoolah Brand)

### Minimum Contrast Ratios
| Element | Ratio | Level |
|---------|-------|-------|
| Balance text on background | 7:1 | AAA |
| Button text on primary | 4.5:1 | AA |
| Disabled text | 3:1 | AA (non-text) |
| Error text on background | 4.5:1 | AA |
| Placeholder text | 4.5:1 | AA |

### Reduced Motion Support
```css
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
    scroll-behavior: auto !important;
  }
}
```

---

## 6. Testing Checklist

### Automated Testing
- [ ] Run axe-core or Lighthouse accessibility audit
- [ ] All images have alt text (product images, brand logos)
- [ ] All form inputs have associated labels
- [ ] Color contrast ratios pass WCAG AA
- [ ] No auto-playing animations without user control

### Manual Testing
- [ ] Navigate entire send-money flow using keyboard only
- [ ] Complete KYC submission with VoiceOver/TalkBack
- [ ] Verify transaction amounts are read correctly by screen readers
- [ ] Test OTP input with screen reader
- [ ] Verify error announcements on failed transactions
- [ ] Test at 200% zoom on mobile browser
- [ ] Verify touch targets on budget Android phone

## References

- [WCAG 2.2 Quick Reference](https://www.w3.org/WAI/WCAG22/quickref/)
- [WAI-ARIA Authoring Practices](https://www.w3.org/WAI/ARIA/apg/)
- [Android TalkBack Guide](https://support.google.com/accessibility/android/)
- [South African UNCRPD Obligation](https://www.gov.za/documents/convention-rights-persons-disabilities)

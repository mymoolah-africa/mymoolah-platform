---
name: robust-financial-forms
description: Building accessible, type-safe, and robust financial data entry for the MyMoolah wallet. Use this skill when implementing KYC collections, money transfers, top-up flows, product purchases, or any overlay/form that accepts user input before calling a financial API.
---

# MyMoolah Robust Financial Forms

Frontend data entry in MyMoolah is a critical ingestion point. It must handle South
African-specific validation (13-digit IDs, ZAR currency), prevent double submissions
on unreliable mobile networks, and provide accessible error feedback.

> **Architecture Note**: MyMoolah's wallet frontend uses **overlay-based step flows**
> (e.g., `AirtimeDataOverlay`, `ElectricityOverlay`, `SendMoneyOverlay`), not
> traditional form pages. Many overlays are in **Figma-managed `pages/*.tsx` files**
> that are read-only. This skill scopes accordingly:
> - **Existing overlays**: Apply idempotency key injection and submit-disable patterns
>   via `apiService.ts` — do NOT rewrite working overlays.
> - **New forms/overlays**: Use `react-hook-form` + Zod from scratch.
> - **Portal admin forms**: Use `react-hook-form` + Zod (no Figma constraint).

## When This Skill Activates

- Building NEW React components in `mymoolah-wallet-frontend/` involving user input.
- Adding input validation to existing overlays in `components/overlays/`.
- Creating Zod schemas for frontend data validation.
- Implementing currency input fields.
- Building KYC upload or data collection forms.
- Creating "Send Money", "Top Up", or "Purchase" flows.
- Retrofitting idempotency key headers into `apiService.ts`.

---

## 1. Overlay Architecture Awareness

### Existing Overlay Structure
MyMoolah's transaction flows are step-based overlays:
```
components/overlays/
├── AirtimeDataOverlay.tsx          # Airtime/data purchase
├── ElectricityOverlay.tsx          # Electricity token purchase
├── BillPaymentOverlay.tsx          # Bill payments
├── BuyUsdcOverlay.tsx              # USDC purchase
├── topup-easypay/TopupEasyPayOverlay.tsx
├── cashout-easypay/CashoutEasyPayOverlay.tsx
├── flash-eezicash/FlashEeziCashOverlay.tsx
├── atm-cashsend/ATMCashSendOverlay.tsx
├── mmcash-retail/MMCashRetailOverlay.tsx
├── digital-vouchers/DigitalVouchersOverlay.tsx
└── shared/
    ├── GlobalPinModal.tsx
    └── BeneficiaryModal.tsx
```

### Rules for Existing Overlays
1. **Do NOT rewrite** working overlay state management to `react-hook-form`.
2. **DO inject** idempotency keys via `apiService.ts` (see Section 5).
3. **DO verify** submit buttons are disabled during API calls.
4. **DO add** Zod validation for any NEW input fields added to existing overlays.

---

## 2. Standard Zod Fintech Schemas

### South African ID & Currency Validation
```typescript
import { z } from 'zod';

const saIdRegex = /^[0-9]{13}$/;

const currencySchema = z.string()
  .transform(val => val.replace(/[R\s,]/g, ''))
  .refine(val => !isNaN(Number(val)) && Number(val) > 0, {
    message: "Amount must be a positive number",
  })
  .refine(val => Number(val) <= 50000, {
    message: "Maximum daily transfer limit is R50,000",
  })
  .transform(val => Number(val));

// South African mobile number (for airtime/data)
const saMobileSchema = z.string()
  .regex(/^0[6-8][0-9]{8}$/, "Enter a valid 10-digit SA mobile number");

export const transferSchema = z.object({
  recipientId: z.string().uuid("Please select a valid recipient"),
  amount: currencySchema,
  reference: z.string()
    .min(1, "Reference is required")
    .max(20, "Reference too long")
    .regex(/^[a-zA-Z0-9 ]+$/, "Only letters and numbers allowed"),
});

export const kycSchema = z.object({
  firstName: z.string().min(2, "First name is required"),
  lastName: z.string().min(2, "Last name is required"),
  idNumber: z.string()
    .regex(saIdRegex, "Must be a valid 13-digit South African ID"),
});

export type TransferFormData = z.infer<typeof transferSchema>;
```

---

## 3. New Forms: React Hook Form Pattern

Use this pattern for **new** overlays, portal forms, or any form built from scratch.

### Example: New Portal Admin Form
```tsx
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { transferSchema, type TransferFormData } from './schemas';
import { v4 as uuidv4 } from 'uuid';
import { useState } from 'react';

export function SendMoneyForm({ onSubmitSuccess }) {
  const [idempotencyKey, setIdempotencyKey] = useState(() => uuidv4());

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting, isValid }
  } = useForm<TransferFormData>({
    resolver: zodResolver(transferSchema),
    mode: 'onTouched',
    defaultValues: { amount: '', reference: '' }
  });

  const onSubmit = async (data: TransferFormData) => {
    try {
      await api.post('/wallets/send', data, {
        headers: { 'X-Idempotency-Key': idempotencyKey }
      });
      setIdempotencyKey(uuidv4());
      onSubmitSuccess();
    } catch (error) {
      // Keep same idempotency key on failure so retries are safe
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <div className="space-y-2">
        <label htmlFor="amount" className="text-sm font-medium">Amount (ZAR)</label>
        <div className="relative">
          <span className="absolute left-3 top-2.5 text-muted-foreground">R</span>
          <input
            id="amount"
            type="text"
            inputMode="decimal"
            placeholder="0.00"
            className="w-full pl-8 pr-4 py-2 border rounded-md font-mono text-lg min-h-[44px]"
            {...register('amount')}
            aria-invalid={!!errors.amount}
          />
        </div>
        {errors.amount && (
          <p role="alert" className="text-sm text-error">{errors.amount.message}</p>
        )}
      </div>

      <button
        type="submit"
        disabled={isSubmitting || !isValid}
        className="w-full py-3 rounded-lg bg-primary text-primary-foreground font-semibold min-h-[44px] disabled:opacity-50"
      >
        {isSubmitting ? (
          <span className="animate-pulse">Processing...</span>
        ) : (
          "Send Money"
        )}
      </button>
    </form>
  );
}
```

---

## 4. Radix UI / Custom Component Integration

When using Radix UI components (Selects, Date Pickers) that don't expose a native
`ref`, use React Hook Form's `Controller`.

```tsx
import { Controller } from 'react-hook-form';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';

<Controller
  control={control}
  name="recipientId"
  render={({ field }) => (
    <Select onValueChange={field.onChange} defaultValue={field.value}>
      <SelectTrigger aria-invalid={!!errors.recipientId}>
        <SelectValue placeholder="Choose a recipient" />
      </SelectTrigger>
      <SelectContent>
        {beneficiaries.map((b) => (
          <SelectItem key={b.id} value={b.id}>
            {b.name} - {b.accountNumber}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )}
/>
```

---

## 5. Idempotency Key Retrofit (Existing Overlays)

**This is the highest-impact change for existing code.** Instead of rewriting overlays,
inject idempotency keys at the `apiService.ts` level so every financial API call is
protected automatically.

### apiService.ts Pattern
```typescript
import { v4 as uuidv4 } from 'uuid';

class IdempotencyKeyManager {
  private keys: Map<string, string> = new Map();

  getKey(operationId: string): string {
    if (!this.keys.has(operationId)) {
      this.keys.set(operationId, uuidv4());
    }
    return this.keys.get(operationId)!;
  }

  resetKey(operationId: string): void {
    this.keys.delete(operationId);
  }
}

const idempotencyManager = new IdempotencyKeyManager();

async function purchaseAirtime(params: AirtimeParams) {
  const opId = `airtime-${params.phoneNumber}-${params.amount}-${Date.now()}`;
  try {
    const response = await api.post('/airtime/purchase', params, {
      headers: { 'X-Idempotency-Key': idempotencyManager.getKey(opId) }
    });
    idempotencyManager.resetKey(opId);
    return response;
  } catch (error) {
    // Keep key intact — next retry sends the same key
    throw error;
  }
}
```

### Key Rules
- Generate the key **at submission time**, not on component mount.
- On **success**: reset the key so the next transaction gets a new one.
- On **failure**: keep the same key so a retry is safely deduplicated.
- On **network timeout**: keep the same key (the request may have succeeded server-side).

---

## 6. Submit Button Safety (Existing Overlays)

Audit all overlays to verify the confirm/submit button is disabled while the API
call is in flight. This is the simplest protection against double-taps on bad
South African mobile networks.

### Pattern for Existing Overlays
```tsx
const [isSubmitting, setIsSubmitting] = useState(false);

const handleConfirm = async () => {
  if (isSubmitting) return;
  setIsSubmitting(true);
  try {
    await apiService.purchaseAirtime(params);
    // Show success
  } catch (error) {
    // Show error
  } finally {
    setIsSubmitting(false);
  }
};

<button
  onClick={handleConfirm}
  disabled={isSubmitting}
  className="... min-h-[44px] disabled:opacity-50"
>
  {isSubmitting ? 'Processing...' : 'Confirm Purchase'}
</button>
```

---

## 7. Currency Input Best Practices

### Mobile Keyboard
Always use `inputMode="decimal"` for currency fields — this shows the numeric
keyboard with decimal point on mobile, avoiding the full keyboard.

```tsx
<input
  type="text"
  inputMode="decimal"
  pattern="[0-9]*\.?[0-9]*"
  placeholder="0.00"
  className="font-mono tabular-nums"
/>
```

### Display Rules
- Amounts: `font-mono tabular-nums` for aligned decimal columns
- Prefix the `R` symbol visually but exclude it from the input value
- Format displayed amounts with `Intl.NumberFormat('en-ZA', { style: 'currency', currency: 'ZAR' })`

---

## 8. Checklist

### For NEW Forms (react-hook-form + Zod)
- [ ] Uses `react-hook-form` with `zodResolver`
- [ ] Schema validation managed exclusively by Zod
- [ ] Financial inputs use `inputMode="decimal"` for mobile keyboards
- [ ] Submit button is `disabled={isSubmitting}` to prevent double-clicks
- [ ] `X-Idempotency-Key` generated client-side for all API mutations
- [ ] All inputs have accessible `label` elements and `aria-invalid` bindings
- [ ] Touch targets meet 44px minimum height

### For EXISTING Overlays (retrofit)
- [ ] `apiService.ts` methods send `X-Idempotency-Key` headers
- [ ] Confirm/submit button disabled during API call
- [ ] Key is preserved on failure, reset on success
- [ ] Any new inputs added to overlays have Zod validation
- [ ] Figma-managed `pages/*.tsx` files NOT modified

---
name: robust-financial-forms
description: Building accessible, type-safe, and robust financial forms using React Hook Form and Zod. Use this skill when implementing KYC collections, money transfers, banking detail inputs, or any complex data entry on the frontend.
---

# MyMoolah Robust Financial Forms

Frontend forms in a fintech application are critical data ingestion points. They must 
handle complex validation (South African ID numbers, ZAR currency), prevent double 
submissions, provide accessible error states, and manage complex Radix UI inputs, all 
while using strictly-typed schemas.

## When This Skill Activates

- Building React components in `mymoolah-wallet-frontend/` involving user input.
- Creating Zod (`z`) schemas for frontend data validation.
- Implementing currency input fields.
- Building KYC (Know Your Customer) upload or data collection forms.
- Creating "Send Money" or "Add Beneficiary" flows.

---

## 1. Core Stack Requirements

Every financial form in MyMoolah **MUST** utilize:
1. `react-hook-form` (`useForm`) for state management and submission.
2. `@hookform/resolvers/zod` tying a `zod` schema to the form.
3. Radix UI primitives (via your Tailwind design system components) for accessibility.

---

## 2. Standard Zod Fintech Schemas

### South African ID & Currency Validation
```typescript
import { z } from 'zod';

// South African ID Validation (13 digits, basic regex)
const saIdRegex = /^[0-9]{13}$/;

// Common Fintech Field Schemas
const currencySchema = z.string()
  // Strip spaces, commas, or 'R' prefix if accidentally typed
  .transform(val => val.replace(/[R\s,]/g, ''))
  .refine(val => !isNaN(Number(val)) && Number(val) > 0, {
    message: "Amount must be a positive number",
  })
  .refine(val => Number(val) <= 50000, {
    message: "Maximum daily transfer limit is R50,000",
  })
  .transform(val => Number(val)); // Transform to number for submission

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
    .regex(saIdRegex, "Must be a valid 13-digit South African ID")
    .refine((id) => {
       // Optional: Deeper validation (Luhn algorithm or birthdate extraction)
       return true; 
    }, "Invalid ID Number checksum"),
});

export type TransferFormData = z.infer<typeof transferSchema>;
```

---

## 3. The React Hook Form Pattern

### Robust "Send Money" Example
```tsx
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { transferSchema, type TransferFormData } from './schemas';
import { v4 as uuidv4 } from 'uuid';

export function SendMoneyForm({ onSubmitSuccess }) {
  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors, isSubmitting, isValid }
  } = useForm<TransferFormData>({
    resolver: zodResolver(transferSchema),
    mode: 'onTouched', // Validate as user interacts
    defaultValues: { amount: '', reference: '' }
  });

  const onSubmit = async (data: TransferFormData) => {
    try {
      // 1. Generate Idempotency Key client-side
      const idempotencyKey = uuidv4();
      
      // 2. Submit to API wrapper
      await api.post('/wallets/send', data, {
        headers: { 'X-Idempotency-Key': idempotencyKey }
      });
      
      onSubmitSuccess();
    } catch (error) {
      // Handle API errors (e.g., INSUFFICIENT_BALANCE)
      // Usually displayed as a systemic error or toast
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      {/* Amount Field */}
      <div className="space-y-2">
        <label htmlFor="amount" className="text-sm font-medium">Amount (ZAR)</label>
        <div className="relative">
          <span className="absolute left-3 top-2.5 text-muted-foreground">R</span>
          <input
            id="amount"
            type="text"
            inputMode="decimal"
            placeholder="0.00"
            className="w-full pl-8 pr-4 py-2 border rounded-md font-mono text-lg"
            {...register('amount')}
            aria-invalid={!!errors.amount}
          />
        </div>
        {errors.amount && (
          <p role="alert" className="text-sm text-error">{errors.amount.message}</p>
        )}
      </div>

      {/* Reference Field */}
      <div className="space-y-2">
        <label htmlFor="reference" className="text-sm font-medium">Reference</label>
        <input
          id="reference"
          type="text"
          maxLength={20}
          className="w-full px-4 py-2 border rounded-md"
          {...register('reference')}
          aria-invalid={!!errors.reference}
        />
        <p className="text-xs text-muted-foreground">Appears on recipient's statement</p>
        {errors.reference && (
          <p role="alert" className="text-sm text-error">{errors.reference.message}</p>
        )}
      </div>

      {/* Submit Button */}
      <button
        type="submit"
        disabled={isSubmitting || !isValid}
        className="w-full py-3 rounded-lg bg-primary text-primary-foreground font-semibold flex justify-center items-center disabled:opacity-50"
      >
        {isSubmitting ? (
          <span className="animate-pulse">Processing...</span>
        ) : (
          "Send Money safely"
        )}
      </button>
    </form>
  );
}
```

---

## 4. Third-Party / Radix Component Integration

When using Radix UI (like Custom Selects or Date Pickers) that don't expose a native `ref`, use React Hook Form's `Controller`.

```tsx
import { Controller } from 'react-hook-form';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';

// Inside a form...
<div className="space-y-2">
  <label className="text-sm font-medium">Select Beneficiary</label>
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
  {errors.recipientId && (
    <p role="alert" className="text-sm text-error">{errors.recipientId.message}</p>
  )}
</div>
```

---

## 5. Idempotency Key Generation

**CRITICAL RULE:** For any form resulting in a financial transaction (Send, Top-up, Purchase), the frontend MUST generate a UUIDv4 and attach it as the `X-Idempotency-Key` header. Do NOT rely on the backend to generate this. The key must be generated at the moment of *submission attempt*, so if network fails, a retry click sends the *same* key.

```typescript
// Better approach: Generate key on mount, regenerate on success
const [idempotencyKey, setIdempotencyKey] = useState(() => uuidv4());

const onSubmit = async () => {
    try {
        await api.post('/pay', data, { headers: { 'X-Idempotency-Key': idempotencyKey } });
        setIdempotencyKey(uuidv4()); // Reset for NEXT transaction only on success
    } catch {
        // Keep the same key! If the user clicks submit again, we retry the exact same transaction ID.
    }
}
```

---

## 6. Frontend Forms Checklist
- [ ] Uses `react-hook-form` and NOT state variables (`useState`) for input values.
- [ ] Schema validation managed exclusively by `zod`.
- [ ] Financial inputs (currency) use `inputMode="decimal"` for mobile keyboards.
- [ ] Submission button is `disabled={isSubmitting}` to prevent accidental double-clicks.
- [ ] An `X-Idempotency-Key` is generated frontend-side for all API mutations.
- [ ] All inputs have accessible `labels` and `aria-invalid` bindings tied to the error state.

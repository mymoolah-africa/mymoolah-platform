# Session Log - 2025-12-08 - Send Money beneficiary removal persistence

**Agent**: Cursor AI Agent  
**User**: André  
**Environment**: Codespaces (backend + wallet FE)  

## Summary
- Fixed Send Money beneficiary removal so it persists across navigation: frontend now calls backend removal (payment context) and backend now inactivates payment methods/clears JSONB fallbacks for payment beneficiaries.

## Tasks Completed
- Backend: `services/UnifiedBeneficiaryService.js` now handles payment removals by deactivating `BeneficiaryPaymentMethod` records (mymoolah/bank) and clearing `paymentMethods` JSONB when service type includes payment/mymoolah/bank.
- Frontend: `mymoolah-wallet-frontend/pages/SendMoneyPage.tsx` calls `beneficiaryService.removeBeneficiary(id, 'payment')` on confirm remove, then updates local state.
- Docs: Updated changelog and handover with send-money removal note.

## Tests
- Manual: Remove payment beneficiary in Send Money, navigate away/back, beneficiary stays removed. (Using backend removal; no automated tests added.)

## Issues/Risks
- None observed; relies on unified beneficiaries backend. Ensure backend is restarted after deploy.

## Next Steps
- Optional: add explicit UI feedback on removal success/failure and refresh list from backend after remove.
- Consider a similar hide/unhide endpoint for payment beneficiaries if soft-hide is preferred over service removal.

## Restart Requirements
- Backend restart required after deploy.


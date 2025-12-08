# Session Log - 2025-12-08 - Request Money payer hide fix

**Agent**: Cursor AI Agent  
**User**: André  
**Environment**: Codespaces (wallet FE 3000)  

## Summary
- Fixed Request Money “Recent payers” list so removed payers stay hidden across navigation/reload by persisting hidden payer IDs in localStorage per user.

## Tasks Completed
- `mymoolah-wallet-frontend/pages/RequestMoneyPage.tsx`: Added hidden payer persistence (localStorage keyed per user), filter applied on fetch and render, hide persists after removal.

## Tests
- Manual UI in Codespaces: Remove a payer → leave page → return → payer stays hidden.

## Issues/Risks
- This is a frontend-only hide; backend still returns the payer. Future work could add a server-side ignore list to reduce payload size.

## Next Steps
- Optionally add backend ignore/soft-delete for recent payers.
- Add a UI control to restore hidden payers or clear hidden list if needed.

## Restart Requirements
- None (frontend change only).


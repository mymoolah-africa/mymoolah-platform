# Figma AI Agent – API Wiring Instructions

## Overview
This file is the single source of truth for wiring all frontend pages to backend endpoints in the MyMoolah project. It is designed for the Figma AI agent and frontend developers. **Do not change backend code or code outside the frontend directory.**

---

## Page-to-Endpoint Mapping

| Page                | Backend Endpoints                                                                 | Status         |
|---------------------|----------------------------------------------------------------------------------|---------------|
| DashboardPage       | `/api/v1/users/me`, `/api/v1/wallets/balance`, `/api/v1/wallets/transactions`, `/api/v1/vouchers/active` | All in place   |
| SendMoneyPage       | `/api/v1/send-money/resolve-recipient`, `/api/v1/send-money/quote`, `/api/v1/send-money/transfer`, `/api/v1/send-money/status/:transactionId` | All in place   |
| TransactPage        | Service-specific endpoints as each service is enabled                              | Most in place  |
| VouchersPage        | `/api/v1/vouchers/active`, `/api/v1/vouchers/redeem`, `/api/v1/vouchers/issue`    | All in place   |
| ProfilePage         | `/api/v1/users/me`, `/api/v1/users/update`, `/api/v1/users/change-password`        | `/me` in place, update endpoints may need review |
| KYCStatusPage       | `/api/v1/kyc/status`                                                              | In place       |
| KYCDocumentsPage    | `/api/v1/kyc/upload-document`, `/api/v1/kyc/submit`, `/api/v1/kyc/requirements`   | All in place   |
| LoginPage           | `/api/v1/auth/login`                                                              | In place, fully tested |
| RegisterPage        | `/api/v1/auth/register`                                                           | In place, fully tested |

---

## Example API Usage

### DashboardPage
- **User Info:**
  - `GET /api/v1/users/me` (with JWT)
- **Wallet Balance:**
  - `GET /api/v1/wallets/balance` (with JWT)
- **Recent Transactions:**
  - `GET /api/v1/wallets/transactions` (with JWT)
- **Open Vouchers:**
  - `GET /api/v1/vouchers/active` (with JWT)

### SendMoneyPage
- **Recipient Resolution:**
  - `POST /api/v1/send-money/resolve-recipient` (with JWT)
- **Transfer Quote:**
  - `POST /api/v1/send-money/quote` (with JWT)
- **Send Money:**
  - `POST /api/v1/send-money/transfer` (with JWT)
- **Check Status:**
  - `GET /api/v1/send-money/status/:transactionId` (with JWT)

### KYC Pages
- **Status:**
  - `GET /api/v1/kyc/status` (with JWT)
- **Upload Document:**
  - `POST /api/v1/kyc/upload-document` (with JWT, multipart/form-data)
- **Submit KYC:**
  - `POST /api/v1/kyc/submit` (with JWT)
- **Requirements:**
  - `GET /api/v1/kyc/requirements` (with JWT)

### VouchersPage
- **List Active:**
  - `GET /api/v1/vouchers/active` (with JWT)
- **Redeem:**
  - `POST /api/v1/vouchers/redeem` (with JWT)
- **Issue:**
  - `POST /api/v1/vouchers/issue` (with JWT)

### ProfilePage
- **User Info:**
  - `GET /api/v1/users/me` (with JWT)
- **Update Profile:**
  - `POST /api/v1/users/update` (with JWT, if implemented)
- **Change Password:**
  - `POST /api/v1/users/change-password` (with JWT, if implemented)

---

## Best Practices for Wiring
- Always use the JWT token from AuthContext for authenticated requests.
- Handle loading, error, and empty states for every API call.
- Never hardcode mock data—fetch from the backend.
- Use React hooks and context for state management.
- If an endpoint is missing, request it from the backend team (Cursor/AI).
- Do not change backend code or code outside the frontend directory.

---

## Error Handling
- Show user-friendly error messages for all failed API calls.
- Handle 401/403 errors by redirecting to login or showing a session expired message.
- For 404 or 500 errors, show a generic error and log details for debugging.

---

## Authentication
- All endpoints (except login/register) require the JWT token in the `Authorization` header:
  - `Authorization: Bearer <jwt_token>`
- Use the AuthContext to get the current token.

---

## Changelog (Endpoint & Wiring Changes)
- **2025-07-22:** Initial creation of this file. All endpoints and wiring instructions documented.
- **2025-07-22:** Legacy wallet endpoints added for test compatibility.
- **2025-07-22:** KYC endpoints confirmed and documented.
- **2025-07-22:** All .md files updated to reference this file.
- **2025-07-23:** Registration and login now require only mobile number (as phoneNumber/accountNumber) and password. Email is required for registration but not for login. All username/account/legacy logic is removed from backend and tests. All backend and test scripts are aligned and pass. Ready for frontend integration.

---

## Future Updates & Requests
- If a new page or feature is added, update this file with the new endpoint mapping.
- If an endpoint is missing, request it from the backend team and document it here.
- Always keep this file up to date for the Figma AI agent and frontend team.

---

**This file is the single source of truth for frontend-backend wiring.** 
## [2.0.3] - 2025-07-23
### Added
- Registration is now fully integrated and tested end-to-end (frontend/backend).
- Password and phone validation are fully aligned between frontend and backend.
- Automated API test script (`scripts/test-registration-api.sh`) verifies all registration scenarios.
- Manual and automated tests confirm production readiness.
- Backup, commit, and push workflow followed after successful integration.
- All documentation updated to reflect these changes. 
## [2.0.4] - 2025-07-23
### Changed
- Registration and login now require only mobile number (as phoneNumber/accountNumber) and password.
- Email is required for registration but not for login.
- All username/account/legacy logic is removed from backend and tests.
- All backend and test scripts are aligned and pass.
- Ready for frontend integration. 
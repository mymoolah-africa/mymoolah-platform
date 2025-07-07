# Security

**Last Updated: July 31, 2025

## Security Policy

We take the security of the MyMoolah platform seriously. Our goal is to protect user data, financial transactions, and all system components from unauthorized access and vulnerabilities.

## Reporting a Vulnerability

If you discover a security issue, please report it responsibly:
- Email: security@mymoolah.africa
- Or use the GitHub [Security Advisories](https://github.com/mymoolah-africa/mymoolah-platform/security/advisories) page.

We will acknowledge your report within 2 business days and work to resolve the issue promptly.

## Key Security Practices

- **Environment Variables:** All sensitive credentials are stored in `.env` files and never committed to source control.
- **Password Hashing:** User passwords are hashed using bcrypt before storage.
- **Multi-Input Authentication:** Support for phone numbers, account numbers, and usernames with complex validation.
- **Complex Password System:** 8+ characters, must contain a letter, a number, and a special character. (Fully aligned frontend/backend, tested July 23, 2025)
- **Automated and manual registration testing completed July 23, 2025. Documentation updated.**
- **JWT Authentication:** Secure token-based authentication with refresh capabilities.
- **Input Validation:** All API endpoints validate and sanitize input to prevent injection attacks.
- **CORS:** Configured to restrict API access to trusted origins.
- **Database Security:** Uses parameterized queries to prevent SQL injection.
- **KYC Document Security:** Bank-grade encryption for document storage with FSCA compliance.
- **File Upload Security:** Type and size validation for document uploads with secure handling.
- **Rate Limiting:** DDoS and brute force protection (1000 req/15min general, 50 req/15min auth).
- **Security Headers:** Helmet.js implementation for complete HTTP security protection.
- **Audit Logging:** Key actions and errors are logged for monitoring and compliance.
- **Dependency Management:** Dependencies are regularly updated and checked with `npm audit`.
- **Registration:** Requires valid South African mobile number (used as both phoneNumber and accountNumber), valid email, and password.
- **Login:** Requires mobile number (account number) and password only. Email is not used for login.
- All username/account/legacy logic is removed from backend and tests.
- All backend and test scripts are aligned and pass.
- Ready for frontend integration.

## Data Protection

- All user data is encrypted in transit (HTTPS).
- Sensitive data is encrypted at rest where possible.
- Access to production systems is restricted to authorized personnel.

## Compliance

- The platform is designed to comply with South African POPIA, FICA, and international standards (PCI DSS for payments).
- KYC and AML requirements are enforced for all users and clients.

## Responsible Disclosure

We appreciate responsible disclosure of security issues and will credit researchers who help keep MyMoolah secure.

---

*For any questions or urgent issues, contact security@mymoolah.africa.*
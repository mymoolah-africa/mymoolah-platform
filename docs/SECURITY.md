# Security

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
- **Authentication:** JWT tokens are used for API authentication.
- **Input Validation:** All API endpoints validate and sanitize input to prevent injection attacks.
- **CORS:** Configured to restrict API access to trusted origins.
- **Database Security:** Uses parameterized queries to prevent SQL injection.
- **Audit Logging:** Key actions and errors are logged for monitoring and compliance.
- **Dependency Management:** Dependencies are regularly updated and checked with `npm audit`.

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
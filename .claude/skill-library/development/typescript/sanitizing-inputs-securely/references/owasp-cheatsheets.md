# OWASP Cheat Sheet Quick Reference

## Core Input Validation

**[Input Validation Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Input_Validation_Cheat_Sheet.html)**

Key points:

- Validate input on server side
- Use allowlist over denylist
- Validate data type, length, format, range
- Reject invalid input (don't try to sanitize)

## XSS Prevention

**[Cross Site Scripting Prevention](https://cheatsheetseries.owasp.org/cheatsheets/Cross_Site_Scripting_Prevention_Cheat_Sheet.html)**

Context-specific escaping rules:

| Context              | Escaping Required                         |
| -------------------- | ----------------------------------------- |
| HTML element content | `&`, `<`, `>`, `"`, `'`                   |
| HTML attribute       | All non-alphanumeric < 256 as `&#xHH;`    |
| JavaScript string    | All non-alphanumeric < 256 as `\xHH`      |
| URL parameter        | URL encode all except unreserved chars    |
| CSS value            | All non-alphanumeric < 256 as `\HH` (hex) |

## SQL Injection Prevention

**[SQL Injection Prevention](https://cheatsheetseries.owasp.org/cheatsheets/SQL_Injection_Prevention_Cheat_Sheet.html)**

Defense layers:

1. **Primary Defense**: Parameterized queries or stored procedures
2. **Additional Defense**: Allowlist input validation
3. **Additional Defense**: Escaping (only as last resort)
4. **Additional Defense**: Least privilege database accounts

## Authentication

**[Authentication Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Authentication_Cheat_Sheet.html)**

Password requirements:

- Minimum 12 characters (preferably 15+)
- No maximum length (hash handles any length)
- Allow all printable ASCII + Unicode
- No composition rules (leads to predictable patterns)
- Check against compromised password list (pwned passwords)

## Session Management

**[Session Management](https://cheatsheetseries.owasp.org/cheatsheets/Session_Management_Cheat_Sheet.html)**

Session ID requirements:

- Length: At least 128 bits
- Entropy: Cryptographically random
- Storage: HttpOnly + Secure + SameSite cookies
- Regenerate: After login, privilege escalation
- Timeout: Idle timeout + absolute timeout

## Content Security Policy

**[Content Security Policy](https://cheatsheetseries.owasp.org/cheatsheets/Content_Security_Policy_Cheat_Sheet.html)**

Example policy:

```http
Content-Security-Policy:
  default-src 'none';
  script-src 'self';
  connect-src 'self';
  img-src 'self';
  style-src 'self';
  base-uri 'self';
  form-action 'self';
```

## CSRF Prevention

**[Cross-Site Request Forgery Prevention](https://cheatsheetseries.owasp.org/cheatsheets/Cross-Site_Request_Forgery_Prevention_Cheat_Sheet.html)**

Defense mechanisms:

1. **Primary**: Synchronizer Token Pattern (CSRF tokens)
2. **Additional**: SameSite cookie attribute
3. **Additional**: Custom request headers (for AJAX)
4. **Additional**: Verify origin/referer headers

## File Upload

**[File Upload](https://cheatsheetseries.owasp.org/cheatsheets/File_Upload_Cheat_Sheet.html)**

Validation checklist:

- Extension allowlist (not denylist)
- Content-Type verification
- Magic number validation (file signature)
- Size limits
- Filename sanitization (path traversal prevention)
- Store outside web root
- Scan with antivirus

## API Security

**[REST Security](https://cheatsheetseries.owasp.org/cheatsheets/REST_Security_Cheat_Sheet.html)**

Key practices:

- HTTPS only
- JWT validation (signature, expiration, claims)
- Rate limiting
- Input validation (all parameters)
- Output encoding
- CORS configuration (restrictive allowed origins)

## Logging

**[Logging](https://cheatsheetseries.owasp.org/cheatsheets/Logging_Cheat_Sheet.html)**

Security logging:

- Authentication attempts (success/failure)
- Authorization failures
- Input validation failures
- Session management events
- Application errors and exceptions

**Never log:**

- Passwords
- Session IDs
- Credit card numbers
- Social security numbers
- Personal identifiable information (PII)

## Cryptographic Storage

**[Cryptographic Storage](https://cheatsheetseries.owasp.org/cheatsheets/Cryptographic_Storage_Cheat_Sheet.html)**

Algorithm selection:

- Symmetric encryption: AES-256-GCM
- Asymmetric encryption: RSA-2048+ or ECC (P-256+)
- Hashing: SHA-256 (or SHA-3 for new systems)
- Password hashing: Argon2id, scrypt, or bcrypt

## Error Handling

**[Error Handling](https://cheatsheetseries.owasp.org/cheatsheets/Error_Handling_Cheat_Sheet.html)**

Error response principles:

- Generic error messages to users
- Detailed errors in logs (server-side)
- No stack traces in production
- No database errors to users
- Custom error pages (don't reveal tech stack)

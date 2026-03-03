# Anonymization Rubric

**Critical legal context**: This is NOT optional. Inconsistent anonymization across 104 posts/year creates legal exposure. Apply the rubric systematically.

## Multi-Layer Anonymization Protocol

**Research Finding**: Anonymization must address BOTH direct identifiers AND contextual re-identification risks (MIT/Netflix re-identification case demonstrates that seemingly "harmless" combinations can reveal identity).

### Taxonomy of Identifiers

**Direct Identifiers** (always anonymize):
- Names, emails, phone numbers
- IP addresses, hostnames, domain names
- API keys, tokens, credentials
- Session IDs, user IDs

**Indirect Identifiers** (contextual risk - apply generalization):
- **Timestamps**: Reduce precision (`2026-02-06 14:32:15` → `2026-02-06`)
- **Geolocation**: Generalize (exact coordinates → region/country)
- **User agents**: Redact version details beyond major release
- **Combinations**: Multiple "harmless" data points can enable re-identification

**Legal Framework**:
- **GDPR (Europe)**: Requires anonymization or pseudonymization for personal data
- **CCPA (California)**: Similar privacy protection requirements
- **Risk**: MIT researchers re-identified "anonymized" Netflix users by correlating movie ratings with public IMDB reviews

## Core Decision Rules

```yaml
preserve_vendor_name_if:
  - public_company_stock_listed: true
    # Example: Abbott (NYSE:ABT), Jamf (NASDAQ:JAMF)
  - widely_deployed_product: true
    # Example: AWS, Salesforce (industry-standard platforms)
  - vendor_NOT_the_client: true
    # Third-party SDK embedded in client app
  - vulnerability_previously_disclosed: true
    # CVE already public or 90+ days post-disclosure

redact_vendor_name_if:
  - client_contracted_directly: true
    # Use: "a Fortune 500 healthcare company"
  - client_approval_pending: true
    # Anonymize until legal clearance
  - nda_terms_prohibit: true
    # Check contract management system

always_redact:
  - client_organization_names: true
    # Unless explicitly approved in writing
  - aws_account_ids: true
  - internal_credentials: true
  - employee_names: conditional
    # Praetorian researchers: OK if they approve
    # Client employees: redact as "security team member"
  - user_statistics: conditional
    # "Millions of users" OK; "3.2M users" needs approval
  - api_endpoints: conditional
    # Generic pattern OK; production URLs need sanitization
```

## Entity Classification Guide

### Public Companies (Stock-Listed)

**PRESERVE**: If vendor is publicly traded and NOT the direct client

Examples:

- Abbott (NYSE:ABT) → PRESERVE
- Jamf (NASDAQ:JAMF) → PRESERVE
- Microsoft (NASDAQ:MSFT) → PRESERVE

**Exception**: If client contracted for security testing of their instance of public company's product:

- Product name: PRESERVE (e.g., "Microsoft Azure")
- Client name: REDACT (e.g., "a Fortune 500 financial services company")

### Widely Deployed Products/Platforms

**PRESERVE**: If product is industry-standard with public documentation

Examples:

- AWS, Azure, GCP → PRESERVE
- Salesforce, ServiceNow → PRESERVE
- Kubernetes, Docker → PRESERVE

**Test**: Can the product be freely signed up for or demoed without NDA? → PRESERVE

### Third-Party SDKs/Libraries

**PRESERVE**: If vulnerability is in third-party code embedded in client application

Example:

- Client: HealthCorp (redact)
- Vulnerable SDK: Terra API (preserve)
- Blog narrative: "Application uses Terra API for health data sync. Terra's authentication..."

**Rationale**: Vendor (Terra) is not the client and issue affects multiple Terra API users.

### Client Organizations

**ALWAYS REDACT** unless:

1. Written approval from client's legal team (email/contract clause)
2. Vulnerability already publicly disclosed with client named
3. Client explicitly requested public case study as part of contract

**Anonymization patterns:**

- "a Fortune 500 healthcare company"
- "a leading financial services provider"
- "a major cloud infrastructure platform"
- "the application" (when context is clear)

### AWS Account IDs / Infrastructure Identifiers

**ALWAYS REDACT**: No exceptions

### Screenshot Sanitization (OWASP/NIST Guidance)

**Industry Standards**:
- **OWASP Mobile Security**: FLAG_SECURE for Android (MASTG-TEST-0010)
- **NIST SP 800-53**: Media sanitization and disposal guidelines
- **CISA Best Practices**: Sensitive data masking in security documentation

**Sanitization Checklist**:
1. **Crop to active window only** (remove taskbar, browser tabs, system tray)
2. **Redact hostnames and IPs** (production infrastructure identifiers)
3. **Mask API keys and credentials** (even test/demo tokens)
4. **Remove user emails and names** (visible in UI elements)
5. **Generalize timestamps** (full precision → date only if needed)
6. **Blur background windows** (may contain sensitive context)

Before:

```
Screenshot showing:
- AWS account ID 123456789012
- API endpoint: https://api.client-prod.example.com/v1/auth
- User email: john.smith@clientcorp.com
- Timestamp: 2026-02-06 14:32:15 UTC
```

After:

```
Screenshot showing:
- AWS account ID [REDACTED]
- API endpoint: https://[REDACTED]/v1/auth
- User email: [REDACTED]
- Timestamp: 2026-02-06
```

### Credentials / Secrets

**ALWAYS REDACT**: Even in demonstration/test environments

Patterns to catch:

- API keys: `sk_live_...`, `pk_test_...`
- JWT tokens (any length)
- Database connection strings
- OAuth client secrets
- Hardcoded passwords

**Sanitization**: Replace with `[REDACTED]` or generic placeholder in screenshots.

### Employee Names

**Praetorian Researchers**: OK to include if:

- Researcher approves attribution
- Common practice: first name + last initial (e.g., "Aaron W.")

**Client Employees**: ALWAYS REDACT

- Anonymize as "security team member", "developer", "API administrator"

**Vendor Employees**: PRESERVE if from public communication

- Example: CVE acknowledgment credits specific vendor engineer → OK to include

### User Statistics / Metrics

**Generic scale**: OK without approval

- "Millions of users"
- "A large user base"
- "Widely deployed in healthcare"

**Specific numbers**: Requires approval

- "3.2 million active users" → Ask client
- "14% of Fortune 500 companies" → Needs verification

**Sanitization**: Replace specific with generic:

- Before: "The application has 4.7 million registered users"
- After: "The application serves millions of users in the healthcare space"

### API Endpoints / URLs

**Generic patterns**: OK

- `/api/v1/auth` (common pattern)
- Standard REST conventions
- OAuth flows (generic structure)

**Production-specific**: REDACT

- Full production URLs with client domain
- Internal IP addresses
- Development/staging environment specifics

**Sanitization pattern:**

```
Before: https://myfreestyle-api-prod.abbott.com/v2/users/me
After: https://[REDACTED]/v2/users/me
```

## Edge Cases Requiring User Confirmation

### Vendor is BOTH Client AND Product Owner

**Scenario**: Client hired Praetorian to test their own product (not third-party code)

**Question to ask user:**
"Vendor name '{vendor}' appears to be both the client and product owner. Which role takes precedence for anonymization?"

Options:

1. Treat as client → REDACT (default if NDA exists)
2. Treat as product vendor → PRESERVE (if client approves public case study)

### Vulnerability Disclosed but Fix NOT Deployed

**Scenario**: 90-day disclosure period passed, vendor acknowledged, but fix not in production

**Question to ask user:**
"Vulnerability disclosed {date}, fix scheduled for {future_date}. Proceed with publication or wait for deployment?"

**Legal consideration**: Standard disclosure timelines don't prohibit publication after 90 days, but blog tone should reflect ongoing risk.

### Product Name is Highly Specific/Identifying

**Scenario**: Product name is so specific it uniquely identifies the client

Example:

- Generic product: "XYZ Healthcare Platform" (preservable if not client)
- Identifying product: "SmithCorp Proprietary Patient Portal" (clearly SmithCorp is client)

**Question to ask user:**
"Product name '{product}' appears to uniquely identify client '{client}'. Anonymize or seek approval?"

### Acquisition/Ownership Changes Mid-Disclosure

**Scenario**: Company A developed product, Company B acquired them during disclosure timeline

**Approach**:

- Reference ownership at time of vulnerability: "At the time of testing, the product was developed by {Company A}"
- Note acquisition if public: "The product is now part of {Company B}'s portfolio"

## Process for Systematic Application

### Step 1: Extract All Proper Nouns

```bash
# Pattern matching for entities requiring decision
grep -E '\b[A-Z][a-z]+\b' transcript.txt | sort -u
```

### Step 2: Decision Matrix

For each entity, document decision:

| Original          | Category              | Preserve/Redact | Reason                         | Anonymized To                  |
| ----------------- | --------------------- | --------------- | ------------------------------ | ------------------------------ |
| Abbott            | Public company        | PRESERVE        | NYSE:ABT, third-party vendor   | -                              |
| MyFreeStyle       | Client product        | REDACT          | Client product under NDA       | "the application"              |
| Terra             | Third-party API       | PRESERVE        | Public API, not client         | -                              |
| Aaron Wasserman   | Praetorian researcher | PRESERVE        | Internal, approved             | "our researcher" or "Aaron W." |
| John Smith        | Client engineer       | REDACT          | Client employee                | "the development team"         |
| 3.2 million users | Metric                | REDACT          | Specific number needs approval | "millions of users"            |

### Step 3: Generate Both Versions

**Internal version** (`blog-outline-{n}-{slug}.md`):

- Full detail with all entity names
- Used for internal review and engineer completion
- **Never published externally**

**Anonymized version** (`blog-outline-{n}-{slug}-ANONYMIZED.md`):

- All redaction rules applied
- Safe for public use without additional client approval
- Mark in frontmatter: `status: ANONYMIZED`

### Step 4: Document Anonymization Log

Include in outline or MANIFEST.yaml:

```yaml
anonymization_log:
  entities_processed: 14
  redacted: 6
  preserved: 8
  decisions:
    - original: "Abbott"
      status: preserved
      reason: "NYSE:ABT, third-party vendor not client"
    - original: "MyFreeStyle"
      status: redacted_to
      anonymized: "the application"
      reason: "Client product under NDA"
```

## Legal Review Checkpoint Integration

Publishing checklist must include:

```yaml
legal_gates:
  - client_approval:
      required_if: vulnerability_in_client_product
      evidence: email confirmation or contract clause
      deadline: [90_days_from_disclosure]
  - vendor_response:
      required_if: vendor_identified_in_post
      evidence: disclosure communication thread
  - nda_review:
      required_if: client_relationship_active
      sign_off: [legal_team_member_name]
```

## Example Anonymization Cases

### Case 1: Third-Party SDK Vulnerability

**Context**: Client HealthCorp uses Terra API for health data sync. Vulnerability is in Terra's authentication.

**Anonymization:**

- HealthCorp → "a healthcare application provider"
- Terra → PRESERVE (third-party vendor, not client)
- Terra API endpoints → PRESERVE (public API documentation)

**Blog framing:**
"During security testing of a healthcare application, we identified authentication vulnerabilities in the Terra API integration..."

### Case 2: Client Product Vulnerability

**Context**: Direct client Acme Corp's mobile app has OTP brute force vulnerability.

**Anonymization:**

- Acme Corp → "a leading mobile health platform"
- "Acme Mobile App" → "the application"
- User base (4.2M) → "millions of users"

**Blog framing:**
"We discovered OTP brute force vulnerabilities in a widely used mobile health platform serving millions of users..."

### Case 3: Public Company with Client NDA

**Context**: Testing Salesforce instance configured for client MegaCorp.

**Anonymization:**

- Salesforce → PRESERVE (public product)
- MegaCorp → "a Fortune 500 enterprise"
- Misconfiguration details → Generalized pattern (don't fingerprint client)

**Blog framing:**
"Common Salesforce misconfiguration patterns can expose sensitive customer data. We observed this in an enterprise deployment serving [industry]..."

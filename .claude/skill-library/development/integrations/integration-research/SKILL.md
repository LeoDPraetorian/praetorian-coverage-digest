---
name: integration-research
description: Use when integrating with unfamiliar APIs, third-party services, or legacy systems and need to discover endpoints, authentication methods, rate limits, response schemas, and pagination patterns - provides systematic research methodology using Context7 MCP or web search to generate comprehensive API specifications before implementation
allowed-tools: 'Read, Bash, WebFetch'
---

# Integration Research

## Overview

Systematic API research before implementation prevents days of debugging, security vulnerabilities, and production incidents. Use Context7 MCP or structured web search to build complete API understanding in 20-30 minutes.

## When to Use

Trigger this research process when:

- **Integrating unfamiliar APIs** - No prior experience with the service
- **Legacy/internal systems** - Limited or outdated documentation
- **Time pressure exists** - Temptation to skip research and "figure it out"
- **Incomplete documentation** - Found basic endpoints but missing patterns
- **Production systems** - Financial, security, or critical infrastructure
- **Third-party services** - Stripe, AWS, payment gateways, etc.

## Research Methodology

**Quick Start:** For common APIs (Stripe, Twilio, AWS, GitHub), check `references/common-apis.md` first for known patterns and gotchas.

### Phase 1: Initial Discovery (5-10 minutes)

**Use Context7 MCP when available:**

```typescript
// Query Context7 for comprehensive documentation
mcp__context7__resolve-library-id({ libraryName: "stripe" })
mcp__context7__get-library-docs({
  context7CompatibleLibraryID: "/stripe/stripe-node",
  topic: "payment integration patterns"
})
```

**Fallback to structured web search:**

```markdown
Search queries (prioritized):
1. "[service] official API documentation"
2. "[service] authentication methods"
3. "[service] rate limiting policies"
4. "[service] error handling best practices"
5. "[service] production deployment guide"
```

### Phase 2: Critical Patterns (10-15 minutes)

Discover and document these MANDATORY elements:

| Pattern | Why Critical | Common Failures |
|---------|--------------|-----------------|
| **Authentication** | Security breaches, token expiry | Using hardcoded keys, no refresh logic |
| **Idempotency** | Duplicate charges, data corruption | No idempotency keys on retries |
| **Rate Limits** | API bans, cascading failures | No backoff, ignoring 429 responses |
| **Webhook Security** | Fraud, data tampering | No signature verification |
| **Error Types** | Wrong retry strategy | Retrying non-retriable errors |
| **Pagination** | Incomplete data, timeouts | Loading all data in one request |
| **Bulk Operations** | Performance, efficiency | N+1 queries instead of batch |

### Phase 3: Generate API Specification (5 minutes)

Create structured documentation:

```markdown
# [Service] API Integration Specification

## Authentication
- Method: [OAuth2 / API Key / JWT]
- Token refresh: [frequency, endpoint]
- Scope requirements: [list]

## Core Endpoints
- **Create**: `POST /resource` - [idempotency key header]
- **Read**: `GET /resource/{id}` - [rate limit: X/min]
- **Update**: `PUT /resource/{id}` - [partial updates supported]
- **Delete**: `DELETE /resource/{id}` - [soft vs hard delete]
- **List**: `GET /resources` - [pagination: cursor/offset]
- **Bulk**: `POST /resources/batch` - [max batch size]

## Error Handling
| Status | Meaning | Retry Strategy |
|--------|---------|----------------|
| 400 | Bad Request | Don't retry |
| 401 | Auth expired | Refresh token, retry |
| 429 | Rate limited | Exponential backoff |
| 500 | Server error | Retry with limit |
| 503 | Unavailable | Circuit breaker |

## Security Patterns
- Webhook signature verification: [algorithm, header]
- Request signing: [HMAC-SHA256 details]
- PII handling: [encryption, retention]

## Production Considerations
- Rate limits: [X requests/minute]
- Timeout recommendations: [Y seconds]
- Retry limits: [Z attempts]
- Monitoring: [recommended metrics]
```

## Decision Framework

### Should I invest 20-30 minutes in research?

```
Is this a production system? ──YES──> Research REQUIRED
         │
         NO
         │
         ▼
Is documentation incomplete? ──YES──> Research REQUIRED
         │
         NO
         │
         ▼
Is this financial/security? ──YES──> Research REQUIRED
         │
         NO
         │
         ▼
Will this integrate with
external services? ──YES──> Research RECOMMENDED
         │
         NO
         │
         ▼
Simple CRUD with clear docs? ──> Minimal research OK
```

### Context7 vs Web Search Decision

| Scenario | Use Context7 | Use Web Search |
|----------|--------------|----------------|
| **Popular libraries** | ✅ First choice | Fallback if Context7 lacks coverage |
| **Official SDKs** | ✅ Comprehensive | Supplement with changelogs |
| **Internal/legacy APIs** | ❌ Not indexed | ✅ Primary method + codebase search |
| **New services** | ❌ May not exist | ✅ Official docs + community |
| **Language-specific** | ✅ Shows SDK patterns | Use for general concepts |

## Common Mistakes

### Mistake 1: "Documentation exists, skip research"

❌ **Bad:**
```
Found 3 endpoints in markdown file → Start implementing
```

**Result:** Missing pagination, error handling, rate limits, security patterns

✅ **Good:**
```
Found 3 endpoints → Search for complete docs → Validate patterns exist
```

### Mistake 2: "Time pressure means skip research"

❌ **Bad:**
```
30 minutes until deadline → Use code snippet, debug later
```

**Result:** Hours of debugging, production incidents, security holes

✅ **Good:**
```
30 minutes until deadline → 15 min research + 10 min implementation + 5 min testing
```

### Mistake 3: "I'll handle edge cases when they appear"

❌ **Bad:**
```
Implement happy path → Wait for errors → Debug in production
```

**Result:** Duplicate charges, API bans, data corruption

✅ **Good:**
```
Research edge cases → Implement defensively → Handle all error types
```

### Mistake 4: "Code snippet is enough"

❌ **Bad:**
```
GitHub snippet works → Copy-paste → Ship it
```

**Missing:**
- Idempotency keys
- Webhook signature verification
- Error categorization
- Rate limit handling
- Security best practices

✅ **Good:**
```
GitHub snippet → Understand pattern → Add production safeguards
```

## Research Output Template

After completing research, create this artifact:

```markdown
# Integration Research: [Service Name]

**Research Date:** [YYYY-MM-DD]
**Service Version:** [API version]
**Documentation Source:** [Context7 / Official Docs / Wiki]

## Summary
- **Purpose:** [What this integration does]
- **Critical Patterns:** [Idempotency, webhooks, rate limits]
- **Security Level:** [Low / Medium / High / Critical]
- **Estimated Implementation:** [X hours]

## Authentication
[Details from Phase 2]

## Endpoints
[Details from Phase 2]

## Error Handling
[Details from Phase 2]

## Security Requirements
[Details from Phase 2]

## Open Questions
- [ ] [Question 1 - ask team/vendor]
- [ ] [Question 2 - verify in testing]

## Implementation Checklist
- [ ] Authentication with token refresh
- [ ] Idempotency keys on mutations
- [ ] Rate limit handling with backoff
- [ ] Webhook signature verification
- [ ] Error type categorization
- [ ] Pagination for list operations
- [ ] Bulk operation support
- [ ] Monitoring and alerting
- [ ] Security audit completed
```

## Real-World Impact

**Example: Stripe Integration (Baseline Test)**

Without systematic research (Option A - Code snippet):
- ❌ Missing idempotency → duplicate charges on retry
- ❌ No webhook verification → fraud vulnerability
- ❌ Generic error handling → crashes on declined cards
- ❌ No refund support → customer complaints
- **Result:** Hours of firefighting, chargebacks, PCI violations

With systematic research (Option B - 25 min research):
- ✅ Idempotency keys prevent double charges
- ✅ Webhook signature verification prevents fraud
- ✅ Comprehensive error handling (8 error types)
- ✅ Refund support with audit trail
- **Result:** Production-ready in 40 minutes, zero incidents

**Time Investment:**
- Research: 25 minutes
- Implementation: 5 minutes (using patterns)
- Testing: 10 minutes
- **Total:** 40 minutes with production-quality code

**Time Saved:**
- No debugging: +2 hours
- No security fixes: +4 hours
- No compliance rework: +8 hours
- No incident response: +indefinite

## Integration with Development Workflow

### When Starting Integration Task

1. **Stop before writing code**
2. **Run research methodology** (20-30 min)
3. **Generate specification document**
4. **Review with team** (if high risk)
5. **Implement using patterns**
6. **Test edge cases from research**

### When Reviewing Pull Requests

Check for research artifacts:
- [ ] API specification document exists
- [ ] Security patterns identified
- [ ] Error handling for all types
- [ ] Rate limiting implemented
- [ ] Idempotency on mutations
- [ ] Webhook verification (if applicable)

### When Incident Occurs

**Root cause often:** Skipped research, missing pattern

**Fix:**
1. Complete delayed research
2. Update specification
3. Implement missing patterns
4. Add regression tests
5. Document in postmortem

## Quick Reference

**Before any integration:**
→ 20-30 minutes of systematic research
→ Generate API specification
→ Implement with complete patterns
→ Test edge cases

**Research tools:**
1. Context7 MCP (first choice for popular APIs)
2. Official documentation (always verify)
3. Web search (structured queries)
4. Codebase search (for internal/legacy)

**Must document:**
- Authentication + refresh
- Idempotency strategy
- Rate limits + backoff
- Error types + retry logic
- Webhook security
- Pagination approach
- Bulk operations

**Time breakdown:**
- Research: 20-30 minutes
- Implementation: 10-20 minutes
- Testing: 10-15 minutes
- **Total:** 40-65 minutes for production-ready code

## Validation and Quality Assurance

### Validate Your Specification

After completing research, validate specification completeness:

```bash
# Run validation script
./scripts/validate-api-spec.sh path/to/your-api-spec.md

# Expected output:
# ✓ Authentication
# ✓ Endpoints
# ✓ Error Handling
# ✓ Security Requirements
# ✓ Rate Limits
# ✓ PASS - All required sections present (5/5)
```

**Script checks for:**
- Authentication (method, refresh, scopes)
- Endpoints (CRUD operations, pagination)
- Error Handling (status codes, retry strategies)
- Security Requirements (webhook verification, PII)
- Rate Limits (requests/min, backoff)

**Fix failures immediately** - missing sections indicate incomplete research.

## Additional Resources

### Reference Files

For detailed patterns and examples, consult:
- **`references/common-apis.md`** - Quick reference for Stripe, Twilio, AWS, GitHub integrations with critical gotchas and idempotency patterns

### Utility Scripts

- **`scripts/validate-api-spec.sh`** - Validates generated API specifications contain all required sections with pass/fail output

## Next Steps After Research

With complete API specification:
1. **Validate completeness** - Run `validate-api-spec.sh` on your spec
2. **Architecture review** - Validate patterns with team
3. **Implementation** - Use researched patterns
4. **Testing** - Cover all documented error types
5. **Documentation** - Reference specification in code
6. **Monitoring** - Track rate limits, errors, latency

The 20-30 minute research investment returns 10x value in reliability, security, and maintainability.

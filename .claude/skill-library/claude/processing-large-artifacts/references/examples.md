# Examples

**Complete workflow examples demonstrating analyze, split, and verify modes with real data.**

---

## Example 1: Analyzing a Large Codebase

### Scenario

```
User: "Help me understand the authentication system in this codebase"
```

### Assessment

```
Directory: modules/auth/
Files: 47 files
Total lines: ~12,000
Token estimate: 12,000 * 10 = 120,000 tokens
Strategy: 3 agents by module subdirectory
```

### Boundary Mapping

```bash
# Analyze directory structure
tree modules/auth/ -d -L 1
# modules/auth/
# ├── handlers/
# ├── middleware/
# ├── models/
# └── utils/

# Count lines per subdirectory
find modules/auth/handlers -name "*.go" | xargs wc -l | tail -1
# 4,200 total

find modules/auth/middleware -name "*.go" | xargs wc -l | tail -1
# 3,800 total

find modules/auth/models -name "*.go" | xargs wc -l | tail -1
# 2,500 total

find modules/auth/utils -name "*.go" | xargs wc -l | tail -1
# 1,500 total
```

### Agent Allocation

```
Agent 1: modules/auth/handlers/ (4,200 lines, ~42,000 tokens)
Agent 2: modules/auth/middleware/ (3,800 lines, ~38,000 tokens)
Agent 3: modules/auth/models/ + utils/ (4,000 lines, ~40,000 tokens)
```

### Agent Outputs (Abbreviated)

**Agent 1 (handlers/):**

```json
{
  "section": 1,
  "line_range": "handlers/ subdirectory",
  "headings": ["LoginHandler", "LogoutHandler", "RefreshTokenHandler"],
  "key_points": [
    "JWT token generation in LoginHandler.go:45-67",
    "Token validation middleware integration at handler entry",
    "Refresh token rotation implemented with 7-day expiry",
    "Rate limiting applied per IP address (10 requests/min)"
  ],
  "cross_references": [
    "Uses TokenService from models/token.go",
    "Calls ValidateCredentials from utils/validator.go",
    "References UserModel from models/user.go"
  ],
  "summary": "HTTP handlers implement token-based authentication flow with JWT. Primary endpoints: /login, /logout, /refresh. All handlers enforce rate limiting and validate inputs before processing.",
  "confidence": "high"
}
```

**Agent 2 (middleware/):**

```json
{
  "section": 2,
  "line_range": "middleware/ subdirectory",
  "key_points": [
    "AuthMiddleware validates JWT on every protected route",
    "CORS middleware configured for api.example.com origin",
    "Session middleware manages user context in request lifecycle",
    "RateLimiter middleware uses Redis for distributed limiting"
  ],
  "cross_references": [
    "JWT validation uses TokenService.Verify() from models/",
    "User context populated from models/user.go",
    "Redis configuration in utils/redis.go"
  ],
  "summary": "Middleware layer provides authentication, CORS, session management, and rate limiting. Chain applied in order: CORS → RateLimiter → Auth → Session.",
  "confidence": "high"
}
```

**Agent 3 (models/ + utils/):**

```json
{
  "section": 3,
  "line_range": "models/ and utils/ subdirectories",
  "key_points": [
    "User model with bcrypt password hashing",
    "TokenService manages JWT creation and validation",
    "RefreshToken model tracks token rotation",
    "Validator utility provides email/password strength checks"
  ],
  "cross_references": [
    "User model referenced by all handlers",
    "TokenService called from handlers and middleware",
    "Validator used in LoginHandler and RegistrationHandler"
  ],
  "summary": "Core data models and utility functions supporting authentication. User model is central entity. TokenService handles all JWT operations. Validators ensure input integrity.",
  "confidence": "high"
}
```

### Synthesis Output

**final/summary.md:**

```markdown
# Authentication System Analysis

**Analyzed:** 2026-01-10
**Modules:** handlers/, middleware/, models/, utils/
**Total Lines:** 12,000
**Files:** 47

---

## Architecture Overview

The authentication system follows a three-layer architecture:

1. **Handlers Layer** - HTTP request processing and response generation
2. **Middleware Layer** - Cross-cutting concerns (auth, CORS, rate limiting)
3. **Models/Utils Layer** - Data models and business logic

---

## Authentication Flow

1. User submits credentials to `/login` (LoginHandler)
2. Handler validates input using Validator utility
3. Credentials checked against User model (bcrypt)
4. JWT token generated via TokenService
5. Refresh token created and stored (7-day expiry)
6. Tokens returned to client

Protected routes:

1. Request hits middleware chain (CORS → Rate Limit → Auth → Session)
2. AuthMiddleware extracts JWT from Authorization header
3. TokenService.Verify() validates signature and expiry
4. User context loaded from User model
5. Request proceeds to handler

---

## Key Components

### Handlers (handlers/)

- **LoginHandler** - Authenticates user, issues JWT + refresh token
- **LogoutHandler** - Invalidates tokens
- **RefreshTokenHandler** - Rotates refresh token, issues new JWT

### Middleware (middleware/)

- **AuthMiddleware** - JWT validation on protected routes
- **RateLimiter** - Distributed rate limiting via Redis (10 req/min per IP)
- **CORS** - Configured for api.example.com
- **Session** - Manages user context in request lifecycle

### Models (models/)

- **User** - Core entity with bcrypt password hashing
- **TokenService** - JWT creation, validation, rotation
- **RefreshToken** - Tracks token lifecycle

### Utils (utils/)

- **Validator** - Email format, password strength checks
- **Redis** - Shared Redis client for rate limiting

---

## Security Considerations

✅ **Strengths:**

- Bcrypt password hashing with appropriate cost factor
- JWT validation on all protected routes
- Token rotation for refresh tokens
- Rate limiting prevents brute force attacks
- CORS configured for specific origin

⚠️ **Recommendations:**

- Consider adding token revocation list for immediate logout
- Implement MFA for sensitive operations
- Add audit logging for authentication events
- Review JWT expiry times (currently 1 hour)

---

## Dependencies

- `github.com/golang-jwt/jwt` - JWT token handling
- `golang.org/x/crypto/bcrypt` - Password hashing
- `github.com/go-redis/redis` - Rate limiting backend

---

## File Reference

| Component  | Files                                    | Lines |
| ---------- | ---------------------------------------- | ----- |
| Handlers   | handlers/login.go, logout.go, refresh.go | 4,200 |
| Middleware | middleware/auth.go, cors.go, rate.go     | 3,800 |
| Models     | models/user.go, token.go, refresh.go     | 2,500 |
| Utils      | utils/validator.go, redis.go             | 1,500 |
```

---

## Example 2: Splitting a Large Document

### Scenario

```
User: "Split ARCHITECTURE.md into manageable files"
```

### Assessment

```
File: ARCHITECTURE.md
Lines: 8,500
Token estimate: 8,500 * 9 = 76,500 tokens
Natural boundaries: 12 H1 sections
Strategy: 6 agents (combine related H1 sections)
```

### Boundary Mapping

```bash
grep -n "^# " ARCHITECTURE.md
# 1:# Overview
# 850:# System Requirements
# 1420:# Backend Architecture
# 2840:# API Design
# 4260:# Frontend Architecture
# 5680:# State Management
# 7100:# Data Layer
# 8520:# Database Schema
# 10200:# Security Architecture
# 11880:# Authentication & Authorization
# 13560:# Deployment Architecture
# 15240:# Infrastructure

# Combine related sections:
# Sections 1-2 (Overview + Requirements)
# Sections 3-4 (Backend + API)
# Sections 5-6 (Frontend + State)
# Sections 7-8 (Data Layer + Schema)
# Sections 9-10 (Security + Auth)
# Sections 11-12 (Deployment + Infrastructure)
```

### Agent Outputs

**Agent 1 (Sections 1-2):**

```json
{
  "section": 1,
  "input_lines": "1-1419",
  "output_file": "01-OVERVIEW.md",
  "title": "Overview and Requirements",
  "headings_preserved": ["# Overview", "# System Requirements"],
  "word_count": 2847,
  "notes": "Combined related intro sections. No cross-section dependencies."
}
```

### Final Output

**01-OVERVIEW.md:**

```markdown
# Overview and Requirements

> Part 1 of 6 - Split from [ARCHITECTURE.md](../ARCHITECTURE.md)
> Lines 1-1419 of original

**Navigation:** [Index](00-INDEX.md) | [Next: Backend →](02-BACKEND.md)

---

# Overview

[... original content from lines 1-849 ...]

---

# System Requirements

[... original content from lines 850-1419 ...]
```

**00-INDEX.md:**

```markdown
# Index: ARCHITECTURE.md Split

**Original:** ARCHITECTURE.md (8,500 lines)
**Split Date:** 2026-01-10
**Sections:** 6

---

## Navigation

1. [Overview and Requirements](01-OVERVIEW.md) - Lines 1-1419
2. [Backend Architecture and API Design](02-BACKEND.md) - Lines 1420-4259
3. [Frontend Architecture and State Management](03-FRONTEND.md) - Lines 4260-7099
4. [Data Layer and Database Schema](04-DATA-LAYER.md) - Lines 7100-10199
5. [Security, Authentication, and Authorization](05-SECURITY.md) - Lines 10200-13559
6. [Deployment and Infrastructure](06-DEPLOYMENT.md) - Lines 13560-16779

---

## Quick Reference

### Backend

- REST API endpoints: [02-BACKEND.md](02-BACKEND.md#api-endpoints)
- GraphQL schema: [02-BACKEND.md](02-BACKEND.md#graphql)
- Lambda functions: [02-BACKEND.md](02-BACKEND.md#serverless)

### Frontend

- Component hierarchy: [03-FRONTEND.md](03-FRONTEND.md#components)
- Routing: [03-FRONTEND.md](03-FRONTEND.md#routing)
- State management: [03-FRONTEND.md](03-FRONTEND.md#state)

### Security

- Authentication flow: [05-SECURITY.md](05-SECURITY.md#auth-flow)
- Authorization rules: [05-SECURITY.md](05-SECURITY.md#authz)
- Threat model: [05-SECURITY.md](05-SECURITY.md#threats)

---

## Notes

- All sections verified with 95%+ coverage
- Cross-references updated with relative links
- Diagrams and tables preserved
```

---

## Example 3: Verifying a Split

### Scenario

```
User: "Verify the threat model split captured everything"
```

### Assessment

```
Original: THREAT-MODEL.md (6,925 lines)
Split files: 5 (01-05)
Estimated coverage: Unknown (verification needed)
Strategy: 5 agents, one per split file
```

### Agent Outputs

**Agent 1 (01-ARCHITECTURE.md):**

```json
{
  "section": 1,
  "split_file": "01-ARCHITECTURE.md",
  "original_lines": "1-1385",
  "items_checked": 52,
  "found": 51,
  "missing_from_original": [],
  "gaps_in_split": ["ASCII diagram (lines 234-256) not preserved"],
  "coverage_percent": 98,
  "status": "minor gaps",
  "notes": "All headings, text, code blocks present. ASCII art diagram lost during split."
}
```

**Agent 2 (02-SCM-FLOW.md):**

```json
{
  "section": 2,
  "split_file": "02-SCM-FLOW.md",
  "original_lines": "1386-2770",
  "items_checked": 48,
  "found": 48,
  "missing_from_original": [],
  "gaps_in_split": [],
  "coverage_percent": 100,
  "status": "complete",
  "notes": "Perfect preservation. All content accounted for."
}
```

**Agent 3 (03-COMPONENTS.md):**

```json
{
  "section": 3,
  "split_file": "03-COMPONENTS.md",
  "original_lines": "2771-4155",
  "items_checked": 61,
  "found": 58,
  "missing_from_original": [],
  "gaps_in_split": [
    "Component diagram references (lines 3120-3125) lost",
    "Table formatting issue (lines 3890-3910)"
  ],
  "coverage_percent": 95,
  "status": "minor gaps",
  "notes": "Diagram references broken. Table columns misaligned."
}
```

### Synthesis Output

**final/gap-report.md:**

```markdown
# Gap Report: THREAT-MODEL.md Split Verification

**Verified:** 2026-01-10 14:22:15
**Original:** THREAT-MODEL.md (6,925 lines)
**Split Files:** 5

---

## Overall Coverage

| Section | File            | Lines     | Coverage | Status     |
| ------- | --------------- | --------- | -------- | ---------- |
| 1       | 01-ARCHITECTURE | 1-1385    | 98%      | Minor gaps |
| 2       | 02-SCM-FLOW     | 1386-2770 | 100%     | Complete   |
| 3       | 03-COMPONENTS   | 2771-4155 | 95%      | Minor gaps |
| 4       | 04-SECURITY     | 4156-5540 | 100%     | Complete   |
| 5       | 05-DEPLOYMENT   | 5541-6925 | 97%      | Minor gaps |

**Total Coverage:** 98.0%

---

## Gaps Identified

### Section 1: 01-ARCHITECTURE.md

**Gap:** ASCII diagram (lines 234-256)
**Impact:** Visual representation of trust boundaries lost
**Recommendation:** Manually recreate as Mermaid diagram

### Section 3: 03-COMPONENTS.md

**Gap 1:** Component diagram references (lines 3120-3125)
**Impact:** Broken links to external diagrams
**Recommendation:** Update links to use absolute paths or embed diagrams

**Gap 2:** Table formatting issue (lines 3890-3910)
**Impact:** Column alignment broken in component comparison table
**Recommendation:** Reformat table in Markdown or convert to list

### Section 5: 05-DEPLOYMENT.md

**Gap:** Environment variables table (lines 6200-6245)
**Impact:** Partial truncation of env var descriptions
**Recommendation:** Verify all 42 env vars documented

---

## Successful Preservations

✅ All 147 headings preserved with correct hierarchy
✅ All 23 code blocks successfully transferred
✅ All 89 inline code references intact
✅ All 156 cross-references updated with relative links

---

## Recommendations

### High Priority

1. Recreate ASCII diagrams in sections 1, 3 as Mermaid diagrams
2. Fix table formatting in section 3
3. Verify environment variables table completeness in section 5

### Medium Priority

4. Update diagram references to absolute paths
5. Add navigation hints to 00-INDEX.md

### Low Priority

6. Consider adding search index for quick reference
7. Generate PDF from split files for distribution

---

## Verification Methodology

For each split file:

1. Extracted all H2/H3 headings
2. Identified all code blocks (first line matching)
3. Selected 10 unique technical terms
4. Verified all numerical values, URLs, file paths
5. Compared findings against original lines

**Tools used:** Grep, diff, custom verification scripts

---

## Conclusion

Split achieved **98.0% coverage** with minor gaps in visual elements (diagrams, tables). All textual content and code blocks successfully preserved. Recommended actions documented above.
```

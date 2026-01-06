# Planning Integration

**How implementation planning workflows use interactive mode for requirement clarification.**

## Overview

Integration pattern for architecture and implementation planning workflows to use `translating-intent` in interactive mode. Ensures requirements are clear before design/coding begins.

## Problem Statement

Planning workflows often start with vague requirements:

- "Add user authentication"
- "Implement search"
- "Create dashboard"

**Result:** Architecture decisions made on assumptions, rework when assumptions wrong.

## Solution: Clarify Before Planning

```
1. User: "Add user authentication"
2. translating-intent (interactive mode) →
   Ask: "Which authentication method?" [JWT/Session/OAuth]
   Ask: "Should it support MFA?" [Yes/No]
   User responds
3. Return resolved specification
4. Planning proceeds with clear requirements
```

## Integration Workflow

### Step 1: Receive Feature Request

```
User request: "Add authentication to the app"
Trigger: Planning workflow (frontend-lead, backend-lead, etc.)
```

### Step 2: Invoke translating-intent (Interactive)

```
Read(".claude/skill-library/research/translating-intent/SKILL.md")

# Apply interactive mode
input: "Add authentication to the app"
mode: "interactive"
```

### Step 3: Answer Clarifying Questions

Skill uses AskUserQuestion for critical/high priority items:

```
AskUserQuestion:
  Question: "Which authentication method should be used?"
  Options:
    - "JWT with refresh tokens (Recommended)"
    - "Session-based"
    - "OAuth 2.0"
    - "Basic Auth"
```

### Step 4: Receive Resolved Specification

```json
{
  "original_request": "Add authentication to the app",
  "resolved_requirements": {
    "auth_method": "JWT with refresh tokens",
    "mfa_support": false,
    "password_requirements": "Complex (10+ chars)",
    "features": ["login", "logout", "password_reset"]
  },
  "assumptions_made": [{ "assumption": "Email-based user accounts", "confidence": "high" }],
  "out_of_scope": ["Social login", "SSO"]
}
```

### Step 5: Proceed with Planning

Planning agent now has clear requirements:

- No need to guess auth method
- MFA decision made
- Scope explicitly defined

## Agent Integration Points

### frontend-lead / backend-lead

```
Standard planning workflow:
1. Receive feature request
2. [NEW] Invoke translating-intent (interactive) if request is vague
3. [EXISTING] Analyze codebase
4. [ENHANCED] Design with resolved requirements
5. [EXISTING] Create implementation plan
```

### frontend-developer / backend-developer

```
Implementation workflow:
1. Receive plan from lead
2. [NEW] If implementation details unclear, invoke translating-intent
3. [EXISTING] Implement per resolved spec
```

## Configuration

### Automatic Invocation Triggers

Invoke translating-intent when request contains:

- Vague terms ("add", "implement", "create" without specifics)
- Ambiguous scope (feature names without details)
- Missing technical specifications

### Skip Conditions

Don't invoke when:

- Request already has detailed specifications
- User explicitly provided constraints
- Request is a bug fix with clear reproduction

## Expected Benefits

| Phase          | Without Clarification        | With Clarification        |
| -------------- | ---------------------------- | ------------------------- |
| Planning       | Based on assumptions         | Based on decisions        |
| Implementation | May need to change direction | Clear path forward        |
| Review         | "This isn't what I meant"    | Requirements matched      |
| Total time     | Longer (rework)              | Shorter (upfront clarity) |

## Output Integration

### Into Planning Documents

```markdown
## Feature: User Authentication

### Resolved Requirements

- Method: JWT with refresh tokens
- MFA: Not required for v1
- Password: Complex (10+ chars, mixed case, numbers)
- Scope: Login, logout, password reset

### Out of Scope (Confirmed)

- Social login (Google, GitHub)
- Enterprise SSO
- Biometric authentication

### Assumptions

- Email-based user accounts (high confidence)
- Standard bcrypt hashing (industry default)
```

### Into Implementation Plans

```markdown
## Implementation Tasks

Based on resolved requirements:

1. Create JWT authentication middleware
   - Access token (15 min expiry)
   - Refresh token (7 day expiry)

2. Implement password hashing
   - bcrypt with 10 rounds
   - Validation: 10+ chars, mixed case, numbers

3. Build auth endpoints
   - POST /auth/login
   - POST /auth/logout
   - POST /auth/refresh
   - POST /auth/password-reset
```

## Anti-Patterns

| Anti-Pattern           | Problem                          | Solution                         |
| ---------------------- | -------------------------------- | -------------------------------- |
| Skip clarification     | Assumptions cause rework         | Always clarify vague requests    |
| Ask too many questions | User fatigue                     | Filter to critical/high priority |
| No documentation       | Decisions forgotten              | Include in planning docs         |
| Late clarification     | Discovered during implementation | Clarify at planning start        |

## Example: Full Flow

```
User: "We need a search feature for the assets page"

1. translating-intent (interactive) →
   Questions:
   - "What fields should be searchable?"
     [Name/All fields/Custom selection]
   - "Should results be paginated?"
     [Yes with 25/page (Recommended)/No]
   - "Need advanced filters?"
     [Yes/No/Later phase]

   User answers: All fields, Yes with pagination, Later phase

2. Resolved specification:
   {
     "feature": "Asset search",
     "searchable_fields": "all",
     "pagination": { "enabled": true, "default_size": 25 },
     "advanced_filters": "out_of_scope_v1",
     "out_of_scope": ["Advanced filters", "Saved searches"]
   }

3. frontend-lead creates plan with clear scope:
   - Full-text search component
   - Pagination with 25 items/page
   - Filters deferred to v2
```

## Related References

- [clarification-templates.md](clarification-templates.md) - Question formats
- [research-integration.md](research-integration.md) - For research workflows
- [assumption-patterns.md](assumption-patterns.md) - Handling remaining unknowns

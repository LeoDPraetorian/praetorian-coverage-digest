# Assumption Patterns

**How to make implicit assumptions explicit with industry-standard defaults.**

## Overview

When details are missing and clarification isn't practical, document assumptions with reasoning and alternatives. Based on SMART framework and requirements engineering best practices.

## When to Assume vs Ask

| Scenario                                | Action                       |
| --------------------------------------- | ---------------------------- |
| Critical gap, no reasonable default     | **Ask**                      |
| Standard convention exists              | **Assume + Document**        |
| Multiple valid approaches, similar cost | **Recommend + Offer choice** |
| Low-impact preference                   | **Assume default**           |

## Default Standards by Domain

### Security Defaults

When security requirements not specified, assume:

| Aspect                | Default                    | Reasoning            |
| --------------------- | -------------------------- | -------------------- |
| Password hashing      | bcrypt (10+ rounds)        | Industry standard    |
| Session expiry        | 24 hours inactivity        | Balance security/UX  |
| Failed login attempts | Lock after 5 attempts      | OWASP recommendation |
| HTTPS                 | Required for all endpoints | Basic security       |
| Input validation      | Server-side always         | Never trust client   |

### Performance Defaults

| Aspect            | Default     | Reasoning                      |
| ----------------- | ----------- | ------------------------------ |
| API response time | <500ms p95  | Good UX threshold              |
| Page load         | <3 seconds  | User abandonment threshold     |
| Database queries  | <100ms      | Reasonable for indexed queries |
| Concurrent users  | 100 (start) | Scale from baseline            |

### Architecture Defaults

| Aspect         | Default              | Reasoning                    |
| -------------- | -------------------- | ---------------------------- |
| API style      | REST                 | Most common, well-understood |
| Database       | PostgreSQL           | Versatile, widely supported  |
| Auth tokens    | JWT                  | Stateless, scalable          |
| Error handling | Structured responses | Debugging friendly           |

## Documentation Format

For each assumption, document:

```json
{
  "assumption": "Using JWT for authentication",
  "reasoning": "Stateless tokens work well for API-first architecture",
  "alternatives": ["Session-based", "OAuth 2.0"],
  "impact_if_wrong": "Would require auth system redesign",
  "confidence": "medium",
  "source": "Industry best practice for SPAs"
}
```

## Assumption Categories

### 1. Technology Assumptions

```
Assumed: PostgreSQL database
Reasoning: Most versatile relational DB, excellent JSON support
Alternative: MySQL, MongoDB
Validation: Confirm with user if persistence requirements unusual
```

### 2. Scope Assumptions

```
Assumed: MVP scope - core features only
Reasoning: "Add feature X" typically means minimal viable version
Alternative: Full-featured implementation
Validation: Clarify if user mentions "complete" or "full"
```

### 3. User Assumptions

```
Assumed: Technical users comfortable with CLI
Reasoning: Developer tool context
Alternative: GUI for non-technical users
Validation: Ask if "ease of use" mentioned
```

### 4. Integration Assumptions

```
Assumed: Standard REST API integration
Reasoning: Most common integration pattern
Alternative: GraphQL, gRPC, webhooks
Validation: Clarify if "real-time" or "streaming" mentioned
```

## Confidence Levels

| Level  | Criteria                           | Documentation              |
| ------ | ---------------------------------- | -------------------------- |
| High   | Industry standard, low risk        | Brief note                 |
| Medium | Common practice, moderate risk     | Document with reasoning    |
| Low    | Judgment call, could go either way | Document + flag for review |

## Assumption Validation Signals

Watch for signals that invalidate assumptions:

| Signal              | Invalidated Assumption           |
| ------------------- | -------------------------------- |
| "enterprise"        | Consumer-grade security defaults |
| "millions of users" | Small-scale performance defaults |
| "real-time"         | REST API assumption              |
| "compliance"        | Basic security defaults          |
| "legacy system"     | Modern architecture defaults     |

## Output in Analysis

```json
{
  "assumed_requirements": {
    "functional": [
      "User registration with email/password",
      "Session/token management",
      "Password reset via email"
    ],
    "non_functional": [
      "Passwords hashed with bcrypt",
      "Sessions expire after 24 hours",
      "HTTPS required"
    ],
    "assumptions_made": [
      {
        "assumption": "JWT-based authentication",
        "confidence": "medium",
        "reasoning": "API-first design pattern"
      }
    ]
  }
}
```

## Related References

- [gap-analysis.md](gap-analysis.md) - Identifying what's missing
- [clarification-templates.md](clarification-templates.md) - When to ask instead
- [parsing-strategies.md](parsing-strategies.md) - Extracting explicit requirements

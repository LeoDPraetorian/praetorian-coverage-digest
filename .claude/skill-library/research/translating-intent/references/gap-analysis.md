# Gap Analysis

**Systematic identification of missing information in vague requests.**

## Overview

Gap analysis identifies what's NOT said but IS needed for implementation. Research shows inadequate requirements cause ~50% of software defects.

## Gap Categories

Based on ConRAP framework (87% F2 score) and requirements engineering literature:

### 1. Technical Specifications

Missing platform, technology, integration details.

| Gap Type    | Example                                         | Impact                   |
| ----------- | ----------------------------------------------- | ------------------------ |
| Platform    | "mobile app" (iOS? Android? Both?)              | Architecture decision    |
| Technology  | "use a database" (SQL? NoSQL? Which?)           | Stack selection          |
| Integration | "connect to payments" (Stripe? PayPal? Custom?) | Third-party dependencies |
| Scale       | "handle users" (100? 10K? 1M?)                  | Infrastructure design    |

### 2. Business Rules

Unstated logic, validation, workflow requirements.

| Gap Type          | Example Questions               |
| ----------------- | ------------------------------- |
| Validation        | What makes input valid/invalid? |
| Authorization     | Who can perform this action?    |
| State transitions | What triggers status changes?   |
| Edge cases        | What happens when X fails?      |

### 3. Non-Functional Requirements

Performance, security, scalability constraints often omitted.

| Category     | Missing Details            |
| ------------ | -------------------------- |
| Performance  | Response time, throughput  |
| Security     | Authentication, encryption |
| Availability | Uptime, failover           |
| Compliance   | GDPR, SOC2, HIPAA          |

### 4. Ambiguous Terms

Words with multiple valid interpretations (from Perplexity research):

| Vague Term      | Problem      | Clarification Needed           |
| --------------- | ------------ | ------------------------------ |
| "fast"          | Subjective   | "within X milliseconds"        |
| "secure"        | Broad        | "which security requirements?" |
| "user-friendly" | Unmeasurable | "what UX metrics?"             |
| "scalable"      | Undefined    | "to what volume?"              |

## Detection Framework

### Automatic Detection Signals

From AMD framework (SIGKDD 2025) and ConRAP research:

1. **Vagueness indicators:** Adjectives without metrics ("good", "fast", "easy")
2. **Incompleteness markers:** Missing who/what/when/where/why/how
3. **Referential ambiguity:** Pronouns without clear antecedents
4. **Scope ambiguity:** Terms that could mean multiple things

### Gap Detection Checklist

```
[ ] Who - Users, roles, permissions defined?
[ ] What - Features, functionality specified?
[ ] When - Timing, deadlines, triggers clear?
[ ] Where - Platform, environment stated?
[ ] Why - Business value, success criteria defined?
[ ] How - Implementation constraints provided?
```

## Confidence Scoring

From research on semi-automatic requirement analysis:

| Confidence       | Criteria                                | Action                |
| ---------------- | --------------------------------------- | --------------------- |
| High (>0.9)      | No gaps detected, all details present   | Proceed               |
| Medium (0.6-0.9) | Minor gaps, reasonable defaults exist   | State assumptions     |
| Low (<0.6)       | Critical gaps, multiple interpretations | Require clarification |

## Gap Resolution Priority

Based on INVEST criteria (Agile Alliance):

| Priority | Gap Type                    | Resolution                     |
| -------- | --------------------------- | ------------------------------ |
| Critical | Blocks all progress         | Must clarify before proceeding |
| High     | Major architecture decision | Should clarify                 |
| Medium   | Implementation detail       | Clarify or use convention      |
| Low      | Minor preference            | Use reasonable default         |

## Related References

- [parsing-strategies.md](parsing-strategies.md) - Breaking down requests
- [clarification-templates.md](clarification-templates.md) - Asking effective questions
- [assumption-patterns.md](assumption-patterns.md) - Documenting gaps as assumptions

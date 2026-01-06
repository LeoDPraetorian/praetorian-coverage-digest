# Clarification Templates

**Structured question generation with prioritization and options.**

## Overview

Research-backed templates for generating effective clarification questions. Based on ConRAP framework (70% human-useful rate) and funnel technique from customer service.

## The Funnel Technique

Progressive questioning from broad to specific:

```
1. Open Questions     → Understand the issue broadly
2. Probing Questions  → Focus on specifics
3. Closed Questions   → Confirm understanding
```

## Question Templates by Gap Type

### Vagueness (Terms without clear boundaries)

```
Template: "When you say '{vague_term}', what specific {metric_type} do you have in mind?"

Examples:
- "When you say 'fast', what response time are you targeting? (e.g., <100ms, <1s)"
- "When you say 'secure', which security requirements matter most? (encryption, auth, compliance)"
- "When you say 'user-friendly', what success metrics would indicate that? (task completion time, error rate)"
```

### Incompleteness (Missing essential information)

```
Template: "Could you provide more details about {missing_element}? Specifically, {specific_question}"

Examples:
- "Could you provide more details about the users? Specifically, how many concurrent users should we support?"
- "Could you clarify the timeline? When does this need to be delivered?"
- "What happens when the operation fails? Should we retry, notify, or fail silently?"
```

### Referential Ambiguity (Unclear references)

```
Template: "Which {entity_type} are you referring to when you mention '{ambiguous_reference}'?"

Examples:
- "Which database are you referring to when you mention 'the system'? The user DB or analytics DB?"
- "When you say 'update it', which component should be updated?"
- "Which user role does 'they' refer to - admins or regular users?"
```

### Scope Ambiguity (Multiple valid interpretations)

```
Template: "I see multiple valid approaches for {feature}. Would you prefer:
A) {option_a} - {tradeoff_a}
B) {option_b} - {tradeoff_b}
C) {option_c} - {tradeoff_c}"

Examples:
- "For authentication, would you prefer:
   A) JWT tokens - stateless, good for APIs
   B) Session-based - simpler, better for web apps
   C) OAuth - best for third-party integration"
```

## Priority-Based Question Selection

From research on requirement elicitation:

| Priority | When to Ask              | Example                                  |
| -------- | ------------------------ | ---------------------------------------- |
| Critical | Always - blocks progress | "Which platform: iOS, Android, or both?" |
| High     | Usually - major decision | "What authentication method?"            |
| Medium   | If time permits          | "Preferred date format?"                 |
| Low      | Skip - use default       | "Button border radius?"                  |

### Interactive Mode Filter

For `interactive` mode, only ask Critical and High priority questions:

```python
def should_ask(clarification: Clarification) -> bool:
    return clarification.priority in ["critical", "high"]
```

## Question Generation Algorithm

Based on taxonomy-based approaches from ACM research:

```
1. Identify gap type (vagueness, incompleteness, referential, scope)
2. Select appropriate template
3. Fill slots with context-specific details
4. Add options when applicable (scope ambiguity)
5. Include impact statement
6. Assign priority based on implementation impact
```

## Output Format

```json
{
  "priority": "high",
  "gap_type": "scope",
  "question": "Which authentication method should we use?",
  "options": [
    { "label": "JWT tokens", "description": "Stateless, good for APIs" },
    { "label": "Session-based", "description": "Simpler, better for web apps" },
    { "label": "OAuth 2.0", "description": "Best for third-party integration" }
  ],
  "impact": "Determines authentication architecture",
  "default_recommendation": "JWT tokens for API-first design"
}
```

## Anti-Patterns

| Anti-Pattern    | Problem               | Better Approach                       |
| --------------- | --------------------- | ------------------------------------- |
| Ask everything  | Overwhelms user       | Filter by priority                    |
| Vague questions | Gets vague answers    | Use specific templates                |
| No options      | Forces user to think  | Provide multiple-choice when possible |
| No defaults     | Slows decision-making | Recommend based on best practices     |

## Related References

- [gap-analysis.md](gap-analysis.md) - Identifying what to ask about
- [assumption-patterns.md](assumption-patterns.md) - When not to ask
- [research-integration.md](research-integration.md) - Using questions for query expansion

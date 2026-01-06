# Intent Integration Patterns

**How to invoke and use translating-intent skill for query expansion.**

## Overview

The `translating-intent` skill transforms vague research queries into multiple semantic interpretations, enabling comprehensive coverage.

**Mode:** ANALYZE (structured output, no user interaction)

## Invocation Pattern

```
Read(".claude/skill-library/research/translating-intent/SKILL.md")
```

**Provide context about:**

- The user's original research query
- The research goal/purpose
- Any constraints or scope boundaries

## Input Format

**Example user query:** "research authentication patterns"

**Context to provide:**

```
User wants to research authentication patterns for web applications.
Goal: Understand different approaches for securing APIs and SPAs.
Constraints: Focus on modern patterns (post-2020), exclude legacy protocols.
```

## Expected Output Structure

```json
{
  "topic": "authentication-patterns",
  "confidence": 0.7,
  "interpretations": [
    {
      "interpretation": "OAuth 2.0 flows and grant types",
      "scope": "Modern delegated authorization patterns for third-party access",
      "keywords": ["OAuth", "OIDC", "authorization code", "PKCE", "client credentials"],
      "rationale": "Most common interpretation for 'authentication patterns' in modern web apps"
    },
    {
      "interpretation": "JWT token authentication and validation",
      "scope": "Stateless token-based authentication using JSON Web Tokens",
      "keywords": ["JWT", "claims", "signing", "RS256", "validation", "expiration"],
      "rationale": "Alternative to session-based auth, common in microservices"
    },
    {
      "interpretation": "Session-based authentication",
      "scope": "Traditional server-side session management with cookies",
      "keywords": ["session", "cookie", "server-side state", "CSRF protection"],
      "rationale": "Classic approach still used in monolithic applications"
    },
    {
      "interpretation": "Multi-factor authentication (MFA) patterns",
      "scope": "Additional authentication factors beyond username/password",
      "keywords": ["MFA", "2FA", "TOTP", "SMS", "authenticator app", "WebAuthn"],
      "rationale": "Important security enhancement, often combined with primary auth"
    }
  ]
}
```

## Confidence Threshold

**If confidence > 0.9:** Skip interpretation expansion, use literal query

**Why:** High confidence means the query is already specific and unambiguous.

**Example high-confidence queries:**

- "OAuth 2.0 PKCE flow for SPAs"
- "JWT RS256 signing in Node.js"
- "Session fixation prevention in Express.js"

## Using Interpretations in Research

**For each interpretation:**

1. **Extract keywords** for search optimization
2. **Use scope** to set boundaries for research agents
3. **Include rationale** in agent prompt for context
4. **Map to sources** based on keyword patterns

**Example mapping:**

| Interpretation     | Keywords                    | Recommended Sources                |
| ------------------ | --------------------------- | ---------------------------------- |
| OAuth 2.0 flows    | "OAuth", "OIDC", "PKCE"     | Context7 (oauth2), Web, Perplexity |
| JWT authentication | "JWT", "claims", "signing"  | Codebase, GitHub, Context7         |
| Session-based auth | "session", "cookie", "CSRF" | Codebase, Web                      |
| MFA patterns       | "MFA", "TOTP", "WebAuthn"   | arxiv, GitHub, Perplexity          |

## Error Handling

**If translating-intent returns empty interpretations:**

1. Query is too specific (high confidence) → Use literal query
2. Query is too vague (needs more context) → Ask user for clarification
3. Query is out of scope → Inform user, suggest alternative

**If interpretations overlap significantly:**

Merge similar interpretations to avoid redundant research:

```
Before merge:
- "OAuth 2.0 flows"
- "OAuth 2.0 authorization code flow"
- "OAuth 2.0 PKCE"

After merge:
- "OAuth 2.0 flows (authorization code, PKCE, client credentials)"
```

## Integration with Phase 2 (User Review)

**After receiving interpretations from Phase 1:**

Phase 2 presents queries to the user for review before spawning agents. This two-step flow ensures users control what gets researched.

### Step 1: Query Selection

Present interpretations from Phase 1 as selectable queries:

**IF ≤4 queries:**

- Single question with all queries as options
- User can deselect queries they don't want researched
- User can add custom queries via 'Other'

**IF >4 queries:**

- Split into Design + Operations questions (up to 4 each)
- Categorize interpretations by theme (architecture vs performance)
- User can deselect or add custom queries in either category

### Step 2: Research Method Selection

**Fixed questions (always asked):**

1. Code sources (Local Codebase, GitHub, Context7)
2. Web sources (Perplexity, Classic Web, arxiv)

**Default assumption:** All options selected unless user deselects.

### Building the Research Matrix

After user responds:

1. Extract selected queries (with keywords/scope from Phase 1)
2. Add any custom queries from 'Other' responses
3. Extract selected research methods
4. Cross-multiply: (selected queries) × (selected sources)
5. Result: N agents = (queries) × (sources)

**Example:** 3 selected queries × 4 selected sources = 12 parallel agents

### Dynamic Query Splitting Logic

```python
if len(interpretations) <= 4:
    # Single query question
    questions = [
        {
            "header": "Queries",
            "question": "Which queries do you want to research?",
            "multiSelect": True,
            "options": [
                {
                    "label": interp["interpretation"],
                    "description": f"{interp['scope']} - {', '.join(interp['keywords'][:3])}"
                }
                for interp in interpretations
            ]
        },
        # ... code sources question
        # ... web sources question
    ]
else:
    # Split into Design + Operations
    design_queries = [i for i in interpretations if is_design_related(i)]
    ops_queries = [i for i in interpretations if is_operations_related(i)]

    questions = [
        {
            "header": "Design",
            "question": "Which design aspects do you want to research?",
            "multiSelect": True,
            "options": [format_option(q) for q in design_queries[:4]]
        },
        {
            "header": "Operations",
            "question": "Which operational aspects do you want to research?",
            "multiSelect": True,
            "options": [format_option(q) for q in ops_queries[:4]]
        },
        # ... code sources question
        # ... web sources question
    ]
```

### Categorization Heuristics

**Design-related keywords:** architecture, protocol, pattern, structure, interface, language, parsing, semantic

**Operations-related keywords:** performance, deployment, testing, monitoring, caching, optimization, scaling

## Edge Cases

### Single Interpretation with High Confidence

```json
{
  "topic": "oauth-pkce-flow",
  "confidence": 0.95,
  "interpretations": [
    {
      "interpretation": "OAuth 2.0 Authorization Code Flow with PKCE",
      "scope": "Specific OAuth flow for native and SPA applications",
      "keywords": ["OAuth", "PKCE", "authorization code", "code verifier"]
    }
  ]
}
```

**Action:** Skip interpretation expansion, proceed directly to source selection with single interpretation.

### Multiple Similar Interpretations

If interpretations are very similar (>80% keyword overlap), suggest merging to user before spawning agents.

### No Clear Interpretation

If translating-intent cannot derive meaningful interpretations, fall back to `researching-skills` sequential workflow with user guidance.

## Example Integration Code

```markdown
## Phase 1: Intent Expansion

Read(".claude/skill-library/research/translating-intent/SKILL.md")

User query: "research authentication patterns"
Context: Web application security, modern patterns, API/SPA focus

[Wait for translating-intent output]

Received 4 interpretations:

1. OAuth 2.0 flows (confidence: 0.85)
2. JWT authentication (confidence: 0.80)
3. Session-based auth (confidence: 0.75)
4. MFA patterns (confidence: 0.70)

Proceeding to Phase 2 (Source Selection)...
```

## Related Patterns

- **Sequential research**: Use `researching-skills` if intent expansion not needed
- **Direct research**: If query is already specific, skip expansion and spawn agents directly
- **Iterative expansion**: If initial interpretations insufficient, re-run translating-intent with refined context

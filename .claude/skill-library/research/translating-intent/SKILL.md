---
name: translating-intent
description: Use when user requests are vague, incomplete, or contain implicit assumptions that need to be made explicit before work can begin - transforms ambiguous requests into structured specifications with gap analysis, assumption documentation, and prioritized clarification questions. Supports two modes 'analyze' for structured output (composable with research/automation) and 'interactive' for user-guided clarification via AskUserQuestion
allowed-tools: Read, Write, TodoWrite, AskUserQuestion
---

# Translating Intent

**Transform vague requests into structured specifications with semantic decomposition and gap analysis.**

## When to Use

Use this skill when:

- User provides vague or incomplete requests
- Research skills need diverse query interpretations
- Implementation planning requires clear requirements
- Ambiguous terms need semantic expansion
- Multiple valid interpretations exist for a request

**Key Principle:** Make implicit assumptions explicit. Generate ALL valid interpretations rather than collapsing to one.

**You MUST use TodoWrite** before starting to track phases (parse, analyze, generate output).

## Quick Reference

| Mode            | Purpose                     | Output                    | User Interaction |
| --------------- | --------------------------- | ------------------------- | ---------------- |
| **analyze**     | Query expansion, automation | JSON with interpretations | None             |
| **interactive** | Requirement gathering       | Resolved specification    | AskUserQuestion  |

## Core Capabilities

### 1. Parse & Decompose

Break requests into functional components:

- Extract explicit requirements
- Identify implicit requirements
- Map dependencies between components
- Detect core objective vs subsidiary goals

**See:** [references/parsing-strategies.md](references/parsing-strategies.md)

### 2. Identify Gaps

Flag missing information:

- Technical specifications (platforms, technologies, integrations)
- Business rules and constraints
- Unstated assumptions about roles, permissions, workflows
- Performance, security, scalability requirements
- Ambiguous terms with multiple interpretations

**See:** [references/gap-analysis.md](references/gap-analysis.md)

### 3. Document Assumptions

Make implicit explicit:

- Default to industry standards when details missing
- Document reasoning for each assumption
- Provide alternatives with trade-offs
- Security-first considerations

**See:** [references/assumption-patterns.md](references/assumption-patterns.md)

### 4. Generate Clarifications

Create prioritized questions:

- Priority: critical | high | medium | low
- Multiple-choice options when possible
- Impact assessment for each question
- Default recommendations based on best practices

**See:** [references/clarification-templates.md](references/clarification-templates.md)

## Execution Modes

### Mode: analyze (default)

**Purpose:** Generate multiple interpretations for research query expansion.

**Behavior:**

- Parse request into all valid semantic interpretations
- No user interaction - output structured JSON
- Enable callers to explore full interpretation space

**Use for:**

- Research skills generating diverse queries
- Batch processing multiple requests
- Automated workflows requiring semantic variants

**Example:**

```json
Input: "research authentication"

Output JSON:
{
  "original_request": "research authentication",
  "interpretations": [
    {
      "interpretation": "OAuth 2.0 authentication flows",
      "scope": "Third-party authorization",
      "keywords": ["oauth", "authorization", "third-party"]
    },
    {
      "interpretation": "JWT token-based authentication",
      "scope": "Stateless session management",
      "keywords": ["jwt", "tokens", "stateless"]
    },
    {
      "interpretation": "Multi-factor authentication (MFA)",
      "scope": "Enhanced security verification",
      "keywords": ["mfa", "2fa", "verification"]
    }
  ],
  "clarification_needed": [...]
}
```

### Mode: interactive

**Purpose:** Resolve ambiguity with user before proceeding.

**Behavior:**

- Ask critical/high priority clarifications via AskUserQuestion
- Skip low priority questions (use defaults)
- Return fully resolved specification

**Use for:**

- Implementation planning
- Requirement gathering
- Design phases requiring human judgment

**Example:**

```yaml
Input: "add authentication to the app"

AskUserQuestion:
  Question: "Which authentication method should be used?"
  Options:
    - JWT with refresh tokens (Recommended)
    - Session-based
    - OAuth 2.0
    - Basic Auth

Output JSON:
{
  "original_request": "add authentication to the app",
  "resolved_requirements": {
    "auth_method": "JWT with refresh tokens",
    "features": ["login", "logout", "password reset"],
    ...
  }
}
```

## Output Format

### Analyze Mode Output

```json
{
  "original_request": "string",
  "interpretations": [
    {
      "interpretation": "string",
      "scope": "string",
      "keywords": ["array"],
      "assumed_requirements": {
        "functional": ["array"],
        "non_functional": ["array"]
      }
    }
  ],
  "clarification_needed": [
    {
      "priority": "critical|high|medium|low",
      "ambiguity_type": "vagueness|incompleteness|referential|scope",
      "question": "string",
      "options": ["array"],
      "impact": "string",
      "default_recommendation": "string"
    }
  ],
  "confidence": 0.85,
  "out_of_scope": ["array"]
}
```

### Interactive Mode Output

```json
{
  "original_request": "string",
  "interpretation": "string",
  "resolved_requirements": {
    "functional": ["array"],
    "non_functional": ["array"],
    "technical": ["array"]
  },
  "user_selections": {
    "question_id": "selected_option"
  },
  "out_of_scope": ["array"]
}
```

## Integration Points

### Research Skills

**Pattern:** Use analyze mode to generate diverse search queries.

```text
1. User: "research rate limiting"
2. translating-intent (analyze mode) →
   {
     interpretations: [
       "algorithm-based rate limiting",
       "distributed rate limiting",
       "API gateway rate limiting"
     ]
   }
3. Research skill generates queries for EACH interpretation:
   - "token bucket algorithm"
   - "redis distributed rate limiting"
   - "nginx rate limiting"
```

**See:** [references/research-integration.md](references/research-integration.md)

### Implementation Planning

**Pattern:** Use interactive mode to clarify before architecture/coding.

```text
1. User: "add user authentication"
2. translating-intent (interactive mode) →
   Ask: Which auth method?
   Ask: Should support MFA?
3. Return resolved spec to implementation workflow
```

**See:** [references/planning-integration.md](references/planning-integration.md)

## Workflow

### Phase 1: Parse Request

1. Extract core objective
2. Identify subsidiary goals
3. Map explicit requirements
4. Detect implicit assumptions

### Phase 2: Ambiguity Detection & Categorization

Analyze request for four ambiguity types:

| Type               | Indicators                          | Example                                 |
| ------------------ | ----------------------------------- | --------------------------------------- |
| **Vagueness**      | Adjectives without metrics          | "fast", "secure", "user-friendly"       |
| **Incompleteness** | Missing who/what/when/where/why/how | No deadline, no platform specified      |
| **Referential**    | Pronouns without clear antecedents  | "it", "that system", "they"             |
| **Scope**          | Multiple valid interpretations      | "authentication" could be OAuth/JWT/MFA |

**Confidence scoring:**

| Confidence       | Criteria                                   | Action                        |
| ---------------- | ------------------------------------------ | ----------------------------- |
| High (>0.9)      | No ambiguity detected, all details present | Proceed without clarification |
| Medium (0.6-0.9) | Minor gaps, reasonable defaults exist      | Document assumptions          |
| Low (<0.6)       | Critical gaps, multiple interpretations    | Require clarification         |

**See:** [references/gap-analysis.md](references/gap-analysis.md)

### Phase 3: Semantic Decomposition

1. Generate all valid interpretations
2. For each interpretation:
   - Define scope boundaries
   - Extract relevant keywords
   - Document assumptions
   - Assign confidence level

### Phase 4: Clarification Generation

For each detected ambiguity:

1. **Categorize ambiguity type:**
   - Vagueness: Terms without clear boundaries
   - Incompleteness: Missing essential information
   - Referential: Unclear references
   - Scope: Multiple valid interpretations

2. **Generate targeted question** using appropriate template
3. **Assign priority** based on implementation impact
4. **Provide options** when multiple approaches valid
5. **Include default recommendation**

**See:** [references/clarification-templates.md](references/clarification-templates.md)

### Phase 5: Generate Output

**If analyze mode:**

- Return JSON with all interpretations
- Include clarifications as structured data
- No user interaction

**If interactive mode:**

- Filter clarifications by priority
- Ask critical/high priority questions via AskUserQuestion
- Apply defaults for low priority
- Return resolved specification

## Key Principles

1. **Default to Standards** - When details missing, use industry best practices
2. **Prioritize by Impact** - Critical questions block work, low questions use defaults
3. **Provide Trade-offs** - Multiple options with pros/cons, not single answers
4. **Security First** - Include security considerations even when not mentioned
5. **Document Uncertainty** - "appears to" vs "definitely"
6. **Preserve Interpretations** - In analyze mode, generate ALL valid paths
7. **Selective Interaction** - In interactive mode, only ask high-priority questions

## Common Scenarios

### Vague Research Request

**Input:** "research databases"

**Analyze Mode Output:**

- SQL databases (relational patterns)
- NoSQL databases (document/key-value/graph)
- Time-series databases
- Vector databases (embeddings)

**Usage:** Research skill generates queries across ALL database types.

### Incomplete Feature Request

**Input:** "add caching"

**Interactive Mode:**

- Ask: Which caching strategy? (Redis/In-memory/CDN)
- Ask: What data to cache? (API responses/User sessions/Static assets)
- Return: Resolved specification with defaults for unasked questions

### Multiple Valid Approaches

**Input:** "improve performance"

**Analyze Mode Output:**

- Frontend optimization (bundling, lazy loading)
- Backend optimization (caching, database indexes)
- Infrastructure optimization (CDN, load balancing)

## Anti-Patterns

| Anti-Pattern                      | Why It's Wrong                                     |
| --------------------------------- | -------------------------------------------------- |
| Collapse to single interpretation | Loses semantic richness for research/planning      |
| Skip gap analysis                 | Missing specs cause implementation delays          |
| Ask all clarifications            | Overwhelms user, most have reasonable defaults     |
| Ignore security                   | Security should be default consideration           |
| Use colloquial terms only         | Research needs both colloquial and technical terms |

## Related Skills

| Skill                      | Access Method                     | Purpose                                   |
| -------------------------- | --------------------------------- | ----------------------------------------- |
| **orchestrating-research** | `skill: "orchestrating-research"` | Consumes analyze mode output for research |
| **brainstorming**          | `skill: "brainstorming"`          | Design refinement after clarification     |
| **engineering-prompts**    | `skill: "engineering-prompts"`    | Prompt optimization patterns              |
| **using-skills**           | `skill: "using-skills"`           | Skill discovery workflow                  |

## Changelog

See `.history/CHANGELOG` for historical changes.

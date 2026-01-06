# Research Integration

**How research skills consume analyze mode output for query generation.**

## Overview

Integration pattern for `researching-skills` to use `translating-intent` for semantic query expansion. Based on AMD framework (SIGKDD 2025) and Query2Doc patterns.

## Problem Statement

Current research skills use template-based query generation:

- Broad → Specific → Niche pattern
- Static terminology mapping
- Single interpretation path

**Result:** Misses semantic richness when topic is ambiguous.

## Solution: Intent Analysis → Query Expansion

```
1. User: "research authentication"
2. translating-intent (analyze mode) →
   {
     "interpretations": [
       {"interpretation": "OAuth 2.0 flows", "keywords": ["oauth", "authorization"]},
       {"interpretation": "JWT tokens", "keywords": ["jwt", "stateless"]},
       {"interpretation": "MFA", "keywords": ["mfa", "2fa", "totp"]},
       {"interpretation": "Basic auth", "keywords": ["basic", "credentials"]}
     ]
   }
3. Research skill generates queries for EACH interpretation
4. Broader coverage → Better synthesis
```

## Integration Workflow

### Step 1: Invoke translating-intent

```
Read(".claude/skill-library/research/translating-intent/SKILL.md")

# Apply analyze mode
input: "research {topic}"
mode: "analyze"
```

### Step 2: Process Interpretations

```python
def expand_queries(analysis: IntentAnalysis) -> List[str]:
    queries = []
    for interp in analysis.interpretations:
        # Generate queries per interpretation
        queries.append(interp.interpretation)
        queries.extend(interp.keywords)
        # Add combinations
        queries.append(f"{analysis.original_request} {interp.interpretation}")
    return queries
```

### Step 3: Execute Research Per Interpretation

For each interpretation, run the research pipeline:

- Generate 2-3 queries from keywords
- Execute across selected sources (GitHub, arxiv, Web)
- Tag results with source interpretation

### Step 4: Synthesize Across Interpretations

Combine findings, noting which interpretation each finding supports.

## Integration Points

### With researching-skills (Router)

```
researching-skills workflow:
1. [NEW] Invoke translating-intent for topic analysis
2. [NEW] Generate queries from interpretations
3. [EXISTING] Execute sources sequentially
4. [ENHANCED] Synthesize with interpretation context
```

### With Individual Research Skills

Each research skill receives expanded queries:

```
researching-github:
  Query 1: "OAuth 2.0 implementation"
  Query 2: "JWT authentication library"
  Query 3: "multi-factor authentication"
  (instead of just "authentication")
```

## Configuration

### Enable/Disable Expansion

```yaml
research_config:
  use_intent_analysis: true # Enable semantic expansion
  max_interpretations: 4 # Limit query explosion
  min_confidence: 0.6 # Filter low-confidence interpretations
```

### When to Skip Expansion

- Topic is already specific ("TanStack Query v5 migration")
- User provided explicit constraints ("only OAuth 2.0")
- Single interpretation with high confidence

## Expected Benefits

| Metric                  | Without Expansion | With Expansion       |
| ----------------------- | ----------------- | -------------------- |
| Query coverage          | Single path       | Multiple paths       |
| Result diversity        | Narrow            | Broad                |
| Synthesis depth         | Surface           | Cross-interpretation |
| Missed relevant results | Common            | Reduced              |

## Research Basis

- **AMD Framework (SIGKDD 2025):** Multi-agent Socratic questioning improves query diversity
- **Query2Doc:** Pseudo-document generation expands semantic coverage
- **Aligned Query Expansion:** 70% efficiency gain when aligned with user intent

## Anti-Patterns

| Anti-Pattern     | Problem                                | Solution                            |
| ---------------- | -------------------------------------- | ----------------------------------- |
| Over-expansion   | Too many queries, noise                | Limit to top 4 interpretations      |
| No filtering     | Low-quality interpretations included   | Apply confidence threshold          |
| Serial execution | Slow research                          | Parallel queries per interpretation |
| No attribution   | Can't trace findings to interpretation | Tag results with source             |

## Example: Full Flow

```
User: "Research rate limiting for our API"

1. translating-intent (analyze) →
   interpretations:
   - "Token bucket algorithm" (algorithmic)
   - "Distributed rate limiting" (architecture)
   - "API gateway rate limiting" (infrastructure)
   - "Rate limit headers" (standards)

2. Query expansion →
   GitHub: ["token bucket golang", "distributed rate limiter redis", "nginx rate limiting"]
   arxiv: ["rate limiting algorithms", "distributed systems throttling"]
   Web: ["API rate limiting best practices", "rate limit response headers"]

3. Execute all queries across sources

4. Synthesis →
   "Rate limiting approaches vary by layer:
   - Algorithm: Token bucket most common (GitHub: uber-go/ratelimit)
   - Architecture: Redis for distributed (Paper: 2023.xxxxx)
   - Infrastructure: API gateways handle at edge
   - Standards: RFC 6585 defines headers"
```

## Related References

- [parsing-strategies.md](parsing-strategies.md) - How requests are decomposed
- [planning-integration.md](planning-integration.md) - Integration with implementation planning

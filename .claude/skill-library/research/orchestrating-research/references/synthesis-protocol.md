# Synthesis Protocol

**Cross-referencing and conflict detection patterns for research results.**

## Overview

Synthesis transforms individual agent findings into actionable intelligence by:

1. Grouping results by interpretation
2. Merging findings within each interpretation
3. Identifying cross-interpretation patterns
4. Detecting conflicts between sources
5. Highlighting knowledge gaps

## Phase 4: Synthesis Workflow

### Step 1: Group by Interpretation

**Goal:** Organize all agent results by the interpretation they researched

**Example structure:**

```
Interpretation 1: OAuth 2.0 flows
  ├─ codebase-researcher results
  ├─ github-researcher results
  ├─ perplexity-researcher results
  └─ context7-researcher results

Interpretation 2: JWT authentication
  ├─ codebase-researcher results
  ├─ github-researcher results
  └─ perplexity-researcher results

Interpretation 3: Session-based authentication
  ├─ codebase-researcher results
  └─ web-researcher results
```

**Implementation:**

```javascript
const groupedResults = {};

for (const agent of agentResults) {
  const interpretation = agent.interpretation;
  if (!groupedResults[interpretation]) {
    groupedResults[interpretation] = [];
  }
  groupedResults[interpretation].push(agent);
}
```

### Step 2: Merge Within Interpretation

**Goal:** Combine findings from all sources for each interpretation

**For each interpretation:**

1. **Extract key findings** from all sources
2. **Deduplicate** similar findings (>80% semantic overlap)
3. **Rank by confidence** (sources with higher confidence weighted more)
4. **Merge patterns** (combine similar patterns, note frequency)
5. **Aggregate sources** (full citation list)

**Example merge:**

```
Interpretation: OAuth 2.0 flows

Source 1 (codebase): "Use PKCE for SPAs to prevent authorization code interception"
Source 2 (github): "PKCE is required for public clients (SPAs, mobile apps)"
Source 3 (perplexity): "RFC 8252 mandates PKCE for native apps, recommended for SPAs"

Merged finding: "PKCE is required for native apps (RFC 8252) and strongly recommended for SPAs to prevent authorization code interception attacks (mentioned by 3/3 sources, high confidence)"
```

### Step 3: Cross-Reference Patterns

**Goal:** Identify themes appearing across multiple interpretations

**Look for:**

- Common security practices (e.g., "always validate tokens")
- Shared implementation patterns (e.g., "store tokens in httpOnly cookies")
- Universal trade-offs (e.g., "stateless vs stateful auth")

**Example:**

```
Cross-Interpretation Pattern: Token Storage Security

Found in:
- OAuth 2.0 flows: "Store access tokens in memory, refresh tokens in httpOnly cookies"
- JWT authentication: "Never store tokens in localStorage, prefer httpOnly cookies"
- Session-based auth: "Use httpOnly cookies with SameSite=Strict"

Pattern: Across all authentication patterns, httpOnly cookies are preferred over localStorage for security (prevents XSS attacks). 3/3 interpretations agree.
```

### Step 4: Detect Conflicts

**Goal:** Identify disagreements between sources

**Conflict types:**

1. **Direct contradiction**: Source A says X, Source B says NOT X
2. **Trade-off disagreement**: Source A prefers X, Source B prefers Y
3. **Context-dependent**: Source A says X (in context C1), Source B says Y (in context C2)

**How to detect:**

- Flag findings with opposing recommendations
- Note sources that use words like "never" vs "prefer" for same topic
- Identify conditional statements that contradict

**Example conflicts:**

```
## Conflict: JWT Expiration Strategy

Source 1 (codebase): "Use 15-minute access token expiration for maximum security"
Source 2 (github): "1-hour expiration is standard, 15 minutes causes too many refresh cycles"
Source 3 (arxiv paper): "Optimal expiration is 4 hours based on usability studies"

Analysis: No consensus on JWT expiration times. Trade-off between security (shorter = better) and UX (longer = fewer interruptions). Context matters: financial apps use shorter (15-60 min), SaaS apps use longer (1-4 hours).

Recommendation: Choose based on security requirements and user tolerance for re-authentication.
```

### Step 5: Executive Summary

**Goal:** 2-3 paragraphs synthesizing ALL findings

**Structure:**

1. **Paragraph 1**: Overall landscape (what interpretations were researched, main takeaways)
2. **Paragraph 2**: Key insights and strong consensus areas
3. **Paragraph 3**: Open questions, conflicts, and knowledge gaps

**Example:**

```
# Executive Summary

This research explored three interpretations of authentication patterns: OAuth 2.0 flows, JWT-based authentication, and session-based authentication. We synthesized findings from 12 research agents across codebase, GitHub, and Perplexity sources. The research revealed strong industry consensus on modern best practices for SPAs and APIs, but significant disagreement on token expiration strategies.

OAuth 2.0 with PKCE emerged as the clear winner for third-party delegated authentication, with all sources agreeing this is the current best practice for SPAs and native applications. JWT authentication is widely used for stateless APIs, with strong consensus on signing algorithms (RS256 preferred over HS256 for production) and storage mechanisms (httpOnly cookies strongly preferred over localStorage). Session-based authentication remains relevant for traditional server-rendered applications, particularly in monolithic architectures.

Key areas of disagreement include optimal token expiration times (ranging from 15 minutes to 4 hours depending on security posture), whether to use refresh token rotation (security vs complexity trade-off), and the role of MFA (essential vs optional depending on threat model). Notable knowledge gaps include limited coverage of WebAuthn integration patterns and lack of performance benchmarks comparing authentication approaches at scale.
```

### Step 6: Generate Recommendations

**Goal:** Prioritized next steps based on findings

**Criteria for prioritization:**

1. **Impact**: High-impact gaps or decisions
2. **Confidence**: Low-confidence areas need more research
3. **Urgency**: Security-critical items first

**Format:**

```
# Recommendations

1. **[HIGH PRIORITY]** Implement OAuth 2.0 with PKCE for SPA authentication
   - Strong consensus across all sources
   - Modern best practice, addresses security vulnerabilities in implicit flow
   - Action: Use authorization code flow + PKCE, store tokens in httpOnly cookies

2. **[MEDIUM PRIORITY]** Research optimal token expiration strategy for your use case
   - No consensus found (range: 15 min to 4 hours)
   - Depends on security requirements and user tolerance
   - Action: Run A/B test comparing 15min, 30min, 1hr expiration times

3. **[LOW PRIORITY]** Evaluate WebAuthn for passwordless authentication
   - Limited coverage in research (knowledge gap)
   - Emerging standard, growing browser support
   - Action: Run focused research on WebAuthn integration patterns
```

## Conflict Detection Strategies

### Strategy 1: Keyword Analysis

Flag findings containing opposing terms:

- "always" vs "never" for same topic
- "required" vs "optional"
- "recommended" vs "avoid"
- "best practice" vs "anti-pattern"

### Strategy 2: Confidence Disagreement

If confidence scores diverge significantly for same finding:

- Source A: "OAuth is best" (confidence: 0.9)
- Source B: "OAuth has issues" (confidence: 0.8)

→ Investigate why confidence differs

### Strategy 3: Temporal Analysis

Check publication dates (if available):

- Older sources may reflect outdated practices
- Newer sources reflect current consensus
- Note evolution of recommendations over time

**Example:**

```
## Conflict: Implicit Flow Usage

Source 1 (2019 blog): "Implicit flow is recommended for SPAs"
Source 2 (2023 RFC): "Implicit flow is deprecated, use authorization code + PKCE"

Analysis: This is NOT a conflict, it's temporal evolution. OAuth 2.0 best practices changed in 2019-2020. The newer recommendation supersedes the older one.

Resolution: Use authorization code + PKCE (current best practice as of 2023+).
```

## Knowledge Gap Identification

**What constitutes a knowledge gap?**

1. **No sources found** for an interpretation × source combination
2. **Low confidence** across all sources (<0.5)
3. **Explicit mentions** of "unknown", "unclear", "needs research"
4. **Missing edge cases** not covered by any source

**How to document:**

```
# Knowledge Gaps

1. **WebAuthn Integration Patterns**
   - Only 1/6 sources mentioned WebAuthn
   - No concrete implementation examples found
   - Recommendation: Run focused research on WebAuthn

2. **Performance at Scale**
   - No benchmarks found comparing OAuth vs JWT vs sessions
   - Unknown: Memory overhead of token validation at 100K RPS
   - Recommendation: Search for performance studies or run own benchmarks

3. **Multi-Region Token Synchronization**
   - Global SaaS apps face token sync challenges
   - No sources covered this edge case
   - Recommendation: Research distributed session management patterns
```

## Synthesis Output Structure

```markdown
# Research Synthesis: {Topic}

## Executive Summary

[2-3 paragraphs synthesizing all findings]

## Findings by Interpretation

### Interpretation 1: {Name}

#### Key Findings

- Finding 1 (confidence: X, sources: Y)
- Finding 2 (confidence: X, sources: Y)
- ...

#### Patterns Observed

- Pattern 1: [Description] (found in: sources X, Y, Z)
- Pattern 2: [Description] (found in: sources A, B)

#### Source-Specific Insights

- Codebase: [What was unique to local code]
- GitHub: [What open source revealed]
- Perplexity: [What web search found]

### Interpretation 2: {Name}

[Same structure...]

## Cross-Interpretation Patterns

[Themes appearing across multiple interpretations]

## Conflicts & Discrepancies

### Conflict 1: {Topic}

- Source A: [Position]
- Source B: [Opposing position]
- Analysis: [Why they disagree]
- Resolution: [How to decide]

## Knowledge Gaps

1. [Gap 1 with recommendation]
2. [Gap 2 with recommendation]

## Recommendations

1. **[Priority Level]** Recommendation 1
   - Rationale
   - Action items

## Full Citations

### Codebase Sources

- file.ts (line numbers or function names)

### GitHub Sources

- [Repo name](URL)
- [Issue #123](URL)

### Web Sources

- [Blog post title](URL)
- [Documentation](URL)

### Academic Sources

- [Paper title](arxiv URL)
```

## Anti-Patterns

| Anti-Pattern                | Why It's Wrong                       | Correct Approach                            |
| --------------------------- | ------------------------------------ | ------------------------------------------- |
| Concatenating agent outputs | No synthesis, just raw data          | Merge, cross-reference, detect conflicts    |
| Ignoring conflicts          | Presents false consensus             | Explicitly flag and analyze disagreements   |
| No prioritization           | Treats all findings equally          | Rank by confidence, impact, urgency         |
| Missing knowledge gaps      | Doesn't highlight what's unknown     | Document gaps, recommend follow-up research |
| Generic recommendations     | "Do more research" without specifics | Specific, actionable next steps             |

## Related Patterns

- **Confidence scoring**: Weight findings by source confidence
- **Temporal analysis**: Newer sources generally supersede older ones
- **Context extraction**: Understand WHY sources disagree (different contexts)

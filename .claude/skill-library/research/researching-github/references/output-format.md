# Output Format Template

Standard synthesis format for researching-github findings.

## Template Structure

```markdown
## GitHub Research: {topic}

**Date:** {YYYY-MM-DD}
**Tool Used:** gh CLI / Web Fallback
**Purpose:** {brief description of research goal}

### Search Summary

- **Queries Executed:**
  1. {query1-text} - {N} results
  2. {query2-text} - {N} results
  3. {query3-text} - {N} results
- **Total Results:** {count before filtering}
- **Filtered Results:** {count after quality assessment}
- **Assessment Criteria:** Stars, activity, license, documentation

### Top Repositories

**1. {owner}/{repo-name}** ✅ High Quality

- **Stars:** {count} | **Forks:** {count} | **License:** {license-name}
- **Last Updated:** {YYYY-MM-DD} ({human-readable duration ago})
- **URL:** https://github.com/{owner}/{repo}
- **Description:** {one-line repository description}
- **Relevance:** {why this repo matters for the current research task}
- **Key Features:**
  - {feature1 from README}
  - {feature2 from README}
  - {feature3 from README}
- **Key Files:** {list of relevant files to examine}
  - {path/to/file1.ext} - {what it contains}
  - {path/to/file2.ext} - {what it contains}
- **Dependencies:** {major dependencies}
- **Notes:** {any caveats, limitations, or special considerations}

**2. {owner}/{repo-name}** ⚠️ Medium

- **Stars:** {count} | **Forks:** {count} | **License:** {license-name}
- **Last Updated:** {YYYY-MM-DD} ({duration ago})
- **URL:** https://github.com/{owner}/{repo}
- **Description:** {one-line description}
- **Relevance:** {why this repo is relevant}
- **Key Features:**
  - {feature1}
  - {feature2}
- **Key Files:** {relevant files}
- **Notes:** {caveats}

**3. {owner}/{repo-name}** 🔍 Evaluate

... (repeat pattern)

### Code Patterns Found (if code search performed)

**Pattern 1: {pattern-name}**

- **Repository:** {owner}/{repo}
- **File:** {path/to/file.ext}
- **Signature:** \`{durable reference - function signature, not line numbers}\`
- **Usage Context:** {how this pattern is used in the codebase}
- **Example:**
  \`\`\`language
  {minimal code snippet showing pattern}
  \`\`\`

**Pattern 2: {pattern-name}**

... (repeat)

**Summary Table:**

| Pattern    | Repository  | File           | Signature            |
| ---------- | ----------- | -------------- | -------------------- |
| {pattern1} | owner/repo1 | path/file1.ext | \`func Name(...)\`   |
| {pattern2} | owner/repo2 | path/file2.ext | \`type Name struct\` |

### Issues/Discussions (if searched)

| Title              | Repository | Status | Comments | Created    | URL   |
| ------------------ | ---------- | ------ | -------- | ---------- | ----- |
| {issue-title}      | owner/repo | open   | {count}  | YYYY-MM-DD | {url} |
| {discussion-title} | owner/repo | closed | {count}  | YYYY-MM-DD | {url} |

**Notable findings:**

- {insight from issues, e.g., "Common bug: timeout handling in v2.x"}
- {insight from discussions, e.g., "Migration guide available in #123"}

### Recommendations

1. **Primary Choice:** {owner}/{repo}
   - **Why:** {specific reasons this is the best option}
   - **Use Case:** {when to use this}
   - **Getting Started:** {installation/quickstart link}

2. **Alternative Approach:** {owner}/{repo2}
   - **Why:** {why this is a viable alternative}
   - **Trade-offs:** {what you gain/lose vs primary choice}
   - **Use Case:** {when this is better than primary}

3. **Caveats:**
   - {known limitation 1}
   - {known limitation 2}
   - {compatibility consideration}

4. **Next Steps:**
   - {actionable step 1}
   - {actionable step 2}
   - {actionable step 3}

### Implementation Guidance

**Common Pattern Across Repositories:**

{description of pattern that appears in multiple high-quality repos}

\`\`\`language
{example implementation pattern}
\`\`\`

**Shared Dependencies:**

- {dependency1} - {what it's used for}
- {dependency2} - {what it's used for}

**Best Practices (from high-quality repos):**

1. {best practice 1 observed across repos}
2. {best practice 2}
3. {best practice 3}

**Anti-Patterns (from issues/archived repos):**

- ❌ {anti-pattern 1} - {why it's problematic}
- ❌ {anti-pattern 2} - {issue reference if available}

**Testing Patterns:**

{how top repos structure their tests}

**Configuration Patterns:**

{how top repos handle configuration}
```

## Example (Real)

```markdown
## GitHub Research: Rate Limiting in Go

**Date:** 2024-12-30
**Tool Used:** gh CLI
**Purpose:** Find production-ready rate limiting libraries for Go HTTP middleware

### Search Summary

- **Queries Executed:**
  1. `rate limiting go` - 156 results
  2. `rate limiting golang middleware` - 42 results
  3. `token bucket rate limit go` - 28 results
- **Total Results:** 226
- **Filtered Results:** 8 (after quality assessment)
- **Assessment Criteria:** Stars >100, active in last year, MIT/Apache license

### Top Repositories

**1. uber-go/ratelimit** ✅ High Quality

- **Stars:** 4,234 | **Forks:** 298 | **License:** MIT
- **Last Updated:** 2024-12-15 (2 weeks ago)
- **URL:** https://github.com/uber-go/ratelimit
- **Description:** A Golang blocking leaky-bucket rate limiter
- **Relevance:** Production-tested at Uber, simple API, goroutine-safe
- **Key Features:**
  - Leaky bucket algorithm
  - Blocking rate limiter
  - Zero allocations
  - Thread-safe
- **Key Files:**
  - `ratelimit.go` - Core rate limiter implementation
  - `clock.go` - Time abstraction for testing
  - `example_test.go` - Usage examples
- **Dependencies:** None (stdlib only)
- **Notes:** Simple, battle-tested, but only supports leaky bucket

**2. golang/time/rate** ⚠️ Medium

- **Stars:** Official Go package (included in golang.org/x/time)
- **Last Updated:** 2024-11-20 (1 month ago)
- **URL:** https://pkg.go.dev/golang.org/x/time/rate
- **Description:** Official Go rate limiter using token bucket
- **Relevance:** Official package, widely used, token bucket algorithm
- **Key Features:**
  - Token bucket algorithm
  - Burst support
  - Wait() and Allow() methods
- **Key Files:** Part of golang.org/x/time, see pkg.go.dev docs
- **Notes:** Official but less ergonomic than third-party options

### Code Patterns Found

**Pattern 1: Leaky Bucket Rate Limiter**

- **Repository:** uber-go/ratelimit
- **File:** ratelimit.go
- **Signature:** \`func New(rate int, opts ...Option) Limiter\`
- **Usage Context:** Middleware wrapping HTTP handlers
- **Example:**
  \`\`\`go
  limiter := ratelimit.New(100) // 100 requests per second
  limiter.Take() // blocks until allowed
  \`\`\`

**Pattern 2: Token Bucket Rate Limiter**

- **Repository:** golang/time
- **File:** golang.org/x/time/rate
- **Signature:** \`func NewLimiter(r Limit, b int) \*Limiter\`
- **Usage Context:** Allow bursts, non-blocking checks
- **Example:**
  \`\`\`go
  limiter := rate.NewLimiter(10, 1) // 10 per second, burst of 1
  if limiter.Allow() {
  // process request
  }
  \`\`\`

### Recommendations

1. **Primary Choice:** uber-go/ratelimit
   - **Why:** Simple API, battle-tested at scale, zero dependencies
   - **Use Case:** Blocking rate limiter for background workers, API clients
   - **Getting Started:** `go get go.uber.org/ratelimit`

2. **Alternative Approach:** golang.org/x/time/rate
   - **Why:** Official package, supports bursts, non-blocking
   - **Trade-offs:** Slightly more complex API, requires understanding token bucket
   - **Use Case:** HTTP middleware where you want burst support

3. **Caveats:**
   - uber-go/ratelimit blocks goroutines (not suitable for high-concurrency HTTP servers)
   - golang.org/x/time/rate requires manual error handling with Allow()

4. **Next Steps:**
   - Prototype with uber-go/ratelimit for simplicity
   - Benchmark with realistic load
   - Consider golang.org/x/time/rate if burst support needed

### Implementation Guidance

**Common Pattern: HTTP Middleware**

\`\`\`go
func RateLimitMiddleware(limiter ratelimit.Limiter) func(http.Handler) http.Handler {
return func(next http.Handler) http.Handler {
return http.HandlerFunc(func(w http.ResponseWriter, r \*http.Request) {
limiter.Take()
next.ServeHTTP(w, r)
})
}
}
\`\`\`

**Best Practices:**

1. Create limiter once at startup (not per-request)
2. Use context for cancellation in long waits
3. Add metrics/logging for rate limit hits

**Anti-Patterns:**

- ❌ Creating new limiter per request (performance)
- ❌ Global rate limit across all endpoints (use per-route)
```

## Output Location

**Output location depends on invocation mode:**

### Mode 1: Standalone (invoked directly)

```bash
ROOT="$(git rev-parse --show-superproject-working-tree --show-toplevel | head -1)"
TIMESTAMP=$(date +"%Y-%m-%d-%H%M%S")
TOPIC="{topic-slug}"
mkdir -p "$ROOT/.claude/.output/research/${TIMESTAMP}-${TOPIC}-github"
# Save to: $ROOT/.claude/.output/research/${TIMESTAMP}-${TOPIC}-github/SYNTHESIS.md
```

Example: `$ROOT/.claude/.output/research/2026-01-03-143052-rate-limiting-go-github/SYNTHESIS.md`

### Mode 2: Orchestrated (invoked by parent skill)

When parent skill (researching-skills, orchestrating-research) provides `OUTPUT_DIR`:

```bash
# Save to: ${OUTPUT_DIR}/github.md
```

Example: `$ROOT/.claude/.output/research/2026-01-03-143052-rate-limiting-go/github.md`

**Detection:** If output directory was passed by parent, use Mode 2. Otherwise, use Mode 1.

## When to Skip Sections

- **Code Patterns Found:** Skip if only researching repositories (no code search)
- **Issues/Discussions:** Skip if not performing issue search
- **Implementation Guidance:** Skip if research is exploratory (no immediate implementation)

## Formatting Rules

1. **Use tables** for structured comparisons
2. **Use code blocks** with language tags for examples
3. **Use emoji indicators** (✅ ⚠️ 🔍 ❌) for quick scanning
4. **Bold key terms** for emphasis
5. **Link to GitHub** for all repository references
6. **Include dates** for temporal context

## See Also

- [Quality Indicators](quality-indicators.md) - How to score repositories
- [Search Filters](search-filters.md) - Advanced GitHub search syntax

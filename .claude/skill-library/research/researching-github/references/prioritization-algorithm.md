# Prioritization Algorithm

Research-backed weighted scoring formula for ranking GitHub repositories.

## Overview

After filtering repositories by quality tiers (✅ High, ⚠️ Medium, 🔍 Evaluate, ❌ Skip), this algorithm provides explicit ranking within and across tiers using a weighted score calculated from four factors.

## Scoring Formula

```
Final Score = (Popularity × 0.40) + (Maintenance × 0.35) + (Forks × 0.15) + (Issue Health × 0.10)
```

Each component is normalized to a 0-1 scale before weighting.

---

## Component Calculations

### 1. Popularity (40% weight)

**Metric:** GitHub stars (`stargazersCount`)

**Normalization:**

```
popularity_score = min(stars / 10000, 1.0)
```

**Examples:**

| Stars  | Calculation      | Score |
| ------ | ---------------- | ----- |
| 500    | 500/10000        | 0.05  |
| 2,500  | 2500/10000       | 0.25  |
| 10,000 | 10000/10000      | 1.00  |
| 25,000 | min(25000/10000) | 1.00  |

**Rationale:** 10,000 stars represents a highly validated, production-grade repository. Repos exceeding this threshold are capped at 1.0 to prevent overwhelming other factors.

### 2. Maintenance (35% weight)

**Metric:** Days since last commit (`updatedAt`)

**Normalization:**

```
maintenance_score = max(0, 1 - (days_since_commit / 365))
```

**Examples:**

| Last Commit | Days Ago | Calculation      | Score |
| ----------- | -------- | ---------------- | ----- |
| 14 days ago | 14       | 1 - (14/365)     | 0.962 |
| 90 days ago | 90       | 1 - (90/365)     | 0.753 |
| 180 days    | 180      | 1 - (180/365)    | 0.507 |
| 365 days    | 365      | 1 - (365/365)    | 0.000 |
| 500 days    | 500      | max(0, negative) | 0.000 |

**Rationale:** Repositories with recent commits (< 6 months) score highly. Activity older than 1 year scores 0, indicating potential abandonment.

### 3. Forks (15% weight)

**Metric:** Fork count (`forkCount`)

**Normalization:**

```
forks_score = min(forks / 1000, 1.0)
```

**Examples:**

| Forks | Calculation    | Score |
| ----- | -------------- | ----- |
| 50    | 50/1000        | 0.05  |
| 300   | 300/1000       | 0.30  |
| 1,000 | 1000/1000      | 1.00  |
| 5,000 | min(5000/1000) | 1.00  |

**Rationale:** 1,000 forks indicates strong derivative development and community engagement. Capped at 1.0 to balance with other factors.

### 4. Issue Health (10% weight)

**Metric:** Open issues count (`openIssues`)

**Normalization (inverse - fewer is better):**

```
issue_health_score = 1 / (1 + log10(open_issues + 1))
```

**Examples:**

| Open Issues | Calculation         | Score |
| ----------- | ------------------- | ----- |
| 0           | 1/(1 + log10(1))    | 1.000 |
| 9           | 1/(1 + log10(10))   | 0.500 |
| 12          | 1/(1 + log10(13))   | 0.473 |
| 99          | 1/(1 + log10(100))  | 0.333 |
| 999         | 1/(1 + log10(1000)) | 0.250 |

**Rationale:** Logarithmic scale prevents repositories with many issues from being penalized too heavily (large projects naturally have more issues). Zero open issues scores 1.0, indicating excellent maintenance.

---

## Worked Example

### Repository: uber-go/ratelimit

**Raw Metrics (from `gh search repos --json`):**

- Stars: 4,234
- Last commit: 14 days ago
- Forks: 298
- Open issues: 12

**Component Calculations:**

1. **Popularity:**

   ```
   popularity = min(4234 / 10000, 1.0) = 0.4234
   ```

2. **Maintenance:**

   ```
   maintenance = max(0, 1 - (14 / 365)) = 0.9616
   ```

3. **Forks:**

   ```
   forks = min(298 / 1000, 1.0) = 0.298
   ```

4. **Issue Health:**
   ```
   issue_health = 1 / (1 + log10(13)) = 1 / (1 + 1.114) = 0.473
   ```

**Final Score Calculation:**

```
Score = (0.4234 × 0.40) + (0.9616 × 0.35) + (0.298 × 0.15) + (0.473 × 0.10)
      = 0.169 + 0.337 + 0.045 + 0.047
      = 0.598
```

**Display:** 60/100 or 0.60

---

## Sorting & Ranking

### Primary Sort

Within each quality tier, sort by **score descending**:

```
✅ High Quality Tier:
1. owner/repo-a — Score: 0.87
2. owner/repo-b — Score: 0.72
3. owner/repo-c — Score: 0.60

⚠️ Medium Tier:
1. owner/repo-d — Score: 0.55
2. owner/repo-e — Score: 0.42
```

### Tie-Breaker Rules

If two repositories have identical scores (within 0.01):

1. **Stars DESC** - Higher star count wins
2. **Recency DESC** - More recent commit wins
3. **Alphabetical** - Repository name ascending

---

## Edge Cases

### 1. New Repositories (<30 days old)

**Issue:** Low star/fork counts unfairly penalize new repos.

**Adjustment:** If `days_since_creation < 30`, apply bonus:

```
adjusted_score = base_score × 1.2  // 20% bonus for new repos
```

**Rationale:** New repos need time to accumulate stars/forks. Bonus helps promising projects surface early.

### 2. Archived Repositories

**Issue:** Archived repos should rank lower than active ones.

**Adjustment:** If repository is archived:

```
adjusted_score = base_score × 0.5  // 50% penalty
```

**Rationale:** Archived repos aren't maintained. Even with high historical metrics, they shouldn't rank above active alternatives.

### 3. Repositories with 0 Open Issues

**Issue:** Some repos use other issue trackers (Jira, Linear).

**Adjustment:** Treat 0 open issues as perfect score (1.0) but note in output that "Issue tracker may be external."

### 4. Extremely Popular Repositories (>50k stars)

**Issue:** Capped at 1.0 popularity score, but may deserve higher weight.

**No adjustment:** Capping maintains balance. A repo with 100k stars and stale maintenance shouldn't dominate one with 8k stars and active development.

---

## Customization by Use Case

### Production Deployment (Prioritize Stability)

```
Popularity: 30%   (-10%)
Maintenance: 45%  (+10%)
Forks: 15%        (same)
Issue Health: 10% (same)
```

**Rationale:** Recent maintenance signals active security patches and compatibility updates.

### Learning / Tutorial Code (Prioritize Popularity)

```
Popularity: 50%   (+10%)
Maintenance: 25%  (-10%)
Forks: 15%        (same)
Issue Health: 10% (same)
```

**Rationale:** For learning, community validation (stars) matters more than recent commits.

### Security Research (Prioritize Issue Health)

```
Popularity: 35%   (-5%)
Maintenance: 35%  (same)
Forks: 10%        (-5%)
Issue Health: 20% (+10%)
```

**Rationale:** Low open issues indicates fewer security vulnerabilities and faster response to reports.

---

## Implementation in Workflow

### Phase 3: Quality Assessment

After filtering by quality tiers:

1. For each repository, extract metrics from `gh search repos --json` output
2. Calculate four component scores (popularity, maintenance, forks, issue health)
3. Apply weights and sum to final score
4. Sort repositories within each tier by score descending
5. Apply tie-breaker rules if needed

### Phase 6: Synthesis Output

Include score in repository listings:

```markdown
**1. uber-go/ratelimit** ✅ High Quality — Score: 0.87

- Stars: 4,234 | Forks: 298 | Last Commit: 14 days ago | Open Issues: 12
- URL: https://github.com/uber-go/ratelimit
- Description: A Golang blocking leaky-bucket rate limiter
- Relevance: Production-tested at Uber, simple API, goroutine-safe
```

---

## Research Basis

This algorithm synthesizes insights from professional package/repository ranking systems:

### npms.io (npm Package Scores)

**Weights:** Quality 30%, Maintenance 35%, Popularity 35%

**Source:** [npms.io About](https://npms.io/about)

**Key Insight:** Maintenance weighted equal to popularity. Issue response time and commit frequency are critical signals.

### GitHub Trending

**Algorithm:** Velocity-based ranking (relative growth over absolute numbers)

**Source:** [GitHub Community Discussion #163970](https://github.com/orgs/community/discussions/163970)

**Key Insight:** A repo going from 2→10 stars/day outranks one going from 50→60 stars/day. Growth velocity matters.

### Snyk Advisor (Package Health Scores)

**Categories:** Popularity 25%, Maintenance 25%, Security 25%, Community 25%

**Source:** [Snyk Dependency Health Blog](https://snyk.io/blog/dependency-health-assessing-package-risk-with-snyk/)

**Key Insight:** Maintenance = Popularity in weighting. Security (our "Issue Health") is separate but equal factor.

**Note:** Snyk Advisor is being sunset in January 2026, but methodology remains sound.

### Our Adaptation

GitHub repositories differ from npm packages (no download metrics), so we:

- **Increased popularity weight to 40%** - Stars are the primary adoption signal without download data
- **Maintained maintenance at 35%** - Consistent with npms.io/Snyk emphasis
- **Added forks at 15%** - Derivative development indicates utility
- **Added issue health at 10%** - Lower weight since large projects naturally have more issues

---

## Validation

To validate the algorithm:

1. **Compare with GitHub's "Best Match"** - Do our top results align with GitHub's default sort?
2. **Sanity check extremes** - Does a repo with 50k stars + 2 years stale rank below 5k stars + 2 weeks active?
3. **Peer review** - Do experienced developers agree with rankings?
4. **User feedback** - Do research results feel useful?

---

## Limitations

1. **No download metrics** - GitHub doesn't provide repository download counts (unlike npm)
2. **Issue tracker assumptions** - Some repos use external issue trackers (Jira, Linear)
3. **Normalized caps** - Very popular repos (>10k stars) are capped, potentially undervaluing extremely successful projects
4. **No code quality analysis** - Algorithm doesn't examine code structure, tests, or documentation quality
5. **Popularity bias** - 40% weight on stars may favor established repos over innovative newer ones

**Mitigation:** Use algorithm as starting point, not final decision. Always inspect top results manually.

---

## See Also

- [Quality Indicators](quality-indicators.md) - Quality tier definitions
- [Output Format](output-format.md) - Synthesis templates with scores
- [Search Filters](search-filters.md) - GitHub search syntax for filtering results

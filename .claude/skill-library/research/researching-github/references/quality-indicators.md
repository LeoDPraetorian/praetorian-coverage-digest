# Quality Indicators for Repository Assessment

Criteria for evaluating repository quality during Phase 3 of researching-github workflow.

## Quality Tiers

| Tier            | Stars    | Activity          | License | Docs  | Action       |
| --------------- | -------- | ----------------- | ------- | ----- | ------------ |
| ✅ High Quality | >1000    | <6 months         | Yes     | Good  | Prioritize   |
| ⚠️ Medium       | 100-1000 | <1 year           | Yes     | Basic | Consider     |
| 🔍 Evaluate     | <100     | <6 months         | Yes/No  | Any   | Inspect more |
| ❌ Skip         | Any      | >2 years/archived | No      | Poor  | Deprioritize |

## Assessment Criteria

### 1. Stars (Community Validation)

**Thresholds:**

- **>1000 stars** - High community validation, production-ready
- **100-1000 stars** - Moderate adoption, likely stable
- **<100 stars** - New/niche, evaluate based on other factors

**Why it matters:** Stars indicate community trust and real-world usage.

**Exceptions:** New repositories (<6 months old) with <100 stars may still be high quality if other indicators are strong.

### 2. Recent Activity (Maintenance Status)

**Thresholds:**

- **<6 months** - Actively maintained
- **6-12 months** - Maintained (slower pace)
- **1-2 years** - Possibly abandoned, check issues
- **>2 years** - Likely abandoned

**Check:**

- Last commit date
- Recent issues/PRs (open or closed)
- Maintainer responsiveness

**Why it matters:** Active maintenance = bug fixes, security updates, compatibility.

### 3. License (Usage Rights)

**Preferred licenses:**

- **MIT** - Permissive, widely used
- **Apache-2.0** - Permissive, patent grant
- **BSD-3-Clause** - Permissive, attribution required

**Caution licenses:**

- **GPL-3.0** - Copyleft, requires derivative works to be GPL
- **AGPL-3.0** - Network copyleft, stricter than GPL

**Red flags:**

- **No license** - Cannot legally use in production
- **Custom/proprietary** - Review carefully

**Why it matters:** License determines if you can use code in your project.

### 4. Documentation Quality

**Indicators:**

- **README present** - Basic requirement
- **Installation instructions** - How to get started
- **Usage examples** - Code snippets showing usage
- **API reference** - Function/method documentation
- **Architecture docs** - How it works internally
- **Contributing guide** - Community engagement

**Quality levels:**

- **Good** - README + examples + API reference + architecture
- **Basic** - README + installation + basic examples
- **Poor** - Minimal README, no examples

**Why it matters:** Good docs = easier integration, fewer surprises.

### 5. Issue Management

**Check:**

- **Open issues** - How many? Triage process?
- **Closed issues** - Response time? Resolution rate?
- **Issue templates** - Structured bug reports?
- **Maintainer activity** - Are they responding?

**Green flags:**

- Issues triaged within days
- Clear response from maintainers
- Issues closed with fixes/explanations

**Red flags:**

- Hundreds of open, unanswered issues
- No maintainer activity in months
- Issues closed without resolution

### 6. Code Quality Indicators

**Check (if inspecting code):**

- **Tests present** - Unit/integration tests
- **CI/CD setup** - Automated testing
- **Code structure** - Organized, modular
- **Dependencies** - Up-to-date, minimal

**Advanced indicators:**

- Code coverage metrics
- Static analysis (linters, security scanners)
- Dependency vulnerability scanning

## Assessment Workflow

### Step 1: Quick Filter (30 seconds per repo)

1. Check stars (>100 = proceed)
2. Check last commit (<1 year = proceed)
3. Check license (present = proceed)

**If all pass:** Move to Step 2
**If any fail:** Mark as ❌ Skip unless other factors are exceptional

### Step 2: Deep Assessment (2-3 minutes per repo)

1. Read README (installation, usage, features)
2. Check open issues (quantity, maintainer activity)
3. Review recent commits (frequency, quality)
4. Scan documentation (API reference, examples)

**Score:**

- **✅ High Quality** - All indicators strong
- **⚠️ Medium** - Most indicators acceptable
- **🔍 Evaluate** - Mixed signals, needs investigation
- **❌ Skip** - Multiple weak indicators

### Step 3: Comparison (5 minutes for top 3-5)

Compare top candidates side-by-side:

| Repository   | Stars | Activity | License | Docs  | Issues | Score     |
| ------------ | ----- | -------- | ------- | ----- | ------ | --------- |
| owner/repo-a | 5000  | 1 week   | MIT     | Good  | 12     | ✅ High   |
| owner/repo-b | 800   | 3 months | Apache  | Basic | 45     | ⚠️ Medium |
| owner/repo-c | 150   | 2 weeks  | MIT     | Good  | 3      | 🔍 Eval   |

**Select:** Top 1-2 for ✅, 1-2 for ⚠️ as alternatives

## Special Cases

### New Repositories (<6 months old)

**Adjust criteria:**

- Stars less important (no time to accumulate)
- Commit frequency more important (active development?)
- Author reputation matters (known developer/org?)

### Archived Repositories

**When to use:**

- Historical reference
- Learning from past implementations
- Deprecated patterns to avoid

**Never use for:** Production code, active dependencies

### Monorepos

**Additional checks:**

- Which subdirectory is relevant?
- Is that subdirectory actively maintained?
- Can you extract just the relevant part?

### Organization vs Individual Repos

**Organization repos (e.g., `kubernetes/kubernetes`):**

- Generally higher quality (team maintenance)
- More rigorous contribution process
- Better documentation standards

**Individual repos:**

- Can be high quality if author is prolific
- Check author's other repos for track record
- May have less formal documentation

## Common Pitfalls

| Mistake                  | Why It's Wrong                              |
| ------------------------ | ------------------------------------------- |
| "Most stars = best"      | Stars ≠ quality; check maintenance status   |
| "Ignore archived repos"  | Archived repos teach anti-patterns to avoid |
| "License doesn't matter" | Wrong license = cannot use legally          |
| "Skip docs check"        | Poor docs = integration pain                |
| "Only check top result"  | Top result may be outdated; compare options |
| "Stars + license = done" | Recent activity required for production use |

## Output Format

When documenting quality assessment:

```markdown
**owner/repo-name** ✅ High Quality

- Stars: 5,234 | Forks: 892 | License: MIT
- Last Updated: 2024-12-15 (2 weeks ago)
- Open Issues: 12 (avg response time: 2 days)
- Documentation: Excellent (README + API reference + examples + architecture)
- CI/CD: Yes (GitHub Actions)
- Tests: Yes (80% coverage)
- Assessment: Active maintenance, strong community, production-ready
```

## See Also

- [GitHub Search Best Practices](https://docs.github.com/en/search-github/getting-started-with-searching-on-github/about-searching-on-github)
- [Open Source Licenses Explained](https://choosealicense.com/)

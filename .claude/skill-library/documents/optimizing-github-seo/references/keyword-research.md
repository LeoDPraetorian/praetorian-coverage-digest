# Keyword Research Guide

**Finding the right keywords for GitHub repository optimization.**

## Why Keyword Research Matters

**The foundation of SEO/AEO**: Keywords determine what searches your repository appears in.

**Common mistake**: Using generic terms instead of specific, searchable keywords.

```
❌ Generic: "api library"
✅ Specific: "fastapi oauth2 authentication library"
```

## Research Process

### Step 1: Identify Primary Keywords

Start with what your project actually does:

**Formula**: [Technology] + [Purpose] + [Key Feature]

**Examples:**

- React + Authentication + Hooks = "react authentication hooks"
- Python + Data Pipeline + Airflow = "python data pipeline airflow"
- FastAPI + OAuth2 + JWT = "fastapi oauth2 jwt authentication"

### Step 2: Analyze Competitor Repositories

Find successful repositories in your space and analyze their optimization:

```bash
# Find top repositories for your keywords
# Look at their: Name, About, Topics, README structure
```

**What to extract:**

1. **Topics they use** - Which are most common?
2. **Keywords in titles** - What terminology do they use?
3. **README structure** - How do they organize information?
4. **Star count** - Can you compete or should you target niche keywords?

### Step 3: Use Keyword Research Tools

**Free tools:**

1. **keywordtool.io**
   - Enter your primary keyword
   - Get variations and long-tail keywords
   - See search volumes

2. **Google Keyword Planner**
   - Sign up for free Google Ads account
   - Use "Discover new keywords" tool
   - Enter seed keywords related to your project
   - Filter by relevance and search volume

3. **GitHub Search**
   - Search for your keywords on GitHub
   - See how many repositories match
   - Check top results - can you outrank them?

**Example workflow:**

```
1. Enter "fastapi authentication" in keywordtool.io
2. Get suggestions:
   - fastapi authentication example
   - fastapi authentication jwt
   - fastapi authentication oauth2
   - fastapi authentication middleware
3. Check GitHub for each:
   - "fastapi authentication example" → 500 repos
   - "fastapi authentication jwt" → 200 repos (✅ less competitive)
   - "fastapi authentication oauth2" → 150 repos (✅ less competitive)
```

### Step 4: Long-Tail Keyword Analysis

**Long-tail keywords** are specific, multi-word phrases with lower search volume but higher intent.

**Benefits:**

- Less competition
- Higher conversion (users know what they want)
- Easier to rank for
- More specific traffic

**Examples:**

```
Short-tail (competitive):
- "authentication" (1M+ repos)
- "oauth" (50k+ repos)

Long-tail (targetable):
- "fastapi oauth2 authentication example" (200 repos)
- "react hooks authentication with refresh tokens" (100 repos)
- "python jwt authentication middleware" (150 repos)
```

**How to find long-tail keywords:**

1. **Google autocomplete**

   ```
   Type: "fastapi auth"
   Google suggests:
   - fastapi authentication example
   - fastapi authentication jwt
   - fastapi authentication with database
   ```

2. **"People also ask" section**

   Search your primary keyword on Google and look for:
   - How do I authenticate with FastAPI?
   - What is OAuth2 authentication in FastAPI?
   - How do I implement JWT in FastAPI?

3. **Related searches at bottom of Google results**

### Step 5: Trending vs Saturated Analysis

**Goal**: Find keywords with good search volume but low competition.

**Metrics to consider:**

| Keyword                    | Repos | Strategy                         |
| -------------------------- | ----- | -------------------------------- |
| python                     | 600k+ | ❌ Too competitive (avoid)       |
| fastapi                    | 15k   | ✅ Good for established repos    |
| fastapi-authentication     | 2k    | ✅ Good for new repos            |
| fastapi-oauth2-jwt-example | 100   | ✅ Excellent for niche targeting |

**Rule of thumb:**

- **< 100 repos**: Very niche, low traffic but easy to rank
- **100-1000 repos**: Sweet spot for new projects
- **1k-10k repos**: Good for established projects
- **10k+ repos**: Only use if you have significant differentiation

## Keyword Types

### 1. Technology Keywords

**What**: The programming language, framework, or platform

**Examples**: `python`, `react`, `fastapi`, `typescript`, `go`

**Strategy**: Use one primary technology keyword, avoid stacking

```
✅ GOOD: fastapi, python (FastAPI already implies Python)
❌ BAD: python, python3, python-3.9, python-language
```

### 2. Domain/Purpose Keywords

**What**: What problem domain your project addresses

**Examples**: `authentication`, `data-pipeline`, `monitoring`, `api-client`

**Strategy**: Be specific about the domain

```
✅ GOOD: authentication, authorization, security
❌ BAD: business, enterprise, solution
```

### 3. Feature Keywords

**What**: Specific technical features your project provides

**Examples**: `oauth2`, `jwt`, `websockets`, `graphql`, `rest-api`

**Strategy**: Include 2-4 key features

```
✅ GOOD: oauth2, jwt, refresh-tokens
❌ BAD: oauth2, oauth, oauth2.0, oauth-2, oauth2-authentication (redundant)
```

### 4. Use Case Keywords

**What**: How users will apply your project

**Examples**: `microservices`, `cli-tool`, `api-wrapper`, `middleware`

**Strategy**: One clear use case

```
✅ GOOD: microservices-template
❌ BAD: microservices, monolith, serverless (conflicting)
```

## Validation Checklist

Before finalizing keywords, verify:

- [ ] **Accuracy**: Do keywords actually describe your project?
- [ ] **Search volume**: Do people search for these terms?
- [ ] **Competition**: Can you rank for these keywords?
- [ ] **Consistency**: Do you use the same terms throughout?
- [ ] **Specificity**: Are keywords specific enough to attract right audience?

## Keyword Placement Strategy

Once you have keywords, place them strategically:

### Priority 1 (Highest impact):

- Repository name
- About section (first 5 words)
- Topics (8-12 selected)

### Priority 2 (High impact):

- README title (H1)
- README first paragraph
- README section headings (H2, H3)

### Priority 3 (Medium impact):

- Code file names
- Documentation file names
- Wiki page titles
- Commit messages

### Priority 4 (Low impact but cumulative):

- Code comments
- Documentation body text
- Issue/PR descriptions

## Common Mistakes

### 1. Keyword Stuffing

```markdown
❌ BAD:
Title: FastAPI OAuth2 JWT Authentication Library for FastAPI OAuth2 JWT

✅ GOOD:
Title: FastAPI Authentication Library (OAuth2 + JWT)
```

### 2. Vague Keywords

```
❌ BAD: api, library, tool, framework, project
✅ GOOD: rest-api-client, authentication-library, cli-tool
```

### 3. Ignoring User Search Intent

```
❌ What you think: "authentication-framework"
✅ What users search: "how to add authentication to fastapi"
```

### 4. Not Updating Keywords

Keywords should evolve with your project:

```
Initial: fastapi-template
After adding auth: fastapi-authentication-template
After adding deployment: fastapi-kubernetes-template
```

## Tools and Resources

### Free Tools

1. **Google Keyword Planner** - https://ads.google.com/home/tools/keyword-planner/
2. **keywordtool.io** - https://keywordtool.io/
3. **GitHub Search** - https://github.com/search
4. **Google Trends** - https://trends.google.com/
5. **AnswerThePublic** - https://answerthepublic.com/

### Analysis

1. **GitHub Topics Explorer** - Browse trending topics
2. **Awesome Lists** - See how popular projects categorize themselves
3. **npm/PyPI search** - Package naming conventions

## Example: Complete Keyword Research

**Project**: FastAPI authentication library with OAuth2 and JWT

**Step 1 - Primary keywords:**

- fastapi
- authentication
- oauth2
- jwt

**Step 2 - Competitor analysis:**

Top repos for "fastapi authentication":

1. fastapi-users (5k stars) - Topics: fastapi, authentication, jwt, oauth2
2. fastapi-auth (800 stars) - Topics: fastapi, oauth2, security
3. fastapi-login (500 stars) - Topics: fastapi, authentication, sessions

**Step 3 - Long-tail keywords:**

- fastapi oauth2 example
- fastapi jwt authentication
- fastapi authentication middleware
- fastapi security implementation

**Step 4 - Final selection (8-12 topics):**

1. `fastapi` (primary technology)
2. `authentication` (primary purpose)
3. `oauth2` (key feature)
4. `jwt` (key feature)
5. `python-library` (package type)
6. `rest-api` (context)
7. `security` (related domain)
8. `middleware` (use case)
9. `api-security` (compound keyword)

**Step 5 - Placement:**

- **Name**: `fastapi-authentication-library`
- **About**: "FastAPI authentication with OAuth2 and JWT support for production APIs"
- **README Title**: "FastAPI Authentication Library"
- **README Opening**: "Production-ready authentication for FastAPI with OAuth2, JWT, and refresh token support."

## Sources

- [The Ultimate Guide to GitHub SEO for 2025](https://www.infrasity.com/blog/github-seo)
- [How to Promote your Open Source Project with SEO | ITNEXT](https://itnext.io/seo-for-open-source-projects-1a6b17ffeb8b)
- Google Keyword Planner documentation
- keywordtool.io best practices

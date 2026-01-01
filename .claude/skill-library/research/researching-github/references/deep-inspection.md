# Deep Inspection Patterns

Detailed methodology for Phase 4 (Deep Inspection) of researching-github workflow.

## Inspection Checklist

For each of the top 3-5 filtered repositories:

### 1. Repository Metadata

**Extract:**

- Repository name (`{owner}/{repo}`)
- Description (one-line summary)
- Homepage URL (if set)
- Topics/tags
- Primary language
- Stars, forks, watchers
- Open issues, open PRs
- Last commit date
- Creation date
- License

**gh CLI:**

```bash
gh repo view {owner}/{repo} --json name,description,url,homepageUrl,repositoryTopics,primaryLanguage,stargazerCount,forkCount,watchers,openIssues,pushedAt,createdAt,licenseInfo
```

**Web fallback:**

```
WebFetch('https://github.com/{owner}/{repo}', 'Extract repository metadata: name, description, stars, forks, license, last commit date, open issues, topics, and primary language')
```

### 2. README Analysis

**Extract from README:**

- Installation instructions
- Quickstart/usage examples
- Features list
- Architecture overview
- API reference (or link to docs)
- Dependencies
- Requirements (Go version, Node version, etc.)
- Contributing guidelines reference
- License reference

**gh CLI:**

```bash
gh api repos/{owner}/{repo}/contents/README.md | jq -r '.content' | base64 --decode
```

**Web fallback:**

```
WebFetch('https://raw.githubusercontent.com/{owner}/{repo}/main/README.md', 'Extract README content: installation, usage examples, features, architecture, and dependencies')
```

**Branch fallback:** Try `master`, `develop` if `main` fails.

### 3. Documentation Quality

**Check for:**

- `/docs` directory
- GitHub Wiki
- GitHub Pages site
- API documentation
- Architecture diagrams
- Migration guides

**gh CLI:**

```bash
gh api repos/{owner}/{repo}/contents/docs 2>/dev/null | jq -r '.[].name'
```

### 4. Code Structure

**Examine:**

- Directory organization
- Test directory presence
- CI/CD configuration (`.github/workflows`, `.travis.yml`, etc.)
- Dependency files (`go.mod`, `package.json`, `requirements.txt`, etc.)

**gh CLI:**

```bash
gh api repos/{owner}/{repo}/contents | jq -r '.[] | select(.type=="dir") | .name'
```

### 5. Maintenance Indicators

**Check:**

- Recent commits (frequency)
- Open issues (quantity, labels, triage)
- Closed issues (resolution time)
- Pull requests (merge rate, review process)
- Release frequency (semantic versioning?)
- CHANGELOG presence

**gh CLI:**

```bash
# Recent commits
gh api repos/{owner}/{repo}/commits --paginate=false | jq -r '.[0:5] | .[] | {date: .commit.author.date, message: .commit.message}'

# Issues stats
gh search issues "repo:{owner}/{repo} is:issue" --json state,createdAt,closedAt --limit 20

# Releases
gh release list --repo {owner}/{repo} --limit 10
```

### 6. Community Health

**Indicators:**

- Contributors count (diverse vs single maintainer)
- Issue templates
- Pull request templates
- Code of conduct
- Contributing guide
- Security policy

**gh CLI:**

```bash
gh api repos/{owner}/{repo}/community/profile
```

## Scoring System

After inspection, score each repository:

| Aspect        | Weight | Criteria                                          |
| ------------- | ------ | ------------------------------------------------- |
| Documentation | 25%    | README quality, docs/ directory, external docs    |
| Maintenance   | 25%    | Recent commits, issue response time, active PRs   |
| Code Quality  | 20%    | Tests, CI/CD, directory structure, linting        |
| Community     | 15%    | Contributors, issue templates, contributing guide |
| Maturity      | 15%    | Releases, changelog, semantic versioning          |

**Total score:** 0-100

**Thresholds:**

- 80-100: Excellent (production-ready)
- 60-79: Good (usable with caveats)
- 40-59: Fair (evaluate carefully)
- <40: Poor (avoid unless specific reason)

## Output Format

Document findings for each repository:

```markdown
### Deep Inspection: {owner}/{repo}

**Metadata:**

- Stars: {count} | Forks: {count} | Watchers: {count}
- License: {license-name}
- Created: {YYYY-MM-DD} | Last updated: {YYYY-MM-DD}
- Primary language: {language}
- Topics: {topic1}, {topic2}, {topic3}

**Documentation:** {score}/25

- README quality: {Excellent/Good/Basic/Poor}
- External docs: {Yes/No} - {URL if yes}
- Examples: {count} code examples in README
- API reference: {Yes/No}

**Maintenance:** {score}/25

- Last commit: {days} ago
- Open issues: {count} ({avg response time})
- Closed issues: {count} in last month
- Release frequency: {frequency}

**Code Quality:** {score}/20

- Tests: {Yes/No} - {coverage if available}
- CI/CD: {platform} - {status}
- Linting: {Yes/No}
- Directory structure: {Well-organized/Acceptable/Poor}

**Community:** {score}/15

- Contributors: {count}
- Issue templates: {Yes/No}
- Contributing guide: {Yes/No}
- Code of conduct: {Yes/No}

**Maturity:** {score}/15

- Releases: {count} total, {latest version}
- Changelog: {Yes/No}
- Semantic versioning: {Yes/No}
- Breaking changes: {Documented/Undocumented}

**Total Score:** {total}/100

**Assessment:** {Excellent/Good/Fair/Poor}

**Key Takeaways:**

1. {insight1}
2. {insight2}
3. {insight3}

**Concerns:**

- {concern1 if any}
- {concern2 if any}
```

## See Also

- [Quality Indicators](quality-indicators.md)
- [Output Format](output-format.md)

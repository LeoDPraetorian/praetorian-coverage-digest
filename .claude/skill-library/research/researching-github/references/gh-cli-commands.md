# gh CLI Commands Reference

Complete reference for GitHub CLI commands used in researching-github workflow.

## Authentication

```bash
# Check authentication status
gh auth status

# Login to GitHub
gh auth login

# Logout
gh auth logout
```

## Repository Search

```bash
# Basic search
gh search repos "query"

# With filters
gh search repos "rate limiting" --language=go --stars=">100"
gh search repos "authentication" --license=mit --updated=">2024-01-01"
gh search repos "kubernetes" --archived=false

# JSON output
gh search repos "query" --limit 20 --json name,owner,description,stargazersCount,updatedAt,url,licenseInfo
```

**Available JSON fields:**

- `name` - Repository name
- `owner` - Owner login/name
- `description` - Repository description
- `stargazersCount` - Number of stars
- `updatedAt` - Last update timestamp
- `url` - Repository URL
- `licenseInfo` - License details

## Code Search

**Requires authentication** - use `gh auth login` first.

```bash
# Basic code search
gh search code "pattern"

# With language filter
gh search code "func RateLimit" --language=go

# JSON output
gh search code "pattern" --limit 20 --json repository,path,textMatches
```

**Available JSON fields:**

- `repository` - Repository details
- `path` - File path
- `textMatches` - Matched content

## Issues/PRs Search

```bash
# Search issues
gh search issues "bug" --state=open
gh search issues "feature request" --state=closed --label="enhancement"

# Search pull requests
gh search prs "fix" --state=merged
gh search prs "refactor" --state=open --author="username"

# JSON output
gh search issues "query" --limit 20 --json title,repository,state,url,createdAt,comments
```

## Repository Details

```bash
# View repository
gh repo view owner/repo

# JSON output with specific fields
gh repo view owner/repo --json name,description,readme,licenseInfo,stargazerCount,forkCount,openIssues,defaultBranch
```

## API Access

```bash
# Get README content
gh api repos/owner/repo/contents/README.md

# Decode base64 content
gh api repos/owner/repo/contents/README.md | jq -r '.content' | base64 --decode

# Get repository metadata
gh api repos/owner/repo
```

## Common Patterns

### Search with Multiple Filters

```bash
gh search repos "docker kubernetes" \
  --language=go \
  --stars=">1000" \
  --license=apache-2.0 \
  --updated=">2024-01-01" \
  --archived=false
```

### Extract README from Search Results

```bash
# 1. Search for repos
gh search repos "rate limiting" --language=go --json name,owner --limit 5

# 2. For each result, get README
gh api repos/{owner}/{name}/contents/README.md | jq -r '.content' | base64 --decode
```

### Search Code in Specific Repository

```bash
gh search code "func Handle" --repo=owner/repo
```

## Rate Limits

Check API rate limit status:

```bash
gh api rate_limit
```

**Authenticated vs Unauthenticated:**

- Authenticated: 5,000 requests/hour
- Unauthenticated: 60 requests/hour

**Why gh CLI is preferred:** Built-in authentication avoids rate limits.

## Error Handling

**Common errors:**

| Error                                      | Cause             | Solution                                |
| ------------------------------------------ | ----------------- | --------------------------------------- |
| `gh: command not found`                    | gh not installed  | Use web fallback                        |
| `You are not logged into any GitHub hosts` | Not authenticated | Run `gh auth login` or use web fallback |
| `Resource not accessible by integration`   | Private repo      | Skip or request access                  |
| `API rate limit exceeded`                  | Too many requests | Wait or use authenticated requests      |

## Output Format

**Default (human-readable):**

```
owner/repo-name
  Description of the repository
  Stars: 1234  Language: Go  Updated: 2024-12-01
```

**JSON (machine-readable):**

```json
[
  {
    "name": "repo-name",
    "owner": { "login": "owner" },
    "description": "Description of the repository",
    "stargazersCount": 1234,
    "updatedAt": "2024-12-01T00:00:00Z",
    "url": "https://github.com/owner/repo-name"
  }
]
```

**Prefer JSON output** for structured parsing in skills.

## See Also

- [GitHub CLI Manual](https://cli.github.com/manual/)
- [GitHub Search Syntax](https://docs.github.com/en/search-github/getting-started-with-searching-on-github/understanding-the-search-syntax)

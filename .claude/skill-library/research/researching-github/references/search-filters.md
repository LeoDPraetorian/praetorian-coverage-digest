# GitHub Search Filter Syntax

Complete reference for GitHub search filters used in researching-github workflow.

## Search Types

| Type         | URL Parameter       | Description                    |
| ------------ | ------------------- | ------------------------------ |
| Repositories | `type=repositories` | Search repositories            |
| Code         | `type=code`         | Search code files              |
| Issues       | `type=issues`       | Search issues and PRs          |
| Discussions  | `type=discussions`  | Search discussions             |
| Commits      | `type=commits`      | Search commit messages         |
| Users        | `type=users`        | Search users and organizations |

## Repository Filters

### Language

```
language:go
language:python
language:rust
language:typescript
```

**Multiple languages (OR):**

```
language:go language:python  # Repos with Go OR Python
```

### Stars

```
stars:>1000           # More than 1000 stars
stars:100..1000       # Between 100 and 1000 stars
stars:<100            # Fewer than 100 stars
stars:>=500           # 500 or more stars
```

### Size (KB)

```
size:>10000           # Larger than 10MB
size:<1000            # Smaller than 1MB
```

### Forks

```
forks:>100            # More than 100 forks
forks:0               # No forks (original)
```

### License

```
license:mit
license:apache-2.0
license:gpl-3.0
license:bsd-3-clause
```

### Date Filters

#### Created

```
created:>2024-01-01   # Created after Jan 1, 2024
created:<2023-12-31   # Created before Dec 31, 2023
created:2024-01-01..2024-12-31  # Created in 2024
```

#### Pushed (Last Commit)

```
pushed:>2024-01-01    # Commits after Jan 1, 2024
pushed:<2023-12-31    # No commits since Dec 31, 2023
```

### Repository Status

```
archived:false        # Exclude archived repos
archived:true         # Only archived repos
is:public             # Only public repos
is:private            # Only private repos (requires auth)
mirror:false          # Exclude mirrors
```

### Topics

```
topic:kubernetes
topic:machine-learning
```

### User/Organization

```
user:torvalds         # Repos by user
org:kubernetes        # Repos in organization
```

## Code Search Filters

**Note:** Code search requires authentication with gh CLI.

### File Path

```
path:src/              # Files in src/ directory
path:*.go              # Go files anywhere
path:test/*.py         # Python files in test/ directory
extension:md           # Markdown files
```

### Repository

```
repo:owner/name       # Search in specific repo
org:kubernetes        # Search in organization's repos
user:username         # Search user's repos
```

### Language

```
language:go
language:python
```

### File Size

```
size:>1000            # Larger than 1KB
size:<500             # Smaller than 500 bytes
```

## Issue/PR Filters

### State

```
state:open            # Open issues/PRs
state:closed          # Closed issues/PRs
is:merged             # Merged PRs only
is:unmerged           # Unmerged PRs only
```

### Labels

```
label:bug
label:enhancement
label:"good first issue"
```

### Author/Assignee

```
author:username
assignee:username
mentions:username
```

### Comments

```
comments:>10          # More than 10 comments
comments:0            # No comments
```

### Date Filters

```
created:>2024-01-01
updated:<2024-12-31
closed:2024-01-01..2024-06-30
```

## Combining Filters

### AND Logic (Space)

```
rate limiting language:go stars:>100
# Repos about "rate limiting" AND language is Go AND more than 100 stars
```

### OR Logic (Repeat Filter)

```
language:go language:rust
# Go OR Rust
```

### NOT Logic (- prefix)

```
rate limiting -deprecated
# "rate limiting" but NOT "deprecated"

language:go -archived:true
# Go language but NOT archived
```

## Advanced Patterns

### High-Quality, Actively Maintained

```
rate limiting language:go stars:>500 pushed:>2024-01-01 archived:false license:mit
```

### New Projects Worth Watching

```
kubernetes operator language:go stars:100..500 created:>2024-06-01
```

### Finding Issues to Contribute

```
label:"good first issue" language:python state:open comments:<5
```

### Discovering Popular Alternatives

```
redis cache language:go stars:>1000 archived:false
```

## Web Search URL Construction

**Base URL:** `https://github.com/search`

**Query parameters:**

- `q={encoded-query}` - Search query with filters
- `type={type}` - Search type (repositories, code, issues, etc.)

**Example:**

```
https://github.com/search?q=rate+limiting+language:go+stars:%3E100&type=repositories
```

**URL encoding:**

- Space → `+` or `%20`
- `>` → `%3E`
- `<` → `%3C`
- `:` → `%3A`

## gh CLI Filter Syntax

**Differences from web:**

| Web Filter           | gh CLI Flag               |
| -------------------- | ------------------------- |
| `language:go`        | `--language=go`           |
| `stars:>100`         | `--stars=">100"`          |
| `license:mit`        | `--license=mit`           |
| `pushed:>2024-01-01` | `--updated=">2024-01-01"` |
| `archived:false`     | `--archived=false`        |

**Example:**

```bash
gh search repos "rate limiting" --language=go --stars=">100" --license=mit
```

## Common Use Cases

### 1. Find Production-Ready Libraries

```
library-name language:typescript stars:>1000 archived:false pushed:>2024-01-01
```

### 2. Discover Implementation Examples

```
"func RateLimit" language:go path:*.go
# Code search for rate limiting implementations
```

### 3. Research Known Issues

```
is:issue is:open label:bug "connection timeout" repo:owner/repo
```

### 4. Find Alternative Implementations

```
prometheus exporter language:go stars:>100 -archived:true
```

### 5. Identify Deprecated Patterns

```
"TODO: migrate" language:go path:src/
# Find migration TODOs in codebases
```

## Filter Priority

When combining many filters, GitHub prioritizes:

1. **Repository/user/org** - Narrow scope first
2. **Language** - Filter by technology
3. **Date ranges** - Temporal filtering
4. **Quality metrics** - Stars, forks
5. **Status** - Archived, public/private

**Optimize queries** by putting high-selectivity filters first.

## Limitations

### Rate Limits

- **Unauthenticated web:** 10 requests/minute
- **Authenticated gh CLI:** 30 requests/minute for search
- **Code search:** Requires authentication

### Result Limits

- **Web search:** First 1,000 results only
- **gh CLI:** Use `--limit` flag (max 1,000)

### Search Lag

- Newly pushed code may take minutes to be indexed
- Repository metadata updates faster than code

## Troubleshooting

| Issue               | Cause                   | Solution                            |
| ------------------- | ----------------------- | ----------------------------------- |
| No results          | Filters too restrictive | Remove some filters                 |
| Too many results    | Query too broad         | Add language/date filters           |
| "Validation failed" | Invalid filter syntax   | Check syntax, use quotes for spaces |
| Rate limit          | Too many requests       | Use gh CLI with authentication      |
| Code search fails   | Not authenticated       | Run `gh auth login`                 |
| Old results         | Search index lag        | Wait 5-10 minutes, search again     |

## See Also

- [GitHub Search Syntax Documentation](https://docs.github.com/en/search-github/searching-on-github)
- [gh CLI Search Reference](https://cli.github.com/manual/gh_search)

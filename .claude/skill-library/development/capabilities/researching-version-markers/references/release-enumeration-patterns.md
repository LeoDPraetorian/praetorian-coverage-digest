# Release Enumeration Patterns

**gh CLI commands for enumerating releases across different code forges.**

## GitHub

### Using Tags API

```bash
# List all tags (paginated)
gh api repos/{owner}/{repo}/tags --paginate | jq -r '.[].name'

# List first N tags
gh api repos/{owner}/{repo}/tags --paginate | jq -r '.[].name' | head -20

# Filter by pattern
gh api repos/{owner}/{repo}/tags --paginate | jq -r '.[].name' | grep "^v[0-9]"
```

### Using Releases API

```bash
# List all releases
gh api repos/{owner}/{repo}/releases --paginate | jq -r '.[].tag_name'

# Include release dates
gh api repos/{owner}/{repo}/releases --paginate | jq -r '.[] | "\(.tag_name) \(.published_at)"'

# Skip prereleases
gh api repos/{owner}/{repo}/releases --paginate | jq -r '.[] | select(.prerelease == false) | .tag_name'
```

## Tag Naming Conventions

### Semantic Versioning

**Pattern:** `v1.2.3` or `1.2.3`

```bash
# Strip 'v' prefix for comparison
gh api repos/{owner}/{repo}/tags --paginate | jq -r '.[].name' | sed 's/^v//' | sort -V
```

### Date-based Versions

**Pattern:** `2024-01-15` or `20240115`

```bash
# Filter by year
gh api repos/{owner}/{repo}/tags --paginate | jq -r '.[].name' | grep "^2024"
```

### Custom Patterns

**MySQL:** `mysql-8.0.23` or `mysql-5.7.44`

```bash
gh api repos/mysql/mysql-server/tags --paginate | jq -r '.[].name' | grep "^mysql-[0-9]"
```

**PostgreSQL:** `REL_15_3` or `REL15_3`

```bash
gh api repos/postgres/postgres/tags --paginate | jq -r '.[].name' | grep "^REL"
```

## Filtering Strategies

### By Date Range

```bash
# Releases in last 3 years
cutoff_date=$(date -v-3y '+%Y-%m-%d')  # macOS
# cutoff_date=$(date -d '3 years ago' '+%Y-%m-%d')  # Linux

gh api repos/{owner}/{repo}/releases --paginate | jq -r ".[] | select(.published_at >= \"$cutoff_date\") | .tag_name"
```

### By Version Pattern

```bash
# Only major.minor versions (skip patches)
gh api repos/{owner}/{repo}/tags --paginate | jq -r '.[].name' | grep -E "^v?[0-9]+\.[0-9]+\.0$"

# Only 8.x versions
gh api repos/{owner}/{repo}/tags --paginate | jq -r '.[].name' | grep "^v?8\."
```

### Limit to N Releases

```bash
# First 15 releases
gh api repos/{owner}/{repo}/releases --paginate | jq -r '.[].tag_name' | head -15

# 15 releases from offset 5
gh api repos/{owner}/{repo}/releases --paginate | jq -r '.[].tag_name' | tail -n +6 | head -15
```

## Sorting

### Semantic Version Sort

```bash
# Sort by version (requires GNU coreutils)
gh api repos/{owner}/{repo}/tags --paginate | jq -r '.[].name' | sed 's/^v//' | sort -V -r
```

### Chronological Sort

```bash
# Sort by date (newest first)
gh api repos/{owner}/{repo}/releases --paginate | jq -r '.[] | "\(.published_at) \(.tag_name)"' | sort -r
```

## Example: MySQL Release Enumeration

```bash
# Get last 20 MySQL releases, skip RC/prereleases
gh api repos/mysql/mysql-server/tags --paginate | \
  jq -r '.[].name' | \
  grep "^mysql-[0-9]" | \
  grep -v "rc" | \
  head -20

# Output:
# mysql-8.0.40
# mysql-8.0.39
# mysql-8.0.38
# ...
# mysql-5.7.44
```

## Example: PostgreSQL Release Enumeration

```bash
# Get PostgreSQL releases from last 3 years
gh api repos/postgres/postgres/releases --paginate | \
  jq -r '.[] | select(.prerelease == false) | "\(.published_at) \(.tag_name)"' | \
  grep "^2024\|^2023\|^2022" | \
  sort -r | \
  awk '{print $2}' | \
  head -15

# Output:
# REL_16_2
# REL_15_6
# REL_14_11
# ...
```

## Web Fallback (When gh CLI Unavailable)

Use WebFetch to scrape release pages:

```
WebFetch('https://github.com/{owner}/{repo}/tags', 'Extract all tag names from the page')
WebFetch('https://github.com/{owner}/{repo}/releases', 'Extract release tag names and dates')
```

## GitLab

```bash
# List project tags
curl "https://gitlab.com/api/v4/projects/{id}/repository/tags" | jq -r '.[].name'

# With pagination
curl "https://gitlab.com/api/v4/projects/{id}/repository/tags?per_page=100" | jq -r '.[].name'
```

## Common Pitfalls

| Issue               | Solution                                                    |
| ------------------- | ----------------------------------------------------------- |
| Tags != Releases    | Use releases API for dates, tags API for comprehensive list |
| Prereleases clutter | Filter with `jq 'select(.prerelease == false)'`             |
| Non-semantic tags   | Custom grep patterns for project-specific naming            |
| Rate limiting       | Use authenticated gh CLI (no rate limits)                   |
| Forks show up       | Verify repository ownership before analysis                 |

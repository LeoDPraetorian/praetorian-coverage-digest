# List Recent Commits from Merged PRs

List all **commits** by a specified GitHub username in PRs that were merged in the last N days, with a work summary. This command focuses on actual code commits, not PR comments or discussions.

## Usage

```
/recent-commits <github_username> [days]
```

## Parameters

- `github_username` (required): The GitHub username to search for commits
- `days` (optional): Number of days to look back for merged PRs (default: 7)

## Examples

```
/recent-commits peter-kwan
/recent-commits peter-kwan 30
```

## What it does

1. Searches for all PRs merged in the last N days (default 7) by the specified username
2. **Retrieves all individual commits** from those merged PRs (not comments or discussions)
3. Lists each commit with its hash and message
4. Provides a detailed work summary including:
   - Total merged PRs and commit count in the timeframe
   - Key focus areas and project types
   - Work patterns and commit characteristics
   - Technical scope analysis based on commit messages

## Implementation

Uses GitHub CLI to:
- Find merged PRs: `gh pr list --state merged --author <username> --limit 100`
- Filter by date range using JSON query for mergedAt field
- **Extract individual commits**: `gh pr view <pr_number> --json commits --jq '.commits[] | "\(.oid[0:7]) - \(.messageHeadline)"'`
- Analyze commit messages and categorize work patterns
- Default to 7 days if days parameter not provided

## Output Format

For each PR, shows:
- PR number and title
- List of commits with short hash and message
- Work summary analyzing commit patterns and focus areas

**Note**: This command retrieves actual code commits, not PR comments, reviews, or discussions.

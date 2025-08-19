# List Recent JIRA Stories by User

List all **JIRA stories** completed or worked on by a specified user in the last N days, with detailed status and summary information.

## Usage

```
/recent-jiras <display_name> [days]
```

## Parameters

- `display_name` (required): The display name of the user to search for (e.g., "Peter Kwan", "John Smith")
- `days` (optional): Number of days to look back for story activity (default: 14)

## Examples

```
/recent-jiras "John Smith"
/recent-jiras "John Smith" 7
/recent-jiras "Sarah Johnson" 60
```

## What it does

1. Looks up the user's account ID(s) in JIRA by display name
2. Searches for stories assigned to that user with activity in the specified timeframe
3. Separates completed stories from active/in-progress stories
4. Provides detailed information including:
   - Story key, summary, type, priority, and status
   - Story points estimation and progress tracking
   - Creation date, last updated date, and resolution date (if completed)
   - Current status and resolution information
5. Generates a work summary with patterns and focus areas

## Implementation

Uses Atlassian JIRA API to:
- Lookup user account IDs: `lookupJiraAccountId` with display name
- Search completed stories: `assignee = <user> AND resolutiondate >= -<days>d AND type = Story`
- Search active stories: `assignee = <user> AND updated >= -<days>d AND type = Story AND resolution is EMPTY`
- Include story points field: Request `customfield_10016` or equivalent story points field
- Default to 14 days if days parameter not provided
- Sort results by resolution date (completed) and updated date (active)

## Output Format

Shows two sections:
1. **Completed Stories**: Stories resolved in the timeframe
2. **Active Stories**: Stories updated but not completed in the timeframe

For each story displays:
- Story key and title
- Type, priority, and current status
- Story points (estimation and tracking)
- Key dates (created, updated, resolved)
- Resolution status

Includes a summary with:
- Total completed vs active story counts
- Story points completed vs in-progress
- Work focus areas based on story titles
- Activity patterns and priorities
- Velocity analysis (story points per timeframe)

## Notes

- Focuses specifically on Story type issues (excludes bugs, tasks, etc.)
- Searches by exact display name match in JIRA user lookup
- Shows both completed work and ongoing work for comprehensive view
- Defaults to 14-day lookback for recent activity focus
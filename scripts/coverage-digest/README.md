# Praetorian Coverage Digest

Automated daily email digest that monitors cybersecurity publications for Praetorian mentions and sends a branded summary email via SendGrid.

## Quick Start

```bash
# 1. Install dependencies
cd scripts/coverage-digest
npm install

# 2. Configure environment
cp .env.example .env
# Edit .env with your SendGrid API key and settings

# 3. Preview the email (no sending)
npm run digest:preview
# Opens preview.html in your browser

# 4. Dry run (logs what would be sent)
npm run digest:dry-run

# 5. Send for real
npm run digest
```

## What It Monitors

| Source | Description | Setup Required |
|--------|-------------|---------------|
| **RSS Feeds** | Help Net Security, Dark Reading, SC Media, Bleeping Computer, The Hacker News, SecurityWeek | None (built-in) |
| **Google Alerts** | Custom alerts for "Praetorian" + tool names | Set up alerts, add RSS URLs to .env |
| **Manual Submissions** | Team-submitted items via JSON file | None (reads from coverage-tracker/) |

### Future Integrations (not yet active)
- GitHub API (stars, forks, trending)
- Brand monitoring (Mention, Brand24)

## Configuration (.env)

| Variable | Required | Description |
|----------|----------|-------------|
| `SENDGRID_API_KEY` | Yes | SendGrid API key for sending email |
| `DIGEST_RECIPIENT` | Yes | Primary recipient email |
| `DIGEST_CC` | No | Comma-separated CC list |
| `DIGEST_FROM_EMAIL` | No | Sender email (default: digest@praetorian.com) |
| `DIGEST_FROM_NAME` | No | Sender name (default: Praetorian Coverage Digest) |
| `SKIP_IF_EMPTY` | No | Skip email if no new items (default: true) |
| `DRY_RUN` | No | Log instead of sending (default: false) |
| `GOOGLE_ALERTS_RSS_URLS` | No | Comma-separated Google Alerts RSS feed URLs |

## Commands

| Command | Description |
|---------|-------------|
| `npm run digest` | Run the digest (fetch + send email) |
| `npm run digest:preview` | Render HTML to preview.html (no email sent) |
| `npm run digest:dry-run` | Full run but log instead of sending |
| `npm run tracker` | Alias for coverage tracker CLI |

## Scheduling

### Option A: Cron (macOS/Linux)

```bash
# Run daily at 8 AM EST (13:00 UTC)
0 13 * * * cd /path/to/scripts/coverage-digest && /usr/local/bin/node send-daily-digest.js >> /var/log/coverage-digest.log 2>&1
```

### Option B: GitHub Actions

Create `.github/workflows/coverage-digest.yml`:
```yaml
name: Daily Coverage Digest
on:
  schedule:
    - cron: '0 13 * * *'  # 8 AM EST
  workflow_dispatch:  # Manual trigger

jobs:
  digest:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
      - run: cd scripts/coverage-digest && npm ci && node send-daily-digest.js
        env:
          SENDGRID_API_KEY: ${{ secrets.SENDGRID_API_KEY }}
          DIGEST_RECIPIENT: ${{ secrets.DIGEST_RECIPIENT }}
```

## Coverage Tracker CLI

Located at `scripts/coverage-tracker/cli.js`. Manages the central coverage database.

```bash
# Add coverage item
node ../coverage-tracker/cli.js add \
  --source "Help Net Security" \
  --title "Article about Brutus" \
  --url "https://..." \
  --tools "Brutus" \
  --type media

# List items
node ../coverage-tracker/cli.js list
node ../coverage-tracker/cli.js list --status new
node ../coverage-tracker/cli.js list --tool Brutus

# Mark as amplified
node ../coverage-tracker/cli.js amplify cov-001 --linkedin --slack

# View statistics
node ../coverage-tracker/cli.js stats

# Export to CSV
node ../coverage-tracker/cli.js export --format csv
```

## File Structure

```
scripts/coverage-digest/
├── send-daily-digest.js          # Main orchestrator
├── config.js                      # Configuration loader
├── email-template.html            # Digest email HTML template
├── email-item-template.html       # Single item row template
├── monitors/
│   ├── rss-feeds.js              # RSS feed monitor
│   └── manual-submissions.js     # Manual submissions reader
├── utils/
│   ├── email-sender.js           # SendGrid integration
│   ├── state-manager.js          # Deduplication + run tracking
│   └── template-renderer.js      # HTML template rendering
├── state/                         # (gitignored) Run state
│   └── digest-state.json
├── .env.example                   # Environment template
├── .gitignore
├── package.json
└── README.md

scripts/coverage-tracker/
├── cli.js                         # Coverage tracker CLI
├── coverage-tracker.json          # Coverage database (pre-seeded)
└── manual-submissions.json        # Manual submission input
```

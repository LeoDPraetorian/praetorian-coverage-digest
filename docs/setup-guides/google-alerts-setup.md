# Google Alerts Setup Guide

## Overview
Google Alerts monitors the web for new content matching your search terms. Configure alerts for Praetorian and all tool names to catch media coverage automatically.

---

## Step 1: Go to Google Alerts

1. Visit [https://www.google.com/alerts](https://www.google.com/alerts)
2. Sign in with the Praetorian marketing Google account

## Step 2: Create Alerts

Create one alert per search term. For each alert:

1. Enter the search term in the search box
2. Click **"Show options"**
3. Configure:
   - **How often**: As-it-happens
   - **Sources**: Automatic (or News + Blogs + Web)
   - **Language**: English
   - **Region**: Any region
   - **How many**: All results
   - **Deliver to**: RSS feed (this is critical for automation)
4. Click **Create Alert**

## Step 3: Alerts to Create

### Company-level alerts
| Search Term | Purpose |
|------------|---------|
| `"Praetorian Security"` | Exact company name mentions |
| `"praetorian-inc"` | GitHub organization mentions |
| `"Praetorian" cybersecurity` | Company + industry context |
| `"Praetorian" "attack surface"` | Product-related mentions |

### Tool-specific alerts
| Search Term | Tool |
|------------|------|
| `"Brutus" credential testing praetorian` | Brutus |
| `"Augustus" LLM security praetorian` | Augustus |
| `"Julius" LLM fingerprint praetorian` | Julius |
| `"Nosey Parker" secret scanning` | Nosey Parker |
| `"fingerprintx" port fingerprint` | FingerprintX |
| `"Gato" "GitHub Actions" praetorian` | Gato |
| `"Nebula" cloud security praetorian` | Nebula |
| `"Chariot" "attack surface management"` | Chariot |

## Step 4: Collect RSS Feed URLs

After creating each alert:
1. Click the RSS icon next to the alert (or find it in your alerts list)
2. Copy the RSS feed URL
3. Add all URLs to the `.env` file in the coverage-digest script:

```
GOOGLE_ALERTS_RSS_URLS=https://www.google.com/alerts/feeds/...alert1,https://www.google.com/alerts/feeds/...alert2
```

## Step 5: Verify

After setup, wait 24 hours, then run:
```bash
cd scripts/coverage-digest
node send-daily-digest.js --preview
```

Check the preview HTML to see if Google Alerts items appear.

---

## Maintenance

- **Monthly**: Review alert terms - add new tools, remove deprecated ones
- **Quarterly**: Check that RSS feeds are still active (Google occasionally breaks them)
- **When launching a new tool**: Create a new alert immediately

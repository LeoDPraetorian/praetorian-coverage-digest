# Coverage Amplification Workflow

## Overview

This document defines the end-to-end workflow for capturing, distributing, and amplifying Praetorian coverage across internal and external channels.

---

## The Pipeline

```
CAPTURE → CONSOLIDATE → DISTRIBUTE (Internal) → AMPLIFY (External) → MEASURE
```

---

## Phase 1: Capture

### Automated Sources
| Source | What It Catches | Frequency |
|--------|----------------|-----------|
| RSS Feeds | Articles mentioning Praetorian on cybersec publications | Every 24h (digest script) |
| Google Alerts | Web mentions of "Praetorian" + tool names | As they happen → RSS feed |
| GitHub API (future) | Stars, forks, trending, external PRs | Every 24h |
| Brand monitoring (future) | Social mentions, Reddit, forums, podcasts | Real-time |

### Manual Sources
| Source | How | Who |
|--------|-----|-----|
| Team knowledge | Submit to `#praetorian-in-the-wild` or manual-submissions.json | Anyone at Praetorian |
| Conference talks | Speaker submits before/after talk | Speaker + Marketing |
| Podcast appearances | Notify marketing when scheduled | Participant |

### Setup: Google Alerts
Create alerts for each of these terms (deliver as RSS feed):
- `"Praetorian Security"`
- `"praetorian-inc"` (GitHub org)
- `"Praetorian" cybersecurity`
- Each tool: `Brutus credential`, `Augustus LLM`, `Julius fingerprint`, `"Nosey Parker" secret`, `fingerprintx`, `Gato GitHub Actions`, `Nebula cloud security praetorian`, `Chariot attack surface`

---

## Phase 2: Consolidate

All coverage flows into one place: **coverage-tracker.json**

### Coverage Tracker Schema
Each item has:
- **ID**: Unique identifier (cov-001, cov-002, ...)
- **Status**: `new` → `queued` → `amplified` → `archived`
- **Amplification tracking**: Which channels has this been posted to?

### Daily Digest Email
- Runs every morning at 8 AM EST
- Pulls new items from all monitors
- Sends branded email to configured recipients
- Only sends if there are new items

---

## Phase 3: Distribute Internally

### Slack: `#praetorian-in-the-wild`
- Every new coverage item gets posted with standard format
- Marketing reviews and tags for amplification
- Big wins cross-posted to `#company`

### Weekly Summary to `#company`
- Every Monday: summary of last week's coverage
- Keeps whole company aware without channel noise

---

## Phase 4: Amplify Externally

### LinkedIn (Primary B2B Channel)

**Process for each coverage item:**
1. Marketing drafts LinkedIn post (use templates in `templates/linkedin-templates.md`)
2. Post from Praetorian company page
3. Send pre-written reshare text to `#amplification-crew` in Slack
4. Track: Did employees reshare? (target: 5+ reshares within 24h)

**Posting Cadence:**
- Every external media coverage → same-day LinkedIn post
- Tool launches → day-of launch + 1 follow-up post
- Events → before + after posts
- Don't post more than 2x per day on company page (save extras for next day)

### Website Updates
- Add external coverage to "In the News" page
- Add "As Featured In: [Publication]" badges to relevant tool pages
- Update Open Source Tools landing page with new tools

### Sales Enablement (Salesforce)
- Major coverage items → create Salesforce Campaign
- Attach to relevant Accounts/Opportunities
- Sales uses in outreach: "We were just featured in [Publication] for [Tool]..."

---

## Phase 5: Measure

### Key Metrics

| Metric | Target | How to Track |
|--------|--------|-------------|
| Coverage velocity | Growing month-over-month | Coverage tracker stats |
| Time to amplify | < 24 hours from discovery to LinkedIn post | Tracker timestamps |
| Employee amplification rate | 50%+ of roster reshares | Manual count |
| LinkedIn engagement | 2x baseline impressions | LinkedIn analytics |
| Website traffic from coverage | Measurable UTM traffic | Google Analytics |
| Influenced pipeline | Track in Salesforce | Campaign reports |

### Monthly Review
- Marketing reviews coverage-tracker stats
- Report to leadership: coverage count, top sources, top tools, amplification rate
- Identify gaps: any tools not getting coverage? Any publications we should pitch?

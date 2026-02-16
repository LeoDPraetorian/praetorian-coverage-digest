# Coverage Amplification System - Implementation Plan

## Executive Summary

Build a pipeline to capture, consolidate, and amplify all Praetorian public visibility (media coverage, open source tools, speaking engagements) to drive internal awareness and external lead generation.

**Problem:** Coverage happens constantly but isn't captured, consolidated, or leveraged.
**Solution:** Automated monitoring + structured workflow + marketing templates.
**Replaces:** $40K/year Press Pool spend with a more effective, owned system.

---

## Phase 1: Foundation (Week 1-2)

### 1.1 Daily Coverage Digest ✅ BUILT
- [x] RSS feed monitoring (6 cybersecurity publications)
- [x] Google Alerts integration (via RSS)
- [x] Manual submissions support
- [x] Branded HTML email template
- [x] SendGrid integration
- [x] Deduplication/state management
- [x] Preview mode for testing

**To activate:**
- [ ] Create SendGrid account and API key
- [ ] Set up Google Alerts (see `docs/setup-guides/google-alerts-setup.md`)
- [ ] Run `npm install` in `scripts/coverage-digest/`
- [ ] Copy `.env.example` to `.env` and fill in credentials
- [ ] Test: `npm run digest:preview`
- [ ] Test: `npm run digest:dry-run`
- [ ] Live: `npm run digest`
- [ ] Set up cron job or GitHub Action for daily 8 AM EST run

### 1.2 Coverage Tracker CLI ✅ BUILT
- [x] Add/list/export/stats commands
- [x] Amplification tracking per channel
- [x] Pre-seeded with 9 known coverage items
- [x] CSV export

**To activate:**
- [ ] Review seeded data in `scripts/coverage-tracker/coverage-tracker.json`
- [ ] Add any missing coverage items: `node cli.js add --title "..." --source "..."`
- [ ] Run `node cli.js stats` to verify

### 1.3 Content Templates ✅ BUILT
- [x] LinkedIn post templates (6 types)
- [x] Slack message templates (5 types + channel setup guide)
- [x] Hashtag reference

**To activate:**
- [ ] Marketing team reviews templates in `templates/`
- [ ] Customize voice/tone to match brand guidelines
- [ ] Share with team

---

## Phase 2: Website Content (Week 3-4)

### 2.1 Open Source Tools Page ✅ DRAFTED
- [x] Draft content with all 15+ tools
- [x] Organized by category (AI/ML, Credentials, Network, Cloud, CI/CD)
- [x] GitHub and blog links for each tool
- [x] "Featured In" section
- [x] CTA to Chariot

**To activate:**
- [ ] Marketing reviews draft in `templates/website-content/open-source-tools-page.md`
- [ ] Design team creates WordPress page at `/open-source/`
- [ ] Add to main navigation
- [ ] Verify all links work

### 2.2 In the News Page ✅ DRAFTED
- [x] All known coverage items organized by date
- [x] Publication names, excerpts, links
- [x] CTA section

**To activate:**
- [ ] Marketing reviews draft in `templates/website-content/in-the-news-page.md`
- [ ] Design team creates WordPress page at `/news/coverage/`
- [ ] Add to News navigation (alongside Press Releases)
- [ ] Backfill any missing coverage

### 2.3 Update Praetorian Labs Page
- [ ] Replace Snowcat/GoKart showcase with current tools (Brutus, Augustus, Julius)
- [ ] Or redirect `/praetorian-labs/` to new `/open-source/` page

### 2.4 Update Press Releases
- [ ] Backfill 2025-2026 press releases
- [ ] Add: Global expansion (NZ, Canada)
- [ ] Add: Tool launches (Augustus, Julius, Brutus)
- [ ] Add: Chariot updates

---

## Phase 3: Internal Distribution (Week 3-4)

### 3.1 Slack Channel Setup
- [ ] Create `#praetorian-in-the-wild` channel
- [ ] Pin welcome message (see `templates/slack-templates.md`)
- [ ] Invite: Marketing, Sales leads, Engineering leads, Leadership
- [ ] Set up posting cadence

### 3.2 Slack Integration (Optional Automation)
- [ ] Evaluate: Slack webhook from digest script vs. manual posting
- [ ] If automated: Add Slack webhook to digest script
- [ ] If manual: Marketing posts from coverage tracker daily

---

## Phase 4: External Amplification (Month 2)

### 4.1 LinkedIn Process
- [ ] Establish posting cadence (1-2x/day max)
- [ ] Marketing uses templates for each coverage item
- [ ] Evaluate social media management tool (Hootsuite/Buffer/Sprout Social)

### 4.2 Employee Amplification Program
- [ ] Recruit 10-15 volunteers for `#amplification-crew`
- [ ] When coverage drops: send pre-written posts to reshare
- [ ] Track reshare rate (target: 50%+ within 24h)

### 4.3 Sales Enablement (Salesforce)
- [ ] Create campaign structure in Salesforce for coverage items
- [ ] Train sales team on attaching coverage to opportunities
- [ ] Create "proof points" shared folder organized by topic

---

## Phase 5: Measurement (Month 2-3)

### 5.1 Metrics Dashboard
- [ ] Coverage velocity: items/month (coverage tracker stats)
- [ ] Amplification rate: % of items posted to LinkedIn within 24h
- [ ] Employee amplification: % of roster resharing
- [ ] Website traffic: UTM-tagged links in Google Analytics
- [ ] Pipeline influence: Salesforce campaign reports

### 5.2 Monthly Review Process
- [ ] Marketing runs `node cli.js stats` for coverage report
- [ ] Compare month-over-month trends
- [ ] Identify coverage gaps and pitch opportunities
- [ ] Report to leadership

---

## Success Criteria

| Metric | Current | Target (3 months) |
|--------|---------|-------------------|
| Coverage items tracked | 0 | 50+ |
| Time to discover coverage | Days/never | < 24 hours |
| Time to amplify on LinkedIn | Never | < 24 hours |
| Website "In the News" items | 0 (page doesn't exist) | 20+ |
| Employee reshare rate | 0% | 50%+ |
| Monthly LinkedIn impressions from coverage | Unknown | 10x baseline |

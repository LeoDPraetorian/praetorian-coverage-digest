# Chariot ↔ Jira Field Mapping Guide

This document will be populated with detailed field mapping documentation during the research phase.

## TODO

- [ ] Map all Chariot risk fields to Jira issue fields
- [ ] Document custom field requirements
- [ ] Include data transformation rules
- [ ] Add validation logic
- [ ] Document default values

## Placeholder Sections

### Core Field Mapping

| Chariot Field    | Jira Field        | Transform               | Notes |
| ---------------- | ----------------- | ----------------------- | ----- |
| Risk.Title       | Issue.Summary     | Prefix with "[Chariot]" |       |
| Risk.Description | Issue.Description | Markdown → Jira markup  |       |
| Risk.Priority    | Issue.Priority    | Map via priority table  |       |
| Risk.Status      | Issue.Status      | Map via status table    |       |
| Risk.Asset       | Custom Field      | Store asset identifier  |       |
| Risk.CVSS        | Custom Field      | Store numeric score     |       |

### Priority Mapping

| Chariot Priority | Jira Priority |
| ---------------- | ------------- |
| critical         | Highest       |
| high             | High          |
| medium           | Medium        |
| low              | Low           |
| info             | Lowest        |

### Status Mapping

| Chariot Status | Jira Status |
| -------------- | ----------- |
| open           | Open        |
| in_progress    | In Progress |
| resolved       | Done        |
| false_positive | Won't Do    |

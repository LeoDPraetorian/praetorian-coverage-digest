---
description: Customize Nighthawk C2 profiles per-engagement with domain fronting
allowed-tools: Skill, AskUserQuestion, Read, Bash
skills: gateway-redteam
---

# Nighthawk Profile Customization

Invoke the `customizing-nighthawk-profiles` skill to customize Nighthawk C2 profiles for red team engagements.

## Arguments

**Usage**: `/nighthawk [profile-path] [--domain <target-domain>]`

**Arguments**:
- `$1` (optional): Path to baseline Nighthawk profile JSON file
- `--domain <domain>` (optional): Target domain for domain fronting (e.g., `zoom.us`, `api.zoom.us`, `meet.google.com`)

## Workflow

### Step 1: Load Skill

Invoke the customizing-nighthawk-profiles skill via gateway-redteam:

```
skill: "gateway-redteam"
```

Claude will route to the customizing-nighthawk-profiles skill.

### Step 2: Provide Context

**If profile path provided** (`$1`):
```
"I have a baseline Nighthawk profile at {$1}. Please customize it for a new engagement."
```

**If --domain flag provided**:
```
"This profile should implement domain fronting to mimic traffic to {domain}.
Research what legitimate traffic to {domain} looks like (User-Agents, URI paths, HTTP headers, request patterns).
Then customize the profile to match that traffic."
```

**If no arguments**:
```
"I need to customize a Nighthawk C2 profile. Please guide me through the engagement questionnaire."
```

### Step 3: Follow Skill Workflow

The skill will guide through:
1. Baseline load and validation
2. Engagement context gathering (via questionnaire)
3. Domain research (if --domain specified)
4. Profile customization with realistic data
5. OPSEC validation
6. Profile validation and output

### Step 4: Output

The skill will generate:
- Customized profile JSON
- Deployment notes documenting changes
- Validation results

**Display the skill output verbatim.**

## Examples

**Basic customization**:
```bash
/nighthawk /path/to/baseline-profile.json
```

**Domain fronting to Zoom**:
```bash
/nighthawk /path/to/baseline-profile.json --domain zoom.us
```

**Domain fronting to Google Meet**:
```bash
/nighthawk /Users/engineer/baseline.json --domain meet.google.com
```

**Interactive (no profile specified)**:
```bash
/nighthawk
```

## Related Commands

- `/skill-manager` - Manage skills (including customizing-nighthawk-profiles)
- `/research` - Research traffic patterns for domain fronting
- `/commit` - Commit customized profiles to version control

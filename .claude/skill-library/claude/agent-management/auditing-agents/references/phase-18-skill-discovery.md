# Phase 18: New Skill Discovery

**Purpose**: Detect applicable skills not yet referenced by agent - newly added skills, orphaned skills, or miscategorized skills.

**When**: After Phase 17, before consolidating results. OPTIONAL - use AskUserQuestion to let user choose thoroughness level.

---

## Overview

Phase 18 provides a 3-tier progressive analysis system to discover:

1. **Tier 1 - Gateway Coverage**: Skills from agent's gateways not yet in agent's Tier 3
2. **Tier 2 - Orphaned Skills**: Library skills not integrated into any gateway
3. **Tier 3 - Miscategorization**: Skills in wrong folders (frontend in backend/, etc.)

Each tier is optional and increasingly thorough. Use AskUserQuestion to let the user choose their desired analysis depth.

---

## Step 1: Present Discovery Options

Use AskUserQuestion to offer 4 options:

```
Question: "Phase 18: New Skill Discovery - Which analysis level?"
Header: "Discovery"
multiSelect: false
Options:
  - label: "Skip (fastest)"
    description: "Continue with standard audit, skip discovery"
  - label: "Gateway coverage (~2 min)"
    description: "Find applicable skills from your gateways not yet in agent"
  - label: "Gateway + Orphans (~5 min)"
    description: "Gateway coverage + detect skills not in any gateway"
  - label: "Full analysis (~10 min)"
    description: "All checks + miscategorization detection"
```

---

## Step 2: Execute Based on User Choice

| User Choice       | Execute                      |
| ----------------- | ---------------------------- |
| Skip              | Mark Phase 18 as N/A         |
| Gateway coverage  | Run Tier 1 only              |
| Gateway + Orphans | Run Tier 1 + Tier 2          |
| Full analysis     | Run Tier 1 + Tier 2 + Tier 3 |

---

## Tier 1: Gateway Coverage Analysis

**Goal**: Find skills from agent's gateways that aren't in agent's Tier 3

### Procedure

#### a. Extract gateway skills from agent frontmatter

```bash
grep '^skills:' .claude/agents/{category}/{agent-name}.md | grep -o 'gateway-[a-z-]*'
```

#### b. For each gateway, read its SKILL.md to get skill inventory

Gateway skills typically document their routing in one of these patterns:

- Routing tables with skill paths
- "Routes to:" sections listing skills
- Examples showing skill delegation

```bash
# Example: gateway-frontend
Read('.claude/skills/gateway-frontend/SKILL.md')

# Look for routing patterns:
# - Tables with skill paths
# - Lists of library skills
# - Delegation examples
```

#### c. Extract library skill names from gateway

Parse gateway content for skill references:

```bash
# Find library skill paths
grep -oE '\.claude/skill-library/[^)]+/SKILL\.md' gateway-content.md

# Extract skill names (directory name before /SKILL.md)
# Use parameter expansion (basename/dirname not available in sandbox)
temp="${path%/SKILL.md}"; echo "${temp##*/}"
```

#### d. Get agent's current Tier 3 triggers

```bash
# Extract Tier 3 section from agent
sed -n '/### Tier 3:/,/^##/p' .claude/agents/{category}/{agent-name}.md

# Extract library skill paths
grep -oE '\.claude/skill-library/[^)]+/SKILL\.md'

# Extract skill names
```

#### e. Compare: Gateway skills vs Agent Tier 3

```
Gateway skills: [skill1, skill2, skill3, ..., skill25]
Agent Tier 3:   [skill1, skill3, skill5, ...]
Missing:        [skill2, skill4, skill6, ...]  ← Report these
```

#### f. Report Tier 1 results

```
Phase 18 - Tier 1: Gateway Coverage Analysis

Analyzing gateway-frontend...
  Gateway routes to: 25 library skills
  Agent Tier 3 has: 13 triggers
  Coverage: 52% (13/25)

ℹ️ Skills available but not in agent (12 missing):

  • using-react-server-components
    Path: .claude/skill-library/development/frontend/patterns/using-react-server-components/SKILL.md
    Trigger suggestion: React Server Components, RSC, server actions

  • frontend-web-vitals
    Path: .claude/skill-library/development/frontend/testing/frontend-web-vitals/SKILL.md
    Trigger suggestion: Performance monitoring, Core Web Vitals, LCP/FID/CLS

  [... list all missing skills ...]

Recommendation: Review list and add relevant skills to Tier 3 if agent handles these workflows.

Result: INFO (12 potentially applicable skills not yet referenced)
```

If agent has multiple gateways, repeat for each gateway and consolidate results.

---

## Tier 2: Orphaned Skill Detection

**Goal**: Find skills in domain directories not integrated into ANY gateway

### Procedure

#### a. Map gateways to domain directories

```
gateway-frontend      → .claude/skill-library/development/frontend/
gateway-backend       → .claude/skill-library/development/backend/
gateway-testing       → .claude/skill-library/testing/
gateway-security      → .claude/skill-library/security/
gateway-integrations  → .claude/skill-library/development/integrations/
gateway-capabilities  → .claude/skill-library/development/capabilities/
```

#### b. Scan domain directories for all skills

```bash
# For each domain directory
find .claude/skill-library/development/frontend -type d -name "*" | while read skill_dir; do
  if [ -f "$skill_dir/SKILL.md" ]; then
    skill_name="${skill_dir##*/}"  # basename equivalent (not available in sandbox)
    echo "$skill_name"
  fi
done
```

#### c. For each skill, check if referenced by ANY gateway

```bash
# Check if skill name appears in any gateway SKILL.md
skill_name="using-react-server-components"

found=false
for gateway in .claude/skills/gateway-*/SKILL.md; do
  if grep -q "$skill_name" "$gateway"; then
    found=true
    break
  fi
done

if [ "$found" = false ]; then
  echo "Orphaned: $skill_name"
fi
```

#### d. Report Tier 2 results

```
Phase 18 - Tier 2: Orphaned Skill Detection

Scanning frontend domain (.claude/skill-library/development/frontend/)...
  Total skills found: 28
  Referenced by gateways: 25

⚠️ Orphaned skills (3 not in any gateway):

  • experimental-react-forget
    Path: .claude/skill-library/development/frontend/patterns/experimental-react-forget/SKILL.md
    Status: Exists but not routed by gateway-frontend
    Action: Consider adding to gateway-frontend or archiving if deprecated

  • legacy-class-components
    Path: .claude/skill-library/development/frontend/patterns/legacy-class-components/SKILL.md
    Status: Exists but not routed by gateway-frontend
    Action: Likely should be archived (React 19 uses function components)

Recommendation: Orphaned skills should either be:
  1. Added to appropriate gateway's routing (if still relevant)
  2. Moved to .archived/ with reason (if deprecated)

Result: WARNING (3 orphaned skills found in agent's domain)
```

---

## Tier 3: Miscategorization Detection

**Goal**: Find skills in wrong folders (frontend skill in backend folder, etc.)

### Procedure

#### a. Get all skills scanned in Tier 2

Reuse the skill list from Tier 2 (skills in domain directories)

#### b. For each skill, analyze its content

```bash
# Read skill SKILL.md
skill_path=".claude/skill-library/development/frontend/patterns/some-skill/SKILL.md"
Read($skill_path)
```

#### c. Infer intended domain from skill content

Analyze:

- **Name**: Does name contain domain keywords? (react, go, python, aws, security, test)
- **Description**: What domain does it describe? (frontend, backend, testing, security)
- **Content**: What technologies/patterns does it cover?
- **Examples**: What type of code examples? (React components, Go functions, test files)

**Categorization rules:**

| Domain       | Indicators                                                                  |
| ------------ | --------------------------------------------------------------------------- |
| Frontend     | React, TypeScript (UI), JSX, components, hooks, browser, DOM, UI, CSS, HTML |
| Backend      | Go, API, endpoints, handlers, Lambda, DynamoDB, server, database            |
| Testing      | Vitest, Playwright, Jest, test, spec, assertion, mock                       |
| Security     | auth, crypto, vulnerability, OWASP, threat, attack                          |
| Python       | Python, pytest, Click, asyncio                                              |
| Capabilities | VQL, Nuclei, Velociraptor, scanner, Janus                                   |

#### d. Compare inferred domain vs actual path

```bash
# Actual path
actual=".claude/skill-library/development/frontend/patterns/some-skill/"

# Inferred domain from content analysis
inferred="backend"  # e.g., skill has Go code examples

# Check for mismatch
if [[ "$actual" == *"/frontend/"* ]] && [[ "$inferred" == "backend" ]]; then
  echo "MISMATCH: Skill in frontend/ but appears backend-related"
fi
```

#### e. Report Tier 3 results

```
Phase 18 - Tier 3: Miscategorization Detection

Analyzing 28 skills for domain alignment...

⚠️ Miscategorized skills (2 found):

  • go-error-handling
    Current path: .claude/skill-library/development/frontend/patterns/go-error-handling/SKILL.md
    Inferred domain: backend (contains Go code, handler patterns, error wrapping)
    Evidence:
      - Description mentions "Go error handling patterns"
      - Examples show Go code (func, error, fmt.Errorf)
      - No frontend/React content found
    Recommendation: Move to .claude/skill-library/development/backend/patterns/

  • react-performance-patterns
    Current path: .claude/skill-library/testing/react-performance-patterns/SKILL.md
    Inferred domain: frontend (React optimization, useMemo, useCallback)
    Evidence:
      - Name contains "react"
      - Description is about React performance optimization
      - Examples show React component code
    Recommendation: Move to .claude/skill-library/development/frontend/patterns/

✅ Correctly categorized: 26 skills

Result: WARNING (2 miscategorized skills found)
```

**Why manual reasoning required:**

- Content analysis requires semantic understanding
- Ambiguous cases need judgment (e.g., "testing React components" - is it testing/ or frontend/?)
- Must read full skill content, not just grep patterns

---

## Results Interpretation

| Result           | Meaning                              | Action                                      |
| ---------------- | ------------------------------------ | ------------------------------------------- |
| N/A              | User skipped discovery               | No action needed                            |
| INFO (Tier 1)    | Found applicable skills not in agent | Review and add relevant skills to Tier 3    |
| WARNING (Tier 2) | Found orphaned skills                | Library maintenance: integrate or archive   |
| WARNING (Tier 3) | Found miscategorized skills          | Library maintenance: move to correct folder |

---

## Why Optional?

Phase 18 is computationally expensive and primarily useful when:

- Agent hasn't been updated recently
- Skill library has grown since agent creation
- Doing comprehensive agent review
- Library maintenance/hygiene needed

For routine audits, Phases 1-17 provide sufficient validation.

**⚠️ CRITICAL**: When you reach Phase 18, you MUST use AskUserQuestion to let the user choose. DO NOT skip Phase 18 silently or default to "Skip" - always present the 4-option question and let the user decide.

---

## Integration Notes

1. Add Phase 18 to the phase numbering sequence in all references
2. Update "Consolidate results" section to include Phase 18 in the results table
3. Update the workflow step count (was 18 steps, now 19)
4. Ensure AskUserQuestion tool is in allowed-tools
5. Update todo list recommendations to include Phase 18 as optional step

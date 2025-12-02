# Agent Audit: 8-Phase Compliance Validation

## Overview

The agent audit system runs 8 phases of compliance validation to ensure agents follow the lean agent pattern and are discoverable by Claude Code.

## Phase Summary

| Phase | Name | Auto-Fix | Critical | Focus |
|-------|------|----------|----------|-------|
| 1 | Frontmatter Syntax | ✅ Yes | 🔴 Yes | Block scalar, color, permissionMode, ordering |
| 2 | Description Quality | ❌ No | 🟡 Medium | "Use when" triggers |
| 3 | Prompt Efficiency | ❌ No | 🟡 Medium | <300 lines |
| 4 | Skill Integration | ✅ Yes | 🟡 Medium | Gateway skills, tool appropriateness |
| 5 | Output Standardization | ❌ No | 🟢 Low | JSON format |
| 6 | Escalation Protocol | ❌ No | 🟢 Low | Handoff conditions |
| 7 | Body References | ✅ Yes | 🟡 Medium | Phantom skill detection |
| 8 | Skill Coverage | ❌ No | 🟢 Low | Recommended skills |

## Phase 1: Frontmatter Syntax (CRITICAL)

**Auto-Fixable**: Yes

### Checks

1. **Block Scalar Detection** (CRITICAL)
   - Description MUST NOT use `|` or `>` block scalars
   - Claude sees literal character instead of content
   - Makes agent invisible to Task tool

2. **Name/Filename Match**
   - `name: react-developer` must match `react-developer.md`

3. **Required Fields**
   - `name` (required)
   - `description` (required)
   - `tools` (recommended)

4. **Valid Category**
   - Must be in: architecture, development, testing, quality, analysis, research, orchestrator, mcp-tools

5. **Color Field** (NEW)
   - Must have `color` field matching type
   - `development` → green
   - `architecture` → blue
   - `testing` → yellow
   - `quality` → orange
   - `analysis` → purple
   - `research` → cyan
   - `orchestrator` → magenta
   - `mcp-tools` → gray

6. **PermissionMode Alignment** (NEW)
   - Must have `permissionMode` matching type
   - `development`, `testing`, `orchestrator`, `mcp-tools` → `default`
   - `architecture`, `quality`, `analysis`, `research` → `plan`

7. **Field Ordering** (NEW)
   - Frontmatter fields should follow canonical order:
   - name, description, type, permissionMode, color, tools, skills, model

8. **Alphabetical Sorting** (NEW)
   - `tools` field values should be alphabetically sorted
   - `skills` field values should be alphabetically sorted

### Examples

```yaml
# ❌ BROKEN - Block scalar
description: |
  Use when developing React applications.
  Creates components, fixes bugs.

# ✅ VALID - Single line with correct frontmatter
name: react-developer
description: Use when developing React applications - creating components, fixing UI bugs, optimizing performance.
type: development
permissionMode: default
color: green
tools: Bash, Edit, Read, Write
skills: gateway-frontend
```

### Auto-Fix

```bash
npm run --silent fix -- <agent> --apply phase1-description
npm run --silent fix -- <agent> --apply phase1-color-missing
npm run --silent fix -- <agent> --apply phase1-color-mismatch
npm run --silent fix -- <agent> --apply phase1-permission-mode
npm run --silent fix -- <agent> --apply phase1-ordering
npm run --silent fix -- <agent> --apply phase1-tools-sort
npm run --silent fix -- <agent> --apply phase1-skills-sort
```

## Phase 2: Description Quality

**Auto-Fixable**: No (requires semantic understanding)

### Checks

1. **"Use when" Trigger**
   - Description MUST start with "Use when"
   - Enables Claude's intent matching

2. **Example Blocks**
   - Should have 2-4 `<example>` blocks
   - Shows Claude how to select the agent

3. **Length Limit**
   - Max 1024 characters
   - Warning at 800 characters

4. **Capabilities List**
   - Should list what agent can do

### Examples

```yaml
# ✅ GOOD - Complete description
description: Use when developing React frontend applications - creating components, fixing UI bugs, optimizing performance, integrating APIs.\n\n<example>\nContext: User needs dashboard\nuser: "Create metrics dashboard"\nassistant: "I'll use react-developer"\n</example>
```

## Phase 3: Prompt Efficiency

**Auto-Fixable**: No (requires content extraction)

### Checks

1. **Line Count Limits**
   - Standard agents: <300 lines
   - Complex agents (architecture, orchestrator): <400 lines
   - Warning at 250 lines

2. **Embedded Patterns**
   - TDD workflows should use `developing-with-tdd` skill
   - Debugging steps should use `debugging-systematically` skill
   - Verification checklists should use `verifying-before-completion` skill

3. **Skill Delegation**
   - Should reference skills for detailed patterns
   - "For X, use skill Y" pattern

4. **Code Block Density**
   - Warning if >100 lines in code blocks
   - Move examples to skill files

### Suggestions

```markdown
## Skill References (Load On-Demand via Gateway)

| Task | Skill to Read |
|------|---------------|
| TDD Workflow | `.claude/skill-library/...` |
| Debugging | `.claude/skill-library/...` |
```

## Phase 4: Skill Integration

**Auto-Fixable**: Yes (path replacement, tool addition/removal)

### Checks

1. **Gateway Skills**
   - Should use gateway skills in frontmatter
   - Valid gateways: gateway-frontend, gateway-backend, gateway-testing, gateway-security, gateway-mcp-tools, gateway-integrations

2. **No Direct Library Paths**
   - Frontmatter should NOT have `.claude/skill-library/...` paths
   - Use gateways instead

3. **Skill References Section**
   - Body should have "Skill References" section
   - Documents which skills to load

4. **Load On-Demand Pattern**
   - Should mention just-in-time loading

5. **Required Tools by Type** (NEW)
   - Each agent type has required tools:
   - `development`: Read
   - `architecture`: Read, TodoWrite
   - `testing`: Read, Bash
   - `quality`: Read, Grep
   - `orchestrator`: TodoWrite, Task
   - `mcp-tools`: Bash

6. **Forbidden Tools by Type** (NEW)
   - Some tools are forbidden for certain types:
   - `architecture`: Write, Edit (planning only)
   - `quality`: Write, Edit (reviewing only)
   - `analysis`: Write, Edit (assessing only)
   - `research`: Write, Edit (researching only)

7. **Recommended Tools by Type** (NEW)
   - Additional tools recommended:
   - `development`: Edit, Write, Bash, Glob, Grep
   - `testing`: Write, Edit, Glob, Grep

### Auto-Fix

```bash
npm run --silent fix -- <agent> --apply phase4-gateway
npm run --silent fix -- <agent> --apply phase4-add-tool-Read
npm run --silent fix -- <agent> --apply phase4-remove-tool-Write
```

## Phase 5: Output Standardization

**Auto-Fixable**: No (requires template generation)

### Checks

1. **Output Format Section**
   - Must have "Output Format" section

2. **JSON Structure**
   - Must include required fields:
     - `status`: complete|blocked|needs_review
     - `summary`: string
     - `files_modified`: array
     - `verification`: object
     - `handoff`: object with recommended_agent

### Template

```json
{
  "status": "complete|blocked|needs_review",
  "summary": "1-2 sentence description",
  "files_modified": ["path/to/file.ts"],
  "verification": {
    "tests_passed": true,
    "build_success": true,
    "command_output": "snippet"
  },
  "handoff": {
    "recommended_agent": "agent-name",
    "context": "what to do next"
  }
}
```

## Phase 6: Escalation Protocol

**Auto-Fixable**: No (requires context understanding)

### Checks

1. **Escalation Section**
   - Must have "Escalation Protocol" section

2. **Stopping Conditions**
   - Lists when to stop and hand off
   - "Stop and escalate if:" pattern

3. **Agent Recommendations**
   - Specific agent names for handoff
   - `→ Recommend \`agent-name\`` pattern

4. **Not Generic**
   - Should not be just "ask user"
   - Specific handoff targets

### Template

```markdown
## Escalation Protocol

**Stop and escalate if**:
- Architecture decision needed → Recommend `go-architect`
- Security concern identified → Recommend `security-architect`
- Blocked by unclear requirements → Use AskUserQuestion tool
```

## Phase 7: Body References (NEW)

**Auto-Fixable**: Yes (remove phantom references)

### Checks

1. **Phantom Skill Detection**
   - Scans agent body for skill references
   - Checks if referenced skills exist in:
     - `.claude/skills/` (core skills)
     - `.claude/skill-library/` (library skills)
   - Reports skills that are referenced but don't exist

2. **Reference Patterns Detected**
   - `` `skill-name` skill ``
   - `Use skill-name skill`
   - `skill: "skill-name"`
   - `REQUIRED SKILL: skill-name`
   - `gateway-*` patterns

3. **False Positive Filtering**
   - Ignores `example`, `your-skill-name`, and other placeholder patterns

### Examples

```markdown
# ❌ PHANTOM SKILL - skill doesn't exist
Use the `fake-nonexistent-skill` skill for this task.

# ✅ VALID - skill exists
Use the `debugging-systematically` skill for bug investigation.
```

### Auto-Fix

```bash
npm run --silent fix -- <agent> --apply phase7-remove-phantom-fake-skill
```

**Note**: Removal simply deletes the reference. Consider if the agent needs the skill created instead.

## Phase 8: Skill Coverage (NEW)

**Auto-Fixable**: No (recommendation only)

**Note**: Phase 8 is advisory-only and always passes. Recommendations are informational.

### Checks

1. **Type-Based Recommendations**
   - `development` → developing-with-tdd, debugging-systematically, verifying-before-completion
   - `architecture` → writing-plans, brainstorming
   - `testing` → developing-with-tdd, verifying-before-completion
   - `quality` → verifying-before-completion
   - `orchestrator` → writing-plans

2. **Keyword-Based Recommendations**
   - Scans agent name and description for keywords
   - `react`, `frontend`, `ui` → gateway-frontend
   - `go`, `backend`, `api`, `lambda` → gateway-backend
   - `test`, `e2e`, `unit` → gateway-testing
   - `security`, `auth`, `credential` → gateway-security
   - `integration`, `api` → gateway-integrations

3. **Category-Based Recommendations**
   - Maps category to gateway skills
   - `development` → gateway-frontend or gateway-backend
   - `testing` → gateway-testing

4. **Gateway Requirement**
   - Warns if agent has no gateway skill
   - Most agents should have at least one gateway

### Scoring

Recommendations are scored by relevance:
- Type match: 8-10 points (high relevance)
- Keyword match: 6-7 points (medium relevance)
- Category match: 4-5 points (lower relevance)

Core skills (TDD, debugging, verification) receive +1 bonus.
Gateway skills receive +1 bonus if agent lacks gateway.

### Output

```markdown
## Skill Recommendations (Phase 8)

| Skill | Relevance | Source | Reason |
|-------|-----------|--------|--------|
| developing-with-tdd | High (9) | type | Development agents need TDD |
| gateway-frontend | High (8) | body-keywords | Found "react" in description |
| debugging-systematically | Medium (6) | category | Development benefits from debugging |
```

## Running Audits

### Single Agent

```bash
npm run --silent audit -- react-developer
```

### All Agents

```bash
npm run --silent audit -- --all
```

### Specific Phase

```bash
npm run --silent audit -- react-developer --phase 1
```

### Quiet Mode

```bash
npm run --silent audit -- --all --quiet
```

### JSON Output

```bash
npm run --silent audit -- react-developer --json
```

## Exit Codes

- `0`: All checks pass
- `1`: One or more errors found

## References

- [Agent Architecture](../../../docs/AGENT-ARCHITECTURE.md)
- [Skills Architecture](../../../docs/SKILLS-ARCHITECTURE.md)
- [Lean Agent Template](./lean-agent-template.md)

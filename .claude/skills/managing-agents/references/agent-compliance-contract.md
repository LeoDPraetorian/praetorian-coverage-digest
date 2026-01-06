# Agent Compliance Contract

**The authoritative source for all agent requirements.**

All operations (create, update, audit, fix) reference this contract.

---

## Operation Relationships

| Operation                          | Relationship to Contract           |
| ---------------------------------- | ---------------------------------- |
| `creating-agents`                  | **FOLLOWS** this contract          |
| `updating-agents`                  | **MAINTAINS** this contract        |
| `auditing-agents`                  | **CHECKS** this contract           |
| `fixing-agents`                    | **RESTORES** this contract         |
| `renaming-agents`                  | **FOLLOWS** naming rules           |
| `verifying-agent-skill-invocation` | **VERIFIES** behavioral compliance |
| `searching-agents`                 | **USES** for discovery             |
| `listing-agents`                   | **USES** for organization          |

---

## 1. Frontmatter Requirements

### Required Fields

| Field           | Required | Format                        |
| --------------- | -------- | ----------------------------- |
| `name`          | Yes      | kebab-case, matches filename  |
| `description`   | Yes      | Single-line, ≤1024 chars      |
| `allowed-tools` | Yes      | Comma-separated, alphabetized |

### Optional Fields

| Field            | Format                        | Default    |
| ---------------- | ----------------------------- | ---------- |
| `skills`         | Comma-separated, alphabetized | None       |
| `model`          | opus/sonnet/haiku             | Inherit    |
| `color`          | CSS color name                | Type-based |
| `permissionMode` | default/plan                  | Type-based |

### Field Order

```yaml
---
name: agent-name
description: Single-line description
allowed-tools: Tool1, Tool2, Tool3
skills: skill-a, skill-b, skill-c
model: sonnet
color: green
permissionMode: default
---
```

---

## 2. Description Rules

### Syntax Rules

- **Single-line only** - NO block scalars (`|` or `>`)
- **Character limit**: ≤1024 characters
- **Newlines**: Use `\n` escapes for multiline content
- See: [Block Scalar Rules](patterns/block-scalar-rules.md)

### Content Rules

- **Starts with**: "Use when" trigger phrase
- **Includes capabilities**: What the agent does
- **Contains example**: At least one `<example>` block

### Example Structure

```yaml
description: Use when {trigger} - {capabilities}.\n\n<example>\nContext: {scenario}\nuser: "{request}"\nassistant: "{response}"\n</example>
```

---

## 3. Directory Structure

```
.claude/agents/{type}/
├── {agent-name}.md
├── .local/                    # Backups (gitignored)
│   └── {agent-name}.md.bak.{timestamp}
└── .history/
    └── {agent-name}-CHANGELOG
```

### Agent Types

| Type         | Permission Mode | Line Limit |
| ------------ | --------------- | ---------- |
| architecture | plan            | <400       |
| development  | default         | <300       |
| testing      | default         | <300       |
| quality      | plan            | <300       |
| analysis     | plan            | <300       |
| research     | default         | <300       |
| orchestrator | default         | <400       |
| mcp-tools    | default         | <300       |

---

## 4. Line Count Limits

**🚨 MANDATORY** - See [Line Count Limits](patterns/line-count-limits.md)

| Agent Type                          | Limit | Warning Zone |
| ----------------------------------- | ----- | ------------ |
| Standard                            | <300  | 250-300      |
| Complex (architecture/orchestrator) | <400  | 350-400      |

**If over limit**: Extract patterns to skills before proceeding.

---

## 5. Content Requirements

### Required Sections

1. **Skill Loading Protocol** (for agents with `skills:` in frontmatter)
   - **🚨 MANDATORY** - See [Skill Loading Protocol](patterns/skill-loading-protocol.md)
   - Tier 1: Always read (universal + gateway + core)
   - Tier 2: Multi-step tasks (TodoWrite when ≥2 steps)
   - Tier 3: Triggered by task type
   - Anti-Bypass section (3 bullet points)

2. **Output Format** (JSON with skills_read array)
   - **🚨 MANDATORY** - See [Output Format](patterns/output-format.md)
   - Must include `skills_read` array listing all Read() skills

3. **Escalation Protocol** (when to stop, who to recommend)
   - **🚨 MANDATORY** - See [Escalation Protocol](patterns/escalation-protocol.md)

### Mandatory Universal Skills

All agents MUST include in frontmatter AND Tier 1:

- `verifying-before-completion`
- `calibrating-time-estimates`

---

## 6. Backup Strategy

**🚨 MANDATORY** - See [Backup Strategy](patterns/backup-strategy.md)

Before ANY edit:

```bash
mkdir -p .claude/agents/{type}/.local
cp .claude/agents/{type}/{agent-name}.md \
   .claude/agents/{type}/.local/{agent-name}.md.bak.$(date +%Y%m%d_%H%M%S)
```

---

## 7. Changelog Format

**🚨 MANDATORY** - See [Changelog Format](patterns/changelog-format.md)

All changes must be documented in `.history/{agent-name}-CHANGELOG`.

---

## 8. TDD Requirements

**🚨 MANDATORY** - See [TDD Workflow](patterns/tdd-workflow.md)

```
🔴 RED → 🟢 GREEN → 🔵 REFACTOR
```

- **Creating**: Full TDD (all 3 phases required)
- **Updating**: Simplified TDD (RED-GREEN, REFACTOR optional for minor)
- **Cannot skip RED phase**

---

## 9. Audit Phases Summary

### Phase 0 (CLI - Automated)

- Block scalar detection
- Name mismatch
- Missing/empty description

### Phases 1-18 (Manual - LLM Reasoning)

- Permission mode alignment
- Frontmatter organization
- Tool/skill validation
- Pattern delegation
- Skill Loading Protocol
- And more...

See `auditing-agents` skill for complete phase list.

---

## 10. Two-Tier Skill Compliance

### 🚨 CRITICAL: Frontmatter vs Body Placement

Skills have two locations. Where they live determines where they go in agents:

| Skill Location                     | Frontmatter `skills:` | Tier 3 Tables     |
| ---------------------------------- | --------------------- | ----------------- |
| `.claude/skills/` (core)           | ✅ YES                | Also OK           |
| `.claude/skill-library/` (library) | ❌ NEVER              | ✅ YES (required) |

### Why This Matters

**Library skills in frontmatter will FAIL silently.** The Skill tool only sees core skills. Library skills must be loaded via Read() from Tier 3 trigger tables.

### Correct Pattern

```yaml
# Frontmatter: ONLY core skills and gateways
skills: adhering-to-dry, gateway-frontend, verifying-before-completion
```

```markdown
### Tier 3: Triggered by Task Type

| Trigger                  | Read Path                                                                              |
| ------------------------ | -------------------------------------------------------------------------------------- |
| Security, XSS prevention | `.claude/skill-library/development/frontend/securing-react-implementations/SKILL.md`   |
| TanStack integration     | `.claude/skill-library/architecture/frontend/integrating-tanstack-components/SKILL.md` |
```

### Gateway Skills Reference

Use gateway skills in frontmatter to access library skills:

| Domain       | Gateway Skill          |
| ------------ | ---------------------- |
| Frontend     | `gateway-frontend`     |
| Backend      | `gateway-backend`      |
| Testing      | `gateway-testing`      |
| Security     | `gateway-security`     |
| MCP Tools    | `gateway-mcp-tools`    |
| Integrations | `gateway-integrations` |

### How to Check Skill Location

```bash
# If in skills/ → can use in frontmatter
ls .claude/skills/{skill-name}/SKILL.md

# If in skill-library/ → must use in Tier 3 tables
ls .claude/skill-library/**/{skill-name}/SKILL.md
```

---

## 12. Tool Requirements Based on Frontmatter

### Skill Tool Requirement

**🚨 CRITICAL RULE**: If `skills:` field has values → `Skill` MUST be in `tools:` list

**Why Critical**:

- Core skills in frontmatter require Skill tool to invoke via `skill: "name"` syntax
- Without Skill tool, agent cannot execute skill invocations → broken at runtime
- This is a widespread issue affecting 4+ agents currently

**Gold Standard**: See `frontend-developer.md` (line 5)

**Example - CORRECT:**

```yaml
tools: Bash, Edit, Glob, Grep, MultiEdit, Read, Skill, TodoWrite, Write
skills: adhering-to-dry, debugging-systematically, gateway-frontend, verifying-before-completion
```

**Example - BROKEN:**

```yaml
tools: Bash, Glob, Grep, Read, TodoWrite, Write # ❌ Missing Skill!
skills: brainstorming, debugging-systematically, gateway-backend, verifying-before-completion
```

**Currently Broken Agents** (as of audit discovery):

- `backend-architect.md` - Has 6 core skills, no Skill tool
- `security-lead.md` - Has core skills, no Skill tool
- `backend-developer.md` - Has core skills, no Skill tool
- `backend-reviewer.md` - Has core skills, no Skill tool

**Validation**: Phase 3 Tool Validation checks this requirement (see `auditing-agents` workflow-manual-checks.md)

**Fix**: Add `Skill` to tools list in alphabetical order

---

## 11. Anti-Patterns

| Anti-Pattern                      | Why Wrong                                  | Correct                      |
| --------------------------------- | ------------------------------------------ | ---------------------------- |
| Block scalars                     | Breaks discovery                           | Single-line with `\n`        |
| Embedded patterns                 | Agent too long                             | Reference skills             |
| >300/400 lines                    | Not lean                                   | Extract to skills            |
| Skip RED phase                    | No proof needed                            | Always prove gap             |
| Silent skill use                  | Can't verify                               | Explicit invocation          |
| **Library skills in frontmatter** | Fails silently - Skill tool can't see them | Add to Tier 3 tables instead |

---

## Quick Validation Checklist

- [ ] Description: Single-line, ≤1024 chars, "Use when", has `<example>`
- [ ] Name: kebab-case, matches filename
- [ ] Tools/skills: Alphabetized
- [ ] **Skill tool**: Present when `skills:` field has values (Section 12)
- [ ] Line count: <300 (or <400 for complex)
- [ ] Universal skills: `verifying-before-completion`, `calibrating-time-estimates`
- [ ] Skill Loading Protocol: Present (if `skills:` in frontmatter)
- [ ] Output format: JSON with skills_read
- [ ] Gateway skills: Used (not direct paths)
- [ ] **Two-tier compliance**: Frontmatter has ONLY core skills; library skills in Tier 3 tables
- [ ] TDD: RED phase documented

---

## Related Patterns

- [Line Count Limits](patterns/line-count-limits.md)
- [Backup Strategy](patterns/backup-strategy.md)
- [Changelog Format](patterns/changelog-format.md)
- [TDD Workflow](patterns/tdd-workflow.md)
- [Block Scalar Rules](patterns/block-scalar-rules.md)
- [Repo Root Detection](patterns/repo-root-detection.md)
- [Skill Loading Protocol](patterns/skill-loading-protocol.md)
- [Output Format](patterns/output-format.md)
- [Escalation Protocol](patterns/escalation-protocol.md)

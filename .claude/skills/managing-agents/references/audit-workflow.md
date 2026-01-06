# Agent Audit Workflow

**Instruction-based structural and lint validation.**

⚠️ **As of December 2024, agent auditing uses instruction-based workflow with CLI wrapper for complex regex detection.**

---

## Overview

Auditing validates agent structural compliance through **Phase 0: Critical Validation** (automated CLI) followed by **Phases 1-18** (manual LLM reasoning). Phase 0 is the **fast** validation (30-60 seconds) that catches critical issues preventing agent discovery.

## How to Audit an Agent

**Route to the auditing-agents skill:**

```
Read: .claude/skill-library/claude/agent-management/auditing-agents/SKILL.md
```

The `auditing-agents` skill provides the complete workflow.

---

## What the Workflow Provides

### Phase 0: Critical Validation (Automated CLI)

1. **Block scalar detection** - Catches `|` and `>` that make agents invisible
2. **Name consistency** - Validates frontmatter name matches filename
3. **Description validation** - Ensures description field exists and has content
4. **Fast execution** - 30-60 seconds automated via `audit-critical.ts`

### Phases 1-18: Extended Checks (Manual LLM Reasoning)

5. **Manual validation** - Line count, skill loading protocol, gateway coverage, pattern delegation, etc.
6. **Progressive analysis** - Optional Phase 18 for discovering new applicable skills

### What It Checks

| Check                      | Impact                               | Fix                            |
| -------------------------- | ------------------------------------ | ------------------------------ |
| Block scalar (`\|` or `>`) | CRITICAL - Agent invisible to Claude | Convert to single-line         |
| Name mismatch              | CRITICAL - Discovery fails           | Update frontmatter or filename |
| Missing description        | CRITICAL - No discovery metadata     | Add description field          |
| Empty description          | CRITICAL - No discovery content      | Write description              |

---

## Why Instruction-Based?

Auditing requires specialized capabilities:

- **Portable repo root resolution** - Works in both super-repo and normal repo
- **CLI wrapper** - Complex regex detection for block scalars (hard for LLMs)
- **Result interpretation** - Contextual fix guidance based on issue type
- **Integration** - Seamlessly routes to fixing-agents for remediation

---

## Audit vs Test

This is **audit** (structural validation), not **test** (behavioral validation).

**See:** [Audit vs Test Comparison](audit-vs-test.md) for full details.

| Aspect      | Phase 0 (Audit)                                             | Test                  |
| ----------- | ----------------------------------------------------------- | --------------------- |
| **Purpose** | Critical validation (Phase 0 automated, Phases 1-18 manual) | Behavioral validation |
| **Method**  | Phase 0: CLI automation; Phases 1-18: LLM reasoning         | Spawns agents         |
| **Speed**   | Phase 0: 30-60 sec; Phases 1-18: 5-10 min                   | 10-25 min per skill   |
| **When**    | Before commit                                               | Before deployment     |

---

## Time Estimate

- **Phase 0 only (single agent):** 30-60 seconds (automated CLI)
- **Phase 0 only (all agents):** 1-2 minutes (CLI batch processing)
- **Full audit with Phases 1-18:** 10-15 minutes (includes manual checks)

---

## Integration with Other Operations

### Used During Creation

`creating-agents` (Phase 5 & 9):

- Phase 5: Audit after initial generation
- Phase 9: Final audit before completion

### Used During Updates

`updating-agents` (Phase 3 & 5):

- Phase 3: Audit after changes
- Phase 5: Verify no regressions

### Triggers Fixing

If audit finds issues:

```
Audit → Reports issues
  ↓
Fix → Use skill: "fixing-agents"
  ↓
Re-audit → Verify fixes worked
```

---

## CLI Location

The audit CLI is wrapped by the auditing-agents skill:

```bash
# Location (for maintainers):
.claude/skill-library/claude/agent-management/auditing-agents/scripts/src/audit-critical.ts

# Users should never invoke CLI directly - use skill instead
```

---

## Prerequisites

None - the auditing-agents skill handles all setup internally.

---

## Documentation

**Full workflow details:**
`.claude/skill-library/claude/agent-management/auditing-agents/SKILL.md`

**Related references:**

- [Audit vs Test](audit-vs-test.md) - Critical distinction
- [Discovery Testing](discovery-testing.md) - Manual verification protocol
- [Fix Workflow](fix-workflow.md) - Remediation process

---

## Historical Note: test.ts CLI (DEPRECATED)

The `test.ts` CLI script was deprecated - it performed structural checks that now belong in audit, not test. The `test` operation now ONLY routes to `verifying-agent-skill-invocation` for behavioral validation.

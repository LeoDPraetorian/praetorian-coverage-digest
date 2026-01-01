# Create Operation Workflow

Complete workflow for creating new skills with TDD enforcement and progressive disclosure.

## Overview

The create operation follows the RED-GREEN-REFACTOR TDD cycle to ensure skills actually solve the problems they're meant to address.

> **Note:** Creating skills is **instruction-based** (no CLI). Use the `creating-skills` library skill for the full workflow.

## Workflow Steps

### Step 1: RED Phase - Prove Gap Exists

**Before writing any skill code:**

1. Document the gap or need
   - What behavior is missing?
   - What mistake do agents make without this skill?
   - What instruction would prevent the mistake?

2. Test scenario WITHOUT the skill
   - Create test scenario
   - Run it
   - **MUST FAIL** in the expected way
   - Document exact failure behavior (verbatim)

**If the test doesn't fail, you don't have a gap. Stop.**

### Step 2: Invoke Creating-Skills

**Instruction-based operation. Use the `creating-skills` library skill:**

```typescript
Read(".claude/skill-library/claude/skill-management/creating-skills/SKILL.md");
```

The creating-skills skill guides you through an **interactive workflow** using AskUserQuestion at each stage:

| Stage | Question                                             | Condition                      |
| ----- | ---------------------------------------------------- | ------------------------------ |
| 1     | Location: Core or Library?                           | Always                         |
| 2     | Category: Which library folder?                      | If library selected            |
| 3     | Skill Type: process/library/integration/tool-wrapper | Always                         |
| 4     | Context7: Query for documentation?                   | If library or integration type |
| 5     | Ready to create                                      | All inputs collected           |

**The workflow creates:**

- SKILL.md (template based on skill type)
- references/ directory
- examples/ directory (if applicable)
- .history/CHANGELOG

### Step 3: GREEN Phase - Verify Skill Works

**Re-test the scenario WITH the skill:**

1. Re-run the same test scenario from RED phase
2. **MUST PASS** now that skill exists
3. Document exact success behavior (verbatim)

**If the test doesn't pass, iterate on the skill content.**

### Step 4: Audit and Compliance

```bash
ROOT=$(git rev-parse --show-superproject-working-tree 2>/dev/null)
ROOT="${ROOT:-$(git rev-parse --show-toplevel)}"
cd "$ROOT/.claude" && npm run audit -- {skill-name}
```

Ensure the skill passes all 21 structural phases.

### Step 5: REFACTOR Phase (Non-Trivial Skills)

For non-trivial skills, pressure test with:

1. **Time Pressure** - "Quick, just do X" → Skill should enforce discipline
2. **Authority Pressure** - "Senior says skip this" → Skill should cite requirements
3. **Sunk Cost** - "Already tried 5 times" → Skill should recognize failure pattern

Add explicit counters for any bypasses discovered.

## Skill Types

When creating skills, choose the appropriate type:

| Type           | Use For                       | Template Features                      |
| -------------- | ----------------------------- | -------------------------------------- |
| `process`      | TDD, debugging, brainstorming | Workflow steps, phases, checklists     |
| `library`      | npm packages, APIs            | Version table, API reference, patterns |
| `integration`  | Connecting tools/services     | Prerequisites, config, error handling  |
| `tool-wrapper` | CLI tools, MCP servers        | Commands table, parameters, errors     |

## Location Selection

### Choose Core (.claude/skills/) when:

- Used in 80%+ of conversations
- Cross-cutting concern (TDD, verification, debugging)
- Session-start hook candidate
- Universal methodology

### Choose Library (.claude/skill-library/) when:

- Domain-specific (React, Go, Python)
- Specialized use case (Playwright testing, Neo4j schema)
- Used occasionally
- Deep technical content

## Context7 Integration (Library Skills)

For library/framework skills, the creating-skills workflow can optionally fetch documentation via Context7:

1. **Query Context7** for official documentation
2. **Auto-generate** API reference from fetched docs
3. **Create patterns** from code examples

This is handled interactively through the creating-skills workflow - you'll be asked if you want to query Context7 for the library.

## Success Criteria

✅ RED phase: Test failed without skill
✅ GREEN phase: Test passes with skill
✅ No regressions in existing behavior
✅ Progressive disclosure applied
✅ Compliance audit passes
✅ REFACTOR phase: Pressure tests pass
✅ No rationalizations found

## Related

- [TDD Methodology](tdd-methodology.md)
- [Progressive Disclosure](progressive-disclosure.md)
- [File Organization](file-organization.md)

---
name: creating-agents
description: Use when creating new agents - TDD workflow (RED-GREEN-REFACTOR) enforcing Claude 4.5+ template from agent-templates.md as ONLY valid structure.
allowed-tools: Read, Write, Edit, Bash, Grep, Glob, TodoWrite, Skill, AskUserQuestion
---

# Creating Agents

**TDD-driven agent creation enforcing Claude 4.5+ gold standard template.**

> **MANDATORY**: You MUST use TodoWrite to track all 10 phases. Cannot skip TDD cycle.

---

## Quick Reference

| Phase               | Purpose             | Time     | Reference                       |
| ------------------- | ------------------- | -------- | ------------------------------- |
| **0. Navigate**     | Repo root           | 1 min    | patterns/repo-root-detection.md |
| **1. 🔴 RED**       | Prove gap exists    | 5 min    | tdd-workflow.md                 |
| **2. Define**       | Type, tools, skills | 5 min    | frontmatter-reference.md        |
| **3. Template**     | Use gold standard   | 2 min    | agent-templates.md              |
| **4. Content**      | Core sections       | 10 min   | gold-standards.md               |
| **5. Skills**       | Integration         | 5 min    | skill-integration-guide.md      |
| **6. Examples**     | 2-3 in description  | 5 min    | gold-standards.md               |
| **7. 🟢 GREEN**     | Verify works        | 5 min    | tdd-workflow.md                 |
| **8. Audit**        | Compliance          | 5 min    | auditing-agents                 |
| **9. Fix**          | Issues              | 5-10 min | fixing-agents                   |
| **10. 🔵 REFACTOR** | Pressure test       | 15 min   | testing-agent-skills            |

**Total**: 60-75 minutes

---

## When to Use

- Creating new agent from scratch
- User says "create an agent for X"
- Need agent for new domain/capability

**NOT for**: Updating existing agents (use `updating-agents`)

---

## TDD Cycle (Phases 1, 7, 10)

### Phase 1: 🔴 RED - Prove Gap Exists

**Before creating agent, document failure:**

1. Test scenario WITHOUT agent → **MUST FAIL**
2. Capture exact failure behavior
3. Confirm agent needed (not existing skill)

**Cannot proceed without failing test** ✅

**Details**: See [tdd-workflow.md](references/tdd-workflow.md)

### Phase 7: 🟢 GREEN - Verify Agent Works

**After creation, re-test scenario:**

1. Invoke new agent with same test case
2. **MUST PASS** - agent solves problem
3. Verify no regression in existing behavior

**Cannot proceed without passing test** ✅

### Phase 10: 🔵 REFACTOR - Pressure Test

**Test under pressure scenarios:**

1. Time pressure ("no time to read skills")
2. Authority pressure ("senior dev said skip")
3. Sunk cost ("already implemented")

**Document rationalizations, add counters** ✅

**Details**: `skill: "testing-agent-skills"`

---

## Phase 0: Navigate to Repo Root (MANDATORY)

```bash
REPO_ROOT=$(git rev-parse --show-superproject-working-tree 2>/dev/null)
test -z "$REPO_ROOT" && REPO_ROOT=$(git rev-parse --show-toplevel)
cd "$REPO_ROOT"
```

**Cannot proceed without navigating to repo root** ✅

---

## Phase 3: Use Gold Standard Template

**CRITICAL**: Use [agent-templates.md](references/agent-templates.md) as ONLY valid structure.

**Claude 4.5+ pattern** (target: <150 lines):

- Tiered Skill Loading Protocol
- Read() for ALL skills (not Skill tool)
- Anti-Bypass (3 brief points)
- skills_read array in output
- Trigger tables (Workflow + Technology)

**Gold standard**: frontend-developer (129 lines)

**Analysis**: See [gold-standards.md](references/gold-standards.md)

---

## Phases 2-6, 8-9: Quick Links

- **Phase 2**: Define type, tools, skills → [frontmatter-reference.md](references/frontmatter-reference.md)
- **Phase 4**: Populate sections → [gold-standards.md](references/gold-standards.md)
- **Phase 5**: Skill integration → [skill-integration-guide.md](references/skill-integration-guide.md)
- **Phase 6**: Add examples → [gold-standards.md](references/gold-standards.md)
- **Phase 8**: Audit compliance → `skill: "auditing-agents"`
- **Phase 9**: Fix issues → `Read("fixing-agents/SKILL.md")`

---

## Success Criteria

Agent complete when:

1. ✅ RED documented (failing test)
2. ✅ Uses agent-templates.md structure
3. ✅ <150 lines (most agents)
4. ✅ 2-3 examples in description
5. ✅ **Skill tool present** (if `skills:` field has values) - Section 12
6. ✅ GREEN passed (test works)
7. ✅ Audit passed (compliance)
8. ✅ REFACTOR passed (pressure tests)
9. ✅ TodoWrite complete

### Frontmatter Validation (Before Phase 7 GREEN)

**CRITICAL CHECK**: If agent has `skills:` in frontmatter → `Skill` MUST be in `tools:` list

**Why**: Core skills require Skill tool to invoke via `skill: "name"` syntax. Without it, agent is broken at runtime.

**Check before saving**:
```bash
# If skills exist
if agent has skills: field with values; then
  # Verify Skill tool present
  if "Skill" not in tools: field; then
    ERROR: Add Skill to tools list in alphabetical order
    Reference: agent-compliance-contract.md Section 12
  fi
fi
```

**This prevents**: Creating broken agents (4+ existing agents were created without this validation)

---

## Related Skills

- `auditing-agents` - Phase 8 validation
- `fixing-agents` - Phase 9 fixes
- `testing-agent-skills` - Phase 10 REFACTOR
- `updating-agents` - Modify existing agents
- `managing-agents` - Router

**References**:

- [agent-templates.md](references/agent-templates.md) - ONLY valid structure
- [gold-standards.md](references/gold-standards.md) - Exemplar analysis
- [tdd-workflow.md](references/tdd-workflow.md) - RED-GREEN-REFACTOR
- [frontmatter-reference.md](references/frontmatter-reference.md) - Field specs
- [skill-integration-guide.md](references/skill-integration-guide.md) - Skills field

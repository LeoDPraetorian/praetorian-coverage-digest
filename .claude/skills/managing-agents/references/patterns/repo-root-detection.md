# Repository Root Navigation (MANDATORY Step 0)

**Every agent operation MUST start by navigating to super-repo root.**

Referenced by: All agent-management skills (`updating-agents`, `creating-agents`, `auditing-agents`, `fixing-agents`, `renaming-agents`, `finding-skills-for-agents`, `testing-agent-skills`, `listing-agents`, `searching-agents`)

---

## MANDATORY Step 0: Navigate to Repository Root

**Before ANY agent operation, execute this command:**

```bash
REPO_ROOT=$(git rev-parse --show-superproject-working-tree 2>/dev/null)
test -z "$REPO_ROOT" && REPO_ROOT=$(git rev-parse --show-toplevel)
cd "$REPO_ROOT"
```

**Why this is mandatory:**

- Agent files live at `.claude/agents/` in super-repo root
- Skills live at `.claude/skills/` and `.claude/skill-library/` in super-repo root
- Claude Code sessions often start in submodules or subdirectories
- Operating from wrong directory causes "file not found" errors

**Verification:**

```bash
pwd                    # Should show super-repo root
ls .claude/agents/     # Should list agent categories
```

**Cannot proceed with agent operations without this step** ✅

---

## ⚠️ CRITICAL: Anti-Rationalization for File Not Found

**Common failure mode:**

1. Agent runs from submodule directory
2. Searches for agent file: `find .claude/agents -name "foo.md"`
3. File not found (looking in wrong location)
4. Agent invents explanation: "This must be a built-in agent I can't modify"
5. Agent gives up or provides wrong guidance

**If you cannot find an agent file, the answer is NEVER:**

- ❌ "This must be a built-in Claude Code agent"
- ❌ "This is part of the core agent registry"
- ❌ "I can't modify this because it's system-managed"
- ❌ "The agent doesn't exist in this repo"
- ❌ "This requires special permissions to edit"

**The answer is ALWAYS:**

1. ✅ Check: What directory am I in? (`pwd`)
2. ✅ Navigate: Execute Step 0 above to go to super-repo root
3. ✅ Retry: Try finding/reading the file again from correct location

**Why this matters:**

- This is a LOCATION problem, not a FILE problem
- The file exists, you're just looking in the wrong place
- Inventing explanations wastes time and gives wrong conclusions
- Simply navigating to repo root fixes 99% of "file not found" issues

**Real example of this failure:**
Agent tried to update `frontend-architect` agent, couldn't find file, concluded it was a "built-in Claude Code agent" that couldn't be modified. Reality: Agent was in a submodule directory. File existed at super-repo root the whole time.

---

## The Pattern (For Detection Only)

When you need to detect repo root but NOT navigate (e.g., in CLI scripts):

```bash
REPO_ROOT=$(git rev-parse --show-superproject-working-tree 2>/dev/null)
REPO_ROOT="${REPO_ROOT:-$(git rev-parse --show-toplevel)}"
```

---

## Why This Pattern

### Problem

This repository is a **super-repo with submodules**. Standard `git rev-parse --show-toplevel` may return:

- The submodule root (WRONG)
- The super-repo root (CORRECT)

### Solution

1. **First try**: `--show-superproject-working-tree` - Returns super-repo root if in submodule
2. **Fallback**: `--show-toplevel` - Returns repo root if not in submodule
3. **Combine**: Use bash parameter expansion `${VAR:-default}` for fallback
4. **Navigate**: `cd "$REPO_ROOT"` to actually move to the location

---

## Usage in Skills

**Every agent-management skill should include this as Step 0:**

````markdown
## Step 0: Navigate to Repository Root (MANDATORY)

```bash
REPO_ROOT=$(git rev-parse --show-superproject-working-tree 2>/dev/null)
test -z "$REPO_ROOT" && REPO_ROOT=$(git rev-parse --show-toplevel)
cd "$REPO_ROOT"
```
````

**See:** [Repository Root Navigation](../../../../skills/managing-agents/references/patterns/repo-root-detection.md)

````

---

## Common Anti-Patterns

### Wrong: Hardcoded Paths

```bash
# WRONG - breaks on different machines
cd /Users/dev/chariot-development-platform/.claude
````

### Wrong: Only git rev-parse --show-toplevel

```bash
# WRONG - may return submodule root
cd "$(git rev-parse --show-toplevel)/.claude"
```

### Wrong: Relative Paths

```bash
# WRONG - depends on current directory
cd .claude/agents
```

### Wrong: Skipping Navigation Step

```bash
# WRONG - assumes you're already in the right place
find .claude/agents -name "foo.md"
```

**Always navigate to repo root first, then perform operations.**

---

## Quick Reference

| Component                      | Command                                                                                                                                                        |
| ------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Navigate to root (Step 0)**  | `REPO_ROOT=$(git rev-parse --show-superproject-working-tree 2>/dev/null); test -z "$REPO_ROOT" && REPO_ROOT=$(git rev-parse --show-toplevel); cd "$REPO_ROOT"` |
| Get repo root (detection only) | `REPO_ROOT=$(git rev-parse --show-superproject-working-tree 2>/dev/null); REPO_ROOT="${REPO_ROOT:-$(git rev-parse --show-toplevel)}"`                          |
| Agents directory               | `$REPO_ROOT/.claude/agents`                                                                                                                                    |
| Skill library                  | `$REPO_ROOT/.claude/skill-library`                                                                                                                             |
| Core skills                    | `$REPO_ROOT/.claude/skills`                                                                                                                                    |

---

## Related

- Skill management uses identical pattern
- [Agent Compliance Contract](../agent-compliance-contract.md)
- Referenced by all agent-management library skills

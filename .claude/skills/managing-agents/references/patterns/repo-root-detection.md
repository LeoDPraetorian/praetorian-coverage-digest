# Repository Root Navigation (MANDATORY Step 0)

**Every agent operation MUST start by navigating to super-repo root.**

Referenced by: All agent-management skills (`updating-agents`, `creating-agents`, `auditing-agents`, `fixing-agents`, `renaming-agents`, `finding-skills-for-agents`, `verifying-agent-skill-invocation`, `listing-agents`, `searching-agents`)

---

## MANDATORY Step 0: Navigate to Repository Root

**Before ANY agent operation, execute this command:**

```bash
ROOT="$(git rev-parse --show-superproject-working-tree --show-toplevel | head -1)" && cd "$ROOT"
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

## How the Pattern Works

```bash
ROOT="$(git rev-parse --show-superproject-working-tree --show-toplevel | head -1)"
```

**Breakdown:**

1. `--show-superproject-working-tree` - Returns super-repo root if in submodule (empty if not)
2. `--show-toplevel` - Returns current repo root
3. Both flags together - Git outputs both values (super-repo first, then toplevel)
4. `| head -1` - Takes the first non-empty line (super-repo root when in submodule, repo root otherwise)

**Why this pattern is best:**

- Single git command with both flags
- No stderr redirect (`2>/dev/null`) needed
- No conditional `test -z` check needed
- Works reliably in Claude Code's Bash tool
- Avoids parsing issues with complex bash operators

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
ROOT="$(git rev-parse --show-superproject-working-tree --show-toplevel | head -1)"
```

---

## Why This Pattern

### Problem

This repository is a **super-repo with submodules**. Standard `git rev-parse --show-toplevel` may return:

- The submodule root (WRONG)
- The super-repo root (CORRECT)

### Solution

The combined flags pattern solves this:

1. **`--show-superproject-working-tree`** - Returns super-repo root if in submodule
2. **`--show-toplevel`** - Returns repo root
3. **`| head -1`** - Takes first non-empty result (super-repo wins when in submodule)
4. **`&& cd "$ROOT"`** - Navigate to the detected location

---

## Usage in Skills

**Every agent-management skill should include this as Step 0:**

````markdown
## Step 0: Navigate to Repository Root (MANDATORY)

```bash
ROOT="$(git rev-parse --show-superproject-working-tree --show-toplevel | head -1)" && cd "$ROOT"
```
````

**See:** [Repository Root Navigation](../../../../skills/managing-agents/references/patterns/repo-root-detection.md)

---

## Common Anti-Patterns

### Wrong: Hardcoded Paths

```bash
# WRONG - breaks on different machines
cd /Users/dev/chariot-development-platform/.claude
```

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

| Component                      | Command                                                                                             |
| ------------------------------ | --------------------------------------------------------------------------------------------------- |
| **Navigate to root (Step 0)**  | `ROOT="$(git rev-parse --show-superproject-working-tree --show-toplevel \| head -1)" && cd "$ROOT"` |
| Get repo root (detection only) | `ROOT="$(git rev-parse --show-superproject-working-tree --show-toplevel \| head -1)"`               |
| Agents directory               | `$ROOT/.claude/agents`                                                                              |
| Skill library                  | `$ROOT/.claude/skill-library`                                                                       |
| Core skills                    | `$ROOT/.claude/skills`                                                                              |

---

## Related

- Skill management uses identical pattern: [managing-skills repo-root-detection](../../../../skills/managing-skills/references/patterns/repo-root-detection.md)
- [Agent Compliance Contract](../agent-compliance-contract.md)
- Referenced by all agent-management library skills

# REQUIRED SUB-SKILL Declarations

**Pattern 9.1: REQUIRED SUB-SKILL Declarations**

## Declaration Syntax

Use these markers in orchestration prompts to signal mandatory skill invocations:

| Marker                                                   | Meaning                             | When to Use                                                           |
| -------------------------------------------------------- | ----------------------------------- | --------------------------------------------------------------------- |
| `**REQUIRED SUB-SKILL:** skill-name`                     | Must invoke before/during execution | Agent cannot complete task without this skill                         |
| `**REQUIRED BACKGROUND:** skill-name`                    | Foundational knowledge needed       | Agent should read for context but not necessarily follow procedurally |
| `**CONDITIONAL SUB-SKILL:** skill-name (when condition)` | Invoke if condition met             | Skill applies only in specific scenarios                              |

## Foundational Sub-Skills for Orchestration

Every orchestration workflow should include these base skills:

- `persisting-agent-outputs` - Output directory structure and MANIFEST.yaml schema for state tracking
- `persisting-progress-across-sessions` - Cross-session progress persistence for long-running workflows

## Example Workflow Declaration

```
Phase 1: Setup

**REQUIRED SUB-SKILL:** persisting-agent-outputs (discover output dir, MANIFEST.yaml schema)
**REQUIRED SUB-SKILL:** using-git-worktrees (isolated workspace)
**CONDITIONAL SUB-SKILL:** brainstorming (when requirements unclear)

Steps:
1. Invoke persisting-agent-outputs to set up OUTPUT_DIR
2. Create MANIFEST.yaml with initial metadata
3. If using worktrees, invoke using-git-worktrees
```

## Benefits

1. **Explicit Dependencies** - Makes skill prerequisites visible in workflow definition
2. **Verification** - Reviewers can check if required skills were actually invoked
3. **Discoverability** - Helps agents find relevant supporting skills
4. **Maintenance** - When updating skills, find all dependent workflows easily

## Validation Protocol

When reviewing orchestration implementations, verify:

- [ ] All `REQUIRED SUB-SKILL` declarations were actually invoked
- [ ] Invocations happened at appropriate phase (before/during as specified)
- [ ] Agent outputs reference skill usage (check skills_invoked metadata)

## Related Patterns

- **Agent Output Validation** (references/agent-output-validation.md) - Verify skills_invoked metadata block
- **Post-Completion Verification** - Check that required skills were not skipped
- **Workflow Handoff Protocol** (references/workflow-handoff.md) - Passing skill requirements to child workflows

## External Sources

REQUIRED SUB-SKILL pattern from: Obra's Superpowers
https://github.com/obra/superpowers

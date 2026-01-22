# Workflow Handoff Protocol

**Pattern 9.4: Workflow Handoff Protocol**

## Overview

When a skill is invoked as part of a larger workflow (e.g., research skill called from update skill), it needs to integrate smoothly without creating orphaned sub-workflows.

## Detection Protocol

**Step 1: Check for Parent Workflow**

```javascript
// Pseudocode - actual implementation varies by tool
if (TodoWrite.exists() && TodoWrite.hasActiveItems()) {
  // Parent workflow exists - integrate
  parent_workflow = true;
} else {
  // No parent - create own tracking
  parent_workflow = false;
}
```

**Step 2: Integrate or Initialize**

| Scenario      | Action                                                          |
| ------------- | --------------------------------------------------------------- |
| Parent exists | Update parent's todo status, return structured output to parent |
| No parent     | Create own TodoWrite tracking for this workflow                 |

## Structured Output Format

When returning to parent workflow:

```json
{
  "status": "complete",
  "workflow_type": "research",
  "outputs": ["SYNTHESIS.md", "source-1.md", "source-2.md"],
  "next_steps": ["Continue to Step 5 (Edit)", "Incorporate research findings"],
  "signal": "WORKFLOW_CONTINUATION_REQUIRED"
}
```

**Critical**: Include `WORKFLOW_CONTINUATION_REQUIRED` signal so parent knows to resume its workflow.

## Parent Workflow Continuation

Parent orchestrator must:

1. **Receive** structured output with continuation signal
2. **Check TodoWrite** for remaining pending steps
3. **Resume** at next pending step (don't stop or ask for permission)

### Anti-Pattern (WRONG)

```
orchestrating-research completes
→ "Research complete! Key findings: ..."
→ STOPS and waits for user ❌
```

### Correct Pattern

```
orchestrating-research completes with WORKFLOW_CONTINUATION_REQUIRED
→ Check TodoWrite
→ See "Step 5: Edit" is pending
→ Automatically proceed to Step 5
→ ... continue through Step 8
→ "Update complete" ✅
```

## State Preservation

Parent workflow should preserve:

- Original task description
- TodoWrite items created before handoff
- Progress file metadata
- MANIFEST.yaml entries

Child workflow should preserve:

- Output directory structure
- Research artifacts
- Metadata for traceability

## Related Patterns

- **Progress File Format** (references/progress-file-format.md) - State persistence structure
- **MANIFEST.yaml Maintenance** - Agent contribution tracking
- **Post-Completion Verification** (references/agent-output-validation.md) - Verify handoff occurred

## Examples

### Research Integration in Skill Updates

Parent: `updating-skills`
Child: `orchestrating-research`

```
Step 3: Backup ✅
Step 4: Research (invoke orchestrating-research) ✅
  → orchestrating-research creates OUTPUT_DIR
  → produces SYNTHESIS.md
  → returns {signal: "WORKFLOW_CONTINUATION_REQUIRED"}
Step 5: Edit (parent resumes HERE) ← automatic continuation
Step 6: GREEN verification
Step 7: Compliance
Step 8: REFACTOR
```

### Feature Development with Brainstorming

Parent: `orchestrating-feature-development`
Child: `brainstorming`

```
Phase 1: Setup ✅
Phase 2: Brainstorming (invoke brainstorming skill) ✅
  → brainstorming refines design
  → returns refined spec
  → returns {signal: "WORKFLOW_CONTINUATION_REQUIRED"}
Phase 3: Discovery (parent resumes HERE)
Phase 4: Planning
...
```

## External Sources

Workflow handoff pattern derived from multi-agent orchestration best practices (Anthropic Building Effective Agents).

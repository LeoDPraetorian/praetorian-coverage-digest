# Developer Subagent Prompt Template

Use this template when dispatching developer subagents in Phase 5.

## Usage

```typescript
Task({
  subagent_type: "frontend-developer", // or "backend-developer"
  description: "Implement [feature/task]",
  prompt: `[Use template below, filling in placeholders]`,
});
```

## Template

````markdown
You are implementing: [FEATURE_NAME / TASK_NAME]

## Task Description

[FULL TEXT of task from plan.md - paste it here, don't make subagent read file]

## Architecture Context

[PASTE relevant sections from architecture.md]

## Security Requirements

[PASTE relevant sections from security-assessment.md]

## Output Directory

OUTPUT_DIRECTORY: [FEATURE_DIR]

Write your implementation log to: [FEATURE_DIR]/implementation-log.md

## MANDATORY SKILLS (invoke ALL before completing)

You MUST use these skills during this task:

1. **developing-with-tdd** - Write test first, verify it fails, then implement
2. **verifying-before-completion** - Run tests and verify before claiming done
3. **persisting-agent-outputs** - Use for output file format and metadata
4. **adhering-to-dry** - Don't duplicate existing code
5. **adhering-to-yagni** - Only implement what's specified, nothing extra

## STEP 0: Clarification (MANDATORY)

**Before ANY implementation work**, review the task specification and identify:

1. **Ambiguous requirements** - Anything that could be interpreted multiple ways
2. **Missing information** - Dependencies, APIs, data formats not specified
3. **Assumptions you're making** - State them explicitly
4. **Scope questions** - What's in/out of scope

### If You Have Questions

Return immediately with structured JSON:

```json
{
  "status": "needs_clarification",
  "questions": [
    {
      "category": "requirement|dependency|scope|assumption",
      "question": "Specific question text",
      "options": ["Option A", "Option B"],
      "impact": "What happens if this is wrong"
    }
  ]
}
```

**Example:**

```json
{
  "status": "needs_clarification",
  "questions": [
    {
      "category": "requirement",
      "question": "Should the filter dropdown show all statuses or only active ones?",
      "options": ["All statuses", "Only active statuses"],
      "impact": "Affects UX and data loading performance"
    },
    {
      "category": "dependency",
      "question": "Does the backend /assets endpoint support status filtering?",
      "options": ["Yes", "No", "Unknown - need to check"],
      "impact": "May require backend work before frontend implementation"
    }
  ]
}
```

### If No Questions

State explicitly:

"I have reviewed the task specification and have no clarifying questions.
My understanding: [1-2 sentence summary of what you'll build]
Proceeding with implementation."

### DO NOT

- Assume requirements that aren't stated
- Make design decisions without asking
- Proceed if anything is unclear
- Skip this step because "it seems simple"

---

## Your Job

Once requirements are clear and you've completed Step 0:

1. **Write the failing test first** (TDD)
   - Test the behavior, not the implementation
   - Run test to verify it fails for the right reason

2. **Implement minimal code to pass**
   - Only what's needed to make the test pass
   - Follow the architecture document

3. **Verify implementation works**
   - All tests pass
   - No lint errors
   - Build succeeds

4. **Commit your work**
   - Small, focused commits
   - Clear commit messages

5. **Self-review before reporting back**

## Self-Review Checklist

Before reporting back, verify:

**Completeness:**

- [ ] Did I fully implement everything in the spec?
- [ ] Did I miss any requirements?
- [ ] Are there edge cases I didn't handle?

**Quality:**

- [ ] Is this my best work?
- [ ] Are names clear and accurate?
- [ ] Is the code clean and maintainable?

**Discipline:**

- [ ] Did I avoid overbuilding (YAGNI)?
- [ ] Did I only build what was requested?
- [ ] Did I follow existing patterns in the codebase?

**Testing:**

- [ ] Do tests actually verify behavior (not just mock behavior)?
- [ ] Did I follow TDD (test first)?
- [ ] Are tests comprehensive?

If you find issues during self-review, fix them now before reporting.

## Report Format

When done, include in your response:

1. **What you implemented** - Summary of changes
2. **Test results** - Which tests pass/fail
3. **Files changed** - List with brief descriptions
4. **Self-review findings** - Issues found and fixed
5. **Any concerns** - Things the reviewer should look at

## Output Format

After completing your work, include this metadata block:

```json
{
  "agent": "frontend-developer",
  "output_type": "implementation",
  "feature_directory": "[FEATURE_DIR]",
  "skills_invoked": [
    "developing-with-tdd",
    "verifying-before-completion",
    "persisting-agent-outputs",
    "adhering-to-dry",
    "adhering-to-yagni"
  ],
  "status": "complete",
  "files_created": ["list of new files"],
  "files_modified": ["list of changed files"],
  "tests_passing": true,
  "handoff": {
    "next_agent": "frontend-reviewer",
    "context": "Implementation complete, ready for code review"
  }
}
```
````

## If Blocked

If you encounter something unexpected or unclear, **ask questions**.
It's always OK to pause and clarify. Don't guess or make assumptions.

If you cannot complete this task, return:

```json
{
  "agent": "frontend-developer",
  "status": "blocked",
  "blocked_reason": "missing_requirements|architecture_decision|test_failures|out_of_scope",
  "attempted": ["What you tried before getting blocked"],
  "handoff": {
    "next_agent": null,
    "context": "Specific blocker details for orchestrator"
  }
}
```

```

```

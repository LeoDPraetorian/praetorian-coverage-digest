# Developer Subagent Prompt Template

Use this template when dispatching developer subagents in Phase 6.

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

## Prior Iteration Context (if in feedback loop)

**READ FIRST if exists:** [FEATURE_DIR]/feedback-scratchpad.md

If this file exists, you are in a feedback loop iteration. The file contains:
- What was implemented in prior iterations
- Review issues that must be addressed
- Test failures that must be fixed

### Issues to Address This Iteration:
[INJECT_REVIEW_ISSUES_PLACEHOLDER]

### Test Failures to Fix:
[INJECT_TEST_FAILURES_PLACEHOLDER]

**CRITICAL:** You MUST address the specific issues listed above. Do not ignore them or make the same mistakes.

## MANDATORY SKILLS (invoke ALL before completing)

You MUST invoke these skills during this task. These come from your agent definition Step 1 + Step 2:

### Step 1: Always Invoke First (Non-Negotiable)

1. **using-skills** - Compliance rules, 1% threshold, skill discovery protocol
2. **discovering-reusable-code** - Exhaustively search for reusable patterns before writing new code
3. **semantic-code-operations** - Core code tool (Serena MCP) for semantic search and editing
4. **calibrating-time-estimates** - Prevents "no time to read skills" rationalization
5. **enforcing-evidence-based-analysis** - **CRITICAL: Prevents hallucinations** - read source files before making claims
6. **gateway-frontend** or **gateway-backend** - Routes to mandatory + task-specific library skills for your domain
7. **persisting-agent-outputs** - Defines output directory, file naming, MANIFEST.yaml format
8. **developing-with-tdd** - Write test first, watch it fail, then implement
9. **verifying-before-completion** - Ensures verification before claiming work is done

### Step 2: Task-Specific Skills (Conditional - Invoke Based on Context)

10. **executing-plans** - When implementing an architect's plan with multiple tasks
11. **adhering-to-dry** - When there are code duplication concerns or checking existing patterns
12. **adhering-to-yagni** - When there's scope creep risk or temptation to add extra features
13. **debugging-systematically** - When investigating bugs, errors, or unexpected behavior
14. **tracing-root-causes** - When bug is deep in call stack and need to trace backward
15. **debugging-strategies** - When dealing with performance, race conditions, flaky tests, memory issues
16. **using-todowrite** - When task requires multiple steps (≥2 steps) to complete

**COMPLIANCE**: Document all invoked skills in the output metadata `skills_invoked` array. The orchestrator will verify this list matches the mandatory skills above.

### Step 3: Load Library Skills from Gateway

After invoking the gateway in Step 1, follow its instructions:

**The gateway provides:**
1. **Mandatory library skills for your role** - Read ALL skills the gateway lists as mandatory for Developers
2. **Task-specific routing** - Use routing tables to find relevant library skills for this specific task
3. **Implementation patterns and best practices** - Domain-specific guidance (React patterns, Go idioms, etc.)

**How to load library skills:**
```
Read(".claude/skill-library/path/from/gateway/SKILL.md")
```

**CRITICAL:**
- Library skill paths come FROM the gateway—do NOT hardcode them
- You MUST read the mandatory library skills the gateway specifies for your role
- After invoking persisting-agent-outputs, follow its discovery protocol to find/create the feature directory
- YOU MUST WRITE YOUR OUTPUT TO A FILE (not just respond with text)

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

**While you work:** If you encounter something unexpected or unclear, **ask questions**. It's always OK to pause and clarify. Don't guess or make assumptions.

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

## TDD Pattern (Follow These Examples)

Before implementing, study these examples. Your implementation MUST follow this exact pattern.

### Example 1: Simple Function

**Task**: Add function to validate email format

**Step 1 - Write failing test first**:
```typescript
// tests/validators.test.ts
describe('validateEmail', () => {
  it('returns true for valid email', () => {
    expect(validateEmail('user@example.com')).toBe(true);
  });

  it('returns false for missing @', () => {
    expect(validateEmail('userexample.com')).toBe(false);
  });

  it('returns false for empty string', () => {
    expect(validateEmail('')).toBe(false);
  });
});
```

**Step 2 - Run test, verify it fails for the RIGHT reason**:
```
FAIL  tests/validators.test.ts
  ● validateEmail › returns true for valid email
    ReferenceError: validateEmail is not defined
```
✓ Correct failure - function doesn't exist yet

**Step 3 - Write minimal code to pass**:
```typescript
// src/validators.ts
export function validateEmail(email: string): boolean {
  if (!email) return false;
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}
```

**Step 4 - Run test, verify it passes**:
```
PASS  tests/validators.test.ts
  ✓ validateEmail › returns true for valid email (2ms)
  ✓ validateEmail › returns false for missing @ (1ms)
  ✓ validateEmail › returns false for empty string (1ms)
```

### Example 2: React Component with State

**Task**: Add toggle button that tracks enabled/disabled state

**Step 1 - Write failing test first**:
```typescript
// ToggleButton.test.tsx
describe('ToggleButton', () => {
  it('renders with initial disabled state', () => {
    render(<ToggleButton />);
    expect(screen.getByRole('button')).toHaveTextContent('Enable');
  });

  it('toggles to enabled when clicked', async () => {
    render(<ToggleButton />);
    await userEvent.click(screen.getByRole('button'));
    expect(screen.getByRole('button')).toHaveTextContent('Disable');
  });

  it('calls onChange with new state', async () => {
    const onChange = vi.fn();
    render(<ToggleButton onChange={onChange} />);
    await userEvent.click(screen.getByRole('button'));
    expect(onChange).toHaveBeenCalledWith(true);
  });
});
```

**Step 2 - Verify failure**:
```
FAIL  ToggleButton.test.tsx
  ● ToggleButton › renders with initial disabled state
    Error: Unable to find role="button"
```
✓ Correct - component doesn't exist

**Step 3 - Minimal implementation**:
```typescript
// ToggleButton.tsx
interface ToggleButtonProps {
  onChange?: (enabled: boolean) => void;
}

export function ToggleButton({ onChange }: ToggleButtonProps) {
  const [enabled, setEnabled] = useState(false);

  const handleClick = () => {
    const newState = !enabled;
    setEnabled(newState);
    onChange?.(newState);
  };

  return (
    <button onClick={handleClick}>
      {enabled ? 'Disable' : 'Enable'}
    </button>
  );
}
```

**Step 4 - Verify pass**: All tests green ✓

---

### Example 3: API Integration

**Task**: Add function to fetch user by ID

**Step 1 - Write failing test with mock**:
```typescript
// userApi.test.ts
describe('fetchUser', () => {
  it('returns user data for valid ID', async () => {
    server.use(
      http.get('/api/users/:id', () => {
        return HttpResponse.json({ id: '123', name: 'Test User' });
      })
    );

    const user = await fetchUser('123');
    expect(user).toEqual({ id: '123', name: 'Test User' });
  });

  it('throws error for non-existent user', async () => {
    server.use(
      http.get('/api/users/:id', () => {
        return new HttpResponse(null, { status: 404 });
      })
    );

    await expect(fetchUser('999')).rejects.toThrow('User not found');
  });
});
```

**Step 2 - Verify failure**: fetchUser is not defined ✓

**Step 3 - Implement**:
```typescript
// userApi.ts
export async function fetchUser(id: string): Promise<User> {
  const response = await fetch(`/api/users/${id}`);
  if (!response.ok) {
    if (response.status === 404) throw new Error('User not found');
    throw new Error('Failed to fetch user');
  }
  return response.json();
}
```

**Step 4 - Verify pass**: All tests green ✓

---

**CRITICAL**: Apply this EXACT pattern to your task:
1. Write test FIRST (before any implementation code)
2. Run test and confirm it FAILS for the right reason
3. Write MINIMAL code to make test pass
4. Verify test passes

Do NOT skip steps. Do NOT write implementation before test.

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
    "using-skills",
    "discovering-reusable-code",
    "semantic-code-operations",
    "calibrating-time-estimates",
    "enforcing-evidence-based-analysis",
    "gateway-frontend",
    "persisting-agent-outputs",
    "developing-with-tdd",
    "verifying-before-completion",
    "executing-plans",
    "adhering-to-dry",
    "adhering-to-yagni",
    "debugging-systematically",
    "tracing-root-causes",
    "debugging-strategies",
    "using-todowrite"
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

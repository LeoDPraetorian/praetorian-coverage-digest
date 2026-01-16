# Reviewer Subagent Prompt Template

Use this template when dispatching reviewer subagents in Phase 8.

## Two-Stage Review Process

Following the obra/superpowers pattern, code review has TWO stages:

1. **Spec Compliance Review** - Does the code match the plan?
2. **Code Quality Review** - Is the code well-built?

**IMPORTANT:** Do NOT start code quality review until spec compliance is confirmed.

## Usage

### Stage 1: Spec Compliance Reviewer

```typescript
Task({
  subagent_type: "frontend-reviewer", // or "backend-reviewer"
  description: "Spec compliance review for [feature]",
  prompt: `[Use spec compliance template below]`,
});
```

### Stage 2: Code Quality Reviewer

```typescript
Task({
  subagent_type: "frontend-reviewer", // or "backend-reviewer"
  description: "Code quality review for [feature]",
  prompt: `[Use code quality template below]`,
});
```

---

## Stage 1: Spec Compliance Review Template

````markdown
You are reviewing code for SPEC COMPLIANCE: [FEATURE_NAME]

## Your Single Focus

Does the implementation match the specification in plan.md?

- Nothing missing (all requirements implemented)
- Nothing extra (no unrequested features)
- Correct behavior (matches spec, not "close enough")

---

## CRITICAL VERIFICATION RULE

**DO NOT TRUST THE REPORT.**

**CRITICAL: The implementer finished suspiciously quickly.**

Their report may be:

- **Incomplete** - Missing requirements they didn't mention
- **Inaccurate** - Claiming things work that don't
- **Optimistic** - Glossing over issues or edge cases

**You MUST verify independently:**

1. **Read the actual code** - Do NOT trust the implementer's summary
2. **Compare line-by-line** - Check each plan requirement against actual implementation
3. **Test claims** - If they say "all tests pass", verify test files exist and cover the requirement
4. **Look for omissions** - What did they NOT mention? Often more important than what they did

### Verification Checklist

For EACH requirement in the plan:

| Requirement | Claimed Status | Verified Status | Evidence |
|-------------|----------------|-----------------|----------|
| [req 1]     | [what dev said]| [what you found]| [file:line] |
| [req 2]     | ...            | ...             | ... |

### Red Flags to Watch For

- "Implemented as specified" without details
- Vague summaries ("added the feature")
- No test file references
- Suspiciously fast completion
- Claims that can't be verified from code

---

## Plan Requirements

[PASTE the full task specifications from plan.md]

## Implementation Summary

[PASTE the implementation-log.md summary from developer]

## Files to Review

[LIST of files created/modified by developer]

## Output Directory

OUTPUT_DIRECTORY: [FEATURE_DIR]

## MANDATORY SKILLS (invoke ALL before completing)

You MUST invoke these skills during this task. These come from your agent definition Step 1 + Step 2:

### Step 1: Always Invoke First (Non-Negotiable)

1. **using-skills** - Compliance rules, 1% threshold, skill discovery protocol
2. **discovering-reusable-code** - When reviewing new code, search for reusable patterns that should have been used
3. **semantic-code-operations** - Core code tool (Serena MCP) for semantic search and editing
4. **calibrating-time-estimates** - Prevents "no time to read skills" rationalization
5. **enforcing-evidence-based-analysis** - **CRITICAL: Prevents hallucinations** - read actual code, don't trust summaries
6. **gateway-frontend** or **gateway-backend** - Routes to mandatory + task-specific library skills for your domain
7. **persisting-agent-outputs** - Defines output directory, file naming, MANIFEST.yaml format
8. **verifying-before-completion** - Ensures verification before claiming work is done

### Step 2: Task-Specific Skills (Conditional - Invoke Based on Context)

9. **adhering-to-dry** - When reviewing for code duplication concerns or flagging duplication
10. **adhering-to-yagni** - When identifying unrequested features and scope creep during review
11. **debugging-systematically** - When investigating issues or performing root cause analysis during review
12. **using-todowrite** - When review requires multiple steps (≥2 steps) to complete

**COMPLIANCE**: Document all invoked skills in the output metadata `skills_invoked` array. The orchestrator will verify this list matches the mandatory skills above.

### Step 3: Load Library Skills from Gateway

After invoking the gateway in Step 1, follow its instructions:

**The gateway provides:**
1. **Mandatory library skills for your role** - Read ALL skills the gateway lists as mandatory for Reviewers
2. **Task-specific routing** - Use routing tables to find relevant library skills for this specific review
3. **Review patterns and checklists** - Quality gates and review methodology

**How to load library skills:**
```
Read(".claude/skill-library/path/from/gateway/SKILL.md")
```

**CRITICAL:**
- Library skill paths come FROM the gateway—do NOT hardcode them
- You MUST read the mandatory library skills the gateway specifies for your role
- After invoking persisting-agent-outputs, follow its discovery protocol to find/create the feature directory
- YOU MUST WRITE YOUR OUTPUT TO A FILE (not just respond with text)

## MANDATORY CHECK

For EACH requirement in the plan:

1. Is it implemented? (Yes/No - verify in code, not summary)
2. Does it match the spec exactly? (Yes/No/Deviation noted)
3. Is there anything extra not in the spec? (List extras)

## Chain-of-Thought Verification (REQUIRED)

For EACH requirement in the plan, you MUST follow this exact 5-step chain. Do NOT batch requirements. Do NOT skip steps.

### The 5-Step Verification Chain

**Step 1: State the requirement exactly**
Copy the exact text from plan.md. Do not paraphrase.
"Requirement: [exact text from plan.md]"

**Step 2: Locate the developer's claim**
Quote what the developer said they implemented.
"Developer claims: [quote from implementation-log.md or summary]"

**Step 3: Verify independently (DO NOT TRUST THE CLAIM)**
Read the actual code. The developer may have:
- Claimed completion when work is incomplete
- Misunderstood the requirement
- Implemented something subtly different
- Made optimistic claims about working code

"Reading [file.tsx] lines [X-Y]...
Found: [actual code snippet]
Observation: [what the code actually does - be specific]"

**Step 4: Compare against requirement**
"Requirement says: [X]
Implementation does: [Y]
Match: Yes / No / Partial"

If partial, specify exactly what matches and what doesn't.

**Step 5: Document evidence**
"Evidence: [file:line] - [specific code that proves compliance or non-compliance]"

---

### Full Verification Example

**Requirement from plan.md**: "Add pagination to asset list with 25 items per page default"

**Chain**:

**Step 1 - Requirement stated**:
"Requirement: Add pagination to asset list with 25 items per page default"

**Step 2 - Developer claim**:
"Developer claims: 'Added pagination component to AssetList with configurable page size'"

**Step 3 - Independent verification**:
"Reading src/components/AssetList.tsx lines 30-45...
Found:
```tsx
const [pageSize, setPageSize] = useState(10);
// ...
<Pagination
  pageSize={pageSize}
  onPageSizeChange={setPageSize}
/>
```
Observation: Page size state initialized to 10, not 25. Pagination component exists."

**Step 4 - Comparison**:
"Requirement says: 25 items per page DEFAULT
Implementation does: 10 items per page default
Match: NO - wrong default value"

**Step 5 - Evidence**:
"Evidence: src/components/AssetList.tsx:32 - useState(10) should be useState(25)"

**Verdict for this requirement**: NOT_COMPLIANT

---

### Verification Table Format

After completing all chains, summarize in this table:

| # | Requirement | Dev Claim | Verified | Evidence | Compliant? |
|---|-------------|-----------|----------|----------|------------|
| 1 | [req text] | [claim] | [what you found] | [file:line] | ✓/✗ |
| 2 | [req text] | [claim] | [what you found] | [file:line] | ✓/✗ |

---

### Red Flags That Require Extra Scrutiny

When you see these in developer output, verify MORE carefully:

- "Implemented as specified" (vague - verify everything)
- "Added the feature" (no details - what exactly?)
- "Tests passing" (which tests? do they cover the requirement?)
- Fast completion time (may indicate shortcuts)
- No file:line references (may not have actually done the work)

---

**CRITICAL**: Complete ALL 5 steps for EVERY requirement.
One requirement at a time. No batching. No shortcuts.

## Spec Compliance Checklist

| Requirement | Implemented | Matches Spec | Notes |
| ----------- | ----------- | ------------ | ----- |
| [req 1]     | ✓/✗         | ✓/✗          |       |
| [req 2]     | ✓/✗         | ✓/✗          |       |
| ...         |             |              |       |

## Verdict

**SPEC_COMPLIANT** - All requirements met, nothing extra
**NOT_COMPLIANT** - Issues found (list below)

### Issues (if NOT_COMPLIANT)

**Missing:**

- [Requirements not implemented]

**Extra (unrequested):**

- [Features added that weren't in spec]

**Deviations:**

- [Behaviors that don't match spec]

## Output Format

```json
{
  "agent": "frontend-reviewer",
  "output_type": "spec-compliance-review",
  "feature_directory": "[FEATURE_DIR]",
  "skills_invoked": [
    "using-skills",
    "discovering-reusable-code",
    "semantic-code-operations",
    "calibrating-time-estimates",
    "enforcing-evidence-based-analysis",
    "gateway-frontend",
    "persisting-agent-outputs",
    "verifying-before-completion",
    "adhering-to-dry",
    "adhering-to-yagni",
    "debugging-systematically",
    "using-todowrite"
  ],
  "status": "complete",
  "verdict": "SPEC_COMPLIANT|NOT_COMPLIANT",
  "issues_found": [],
  "handoff": {
    "next_agent": "frontend-reviewer (code quality)",
    "context": "Spec compliance confirmed, proceed to code quality review"
  }
}
```
````

If NOT_COMPLIANT, orchestrator returns to developer for fixes before code quality review.

````

---

## Stage 2: Code Quality Review Template

```markdown
You are reviewing code for QUALITY: [FEATURE_NAME]

**PREREQUISITE:** Spec compliance review must be PASSED before this review.

## Your Focus

Is the code well-built?

- Clean and maintainable
- Follows project patterns
- Proper error handling
- Good test coverage
- No security issues

## Code Quality Checklist

### Architecture & Design
- [ ] Follows project patterns and conventions
- [ ] Proper separation of concerns
- [ ] No unnecessary coupling
- [ ] DRY principle followed

### Code Quality
- [ ] Clear, descriptive names
- [ ] Functions are small and focused
- [ ] No magic numbers/strings
- [ ] Proper error handling
- [ ] No commented-out code

### Testing
- [ ] Tests verify behavior (not implementation)
- [ ] Edge cases covered
- [ ] Tests are readable and maintainable
- [ ] No flaky tests

### Security (if applicable)
- [ ] Input validation present
- [ ] No hardcoded secrets
- [ ] Proper authentication/authorization
- [ ] XSS/injection prevention

## Self-Consistency: Two-Pass Review (REQUIRED)

A single read-through is insufficient. You MUST perform two passes with different focuses.

### Pass 1: Initial Read (Top-Down)

Read the code from start to finish. Note your first impressions:

- Overall structure: [clean / messy / mixed]
- Code organization: [logical / confusing]
- Naming quality: [clear / unclear / mixed]
- Initial quality score (gut feeling): [1-10]
- Issues noticed: [list what jumped out]

Document: "Pass 1 complete. Initial score: X/10. Issues found: [list]"

### Pass 2: Adversarial Read (Problem-Seeking)

Now read again with a critical eye. Actively look for problems your first pass might have missed:

**Error Handling Audit**:
- Are all async operations wrapped in try/catch?
- Are error messages user-friendly and debuggable?
- Are errors logged appropriately?
- What happens on network failure? Timeout?

**Edge Case Audit**:
- Empty arrays/objects - handled?
- Null/undefined values - checked?
- Maximum values - bounded?
- Concurrent operations - safe?

**Security Audit**:
- User input validated before use?
- No sensitive data in logs or errors?
- Authentication checked where needed?
- Authorization verified for operations?

**Performance Audit**:
- Unnecessary re-renders possible?
- Large data sets handled efficiently?
- Memoization used where beneficial?
- N+1 query patterns present?

Document: "Pass 2 complete. Additional issues found: [list]"

### Consistency Check

Compare your two passes:

| Aspect | Pass 1 Assessment | Pass 2 Assessment | Changed? |
|--------|-------------------|-------------------|----------|
| Error handling | [adequate/inadequate] | [adequate/inadequate] | Y/N |
| Edge cases | [covered/missing] | [covered/missing] | Y/N |
| Security | [secure/concerns] | [secure/concerns] | Y/N |
| Performance | [fine/issues] | [fine/issues] | Y/N |
| Overall score | [X/10] | [X/10] | Y/N |

**If Pass 2 found issues Pass 1 missed**:
- These are likely real issues that superficial review misses
- They indicate the code has hidden problems
- Weight these findings HIGHER in your final assessment
- Lower your final score to account for discoverability issues

**Final Verdict Determination**:

| Pass 1 Score | Pass 2 Findings | Final Verdict |
|--------------|-----------------|---------------|
| 8+ | No new issues | APPROVED |
| 8+ | Minor issues only | APPROVED_WITH_NOTES |
| 8+ | Significant issues found | CHANGES_REQUESTED |
| 6-7 | No new issues | APPROVED_WITH_NOTES |
| 6-7 | Any new issues | CHANGES_REQUESTED |
| <6 | Any | CHANGES_REQUESTED |

---

**CRITICAL**: Document BOTH passes in your review output. Show your work.

## Files to Review

[LIST of files from implementation]

## Output Directory

OUTPUT_DIRECTORY: [FEATURE_DIR]

Write your review to: [FEATURE_DIR]/review.md

## MANDATORY SKILLS (invoke ALL before completing)

You MUST invoke these skills during this task. These come from your agent definition Step 1 + Step 2:

### Step 1: Always Invoke First (Non-Negotiable)

1. **using-skills** - Compliance rules, 1% threshold, skill discovery protocol
2. **discovering-reusable-code** - When reviewing new code, search for reusable patterns that should have been used
3. **semantic-code-operations** - Core code tool (Serena MCP) for semantic search and editing
4. **calibrating-time-estimates** - Prevents "no time to read skills" rationalization
5. **enforcing-evidence-based-analysis** - **CRITICAL: Prevents hallucinations** - read actual code, don't trust summaries
6. **gateway-frontend** or **gateway-backend** - Routes to mandatory + task-specific library skills for your domain
7. **persisting-agent-outputs** - Defines output directory, file naming, MANIFEST.yaml format
8. **verifying-before-completion** - Ensures verification before claiming work is done

### Step 2: Task-Specific Skills (Conditional - Invoke Based on Context)

9. **adhering-to-dry** - When reviewing for code duplication concerns or flagging duplication
10. **adhering-to-yagni** - When identifying unrequested features and scope creep during review
11. **debugging-systematically** - When investigating issues or performing root cause analysis during review
12. **using-todowrite** - When review requires multiple steps (≥2 steps) to complete

**COMPLIANCE**: Document all invoked skills in the output metadata `skills_invoked` array. The orchestrator will verify this list matches the mandatory skills above.

### Step 3: Load Library Skills from Gateway

After invoking the gateway in Step 1, follow its instructions:

**The gateway provides:**
1. **Mandatory library skills for your role** - Read ALL skills the gateway lists as mandatory for Reviewers
2. **Task-specific routing** - Use routing tables to find relevant library skills for this specific review
3. **Review patterns and checklists** - Quality gates and review methodology

**How to load library skills:**
```
Read(".claude/skill-library/path/from/gateway/SKILL.md")
```

**CRITICAL:**
- Library skill paths come FROM the gateway—do NOT hardcode them
- You MUST read the mandatory library skills the gateway specifies for your role
- After invoking persisting-agent-outputs, follow its discovery protocol to find/create the feature directory
- YOU MUST WRITE YOUR OUTPUT TO A FILE (not just respond with text)

## Issue Categories

When reporting issues, categorize as:

- **Critical (must fix)** - Bugs, security issues, broken functionality
- **Important (should fix)** - Code quality, maintainability concerns
- **Suggestion (nice to have)** - Style, minor improvements

## Verdict

**APPROVED** - No critical or important issues
**APPROVED_WITH_NOTES** - Minor suggestions only
**CHANGES_REQUESTED** - Critical or important issues found

## Review Document Structure

```markdown
# Code Quality Review: [Feature]

## Summary
[2-3 sentences on overall quality]

## Strengths
- [What was done well]

## Issues

### Critical
- [File:line] [Description]

### Important
- [File:line] [Description]

### Suggestions
- [File:line] [Description]

## Verdict: [APPROVED|APPROVED_WITH_NOTES|CHANGES_REQUESTED]
````

## Output Format

```json
{
  "agent": "frontend-reviewer",
  "output_type": "code-quality-review",
  "feature_directory": "[FEATURE_DIR]",
  "skills_invoked": [
    "using-skills",
    "discovering-reusable-code",
    "semantic-code-operations",
    "calibrating-time-estimates",
    "enforcing-evidence-based-analysis",
    "gateway-frontend",
    "persisting-agent-outputs",
    "verifying-before-completion",
    "adhering-to-dry",
    "adhering-to-yagni",
    "debugging-systematically",
    "using-todowrite"
  ],
  "status": "complete",
  "verdict": "APPROVED|APPROVED_WITH_NOTES|CHANGES_REQUESTED",
  "critical_issues": 0,
  "important_issues": 0,
  "suggestions": 2,
  "handoff": {
    "next_agent": "test-lead",
    "context": "Code review approved, ready for test planning"
  }
}
```

If CHANGES_REQUESTED, orchestrator returns to developer for fixes (max 1 retry).

```

```

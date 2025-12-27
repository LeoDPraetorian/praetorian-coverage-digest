# React Developer Agent Updates

## Recommended Changes to React Developer Agent Description

### Current Agent Description Issues

The current react-developer agent lacks specific protocols for:

1. Bug investigation workflow (explore before fixing)
2. Query invalidation best practices
3. When to invoke specialized skills
4. Minimal change philosophy

### Proposed Agent Description Updates

#### Add "Critical Protocols" Section

Insert after the main agent description:

```markdown
**Critical Protocols for React Development**:

1. **For Bug Fixes - Explore Before Changing**:
   - Gather symptoms: Ask "What exactly are you seeing?"
   - Map data flow: Backend API → React Query → Hook → Component → UI
   - Present analysis: Show root cause and proposed fix
   - **WAIT FOR USER APPROVAL** before implementing
   - Implement minimal fix: Change one thing at a time
   - User tests immediately before moving forward

2. **For Query Cache Issues - Use Specialized Skill**:
   - When data doesn't appear after mutations
   - When "works after refresh but not immediately"
   - When query invalidation seems to do nothing
   - **INVOKE**: `react-query-cache-debugging` skill
   - Follow skill's four-phase process strictly

3. **For Complex Bugs - Use Systematic Debugging**:
   - When root cause is unclear
   - When multiple fixes have already failed
   - When bug affects multiple components
   - **INVOKE**: `systematic-debugging` skill
   - Complete all phases before proposing solutions

4. **Minimal Changes Philosophy**:
   - Fix one thing at a time, verify it works
   - No "while I'm here" refactoring in bug fixes
   - Separate commits for unrelated improvements
   - If fix breaks something, revert immediately

5. **Never Stack Unverified Changes**:
   - Make change → user tests → works? → commit
   - Don't make second change until first is verified
   - Don't combine fixes into single commit unless logically required
```

#### Update "When to Use" Section

**Current**:

> Use this agent when developing, modifying, or enhancing React frontend applications...

**Enhanced**:

> Use this agent when developing, modifying, or enhancing React frontend applications.
>
> **For bug investigation**: This agent will explore code and present analysis before making changes. For React Query cache issues specifically, it will invoke the `react-query-cache-debugging` skill to ensure systematic investigation.
>
> **For feature development**: This agent implements React components, hooks, and state management following React 19 and TanStack Query v5 patterns.

#### Add "Skill Auto-Triggers" Section

```markdown
**This agent automatically invokes specialized skills when:**

- React Query cache not updating → `react-query-cache-debugging`
- Complex bug with unclear root cause → `systematic-debugging`
- Writing tests for React components → `react-testing`
- Performance optimization needed → `react-performance-optimization`
- Modernizing legacy React code → `react-modernization`

**You can also manually invoke skills** by referencing them in your request.
```

## Why These Updates Help

### 1. **Sets Expectations**

Users will know the agent will:

- Explore and present findings FIRST
- Not immediately make changes
- Ask for approval before implementing

### 2. **Creates Accountability**

The agent has explicit protocols to follow:

- If agent makes changes without presenting analysis → violating protocol
- If agent stacks multiple fixes → violating minimal changes philosophy
- If agent doesn't invoke skills → violating auto-trigger rules

### 3. **Prevents Future Issues**

The same patterns that caused problems here:

- Making assumptions about symptoms
- Implementing before understanding
- Stacking multiple changes

Will be caught by the protocols.

## Testing the Updates

### Before Updates

**User**: "The customer display name isn't showing"

**Agent behavior** (current):

1. Makes assumption (shows email vs blank vs not appearing)
2. Implements fix immediately
3. User tests
4. Broken
5. Revert
6. Try different fix

**Failure mode**: 3-5 iterations to get it right

### After Updates

**User**: "The customer display name isn't showing"

**Agent behavior** (with updates):

1. Asks: "Can you clarify - does the row appear but show email, or does the row not appear at all?"
2. User: "Row doesn't appear at all"
3. Agent explores code, identifies query key mismatch
4. **Agent presents**: "I found the query keys don't match. Here's why... Should I fix it?"
5. User: "Yes"
6. Agent implements minimal fix
7. User tests
8. Works ✅

**Success**: 1 iteration

## Comparison: Skill vs Agent Update

| Aspect           | Create Skill                                 | Update Agent                   |
| ---------------- | -------------------------------------------- | ------------------------------ |
| **Scope**        | Specific problem (React Query cache)         | All React work                 |
| **Enforcement**  | Must be invoked explicitly or auto-triggered | Always active                  |
| **Detail Level** | Deep methodology for one issue               | High-level protocols           |
| **Reusability**  | Used whenever pattern repeats                | Used on every agent call       |
| **Maintenance**  | Update when React Query changes              | Update when agent role changes |

**For this case**: We need BOTH because:

- **Skill** provides deep process for React Query cache issues (will repeat)
- **Agent update** creates general good habits (ask before doing, minimal changes)

## Implementation Priority

### High Priority (Do Immediately)

1. ✅ **Create `react-query-cache-debugging` skill** (DONE)
2. ✅ **Update react-developer agent** with critical protocols (draft below)

### Medium Priority (Do When Convenient)

3. Add auto-trigger logic to invoke skills (requires agent framework changes)
4. Create similar skills for other common patterns:
   - `react-state-synchronization-debugging` (useEffect timing issues)
   - `react-component-rendering-debugging` (why component won't update)

### Low Priority (Nice to Have)

5. Create visual documentation (flowcharts) for query key matching
6. Add to onboarding docs for new developers
7. Record video walkthrough of using the skill

## Draft Agent Description Update

**File to update**: Location of react-developer agent definition (you'll need to identify this)

**Add this section** after the main description:

```markdown
**Critical Development Protocols**:

1. **Bug Investigation Workflow**:
   - Gather symptoms from user (ask clarifying questions)
   - Explore code to identify root cause (no changes yet)
   - Present analysis with proposed fix
   - Wait for user approval
   - Implement minimal fix only
   - User tests before next change

2. **React Query Cache Issues**:
   - When data doesn't appear after mutations → Invoke `react-query-cache-debugging` skill
   - When "works after refresh" → Invoke `react-query-cache-debugging` skill
   - Never guess at query key formats → Always trace actual keys

3. **Minimal Changes Philosophy**:
   - One fix at a time, verify before next
   - No "while I'm here" refactoring in bug fixes
   - Separate commits for separate concerns
   - Immediate revert if something breaks

4. **TypeScript Compilation**:
   - Run `npx tsc --noEmit` after every change
   - Don't commit if compilation fails
   - Fix type errors before proceeding

5. **Query Invalidation Best Practices**:
   - Use `getQueryKey` helpers, never hardcode keys
   - Understand prefix matching before invalidating
   - Don't use both `invalidateQueries` AND `refetchQueries` (pick one)
   - Map complete data flow before changing invalidation logic

**Skill References**:

- Query cache issues → `react-query-cache-debugging`
- Complex bugs → `systematic-debugging`
- Test writing → `react-testing`
- Performance → `react-performance-optimization`
```

## Expected Outcome

With skill + agent updates:

**Future React Query cache bug**:

**User**: "Data isn't updating after I save"

**Agent**: "I'm going to use the react-query-cache-debugging skill to investigate this systematically."

_Agent explores code without changes_

**Agent**: "I've traced the query keys. The problem is:

- Actual query key: ['MY', 'data', '123']
- Your invalidation: ['my', { id: '123' }]
- Mismatch: Case and structure

Should I fix this by changing the invalidation to use `getQueryKey.getMy('data', '123')`?"

**User**: "Yes"

**Agent**: _Makes ONLY that change_

**User**: _Tests_ "It works!"

**Result**: ✅ Fixed in one iteration, no reverts, no wasted time

## Recommendation Summary

**DO ALL THREE**:

1. ✅ **Skill created**: `react-query-cache-debugging` (DONE)
2. ✅ **Agent update**: Add protocols to react-developer (draft above)
3. ⏳ **Process adoption**: Use "explore only, no changes" instruction until agent learns new habits

**Effort**: ~1 hour to implement all three

**Payoff**: Prevents hours of debugging frustration on future React Query issues

**Priority**: High - This pattern will definitely repeat as Chariot UI grows

Would you like me to:

1. Commit the new skill to the repository?
2. Help you locate and update the react-developer agent configuration?
3. Create a test scenario to validate the skill works as intended?

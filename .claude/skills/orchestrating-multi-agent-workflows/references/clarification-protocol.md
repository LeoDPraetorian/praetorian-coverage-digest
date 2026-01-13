# Clarification Protocol

Extended examples of handling agent clarification requests in multi-agent workflows.

## Overview

The clarification protocol distinguishes between "I'm stuck" (`blocked`) and "I need input" (`needs_clarification`). Agents request clarification when they have specific questions that, once answered, allow them to proceed.

## Status Comparison

| Status | Meaning | Orchestrator Action |
|--------|---------|---------------------|
| `blocked` | Cannot proceed, need different agent | Route to next agent via routing table |
| `needs_clarification` | Have specific questions, can proceed once answered | Answer questions, re-dispatch same agent |
| `needs_review` | Work done, want human validation | Present to user |
| `complete` | Task finished successfully | Mark complete, proceed |

## Clarification Request Format

```json
{
  "status": "needs_clarification",
  "questions": [
    {
      "category": "requirement|dependency|architecture|scope",
      "question": "Specific question text",
      "options": ["Option A", "Option B"],
      "impact": "Why this matters for the task"
    }
  ],
  "partial_work": "What agent completed before needing clarification"
}
```

## Question Categories

### requirement

Questions about what the user wants.

**Example**:
```json
{
  "category": "requirement",
  "question": "Should the filter dropdown show all statuses or only active ones?",
  "options": ["All statuses", "Only active statuses"],
  "impact": "Affects UX and data loading performance"
}
```

**Orchestrator action**: Use `AskUserQuestion` to get user's decision

### dependency

Questions about technical dependencies or system state.

**Example**:
```json
{
  "category": "dependency",
  "question": "Does the backend /assets endpoint support status filtering?",
  "options": ["Yes", "No", "Unknown - need to check"],
  "impact": "May need backend work first or client-side filtering"
}
```

**Orchestrator action**: Research codebase, read API documentation

### architecture

Questions about design decisions that need architect input.

**Example**:
```json
{
  "category": "architecture",
  "question": "Should we use Zustand for filter state or keep it local?",
  "options": ["Zustand (global)", "Local state", "Query params"],
  "impact": "Affects state management complexity and URL sharing"
}
```

**Orchestrator action**: Spawn architect lead agent to decide

### scope

Questions about what's in/out of scope for the task.

**Example**:
```json
{
  "category": "scope",
  "question": "Should I also add sorting to the table while implementing filters?",
  "options": ["Yes, add sorting", "No, filters only"],
  "impact": "Increases implementation time by ~30%"
}
```

**Orchestrator action**: Check plan.md, ask user if unclear

## Example 1: Requirement Clarification

### Context

Developer implementing asset filtering UI. Unclear about filter behavior.

### Agent Returns

```json
{
  "status": "needs_clarification",
  "questions": [
    {
      "category": "requirement",
      "question": "Should the filter dropdown show all possible statuses (Active, Inactive, Archived) or only active ones?",
      "options": [
        "All statuses (Active, Inactive, Archived)",
        "Only active statuses (Active)",
        "Only non-archived (Active, Inactive)"
      ],
      "impact": "Affects dropdown options and user filtering capability. All statuses = complete view, active only = simpler UX."
    },
    {
      "category": "requirement",
      "question": "Should filters persist when navigating away and back?",
      "options": [
        "Yes, persist in URL query params",
        "Yes, persist in localStorage",
        "No, reset on navigation"
      ],
      "impact": "URL persistence = shareable links, localStorage = user preference, reset = clean slate"
    }
  ],
  "partial_work": "Created FilterDropdown component skeleton, defined prop types"
}
```

### Orchestrator Response

**Step 1: Extract questions**

```typescript
const questions = agent_result.questions
// 2 questions, both category: "requirement"
```

**Step 2: Ask user**

```typescript
AskUserQuestion({
  questions: [
    {
      question: "Developer needs clarification on filter behavior:\n\nQ1: Should the filter dropdown show all possible statuses or only active ones?",
      header: "Requirement",
      multiSelect: false,
      options: [
        {
          label: "All statuses",
          description: "Show Active, Inactive, Archived (complete view)"
        },
        {
          label: "Only active",
          description: "Show only Active status (simpler UX)"
        },
        {
          label: "Non-archived only",
          description: "Show Active and Inactive (excludes Archived)"
        }
      ]
    },
    {
      question: "Q2: Should filters persist when navigating away and back?",
      header: "Persistence",
      multiSelect: false,
      options: [
        {
          label: "URL query params",
          description: "Persist in URL for shareable links"
        },
        {
          label: "localStorage",
          description: "Persist as user preference"
        },
        {
          label: "Reset on navigation",
          description: "Start fresh each time"
        }
      ]
    }
  ]
})
```

**Step 3: Re-dispatch with answers**

```typescript
Task(
  subagent_type: "frontend-developer",
  description: "Implement asset filtering with clarifications",
  prompt: "
    CLARIFICATION ANSWERS:

    Q1: Should the filter dropdown show all possible statuses?
    → A1: All statuses (Active, Inactive, Archived). Users need complete view for auditing.

    Q2: Should filters persist when navigating away?
    → A2: URL query params. Users need shareable links to specific filtered views.

    Now proceed with implementation using these answers.

    ORIGINAL TASK:
    Implement asset filtering UI component.

    DESIGN: [from design.md]
    PLAN: [from plan.md]
    ARCHITECTURE: [from architecture.md]
  "
)
```

## Example 2: Dependency Clarification

### Context

Developer unsure if backend supports feature needed.

### Agent Returns

```json
{
  "status": "needs_clarification",
  "questions": [
    {
      "category": "dependency",
      "question": "Does the backend /api/assets endpoint support filtering by status via query parameter?",
      "options": [
        "Yes, via ?status=X",
        "Yes, via different parameter",
        "No, not supported"
      ],
      "impact": "If yes, use server-side filtering (more efficient). If no, need client-side filtering or backend work first."
    }
  ],
  "partial_work": "Reviewed backend OpenAPI spec, unclear on filter support"
}
```

### Orchestrator Response

**Step 1: Research codebase**

```typescript
// Orchestrator researches instead of asking user
grep -r "status" modules/chariot/backend/pkg/handler/handlers/asset/
// Find: GET handler at list.go:45-67

Read("modules/chariot/backend/pkg/handler/handlers/asset/list.go", offset: 40, limit: 30)
// Line 52: url.Query().Get("status") - IT IS SUPPORTED
```

**Step 2: Re-dispatch with researched answer**

```typescript
Task(
  subagent_type: "frontend-developer",
  description: "Implement asset filtering with dependency info",
  prompt: "
    CLARIFICATION ANSWERS:

    Q1: Does the backend /api/assets endpoint support filtering by status?
    → A1: Yes, via query parameter ?status=X
         Verified in backend/pkg/handler/handlers/asset/list.go:52
         Usage: GET /api/assets?status=Active

    Now proceed with implementation using server-side filtering.

    [Original task context]
  "
)
```

**Key difference**: Orchestrator researched instead of asking user (technical question, not requirement)

## Example 3: Architecture Clarification

### Context

Developer unsure about state management approach.

### Agent Returns

```json
{
  "status": "needs_clarification",
  "questions": [
    {
      "category": "architecture",
      "question": "Filter state will be used across AssetList, AssetTable, and AssetSummary components. Should this be Zustand global state or prop drilling?",
      "options": [
        "Zustand global state",
        "React Context",
        "Prop drilling",
        "URL query params only"
      ],
      "impact": "Global state = easier sharing but adds dependency. Prop drilling = explicit but verbose. Query params = persistent but read-only from URL."
    }
  ],
  "partial_work": "Identified 3 components needing filter state access"
}
```

### Orchestrator Response

**Step 1: Recognize architecture decision**

```typescript
if question.category == "architecture":
  // This needs architect's input, not user decision
  spawn_architect = true
```

**Step 2: Spawn architect**

```typescript
Task(
  subagent_type: "frontend-lead",
  description: "Decide filter state management approach",
  prompt: "
    ARCHITECTURE DECISION NEEDED:

    Context: Developer implementing asset filtering. Filter state needs to be shared across:
    - AssetList (filter controls)
    - AssetTable (filtered display)
    - AssetSummary (count display)

    Question: What state management approach should we use?

    Options:
    1. Zustand global state
    2. React Context
    3. Prop drilling from parent
    4. URL query params only (read from URL)

    Considerations:
    - 3 components need access
    - State will change frequently (user typing/selecting)
    - May need to persist across navigation (answered separately: yes, via URL)

    Make architecture decision with rationale.
  "
)
```

**Step 3: Get architect's decision**

```json
// Architect returns
{
  "decision": "URL query params + TanStack Query",
  "rationale": "URL params provide persistence and shareability. TanStack Query handles the API call with query param. No need for separate state management.",
  "implementation": "useSearchParams() hook to read/write filters. TanStack Query automatically refetches when params change."
}
```

**Step 4: Re-dispatch developer with decision**

```typescript
Task(
  subagent_type: "frontend-developer",
  description: "Implement asset filtering with architecture decision",
  prompt: "
    CLARIFICATION ANSWERS:

    Q1: State management approach for filter state?
    → A1: URL query params + TanStack Query

    ARCHITECTURE DECISION (from frontend-lead):
    Use URL query params for filter state. Access via useSearchParams() hook.
    TanStack Query handles API calls, automatically refetching when params change.

    Rationale: Provides persistence, shareability, no additional state library needed.

    Implementation pattern:
    - AssetList: useSearchParams() to write filter values to URL
    - AssetTable: useSearchParams() to read filters, pass to useQuery
    - AssetSummary: reads same query params

    [Original task context]
  "
)
```

## Example 4: Scope Clarification

### Context

Developer unsure if additional feature is in scope.

### Agent Returns

```json
{
  "status": "needs_clarification",
  "questions": [
    {
      "category": "scope",
      "question": "While implementing filters, I noticed the table has no sorting. Should I add column sorting as well?",
      "options": [
        "Yes, add sorting",
        "No, filters only (add sorting later)",
        "Add sorting for filtered columns only"
      ],
      "impact": "Adding sorting increases implementation time by ~2 hours. Makes sense to do together since both affect table behavior."
    }
  ],
  "partial_work": "Filters implemented, noticed missing sorting feature"
}
```

### Orchestrator Response

**Step 1: Check plan.md**

```typescript
Read(".claude/.output/features/{id}/plan.md")
// Search for "sorting" in plan
// Result: Not mentioned in plan
```

**Step 2: Ask user (scope decision)**

```typescript
AskUserQuestion({
  questions: [{
    question: "Developer noticed the table has no sorting while implementing filters. Add sorting now or later?",
    header: "Scope",
    multiSelect: false,
    options: [
      {
        label: "Yes, add sorting now",
        description: "~2 hours additional. Makes sense to do together."
      },
      {
        label: "No, filters only",
        description: "Stay focused on original scope. Add sorting later."
      }
    ]
  }]
})
```

**Step 3: Re-dispatch based on user choice**

```typescript
// If user selects "No, filters only"
Task(
  subagent_type: "frontend-developer",
  description: "Complete asset filtering (filters only)",
  prompt: "
    CLARIFICATION ANSWERS:

    Q1: Should I add column sorting as well?
    → A1: No, filters only. Stay focused on original scope.
         Sorting will be added in a future task.

    Complete the filtering implementation without adding sorting.

    [Original task context]
  "
)
```

## Handling Multiple Question Categories

### Agent Returns Mixed Questions

```json
{
  "status": "needs_clarification",
  "questions": [
    {
      "category": "requirement",
      "question": "Should filters be clearable via a 'Clear All' button?",
      "options": ["Yes", "No"],
      "impact": "UX convenience vs UI clutter"
    },
    {
      "category": "dependency",
      "question": "Does the backend support clearing filters by omitting query params?",
      "options": ["Yes", "No", "Unknown"],
      "impact": "Determines if 'Clear All' can just navigate to base URL"
    },
    {
      "category": "architecture",
      "question": "Should filter state reset when dataset changes (e.g., switching organizations)?",
      "options": ["Yes, reset", "No, preserve", "Let user decide"],
      "impact": "User experience: fresh start vs maintaining context"
    }
  ]
}
```

### Orchestrator Strategy

**Step 1: Categorize**

```typescript
requirement_questions = questions.filter(q => q.category == "requirement")
dependency_questions = questions.filter(q => q.category == "dependency")
architecture_questions = questions.filter(q => q.category == "architecture")
```

**Step 2: Research dependency questions**

```typescript
// Q2: Check backend code
Read("backend/pkg/handler/handlers/asset/list.go")
// Result: No query params = returns all. Clear is supported.

dependency_answers = {
  "Q2": "Yes, omitting query params returns all assets. Clear All can navigate to base URL."
}
```

**Step 3: Spawn architect for architecture questions**

```typescript
architecture_result = Task("frontend-lead", "Decide filter reset behavior on org switch")
// Result: "Reset filters. Users expect clean slate when switching context."

architecture_answers = {
  "Q3": "Yes, reset filters when switching organizations. Provides clean slate."
}
```

**Step 4: Ask user for requirement questions**

```typescript
AskUserQuestion({
  questions: [{
    question: "Should filters have a 'Clear All' button?",
    options: [
      { label: "Yes", description: "UX convenience for clearing multiple filters" },
      { label: "No", description: "Users can clear individually or refresh page" }
    ]
  }]
})

requirement_answers = {
  "Q1": "Yes, add 'Clear All' button for UX convenience."
}
```

**Step 5: Compile all answers and re-dispatch**

```typescript
Task(
  subagent_type: "frontend-developer",
  prompt: "
    CLARIFICATION ANSWERS:

    Q1 (requirement): Should filters have a 'Clear All' button?
    → A1: Yes, add 'Clear All' button. Provides UX convenience for clearing multiple filters.

    Q2 (dependency): Does backend support clearing filters?
    → A2: Yes, omitting query params returns all assets.
         Verified in backend/pkg/handler/handlers/asset/list.go
         'Clear All' can navigate to base URL without params.

    Q3 (architecture): Should filters reset when switching organizations?
    → A3: Yes, reset filters on org switch.
         Architecture decision (from frontend-lead): Users expect clean slate when switching context.

    Now proceed with implementation using these answers.

    [Original task context]
  "
)
```

## Clarification vs Blocked

### When to use `needs_clarification`

Agent has **specific questions** that, once answered, allow them to proceed with current task.

**Good**:
```json
{
  "status": "needs_clarification",
  "questions": [{
    "question": "Should the error message show technical details or user-friendly message?",
    "options": ["Technical", "User-friendly"],
    "impact": "Technical = easier debugging, User-friendly = better UX"
  }]
}
```

### When to use `blocked`

Agent **cannot proceed** and needs a **different agent** to unblock.

**Good**:
```json
{
  "status": "blocked",
  "blocked_reason": "security_concern",
  "context": "Storing user passwords in plain text. Need security review before proceeding.",
  "attempted": ["Researched hashing libraries", "Unclear which to use (bcrypt vs argon2)"]
}
```

**Orchestrator routes to**: `backend-security` agent (per routing table)

### Decision Tree

```
Can I proceed if questions are answered?
├─ Yes → needs_clarification
└─ No (need different agent's help) → blocked

Do I have specific questions?
├─ Yes → needs_clarification
└─ No (just stuck) → blocked
```

## Anti-Patterns

### Anti-Pattern 1: Using clarification for architectural decisions

**WRONG**:
```json
{
  "status": "needs_clarification",
  "questions": [{
    "category": "requirement",
    "question": "Should we use microservices or monolith architecture?"
  }]
}
```

**Why wrong**: This is `blocked` with `blocked_reason: "architecture_decision"`. Route to architect, don't ask user.

### Anti-Pattern 2: Too many questions

**WRONG**:
```json
{
  "questions": [/* 10 questions */]
}
```

**Why wrong**: Agent should make reasonable assumptions or be blocked if truly stuck.

**Guideline**: Max 3-4 questions per clarification request.

### Anti-Pattern 3: Questions without options

**WRONG**:
```json
{
  "question": "What should I do about error handling?",
  "options": []  // Empty!
}
```

**Why wrong**: Orchestrator can't present clear choices.

**RIGHT**: Provide 2-4 specific options with trade-offs.

### Anti-Pattern 4: Asking questions already answered in plan

**WRONG**:
```json
{
  "question": "What color should the button be?",
  // But plan.md says "Button: blue, matching design system"
}
```

**Why wrong**: Agent should read plan.md first.

**Orchestrator check**:
```typescript
if question_already_in_plan(question, plan_md):
  re_dispatch_with_reminder("Please review plan.md first. Answer is there.")
```

## Summary

**Use `needs_clarification` when:**
- Agent has specific questions
- Questions, once answered, unblock agent
- Categories: requirement, dependency, architecture, scope

**Orchestrator response by category:**
- `requirement` → AskUserQuestion
- `dependency` → Research codebase
- `architecture` → Spawn architect lead
- `scope` → Check plan, ask user if unclear

**Format requirements:**
- Specific question text
- 2-4 concrete options
- Impact statement (why it matters)
- Max 3-4 questions per request

**Re-dispatch format:**
```
CLARIFICATION ANSWERS:
Q1: [question]
→ A1: [answer with context]

Q2: [question]
→ A2: [answer with context]

Now proceed with original task using these answers.

[Original task context]
```

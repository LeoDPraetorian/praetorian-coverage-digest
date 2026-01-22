# Clarification Protocol: Examples

**Parent**: [clarification-protocol.md](clarification-protocol.md)

Four detailed workflow examples showing how to handle each question category.

---

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
const questions = agent_result.questions;
// 2 questions, both category: "requirement"
```

**Step 2: Ask user**

```typescript
AskUserQuestion({
  questions: [
    {
      question:
        "Developer needs clarification on filter behavior:\n\nQ1: Should the filter dropdown show all possible statuses or only active ones?",
      header: "Requirement",
      multiSelect: false,
      options: [
        {
          label: "All statuses",
          description: "Show Active, Inactive, Archived (complete view)",
        },
        {
          label: "Only active",
          description: "Show only Active status (simpler UX)",
        },
        {
          label: "Non-archived only",
          description: "Show Active and Inactive (excludes Archived)",
        },
      ],
    },
    {
      question: "Q2: Should filters persist when navigating away and back?",
      header: "Persistence",
      multiSelect: false,
      options: [
        {
          label: "URL query params",
          description: "Persist in URL for shareable links",
        },
        {
          label: "localStorage",
          description: "Persist as user preference",
        },
        {
          label: "Reset on navigation",
          description: "Start fresh each time",
        },
      ],
    },
  ],
});
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

---

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
      "options": ["Yes, via ?status=X", "Yes, via different parameter", "No, not supported"],
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

---

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

---

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
Read(".claude/.output/features/{id}/plan.md");
// Search for "sorting" in plan
// Result: Not mentioned in plan
```

**Step 2: Ask user (scope decision)**

```typescript
AskUserQuestion({
  questions: [
    {
      question:
        "Developer noticed the table has no sorting while implementing filters. Add sorting now or later?",
      header: "Scope",
      multiSelect: false,
      options: [
        {
          label: "Yes, add sorting now",
          description: "~2 hours additional. Makes sense to do together.",
        },
        {
          label: "No, filters only",
          description: "Stay focused on original scope. Add sorting later.",
        },
      ],
    },
  ],
});
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

---

## Related

- **Main document**: [clarification-protocol.md](clarification-protocol.md)
- **Advanced patterns**: [clarification-protocol-advanced.md](clarification-protocol-advanced.md)

# Conflict Resolution Examples

Examples of how to resolve disagreements between architect and reviewer agents during Phase 3.

## Example 1: State Management

```
Architect: "Use Zustand for global state"
Reviewer: "This feature only needs local state, Zustand is overkill"

Resolution via AskUserQuestion:
- Option A: Zustand (Architect) - "Future-proof for expansion"
- Option B: Local state (Reviewer) - "Simpler, YAGNI principle"
- Option C: Context - "Middle ground for sharing across components"

User chooses: B (Local state)
Document: "Decision: Local state only per YAGNI. Re-evaluate if state sharing needed."
```

## Example 2: Component Structure

```
Architect: "Create 5 subcomponents for maximum reusability"
Reviewer: "Over-engineered. 2 components sufficient for this feature"

Resolution via AskUserQuestion:
- Option A: 5 components (Architect) - "More reusable"
- Option B: 2 components (Reviewer) - "Simpler, sufficient"

User chooses: B (2 components)
Document: "Decision: 2 components following YAGNI. Extract more if reuse emerges."
```

## Related

- [Phase 3: Architecture](../references/phase-3-architecture.md) - Main workflow
- [Agent Handoffs](agent-handoffs.md) - JSON handoff format

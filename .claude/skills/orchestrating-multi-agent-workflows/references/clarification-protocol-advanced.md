# Clarification Protocol: Advanced Patterns

**Parent**: [clarification-protocol.md](clarification-protocol.md)

Handling multiple question categories, clarification vs blocked decision tree, and anti-patterns to avoid.

---

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
requirement_questions = questions.filter((q) => q.category == "requirement");
dependency_questions = questions.filter((q) => q.category == "dependency");
architecture_questions = questions.filter((q) => q.category == "architecture");
```

**Step 2: Research dependency questions**

```typescript
// Q2: Check backend code
Read("backend/pkg/handler/handlers/asset/list.go");
// Result: No query params = returns all. Clear is supported.

dependency_answers = {
  Q2: "Yes, omitting query params returns all assets. Clear All can navigate to base URL.",
};
```

**Step 3: Spawn architect for architecture questions**

```typescript
architecture_result = Task("frontend-lead", "Decide filter reset behavior on org switch");
// Result: "Reset filters. Users expect clean slate when switching context."

architecture_answers = {
  Q3: "Yes, reset filters when switching organizations. Provides clean slate.",
};
```

**Step 4: Ask user for requirement questions**

```typescript
AskUserQuestion({
  questions: [
    {
      question: "Should filters have a 'Clear All' button?",
      options: [
        { label: "Yes", description: "UX convenience for clearing multiple filters" },
        { label: "No", description: "Users can clear individually or refresh page" },
      ],
    },
  ],
});

requirement_answers = {
  Q1: "Yes, add 'Clear All' button for UX convenience.",
};
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

---

## Clarification vs Blocked

### When to use `needs_clarification`

Agent has **specific questions** that, once answered, allow them to proceed with current task.

**Good**:

```json
{
  "status": "needs_clarification",
  "questions": [
    {
      "question": "Should the error message show technical details or user-friendly message?",
      "options": ["Technical", "User-friendly"],
      "impact": "Technical = easier debugging, User-friendly = better UX"
    }
  ]
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

---

## Anti-Patterns

### Anti-Pattern 1: Using clarification for architectural decisions

**WRONG**:

```json
{
  "status": "needs_clarification",
  "questions": [
    {
      "category": "requirement",
      "question": "Should we use microservices or monolith architecture?"
    }
  ]
}
```

**Why wrong**: This is `blocked` with `blocked_reason: "architecture_decision"`. Route to architect, don't ask user.

### Anti-Pattern 2: Too many questions

**WRONG**:

```json
{
  "questions": [
    /* 10 questions */
  ]
}
```

**Why wrong**: Agent should make reasonable assumptions or be blocked if truly stuck.

**Guideline**: Max 3-4 questions per clarification request.

### Anti-Pattern 3: Questions without options

**WRONG**:

```json
{
  "question": "What should I do about error handling?",
  "options": [] // Empty!
}
```

**Why wrong**: Orchestrator can't present clear choices.

**RIGHT**: Provide 2-4 specific options with trade-offs.

### Anti-Pattern 4: Asking questions already answered in plan

**WRONG**:

```json
{
  "question": "What color should the button be?"
  // But plan.md says "Button: blue, matching design system"
}
```

**Why wrong**: Agent should read plan.md first.

**Orchestrator check**:

```typescript
if question_already_in_plan(question, plan_md):
  re_dispatch_with_reminder("Please review plan.md first. Answer is there.")
```

---

## Related

- **Main document**: [clarification-protocol.md](clarification-protocol.md)
- **Examples**: [clarification-protocol-examples.md](clarification-protocol-examples.md)

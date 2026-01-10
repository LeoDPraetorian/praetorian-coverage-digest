# Progressive Disclosure Patterns for Orchestration

Layered information delivery that refines understanding incrementally.

## Brainstorming: Question Levels

Include this block in brainstorming skill:

```markdown
## Progressive Disclosure for Requirements Gathering

Ask questions in layers, from broad to specific:

### Level 1: Orientation (Start Here)

Purpose: Understand the general space

Example questions:

- "What problem are you trying to solve?"
- "Who will use this feature?"
- "What does success look like?"

→ Move to Level 2 when you understand the domain

### Level 2: Constraints

Purpose: Understand boundaries and requirements

Example questions:

- "What existing systems does this need to integrate with?"
- "Are there performance requirements?"
- "What's the timeline constraint?"

→ Move to Level 3 when you understand constraints

### Level 3: Decisions

Purpose: Narrow down approaches

Example questions (prefer multiple choice):

- "Should this be: A) A new component, or B) An extension of existing component?"
- "For data storage: A) Local state, B) Server state, or C) Both with sync?"
- "Error handling preference: A) Inline messages, B) Toast notifications, or C) Modal dialogs?"

→ Move to Level 4 when major decisions are made

### Level 4: Details

Purpose: Fill in specifics

Example questions:

- "What fields should the form include?"
- "What validation rules apply to each field?"
- "What happens when the user clicks cancel?"

---

### Anti-Patterns

❌ Jumping to Level 4 before Level 1-2:
"What color should the submit button be?" (before understanding what the form does)

❌ Asking multiple levels in one message:
"What's the feature for, what systems does it integrate with, and what fields should the form have?"

❌ Open-ended when multiple-choice works:
"How should we handle errors?" vs "Error handling: A) Toast, B) Inline, C) Modal?"

---

**ONE question per message. Complete each level before moving to next.**
```

## Developer Clarification Gate: Requirement Levels

Include this block in developer prompts:

````markdown
## Progressive Clarification for Implementation

Before implementing, verify understanding at each level:

### Level 1: Scope Verification

"My understanding of scope: [1-2 sentences]"

If unclear: Ask scope question
If clear: Proceed to Level 2

### Level 2: Dependency Verification

"Dependencies I've identified:

- Existing code: [components/functions I'll use]
- APIs: [endpoints I'll call]
- Libraries: [packages I'll need]"

If unclear: Ask dependency question
If clear: Proceed to Level 3

### Level 3: Behavior Verification

"Expected behaviors:

- Happy path: [what happens normally]
- Error case: [what happens on failure]
- Edge cases: [boundary conditions]"

If unclear: Ask behavior question
If clear: Proceed to Level 4

### Level 4: Acceptance Verification

"This task is complete when:

- [ ] [Acceptance criterion 1]
- [ ] [Acceptance criterion 2]
- [ ] Tests verify: [what tests confirm]"

If unclear: Ask acceptance question
If clear: Begin implementation

---

### Clarification Question Format

When asking questions, use this structure:

```json
{
  "status": "needs_clarification",
  "level": "scope|dependency|behavior|acceptance",
  "verified_so_far": ["what you're confident about"],
  "questions": [
    {
      "question": "Specific question",
      "options": ["Option A", "Option B"],
      "default_assumption": "What you'll assume if no answer",
      "impact_of_wrong_assumption": "What breaks if you're wrong"
    }
  ]
}
```
````

---

**Complete all 4 levels before writing code.**

```

```

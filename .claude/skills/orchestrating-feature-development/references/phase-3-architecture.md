# Phase 3: Dual-Agent Architecture Review

Make design decisions by spawning TWO specialist agents in parallel: an architect (for structure/patterns) and a reviewer (for quality/correctness). Their combined analysis ensures comprehensive architecture validation before implementation.

## Purpose

Resolve architectural questions before implementation by:
- Analyzing existing codebase patterns (architect)
- Validating code quality and best practices (reviewer)
- Choosing appropriate designs with quality gates
- Documenting decisions with rationale
- Identifying reusable components
- Detecting potential issues early

## Why Two Agents?

**Architect** focuses on:
- Component hierarchy and structure
- State management patterns
- API integration approaches
- File organization
- Scalability and extensibility

**Reviewer** focuses on:
- Code quality and maintainability
- React/TypeScript best practices
- Performance implications
- Anti-patterns and red flags
- Security considerations

**Together**: Comprehensive validation that catches both structural issues AND quality problems.

## Workflow

### Step 1: Determine Agent Types

Based on feature domain from plan:

| Feature Type | Architect Agent | Reviewer Agent |
|--------------|-----------------|----------------|
| React UI components | `frontend-architect` | `frontend-reviewer` |
| Go API/backend | `backend-architect` | `backend-reviewer` |
| Security features | `security-architect` | `backend-security-reviewer` or `frontend-security-reviewer` |
| Full-stack | Both architects + both reviewers |

### Step 2: Spawn Both Agents in Parallel

**CRITICAL:** Spawn architect AND reviewer together using parallel Task calls:

```
# Spawn architect
Task(
  subagent_type: "frontend-architect",
  description: "Architecture for {feature-name}",
  prompt: "Design architecture for this feature:

FEATURE: {feature-name}

DESIGN:
{content from .claude/features/{id}/design.md}

PLAN:
{content from .claude/features/{id}/plan.md}

ARCHITECTURAL QUESTIONS:
{extract 'Architecture Decisions Needed' from plan.md}

REFERENCE EXISTING PATTERNS:
Search for similar features in these paths:
- {relevant-frontend-paths}
- {relevant-component-patterns}

DELIVERABLE:
Document your architectural decisions focusing on:
1. Component hierarchy and structure
2. State management approach
3. API integration patterns
4. File organization
5. Reusable components identified
6. Scalability considerations
7. Rationale for each decision

Return your analysis as text (will be saved to architecture-architect.md).
Include JSON handoff at end:
{
  'status': 'complete',
  'phase': 'architecture',
  'summary': '1-2 sentence description',
  'recommendations': ['key decision 1', 'key decision 2', ...],
  'concerns': ['potential issue 1', 'potential issue 2', ...]
}
"
)

# Spawn reviewer IN PARALLEL (same message, multiple Task calls)
Task(
  subagent_type: "frontend-reviewer",
  description: "Review architecture for {feature-name}",
  prompt: "Review the proposed architecture for quality and correctness:

FEATURE: {feature-name}

DESIGN:
{content from .claude/features/{id}/design.md}

PLAN:
{content from .claude/features/{id}/plan.md}

FOCUS AREAS:
- Code quality and maintainability
- React 19 / TypeScript best practices
- Performance implications
- Anti-patterns to avoid
- Security considerations
- Testing complexity

REFERENCE EXISTING PATTERNS:
Check how similar features handle:
- Component composition
- State management
- Error handling
- Testing approaches

DELIVERABLE:
Document your quality review focusing on:
1. Best practice compliance
2. Potential anti-patterns
3. Performance concerns
4. Maintainability issues
5. Testing strategies
6. Security considerations
7. Recommendations for improvement

Return your analysis as text (will be saved to architecture-reviewer.md).
Include JSON handoff at end:
{
  'status': 'complete',
  'phase': 'architecture',
  'summary': '1-2 sentence description',
  'approvals': ['good decision 1', 'good decision 2', ...],
  'concerns': ['issue 1', 'issue 2', ...],
  'recommendations': ['improvement 1', 'improvement 2', ...]
}
"
)
```

### Step 3: Wait for Both Agents to Complete

Both agents run in parallel. Wait for both to finish before proceeding.

### Step 4: Compare Outputs and Detect Conflicts

Read both outputs:
- `.claude/features/{id}/architecture-architect.md`
- `.claude/features/{id}/architecture-reviewer.md`

Look for disagreements:
- Different recommendations for same decision
- Architect recommends X, reviewer raises concerns about X
- Conflicting approaches (e.g., Context vs Zustand)

**Examples of conflicts:**
```
Architect: "Use Context for state management"
Reviewer: "Context will cause unnecessary re-renders, recommend Zustand"

Architect: "Compound component pattern for flexibility"
Reviewer: "Too complex for this use case, simpler props-based approach better"
```

### Step 5: Resolve Conflicts via AskUserQuestion

If conflicts detected, present to user:

```typescript
AskUserQuestion({
  questions: [{
    question: "The architect and reviewer disagree on state management. Which approach should we use?",
    header: "State Mgmt",
    multiSelect: false,
    options: [
      {
        label: "Context API (Architect)",
        description: "Architect reasoning: {extract from architect output}"
      },
      {
        label: "Zustand (Reviewer)",
        description: "Reviewer reasoning: {extract from reviewer output}"
      },
      {
        label: "TanStack Query only",
        description: "Alternative: Use only server state, no global client state"
      }
    ]
  }]
})
```

Repeat for each major conflict.

### Step 6: Merge Consensus into Final Architecture

Combine agreed-upon decisions from both agents:

```markdown
# Architecture for {feature-name}

## Component Hierarchy
{from architect if no conflicts, or user decision}

## State Management
{from architect if no conflicts, or user decision}

## API Integration
{merged recommendations}

## File Organization
{from architect}

## Quality Considerations
{from reviewer}

## Testing Strategy
{from reviewer}

## Rationale
{combined rationale from both agents}

## Decisions Made

### 1. {Decision Name}
- **Architect recommendation:** {summary}
- **Reviewer assessment:** {summary}
- **Final decision:** {consensus or user choice}
- **Rationale:** {why this decision}

### 2. {Decision Name}
...

## Implementation Notes for Developers
{merge both handoff.context fields}
```

Save to: `.claude/features/{id}/architecture.md`

### Step 7: Validate Combined Output

Check final architecture.md contains:
- ✅ All major architectural decisions
- ✅ Consensus from both agents OR user resolutions
- ✅ Rationale for each decision
- ✅ Quality considerations addressed
- ✅ Clear implementation guidance
- ✅ File organization specified

If any agent returned blocked status:
1. Read their `concerns` for details
2. Use AskUserQuestion to get user input
3. Update design/plan as needed
4. Re-spawn both agents with updates

### Step 8: Update Progress

```json
{
  "phases": {
    "architecture": {
      "status": "complete",
      "architecture_file": ".claude/features/{id}/architecture.md",
      "agents_used": ["frontend-architect", "frontend-reviewer"],
      "architect_output": ".claude/features/{id}/architecture-architect.md",
      "reviewer_output": ".claude/features/{id}/architecture-reviewer.md",
      "conflicts_detected": 2,
      "conflicts_resolved": 2,
      "decisions": [
        "Compound component pattern",
        "Zustand for state",
        "TanStack Query for API"
      ],
      "completed_at": "2024-12-13T11:30:00Z"
    },
    "implementation": {
      "status": "in_progress"
    }
  },
  "current_phase": "implementation"
}
```

### Step 9: Mark TodoWrite Complete

```
TodoWrite: Mark "Phase 3: Architecture" as completed
TodoWrite: Mark "Phase 4: Implementation" as in_progress
```

## Exit Criteria

✅ Proceed to Phase 4 when:
- Architecture documented in `architecture.md`
- BOTH architect AND reviewer returned `status: "complete"`
- All conflicts resolved (via consensus or user decision)
- Handoff includes context for developers
- Progress file updated
- TodoWrite marked complete

❌ Do NOT proceed if:
- Either agent returned `status: "blocked"`
- Unresolved conflicts between agents
- Architecture has unresolved questions
- No rationale provided for decisions
- Handoff.context is empty

## Full-Stack Features

For features spanning frontend + backend:

### Step 1: Backend Architecture + Review (Parallel)

```
# Spawn in parallel
Task(subagent_type: "backend-architect", ...)
Task(subagent_type: "backend-reviewer", ...)
```

Wait for both, resolve conflicts, save to:
- `.claude/features/{id}/architecture-backend-architect.md`
- `.claude/features/{id}/architecture-backend-reviewer.md`
- `.claude/features/{id}/architecture-backend.md` (merged)

### Step 2: Frontend Architecture + Review (Parallel)

```
# Spawn in parallel, include backend arch context
Task(subagent_type: "frontend-architect", ...)
Task(subagent_type: "frontend-reviewer", ...)
```

Wait for both, resolve conflicts, save to:
- `.claude/features/{id}/architecture-frontend-architect.md`
- `.claude/features/{id}/architecture-frontend-reviewer.md`
- `.claude/features/{id}/architecture-frontend.md` (merged)

### Step 3: Combine All Handoffs

Merge all four handoff.context fields for implementation phase.

**Total agents for full-stack**: 4 (2 backend + 2 frontend)

## Common Issues

### "Both agents agree on everything"

**Good sign!** This means the architecture is solid. Proceed to merge their consensus.

### "Agents have many conflicts"

**Action**:
1. Check if plan was too vague - may need to clarify requirements
2. Present top 3-4 conflicts to user (don't overwhelm with minor differences)
3. Document user decisions clearly in final architecture.md

### "Architect ignores existing patterns"

**Solution**: Make explicit in both prompts:
```
CRITICAL: Search codebase for similar patterns BEFORE proposing new designs.
Use Grep/Glob to find existing:
- Component structures
- State patterns
- API integration code
```

### "Reviewer is too critical / nitpicky"

**Expected behavior**. Reviewer should catch potential issues. Filter their concerns:
- **Critical concerns**: Present to user for decision
- **Minor suggestions**: Include in architecture.md as "considerations"
- **Style preferences**: Can safely ignore if not impacting quality

### "Architecture decisions are too vague"

**Solution**: Re-spawn BOTH agents with:
```
Previous architecture was too vague. Be specific:
- Exact file paths for new components
- Specific library versions
- Concrete examples, not abstract descriptions
```

### "Should I skip dual-agent review for small features?"

**Answer**: No. The overhead is minimal (agents run in parallel), and even small features benefit from quality review. Skipping leads to technical debt.

### "Agents return conflicting status (one complete, one blocked)"

**Action**:
1. Read blocked agent's concerns
2. Determine if it's a show-stopper or addressable
3. If show-stopper: Use AskUserQuestion, update plan, re-spawn BOTH
4. If addressable: Document concern in architecture.md, proceed

## Conflict Resolution Examples

### Example 1: State Management

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

### Example 2: Component Structure

```
Architect: "Create 5 subcomponents for maximum reusability"
Reviewer: "Over-engineered. 2 components sufficient for this feature"

Resolution via AskUserQuestion:
- Option A: 5 components (Architect) - "More reusable"
- Option B: 2 components (Reviewer) - "Simpler, sufficient"

User chooses: B (2 components)
Document: "Decision: 2 components following YAGNI. Extract more if reuse emerges."
```

## Related References

- [Phase 2: Planning](phase-2-planning.md) - Previous phase
- [Phase 4: Implementation](phase-4-implementation.md) - Next phase
- [Agent Handoffs](agent-handoffs.md) - JSON handoff format

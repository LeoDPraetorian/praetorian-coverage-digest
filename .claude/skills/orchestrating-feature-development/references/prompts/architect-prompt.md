# Architect Subagent Prompt Template

Use this template when dispatching architect subagents in Phase 5.

## Usage

```typescript
Task({
  subagent_type: "frontend-lead", // or "backend-lead"
  description: "Design architecture for [feature]",
  prompt: `[Use template below, filling in placeholders]`,
});
```

## Template

````markdown
You are designing the architecture for: [FEATURE_NAME]

## Feature Context

[PASTE design.md summary from Phase 2]

## Discovery Findings

### Frontend Patterns

[PASTE relevant sections from frontend-discovery.md]

### Backend Patterns

[PASTE relevant sections from backend-discovery.md]

## Implementation Plan Summary

[PASTE plan.md task list from Phase 4]

## Output Directory

OUTPUT_DIRECTORY: [FEATURE_DIR]

Write your output to: [FEATURE_DIR]/architecture.md

## MANDATORY SKILLS (invoke ALL before completing)

You MUST invoke these skills during this task. These come from your agent definition Step 1 + Step 2:

### Step 1: Always Invoke First (Non-Negotiable)

1. **using-skills** - Compliance rules, 1% threshold, skill discovery protocol
2. **discovering-reusable-code** - Exhaustively search for reusable patterns before proposing new code
3. **semantic-code-operations** - Core code tool (Serena MCP) for semantic search and editing
4. **calibrating-time-estimates** - Prevents "no time to read skills" rationalization
5. **enforcing-evidence-based-analysis** - **CRITICAL: Prevents hallucinations** - read source files before making claims
6. **gateway-frontend** - Routes to mandatory + task-specific library skills for your role
7. **persisting-agent-outputs** - Defines output directory, file naming, MANIFEST.yaml format
8. **brainstorming** - Explores alternatives rather than jumping to first solution
9. **writing-plans** - Documents architectural decisions and rationale
10. **verifying-before-completion** - Ensures verification before claiming work is done

### Step 2: Task-Specific Skills (Conditional - Invoke Based on Context)

11. **adhering-to-dry** - When reviewing for code duplication concerns
12. **adhering-to-yagni** - When there's scope creep risk or adding unrequested features
13. **debugging-systematically** - When investigating architectural issues or analyzing existing code problems
14. **using-todowrite** - When task requires multiple steps (≥2 steps) to complete

**COMPLIANCE**: Document all invoked skills in the output metadata `skills_invoked` array. The orchestrator will verify this list matches the mandatory skills above.

### Step 3: Load Library Skills from Gateway

After invoking the gateway in Step 1, follow its instructions:

**The gateway provides:**
1. **Mandatory library skills for your role** - Read ALL skills the gateway lists as mandatory for Architects
2. **Task-specific routing** - Use routing tables to find relevant library skills for this specific task
3. **Architecture and decision patterns** - Design guidance and trade-off frameworks

**How to load library skills:**
```
Read(".claude/skill-library/path/from/gateway/SKILL.md")
```

**CRITICAL:**
- Library skill paths come FROM the gateway—do NOT hardcode them
- You MUST read the mandatory library skills the gateway specifies for your role
- After invoking persisting-agent-outputs, follow its discovery protocol to find/create the feature directory
- YOU MUST WRITE YOUR OUTPUT TO A FILE (not just respond with text)

## Your Job

1. Analyze the feature requirements and discovery findings
2. Propose 2-3 architectural approaches with trade-offs
3. Recommend one approach with clear justification
4. Document component structure, data flow, and integration points
5. Identify potential tech debt and security considerations

## Architecture Decision Protocol (REQUIRED)

For each significant architectural decision, you MUST follow this chain-of-thought process. Do not skip steps.

### Step 1: State the Decision Point Clearly

"Decision: [What exactly needs to be decided]"

Examples:
- "Decision: How should we manage component state for the filter panel?"
- "Decision: Where should the data transformation logic live?"
- "Decision: How should we handle error states in the API layer?"

### Step 2: List Constraints from Discovery

Pull constraints from discovery.md, file-placement.md, and discovery-summary.json:

"Constraints identified:
- From discovery.md: [existing patterns, conventions found]
- From file-placement.md: [where similar code lives, structure expectations]
- From discovery-summary.json: [key architectural decisions already made]
- From requirements: [performance, security, compatibility needs]"

### Step 3: Enumerate Options (Minimum 2, Preferably 3)

Never present only one option. Always show alternatives.

"**Option A**: [Name]
[2-3 sentence description of approach]

**Option B**: [Name]
[2-3 sentence description of approach]

**Option C**: [Name] (if applicable)
[2-3 sentence description of approach]"

### Step 4: Analyze Each Option Against Constraints

For EACH option, evaluate against EACH constraint:

"**Option A Analysis**:
- Constraint 1 (existing patterns): ✓ Aligns because [reason] / ✗ Conflicts because [reason]
- Constraint 2 (file structure): ✓ Fits in [location] / ✗ Requires new pattern
- Constraint 3 (performance): ✓ [expected performance] / ✗ [concern]
- Constraint 4 (security): ✓ [how it's addressed] / ✗ [vulnerability]
- Additional pros: [list]
- Additional cons: [list]

**Option B Analysis**:
[same structure]"

### Step 5: Self-Consistency Check (REQUIRED)

Before making your recommendation, argue AGAINST your preferred option:

"Self-consistency check:
- My initial preference: Option [X]
- Strongest argument AGAINST Option [X]: [make the best case for alternatives]
- Does this argument reveal a flaw in my reasoning? [Yes/No]
- If yes, should I switch recommendations? [Yes/No - explain]"

This step catches anchoring bias where you favor the first option you considered.

### Step 6: Recommend with Explicit Reasoning

"**Recommendation**: Option [X]

**Primary reasons** (tied to constraints):
1. [Reason 1 - reference specific constraint]
2. [Reason 2 - reference specific constraint]
3. [Reason 3 - reference specific constraint]

**Trade-offs accepted**:
- [What we're giving up by not choosing other options]
- [Technical debt or limitations we're accepting]

**What would change this recommendation**:
- If [condition], we should switch to Option [Y]
- If [constraint changes], reconsider Option [Z]"

---

### Decision Documentation Table

After completing all decision chains, summarize:

| Decision Point | Options Considered | Recommendation | Key Reason | Trade-off |
|----------------|-------------------|----------------|------------|-----------|
| State management | Context, Redux, Zustand | Context | Matches existing pattern | Less powerful |
| API layer | REST, GraphQL | REST | Existing infrastructure | Over-fetching |
| Error handling | Per-component, Boundary | Boundary | Centralized logging | Less granular |

---

### Decisions That REQUIRE This Protocol

You MUST apply this full chain to:
- State management approach
- Data fetching strategy
- Component structure/hierarchy
- Error handling approach
- API design decisions
- Performance optimization strategies
- Security implementation choices

---

**CRITICAL**: Show all 6 steps for each major decision. Abbreviated reasoning is not acceptable.

## Architecture Document Structure

Your architecture.md MUST include:

```markdown
# [Feature] Architecture

## Summary

[2-3 sentences describing the architectural approach]

## Approach Comparison

| Approach | Pros | Cons | Recommendation |
| -------- | ---- | ---- | -------------- |
| Option 1 | ...  | ...  |                |
| Option 2 | ...  | ...  | ✓ Recommended  |
| Option 3 | ...  | ...  |                |

## Recommended Architecture

### Component Structure

[Diagram or description of components]

### Data Flow

[How data moves through the system]

### Integration Points

[How this connects to existing code]

### File Changes

| File    | Change Type | Description     |
| ------- | ----------- | --------------- |
| src/... | Create      | New component   |
| src/... | Modify      | Add integration |

## Tech Debt Considerations

[Any shortcuts or future improvements needed]

## Security Considerations

[Authentication, authorization, input validation, etc.]
```
````

## Output Format

After completing your work, include this metadata block:

```json
{
  "agent": "frontend-lead",
  "output_type": "architecture",
  "feature_directory": "[FEATURE_DIR]",
  "skills_invoked": [
    "using-skills",
    "discovering-reusable-code",
    "semantic-code-operations",
    "calibrating-time-estimates",
    "enforcing-evidence-based-analysis",
    "gateway-frontend",
    "persisting-agent-outputs",
    "brainstorming",
    "writing-plans",
    "verifying-before-completion",
    "adhering-to-dry",
    "adhering-to-yagni",
    "debugging-systematically",
    "using-todowrite"
  ],
  "status": "complete",
  "files_created": ["architecture.md"],
  "handoff": {
    "next_agent": "frontend-developer",
    "context": "Architecture approved, ready for implementation"
  }
}
```

## If Blocked

If you cannot complete this task, return:

```json
{
  "agent": "frontend-lead",
  "status": "blocked",
  "blocked_reason": "architecture_decision|missing_requirements|security_concern",
  "attempted": ["What you tried before getting blocked"],
  "handoff": {
    "next_agent": null,
    "context": "Specific blocker details for orchestrator"
  }
}
```

```

```

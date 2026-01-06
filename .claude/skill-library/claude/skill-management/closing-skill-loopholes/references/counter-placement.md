# Counter Placement Decision Tree

**Determines correct scope and location for rationalization counters.**

---

## Decision Tree

```
Start: Observed rationalization pattern

Q1: Is this specific to ONE agent?
├─ YES → Agent-Specific Counter
│         Location: .claude/agents/{type}/{agent-name}.md
│         Section: <EXTREMELY-IMPORTANT>
│         Example: mcp-lead treats analysis as quick questions
│
└─ NO → Q2: Is this specific to ONE skill's usage?
        ├─ YES → Skill-Wide Counter
        │         Location: .claude/skill-library/{path}/{skill-name}/SKILL.md
        │         Section: ## Red Flags or ## Common Mistakes
        │         Example: Multiple agents skip persisting-agent-outputs
        │
        └─ NO → Universal Counter
                  Location: .claude/skills/using-skills/SKILL.md
                  Section: ## Anti-Rationalization Table
                  Example: "I remember this skill" across all agents
```

---

## Scope Definitions

### Agent-Specific

**When to use:**

- ONLY one agent exhibits this rationalization
- Pattern tied to agent's specific role/domain
- Other agents don't have same issue

**Evidence needed:**

- Tested 2+ other agents with similar tasks
- Only target agent shows rationalization
- Pattern doesn't generalize

**Example:**

```
Pattern: mcp-lead treats "analyze X" as quick question
Tested: backend-lead (complies), frontend-lead (complies)
Conclusion: Agent-specific to mcp-lead
```

**Placement:**

```markdown
# File: .claude/agents/architecture/mcp-lead.md

<EXTREMELY-IMPORTANT>

## Analysis Tasks ARE Full Tasks

If you think: "This is just a quick analysis"

Reality: ALL analysis tasks produce file artifacts.

Required action:

- Invoke persisting-agent-outputs
- Write to OUTPUT_DIRECTORY
- Track skills in metadata

</EXTREMELY-IMPORTANT>
```

---

### Skill-Wide

**When to use:**

- Multiple agents skip SAME skill
- Pattern appears when using specific skill
- Issue is with skill invocation, not agent role

**Evidence needed:**

- 2+ agents from different domains show pattern
- All instances related to same skill usage
- Pattern specific to that skill

**Example:**

```
Pattern: Agents skip persisting-agent-outputs for "quick" tasks
Observed: mcp-lead (architecture), backend-developer (development), test-lead (testing)
Conclusion: Skill-wide issue with persisting-agent-outputs
```

**Placement:**

```markdown
# File: .claude/skills/persisting-agent-outputs/SKILL.md

## Red Flags

### "Quick Task" Rationalization

If you think: "This task is too quick for file output"

Reality: ALL agent tasks produce artifacts. "Quick" is relative - documentation matters regardless of duration.

Required action:

- Write output to OUTPUT_DIRECTORY/your-analysis.md
- Include metadata with skills_invoked
- Never return inline-only responses
```

---

### Universal

**When to use:**

- Pattern appears across multiple agents AND multiple skills
- Rationalization is about skill system itself, not specific skill
- Applies broadly to skill invocation behavior

**Evidence needed:**

- 3+ agents from 2+ domains show pattern
- Pattern appears with multiple different skills
- Core issue with skill compliance mindset

**Example:**

```
Pattern: "I remember this skill" / "I know what it does"
Observed: All agent types, multiple skills
Conclusion: Universal memory confidence pattern
```

**Placement:**

```markdown
# File: .claude/skills/using-skills/SKILL.md

## Red Flags

| Red Flag Thought              | Reality                               |
| ----------------------------- | ------------------------------------- |
| "I remember this skill"       | Skills evolve. Read current version.  |
| "I know what this skill does" | Memory ≠ verification. Invoke anyway. |
```

---

## Placement Examples

### Example 1: Description Hallucination

**Evidence**: mcp-lead3 hallucinated `using-skills` description

**Analysis**:

- Q1: Specific to mcp-lead3? → Test other agents
- Test results: Other agents also hallucinate descriptions occasionally
- Q2: Specific to using-skills? → No, happens with multiple skills
- **Conclusion**: Universal pattern

**Placement**: using-skills anti-rationalization table

---

### Example 2: GraphQL Query Batching

**Evidence**: backend-developer doesn't batch GraphQL queries despite implementing-graphql-clients skill

**Analysis**:

- Q1: Specific to backend-developer? → Yes, only backend touches GraphQL
- **Conclusion**: Might be agent-specific, but check skill content first
- Skill review: implementing-graphql-clients doesn't emphasize batching
- **Final Conclusion**: Skill-wide (improve skill content)

**Placement**: implementing-graphql-clients/SKILL.md ## Common Mistakes

---

### Example 3: Pressure Testing Skipped

**Evidence**: test-lead skips pressure testing in REFACTOR phase

**Analysis**:

- Q1: Specific to test-lead? → Test other agents that do testing
- Other agents (backend-tester, frontend-tester) also skip pressure tests
- Q2: Specific to testing skills? → No, ANY skill with REFACTOR phase
- **Conclusion**: Universal (affects TDD methodology)

**Placement**: using-skills or developing-with-tdd

---

## Counter Migration

As patterns are observed more broadly, migrate counters to wider scope:

```
Agent-Specific (1 agent)
  ↓ [observed in 2+ agents]
Skill-Wide (multiple agents, one skill)
  ↓ [observed with multiple skills]
Universal (multiple agents, multiple skills)
```

**Process:**

1. **Observe broader pattern**: Same rationalization appears elsewhere
2. **Document evidence**: Track which agents/skills affected
3. **Move counter**: Copy to broader scope location
4. **Update original**: Add reference to universal counter
5. **Test migration**: Verify counter still effective at new scope

**Example migration:**

```markdown
# Before: .claude/agents/architecture/mcp-lead.md

## Quick Analysis Counter

[full counter text]

# After migration to skill-wide:

# .claude/skills/persisting-agent-outputs/SKILL.md

## Quick Analysis Counter

[full counter text]

# .claude/agents/architecture/mcp-lead.md

## Quick Analysis Counter

See persisting-agent-outputs skill for details on why ALL analysis produces artifacts.
```

---

## Validation Checklist

Before adding counter:

- [ ] Evidence documented for 1+ instances
- [ ] Scope decision justified (agent/skill/universal)
- [ ] Placement location identified
- [ ] Counter follows template format
- [ ] AGENT-LOOPHOLES.md entry created
- [ ] Re-test scenario planned

---

## Common Mistakes

| Mistake                                     | Impact                | Prevention                       |
| ------------------------------------------- | --------------------- | -------------------------------- |
| Add to universal without evidence           | Clutters using-skills | Require 3+ agents, 2+ skills     |
| Keep in agent after broader pattern emerges | Inconsistent counters | Migrate when observed broadly    |
| Add to wrong section                        | Counter not visible   | Follow section guidelines        |
| Duplicate counters at multiple scopes       | Maintenance burden    | Pick narrowest appropriate scope |

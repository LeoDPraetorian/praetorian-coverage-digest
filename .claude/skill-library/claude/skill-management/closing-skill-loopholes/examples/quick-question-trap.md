# Example: Quick Question Trap

**Real-world example of mcp-lead treating analysis as "quick question" and skipping required protocol.**

---

## Evidence (from AGENTS-NOT-FOLLOWING-DIRECTIONS.md)

### Agent

`mcp-lead` (.claude/agents/architecture/mcp-lead.md)

### Task

```
"Analyze Serena connection pool implementation"
```

### Expected Behavior

From mcp-lead agent definition and persisting-agent-outputs skill:

1. Invoke `persisting-agent-outputs` skill
2. Create OUTPUT_DIRECTORY
3. Write analysis to file with metadata
4. Include `skills_invoked` array in metadata
5. Announce skills before using them

### Actual Behavior

1. Returned inline response (no file created)
2. Did NOT invoke `persisting-agent-outputs`
3. Did NOT create OUTPUT_DIRECTORY
4. Did NOT track skills in metadata
5. Did NOT announce skills

### Rationalization

[Inferred from behavior]

> "This is just a quick analysis question - no need for full protocol with file output and skill tracking."

### Pattern Classification

**Quick Question Trap** - Agent treats analysis tasks as simple questions not requiring artifact output.

---

## RED Phase: Document the Loophole

### Entry in AGENT-LOOPHOLES.md

```markdown
| 2026-01-06 | mcp-lead | "analyze Serena pool" | Quick Question Trap | [pending] | ❌ |
```

### Why This is a Problem

**Impact:**

- Analysis work lost (no file artifact)
- Decisions not tracked (no metadata)
- Skills not documented (can't verify what was used)
- Future similar tasks repeat same work

**Broader Pattern:**

Same behavior observed with:

- "review X implementation"
- "assess Y architecture"
- "examine Z patterns"

All analysis keywords trigger this rationalization.

---

## GREEN Phase: Write Counter

### Counter Text

```markdown
## Analysis Tasks ARE Full Tasks

If you think: "This is just a quick analysis" or "This is just a simple question"

Reality: ALL analysis tasks produce file artifacts. "Quick analysis" is a rationalization trap that leads to lost work and untracked decisions. There is no such thing as analysis that doesn't need documentation.

Required action:

- Invoke `persisting-agent-outputs` skill BEFORE starting analysis
- Write output to OUTPUT_DIRECTORY/{topic}-analysis.md
- Include metadata with skills_invoked array
- Track analysis for future reference and reuse

Not even when:

- Task seems simple
- User says "quick look"
- Analysis takes < 5 minutes
- You think output is obvious
```

### Placement Decision

**Question**: Specific to mcp-lead or broader?

**Analysis:**

- Tested backend-lead with "analyze auth middleware" → Complied (wrote file)
- Tested frontend-lead with "analyze component state" → Complied (wrote file)
- Only mcp-lead exhibits this pattern

**Decision**: Agent-specific counter

**Location**: `.claude/agents/architecture/mcp-lead.md <EXTREMELY-IMPORTANT>` section

### Counter Added

```markdown
| 2026-01-06 | mcp-lead | "analyze Serena pool" | Quick Question Trap | mcp-lead.md#L45-67 | ❌ |
```

---

## REFACTOR Phase: Verify Counter

### Re-Test Scenario

Spawned fresh mcp-lead agent with Task tool:

```markdown
Analyze Serena connection pool implementation.

COMPLIANCE CHECK (blocking):

- Did agent announce skills before using them?
- Did agent write output to file?
- Does output metadata include skills_invoked?

IMPORTANT: You have "Analysis Tasks ARE Full Tasks" counter to prevent treating this as a quick question.
```

### Result: PASS ✅

**Agent behavior:**

1. Announced: "I am invoking `persisting-agent-outputs` because analysis tasks require artifacts"
2. Invoked `persisting-agent-outputs` skill
3. Created `.claude/.output/mcp-infrastructure/serena-pool-analysis.md`
4. Included metadata:

```yaml
---
skills_invoked:
  - persisting-agent-outputs
  - enforcing-evidence-based-analysis
  - gateway-mcp-tools
---
```

### Updated Tracking

```markdown
| 2026-01-06 | mcp-lead | "analyze Serena pool" | Quick Question Trap | mcp-lead.md#L45-67 | ✅ |
```

---

## Lessons Learned

### What Worked

1. **Specific counter text**: "If you think: 'This is just a quick analysis'" matched exact rationalization
2. **Reality explanation**: Clear consequences (lost work, untracked decisions)
3. **Required action**: Concrete steps with no ambiguity
4. **Not even when**: Closed common sub-rationalizations

### What Didn't Work Initially

First version of counter:

```markdown
## Analysis Counter

Analysis tasks require file output. Write results to OUTPUT_DIRECTORY.
```

**Agent still rationalized**: "This guidance is for complex analysis, not quick questions."

**Fix**: Added "If you think" trigger phrase matching exact rationalization.

### Related Loopholes

After closing this loophole, discovered agent sometimes uses different rationalization:

> "User said 'quick look' so inline response is fine"

**Action**: Added separate counter for Authority Override pattern (user intent ≠ protocol bypass).

---

## Broader Application

### Should This Counter Be Escalated?

After 3+ occurrences in different agents, consider escalating from agent-specific to:

- **Skill-wide**: Add to `persisting-agent-outputs/SKILL.md ## Red Flags`
- **Universal**: Add to `using-skills` anti-rationalization table

**Current status**: Agent-specific (only mcp-lead). Monitor other architecture agents.

### Similar Patterns

Other agents may have domain-specific versions:

- `test-lead`: "This is just unit test planning" → Skip comprehensive test plan
- `backend-reviewer`: "This is just utility function review" → Skip full review checklist

**Each needs domain-appropriate counter**, not generic "don't skip analysis" rule.

---

## References

- AGENTS-NOT-FOLLOWING-DIRECTIONS.md - Original failure documentation
- rationalization-patterns.md - Pattern 1: Quick Question Trap
- tdd-methodology.md - RED-GREEN-REFACTOR workflow
- loophole-tracking-format.md - AGENT-LOOPHOLES.md structure

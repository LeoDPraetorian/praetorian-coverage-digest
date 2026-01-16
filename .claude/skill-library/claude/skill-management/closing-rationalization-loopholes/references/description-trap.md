# The Description Trap

**Why skill descriptions must say WHEN, not HOW.**

---

## The Problem

**Critical insight from obra/superpowers testing:**

> "When a description summarizes the skill's workflow, Claude may follow the description instead of reading the full skill content."

**Impact**: Agent sees description, thinks they know what to do, skips reading actual skill content.

---

## Real Example from obra/superpowers

**Skill**: Multi-stage code review

**Bad Description (HOW):**

```markdown
description: Code review between tasks with spec compliance and quality checks
```

**Agent Behavior:**

- Read description
- Performed ONE review
- Missed that skill specified TWO reviews (spec compliance + code quality)
- Description summary became agent's implementation

**Root Cause**: Description summarized the workflow ("review between tasks"), so agent followed description instead of reading full skill flowchart.

**Fix:**

```markdown
description: Use when coordinating subagent implementations requiring review gates
```

Now description says WHEN (coordinating subagents), not HOW (two-stage review). Forces agent to read skill for the HOW.

---

## Real Example from Chariot Platform

**Skill**: `persisting-agent-outputs`

**Bad Description (HOW):**

```markdown
description: Use when agents need to persist work outputs - defines directory
discovery, file naming, MANIFEST.yaml structure, JSON metadata for workflow coordination
```

**Problem**: Agent reads "file naming, MANIFEST.yaml" and thinks they know the format. Doesn't read skill to see actual requirements.

**Agent Behavior:**

- Creates file with generic name
- Skips MANIFEST.yaml
- Uses partial metadata structure from description

**Fix:**

```markdown
description: Use when agents need to persist work outputs to files
```

Removed workflow details. Agent must read skill for actual file structure, naming conventions, metadata format.

---

## Pattern Recognition

### ✅ GOOD Descriptions (WHEN only)

```markdown
"Use when creating new skills"
"Use when agents skip mandatory skill invocations"
"Use when designing MCP wrapper architecture"
"Use when implementing React frontend components"
"Use when coordinating multi-phase security analysis"
```

**Why good**: Trigger conditions only. No workflow summary. Forces reading skill content.

### ❌ BAD Descriptions (HOW included)

```markdown
"Use when creating skills - includes TDD, progressive disclosure, and pressure testing"
"Use when agents skip skills - documents failures, writes counters, and verifies"
"Use when designing MCP wrappers - token optimization, filtering, Zod schemas"
"Use when implementing React - component structure, state management, TanStack Query"
"Use when coordinating security - spawns mappers, aggregates findings, produces SARIF"
```

**Why bad**: Workflow summary allows agent to skip reading. Description becomes instruction.

---

## The Mechanism

```
Agent receives task
  ↓
Checks skill list
  ↓
Reads description: "Use when X - does Y, Z, W"
  ↓
Thinks: "I know what Y, Z, W mean"
  ↓
Follows description summary
  ↓
Misses actual skill content (examples, edge cases, counters, checklists)
```

**vs correct flow:**

```
Agent receives task
  ↓
Checks skill list
  ↓
Reads description: "Use when X"
  ↓
Thinks: "Task matches X trigger"
  ↓
Reads full skill content
  ↓
Follows actual workflow with all details
```

---

## Audit Checklist

Review all skill descriptions:

| Pattern                           | Action                                       |
| --------------------------------- | -------------------------------------------- |
| `"Use when X"`                    | ✅ Keep - trigger only                       |
| `"Use when X for Y"`              | ⚠️ Review - is Y a workflow step or context? |
| `"Use when X - does Y, Z, W"`     | ❌ Remove workflow summary                   |
| `"Provides/Creates/Generates..."` | ❌ Remove - describes HOW not WHEN           |

**Examples:**

```markdown
# ❌ BAD

description: Use when creating agents - guides through type selection,
TDD workflow, frontmatter setup, and pressure testing

# ✅ GOOD

description: Use when creating new agents with TDD methodology

# ❌ BAD

description: Provides parallel research across 6 sources with intent expansion

# ✅ GOOD

description: Use when conducting complex multi-source research
```

---

## When Context is Necessary

Some descriptions need minimal context for disambiguation:

**Acceptable:**

```markdown
"Use when implementing GraphQL clients for rate-limited APIs"
```

**Why**: "GraphQL clients" clarifies WHAT, "rate-limited" is context for WHEN (not workflow).

**Not workflow summary because:**

- Doesn't list steps
- Doesn't describe methodology
- Specifies domain context only

---

## Relationship to Hallucination

Description trap relates to description hallucination pattern:

| Issue          | Description Trap                           | Description Hallucination               |
| -------------- | ------------------------------------------ | --------------------------------------- |
| **Mechanism**  | Agent follows description instead of skill | Agent invents description to skip skill |
| **Root cause** | Description too detailed                   | Description doesn't exist or is vague   |
| **Prevention** | WHEN-only descriptions                     | Require reading actual description      |
| **Fix**        | Remove workflow from description           | Add verification step before skipping   |

**Both prevent agent from reading full skill content.**

---

## Migration Strategy

For existing skills with description trap:

1. **Audit**: Run through all skill descriptions
2. **Identify**: Mark descriptions with workflow summaries
3. **Rewrite**: Keep trigger condition, remove workflow
4. **Test**: Verify agents still discover skill appropriately
5. **Document**: Track which descriptions changed

**Script to identify candidates:**

```bash
# Find descriptions with workflow indicators
grep -r "description:.*does\|provides\|creates\|generates\|includes" \
  .claude/skills/ .claude/skill-library/ | \
  grep -v ".history"
```

---

## Examples from Chariot Platform

### Example 1: `orchestrating-feature-development`

**Before (HOW):**

```markdown
description: Use when implementing complete features - coordinates brainstorming,
planning, architecture, implementation, review, testing with parallel agents
```

**After (WHEN):**

```markdown
description: Use when implementing complete features requiring multi-phase coordination
```

**Improvement**: Removed phase list. Agent must read skill for actual phases.

---

### Example 2: `closing-rationalization-loopholes`

**Before (HOW):**

```markdown
description: Use when agents skip skills - documents failures, classifies patterns,
writes counters using TDD, places appropriately, and verifies effectiveness
```

**After (WHEN):**

```markdown
description: Use when agents skip skill instructions despite explicit requirements
```

**Improvement**: Removed methodology summary. Agent reads skill for TDD workflow.

---

### Example 3: `implementing-graphql-clients`

**Before (HOW):**

```markdown
description: Use when implementing GraphQL API clients - covers rate limiting,
pagination, cost calculation, error handling, and retry logic
```

**After (WHEN):**

```markdown
description: Use when implementing GraphQL API clients for rate-limited APIs
```

**Improvement**: Removed technical topics list. "Rate-limited" is context, not workflow.

---

## Success Metrics

Description changes are effective when:

- ✅ Agent still discovers skill via search/frontmatter
- ✅ Agent reads skill content instead of following description
- ✅ Agent applies full workflow, not summary
- ✅ Compliance rate improves (measured via pressure testing)

**Track**: Before/after compliance rates for skills with updated descriptions.

---

## Related Patterns

| Pattern                       | Relationship                                  |
| ----------------------------- | --------------------------------------------- |
| **Description Hallucination** | Agent invents description → skip skill        |
| **Description Trap**          | Description too detailed → skip skill content |
| **Memory Confidence**         | Agent remembers old version → skip reading    |
| **Overkill Excuse**           | Agent sees workflow → decides too complex     |

**All lead to same outcome: Agent doesn't read actual skill content.**

---

## References

- obra/superpowers skill testing methodology
- AGENTS-NOT-FOLLOWING-DIRECTIONS.md (mcp-lead3 hallucination example)
- [Rationalization Patterns](rationalization-patterns.md) - Pattern 5: Description Hallucination

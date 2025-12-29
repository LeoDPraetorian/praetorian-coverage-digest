# Phase 0: Why CLI Validation Is Needed

## Why Phase 0 Uses CLI Implementation

From the CLI source code (audit-critical.ts:5-8):

```typescript
/**
 * This is the ONLY audit that remains as code because:
 * 1. Block scalars make agents invisible to Claude (high impact)
 * 2. Detection requires complex regex patterns (hard for Claude)
 * 3. Failure rate was 8/10 agents before enforcement (proven need)
 */
```

## Division of Responsibilities

### The Skill Provides

- User-friendly interface for invoking audits
- Clear interpretation of audit results
- Integration with agent creation/update workflows
- Router Pattern implementation for consistent access

### The CLI Provides

- **Complex Regex Detection**: Block scalar patterns (`|` and `>`) require sophisticated regex that LLMs struggle to implement reliably
- **Accurate Line Number Reporting**: Precise line-by-line analysis with exact error locations
- **Fast Execution**: Sub-second audit completion times (<1 second for single agent)
- **Deterministic Results**: Consistent, reproducible validation across all runs

## Why LLMs Can't Replace This

**Pattern Detection Challenges:**

- Block scalars appear in multiple syntactic contexts
- Regex patterns must handle YAML edge cases
- False positive/negative rates too high with LLM-based detection

**Impact of Failures:**

- Block scalar descriptions make agents completely invisible to Task tool
- Name mismatches prevent agent discovery
- Missing descriptions break agent selection UI

**Historical Evidence:**

- Before CLI enforcement: 8/10 agents had critical issues
- After CLI enforcement: <1/10 agents have issues
- Manual LLM detection: ~40% miss rate on block scalars

## When to Use Instruction-Based vs CLI

| Aspect             | CLI-Based                      | Instruction-Based                   |
| ------------------ | ------------------------------ | ----------------------------------- |
| Pattern complexity | High (regex, parsing)          | Low (read, compare)                 |
| Execution speed    | <1 second                      | 10-30 seconds                       |
| Consistency        | 100% deterministic             | ~95% consistent                     |
| Maintenance        | TypeScript updates             | Skill document updates              |
| **Use for**        | Critical structural validation | Quality checks, semantic validation |

## Related Tools

- **auditing-skills** (skill): Quality and semantic validation for skills
- **fixing-agents** (skill): Remediation workflows for audit failures
- **creating-agents** (skill): Invokes audit during agent creation
- **updating-agents** (skill): Invokes audit during agent updates

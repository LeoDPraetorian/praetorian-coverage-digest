# Loophole Tracking Format

**Structure and workflow for `.claude/docs/AGENT-LOOPHOLES.md` tracking file.**

---

## File Location

`.claude/docs/AGENT-LOOPHOLES.md`

**Create if missing** - not gitignored, should be version controlled.

---

## File Structure

```markdown
# Agent Loophole Tracking

Records compliance failures and counter effectiveness for systematic loophole closure.

## Purpose

Track agent rationalizations that bypass skill instructions, document counters, verify effectiveness.

## Format

| Date       | Agent      | Task           | Rationalization | Counter Added  | Verified |
| ---------- | ---------- | -------------- | --------------- | -------------- | -------- |
| YYYY-MM-DD | agent-name | "task summary" | Pattern name    | file.md#L45-67 | ❌/✅    |

## Process

1. **RED Phase**: Document loophole when discovered (Verified = ❌)
2. **GREEN Phase**: Add counter reference to "Counter Added" column
3. **REFACTOR Phase**: Update "Verified" to ✅ when re-test passes

## Statistics

- Total loopholes documented: {count}
- Verified closed: {count} ({percentage}%)
- Most common pattern: {pattern name} ({frequency})

---

## Entries

| Date       | Agent    | Task                  | Rationalization     | Counter Added | Verified |
| ---------- | -------- | --------------------- | ------------------- | ------------- | -------- |
| 2026-01-06 | mcp-lead | "analyze Serena pool" | Quick Question Trap | [pending]     | ❌       |
```

---

## Column Definitions

### Date

Format: `YYYY-MM-DD`

When loophole was first observed (RED phase date).

### Agent

Agent name that exhibited rationalization.

Examples:

- `mcp-lead`
- `backend-developer`
- `frontend-reviewer`

### Task

**Brief** summary of task given to agent (not full prompt).

**Format**: `"action target"` with quotes

**Examples:**

- `"analyze Serena pool"`
- `"implement user auth"`
- `"review API handler"`

**Keep under 30 characters**

### Rationalization

Pattern name from rationalization-patterns.md taxonomy.

**Examples:**

- `Quick Question Trap`
- `Description Hallucination`
- `Memory Confidence`
- `Overkill Excuse`

If new pattern: document in rationalization-patterns.md first, then reference here.

### Counter Added

Reference to file and location where counter was added.

**Format**: `file.md#Lstart-end` or `file.md#section-name`

**Examples:**

- `mcp-lead.md#L45-67`
- `persisting-agent-outputs/SKILL.md#red-flags`
- `using-skills/SKILL.md#anti-rationalization-table`

**Pending state**: `[pending]` during RED/GREEN phases before counter written.

### Verified

Status of counter effectiveness.

| Symbol | Meaning                               | Phase                |
| ------ | ------------------------------------- | -------------------- |
| ❌     | Counter not yet verified              | RED/GREEN            |
| ✅     | Counter verified effective            | REFACTOR complete    |
| ⚠️     | Counter partially effective           | REFACTOR in progress |
| 🔄     | Re-testing after counter strengthened | Iterating            |

---

## Entry Lifecycle

### Stage 1: RED Phase (Initial Documentation)

```markdown
| 2026-01-06 | mcp-lead | "analyze Serena pool" | Quick Question Trap | [pending] | ❌ |
```

**What happened**: Discovered agent rationalized skipping skill.

### Stage 2: GREEN Phase (Counter Added)

```markdown
| 2026-01-06 | mcp-lead | "analyze Serena pool" | Quick Question Trap | mcp-lead.md#L45-67 | ❌ |
```

**What happened**: Counter written and placed in agent definition.

### Stage 3: REFACTOR Phase (Verified)

```markdown
| 2026-01-06 | mcp-lead | "analyze Serena pool" | Quick Question Trap | mcp-lead.md#L45-67 | ✅ |
```

**What happened**: Re-test confirmed agent now complies with counter present.

### Stage 4: Counter Failed (Strengthen)

```markdown
| 2026-01-06 | mcp-lead | "analyze Serena pool" | Quick Question Trap | mcp-lead.md#L45-67 | 🔄 |
```

**What happened**: Re-test showed agent found loophole. Strengthening counter, will re-test.

### Stage 5: Partial Success

```markdown
| 2026-01-06 | mcp-lead | "analyze Serena pool" | Quick Question Trap | mcp-lead.md#L45-67 | ⚠️ |
```

**What happened**: Agent complies sometimes but not consistently. Need additional investigation.

---

## Statistics Section

Update periodically (weekly or after 10 new entries):

```markdown
## Statistics

- Total loopholes documented: 15
- Verified closed: 12 (80%)
- Most common pattern: Quick Question Trap (6 occurrences)
- Agents with most loopholes: mcp-lead (4), backend-developer (3)
- Average days to close: 2.5
```

**Purpose**: Track effectiveness of loophole closure process.

---

## Multiple Instances of Same Pattern

When same pattern appears multiple times:

```markdown
| 2026-01-06 | mcp-lead | "analyze Serena pool" | Quick Question Trap | mcp-lead.md#L45-67 | ✅ |
| 2026-01-07 | test-lead | "plan test strategy" | Quick Question Trap | test-lead.md#L32-54 | ✅ |
| 2026-01-08 | backend-developer | "review handler code" | Quick Question Trap | [escalated] | ✅ |
```

**Note**: After 3+ instances, consider escalating from agent-specific to skill-wide or universal.

**Escalation indicator**: `[escalated]` in Counter Added column + link to universal counter location.

---

## Related Loopholes

Group related entries:

```markdown
## Analysis-Related Loopholes

| Date       | Agent    | Task                  | Rationalization           | Counter Added        | Verified |
| ---------- | -------- | --------------------- | ------------------------- | -------------------- | -------- |
| 2026-01-06 | mcp-lead | "analyze Serena pool" | Quick Question Trap       | mcp-lead.md#L45-67   | ✅       |
| 2026-01-06 | mcp-lead | "analyze Serena pool" | Description Hallucination | using-skills.md#L234 | ✅       |
```

**Note**: Same task can exhibit multiple rationalization patterns. Document each separately.

---

## Template for New Entries

Copy-paste template:

```markdown
| YYYY-MM-DD | agent-name | "task summary" | Pattern Name | [pending] | ❌ |
```

Fill in Date, Agent, Task during RED phase. Leave Counter Added as `[pending]` until GREEN phase. Leave Verified as ❌ until REFACTOR phase succeeds.

---

## Query Examples

**Find all unverified loopholes:**

```bash
grep "| ❌" .claude/docs/AGENT-LOOPHOLES.md
```

**Count by pattern:**

```bash
awk -F'|' '{print $5}' .claude/docs/AGENT-LOOPHOLES.md | \
  sort | uniq -c | sort -rn
```

**Find agent with most loopholes:**

```bash
awk -F'|' '{print $3}' .claude/docs/AGENT-LOOPHOLES.md | \
  sort | uniq -c | sort -rn | head -5
```

---

## Maintenance

**Monthly review:**

1. Update statistics section
2. Check for patterns appearing 3+ times → consider escalation
3. Verify all ✅ entries still effective (spot check)
4. Archive entries older than 6 months to separate file

**Archive format**: `.claude/docs/AGENT-LOOPHOLES-{YEAR}.md`

---

## Integration with Other Files

| File                          | Relationship                                 |
| ----------------------------- | -------------------------------------------- |
| `rationalization-patterns.md` | Pattern Name column references this taxonomy |
| `counter-placement.md`        | Counter Added column follows placement rules |
| `tdd-methodology.md`          | Entry lifecycle follows RED-GREEN-REFACTOR   |
| Agent definitions             | Counter Added references agent files         |
| Skill definitions             | Counter Added references skill files         |

**Tracking file is central record that links to distributed counters across codebase.**

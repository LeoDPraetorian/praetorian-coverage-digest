# Agent Line Count Limits

**Single source of truth for agent size thresholds.**

Referenced by: `creating-agents`, `updating-agents`, `auditing-agents`

---

## Quick Reference

| Agent Type | Limit | Warning Zone | Examples                                           |
| ---------- | ----- | ------------ | -------------------------------------------------- |
| Standard   | <300  | 250-300      | development, testing, quality, research, mcp-tools |
| Complex    | <400  | 350-400      | architecture, orchestrator                         |

---

## Validation Script

```bash
LINE_COUNT=$(wc -l < .claude/agents/{type}/{agent-name}.md)
echo "Agent line count: $LINE_COUNT"

# Determine agent complexity
if [[ "{type}" == "architecture" || "{type}" == "orchestrator" ]]; then
  MAX_LINES=400
  WARN_LINES=350
  AGENT_TYPE="complex"
else
  MAX_LINES=300
  WARN_LINES=250
  AGENT_TYPE="standard"
fi

if [ $LINE_COUNT -gt $MAX_LINES ]; then
  echo "❌ ERROR: $AGENT_TYPE agent is $LINE_COUNT lines (limit: $MAX_LINES)"
  echo "MUST extract patterns to skills before proceeding"
  exit 1
elif [ $LINE_COUNT -gt $WARN_LINES ]; then
  echo "⚠️  WARNING: $AGENT_TYPE agent is $LINE_COUNT lines (approaching $MAX_LINES limit)"
  echo "Consider extracting patterns to skills"
else
  echo "✅ Line count within acceptable range for $AGENT_TYPE agent"
fi
```

---

## Why These Limits

### Lean Agent Pattern

Agents should be **coordinators that delegate to skills**, not bloated files with embedded patterns:

- **<300 lines** forces proper skill delegation
- **Large agents** indicate embedded patterns that belong in skills
- **Skill delegation** enables progressive loading and reuse

### What to Extract

If approaching limit, extract to skills:

| Content Type             | Extract To                          |
| ------------------------ | ----------------------------------- |
| TDD workflow steps       | `developing-with-tdd` skill         |
| Debugging procedures     | `debugging-systematically` skill    |
| Verification checklists  | `verifying-before-completion` skill |
| Domain-specific patterns | Appropriate gateway skill           |

---

## Quick Check Command

```bash
wc -l .claude/agents/{type}/{agent-name}.md
```

**Expected result:**

- Standard agents: <300 lines
- Complex agents (architecture/orchestrator): <400 lines

---

## Related

- [Lean Agent Pattern](lean-agent-pattern.md)
- [Agent Compliance Contract](../agent-compliance-contract.md)

# Agent Discovery Test Workflow

## Overview

The test command validates that an agent is properly configured for Claude Code discovery. It runs 9 automated tests plus guidance for manual verification.

## Quick Start

```bash
# Test an agent
npm run --silent test -- react-developer

# Verbose output
npm run --silent test -- react-developer --verbose

# Test with skill auto-load
npm run --silent test -- react-developer gateway-frontend
```

## Command Reference

```bash
npm run --silent test -- <name>
npm run --silent test -- <name> <skill-name>
npm run --silent test -- <name> --verbose
```

### Parameters

| Parameter | Description |
|-----------|-------------|
| `name` | Agent name to test |
| `skill` | Optional skill to verify in frontmatter |
| `--verbose` | Show detailed output |

## Test Suite

### Test 1: Agent Exists

Verifies the agent file exists in any category directory.

```
✔ Agent found: .claude/agents/development/react-developer.md
```

### Test 2: Agent Parses

Verifies the agent can be parsed (frontmatter extraction).

```
✔ Agent parsed successfully
```

### Test 3: Description Syntax (CRITICAL)

Verifies description is NOT a block scalar.

```
✔ Description is single-line (valid)
```

**If this fails**: The agent is INVISIBLE to Claude. Fix immediately:
```bash
npm run --silent fix -- <agent> --apply phase1-description
```

### Test 4: Description Trigger

Verifies description starts with "Use when".

```
✔ Description starts with "Use when"
```

### Test 5: Has Examples

Verifies description contains `<example>` blocks.

```
✔ Description contains examples
```

### Test 6: Line Count

Verifies line count within limits:
- Standard agents: <300 lines
- Complex agents (architecture, orchestrator): <400 lines

```
✔ Line count: 250/300
```

### Test 7: Gateway Skill

Verifies a gateway skill is in frontmatter.

```
✔ Has gateway skill in frontmatter
```

### Test 8: Output Format

Verifies "Output Format" section exists.

```
✔ Has output format section
```

### Test 9: Escalation Protocol

Verifies "Escalation Protocol" section exists.

```
✔ Has escalation protocol
```

### Test 10: Skill Auto-Load (Optional)

If a skill name is provided, verifies it's in frontmatter.

```bash
npm run --silent test -- react-developer gateway-frontend
# ✔ Skill "gateway-frontend" found in frontmatter
```

## Test Summary

```
═══ Test Summary ═══

Total: 9 | Passed: 8 | Failed: 1

Details:
  ✓ Agent exists: .claude/agents/development/react-developer.md
  ✓ Agent parses: Name: react-developer, Category: development
  ✓ Description syntax: Single-line description
  ✓ Description trigger: Starts with "Use when"
  ✓ Has examples: Contains <example> blocks
  ✗ Line count: 335 lines exceeds 300 line limit
  ✓ Gateway skill: skills: gateway-frontend
  ✓ Output format: Contains "Output Format" section
  ✓ Escalation protocol: Contains "Escalation Protocol" section
```

## Manual Discovery Test

After automated tests pass, verify discovery manually:

```
═══ Manual Discovery Test ═══
In a NEW Claude Code session, ask:
  "What is the description for the react-developer agent? Quote it exactly."

Expected: Full description text
Failure: Claude says "|" or ">" or must read the file
```

### How to Perform Manual Test

1. **Start a new Claude Code session** (important - metadata is cached)
2. Ask: "What is the description for the `react-developer` agent? Quote it exactly."
3. **Expected response**: Claude quotes the full description with examples
4. **Failure indicators**:
   - Claude says the description is `|` or `>`
   - Claude has to read the file to get the description
   - Claude says it doesn't know the agent

## Critical vs Non-Critical Tests

### Critical (Must Fix)

- **Test 3: Description Syntax** - If this fails, agent is invisible
- **Test 6: Line Count > 400** - Hard failure

### Non-Critical (Should Fix)

- Test 4: Description trigger
- Test 5: Has examples
- Test 7: Gateway skill
- Test 8: Output format
- Test 9: Escalation protocol

## Exit Codes

- `0`: All tests pass (or only non-critical failures)
- `1`: Critical test failed (description syntax or >400 lines)

## Example Test Session

```bash
# Run tests
npm run --silent test -- react-developer

# Output:
# ═══ Discovery Tests ═══
#
# ✔ Agent found: /path/to/.claude/agents/development/react-developer.md
# ✔ Agent parsed successfully
# ✔ Description is single-line (valid)
# ✔ Description starts with "Use when"
# ✔ Description contains examples
# ✖ Line count exceeds limit: 335/300
# ✔ Has gateway skill in frontmatter
# ✔ Has output format section
# ✔ Has escalation protocol
#
# ═══ Test Summary ═══
# Total: 9 | Passed: 8 | Failed: 1
#
# ═══ Manual Discovery Test ═══
# In a NEW Claude Code session, ask:
#   "What is the description for the react-developer agent? Quote it exactly."
```

## Fixing Test Failures

### Description Syntax Failed

```bash
# Critical - fix immediately
npm run --silent fix -- <agent> --apply phase1-description
npm run --silent test -- <agent>
```

### Line Count Exceeded

```bash
# View suggestions
npm run --silent fix -- <agent> --suggest

# Extract patterns to skills (manual)
# Then re-test
npm run --silent test -- <agent>
```

### Missing Gateway Skill

```bash
npm run --silent fix -- <agent> --apply phase4-gateway
npm run --silent test -- <agent>
```

### Missing Output Format

```bash
# Get template
npm run --silent fix -- <agent> --suggest
# Add manually
npm run --silent test -- <agent>
```

## Batch Testing

Test all agents in a category:

```bash
# List agents
npm run --silent list -- --type development --quiet

# Test each
for agent in $(npm run --silent list -- --type development --quiet 2>/dev/null); do
  echo "Testing $agent..."
  npm run --silent test -- $agent --verbose
done
```

## References

- [Audit Phases](./audit-phases.md)
- [Fix Workflow](./fix-workflow.md)
- [Agent Architecture](../../../docs/AGENT-ARCHITECTURE.md)

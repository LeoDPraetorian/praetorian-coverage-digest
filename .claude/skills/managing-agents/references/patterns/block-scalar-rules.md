# Block Scalar Rules for Agent Descriptions

**Single source of truth for YAML description syntax requirements.**

Referenced by: `creating-agents`, `auditing-agents`, `fixing-agents`

---

## The Rule

**NEVER use block scalars (`|` or `>`) in agent descriptions.**

Agent descriptions MUST be single-line with `\n` escapes for multiline content.

---

## Why Block Scalars Break Discovery

When Claude Code parses agent files:

1. **Block scalar pipe (`|`)**: Claude sees the literal `"|"` character, not the multiline content
2. **Block scalar folded (`>`)**: Claude sees the literal `">"` character, not the content
3. **Result**: Agent becomes invisible to Task tool selection

### What Claude Sees

```yaml
# WRONG - Block scalar pipe
description: |
  Use when developing React applications.
  Expert at TypeScript and components.

# What Claude sees: description = "|" (broken)
```

```yaml
# CORRECT - Single-line
description: Use when developing React applications - TypeScript components, hooks, state management.\n\n<example>\nuser: "Help me build a dashboard"\n</example>

# What Claude sees: Full description (works)
```

---

## Detection

### Manual Check

Look for lines like:

```yaml
description: |
description: >
```

### Automated Check

```bash
REPO_ROOT=$(git rev-parse --show-superproject-working-tree 2>/dev/null)
REPO_ROOT="${REPO_ROOT:-$(git rev-parse --show-toplevel)}"
cd "$REPO_ROOT/.claude/skill-library/claude/agent-management/auditing-agents/scripts"

npm run audit-critical -- {agent-name}
```

**Output when block scalar detected:**

```
❌ Critical audit failed

{agent-name}:
  Block scalar pipe detected (line 5)
```

---

## How to Fix

### From Block Scalar Pipe

```yaml
# BEFORE
description: |
  Use when developing React applications.
  Expert at TypeScript and components.

# AFTER
description: Use when developing React applications. Expert at TypeScript and components.
```

### For Multiline Content

Use `\n` escapes within a single-line description:

```yaml
# Single-line with newline escapes
description: Use when developing React applications - TypeScript components.\n\n<example>\nuser: "Build a dashboard"\nassistant: "I'll create a React component..."\n</example>
```

### For Long Descriptions

If description exceeds 1024 characters:

1. Shorten the prose
2. Keep essential trigger phrases
3. Keep one `<example>` block
4. Remove redundant detail

---

## Valid Description Patterns

### Simple (No Examples)

```yaml
description: Use when developing React applications - components, UI bugs, performance, API integration, TypeScript/React codebases.
```

### With Examples

```yaml
description: Use when developing React applications - components, UI bugs.\n\n<example>\nContext: New dashboard component.\nuser: "Create dashboard"\nassistant: "I will use frontend-developer"\n</example>
```

---

## Character Limit

**Hard limit: 1024 characters**

The description field has a maximum of 1024 characters. Descriptions exceeding this limit will be truncated or cause errors.

---

## Testing Discovery

After fixing, verify the agent is discoverable:

1. **Start NEW Claude Code session** (caching)
2. **Quote the description**: "Use when {trigger phrase}..."
3. **Verify**: Claude identifies correct agent

---

## Related

- [Agent Compliance Contract](../agent-compliance-contract.md)
- [Discovery Testing](../discovery-testing.md)

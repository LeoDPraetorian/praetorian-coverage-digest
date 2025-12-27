# Gateway Mapping Rules

**Complete mapping of library skill paths to gateway skills.**

## Mapping Table

| Path Pattern                 | Gateway                | Category               |
| ---------------------------- | ---------------------- | ---------------------- |
| `development/frontend/*`     | `gateway-frontend`     | Frontend development   |
| `development/backend/*`      | `gateway-backend`      | Backend/Go development |
| `testing/*`                  | `gateway-testing`      | Testing patterns       |
| `security/*`                 | `gateway-security`     | Security patterns      |
| `claude/mcp-tools/*`         | `gateway-mcp-tools`    | MCP tool wrappers      |
| `development/integrations/*` | `gateway-integrations` | Integration patterns   |
| `capabilities/*`             | `gateway-capabilities` | VQL capabilities       |
| `claude/*` (non-mcp)         | `gateway-claude`       | Claude Code management |

## Path Matching Algorithm

**For each library skill path:**

1. Extract category path (part after `.claude/skill-library/`)
2. Match category prefix against patterns (longest match wins)
3. Map to corresponding gateway

**Example:**

```
Path: .claude/skill-library/development/frontend/state/frontend-tanstack/SKILL.md
Category: development/frontend/state/frontend-tanstack
Matches: development/frontend/*
Gateway: gateway-frontend
```

## Special Cases

### Claude Skills (Non-MCP)

Skills under `claude/` that are NOT in `claude/mcp-tools/` go to `gateway-claude`.

**Examples:**

- `claude/skill-management/auditing-skills` → `gateway-claude`
- `claude/skill-management/creating-skills` → `gateway-claude`
- `claude/agent-management/creating-agents` → `gateway-claude`

**BUT:**

- `claude/mcp-tools/praetorian-cli` → `gateway-mcp-tools`
- `claude/mcp-tools/linear` → `gateway-mcp-tools`

### Multi-Category Skills

Some skills could arguably belong to multiple gateways (e.g., frontend testing could go in `gateway-frontend` OR `gateway-testing`).

**Resolution strategy:**

- Use PRIMARY category from path (leftmost match)
- Example: `testing/frontend/playwright` → `gateway-testing` (not gateway-frontend)

### Orphaned Skills

If a skill path doesn't match any pattern:

- Log as WARNING during discovery
- Do NOT add to any gateway
- Report to user for manual categorization

**Example:**

```
Path: .claude/skill-library/experimental/new-category/some-skill/SKILL.md
Category: experimental/new-category/some-skill
No pattern match → ORPHAN
```

## Gateway Locations

All gateway skills are in core (`.claude/skills/`):

- `.claude/skills/gateway-frontend/SKILL.md`
- `.claude/skills/gateway-backend/SKILL.md`
- `.claude/skills/gateway-testing/SKILL.md`
- `.claude/skills/gateway-security/SKILL.md`
- `.claude/skills/gateway-mcp-tools/SKILL.md`
- `.claude/skills/gateway-integrations/SKILL.md`
- `.claude/skills/gateway-capabilities/SKILL.md`
- `.claude/skills/gateway-claude/SKILL.md`

## Validation

After mapping, verify:

1. Every library skill maps to exactly ONE gateway (no duplicates)
2. No library skill is orphaned (unless intentionally experimental)
3. All mapped paths actually exist in filesystem

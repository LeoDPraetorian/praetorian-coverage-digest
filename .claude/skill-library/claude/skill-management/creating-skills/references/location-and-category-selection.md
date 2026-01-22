# Location and Category Selection

**Detailed guidance for choosing skill location (Core vs Library) and library category.**

---

## Phase 3: Location Selection

**Note**: Gateways skip location/category selection - they're always created in Core. See [references/gateway-creation.md](references/gateway-creation.md).

Ask the user via AskUserQuestion:

```
Question: Where should this skill be created?

Options:
1. Core Skills (.claude/skills/)
   - High-frequency, always-loaded
   - Limited to ~25 skills (15K token budget)
   - Auto-discovered by Claude Code

2. Skill Library (.claude/skill-library/)
   - Specialized, on-demand loading
   - No token budget impact
   - Loaded via gateway routing
```

**Decision factors**:

- Used in every conversation? → Core
- Domain-specific (frontend, testing, etc.)? → Library
- Referenced by multiple agents? → Consider Core

---

### Category Selection (Library Only)

**Note**: Gateways skip category selection - they don't belong to library categories. See [references/gateway-creation.md](references/gateway-creation.md).

If library selected, discover available categories:

```bash
# List available library categories
ls -d .claude/skill-library/*/ .claude/skill-library/*/*/ 2>/dev/null | \
  sed 's|.claude/skill-library/||' | sort -u
```

Common categories:

- `development/frontend/` - React, TypeScript, UI patterns
- `development/backend/` - Go, APIs, infrastructure
- `testing/` - Unit, integration, E2E testing
- `claude/` - Claude Code specific (agents, commands, MCP)
- `operations/` - DevOps, deployment, monitoring

Ask user to select or create new category.

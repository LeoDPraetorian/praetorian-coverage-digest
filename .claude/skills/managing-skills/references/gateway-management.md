# Gateway Management

Gateway skills route agents from core to library in the two-tier system. Gateway-specific capabilities include:

## Create Gateway

**Via slash command:**

```
/skill-manager create gateway-newdomain
```

**Via skill invocation:**

```typescript
Read(".claude/skill-library/claude/skill-management/creating-skills/SKILL.md");
// Follow workflow with gateway template
```

Uses template at `templates/gateway-template.md` with proper two-tier structure.

## Audit Gateway

**Via CLI:**

```bash
REPO_ROOT=$(git rev-parse --show-superproject-working-tree 2>/dev/null)
REPO_ROOT="${REPO_ROOT:-$(git rev-parse --show-toplevel)}"
cd "$REPO_ROOT/.claude" && npm run audit -- gateway-frontend
```

Runs all 21 phases (phases 17-20 are gateway-specific):

- **Phase 17**: Gateway structure (two-tier explanation, IMPORTANT block)
- **Phase 18**: Routing table format (full paths, not skill names)
- **Phase 19**: Path resolution (all paths exist)
- **Phase 20**: Coverage check (all library skills in one gateway)

## Fix Gateway

**Via CLI:**

```bash
REPO_ROOT=$(git rev-parse --show-superproject-working-tree 2>/dev/null)
REPO_ROOT="${REPO_ROOT:-$(git rev-parse --show-toplevel)}"
cd "$REPO_ROOT/.claude" && npm run -w @chariot/fixing-skills fix -- gateway-frontend --phase 18
```

Gateway-specific fixes for structure and routing table issues.

## Sync Gateways

**Via skill invocation (instruction-based):**

```typescript
Read(".claude/skill-library/claude/skill-management/syncing-gateways/SKILL.md");
// Follow Full Sync or Single Gateway workflow
```

Synchronizes all gateways with current library skills (add missing, remove stale).

## Related Documentation

- `docs/GATEWAY-PATTERNS.md` - Complete gateway architecture and patterns
- `templates/gateway-template.md` - Template for creating new gateways
- `.claude/skill-library/claude/skill-management/syncing-gateways/SKILL.md` - Gateway sync operations

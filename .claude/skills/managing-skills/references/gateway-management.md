# Gateway Management

Gateway skills route agents from core to library using intent-based routing and progressive disclosure. Gateway-specific capabilities include:

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

Uses template at `templates/gateway-template.md` with canonical gateway structure.

## Audit Gateway

**Via skill invocation:**

Audit the gateway skill by invoking auditing-skills to verify compliance with all phase requirements.

Validates all compliance requirements including gateway-specific checks:

- **Gateway structure**: EXTREMELY-IMPORTANT block, Progressive Disclosure, Intent Detection
- **Skill Registry format**: Full paths with Triggers column
- **Path resolution**: All paths exist
- **Coverage check**: All library skills in one gateway

For complete validation details, see [auditing-skills](.claude/skill-library/claude/skill-management/auditing-skills/SKILL.md).

## Fix Gateway

**Via skill invocation:**

Fix gateway compliance issues by invoking fixing-skills following procedures in phase-categorization.md.

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

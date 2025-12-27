# Backup Strategy for Agents

**Single source of truth for agent backup procedures.**

Referenced by: `updating-agents`, `fixing-agents`

---

## Quick Reference

**Before ANY edit:**

```bash
mkdir -p .claude/agents/{type}/.local
cp .claude/agents/{type}/{agent-name}.md \
   .claude/agents/{type}/.local/{agent-name}.md.bak.$(date +%Y%m%d_%H%M%S)
```

**Checkpoint:** Cannot proceed to edits without backup ✅

---

## Full Procedure

### Create Backup

```bash
# Set variables
AGENT_TYPE="{type}"
AGENT_NAME="{agent-name}"
AGENT_PATH=".claude/agents/$AGENT_TYPE/$AGENT_NAME.md"
BACKUP_DIR=".claude/agents/$AGENT_TYPE/.local"

# Create backup directory if needed
mkdir -p "$BACKUP_DIR"

# Create timestamped backup
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
cp "$AGENT_PATH" "$BACKUP_DIR/${AGENT_NAME}.md.bak.${TIMESTAMP}"

# Verify backup exists
ls -la "$BACKUP_DIR/${AGENT_NAME}.md.bak.${TIMESTAMP}"
```

### Rollback Procedure

```bash
# Find latest backup
ls -la .claude/agents/{type}/.local/

# Restore (replace {timestamp} with actual timestamp)
cp .claude/agents/{type}/.local/{agent-name}.md.bak.{timestamp} \
   .claude/agents/{type}/{agent-name}.md

# Verify restoration
head -20 .claude/agents/{type}/{agent-name}.md
```

---

## Why Backups Are Required

1. **Agent changes can break discovery** - Block scalar introduction makes agent invisible
2. **Rollback enables rapid recovery** - Don't need to recreate from scratch
3. **Audit trail** - Can compare versions if issues arise

---

## Backup Naming Convention

| Component | Format             | Example                              |
| --------- | ------------------ | ------------------------------------ |
| Directory | `.local/`          | `.claude/agents/development/.local/` |
| Extension | `.bak.{timestamp}` | `.bak.20241226_143022`               |
| Timestamp | `%Y%m%d_%H%M%S`    | `20241226_143022`                    |

**Note:** Use `.bak` extension (consistent with skills pattern), NOT `.backup`.

---

## Related

- [Agent Compliance Contract](../agent-compliance-contract.md)
- [Changelog Format](changelog-format.md)

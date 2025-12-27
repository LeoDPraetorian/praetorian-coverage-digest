# Changelog Format for Agents

**Single source of truth for agent changelog templates.**

Referenced by: `creating-agents`, `updating-agents`, `fixing-agents`

---

## Quick Reference

| Operation | Section Header | Use For                  |
| --------- | -------------- | ------------------------ |
| Create    | `### Created`  | New agent creation       |
| Update    | `### Changed`  | Modifying existing agent |
| Fix       | `### Fixed`    | Remediation of issues    |

---

## Directory Structure

```
.claude/agents/{type}/
├── {agent-name}.md
└── .history/
    └── {agent-name}-CHANGELOG
```

---

## Entry Templates

### For Creating Agents

```markdown
## [{date}] - Initial Creation

### Created

- Initial agent creation with 10-phase TDD workflow
- Type: {type}
- Purpose: {one-line description}

### RED Phase Evidence

- Gap: {documented gap from Phase 1}
- Failure: {captured failure scenario}

### Validation

- GREEN: PASSED/Pending
- REFACTOR: PASSED/Pending
- Compliance: PASSED/Pending
```

### For Updating Agents

```markdown
## [{date}] - Update Applied

### Changed

- {List changes made}

### Reason

- {Document RED phase failure that prompted update}

### Verification

- GREEN: PASSED
- Compliance: PASSED
- Re-audit: PASSED
```

### For Fixing Agents

```markdown
## [{date}] - Fixes Applied

### Fixed

- {List each fix applied}

### Method

- Auto-fix / Manual fix

### Verification

- Re-audit: PASSED
```

---

## Creating the Changelog

### Initial Creation

```bash
mkdir -p .claude/agents/{type}/.history

cat > .claude/agents/{type}/.history/{agent-name}-CHANGELOG << 'EOF'
## [$(date +%Y-%m-%d)] - Initial Creation

### Created
- Initial agent creation with 10-phase TDD workflow
- Type: {type}
- Purpose: {one-line description}

### RED Phase Evidence
- Gap: {documented gap}
- Failure: {captured failure}

### Validation
- GREEN: Pending
- REFACTOR: Pending
- Compliance: Pending
EOF
```

### Appending Entries

```bash
cat >> .claude/agents/{type}/.history/{agent-name}-CHANGELOG << 'EOF'

## [$(date +%Y-%m-%d)] - {Operation Description}

### {Changed/Fixed/Created}
- {Item 1}
- {Item 2}

### Verification
- {Validation status}
EOF
```

---

## Date Format

Use ISO 8601 format: `YYYY-MM-DD`

```bash
$(date +%Y-%m-%d)
```

Example: `2024-12-26`

---

## Related

- [Backup Strategy](backup-strategy.md)
- [Agent Compliance Contract](../agent-compliance-contract.md)

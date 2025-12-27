# Dry Run Output Example

**Sample output from `--dry-run` operation.**

## Command

```
Use syncing-gateways skill with --dry-run flag
```

## Output

```
=== Gateway Sync Dry Run ===

Discovery phase: Found 112 library skills

Mapping to gateways:
  - gateway-frontend: 28 skills
  - gateway-backend: 18 skills
  - gateway-testing: 15 skills
  - gateway-security: 12 skills
  - gateway-mcp-tools: 5 skills
  - gateway-integrations: 8 skills
  - gateway-capabilities: 6 skills
  - gateway-claude: 20 skills

---

Gateway: gateway-frontend

Would ADD (3 skills):
  - Frontend Performance
    Path: .claude/skill-library/development/frontend/performance/frontend-performance/SKILL.md

  - Frontend Accessibility
    Path: .claude/skill-library/development/frontend/accessibility/frontend-accessibility/SKILL.md

  - Frontend Animation
    Path: .claude/skill-library/development/frontend/animation/frontend-animation/SKILL.md

Would REMOVE (1 skill):
  - Old React Skill
    Path: .claude/skill-library/development/frontend/old-react-skill/SKILL.md
    Reason: Path no longer exists in filesystem

---

Gateway: gateway-backend

No changes needed

---

Gateway: gateway-testing

Would ADD (2 skills):
  - E2E Debugging
    Path: .claude/skill-library/testing/e2e/e2e-debugging/SKILL.md

  - Visual Regression Testing
    Path: .claude/skill-library/testing/visual/visual-regression-testing/SKILL.md

Would REMOVE (0 skills)

---

Gateway: gateway-security

No changes needed

---

Gateway: gateway-mcp-tools

No changes needed

---

Gateway: gateway-integrations

Would ADD (1 skill):
  - Slack Integration
    Path: .claude/skill-library/development/integrations/slack/slack-integration/SKILL.md

Would REMOVE (0 skills)

---

Gateway: gateway-capabilities

No changes needed

---

Gateway: gateway-claude

Would ADD (4 skills):
  - Creating Agents
    Path: .claude/skill-library/claude/agent-management/creating-agents/SKILL.md

  - Updating Agents
    Path: .claude/skill-library/claude/agent-management/updating-agents/SKILL.md

  - Deleting Skills
    Path: .claude/skill-library/claude/skill-management/deleting-skills/SKILL.md

  - Syncing Gateways
    Path: .claude/skill-library/claude/skill-management/syncing-gateways/SKILL.md

Would REMOVE (2 skills):
  - Old Command Skill
    Path: .claude/skill-library/claude/commands/old-command-skill/SKILL.md
    Reason: Path no longer exists in filesystem

  - Deprecated Tool
    Path: .claude/skill-library/claude/tools/deprecated-tool/SKILL.md
    Reason: Path no longer exists in filesystem

---

=== Summary ===

Total changes across all gateways:
  - 10 skills would be added
  - 3 skills would be removed (broken paths)

Affected gateways: 4 of 8
  - gateway-frontend (3 add, 1 remove)
  - gateway-testing (2 add, 0 remove)
  - gateway-integrations (1 add, 0 remove)
  - gateway-claude (4 add, 2 remove)

No changes: 4 of 8
  - gateway-backend
  - gateway-security
  - gateway-mcp-tools
  - gateway-capabilities

---

To apply these changes, run with --full-sync flag
```

## Notes

- Dry run does NOT modify any files
- Shows exactly what would change
- Helps identify orphaned skills and broken paths before applying
- Useful for validation before major updates

# Audit Output Examples

**Standardized output formats for agent auditing.**

Referenced by: `auditing-agents`, `fixing-agents`

---

## Success Output

### Single Agent - All Phases Pass

```
✅ Critical audit passed

Checked 1 agent(s)
No critical issues found

Agent: frontend-developer
  Phase 0: PASS (no block scalars, name matches, description present)
  Phase 1: PASS (permission mode aligned)
  Phase 2: PASS (frontmatter organized)
  Phase 3: PASS (tools validated)
  Phase 4: PASS (gateway enforcement)
  Phase 5: PASS (skill location)
  Phase 6: PASS (pattern delegation)
  Phase 7: PASS (no phantom skills)
  Phase 8: PASS (no deprecated skills)
  Phase 9: PASS (skill loading protocol present)
  Phase 10: PASS (no library skills in frontmatter)
  Phase 11: PASS (correct skill invocations)
  Phase 12: PASS (gateway coverage)
  Phase 13: INFO (skill gap analysis - see recommendations)
  Phase 16: PASS (markdown formatting)
  Phase 17: PASS (no skill duplication)
  Phase 18: SKIPPED (user chose to skip)

Ready to commit.
```

### Batch Audit - All Pass

```
✅ Critical audit passed

Checked 8 agent(s)
No critical issues found

Agents checked:
  - frontend-developer: PASS
  - backend-developer: PASS
  - security-architect: PASS
  - test-engineer: PASS
  - orchestrator: PASS
  - code-reviewer: PASS
  - research-analyst: PASS
  - mcp-wrapper-expert: PASS

All agents ready to commit.
```

---

## Failure Output

### Critical Issues (Phase 0)

```
❌ Critical audit failed

frontend-developer:
  Block scalar pipe detected (line 5)
  Name mismatch (line 3): frontmatter="react-dev", filename="frontend-developer"

Checked 1 agent(s)
Found 2 critical issue(s)

Action: Run `skill: "fixing-agents"` to remediate
```

### Extended Issues (Phases 1-18)

```
⚠️ Extended audit completed with warnings

frontend-developer:
  Phase 0: PASS
  Phase 6: WARNING - Agent exceeds 300 lines (current: 312)
  Phase 9: ERROR - Missing Skill Loading Protocol section
  Phase 10: ERROR - Library skill in frontmatter: using-tanstack-query
  Phase 13: INFO - Consider adding: debugging-systematically (body mentions "debug")

Checked 1 agent(s)
Found 2 error(s), 1 warning(s), 1 info

Action: Fix errors before committing. Warnings are advisory.
```

### Multiple Agents with Mixed Results

```
⚠️ Audit completed with issues

Results:
  frontend-developer: ❌ FAIL (2 critical issues)
  backend-developer: ✅ PASS
  security-architect: ⚠️ WARN (1 warning)
  test-engineer: ✅ PASS

Summary:
  Passed: 2
  Warnings: 1
  Failed: 1

Failed agents require fixing before commit.
```

---

## Warning Output

### Non-Critical Issues

```
⚠️ Audit passed with warnings

frontend-developer:
  Phase 6: WARNING - Agent is 287 lines (approaching 300 limit)
  Phase 12: INFO - Consider adding gateway-frontend for better skill discovery
  Phase 13: INFO - Body mentions "test" but skills don't include developing-with-tdd

Checked 1 agent(s)
No critical issues found
1 warning(s), 2 info(s)

Can proceed, but consider addressing warnings.
```

---

## Error Output

### Tool Errors

```
⚠️ No agent found matching: unknown-agent

Available agents:
  - frontend-developer
  - backend-developer
  - security-architect

Try: npm run audit-critical -- frontend-developer
```

### Parse Errors

```
❌ Error parsing agent file

File: .claude/agents/development/broken-agent.md
Error: Invalid YAML frontmatter at line 4

The file may be corrupted or have syntax errors.
Action: Manually inspect the file and fix YAML syntax.
```

---

## Exit Codes

| Code | Meaning                                  | Action                |
| ---- | ---------------------------------------- | --------------------- |
| 0    | All checks passed                        | Ready to commit       |
| 1    | Critical/extended issues found           | Fix issues first      |
| 2    | Tool error (file not found, parse error) | Check agent name/file |

---

## Related

- [Agent Compliance Contract](../agent-compliance-contract.md)
- `auditing-agents` skill
- `fixing-agents` skill

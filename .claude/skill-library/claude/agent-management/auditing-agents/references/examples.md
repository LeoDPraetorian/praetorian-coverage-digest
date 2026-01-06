## Examples

### Example 1: Audit After Edit

```
User: "I just updated the frontend-developer agent description. Audit it."

You:
1. cd .claude/skills/agent-manager/scripts
2. npm run audit-critical -- frontend-developer
3. Interpret results:
   - Exit code 0 → "✅ No critical issues found. Ready to commit."
   - Exit code 1 → "❌ Found issues: [list them with line numbers and fixes]"
   - Exit code 2 → "⚠️ Agent not found. Check name spelling."
```

### Example 2: Pre-Commit Check

```
User: "Audit all agents before I commit."

You:
1. cd .claude/skills/agent-manager/scripts
2. npm run audit-critical
3. Report results:
   - "Checked 49 agents"
   - If success: "✅ All agents passed"
   - If failures: "❌ Found issues in 3 agents: [list them]"
4. If failures:
   - List each agent with its issues
   - Provide fix recommendations
   - Offer to fix automatically (using fixing-agents skill)
```

### Example 3: Debug Discovery Issue

```
User: "Why can't Claude find my new-agent?"

You:
1. cd .claude/skills/agent-manager/scripts
2. npm run audit-critical -- new-agent
3. Look for:
   - Block scalar (makes agent invisible)
   - Name mismatch (Claude can't match name)
   - Missing description (no discovery metadata)
4. Explain which issue is causing invisibility
5. Provide specific fix
```

### Example 4: Batch Audit with Failures

```
User: "Audit all agents and show me any problems."

You:
1. npm run audit-critical
2. Example output with issues:

   ✗ Critical issues found

   frontend-developer.md:
     Block scalar pipe detected (line 5)
       Fix: Convert to single-line with \n escapes

   backend-architect.md:
     Name mismatch (line 3)
       Frontmatter name: "backend-arch"
       Filename: "backend-architect"
       Fix: Update name to "backend-architect"

   Checked 49 agent(s)
   Found 2 critical issue(s)

3. Summarize: "Found issues in 2 agents (frontend-developer, backend-architect)"
4. Ask: "Would you like me to fix these automatically?"
```

---

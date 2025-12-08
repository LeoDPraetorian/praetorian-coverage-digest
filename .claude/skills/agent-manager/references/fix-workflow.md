# Agent Fix Workflow

> **⚠️ DEPRECATION NOTICE (December 2024)**
>
> **This workflow documents ARCHIVED CLI commands.**
>
> **For agent fixing, use the instruction-based skill instead:**
> ```
> skill: "fixing-agents"
> ```
>
> **Why the change?** Pure Router Pattern migration completed December 7, 2024. All agent operations now use instruction-based skills for consistency, context efficiency, and better user experience.
>
> **See:** `.claude/skills/fixing-agents/SKILL.md` for the current workflow
>
> ---
>
> **The content below is kept for historical reference only.**

## Overview (ARCHIVED)

The fix command applies compliance remediation to agents with JSON-based interactive selection.

**🎯 New in November 2024:** The fix command now outputs structured JSON for Claude to intercept and present interactive fix selection via `AskUserQuestion`. This enables multi-select batch fixing with a single command.

## Interactive Workflow (Recommended)

This is the primary workflow for agent fixes:

1. **Audit the agent:**
   ```bash
   /agent-manager audit my-agent
   ```

2. **Audit reports failures and exits** (no automatic fix call)

3. **Claude runs suggest mode:**
   ```bash
   npm run --silent fix -- my-agent --suggest
   ```

4. **Fix CLI outputs JSON:**
   ```json
   {
     "agent": "my-agent",
     "status": "NEEDS_INPUT",
     "autoFixable": [...],
     "manual": [...],
     "questions": [{
       "id": "selectedFixes",
       "question": "Which fixes would you like to apply?",
       "header": "Fix Selection",
       "multiSelect": true,
       "options": [
         { "label": "[AUTO] phase1-skills-sort", "description": "Sort skills alphabetically" },
         { "label": "[MANUAL] phase2-trigger", "description": "Add 'Use when' trigger" }
       ]
     }],
     "applyCommand": "npm run fix -- my-agent --apply $SELECTED_FIXES"
   }
   ```

5. **Claude uses AskUserQuestion** to present fix options

6. **User selects fixes** (multi-select supported)

7. **Claude runs apply command:**
   ```bash
   npm run --silent fix -- my-agent --apply phase1-skills-sort,phase4-gateway
   ```

## Manual Commands (Direct Use)

```bash
# Apply selected fixes (comma-separated)
npm run --silent fix -- react-developer --apply phase1-description,phase1-skills-sort

# Apply all auto-fixes
npm run --silent fix -- react-developer --all-auto

# Preview changes
npm run --silent fix -- react-developer --dry-run

# Apply specific fix with custom value
npm run --silent fix -- react-developer --apply phase1-description --value "new description"
```

## Command Reference

```bash
npm run --silent fix -- <name> --suggest                           # JSON output for Claude interception
npm run --silent fix -- <name> --apply <fix-id1>,<fix-id2>         # Apply multiple fixes
npm run --silent fix -- <name> --all-auto                          # Apply all auto-fixable
npm run --silent fix -- <name> --dry-run                           # Preview changes
npm run --silent fix -- <name> --apply <fix-id> --value "<value>"  # Manual fix with custom value
```

### Parameters

| Parameter | Description |
|-----------|-------------|
| `--suggest` | Output JSON with fix questions for Claude to intercept |
| `--apply <ids>` | Apply fix(es) - supports comma-separated IDs |
| `--all-auto` | Apply all auto-fixable fixes |
| `--dry-run` | Preview without writing |
| `--value` | Custom value for manual fixes |

## Fix Categories

### Auto-Fixable (Deterministic)

| Fix ID | Phase | Description |
|--------|-------|-------------|
| `phase1-description` | 1 | Convert block scalar to single-line |
| `phase1-name` | 1 | Fix name/filename mismatch |
| `phase4-gateway` | 4 | Add gateway skill to frontmatter |
| `phase4-replace-path` | 4 | Replace library path with gateway |

### Manual Review Required

| Fix ID | Phase | Description |
|--------|-------|-------------|
| `phase2-trigger` | 2 | Add "Use when" trigger |
| `phase2-examples` | 2 | Add example blocks |
| `phase3-trim` | 3 | Extract patterns to skills |
| `phase3-delegation` | 3 | Add skill references |
| `phase5-output` | 5 | Add JSON output format |
| `phase6-escalation` | 6 | Add escalation protocol |

## Fix Workflows

### Fixing Block Scalar (Critical)

```bash
# Check status
npm run --silent test -- react-developer

# If description shows block scalar:
npm run --silent fix -- react-developer --apply phase1-description --dry-run

# Apply fix
npm run --silent fix -- react-developer --apply phase1-description
```

### Adding Gateway Skill

```bash
# Check suggestion
npm run --silent fix -- react-developer --suggest

# Apply
npm run --silent fix -- react-developer --apply phase4-gateway
```

### Reducing Line Count

This requires manual work:

1. Get suggestions:
   ```bash
   npm run --silent fix -- react-developer --suggest
   ```

2. Identify embedded patterns from Phase 3 issues

3. Create skill files for patterns:
   - TDD workflows → use `developing-with-tdd`
   - Debugging → use `debugging-systematically`
   - Verification → use `verifying-before-completion`

4. Replace embedded content with skill references

5. Re-audit to verify

### Adding Output Format

1. Get template:
   ```bash
   npm run --silent fix -- react-developer --suggest
   # Shows phase5-output suggested value
   ```

2. Add to agent body manually:
   ```markdown
   ## Output Format (Standardized)

   Return results as structured JSON:

   ```json
   {
     "status": "complete|blocked|needs_review",
     "summary": "1-2 sentence description",
     ...
   }
   ```
   ```

### Adding Escalation Protocol

1. Get template:
   ```bash
   npm run --silent fix -- react-developer --suggest
   # Shows phase6-escalation suggested value
   ```

2. Add to agent body manually:
   ```markdown
   ## Escalation Protocol

   **Stop and escalate if**:
   - Architecture decision needed → Recommend `react-architect`
   - Security concern → Recommend `security-architect`
   - Blocked by requirements → Use AskUserQuestion tool
   ```

## Dry Run Mode

Always preview changes before applying:

```bash
# Preview all auto-fixes
npm run --silent fix -- react-developer --all-auto --dry-run

# Preview specific fix
npm run --silent fix -- react-developer --apply phase1-description --dry-run
```

Output shows diff-like view:
```
[DRY RUN] Would apply:
Fix: phase1-description
────────────────────────────────────────────────────────────
- description: |
-   Use when developing React applications.
+ description: Use when developing React applications.
```

## Custom Values

For manual fixes, you can provide custom values:

```bash
npm run --silent fix -- react-developer --apply phase1-description --value "Use when developing React UI - components, hooks, state management"
```

## Fix All Auto-Fixable

Apply all deterministic fixes at once:

```bash
# Preview
npm run --silent fix -- react-developer --all-auto --dry-run

# Apply
npm run --silent fix -- react-developer --all-auto

# Output:
# ✅ Applied 2 auto-fixes:
#   - phase1-description
#   - phase4-gateway
#
# Remaining issues: 0 errors, 3 warnings
```

## Post-Fix Verification

After applying fixes:

```bash
# Re-audit
npm run --silent audit -- react-developer

# Test discovery
npm run --silent test -- react-developer

# Verify in new Claude Code session
```

## Common Fix Scenarios

### Batch Fix All Agents

```bash
# List all broken agents
npm run --silent list -- --status broken

# Fix each one
for agent in agent1 agent2 agent3; do
  npm run --silent fix -- $agent --all-auto
done
```

### Fix Description Format

```bash
# Current: description: |
#            Multi-line content...

# Fix to single-line:
npm run --silent fix -- my-agent --apply phase1-description

# Result: description: Multi-line content...
```

### Replace Library Path

```bash
# Current: skills: .claude/skill-library/frontend/SKILL.md

# Fix to gateway:
npm run --silent fix -- my-agent --apply phase4-replace-path

# Result: skills: gateway-frontend
```

## Troubleshooting

### Fix Doesn't Apply

1. Check if fix is auto-fixable
2. Use `--suggest` to see requirements
3. Use `--value` for manual fixes

### Remaining Errors After Auto-Fix

Some fixes require manual review:
- Line count reduction
- Output format addition
- Escalation protocol

Use `--suggest` to see required actions.

## References

- [Audit Phases](./audit-phases.md)
- [Update Workflow](./update-workflow.md)
- [Lean Agent Template](./lean-agent-template.md)

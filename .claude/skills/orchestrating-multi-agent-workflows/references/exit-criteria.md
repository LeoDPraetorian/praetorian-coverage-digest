# Exit Criteria Documentation

**Pattern 8.3: Exit Criteria Documentation**

## Standard Exit Criteria

Orchestration is complete when:

- [ ] All phases marked complete in progress tracking
- [ ] All spawned agents returned status: complete
- [ ] All validation gates passed (or overrides documented)
- [ ] Final verification command executed with passing result
- [ ] Progress file updated with final status
- [ ] User approves final result (if human checkpoint configured)

## Exit Criteria Format

**Use COUNT + UNIT** - Be specific and measurable.

### Good Examples

- "5 tests passing"
- "3 components implemented"
- "API returns 200 status for all 4 endpoints"
- "Coverage at 87% (threshold: 80%)"

### Bad Examples

- "Tests work" ❌ (no count)
- "Implementation done" ❌ (vague)
- "Everything passes" ❌ (no unit)

## Workflow Completion

After completing all phases and meeting exit criteria:

1. **Verify all checkboxes above are checked**
2. **Invoke completion skill**: `finishing-a-development-branch` (LIBRARY) for:
   - Branch cleanup
   - PR creation
   - Worktree cleanup

See Integration section in main skill for details.

## Related Patterns

- **Post-Completion Verification** (references/agent-output-validation.md) - Mandatory verification protocol when agents return
- **Quality Scoring** (references/quality-scoring.md) - Quantitative thresholds for passing
- **Gated Verification** (references/gated-verification.md) - Two-stage verification (spec compliance + quality)

## External Sources

Exit Criteria format from: Anthropic - Building Effective Agents
https://www.anthropic.com/research/building-effective-agents

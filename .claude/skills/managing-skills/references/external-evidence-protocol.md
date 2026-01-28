# External Evidence Protocol

**When external RED evidence already exists, ask the user before spawning agents.**

## What Counts as External Evidence

- User-provided test transcripts or logs
- Bug reports with reproduction steps
- Previous test session exports
- Documented failures from production
- User-run tests showing the gap

## Protocol

**Before spawning Witness/Validator in RED phase, check if external evidence exists.**

**If external evidence exists, ASK the user:**

```
AskUserQuestion:
"External RED evidence detected: {describe evidence}

This evidence shows: {gap summary}

How should we proceed?"

Options:
- Accept as RED evidence (skip Witness/Validator spawning)
- Spawn fresh Witness/Validator agents (independent verification)
```

## If User Accepts External Evidence

1. Document the evidence source in `{OUTPUT_DIR}/red-test.md` (copy or reference)
2. Proceed to next phase (Step 2 for updates, Phase 2 for creation)
3. **GREEN Witness/Validator is still REQUIRED** after edits

## If User Requests Fresh Agents

Proceed with RED phase steps as normal (spawn Witness + Validator).

## Why This Matters

Without this protocol:
- Agent silently accepts external evidence (user doesn't know TDD was "skipped")
- OR agent silently spawns agents despite existing evidence (wastes time)

The user should decide, not the agent.

## Related

- [TDD Validator Pattern](tdd-validator-pattern.md) - Witness/Validator methodology
- [tdd-methodology.md](tdd-methodology.md) - Overall RED-GREEN-REFACTOR

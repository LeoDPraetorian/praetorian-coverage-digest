# Understanding Audit vs Test

**Critical distinction** between structural/lint validation and behavioral validation.

## Comparison Table

| Aspect             | Phase 0 (Audit)                                                                                                                    | Test (Behavioral)                                                                                                                          |
| ------------------ | ---------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| **Purpose**        | Automated critical validation via CLI - file format, syntax, description (Phase 0 automated, Phases 1-18 manual via LLM)           | Behavioral validation - does agent correctly invoke and follow skills under realistic pressure?                                            |
| **Method**         | Phase 0: `audit-critical.ts` CLI (block scalars, name mismatch); Phases 1-18: Manual LLM reasoning (extended structural checks)    | Spawns actual agents with Task tool, evaluates skill integration with pressure scenarios                                                   |
| **What it checks** | Phase 0: YAML syntax, description format (no block scalars), name consistency; Phases 1-18: line count, skills, patterns, gateways | Skill invocation behavior, methodology compliance (TDD/debugging/verification), workflow execution under time/authority/sunk cost pressure |
| **Speed**          | Phase 0: Fast (30-60 seconds automated); Phases 1-18: Additional manual checks (~5-10 min)                                         | Slower (10-25 min per skill, potentially hours for full agent with all gateway skills)                                                     |
| **When to use**    | Before committing, after editing agent file, quick compliance checks                                                               | After major changes, before deployment, when debugging why agent bypasses skills, validating TDD enforcement                               |
| **Implementation** | Uses `auditing-agents` skill (Phase 0: `audit-critical.ts`, Phases 1-18: manual procedures)                                        | Uses `verifying-agent-skill-invocation` skill (delegates to `pressure-testing-skill-content` for pressure scenarios)                       |
| **Output**         | Phase 0: Exit code 0/1/2; Phases 1-18: PASS/WARNING/ERROR/INFO per phase with fix suggestions                                      | PASS/FAIL/PARTIAL per skill with detailed reasoning (why agent succeeded/failed at skill invocation)                                       |

## Analogy

- **Phase 0 (Audit)** = ESLint (automated syntax, formatting, structure rules) + human code review (manual pattern checks)
- **Test** = Jest/Vitest (runtime behavior, correctness under execution)

## Important Notes

- The `test.ts` CLI script is deprecated - it was performing structural checks that belong in audit
- The `test` operation now ONLY routes to `verifying-agent-skill-invocation` skill for behavioral validation
- Never invoke `test.ts` directly - always use the `verifying-agent-skill-invocation` skill

## Recommendation

**Use both:** Audit catches format/structure issues quickly (seconds). Test catches behavioral issues that only appear when agents execute under pressure (minutes/hours).

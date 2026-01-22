# MCP Development Rationalization Table

## Inherits From

- `orchestrating-multi-agent-workflows/references/orchestration-guards.md` (generic rationalization prevention patterns)

This document extends core rationalization prevention with MCP-specific patterns. For generic patterns (retry limits, checkpoint framework, escalation protocols), see the core guards document.

## Organization

This file consolidates MCP-specific rationalization patterns. Common patterns across phases are defined below, with phase-specific and agent-specific rationalizations following.

## Common Patterns Across Phases

> Consolidates frequently-seen rationalizations that appear in multiple phases. Phase-specific context remains in individual phase sections below.

| Pattern              | Examples                                                                    | Why Wrong                      | Standard Response                   |
| -------------------- | --------------------------------------------------------------------------- | ------------------------------ | ----------------------------------- |
| 'X is optional'      | MANIFEST.yaml, credentials, security review, coverage, service skill, TSDoc | Core workflow requirements     | DENIED. Complete required step.     |
| 'I know X'           | TypeScript, MCP works, MCP schema                                           | Assumptions skip verification  | DENIED. Run verification step.      |
| 'X can happen later' | Tools discovery, setup, token optimization                                  | Later steps depend on this     | DENIED. Complete in sequence.       |
| 'X is enough'        | Sample 3 tools, 10 tests, 12 tests, 9/11 phases                             | Gates have specific thresholds | DENIED. Meet requirement threshold. |
| 'X can substitute Y' | Integration tests for coverage, manual review for audit                     | Different validation purposes  | DENIED. Meet specific requirement.  |

## Phase-Specific Rationalizations

### Phase 1: Setup

| Rationalization                   | Why It's Wrong                                            | Response                              |
| --------------------------------- | --------------------------------------------------------- | ------------------------------------- |
| 'Setup can be in super-repo root' | MCP wrappers are timestamped sessions in .claude/.output/ | DENIED. Create timestamped directory. |

### Phase 1: MCP Setup

| Rationalization             | Why It's Wrong                                  | Response                                |
| --------------------------- | ----------------------------------------------- | --------------------------------------- |
| 'MCP is probably installed' | Unverified MCPs cause schema discovery failures | DENIED. Check mcp-client.ts explicitly. |

### Phase 3: Tool Discovery

| Rationalization                       | Why It's Wrong                                 | Response                                 |
| ------------------------------------- | ---------------------------------------------- | ---------------------------------------- |
| 'Schema discovery is slow'            | Token optimization depends on accurate schemas | DENIED. Cannot skip.                     |
| 'User probably wants core tools only' | Default is 100% coverage                       | DENIED. Ask user explicitly.             |
| 'Error schemas can be guessed'        | Error scenarios vary per tool                  | DENIED. Document actual error responses. |

### Phase 5: Shared Architecture

| Rationalization                     | Why It's Wrong                                  | Response                              |
| ----------------------------------- | ----------------------------------------------- | ------------------------------------- |
| 'Each tool needs unique patterns'   | Shared architecture ensures consistency         | DENIED. Design shared patterns first. |
| 'Token optimization is per-tool'    | 80-99% reduction requires service-wide strategy | DENIED. Design shared approach.       |
| 'Human approval slows workflow'     | Misaligned architecture affects 15+ tools       | DENIED. Wait for approval.            |
| 'Parallel is overkill for 2 agents' | Architecture + security are independent         | DENIED. Spawn in parallel.            |

### Phase 6: Per-Tool Work

| Rationalization                       | Why It's Wrong                               | Response                                |
| ------------------------------------- | -------------------------------------------- | --------------------------------------- |
| 'Batch size 10 is more efficient'     | Batches >5 overwhelm agents                  | DENIED. Use batch size 3-5.             |
| 'Architecture is obvious from schema' | Tool-specific edge cases exist               | DENIED. tool-lead must design per tool. |
| 'Tests can be generic across tools'   | Each tool has unique validation requirements | DENIED. tool-tester per tool.           |
| 'Sequential is safer than batched'    | Batching prevents session timeouts           | DENIED. Process in batches.             |

### Phase 7: Test Planning (Failing Tests)

| Rationalization                  | Why It's Wrong                     | Response                                  |
| -------------------------------- | ---------------------------------- | ----------------------------------------- |
| 'Tests will obviously fail'      | Passing tests indicate mock issues | DENIED. Verify failure reasons.           |
| 'Skip RED gate, trust TDD'       | RED gate validates test setup      | DENIED. Run and verify failures.          |
| 'One tool passing is acceptable' | All tools must fail consistently   | DENIED. Fix test setup before proceeding. |

### Phase 8: Testing (Implementation)

| Rationalization                    | Why It's Wrong                            | Response                                   |
| ---------------------------------- | ----------------------------------------- | ------------------------------------------ |
| 'Implement all tools at once'      | Batching enables incremental verification | DENIED. Use batch size 3-5.                |
| 'Copy-paste from existing wrapper' | Each tool has unique schema               | DENIED. Follow tool-specific architecture. |
| 'Hardcoded fallbacks are fine'     | Hardcoded values fail audit               | DENIED. Use configuration.                 |

### Phase 9: Code Review

| Rationalization                    | Why It's Wrong                           | Response                              |
| ---------------------------------- | ---------------------------------------- | ------------------------------------- |
| 'One retry failed, skip review'    | Max 1 retry, then escalate               | DENIED. Escalate via AskUserQuestion. |
| 'CHANGES_REQUESTED is blocking'    | 1 retry allowed per tool                 | DENIED. Fix and re-review once.       |
| 'Review all 15 tools in one batch' | Review in same batches as implementation | DENIED. Batch size 3-5.               |
| 'Spec compliance is subjective'    | Architecture defines objective criteria  | DENIED. Follow architecture exactly.  |

### Phase 10: GREEN Verification

| Rationalization                  | Why It's Wrong            | Response                                |
| -------------------------------- | ------------------------- | --------------------------------------- |
| '75% coverage is acceptable'     | Gate is >=80% per wrapper | DENIED. Increase coverage.              |
| 'One tool failing is acceptable' | All tools must pass       | DENIED. Fix failures before proceeding. |

### Phase 11: Audit

| Rationalization                  | Why It's Wrong                  | Response                              |
| -------------------------------- | ------------------------------- | ------------------------------------- |
| 'Audit is bureaucratic overhead' | Audit catches production issues | DENIED. Pass audit before completion. |
| 'Audit one tool as sample'       | All tools must pass audit       | DENIED. Audit entire service.         |

### Phase 12: Completion

| Rationalization                      | Why It's Wrong                     | Response                               |
| ------------------------------------ | ---------------------------------- | -------------------------------------- |
| 'Build passes, tests are optional'   | Final verification required        | DENIED. Run full test suite.           |
| 'Metadata.json is internal tracking' | Metadata validates 100% completion | DENIED. Update all phases to complete. |

## Agent-Specific Rationalizations

### Agent-Specific Patterns

| Agent          | Rationalization                       | Why It's Wrong                                    | Response                               |
| -------------- | ------------------------------------- | ------------------------------------------------- | -------------------------------------- |
| tool-lead      | 'Token optimization is obvious'       | designing-progressive-loading-wrappers required   | DENIED. Load and follow skill.         |
| tool-lead      | 'Result/Either is overkill'           | Consistent error handling across all tools        | DENIED. Use Result/Either pattern.     |
| tool-tester    | '@claude/testing can be manual mocks' | @claude/testing ensures consistency               | DENIED. Use @claude/testing imports.   |
| tool-developer | 'Manual string truncation works'      | response-utils provides tested utilities          | DENIED. Use response-utils.            |
| tool-developer | 'Custom regex is simpler'             | sanitize.ts provides validated patterns           | DENIED. Use sanitize.ts validators.    |
| tool-reviewer  | 'Barrel files are convenient'         | avoiding-barrel-files skill defines anti-patterns | DENIED. Load and enforce skill.        |
| tool-reviewer  | 'APPROVED with minor issues'          | Verdict must be binary                            | DENIED. CHANGES_REQUESTED or APPROVED. |

## Escalation Triggers

MCP-specific escalation triggers beyond standard retry limits:

- **Phase 9 (Review)**: Tool fails review after 1 retry
- **Phase 10 (GREEN)**: Coverage <80% after implementation fixes
- **Phase 11 (Audit)**: Audit score <10/11 after fixes

## Related References

- [Checkpoint Configuration](checkpoint-configuration.md) - Human approval points
- [Critical Rules](critical-rules.md) - Non-negotiable workflow requirements
- [Phase 9: Code Review](phase-7-code-review.md) - Two-stage review process

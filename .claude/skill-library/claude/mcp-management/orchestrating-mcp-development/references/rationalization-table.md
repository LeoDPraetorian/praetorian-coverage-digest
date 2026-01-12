# MCP Development Rationalization Table

Extends shared rationalization prevention patterns for MCP wrapper creation workflows.

## Phase-Specific Rationalizations

### Phase 0: Setup

| Rationalization | Why It's Wrong | Response |
|----------------|----------------|----------|
| 'Setup can be in super-repo root' | MCP wrappers are timestamped sessions in .claude/.output/ | DENIED. Create timestamped directory. |
| 'metadata.json is optional' | metadata.json tracks ALL 15+ tools across 11 phases | DENIED. Initialize metadata.json. |
| 'Tools can be discovered later' | Tool discovery is Phase 2 blocker | DENIED. Cannot proceed without tool list. |

### Phase 1: MCP Setup

| Rationalization | Why It's Wrong | Response |
|----------------|----------------|----------|
| 'MCP is probably installed' | Unverified MCPs cause schema discovery failures | DENIED. Check mcp-client.ts explicitly. |
| 'I know this MCP works' | MCP configuration changes with versions | DENIED. Run verification step. |
| 'Skip credentials for now' | 90% of MCPs require authentication | DENIED. Verify credentials before proceeding. |
| 'Setup can happen during Phase 2' | Phase 2 requires working MCP | DENIED. Complete Phase 1 first. |

### Phase 2: Tool Discovery

| Rationalization | Why It's Wrong | Response |
|----------------|----------------|----------|
| 'I know this MCP schema' | Schemas change with versions | DENIED. Run full discovery. |
| 'Sample 3 tools is enough' | Schema patterns differ across tool types | DENIED. Discover ALL tools. |
| 'Schema discovery is slow' | Token optimization depends on accurate schemas | DENIED. Cannot skip. |
| 'User probably wants core tools only' | Default is 100% coverage | DENIED. Ask user explicitly. |
| 'Error schemas can be guessed' | Error scenarios vary per tool | DENIED. Document actual error responses. |

### Phase 3: Shared Architecture

| Rationalization | Why It's Wrong | Response |
|----------------|----------------|----------|
| 'Each tool needs unique patterns' | Shared architecture ensures consistency | DENIED. Design shared patterns first. |
| 'Token optimization is per-tool' | 80-99% reduction requires service-wide strategy | DENIED. Design shared approach. |
| 'Security review is optional' | All MCP wrappers expose external APIs | DENIED. Security-lead review required. |
| 'Human approval slows workflow' | Misaligned architecture affects 15+ tools | DENIED. Wait for approval. |
| 'Parallel is overkill for 2 agents' | Architecture + security are independent | DENIED. Spawn in parallel. |

### Phase 4: Per-Tool Work

| Rationalization | Why It's Wrong | Response |
|----------------|----------------|----------|
| 'Batch size 10 is more efficient' | Batches >5 overwhelm agents | DENIED. Use batch size 3-5. |
| 'Architecture is obvious from schema' | Tool-specific edge cases exist | DENIED. mcp-tool-lead must design per tool. |
| 'Tests can be generic across tools' | Each tool has unique validation requirements | DENIED. mcp-tool-tester per tool. |
| '10 tests per tool is enough' | 18 tests across 6 categories is requirement | DENIED. Meet test plan requirements. |
| 'Sequential is safer than batched' | Batching prevents session timeouts | DENIED. Process in batches. |

### Phase 5: RED Gate (Failing Tests)

| Rationalization | Why It's Wrong | Response |
|----------------|----------------|----------|
| 'Tests will obviously fail' | Passing tests indicate mock issues | DENIED. Verify failure reasons. |
| 'Skip RED gate, trust TDD' | RED gate validates test setup | DENIED. Run and verify failures. |
| 'One tool passing is acceptable' | All tools must fail consistently | DENIED. Fix test setup before proceeding. |

### Phase 6: GREEN Gate (Implementation)

| Rationalization | Why It's Wrong | Response |
|----------------|----------------|----------|
| 'Implement all tools at once' | Batching enables incremental verification | DENIED. Use batch size 3-5. |
| 'I'll optimize tokens later' | Token budgets are architecture requirements | DENIED. Implement per architecture. |
| 'Copy-paste from existing wrapper' | Each tool has unique schema | DENIED. Follow tool-specific architecture. |
| 'Security sanitization is optional' | All wrappers expose user inputs to MCPs | DENIED. Implement security validation. |
| 'Hardcoded fallbacks are fine' | Hardcoded values fail audit | DENIED. Use configuration. |

### Phase 7: Code Review

| Rationalization | Why It's Wrong | Response |
|----------------|----------------|----------|
| 'Self-review is sufficient' | mcp-tool-reviewer provides objective assessment | DENIED. Agent review required. |
| 'One retry failed, skip review' | Max 1 retry, then escalate | DENIED. Escalate via AskUserQuestion. |
| 'CHANGES_REQUESTED is blocking' | 1 retry allowed per tool | DENIED. Fix and re-review once. |
| 'Review all 15 tools in one batch' | Review in same batches as implementation | DENIED. Batch size 3-5. |
| 'Spec compliance is subjective' | Architecture defines objective criteria | DENIED. Follow architecture exactly. |

### Phase 8: GREEN Verification

| Rationalization | Why It's Wrong | Response |
|----------------|----------------|----------|
| '75% coverage is acceptable' | Gate is >=80% per wrapper | DENIED. Increase coverage. |
| 'Tests pass, coverage is optional' | Coverage verification is mandatory gate | DENIED. Run with coverage flag. |
| 'One tool failing is acceptable' | All tools must pass | DENIED. Fix failures before proceeding. |
| 'Integration tests can substitute coverage' | Unit test coverage is separate requirement | DENIED. Meet unit test coverage. |

### Phase 9: Audit

| Rationalization | Why It's Wrong | Response |
|----------------|----------------|----------|
| '9/11 phases is close enough' | Gate is >=10/11 per wrapper | DENIED. Fix audit failures. |
| 'Audit is bureaucratic overhead' | Audit catches production issues | DENIED. Pass audit before completion. |
| 'Manual review can substitute audit' | Audit validates objective criteria | DENIED. Run automated audit. |
| 'Audit one tool as sample' | All tools must pass audit | DENIED. Audit entire service. |

### Phase 10: Completion

| Rationalization | Why It's Wrong | Response |
|----------------|----------------|----------|
| 'Service skill is optional' | Service skill provides unified interface | DENIED. Generate service skill. |
| 'Build passes, tests are optional' | Final verification required | DENIED. Run full test suite. |
| 'Metadata.json is internal tracking' | Metadata validates 100% completion | DENIED. Update all phases to complete. |

## Cross-Phase Rationalizations

| Rationalization | Why It's Wrong | Response |
|----------------|----------------|----------|
| 'Batching is optional for <10 tools' | Batching prevents context overload | DENIED. Always use batches. |
| 'Parallel execution is risky' | Phases 3-4 designed for parallelism | DENIED. Spawn agents in parallel. |
| 'Gates slow down workflow' | Gates prevent cascading failures | DENIED. All gates are mandatory. |
| 'One agent can do multiple phases' | Specialized agents ensure quality | DENIED. Use designated agents per phase. |
| 'Human checkpoints are formality' | Architecture misalignment affects all tools | DENIED. Wait for approval. |
| 'Library skills are suggestions' | Library skills define compliance criteria | DENIED. Load and follow exactly. |
| 'Progress persistence is for >30 tools' | Invoke at 15+ tools or 2+ hour workflows | DENIED. Use for 15+ tool services. |
| 'Retry logic doesn't apply to orchestrator' | Orchestrator handles retry coordination | DENIED. Enforce max retry limits. |

## Agent-Specific Rationalizations

### mcp-tool-lead

| Rationalization | Why It's Wrong | Response |
|----------------|----------------|----------|
| 'I know TypeScript patterns' | Load library skills via Read tool | DENIED. Read required skills. |
| 'Token optimization is obvious' | designing-progressive-loading-wrappers required | DENIED. Load and follow skill. |
| 'Result/Either is overkill' | Consistent error handling across all tools | DENIED. Use Result/Either pattern. |

### mcp-tool-tester

| Rationalization | Why It's Wrong | Response |
|----------------|----------------|----------|
| '12 tests is sufficient' | 18 tests across 6 categories required | DENIED. Meet test plan requirements. |
| 'Security tests are optional' | 4 security tests mandatory per tool | DENIED. Test all 4 security scenarios. |
| '@claude/testing can be manual mocks' | @claude/testing ensures consistency | DENIED. Use @claude/testing imports. |

### mcp-tool-developer

| Rationalization | Why It's Wrong | Response |
|----------------|----------------|----------|
| 'I can optimize architecture later' | Architecture is contract from Phase 3 | DENIED. Follow architecture exactly. |
| 'Manual string truncation works' | response-utils provides tested utilities | DENIED. Use response-utils. |
| 'Custom regex is simpler' | sanitize.ts provides validated patterns | DENIED. Use sanitize.ts validators. |

### mcp-tool-reviewer

| Rationalization | Why It's Wrong | Response |
|----------------|----------------|----------|
| 'Barrel files are convenient' | avoiding-barrel-files skill defines anti-patterns | DENIED. Load and enforce skill. |
| 'TSDoc is optional' | documenting-with-tsdoc skill required | DENIED. Verify TSDoc compliance. |
| 'APPROVED with minor issues' | Verdict must be binary | DENIED. CHANGES_REQUESTED or APPROVED. |

## Escalation Triggers

When these occur, escalate to user via AskUserQuestion:

- Phase 7: Tool fails review after 1 retry
- Phase 8: Coverage <80% after implementation fixes
- Phase 9: Audit score <10/11 after fixes
- Any phase: Cumulative issues >5 across batches
- Any phase: >2 retries required per batch

## Response Format

When denying rationalization:

```
RATIONALIZATION DETECTED: [rationalization]

WHY WRONG: [explanation]

REQUIRED ACTION: [specific next step]
```

## Related References

- [Checkpoint Configuration](checkpoint-configuration.md) - Human approval points
- [Critical Rules](critical-rules.md) - Non-negotiable workflow requirements
- [Phase 7: Code Review](phase-7-code-review.md) - Two-stage review process

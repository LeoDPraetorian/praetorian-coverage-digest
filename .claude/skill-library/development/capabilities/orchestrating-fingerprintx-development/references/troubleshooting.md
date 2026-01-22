# Troubleshooting

**Common issues at each phase and how to resolve them.**

---

## Phase 2: Triage

### Issue: Work type unclear

**Symptoms**: Request could be SMALL or MEDIUM

**Solution**:

1. Ask clarifying question via AskUserQuestion
2. Default to MEDIUM if still ambiguous (safer to do more phases)
3. Document classification reasoning in triage.md

---

## Phase 3: Codebase Discovery

### Issue: No similar plugins found

**Symptoms**: Protocol is unique, no reference implementations

**Solution**:

1. Use ANY plugin as pattern reference (postgres, mysql, mongodb)
2. Document "No direct reference plugins, using {plugin} as pattern"
3. Flag for extra architecture attention in Phase 7

### Issue: Protocol source code not available

**Symptoms**: User says "I don't know" or "closed-source"

**Solution**:

1. Search GitHub: `site:github.com "{protocol} server"`
2. Check official website for source links
3. If not found after 5 minutes: Mark as closed-source
4. Skip version matrix research (Step 6)

### Issue: Shodan has limited data

**Symptoms**: Fewer than 3 test vectors found

**Solution**:

1. Try alternative queries (port-based, banner-based)
2. Check Censys as backup
3. If still limited: Document limitation, plan for Docker testing only
4. Consider if protocol is obscure enough to warrant development

---

## Phase 6: Brainstorming

### Issue: User doesn't engage

**Symptoms**: User says "just do whatever you think is best"

**Solution**:

1. Present 2-3 options with clear trade-offs
2. Recommend one option explicitly
3. Wait for explicit selection (even "go with your recommendation")
4. Do NOT proceed without human approval at this checkpoint

### Issue: All approaches seem equally valid

**Symptoms**: Can't determine best detection strategy

**Solution**:

1. Default to simplest approach (banner match if viable)
2. Document trade-offs considered
3. Note that approach can be upgraded later if needed

---

## Phase 7: Architecture Plan

### Issue: Plan too complex

**Symptoms**: More than 6 implementation tasks identified

**Solution**:

1. Fingerprintx plugins should be 1-2 files
2. Re-evaluate if extra complexity is justified
3. Consider splitting into multiple plugins (rare)

### Issue: Human doesn't approve plan

**Symptoms**: User requests changes at checkpoint

**Solution**:

1. Document requested changes
2. Update architecture.md
3. Re-present for approval
4. Maximum 3 revision cycles, then escalate

---

## Phase 8: Implementation

### Issue: Plugin doesn't compile

**Symptoms**: `go build` fails with type errors

**Solution**:

1. Check import in `pkg/plugins/plugins.go`
2. Verify type constant in `pkg/plugins/types.go` (alphabetically ordered)
3. Ensure plugin struct implements all interface methods
4. Run `go vet` for additional checks

### Issue: Detection not working

**Symptoms**: Plugin doesn't detect protocol in manual test

**Solution**:

1. Verify test service is running
2. Check port binding: `netstat -an | grep {port}`
3. Test with standard client first
4. Add debug logging to detection logic
5. Compare with similar plugin implementation

### Issue: capability-developer stuck

**Symptoms**: Agent returns partial work or blocks

**Solution**:

1. Check scratchpad for context
2. Provide more specific guidance
3. May need to return to Phase 7 for architecture clarification

---

## Phase 10: Domain Compliance

### Issue: P0 patterns not found

**Symptoms**: Compliance check fails on mandatory patterns

**Solution**:

1. Return to Phase 8 with specific requirements
2. Use delegation template with explicit pattern checklist
3. Reference similar plugin that passes compliance

### Common P0 Violations

| Violation             | Fix                                          |
| --------------------- | -------------------------------------------- |
| Missing type constant | Add to `pkg/plugins/types.go` alphabetically |
| Not imported          | Add import in `pkg/plugins/plugins.go`       |
| Wrong interface       | Implement all 5 required methods             |
| No error handling     | Add graceful failure for connection errors   |

---

## Phase 11: Code Quality

### Issue: Review fails repeatedly

**Symptoms**: Same issues flagged across iterations

**Solution**:

1. Check if issue is fundamental (needs architecture change)
2. After 3 consecutive failures: escalate to user
3. May need to return to Phase 7

### Issue: Reviewer too strict

**Symptoms**: Flags stylistic issues that don't affect function

**Solution**:

1. Document which issues are blocking vs advisory
2. Focus on functional and security issues
3. Style issues can be addressed in separate cleanup

---

## Phase 13: Testing

### Issue: Docker unavailable

**Symptoms**: `docker ps` fails

**Required Action** (MANDATORY):

1. DO NOT silently skip
2. AskUserQuestion with options:
   - Install/start Docker and retry
   - Skip Docker testing and document limitation
3. Wait for explicit user choice
4. Document in test results

### Issue: Shodan API key missing

**Symptoms**: SHODAN_API_KEY not set

**Required Action** (MANDATORY):

1. DO NOT silently skip
2. AskUserQuestion with options:
   - Configure API key and retry
   - Skip live validation and document limitation
3. Wait for explicit user choice
4. Document in test results

### Issue: Tests fail intermittently

**Symptoms**: Same test passes/fails inconsistently

**Solution**:

1. Check for timing issues (add appropriate waits)
2. Check for resource cleanup between tests
3. Run tests in isolation to identify conflicts
4. Add retries for flaky external dependencies

### Issue: Coverage below 80%

**Symptoms**: Coverage verification fails

**Solution**:

1. Identify uncovered code paths
2. Add tests for edge cases
3. If code is unreachable: consider removing it
4. Document if coverage gap is justified

---

## Phase 14: Coverage Verification

### Issue: Can't reach 80% coverage

**Symptoms**: Some paths are genuinely untestable

**Solution**:

1. Document which paths are uncovered and why
2. If error handling only: may be acceptable
3. Present to user for approval to proceed with lower coverage
4. NEVER fake coverage numbers

---

## Phase 16: Completion

### Issue: PR description incomplete

**Symptoms**: Missing protocol research or test results

**Solution**:

1. All artifacts must be included or linked
2. Use `<details>` tags for long content
3. Link to `.fingerprintx-development/` for full artifacts

### Issue: Type constant not alphabetically ordered

**Symptoms**: Lint or review flags ordering

**Solution**:

1. Move constant to correct position in `types.go`
2. Same for import in `plugins.go`
3. Run `go fmt` to ensure formatting

---

## Cross-Phase Issues

### Issue: Lost artifacts

**Symptoms**: Can't find file from earlier phase

**Solution**:

1. Check `.fingerprintx-development/` directory
2. Check MANIFEST.yaml for artifact list
3. If truly lost: regenerate from that phase (may need to re-run phase)

### Issue: Session interrupted

**Symptoms**: Need to resume after break

**Solution**:

1. Read MANIFEST.yaml for state
2. Restore TodoWrite from phase statuses
3. Continue from current_phase
4. Check scratchpad for any partial work

### Issue: Gate check unclear

**Symptoms**: Unsure if gate should pass

**Solution**:

1. Gates are binary - if uncertain, it fails
2. Complete the uncertain item
3. Do NOT proceed with "close enough"

---

## Escalation

If issue not covered here:

1. Search existing plugins: `pkg/plugins/services/`
2. Review fingerprintx README
3. Ask user for domain-specific guidance
4. Do NOT guess - blocked is better than wrong

---

## Related References

- [Phase Details](phase-1-setup.md) through [phase-16-completion.md](phase-16-completion.md)
- [Emergency Abort](emergency-abort.md) - When to abort
- [Tight Feedback Loop](tight-feedback-loop.md) - Iteration handling

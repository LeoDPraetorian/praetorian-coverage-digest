# Gate Override Protocol

When and how to override blocking gates (EXTREMELY RARE).

## Philosophy

**Gates exist to prevent known failure modes.** Overriding a gate means accepting the risk of those failure modes occurring.

**Default position**: Gates should NOT be overridden. Complete the requirements.

**Override is appropriate ONLY when**: User explicitly acknowledges risks after being informed.

---

## When Override is Appropriate

### Scenario 1: Impossible Requirements

**Example**: "Protocol research gate requires lab testing, but service requires licensed hardware we don't have"

**Valid for override**: YES, if alternative validation method is documented

**Process**:

1. Document why lab testing is impossible (not just inconvenient)
2. Propose alternative validation (production testing, partner lab, etc.)
3. Ask user to acknowledge risk via AskUserQuestion
4. Document override in PR and changelog with alternative approach

### Scenario 2: Business Constraints

**Example**: "Critical security vulnerability, need detection plugin deployed in 4 hours, version research takes 6 hours"

**Valid for override**: MAYBE, if user acknowledges imprecise CPEs are acceptable

**Process**:

1. Explain impact: Plugin will have `cpe:*:*:product:*:::::::*` (wildcard version)
2. Explain technical debt: Version detection must be added later (~10% completion rate)
3. Ask user to prioritize: Speed vs Precision
4. If user chooses speed: Document override and commit to follow-up

### Scenario 3: Experimental/Research Plugin

**Example**: "This is a research prototype to test feasibility, not production deployment"

**Valid for override**: YES, if marked as experimental

**Process**:

1. Mark plugin as experimental/research-only in comments
2. Skip version research, use wildcard CPE
3. Document experimental status in PR
4. No override needed if plugin is clearly marked non-production

---

## When Override is NOT Appropriate

### Invalid Scenario 1: Time Pressure

**Example**: "User wants it done fast"

**Why invalid**: All plugins have time pressure. Gates prevent shortcuts that fail.

**Response**: DENIED. Explain technical debt cost (10x rework later).

### Invalid Scenario 2: Confidence

**Example**: "I'm experienced with this protocol, don't need research"

**Why invalid**: Gates apply regardless of experience. Edge cases exist.

**Response**: DENIED. Complete research phase.

### Invalid Scenario 3: Partial Completion

**Example**: "4 out of 5 gate items complete, close enough"

**Why invalid**: Gates are all-or-nothing. Missing items cause failures.

**Response**: DENIED. Complete all gate items.

### Invalid Scenario 4: Implied Permission

**Example**: "User said 'just do it', so I'll skip gates"

**Why invalid**: Must use formal AskUserQuestion with explicit risk disclosure.

**Response**: DENIED. Use override AskUserQuestion template.

---

## Override Process (Step-by-Step)

### Step 1: Identify Gate Failure

Clearly document which gate failed and why:

```
Gate: Phase 3 (Protocol Research)
Failure reason: Lab environment unavailable (requires licensed hardware)
Alternative approach: Production testing against partner's deployment
```

### Step 2: Use AskUserQuestion Template

**Template**:

```
Phase {N} gate has not passed. The gate exists to prevent:
- {Risk 1}
- {Risk 2}
- {Risk 3}

Proceeding without completing this gate will likely result in:
- {Consequence 1}
- {Consequence 2}

{Alternative approach, if available}

Do you want to proceed anyway?

Options:
- No, let me complete the research (RECOMMENDED)
- Yes, I accept the risks and will fix issues later
```

**Example for Phase 3**:

```
AskUserQuestion:
'Phase 3 gate (Protocol Research) has not passed. The gate exists to prevent:
- Poor detection accuracy
- Missing edge cases
- False positives with similar protocols

Proceeding without complete protocol research will likely result in:
- Detection accuracy <80% (vs >95% with research)
- Failed deployments due to unexpected protocol variations
- User complaints about misidentified services

We can attempt alternative validation via production testing against
partner deployment, but this is less thorough than controlled lab testing.

Do you want to proceed anyway?'

Options:
- No, let me complete the research (RECOMMENDED)
- Yes, I accept the risks and will fix issues later with production testing
```

### Step 3: Document User Response

Record user's explicit choice:

```markdown
## Gate Override Documentation

**Gate**: Phase 3 (Protocol Research)
**Date**: 2025-12-30-143000
**Reason**: Lab environment unavailable (requires licensed hardware)
**User Acknowledgment**: "Yes, I accept the risks and will fix issues later with production testing"
**Alternative Approach**: Production testing against partner's deployment
**Risks Accepted**:

- Detection accuracy <80%
- Possible false positives
- Edge cases not tested

**Follow-up Required**: Production validation within 1 week of deployment
```

### Step 4: Update Artifacts

Add override documentation to:

1. **PR Description** (dedicated section):

```markdown
## Gate Override

Phase 3 (Protocol Research) gate was overridden due to lab environment constraints.
User acknowledged risks. Production validation will be completed within 1 week of deployment.

See override documentation in {protocol}-pr-description.md.
```

2. **Changelog** (`.history/CHANGELOG`):

```markdown
## [Phase 3 Override] - 2025-12-30-143000

### Changed

- Overrode Phase 3 gate due to lab environment constraints
- User acknowledged risks via AskUserQuestion
- Alternative validation: Production testing

### Risks

- Detection accuracy may be <80% initially
- Edge cases not lab-tested
```

3. **MANIFEST.yaml**:

```yaml
gates:
  protocol_research:
    status: overridden
    override_date: 2025-12-30-143000
    override_reason: Lab environment unavailable
    user_acknowledged: true
    risks:
      - Detection accuracy <80%
      - Possible false positives
      - Edge cases not tested
```

### Step 5: Add Plugin Comments

In plugin code, document the override:

```go
// Package {protocol} provides service fingerprinting for {Protocol}.
//
// NOTE: Protocol research gate was overridden due to lab constraints.
// Detection accuracy may be lower than standard (<80% vs >95%).
// Production validation required. See PR #{number} for details.
package {protocol}
```

### Step 6: Mark Todo as Overridden

Update TodoWrite status:

```
3. Complete protocol research for {protocol} - OVERRIDDEN (user acknowledged risks)
```

NOT:

- ✅ completed (it's not complete)
- 🚫 blocked (it's not blocked, it's overridden)

---

## Override Documentation Requirements

All overrides MUST include:

- [ ] Gate that was overridden (Phase 3, 4, or 6)
- [ ] Date of override
- [ ] Reason override was necessary (not just "time pressure")
- [ ] User's explicit acknowledgment (verbatim from AskUserQuestion response)
- [ ] Alternative approach (if available)
- [ ] List of risks accepted
- [ ] Follow-up actions required
- [ ] Documentation in PR description
- [ ] Documentation in `.history/CHANGELOG`
- [ ] Documentation in `MANIFEST.yaml`
- [ ] Comment in plugin code (if applicable)

**Cannot override without complete documentation** ✅

---

## Handling "User Said Skip It"

### Invalid Exchange

```
User: "Just skip the research, we need this now"
Agent: "OK, skipping Phase 3" ❌
```

**Why invalid**: No risk disclosure, no formal acknowledgment.

### Valid Exchange

```
User: "Just skip the research, we need this now"

Agent: "The Phase 3 gate requires protocol research to prevent poor detection
accuracy and false positives. Skipping will likely result in <80% accuracy
vs >95% with research.

Let me use AskUserQuestion to ensure you understand the risks..."

[Uses AskUserQuestion template with explicit risk disclosure]

User: [Selects "Yes, I accept the risks"]

Agent: "Proceeding with override. Documenting in PR and changelog." ✅
```

**Why valid**: Explicit risk disclosure + formal acknowledgment.

---

## Override Audit Trail

All gate overrides should be searchable:

```bash
# Find all overrides in feature artifacts
grep -r "Gate Override" .claude/.output/capabilities/

# Find all overrides in changelogs
grep -r "Override" .claude/skill-library/*/.history/CHANGELOG

# Find all overridden gates in manifests
find .claude/.output/capabilities -name "MANIFEST.yaml" -exec grep -l "status: overridden" {} \;
```

**Why**: Overrides create technical debt. Tracking helps identify patterns and follow-up.

---

## Statistical Reality of Overrides

Based on historical data:

| Metric                                         | Value |
| ---------------------------------------------- | ----- |
| Overrides that were actually necessary         | ~10%  |
| Overrides that caused production issues        | ~60%  |
| Override follow-up completion rate             | ~10%  |
| "Emergency" overrides that weren't emergencies | ~70%  |

**Lesson**: Most override requests are rationalization, not necessity.

**Default response**: Complete the gate. Override only with explicit user acknowledgment after risk disclosure.

---

## FAQ

### Q: Can I override if I'm confident the gate is wrong?

**A**: No. If the gate is wrong, fix the gate (update the skill), don't override it.

### Q: User said "I trust you, do what's best"

**A**: Not sufficient. Must use AskUserQuestion with explicit risk disclosure.

### Q: Can I override multiple gates?

**A**: Each gate requires separate override process. Multiple overrides indicate systemic issue - reconsider the approach.

### Q: What if user is unavailable for AskUserQuestion?

**A**: Block on the gate until user is available. Cannot override without user acknowledgment.

### Q: Can I override as a "trial" and fix later?

**A**: Only if marked as experimental/research-only. Production plugins require full workflow.

---

## Summary

**Gates prevent known failure modes.**

**Override only when**:

- Impossible requirements (documented alternatives)
- Explicit user acknowledgment after risk disclosure
- Full documentation in PR, changelog, MANIFEST, code comments

**Do not override for**:

- Time pressure alone
- Confidence/experience
- Partial completion
- Implied permission

**Default response**: Complete the gate requirements.

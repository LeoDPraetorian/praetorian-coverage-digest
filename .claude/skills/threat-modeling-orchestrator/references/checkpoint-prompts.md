# Checkpoint Prompts

**Templates for human approval gates between phases.**

## Purpose

Human checkpoints:
- Validate understanding before proceeding
- Catch errors early before compounding
- Allow user to provide additional context
- Enable scope refinement based on findings

## Phase 1 Checkpoint

```markdown
## Phase 1 Complete: Codebase Understanding

### What I Found:
- **{X} components** identified across the codebase
- **{Y} entry points** (attack surface)
- **{Z} data flows** mapped
- **{N} trust boundaries** identified

### Key Architecture Points:
1. {Primary technology stack and framework}
2. {Data storage approach}
3. {Authentication mechanism}
4. {Notable architectural pattern}

### Attack Surface Summary:
| Category | Count | Examples |
|----------|-------|----------|
| HTTP Endpoints | {n} | {example paths} |
| Background Jobs | {n} | {example types} |
| External Integrations | {n} | {services} |

### Questions for You:
- Is this architecture understanding correct?
- Any components I missed or misunderstood?
- Any sensitive areas I should prioritize in Phase 2?

### Artifacts Created:
- `phase-1/manifest.json` - File inventory
- `phase-1/entry-points.json` - Attack surface
- `phase-1/data-flows.json` - Data movement
- `phase-1/trust-boundaries.json` - Security boundaries
- `phase-1/summary.md` - Compressed overview

**Approve to proceed to Security Controls Mapping?** [Yes / No / Revise]
```

## Phase 2 Checkpoint

```markdown
## Phase 2 Complete: Security Controls Mapped

### Controls Identified:

| Category | Status | Details |
|----------|--------|---------|
| Authentication | {✅/⚠️/❌} | {summary} |
| Authorization | {✅/⚠️/❌} | {summary} |
| Input Validation | {✅/⚠️/❌} | {summary} |
| Cryptography | {✅/⚠️/❌} | {summary} |
| Audit Logging | {✅/⚠️/❌} | {summary} |
| Rate Limiting | {✅/⚠️/❌} | {summary} |

### Control Gaps Identified:
1. **{Gap 1}** - Severity: {High/Medium/Low}
2. **{Gap 2}** - Severity: {High/Medium/Low}
3. **{Gap 3}** - Severity: {High/Medium/Low}

### Questions for You:
- Are there security controls I missed?
- Any custom security mechanisms to consider?
- Are the identified gaps accurate?

### Artifacts Created:
- `phase-2/authentication.json`
- `phase-2/authorization.json`
- `phase-2/input-validation.json`
- `phase-2/control-gaps.json`
- `phase-2/summary.md`

**Approve to proceed to Threat Modeling?** [Yes / No / Revise]
```

## Phase 3 Checkpoint

```markdown
## Phase 3 Complete: Threat Model Generated

### Top Threats Identified:

| ID | Threat | Category | Risk |
|----|--------|----------|------|
| THREAT-001 | {description} | {STRIDE} | Critical |
| THREAT-002 | {description} | {STRIDE} | High |
| THREAT-003 | {description} | {STRIDE} | High |
| THREAT-004 | {description} | {STRIDE} | Medium |
| THREAT-005 | {description} | {STRIDE} | Medium |

### Abuse Cases Documented:
1. **{Abuse Case 1}** - {threat actor} exploits {vulnerability}
2. **{Abuse Case 2}** - {threat actor} exploits {vulnerability}
3. **{Abuse Case 3}** - {threat actor} exploits {vulnerability}

### Risk Distribution:
- Critical: {n} threats
- High: {n} threats
- Medium: {n} threats
- Low: {n} threats

### Questions for You:
- Do these threats align with your concerns?
- Any threat scenarios I missed?
- Should any threats be prioritized higher/lower?

### Artifacts Created:
- `phase-3/threat-model.json`
- `phase-3/abuse-cases/*.json`
- `phase-3/risk-matrix.json`
- `phase-3/summary.md`

**Approve to proceed to Test Planning?** [Yes / No / Revise]
```

## Phase 4 Checkpoint (Final)

```markdown
## Phase 4 Complete: Security Test Plan Generated

### Recommended Testing:

| Priority | Code Review | SAST Focus | Manual Tests |
|----------|-------------|------------|--------------|
| Critical | {n} files | {n} rules | {n} cases |
| High | {n} files | {n} rules | {n} cases |
| Medium | {n} files | {n} rules | {n} cases |

### Test Plan Summary:

**Code Review Priority Files:**
1. `{file1}` - {reason} ({estimated time})
2. `{file2}` - {reason} ({estimated time})
3. `{file3}` - {reason} ({estimated time})

**SAST Recommendations:**
- Focus on: {categories}
- Suggested tools: {tools}

**Manual Test Cases:**
- {n} critical test cases
- {n} high priority test cases
- Total estimated effort: {hours} hours

### Deliverables Ready:
- [ ] Markdown report
- [ ] JSON structured data
- [ ] SARIF for IDE integration

### Questions for You:
- Does the test prioritization look correct?
- Any additional test scenarios to include?
- Ready to generate final report?

**Approve to generate final report?** [Yes / No / Revise]
```

## Handling User Responses

### If "Yes" (Approved)
- Record approval in `checkpoints/phase-{n}-checkpoint.json`
- Create handoff file
- Proceed to next phase

### If "No" (Rejected)
- Ask: "What concerns do you have?"
- Address specific issues
- Re-present checkpoint

### If "Revise"
- Ask: "What should be revised?"
- Go back to relevant step
- Re-run analysis with feedback
- Re-present checkpoint

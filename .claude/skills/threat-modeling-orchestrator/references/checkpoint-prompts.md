# Checkpoint Prompts

**Templates for human approval gates between phases.**

## Purpose

Human checkpoints:
- Validate understanding before proceeding
- Catch errors early before compounding
- Allow user to provide additional context
- Enable scope refinement based on findings

## Phase 1 Checkpoint (Business Context Discovery)

```markdown
## Phase 1 Complete: Business Context Discovery

### What I Found:
- **Application**: {One-line business purpose}
- **Crown Jewels**: {Top 3-5 most sensitive assets}
- **Threat Actors**: {Relevant attacker profiles}
- **Business Impact**: {Quantified breach/downtime consequences}
- **Compliance**: {Applicable regulations}

### Key Insights:
- {Business-specific finding that shapes approach}
- {Compliance requirement determining controls}
- {Threat actor profile guiding threats}

### Questions for You:
- Is this business understanding correct?
- Any sensitive data I missed?
- Any threat actors I should consider?
- Any compliance requirements I overlooked?
- Does the business impact seem reasonable?

### Artifacts Created:
- `phase-1/business-objectives.json` - App purpose, users, value
- `phase-1/data-classification.json` - Crown jewels, PII/PHI/PCI
- `phase-1/threat-actors.json` - Who attacks, motivations, capabilities
- `phase-1/business-impact.json` - Financial, operational, regulatory consequences
- `phase-1/compliance-requirements.json` - Applicable regulations
- `phase-1/security-objectives.json` - Protection priorities, CIA, RTO/RPO
- `phase-1/summary.md` - <2000 token handoff

**Approve to proceed to Phase 2: Codebase Sizing?** [Yes / No / Revise]

If approved, Phase 2 will automatically assess codebase size to configure Phase 3.
```

## Phase 3 Checkpoint

```markdown
## Phase 3 Complete: Codebase Understanding

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
- Any sensitive areas I should prioritize in Phase 4?

### Artifacts Created:
- `phase-3/manifest.json` - File inventory
- `phase-3/entry-points.json` - Attack surface
- `phase-3/data-flows.json` - Data movement
- `phase-3/trust-boundaries.json` - Security boundaries
- `phase-3/summary.md` - Compressed overview

**Approve to proceed to Security Controls Mapping?** [Yes / No / Revise]
```

## Phase 4 Batch Checkpoints

Phase 4 executes in severity-ordered batches. Present this checkpoint after EACH batch completes.

### Batch Checkpoint Template

```markdown
## Phase 4 Batch Complete: {SEVERITY} Severity Concerns

### Batch {N} of 4: {SEVERITY}

**Concerns Investigated:** {count}
**Controls Found:** {count} across {categories_touched} categories
**Gaps Identified:** {count}

### This Batch's Findings:

| Concern | Status | Controls Found | Gaps |
|---------|--------|----------------|------|
| {concern-001}: {name} | ✅ Complete | {n} | {n} |
| {concern-002}: {name} | ✅ Complete | {n} | {n} |
| {concern-003}: {name} | ⚠️ Partial | {n} | {n} |

### Key Findings This Batch:
1. **{Finding 1}** - {brief description}
2. **{Finding 2}** - {brief description}

### Cumulative Progress:

| Severity | Concerns | Status |
|----------|----------|--------|
| CRITICAL | {n} | {✅ Complete / 🔄 This batch / ⏳ Pending} |
| HIGH | {n} | {✅ Complete / 🔄 This batch / ⏳ Pending} |
| MEDIUM | {n} | {✅ Complete / 🔄 This batch / ⏳ Pending} |
| LOW | {n} | {✅ Complete / 🔄 This batch / ⏳ Pending} |

### Questions for You:
- Are these {SEVERITY} findings accurate?
- Any concerns I should re-investigate?
- Should I continue to {NEXT_SEVERITY} concerns?

**Choose one:**
- **[Yes]** → Proceed to {NEXT_SEVERITY} batch
- **[Revise]** → Re-investigate specific concerns (tell me which)
- **[Skip Remaining]** → Stop here, consolidate findings from completed batches
```

### Batch-Specific Guidance

**After CRITICAL batch:**
- Emphasize these are highest-risk concerns
- User should carefully validate before proceeding
- Option to skip remaining is discouraged

**After HIGH batch:**
- Note cumulative coverage with CRITICAL
- Mention time estimate for remaining batches

**After MEDIUM batch:**
- Note diminishing returns on remaining LOW concerns
- Offer skip option more prominently

**After LOW batch:**
- This is the final batch
- Transition to consolidation phase
- Replace options with: '[Yes] → Proceed to consolidation'

### Skip Remaining Behavior

If user selects 'Skip Remaining':
1. Record which batches were completed
2. Note skipped severity levels in checkpoint JSON
3. Proceed directly to consolidation with partial results
4. Include 'partial_execution' flag in phase-4 outputs

## Phase 4 Final Checkpoint (Post-Consolidation)

**Note:** This checkpoint is presented AFTER all batches complete and results are consolidated. For batch-level checkpoints, see above.

```markdown
## Phase 4 Complete: Security Controls Mapped

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
- `phase-4/authentication.json`
- `phase-4/authorization.json`
- `phase-4/input-validation.json`
- `phase-4/control-gaps.json`
- `phase-4/summary.md`

**Approve to proceed to Threat Modeling?** [Yes / No / Revise]
```

## Phase 5 Checkpoint

```markdown
## Phase 5 Complete: Threat Model Generated

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
- `phase-5/threat-model.json`
- `phase-5/abuse-cases/*.json`
- `phase-5/risk-matrix.json`
- `phase-5/summary.md`

**Approve to proceed to Test Planning?** [Yes / No / Revise]
```

## Phase 6 Checkpoint (Final)

```markdown
## Phase 6 Complete: Security Test Plan Generated

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

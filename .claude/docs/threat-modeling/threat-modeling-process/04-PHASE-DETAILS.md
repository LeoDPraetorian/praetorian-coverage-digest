# Threat Model Process: Phase Details

**Document**: 4 of 6 - Phase 1-6 Detailed Specifications **Purpose**: Complete
specifications for each phase of the threat modeling workflow **Last
Synchronized**: 2026-01-10 **Status**: Ready for Implementation

---

## Document Metadata

| Property           | Value                                |
| ------------------ | ------------------------------------ |
| **Document ID**    | 04-PHASE-DETAILS                     |
| **Token Count**    | ~3,400 tokens                        |
| **Read Time**      | 20-30 minutes                        |
| **Prerequisites**  | 01-03 (Overview, Scope, Methodology) |
| **Next Documents** | 05-STATE-OUTPUT                      |

---

## Related Documents

This document is part of the Threat Model Process documentation series:

- **[01-OVERVIEW-ARCHITECTURE.md](01-OVERVIEW-ARCHITECTURE.md)** - Overview and
  architecture diagram
- **[02-SCOPE-CHECKPOINTS.md](02-SCOPE-CHECKPOINTS.md)** - Scope selection and
  checkpoints
- **[03-METHODOLOGY.md](03-METHODOLOGY.md)** - STRIDE + PASTA + DFD methodology
- **[05-STATE-OUTPUT.md](05-STATE-OUTPUT.md)** - State management and output
  formats
- **[06-IMPLEMENTATION-ROADMAP.md](06-IMPLEMENTATION-ROADMAP.md)** -
  Implementation, tools, and roadmap

---

## Entry and Exit Criteria

### Entry Criteria

- Understanding of architecture, checkpoints, and methodology
- Knowledge of STRIDE/PASTA/DFD frameworks

### Exit Criteria

After reading this document, you should understand:

- Phase 1: Business Context Discovery workflow and outputs
- Phase 2: Codebase Sizing strategy (automatic parallelization)
- Phase 3: Codebase Mapping strategy and outputs
- Phase 4: Security Controls Mapping approach
- Phase 5: Threat Modeling & Abuse Cases generation (CVSS 4.0)
- Phase 6: Security Test Planning structure

---

## Phase Details

### Phase 1: Business Context Discovery (Foundation)

**Goal**: Understand WHAT you're protecting and WHY before analyzing HOW it's
built

**Why This Phase is Mandatory**:

Phase 1 implements PASTA Stage 1 ("Define Objectives") - you cannot perform
risk-based threat modeling without business context:

- **Risk = Likelihood × Impact** - Can't assess impact without knowing business
  consequences
- **Crown jewels drive focus** - Without knowing what's most valuable, you
  analyze everything equally (wasted effort)
- **Threat actors vary by industry** - Healthcare faces ransomware, fintech
  faces card thieves, SaaS faces supply chain attacks
- **Compliance shapes requirements** - PCI-DSS Level 1 vs Level 4 = completely
  different control requirements
- **Business impact enables prioritization** - $365M breach vs $50K breach =
  different urgency

**Without Phase 1**: Technical analysis produces accurate findings with unknown
business relevance (security theater) **With Phase 1**: Technical analysis
focuses on protecting what matters most (risk management)

**Outputs**:

```
.claude/.output/threat-modeling/{timestamp}-{slug}/phase-1/
├── business-objectives.json     # What app does, who uses it, business value
├── data-classification.json     # Crown jewels, PII/PHI/PCI, sensitivity levels
├── threat-actors.json           # Who would attack, motivations, capabilities
├── business-impact.json         # Financial, operational, reputational, regulatory consequences
├── compliance-requirements.json # SOC2, PCI-DSS, HIPAA, GDPR, contractual obligations
├── security-objectives.json     # Protection priorities, CIA rankings, risk appetite, RTO/RPO
└── summary.md                   # <2000 token compressed summary for handoff
```

**Workflow (Interactive - Requires User Input)**:

1. **Business Purpose Interview** (20-30 min)
   - What does application do? Who uses it? What business value?
   - Uses structured questions from `business-context-discovery` skill

2. **Data Classification** (20-30 min)
   - PII? PHI? Payment cards? Credentials? Proprietary data?
   - Identify crown jewels (top 3-5 most sensitive assets)

3. **Threat Actor Profiling** (15-20 min)
   - Who would attack this? Why? What capabilities?
   - Industry-specific threat actors (healthcare ransomware, fintech card
     thieves)

4. **Business Impact Assessment** (20-30 min)
   - Financial cost of breach? Downtime cost?
   - Regulatory penalties? Reputational damage?
   - Uses FAIR framework principles

5. **Compliance Mapping** (15-20 min)
   - SOC2? PCI-DSS? HIPAA? GDPR? CCPA?
   - Contractual security requirements?
   - Audit schedules and timelines

6. **Security Objectives** (10-15 min)
   - What are we protecting? CIA priority? Risk appetite?
   - RTO/RPO requirements?

**Total Time**: 90 minutes to 3 hours (depending on organizational complexity)

**How This Drives Subsequent Phases**:

| Phase                           | Uses Business Context For                                                                                                            | Example                                                                                                                  |
| ------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------ |
| **Phase 2** (Codebase Sizing)   | **Prioritize**: Components handling crown jewels sized first<br>**Strategy**: Business criticality guides parallelization            | If crown jewels = "payment_card_data", ensure payment components get dedicated agent                                     |
| **Phase 3** (Codebase Mapping)  | **Focus**: Prioritize components handling crown jewels<br>**Scope**: Map entry points by business criticality                        | If crown jewels = "payment_card_data", focus on payment processor components, not marketing email handlers               |
| **Phase 4** (Security Controls) | **Evaluate**: Check for compliance-required controls<br>**Validate**: Encryption for sensitive data types                            | If compliance = PCI-DSS Level 1, validate Requirement 3 (protect stored card data), Requirement 4 (encrypt transmission) |
| **Phase 5** (Threat Modeling)   | **Apply**: Relevant threat actor profiles<br>**Score**: Use CVSS 4.0 Environmental scores<br>**Prioritize**: Threats to crown jewels | If threat actors = ransomware groups, focus on ransomware tactics. CVSS Environmental score incorporates Phase 1 context |
| **Phase 6** (Test Planning)     | **Prioritize**: Tests by CVSS Environmental score<br>**Include**: Compliance validation tests<br>**Focus**: Crown jewel protection   | Tests for payment data protection = Critical priority (CVSS 9.0+). Tests for marketing features = Lower priority         |

**Checkpoint Template**:

```markdown
## Phase 1 Complete: Business Context Discovery

### What I Found:

- **Application**: {One-line business purpose}
- **Crown Jewels**: {Top 3-5 most sensitive assets}
- **Threat Actors**: {Relevant attacker profiles}
- **Business Impact**: {Quantified breach/downtime consequences}
- **Compliance**: {Applicable regulations and requirements}

### Key Insights:

- [Business-specific finding that shapes threat modeling approach]
- [Compliance requirement that determines required controls]
- [Threat actor profile that guides relevant threats]

### Questions for You:

- Is this business understanding correct?
- Any sensitive data types I missed?
- Any threat actors I should add?
- Any compliance requirements I overlooked?
- Does the business impact assessment seem reasonable?

**Approve to proceed to Phase 2: Codebase Sizing?** [Yes/No/Revise]

If approved, Phase 2 will analyze: {Codebase size and configure Phase 3 parallelization}
```

**Scope-Specific Behavior**:

| Scope Type             | Phase 1 Approach                                                                |
| ---------------------- | ------------------------------------------------------------------------------- |
| **Full Application**   | Complete business context discovery (90 min - 3 hours)                          |
| **Specific Component** | Focused discovery for that component only (45 min - 90 min)                     |
| **Incremental**        | Validate previous Phase 1 + identify business context changes (30 min - 60 min) |

**Critical Rule**: Phase 1 CANNOT be skipped. Orchestrator enforces execution
before Phase 2.

---

### Phase 2: Codebase Sizing (Automatic)

**Goal**: Assess codebase size to configure Phase 3 parallelization strategy

**Why This Phase Exists**:

Phase 2 determines HOW MANY agents to spawn for Phase 3 based on:

- Total file count and component distribution
- Security-relevant file concentration
- Component boundaries for parallelization

**This phase has NO human checkpoint** - it's automatic and deterministic.

**Outputs**:

```
.claude/.output/threat-modeling/{timestamp}-{slug}/phase-2/
├── sizing-report.json      # File counts, components, parallelization strategy
└── component-analysis.json # Optional: per-component breakdown
```

**Strategy Matrix**:

| Total Files  | Tier   | Parallelization      | Analysis Depth |
| ------------ | ------ | -------------------- | -------------- |
| < 1,000      | small  | Single agent         | Full           |
| 1,000-10,000 | medium | Per-component agents | Full           |
| > 10,000     | large  | Per-component agents | Sampling       |

**Workflow**:

1. Count total files in scope
2. Identify component boundaries by directory heuristics
3. Count security-relevant files (auth, crypto, handlers)
4. Generate sizing-report.json with parallelization recommendation
5. Auto-progress to Phase 3 (no checkpoint)

---

### Phase 3: Codebase Mapping

**Goal**: Build comprehensive understanding of HOW the application is built
(informed by Phase 1 WHAT/WHY, parallelized by Phase 2 sizing)

**Outputs**:

```
.claude/.output/threat-modeling/{timestamp}-{slug}/phase-3/
├── manifest.json           # File inventory with sizes
├── architecture.md         # High-level architecture summary
├── components/             # Per-component analysis (PRIORITIZED by Phase 1 crown jewels)
│   ├── frontend.json
│   ├── backend.json
│   ├── database.json
│   └── infrastructure.json
├── data-flows.json         # How data moves through system (DFD basis, FOCUSED on crown jewel flows)
├── entry-points.json       # APIs, UI, CLI, webhooks (attack surface, RANKED by business criticality)
├── trust-boundaries.json   # Where trust changes (DFD basis)
├── dependencies.json       # External deps + versions
└── summary.md              # <2000 token compressed summary
```

**Phase 1 Inputs Used**:

- Loads: `phase-1/summary.md`, `phase-1/data-classification.json` (crown jewels)
- Impact: Focus mapping on components handling crown jewels, prioritize entry
  points by business criticality
- Example: If Phase 1 identifies "payment card data" as crown jewel:
  - 60% effort: Components handling crown jewels (payment processor, tokenization)
  - 30% effort: External interfaces and auth boundaries (APIs, webhooks)
  - 10% effort: Supporting infrastructure (email, analytics, logging)

**Phase 2 Inputs Used**:

- Loads: `phase-2/sizing-report.json`
- Impact: Determines number of parallel agents and analysis depth
- Example: If sizing = "medium" (5000 files), spawn separate agents per component

**Strategy for Large Codebases**:

1. **Directory heuristics first** (cheap) - Identify component boundaries
2. **Anchor file analysis** - package.json, go.mod, Dockerfile, etc.
3. **Sampling strategy** - Analyze representative files per component
4. **Parallel component analysis** - Spawn sub-agents per component (count from Phase 2)
5. **Consolidate + summarize** - Merge findings, compress for handoff

**Parallelization** (dynamic from Phase 2):

```
# Agent count determined by Phase 2 sizing-report.json
Task("codebase-mapper", "Analyze frontend: ./modules/chariot/ui")
Task("codebase-mapper", "Analyze backend: ./modules/chariot/backend")
Task("codebase-mapper", "Analyze CLI: ./modules/praetorian-cli")
Task("codebase-mapper", "Analyze infrastructure: ./modules/chariot-devops")
```

**Incremental Mode**: When scope is `incremental`:

1. Get changed files from git diff
2. Identify components containing changes
3. Map only affected components + their interfaces
4. Note unchanged components as "inherited from previous model"

---

### Phase 4: Security Controls Mapping

**Goal**: Identify existing security mechanisms and gaps (evaluated against
Phase 1 compliance requirements)

**Phase 1 Inputs Used**:

- Loads: `phase-1/summary.md`, `phase-1/compliance-requirements.json`
- Impact: Evaluate controls against required standards (PCI-DSS, HIPAA, SOC2),
  identify compliance gaps
- Example: If Phase 1 identifies PCI-DSS Level 1, validate all 12 requirements,
  document gaps in `control-gaps.json`

**Outputs**:

```
.claude/.output/threat-modeling/{timestamp}-{slug}/phase-4/
├── authentication.json     # Auth mechanisms (Cognito, JWT, etc.)
├── authorization.json      # RBAC, ABAC, permissions
├── input-validation.json   # Zod schemas, sanitization
├── output-encoding.json    # XSS prevention, escaping
├── cryptography.json       # Encryption, hashing, key mgmt
├── secrets-management.json # How secrets are stored/accessed
├── logging-audit.json      # Security logging (repudiation defense)
├── rate-limiting.json      # DoS protections
├── cors-csp.json           # Browser security headers
├── dependency-security.json# Dependabot, lockfiles, etc.
├── control-gaps.json       # Identified missing controls
└── summary.md              # <2000 token compressed summary
```

**Control Categories** (mapped to STRIDE):

| Category           | STRIDE Defense         | What to Look For                    |
| ------------------ | ---------------------- | ----------------------------------- |
| Authentication     | Spoofing               | Login, session, tokens, MFA         |
| Authorization      | Elevation of Privilege | RBAC, permissions, policies         |
| Input Validation   | Tampering              | Schema validation, sanitization     |
| Output Encoding    | Info Disclosure        | Escaping, CSP headers               |
| Cryptography       | Info Disclosure        | Encryption, hashing, key management |
| Secrets Management | Info Disclosure        | Env vars, vaults, rotation          |
| Audit Logging      | Repudiation            | Security events, audit trails       |
| Rate Limiting      | DoS                    | Throttling, circuit breakers        |

**Parallelization** (batched by severity):

```
# Agents spawned per security concern from Phase 1, batched by severity
# CRITICAL concerns first, then HIGH, then MEDIUM, etc.
Task("security-controls-mapper", "Investigate auth bypass concern")
Task("security-controls-mapper", "Investigate injection concern")
Task("security-controls-mapper", "Investigate XSS concern")
```

**Two-Tier Output Structure**:

Phase 4 uses a two-tier output structure to enable parallel execution:

**Tier 1: Investigation Files** (per-concern):

```
phase-4/investigations/{severity}/{concern-id}-{name}.json
# Example: phase-4/investigations/CRITICAL/c7f2a-auth-bypass-in-login.json
```

Each agent produces ONE investigation file with:

- `concern_id` - Links to Phase 1 concern
- `controls_found` - Array of controls relevant to this concern
- `control_categories` - Which of the 12 categories this concern touches
- `gaps_identified` - Control weaknesses for this specific concern

**Tier 2: Category Files** (consolidated by orchestrator):

```
phase-4/authentication.json
phase-4/authorization.json
# ... (12 category files)
```

The **orchestrator** (not individual agents) consolidates Tier 1 investigations
into Tier 2 category files. This enables:

1. Parallel agent execution (one per concern)
2. Deduplication across investigations
3. Standardized Phase 5 inputs

**Batch Checkpoints**:

Phase 4 uses severity-ordered batches with checkpoints between each batch:

```
Batch 1: CRITICAL concerns
├── Task("security-controls-mapper", "Investigate CRITICAL concern 1")
├── Task("security-controls-mapper", "Investigate CRITICAL concern 2")
└── ⏸️ CHECKPOINT: User reviews CRITICAL findings

Batch 2: HIGH concerns (only after CRITICAL approved)
├── Task("security-controls-mapper", "Investigate HIGH concern 1")
├── Task("security-controls-mapper", "Investigate HIGH concern 2")
└── ⏸️ CHECKPOINT: User reviews HIGH findings

Batch 3: MEDIUM concerns (only after HIGH approved)
...

Batch 4: LOW/INFO concerns (optional, user can skip)
```

**Checkpoint Prompt Template**:

```markdown
## Phase 4 Batch Complete: {severity} Concerns

### Investigated Concerns:

- {concern_1}: {finding_summary}
- {concern_2}: {finding_summary}

### Control Gaps Found:

- {gap_1}: {severity} - {compliance_impact}
- {gap_2}: {severity} - {compliance_impact}

### Questions:

- Are these findings accurate?
- Any additional concerns at this severity level?

**Approve to proceed to {next_severity} concerns?** [Yes/No/Revise/Skip remaining]
```

**User Options at Each Batch Checkpoint**:

- **Yes**: Proceed to next severity batch
- **No/Revise**: Provide feedback for re-investigation
- **Skip remaining**: Jump directly to consolidation (for time constraints)

---

### Phase 5: Threat Modeling & Abuse Cases

**Goal**: Identify threats and abuse cases based on business risk (driven by
Phase 1 context, scored with CVSS 4.0)

**Inputs** (loaded from state):

- **Phase 1**: summary.md + threat-actors.json + business-impact.json +
  data-classification.json (crown jewels)
- **Phase 3**: summary.md + architecture.md + data-flows.json +
  trust-boundaries.json
- **Phase 4**: summary.md + all control files + control-gaps.json

**Phase 1 Inputs Used**:

- Loads: All Phase 1 files (threat actors, business impact, crown jewels,
  compliance)
- Impact: Apply relevant threat actor profiles, use CVSS Environmental scores
  incorporating business context, prioritize threats to crown jewels
- Example: If Phase 1 identifies ransomware groups + $28.5M breach impact,
  STRIDE analysis focuses on ransomware tactics (encryption, exfiltration) and
  CVSS Environmental scores reflect actual financial context

**Outputs**:

```
.claude/.output/threat-modeling/{timestamp}-{slug}/phase-5/
├── threat-model.json       # Structured threat entries with CVSS 4.0 scores
├── abuse-cases/            # Per-category abuse scenarios
│   ├── authentication-abuse.json
│   ├── authorization-abuse.json
│   ├── data-abuse.json
│   └── api-abuse.json
├── attack-trees/           # Attack path diagrams (PASTA Stage 6)
│   ├── credential-theft.md
│   ├── data-exfiltration.md
│   └── privilege-escalation.md
├── dfd-threats.json        # Threats mapped to data flow elements
├── risk-matrix.json        # CVSS severity band distribution
└── summary.md              # <2000 token summary with top CVSS-scored risks
```

**Risk Scoring** (CVSS 4.0):

```
CVSS 4.0 replaces legacy Impact × Likelihood matrix

CVSS Score Components:
  Base Score (0.0-10.0)        - Intrinsic technical severity
  Threat Score (0.0-10.0)      - Exploit maturity factor
  Environmental Score (0.0-10.0) - Business context from Phase 1

Environmental Score Inputs (from Phase 1):
  CR (Confidentiality Req): H/M/L based on crown jewel sensitivity
  IR (Integrity Req): H/M/L based on data modification impact
  AR (Availability Req): H/M/L based on business continuity needs

Severity Bands (CVSS 4.0):
  Critical (9.0-10.0): Immediate action required
  High (7.0-8.9):      Address in current sprint
  Medium (4.0-6.9):    Plan for remediation
  Low (0.1-3.9):       Accept or defer
  None (0.0):          Informational only

Use Environmental Score (not Base) for prioritization.
```

**Abuse Case Template**:

```typescript
interface AbuseCase {
  id: string;
  name: string;
  threatActor: string; // Who would do this?
  motivation: string; // Why would they do it?

  // Attack description
  scenario: string; // Narrative description
  preconditions: string[]; // What must be true?
  attackSteps: string[]; // Step-by-step attack

  // Impact
  assetsAtRisk: string[];
  businessImpact: string;

  // Mapping
  relatedThreats: string[]; // Threat IDs from threat-model.json
  relatedControls: string[]; // Existing controls
  controlGaps: string[]; // Missing controls

  // Testing
  testCases: string[]; // How to test for this
}
```

**This phase is sequential** - needs holistic view to identify cross-component
threats.

---

### Phase 6: Security Test Planning (MVP Output)

**Goal**: Generate prioritized, actionable test plan (prioritized by CVSS
Environmental scores from Phase 5)

**Inputs**:

- **Phase 1**: business-impact.json + compliance-requirements.json +
  data-classification.json (crown jewels)
- **Phase 5**: threat-model.json (with CVSS scores) + abuse-cases/ + risk-matrix.json
- **Phase 3**: entry-points.json + components/
- **Phase 4**: control-gaps.json

**Phase 1 + Phase 5 Inputs Used**:

- Loads: Phase 1 business context + Phase 5 CVSS-scored threats
- Impact: Prioritize tests by CVSS Environmental score, include compliance
  validation, focus on crown jewel protection
- Example: If Phase 5 shows CVSS 9.3 (Critical) card theft threat + PCI-DSS Level 1,
  prioritize card data protection tests as P0 (immediate) and include PCI-DSS
  requirement validation

**Outputs**:

```
.claude/.output/threat-modeling/{timestamp}-{slug}/phase-6/
├── code-review-plan.json   # Prioritized files for manual review
├── sast-recommendations.json  # Static analysis focus areas
├── dast-recommendations.json  # Dynamic testing targets
├── sca-recommendations.json   # Dependency review focus
├── manual-test-cases.json     # Threat-driven test scenarios
├── test-priorities.json       # Ranked by CVSS Environmental score
└── summary.md                 # Execution roadmap
```

**Test Plan Structure**:

```typescript
interface SecurityTestPlan {
  // Code review targets
  codeReview: {
    critical: CodeReviewTarget[]; // Must review
    high: CodeReviewTarget[]; // Should review
    medium: CodeReviewTarget[]; // Review if time permits
  };

  // SAST recommendations (not execution)
  sastRecommendations: {
    toolSuggestions: string[]; // e.g., "semgrep", "codeql"
    focusAreas: string[]; // What rules to prioritize
    customRuleIdeas: string[]; // Custom patterns to look for
  };

  // DAST recommendations (not execution)
  dastRecommendations: {
    endpoints: string[]; // Priority endpoints to test
    testScenarios: string[]; // What to test
    toolSuggestions: string[]; // e.g., "nuclei", "burp"
  };

  // Manual test cases (threat-driven)
  manualTestCases: TestCase[];
}

interface CodeReviewTarget {
  file: string;
  lines?: string; // e.g., "100-150"
  focusAreas: string[]; // What to look for
  relatedThreats: string[]; // Why this file
  estimatedTime: string; // e.g., "30 minutes"
}

interface TestCase {
  id: string;
  name: string;
  relatedThreat: string;
  relatedAbuseCase: string;

  // Test details
  objective: string;
  preconditions: string[];
  steps: string[];
  expectedResults: string[];

  // Metadata
  priority: "Critical" | "High" | "Medium" | "Low";
  estimatedTime: string;
  skillRequired: string;
}
```

---

**End of Document 4 of 6**

**Continue to**: [05-STATE-OUTPUT.md](05-STATE-OUTPUT.md) for state management
and output format specifications

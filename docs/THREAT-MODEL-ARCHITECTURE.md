# Threat Model Architecture

A multi-phase, multi-agent workflow for performing comprehensive threat modeling against large codebases.

**Status**: MVP Enhanced - Phase 0 Added (Phases 0-4 implemented and validated)
**Created**: December 2024
**Last Updated**: 2024-12-18
**Components**: 9/15 complete (Phase 0 added, integration updates pending)

---

## Overview

The `/threat-model {prompt}` command orchestrates a multi-phase security analysis workflow that produces actionable threat intelligence and security testing guidance.

### MVP Scope (v1.0 + Phase 0 Enhancement)

The MVP delivers four core outputs:

1. **Business Context** (Phase 0 - NEW) - WHAT you're protecting and WHY (crown jewels, threat actors, business impact, compliance requirements)
2. **Application Understanding** (Phase 1) - HOW it's built (architecture, components, data flows)
3. **Threat Intelligence** (Phases 2-3) - Contextualized threats and abuse scenarios driven by business risk
4. **Security Test Plan** (Phase 4) - Risk-prioritized testing guided by business impact

### Key Design Decisions

| Decision                      | Choice                          | Rationale                                                                               |
| ----------------------------- | ------------------------------- | --------------------------------------------------------------------------------------- |
| **Business Context First**    | Mandatory Phase 0               | Cannot assess risk without understanding WHAT you're protecting and WHY - PASTA Stage 1 |
| **Scope Selection**           | Interactive prompt              | User must explicitly choose full app vs specific component                              |
| **Incremental Support**       | Yes (MVP)                       | Support delta analysis on changed files                                                 |
| **Methodologies**             | STRIDE + PASTA + DFD principles | Proven frameworks, applied as principles not tools                                      |
| **Risk-Based Prioritization** | Phase 0 drives all phases       | Crown jewels, threat actors, and business impact guide technical analysis               |
| **Test Execution**            | Future enhancement              | MVP focuses on planning, execution is v2.0                                              |
| **Output Formats**            | Markdown, JSON, SARIF           | All three supported                                                                     |
| **Token Budget**              | Future enhancement              | No artificial limits in MVP                                                             |
| **Human-in-the-Loop**         | Required                        | Checkpoints between all phases (including Phase 0)                                      |
| **CI/CD Integration**         | Future enhancement              | Focus on interactive use first                                                          |

### Key Constraints

- **Large codebases** exceed single agent context window
- **State persistence** required between phases for handoff
- **Parallelization** needed for performance on large repos
- **Progressive summarization** to compress findings for downstream phases
- **Human approval** required at each phase transition

---

## Architecture Diagram

### Architecture

```
┌────────────────────────────────────────────────────────────────────────────┐
│                         /threat-model {prompt}                             │
│                              Command Router                                │
└────────────────────────────────┬───────────────────────────────────────────┘
                                 │ skill: "threat-modeling-orchestrator"
                                 ▼
┌────────────────────────────────────────────────────────────────────────────┐
│                         SCOPE SELECTION                                    │
│                    (Interactive User Prompt)                               │
│                                                                            │
│  "What would you like to threat model?"                                    │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │ ○ Entire application                                                │   │
│  │ ○ Specific component(s): [________________________________]         │   │
│  │ ○ Changed files only (incremental): [git ref or file list]          │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
└────────────────────────────────┬───────────────────────────────────────────┘
                                 │
                                 ▼
┌────────────────────────────────────────────────────────────────────────────-┐
│                    threat-modeling-orchestrator                             │
│                         (Core Skill - ~400 lines)                           │
│  • Creates session directory                                                │
│  • Enforces Phase 0 BEFORE Phase 1 (mandatory)                              │
│  • Manages phase transitions with business context handoff                  │
│  • Coordinates parallel work                                                │
│  • Enforces human checkpoints                                               │
│  • Consolidates final report                                                │
└────────────────────────────────┬──────────────────────────────────────--────┘
                                 │
                                 ▼
┌────────────────────────────────────────────────────────────────────────────┐
│                    Phase 0: Business Context Discovery (NEW)               │
│                         (Interactive, Sequential)                          │
│                                                                            │
│  Outputs (drive ALL subsequent phases):                                    │
│  ├── business-objectives.json     # App purpose, users, value              │
│  ├── data-classification.json     # Crown jewels, sensitive data           │
│  ├── threat-actors.json           # Who attacks, motivations, capabilities │
│  ├── business-impact.json         # Financial, operational, regulatory     │
│  ├── compliance-requirements.json # SOC2, PCI-DSS, HIPAA, GDPR            │
│  ├── security-objectives.json     # Protection priorities, risk tolerance  │
│  └── summary.md                   # <2000 tokens for quick loading         │
│                                                                            │
│  ⏸️ CHECKPOINT: Validate business understanding before technical analysis  │
└────────────────────────────────┬───────────────────────────────────────────┘
                                 │ Business context feeds into all phases
                                 │
        ┌────────────────────────┼────────────────────────┐
        │                        │                        │
        ▼                        ▼                        ▼
┌──────────────┐    ┌──────────────────┐    ┌──────────────────┐
│   Phase 1    │    │     Phase 2      │    │     Phase 3      │
│   Codebase   │───▶│ Security Controls│───▶│  Threat Model    │
│   Mapping    │    │    Mapping       │    │   & Abuse Cases  │
│ (Context-    │    │ (Compliance-     │    │ (Risk-Scored     │
│  Driven)     │    │  Aware)          │    │  by Impact)      │
└──────────────┘    └──────────────────┘    └──────────────────┘
        │                        │                        │
        │ Parallel               │ Parallel               │ Sequential
        │ sub-agents             │ sub-agents             │ (needs full context)
        │ (load Phase 0          │ (check compliance      │ (apply threat actors,
        │  crown jewels)         │  requirements)         │  score by impact)
        │                        │                        │
        │ ⏸️ CHECKPOINT          │ ⏸️ CHECKPOINT           │ ⏸️ CHECKPOINT
        │ User approval          │ User approval          │ User approval
        ▼                        ▼                        ▼
┌──────────────────────────────────────────────────────────────┐
│                         Phase 4                              │
│              Security Test Planning                          │
│  • Prioritized by business risk scores (from Phase 0)        │
│  • Compliance validation tests (from Phase 0 requirements)   │
│  • Focused on crown jewel protection (from Phase 0)          │
└──────────────────────────────┬───────────────────────────────┘
                               │
                               │ ⏸️ FINAL CHECKPOINT
                               │ User approval
                               ▼
                    ┌──────────────────┐
                    │   Final Report   │
                    │ (MD + JSON +     │
                    │     SARIF)       │
                    │ w/ Business      │
                    │ Impact Context   │
                    └──────────────────┘

                    ═══════════════════
                    Phase 5 (Future)
                    Test Execution
                    ═══════════════════
```

---

## Scope Selection Flow

The orchestrator MUST prompt the user to select scope before any analysis begins.

### Scope Options

```typescript
interface ScopeSelection {
  type: "full" | "component" | "incremental";

  // For 'full' - analyze entire repository
  full?: {
    excludePaths?: string[]; // Optional exclusions
  };

  // For 'component' - analyze specific parts
  component?: {
    paths: string[]; // e.g., ['./modules/chariot/ui', './modules/chariot/backend']
    includeSharedDeps: boolean; // Include shared libraries?
  };

  // For 'incremental' - analyze changes only
  incremental?: {
    baseRef: string; // e.g., 'main', 'HEAD~10', 'abc123'
    compareRef?: string; // Default: HEAD
    includeTouchedFiles: boolean; // Include files that import changed files?
  };
}
```

### User Prompt Flow

```markdown
## Scope Selection

Before we begin, I need to understand what you'd like to threat model.

**Please select one:**

1. **Entire Application** - Analyze the complete codebase
   - Best for: Initial threat models, comprehensive security review
   - Time estimate: Depends on codebase size

2. **Specific Component(s)** - Focus on particular modules or features
   - Best for: Feature-specific review, targeted analysis
   - Please specify paths (e.g., `./modules/chariot/backend`)

3. **Incremental (Changed Files)** - Analyze only what's changed
   - Best for: PR review, continuous threat modeling
   - Please specify base reference (e.g., `main`, `HEAD~5`)

**Your selection:** [User responds]

**Additional context** (optional):

- Any specific concerns or threat categories to focus on?
- Known sensitive areas to prioritize?
- Previous threat model to build upon?
```

---

## Human-in-the-Loop Checkpoints

Human approval is **required** (not optional) at each phase transition. This ensures:

- User validates understanding before proceeding
- Errors caught early before compounding
- User can provide additional context
- Scope can be refined based on findings

### Checkpoint Flow

```typescript
interface PhaseCheckpoint {
  phase: number;
  phaseName: string;
  status: "awaiting_approval" | "approved" | "rejected" | "needs_revision";

  // Summary for user review
  summary: {
    keyFindings: string[];
    questionsForUser: string[];
    proposedNextSteps: string[];
    estimatedEffort: string;
  };

  // User response
  userResponse?: {
    approved: boolean;
    feedback?: string;
    additionalContext?: string;
    scopeAdjustment?: string;
  };
}
```

### Checkpoint Prompts

**After Phase 1 (Codebase Mapping):**

```markdown
## Phase 1 Complete: Codebase Understanding

### What I Found:

- [x] components identified
- [Y] entry points (attack surface)
- [Z] data flows mapped

### Key Architecture Points:

1. [Summary point 1]
2. [Summary point 2]
3. [Summary point 3]

### Questions for You:

- Is this architecture understanding correct?
- Any components I missed or misunderstood?
- Any sensitive areas I should prioritize?

**Approve to proceed to Security Controls Mapping?** [Yes/No/Revise]
```

**After Phase 2 (Security Controls):**

```markdown
## Phase 2 Complete: Security Controls Mapped

### Controls Identified:

- Authentication: [summary]
- Authorization: [summary]
- Input validation: [summary]
- [etc.]

### Gaps Noted:

1. [Gap 1]
2. [Gap 2]

### Questions for You:

- Are there security controls I missed?
- Any custom security mechanisms to consider?
- Are the identified gaps accurate?

**Approve to proceed to Threat Modeling?** [Yes/No/Revise]
```

**After Phase 3 (Threat Model):**

```markdown
## Phase 3 Complete: Threat Model Generated

### Top Threats Identified:

1. [Threat 1] - Risk: Critical
2. [Threat 2] - Risk: High
3. [Threat 3] - Risk: High
   [...]

### Abuse Cases:

1. [Abuse case 1]
2. [Abuse case 2]
   [...]

### Questions for You:

- Do these threats align with your concerns?
- Any threat scenarios I missed?
- Should any threats be prioritized higher/lower?

**Approve to proceed to Test Planning?** [Yes/No/Revise]
```

**After Phase 4 (Test Plan):**

```markdown
## Phase 4 Complete: Security Test Plan Generated

### Recommended Testing:

- [x] files for priority code review
- [Y] SAST rules to apply
- [Z] manual test cases

### Test Plan Summary:

[Brief overview]

### Deliverables Ready:

- [ ] Markdown report
- [ ] JSON structured data
- [ ] SARIF for IDE integration

**Approve to generate final report?** [Yes/No/Revise]
```

---

## Threat Modeling Methodology

### Integrated Framework Approach

The threat modeling phase combines principles from three proven methodologies:

#### 1. STRIDE (Microsoft)

Systematic threat categorization per component:

| Category                   | Question                   | Focus                            |
| -------------------------- | -------------------------- | -------------------------------- |
| **S**poofing               | Can attacker impersonate?  | Identity, authentication         |
| **T**ampering              | Can attacker modify?       | Data integrity, input validation |
| **R**epudiation            | Can attacker deny actions? | Logging, audit trails            |
| **I**nfo Disclosure        | Can attacker access data?  | Authorization, encryption        |
| **D**enial of Service      | Can attacker disrupt?      | Availability, rate limiting      |
| **E**levation of Privilege | Can attacker escalate?     | Authorization, least privilege   |

#### 2. PASTA (Process for Attack Simulation and Threat Analysis)

Risk-centric, business-aligned approach:

| Stage                                  | Principle Applied                                     |
| -------------------------------------- | ----------------------------------------------------- |
| **Stage 1**: Define Objectives         | Understand business context and security requirements |
| **Stage 2**: Define Technical Scope    | Map application architecture and dependencies         |
| **Stage 3**: Application Decomposition | Identify components, data flows, trust boundaries     |
| **Stage 4**: Threat Analysis           | Identify threat actors and attack patterns            |
| **Stage 5**: Vulnerability Analysis    | Map weaknesses to threats                             |
| **Stage 6**: Attack Modeling           | Model attack trees and scenarios                      |
| **Stage 7**: Risk/Impact Analysis      | Prioritize by business impact                         |

#### 3. DFD-Based Threat Modeling (Microsoft SDL)

Data Flow Diagram principles for visualizing threats:

| Element               | Security Consideration                    |
| --------------------- | ----------------------------------------- |
| **External Entities** | Untrusted inputs, authentication required |
| **Processes**         | Validate inputs, handle errors securely   |
| **Data Stores**       | Encryption at rest, access controls       |
| **Data Flows**        | Encryption in transit, trust boundaries   |
| **Trust Boundaries**  | Where security controls must exist        |

### Combined Threat Model Output

```typescript
interface ThreatModelEntry {
  // Identification
  id: string;
  component: string;

  // STRIDE categorization
  strideCategory:
    | "Spoofing"
    | "Tampering"
    | "Repudiation"
    | "InfoDisclosure"
    | "DoS"
    | "ElevationOfPrivilege";

  // Threat details
  threat: string;
  threatActor: string; // From PASTA
  attackVector: string;
  attackTree?: string[]; // Attack path from PASTA Stage 6

  // DFD context
  affectedDataFlows: string[];
  trustBoundariesCrossed: string[];

  // Controls assessment
  existingControls: string[];
  controlGaps: string[];

  // Risk scoring (PASTA Stage 7)
  businessImpact: "Critical" | "High" | "Medium" | "Low";
  likelihood: "High" | "Medium" | "Low";
  riskScore: number;

  // Remediation
  recommendedControls: string[];
  testingGuidance: string[];
}
```

---

## Phase Details

### Phase 0: Business Context Discovery (NEW - Foundation)

**Goal**: Understand WHAT you're protecting and WHY before analyzing HOW it's built

**Why This Phase is Mandatory**:

Phase 0 implements PASTA Stage 1 ("Define Objectives") - you cannot perform risk-based threat modeling without business context:

- **Risk = Likelihood × Impact** - Can't assess impact without knowing business consequences
- **Crown jewels drive focus** - Without knowing what's most valuable, you analyze everything equally (wasted effort)
- **Threat actors vary by industry** - Healthcare faces ransomware, fintech faces card thieves, SaaS faces supply chain attacks
- **Compliance shapes requirements** - PCI-DSS Level 1 vs Level 4 = completely different control requirements
- **Business impact enables prioritization** - $365M breach vs $50K breach = different urgency

**Without Phase 0**: Technical analysis produces accurate findings with unknown business relevance (security theater)
**With Phase 0**: Technical analysis focuses on protecting what matters most (risk management)

**Outputs**:

```
.claude/.threat-model/{session}/phase-0/
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
   - Industry-specific threat actors (healthcare → ransomware, fintech → card thieves)

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

| Phase                           | Uses Business Context For                                                                                                          | Example                                                                                                                         |
| ------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| **Phase 1** (Codebase Mapping)  | **Focus**: Prioritize components handling crown jewels<br>**Scope**: Map entry points by business criticality                      | If crown jewels = "payment_card_data", focus on payment processor components, not marketing email handlers                      |
| **Phase 2** (Security Controls) | **Evaluate**: Check for compliance-required controls<br>**Validate**: Encryption for sensitive data types                          | If compliance = PCI-DSS Level 1, validate Requirement 3 (protect stored card data), Requirement 4 (encrypt transmission)        |
| **Phase 3** (Threat Modeling)   | **Apply**: Relevant threat actor profiles<br>**Score**: Use actual business impact data<br>**Prioritize**: Threats to crown jewels | If threat actors = ransomware groups, focus on ransomware tactics. If impact = $365M, use in risk score calculation             |
| **Phase 4** (Test Planning)     | **Prioritize**: Tests by business risk score<br>**Include**: Compliance validation tests<br>**Focus**: Crown jewel protection      | Tests for payment data protection = Critical priority (crown jewel + compliance). Tests for marketing features = Lower priority |

**Checkpoint Template**:

```markdown
## Phase 0 Complete: Business Context Discovery

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

**Approve to proceed to Phase 1: Codebase Mapping?** [Yes/No/Revise]

If approved, Phase 1 will focus on: {Specific components based on crown jewels}
```

**Scope-Specific Behavior**:

| Scope Type             | Phase 0 Approach                                                                |
| ---------------------- | ------------------------------------------------------------------------------- |
| **Full Application**   | Complete business context discovery (90 min - 3 hours)                          |
| **Specific Component** | Focused discovery for that component only (45 min - 90 min)                     |
| **Incremental**        | Validate previous Phase 0 + identify business context changes (30 min - 60 min) |

**Critical Rule**: Phase 0 CANNOT be skipped. Orchestrator enforces execution before Phase 1.

---

### Phase 1: Codebase Mapping

**Goal**: Build comprehensive understanding of HOW the application is built (informed by Phase 0 WHAT/WHY)

**Outputs**:

```
.claude/.threat-model/{session}/phase-1/
├── manifest.json           # File inventory with sizes
├── architecture.md         # High-level architecture summary
├── components/             # Per-component analysis (PRIORITIZED by Phase 0 crown jewels)
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

**Phase 0 Inputs Used**:

- Loads: `phase-0/summary.md`, `phase-0/data-classification.json` (crown jewels)
- Impact: Focus mapping on components handling crown jewels, prioritize entry points by business criticality
- Example: If Phase 0 identifies "payment card data" as crown jewel, spend 60% of mapping time on payment flows, 40% on rest

**Strategy for Large Codebases**:

1. **Directory heuristics first** (cheap) - Identify component boundaries
2. **Anchor file analysis** - package.json, go.mod, Dockerfile, etc.
3. **Sampling strategy** - Analyze representative files per component
4. **Parallel component analysis** - Spawn sub-agents per component
5. **Consolidate + summarize** - Merge findings, compress for handoff

**Parallelization**:

```
Task("codebase-mapper", "Analyze frontend: ./modules/chariot/ui")
Task("codebase-mapper", "Analyze backend: ./modules/chariot/backend")
Task("codebase-mapper", "Analyze CLI: ./modules/praetorian-cli")
Task("codebase-mapper", "Analyze infrastructure: ./modules/chariot-devops")
```

**Incremental Mode**:
When scope is `incremental`:

1. Get changed files from git diff
2. Identify components containing changes
3. Map only affected components + their interfaces
4. Note unchanged components as "inherited from previous model"

---

### Phase 2: Security Controls Mapping

**Goal**: Identify existing security mechanisms and gaps (evaluated against Phase 0 compliance requirements)

**Phase 0 Inputs Used**:

- Loads: `phase-0/summary.md`, `phase-0/compliance-requirements.json`
- Impact: Evaluate controls against required standards (PCI-DSS, HIPAA, SOC2), identify compliance gaps
- Example: If Phase 0 identifies PCI-DSS Level 1, validate all 12 requirements, document gaps in `control-gaps.json`

**Outputs**:

```
.claude/.threat-model/{session}/phase-2/
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

**Parallelization**:

```
Task("security-controls-mapper", "Map authentication controls")
Task("security-controls-mapper", "Map authorization controls")
Task("security-controls-mapper", "Map input validation")
Task("security-controls-mapper", "Map cryptography usage")
Task("security-controls-mapper", "Map audit logging")
```

---

### Phase 3: Threat Modeling & Abuse Cases

**Goal**: Identify threats and abuse cases based on business risk (driven by Phase 0 context)

**Inputs** (loaded from state):

- **Phase 0**: summary.md + threat-actors.json + business-impact.json + data-classification.json (crown jewels)
- **Phase 1**: summary.md + architecture.md + data-flows.json + trust-boundaries.json
- **Phase 2**: summary.md + all control files + control-gaps.json

**Phase 0 Inputs Used**:

- Loads: All Phase 0 files (threat actors, business impact, crown jewels, compliance)
- Impact: Apply relevant threat actor profiles, use actual business impact data for risk scoring, prioritize threats to crown jewels
- Example: If Phase 0 identifies ransomware groups + $28.5M breach impact, STRIDE analysis focuses on ransomware tactics (encryption, exfiltration) and scores risks using actual financial data

**Outputs**:

```
.claude/.threat-model/{session}/phase-3/
├── threat-model.json       # Structured threat entries (see schema above)
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
├── risk-matrix.json        # Impact × Likelihood scoring
└── summary.md              # <2000 token summary with top risks
```

**Risk Scoring** (PASTA-aligned):

```
Risk Score = Business Impact × Likelihood

Business Impact (from PASTA Stage 7):
  Critical (4) - Business-ending, regulatory violation, mass data breach
  High (3)     - Significant revenue loss, major data exposure
  Medium (2)   - Limited impact, contained incident
  Low (1)      - Minimal business impact

Likelihood:
  High (3)   - Easily exploitable, public knowledge, script-kiddie level
  Medium (2) - Requires skill or insider knowledge
  Low (1)    - Difficult, requires significant resources

Risk Matrix:
  Critical (9-12): Immediate action required
  High (6-8):      Address in current sprint
  Medium (3-5):    Plan for remediation
  Low (1-2):       Accept or defer
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

**This phase is sequential** - needs holistic view to identify cross-component threats.

---

### Phase 4: Security Test Planning (MVP Output)

**Goal**: Generate prioritized, actionable test plan (prioritized by Phase 0 business risk)

**Inputs**:

- **Phase 0**: business-impact.json + compliance-requirements.json + data-classification.json (crown jewels)
- **Phase 3**: threat-model.json + abuse-cases/ + risk-matrix.json
- **Phase 1**: entry-points.json + components/
- **Phase 2**: control-gaps.json

**Phase 0 Inputs Used**:

- Loads: business-impact.json (for test prioritization), compliance-requirements.json (for compliance tests), crown jewels (for focus)
- Impact: Prioritize tests by business risk score, include compliance validation, focus on crown jewel protection
- Example: If Phase 0 shows $365M card breach impact + PCI-DSS Level 1, prioritize card data protection tests as CRITICAL and include PCI-DSS requirement validation

**Outputs**:

```
.claude/.threat-model/{session}/phase-4/
├── code-review-plan.json   # Prioritized files for manual review
├── sast-recommendations.json  # Static analysis focus areas
├── dast-recommendations.json  # Dynamic testing targets
├── sca-recommendations.json   # Dependency review focus
├── manual-test-cases.json     # Threat-driven test scenarios
├── test-priorities.json       # Ranked by risk score
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

## Output Formats

All phases support three output formats:

### 1. Markdown (Human-Readable)

Primary format for reports and documentation.

```markdown
# Threat Model Report: Chariot Platform

## Executive Summary

...

## Architecture Overview

...

## Threat Analysis

...

## Security Test Plan

...
```

### 2. JSON (Machine-Readable)

Structured data for automation and tooling.

```json
{
  "sessionId": "tm-20241217-abc123",
  "scope": { "type": "full" },
  "threats": [...],
  "abuseCases": [...],
  "testPlan": {...}
}
```

### 3. SARIF (IDE Integration)

Static Analysis Results Interchange Format for IDE integration.

```json
{
  "$schema": "https://raw.githubusercontent.com/oasis-tcs/sarif-spec/master/Schemata/sarif-schema-2.1.0.json",
  "version": "2.1.0",
  "runs": [
    {
      "tool": {
        "driver": {
          "name": "threat-model",
          "version": "1.0.0"
        }
      },
      "results": [
        {
          "ruleId": "THREAT-001",
          "level": "error",
          "message": { "text": "SQL Injection risk in user input handler" },
          "locations": [
            {
              "physicalLocation": {
                "artifactLocation": { "uri": "src/handlers/user.ts" },
                "region": { "startLine": 42 }
              }
            }
          ]
        }
      ]
    }
  ]
}
```

---

## State Management

### Session Directory Structure

```
.claude/.threat-model/
├── {session-id}/                    # Unique per run (UUID or timestamp)
│   ├── config.json                  # Session configuration
│   ├── scope.json                   # User-selected scope
│   ├── checkpoints/                 # Human approval records
│   │   ├── phase-1-checkpoint.json
│   │   ├── phase-2-checkpoint.json
│   │   ├── phase-3-checkpoint.json
│   │   └── phase-4-checkpoint.json
│   ├── phase-1/                     # Codebase mapping outputs
│   ├── phase-2/                     # Security controls outputs
│   ├── phase-3/                     # Threat model outputs
│   ├── phase-4/                     # Test plan outputs
│   ├── final-report/                # Consolidated output (MD + JSON + SARIF)
│   └── handoffs/                    # Phase transition records
│       ├── phase-1-to-2.json
│       ├── phase-2-to-3.json
│       └── phase-3-to-4.json
└── sessions.json                    # Session index for resume
```

### Session Configuration

```typescript
interface SessionConfig {
  sessionId: string;
  created: string;

  // User-selected scope
  scope: ScopeSelection;

  // Options
  options: {
    outputFormats: ("markdown" | "json" | "sarif")[]; // All three by default
    previousSession?: string; // For incremental, reference previous model
  };

  // Status tracking
  status: {
    currentPhase: number;
    completedPhases: number[];
    checkpointsPassed: number[];
    errors: string[];
  };
}
```

### Handoff Schema

```typescript
interface PhaseHandoff {
  sessionId: string;
  fromPhase: number;
  toPhase: number;
  timestamp: string;

  // Human checkpoint
  checkpoint: PhaseCheckpoint;

  // Compressed for next agent's context (<2000 tokens)
  summary: {
    keyFindings: string[];
    criticalRisks: string[];
    decisions: string[];
    assumptions: string[];
    userFeedback: string[]; // From checkpoint
  };

  // Full data via file references
  artifacts: {
    name: string;
    path: string;
    description: string;
    loadWhen: "always" | "on-demand" | "reference-only";
  }[];

  // Metrics
  metrics: {
    filesAnalyzed: number;
    componentsIdentified: number;
    threatsIdentified: number;
    controlsFound: number;
    tokensUsed: number;
    timeSpent: number;
  };

  nextPhaseGuidance: string;
}
```

---

## Implementation Architecture

### Recommended: Hybrid Approach

```
/threat-model {prompt}
└── skill: "threat-modeling-orchestrator"     # Core skill manages flow
    │
    ├── SCOPE SELECTION (AskUserQuestion)
    │   └── User selects: full | component | incremental
    │
    ├── Phase 1: PARALLEL agents for mapping
    │   └── Task("codebase-mapper", component)
    │   └── ⏸️ CHECKPOINT (user approval required)
    │
    ├── Phase 2: PARALLEL agents for controls
    │   └── Task("security-controls-mapper", category)
    │   └── ⏸️ CHECKPOINT (user approval required)
    │
    ├── Phase 3: SEQUENTIAL skill application
    │   └── Orchestrator reads threat-modeling skill
    │   └── ⏸️ CHECKPOINT (user approval required)
    │
    ├── Phase 4: SEQUENTIAL skill application
    │   └── Orchestrator reads test-planning skill
    │   └── ⏸️ CHECKPOINT (user approval required)
    │
    └── FINAL REPORT GENERATION
        └── Output: Markdown + JSON + SARIF
```

### File Organization

```
.claude/
├── commands/
│   └── threat-model.md                      # Router: skill: "threat-modeling-orchestrator"
│
├── skills/
│   └── threat-modeling-orchestrator/        # Core skill (~400 lines)
│       ├── SKILL.md
│       ├── references/
│       │   ├── phase-workflows.md
│       │   ├── state-schema.md
│       │   ├── handoff-protocol.md
│       │   ├── checkpoint-prompts.md
│       │   └── methodology-guide.md         # STRIDE + PASTA + DFD
│       └── templates/
│           ├── session-config.json
│           ├── handoff-template.json
│           ├── checkpoint-template.json
│           └── final-report.md
│
├── skill-library/
│   └── security/
│       ├── codebase-mapping/                # Phase 1 methodology
│       │   └── SKILL.md
│       ├── security-controls-mapping/       # Phase 2 methodology
│       │   └── SKILL.md
│       ├── threat-modeling/                 # Phase 3 methodology
│       │   ├── SKILL.md
│       │   └── references/
│       │       ├── stride-framework.md
│       │       ├── pasta-principles.md
│       │       ├── dfd-analysis.md
│       │       ├── abuse-case-patterns.md
│       │       └── risk-scoring.md
│       └── security-test-planning/          # Phase 4 methodology
│           └── SKILL.md
│
└── agents/
    └── security/                            # Lean agents for parallel work
        ├── codebase-mapper.md               # ~200 lines
        └── security-controls-mapper.md      # ~200 lines
```

---

## Tool Requirements (MVP)

### Required Tools for Agents

| Agent                          | Tools Needed                                                    |
| ------------------------------ | --------------------------------------------------------------- |
| `threat-modeling-orchestrator` | Read, Write, Bash, Task, TodoWrite, Glob, Grep, AskUserQuestion |
| `codebase-mapper`              | Read, Glob, Grep, Write                                         |
| `security-controls-mapper`     | Read, Glob, Grep, Write                                         |

---

## Implementation Roadmap

### MVP (v1.0) - Phase 0 Enhancement Added

**Status**: 10/15 components complete (Phase 0 integration started 2024-12-18, orchestrator updated)

**MVP Components (Phases 0-4)**:

- [x] Create `codebase-mapping` skill ✅
  - Location: `.claude/skill-library/security/codebase-mapping/`
  - 396 lines with 3 reference files
  - TDD validated: RED-GREEN-REFACTOR complete
  - Pressure tested: Resists time/expertise/overhead rationalizations
  - Gateway integrated: Added to gateway-security

- [x] Create `codebase-mapper` agent ✅ (Phases 1-6 complete, 7-10 pending)
  - Location: `.claude/agents/analysis/codebase-mapper.md`
  - 193 lines (well under 300 limit for analysis type)
  - Type: analysis, Permission: plan, Model: opus
  - Tools: Bash, Glob, Grep, Read, TodoWrite, Write
  - Skills: gateway-security (routes to codebase-mapping)
  - EXTREMELY_IMPORTANT block with anti-rationalization
  - TDD Phases 1-6 complete:
    - ✅ Phase 1 (RED): Gap documented
    - ✅ Phase 2: Name validation passed
    - ✅ Phase 3: Type selection (analysis)
    - ✅ Phase 4: Configuration complete
    - ✅ Phase 5: File generated (193 lines)
    - ✅ Phase 6: All 7 sections populated
    - ✅ Phase 7 (GREEN): Spawn agent, verify skill invocation
    - ✅ Phase 8: Skill verification (process + behavioral)
    - ✅ Phase 9: Compliance audit
    - ✅ Phase 10 (REFACTOR): Pressure testing

- [x] Create `threat-modeling-orchestrator` skill ✅
  - Location: `.claude/skills/threat-modeling-orchestrator/`
  - 435 lines (core skill, process/pattern type) - Updated 2024-12-18
  - Tools: Read, Write, Edit, Bash, Grep, Glob, TodoWrite, Task, AskUserQuestion
  - TDD Phases 1-9 complete
  - Features:
    - ✅ Scope selection flow (full/component/incremental)
    - ✅ Human checkpoint templates for all 5 phases (0-4)
    - ✅ Handoff protocol with state persistence + Phase 0 summary
    - ✅ Parallel agent coordination patterns
    - ✅ Session directory management (includes phase-0/)
    - ✅ Final report generation (MD + JSON + SARIF) with business context
    - ✅ **Phase 0 integration** - Invokes business-context-discovery before Phase 1
    - ✅ **Phase 0 enforcement** - 6 explicit "No exceptions" anti-rationalization rules
  - Reference files: 7 detailed workflow and schema docs
  - Audit: PASSED (0 critical, 4 INFO)
  - Pressure testing: 3/3 tests passed (2024-12-17), 3/3 Phase 0 bypass tests passed (2024-12-18)

- [x] Create `/threat-model` command ✅
  - Location: `.claude/commands/threat-model.md`
  - 26 lines (Router Pattern)
  - Tools: `Skill, AskUserQuestion`
  - Skills: `threat-modeling-orchestrator`
  - Audit: 8/8 checks passed (2024-12-17)

- [x] Create `security-controls-mapping` skill ✅
  - Location: `.claude/skill-library/security/security-controls-mapping/`
  - 468 lines with 3 reference files (output-schemas, detection-patterns, stride-mapping)
  - TDD validated: RED-GREEN-REFACTOR complete
  - Pressure tested: 3/3 tests (1 required counters, all pass after hardening)
  - Gateway integrated: Added to gateway-security
  - Phase 2 methodology: Maps 10 control categories to STRIDE threats

**Pending - Core Infrastructure**:

- [x] Complete `threat-modeling-orchestrator` pressure testing (Phase 9) - 3/3 tests passed (2024-12-17)
- [x] Create `/threat-model` command router - 26 lines, Router Pattern, audit passed (2024-12-17)

**Completed - Phase Skills**:

- [x] Create `security-controls-mapping` skill (Phase 2) ✅ Complete (2024-12-17)
- [x] Create `threat-modeling` skill (Phase 3 - STRIDE + PASTA + DFD) ✅ Complete (2024-12-17)
- [x] Create `security-test-planning` skill (Phase 4) ✅ Complete (2024-12-17)
  - Location: `.claude/skill-library/security/security-test-planning/`
  - 284 lines (safe zone, under 500 limit)
  - Type: Process/Pattern (Phase 4 methodology)
  - Produces: 7 required output files with exact schemas
  - TDD validated: RED (0/7 files) → GREEN (7/7 files) → REFACTOR (3/3 tests pass after hardening)
  - Pressure testing required 4 iterations to bulletproof against "client service" rationalization
  - Gateway integrated: gateway-security

**Completed - Agents**:

- [x] Create `security-controls-mapper` agent (Phase 2) ✅
  - Location: `.claude/agents/analysis/security-controls-mapper.md`
  - 200 lines (well under 300 limit for analysis type)
  - Type: analysis, Permission: plan, Model: opus
  - Tools: Bash, Glob, Grep, Read, TodoWrite, Write
  - Skills: gateway-security (routes to security-controls-mapping)
  - EXTREMELY_IMPORTANT block with 5 anti-rationalization rules
  - TDD Phases 1-10 complete:
    - ✅ Phase 1 (RED): Gap documented (Phase 2 executor missing)
    - ✅ Phase 2: Name validation passed
    - ✅ Phase 3: Type selection (analysis)
    - ✅ Phase 4: Configuration complete (629 chars description)
    - ✅ Phase 5: File generated (200 lines)
    - ✅ Phase 6: All 7 sections + EXTREMELY_IMPORTANT populated
    - ✅ Phase 7 (GREEN): Agent spawned, explicit skill invocation verified
    - ✅ Phase 8: Skill verification (process + behavioral compliance)
    - ✅ Phase 9: Compliance audit (11 checks passed)
    - ✅ Phase 10 (REFACTOR): Pressure testing (3/3 tests passed)

- [x] Create `business-context-discovery` skill (Component 9/15) ✅ Complete (2024-12-18)
  - Location: `.claude/skill-library/security/business-context-discovery/`
  - 331 lines (safe zone, under 500 limit)
  - Type: Process/Pattern (Phase 0 methodology - PASTA Stage 1)
  - Produces: 6 required output files (business-objectives.json, data-classification.json, threat-actors.json, business-impact.json, compliance-requirements.json, security-objectives.json)
  - TDD validated: RED (threat modeling lacked business context) → GREEN (structured discovery workflow) → REFACTOR (3/3 pressure tests PASSED on first iteration)
  - Pressure tests: Time+Authority+Emergency (PASS), Expertise+Pragmatic+Efficiency (PASS), Previous Work+Deadline+Stakeholder (PASS)
  - Gateway integrated: Added to gateway-security as Phase 0
  - Reference files: 4 comprehensive guides (interview-questions, data-classification, threat-actor-profiles, impact-assessment, compliance-mapping)
  - Examples: 2 industry-specific (healthcare-app, fintech-platform)
  - Audit: PASSED (0 critical, 2 warnings)
  - **Status**: Skill complete, integration updates to Phases 1-4 pending

**Phase 0 Integration - Next Steps**:

- [x] Update `threat-modeling-orchestrator` to invoke Phase 0 before Phase 1 ✅ Complete (2024-12-18)
  - Added Step 1.5: Phase 0 - Business Context Discovery
  - Added Phase 0 checkpoint template
  - Added "No exceptions" enforcement (6 anti-rationalization rules)
  - Updated handoff protocol with Phase 0 summary
  - Updated session directory structure (phase-0/)
  - Pressure tested: 3/3 bypass scenarios countered
- [ ] Update `codebase-mapping` skill to load and use Phase 0 crown jewels for prioritization
- [ ] Update `security-controls-mapping` skill to evaluate against Phase 0 compliance requirements
- [ ] Update `threat-modeling` skill to use Phase 0 threat actor profiles and business impact data for risk scoring
- [ ] Update `security-test-planning` skill to prioritize tests by Phase 0 business risk scores
- [ ] End-to-end test on Chariot codebase with full Phase 0-4 workflow
- [ ] Validate incremental threat modeling (delta business context discovery)
- [ ] Verify output formats include business context (MD + JSON + SARIF)

---

## Future Enhancements

### Phase 5: Automated Test Execution (v2.0)

Execute the security test plan with automated tools:

```
Phase 5: Security Test Execution
├── SAST execution (semgrep, codeql)
├── SCA execution (trivy, npm audit)
├── Secret scanning (gitleaks)
├── Finding consolidation
├── False positive analysis
└── Remediation prioritization
```

**Tools to integrate**:
| Tool | Type | Purpose |
|------|------|---------|
| semgrep | SAST | Pattern-based static analysis |
| trivy | SCA | Dependency vulnerabilities |
| gitleaks | Secrets | Hardcoded secrets detection |
| nuclei | DAST | API security testing |
| codeql | SAST | Semantic code analysis |

### CI/CD Integration (v2.0)

- PR-based threat model delta analysis
- GitHub Actions / GitLab CI integration
- Automated threat model updates on code changes
- Blocking PRs on critical threat introduction
- Integration with security dashboards

### Token/Time Budget Management (v2.0)

- Configurable time limits per phase
- Auto-checkpoint at token thresholds
- Smart sampling for very large codebases
- Progress estimation and ETA

### External Tool Integration (v2.0)

- Import from OWASP Threat Dragon
- Import from Microsoft Threat Modeling Tool
- Export to security ticketing systems (Jira, Linear)
- Integration with vulnerability management platforms

### Advanced Threat Intelligence (v2.0)

- CVE correlation for dependencies
- Known attack pattern matching
- Industry-specific threat libraries
- Compliance mapping (SOC2, PCI-DSS, etc.)

---

## References

### Internal

- `docs/SKILLS-ARCHITECTURE.md` - Skill design patterns
- `docs/AGENT-ARCHITECTURE.md` - Lean agent pattern
- `docs/CLAUDE-ARCHITECTURE-OPEN-QUESTIONS.md` - Cross-agent handoff patterns

### Methodologies

- [OWASP Threat Modeling](https://owasp.org/www-community/Threat_Modeling)
- [Microsoft STRIDE](https://docs.microsoft.com/en-us/azure/security/develop/threat-modeling-tool-threats)
- [PASTA Threat Modeling](https://versprite.com/blog/what-is-pasta-threat-modeling/)
- [Microsoft SDL Threat Modeling](https://www.microsoft.com/en-us/securityengineering/sdl/threatmodeling)
- [DFD-Based Threat Modeling](https://docs.microsoft.com/en-us/azure/security/develop/threat-modeling-tool-feature-overview)

### Output Formats

- [SARIF Specification](https://sarifweb.azurewebsites.net/)

---

## Changelog

| Date       | Change                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  | Author              |
| ---------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------- |
| Dec 2024   | Initial architecture design                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             | Claude (Opus 4.5)   |
| Dec 2024   | Added design decisions, MVP scope, human checkpoints, methodology integration                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           | Claude (Opus 4.5)   |
| 2024-12-17 | Created `codebase-mapping` skill (Component 1/15) - 396 lines, TDD validated, pressure tested                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           | Claude (Opus 4.5)   |
| 2024-12-17 | Created `codebase-mapper` agent (Component 2/15) - 193 lines, TDD complete with pressure testing                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        | Claude (Opus 4.5)   |
| 2024-12-17 | Created `threat-modeling-orchestrator` skill (Component 3/15) - 341 lines core skill, orchestrates 4-phase workflow with parallel agents, human checkpoints, state persistence, and structured outputs (MD+JSON+SARIF). TDD phases 1-8 complete, audit passed.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          | Claude (Sonnet 4.5) |
| 2024-12-17 | Completed `threat-modeling-orchestrator` pressure testing (Phase 9) - 3/3 tests passed: (1) Skip checkpoints under time/authority pressure, (2) Skip phases under authority/exhaustion, (3) Skip scope selection under sunk cost/pragmatic pressure. Skill is bulletproof.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              | Claude (Opus 4.5)   |
| 2024-12-17 | Created `/threat-model` command (Component 4/15) - 26 lines, Router Pattern, delegates to `threat-modeling-orchestrator` skill. 8/8 audit checks passed. Entry point now available for threat modeling workflow.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        | Claude (Opus 4.5)   |
| 2024-12-17 | Created `security-controls-mapping` skill (Component 5/15) - 468 lines Phase 2 methodology skill, maps 10 control categories to STRIDE threats with detection patterns. TDD complete: RED (7 ad-hoc files) → GREEN (12 required files) → REFACTOR (3/3 pressure tests, added EXTREMELY_IMPORTANT block with 8 counter-rationalizations). Gateway integrated. Audit PASSED.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              | Claude (Sonnet 4.5) |
| 2024-12-17 | Completed `security-controls-mapper` agent (Component 6/15) - 200 lines Phase 2 executor agent. TDD Phases 1-10 complete: RED (gap documented), Validation (name valid), Type (analysis), Config (629 chars), Generation (200 lines), Content (all 7 sections + EXTREMELY_IMPORTANT), GREEN (explicit skill invocation verified), Skill Verification (process + behavioral compliance), Compliance Audit (11 checks passed), REFACTOR (3/3 pressure tests passed). Agent now production-ready for threat modeling orchestration.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        | Claude (Opus 4.5)   |
| 2024-12-17 | Created `threat-modeling` skill (Component 7/15) - 401 lines Phase 3 methodology skill combining STRIDE + PASTA + DFD frameworks. Produces 11+ structured output files (threat-model.json, abuse-cases/, attack-trees/, dfd-threats.json, risk-matrix.json, summary.md) for Phase 4 consumption. Risk scoring: Impact (1-4) × Likelihood (1-3) = 1-12. TDD complete: RED (generic threats, no schema) → GREEN (systematic STRIDE, all outputs) → REFACTOR (3/3 pressure tests PASSED on first iteration - no hardening needed). Audit PASSED (0 critical, 0 warnings). Gateway integrated. Skill is bulletproof.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        | Claude (Sonnet 4.5) |
| 2024-12-17 | Created `security-test-planning` skill (Component 8/15) - 284 lines Phase 4 methodology skill converting threat models into actionable test plans. Produces 7 required output files (code-review-plan.json, sast/dast/sca-recommendations.json, manual-test-cases.json, test-priorities.json, summary.md). TDD complete: RED (0/7 files correct with ad-hoc schema) → GREEN (7/7 files correct, 100% compliance) → REFACTOR (Test 1 FAILED 3x before hardening, Tests 2-3 PASSED). Added "Dual Deliverables Pattern" (serve VP + orchestrator), "Time Reality for AI" (30 min not 2 hrs), "Interface Contract Law", 8 counter-rationalizations. Audit PASSED (0 critical, 1 warning). Gateway integrated. Skill is bulletproof after hardening. **MVP Phases 1-4 now COMPLETE.**                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        | Claude (Opus 4.5)   |
| 2024-12-18 | **CRITICAL ENHANCEMENT**: Created `business-context-discovery` skill (Component 9/15 - Phase 0) - 331 lines implementing PASTA Stage 1. Addresses critical gap: threat modeling workflow lacked business context discovery, producing technically sound but business-blind models. Skill provides structured interview workflow for discovering business purpose, crown jewels (data classification), threat actor profiling, business impact assessment (FAIR principles), and compliance requirements (SOC2, PCI-DSS, HIPAA, GDPR) BEFORE technical analysis. Produces 6 JSON outputs + summary.md that drive prioritization in ALL subsequent phases. TDD complete: RED (gap proven) → GREEN (structured workflow) → REFACTOR (3/3 pressure tests PASSED on first iteration: Time+Authority+Emergency, Expertise+Pragmatic+Efficiency, Previous Work+Deadline+Stakeholder). Reference files: 5 comprehensive guides (interview-questions, data-classification, threat-actor-profiles, impact-assessment, compliance-mapping). Examples: 2 industry-specific (healthcare, fintech). Audit PASSED (0 critical, 2 warnings). Gateway integrated as Phase 0. **Phase 0 skill complete - integration updates to Phases 1-4 + orchestrator pending for full risk-driven threat modeling.** | Claude (Sonnet 4.5) |
| 2024-12-18 | **Phase 0 Integration - Task 1**: Updated `threat-modeling-orchestrator` skill (Component 10/15) - 341→435 lines (+94). Integrated Phase 0 into orchestration workflow: (1) Added Phase 0 to Quick Reference (now 5 phases: 0-4), (2) Inserted Step 1.5: Phase 0 invocation after scope selection, (3) Added Phase 0 enforcement rule with 6 "No exceptions" counters, (4) Updated session setup for phase-0/, (5) Updated handoff protocol with Phase 0 summary, (6) Added Phase 0 checkpoint template, (7) Updated session directory structure, (8) Added business-context-discovery to related skills. TDD complete: RED (no Phase 0 invocation) → GREEN (all changes verified) → REFACTOR (3/3 bypass scenarios countered: Time+Authority+Emergency, Expertise+Pragmatic+Sunk Cost, Deadline+Client Service+Efficiency). Audit PASSED (0 critical, 4 INFO). Line count: 435 (safe zone). **Orchestrator now enforces Phase 0 before Phase 1 - bulletproof against bypass attempts. Next: Update Phases 1-4 skills (Tasks 2-5).**                                                                                                                                                                                                                                                    | Claude (Opus 4.5)   |

# Threat Model Process: Scope Selection & Checkpoints

**Document**: 2 of 6 - Scope Selection & Human-in-the-Loop Checkpoints
**Purpose**: User interaction patterns for scope selection and phase approval
workflows **Last Synchronized**: 2026-01-10 **Status**: Ready for Implementation

---

## Document Metadata

| Property           | Value                                            |
| ------------------ | ------------------------------------------------ |
| **Document ID**    | 02-SCOPE-CHECKPOINTS                             |
| **Token Count**    | ~1,600 tokens                                    |
| **Read Time**      | 8-12 minutes                                     |
| **Prerequisites**  | 01-OVERVIEW-ARCHITECTURE                         |
| **Next Documents** | 03-METHODOLOGY, 04-PHASE-DETAILS                 |

---

## Related Documents

This document is part of the Threat Model Process documentation series:

- **[01-OVERVIEW-ARCHITECTURE.md](01-OVERVIEW-ARCHITECTURE.md)** - Overview and
  architecture diagram
- **[03-METHODOLOGY.md](03-METHODOLOGY.md)** - STRIDE + PASTA + DFD methodology
- **[04-PHASE-DETAILS.md](04-PHASE-DETAILS.md)** - Phase 1-6 detailed
  specifications
- **[05-STATE-OUTPUT.md](05-STATE-OUTPUT.md)** - State management and output
  formats
- **[06-IMPLEMENTATION-ROADMAP.md](06-IMPLEMENTATION-ROADMAP.md)** -
  Implementation, tools, and roadmap

---

## Entry and Exit Criteria

### Entry Criteria

- Understanding of overall architecture from Document 1
- Knowledge of the 6-phase workflow (Phase 1-6)

### Exit Criteria

After reading this document, you should understand:

- How scope selection works (full/component/incremental)
- How methodology & CVSS version selection works
- The checkpoint flow and approval process
- Checkpoint prompt templates for each phase

---

## Scope Selection Flow

The orchestrator MUST prompt the user to select scope before any analysis
begins.

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

## Methodology & CVSS Selection

After scope selection, the orchestrator prompts the user for methodology and
scoring preferences.

### Methodology Options

```typescript
interface MethodologySelection {
  approach: "hybrid" | "stride-only" | "pasta-only" | "custom";
  cvssVersion: "4.0" | "3.1";

  // Custom allows selecting specific techniques
  custom?: {
    useDFD: boolean;        // Data Flow Diagrams
    useSTRIDE: boolean;     // STRIDE threat categories
    usePASTA: boolean;      // PASTA attack simulation
    useAttackTrees: boolean; // Attack tree generation
  };
}
```

### User Prompt Flow

```markdown
## Methodology Selection

**Which threat modeling approach would you like to use?**

1. **Hybrid (Recommended)** - Combines STRIDE + PASTA + DFD
   - Most comprehensive analysis
   - Best for: Initial threat models, compliance-critical systems

2. **STRIDE Only** - Focus on threat categories
   - Faster analysis, structured by STRIDE categories
   - Best for: Quick security review, familiar threats

3. **PASTA Only** - Process for Attack Simulation and Threat Analysis
   - Business-focused, attack simulation emphasis
   - Best for: Business-critical applications, executive reporting

4. **Custom** - Select specific techniques
   - Mix and match: DFD, STRIDE, PASTA, Attack Trees
   - Best for: Experienced threat modelers

**Your selection:** [User responds]

---

**Which CVSS version for risk scoring?**

1. **CVSS 4.0 (Recommended)** - Latest standard with improved granularity
   - Includes: Environmental scores, Threat Intelligence
   - Better business context integration with Phase 1

2. **CVSS 3.1** - Widely adopted standard
   - Mature tooling support
   - Industry standard baseline

**Your selection:** [User responds]
```

### Selection Storage

Methodology and CVSS selections are recorded in `config.json`:

```json
{
  "sessionId": "2026-01-10-091500-chariot-backend",
  "scope": { "type": "full" },
  "methodology": {
    "approach": "hybrid",
    "cvssVersion": "4.0",
    "techniques": ["DFD", "STRIDE", "PASTA", "AttackTrees"]
  }
}
```

---

## Human-in-the-Loop Checkpoints

Human approval is **required** (not optional) at each phase transition. This
ensures:

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

**After Phase 1 (Business Context Discovery):**

```markdown
## Phase 1 Complete: Business Context Discovery

### What I Found:

- Application purpose: [summary]
- Crown jewels: [list of sensitive data/assets]
- Threat actors: [relevant attacker profiles]
- Compliance requirements: [SOC2, PCI-DSS, HIPAA, GDPR as applicable]

### Business Impact Assessment:

- Data breach impact: [financial, regulatory]
- Downtime impact: [cost, SLA]
- Risk appetite: [low/medium/high]

### Questions for You:

- Is this business understanding correct?
- Any sensitive data I missed?
- Any threat actors I should consider?
- Any compliance requirements I overlooked?

**Approve to proceed to Phase 2 (Codebase Sizing)?** [Yes/No/Revise]
```

**Note: Phase 2 (Codebase Sizing) has NO checkpoint** - sizing is deterministic and auto-progresses to Phase 3.

**After Phase 3 (Codebase Mapping):**

```markdown
## Phase 3 Complete: Codebase Understanding

### What I Found:

- [X] components identified
- [Y] entry points (attack surface)
- [Z] data flows mapped

### Key Architecture Points:

1. [Summary point 1]
2. [Summary point 2]
3. [Summary point 3]

### Crown Jewel Component Focus:

- Components handling Phase 1 crown jewels: [list]

### Questions for You:

- Is this architecture understanding correct?
- Any components I missed or misunderstood?
- Any sensitive areas I should prioritize?

**Approve to proceed to Phase 4 (Security Controls Mapping)?** [Yes/No/Revise]
```

**After Phase 4 (Security Controls Mapping):**

```markdown
## Phase 4 Complete: Security Controls Mapped

### Controls Identified:

- Authentication: [summary]
- Authorization: [summary]
- Input validation: [summary]
- Cryptography: [summary]
- [etc.]

### Gaps Noted:

1. [Gap 1]
2. [Gap 2]

### Compliance Validation (from Phase 1):

- [Requirement]: [status - met/gap]

### Questions for You:

- Are there security controls I missed?
- Any custom security mechanisms to consider?
- Are the identified gaps accurate?

**Approve to proceed to Phase 5 (Threat Modeling)?** [Yes/No/Revise]
```

**After Phase 5 (Threat Modeling):**

```markdown
## Phase 5 Complete: Threat Model Generated

### Top Threats Identified (CVSS 4.0 scored):

1. [Threat 1] - CVSS: 9.3 (Critical)
2. [Threat 2] - CVSS: 8.5 (High)
3. [Threat 3] - CVSS: 7.2 (High) [...]

### Abuse Cases:

1. [Abuse case 1]
2. [Abuse case 2] [...]

### Business Context Integration:

- Threats targeting crown jewels: [count]
- Compliance violation risks: [count]

### Questions for You:

- Do these threats align with your concerns?
- Any threat scenarios I missed?
- Should any threats be prioritized higher/lower?

**Approve to proceed to Phase 6 (Test Planning)?** [Yes/No/Revise]
```

**After Phase 6 (Security Test Planning):**

```markdown
## Phase 6 Complete: Security Test Plan Generated

### Recommended Testing (CVSS-prioritized):

- [X] files for priority code review
- [Y] SAST rules to apply
- [Z] manual test cases

### Test Plan Summary:

[Brief overview - tests prioritized by CVSS Environmental score]

### Deliverables Ready:

- [ ] Markdown report
- [ ] JSON structured data (7 files)
- [ ] SARIF for IDE integration

**Approve to generate final report?** [Yes/No/Revise]
```

---

**End of Document 2 of 6**

**Continue to**: [03-METHODOLOGY.md](03-METHODOLOGY.md) for STRIDE + PASTA + DFD
threat modeling methodology

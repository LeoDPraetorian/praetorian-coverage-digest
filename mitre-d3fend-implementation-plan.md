# MITRE D3FEND Implementation Plan

**Date**: 2025-12-14
**Status**: ✅ Stakeholder Approved - Implementation Ready
**Architecture Review**: Complete (frontend-architect + frontend-reviewer)
**Research Sources**: CardinalOps, Mandiant M-Trends, Red Canary, Picus Security, MITRE D3FEND v1.0

---

## Executive Summary

This document outlines the strategic integration of MITRE D3FEND (Detection, Denial, and Disruption Framework Empowering Network Defense) alongside the existing MITRE ATT&CK visualization in Chariot. Combining both frameworks creates a complete **offensive-defensive security posture visualization** that shows:

- **Offensive Coverage (ATT&CK)**: Which attack techniques we can detect
- **Defensive Coverage (D3FEND)**: Which defensive controls we have deployed and validated
- **Coverage Gaps**: High-risk attack techniques with no corresponding defensive controls
- **Effectiveness Mapping**: Which defenses actually work when tested

**Strategic Value**: Most security platforms show either offensive OR defensive posture. Chariot will show BOTH with linkage, creating a unique "security posture completeness score" that differentiates us from competitors.

---

## 1. Understanding MITRE D3FEND

### What is D3FEND?

[MITRE D3FEND](https://d3fend.mitre.org/) is a knowledge graph of cybersecurity countermeasures developed by MITRE Corporation, funded by the National Security Agency (NSA). Released as v1.0 on January 16, 2025, it provides a structured framework of defensive techniques that complement MITRE ATT&CK's offensive focus.

**Key Characteristics**:
- **Defensive counterpart** to ATT&CK's adversary tactics
- **Knowledge graph** with semantic relationships between techniques, artifacts, and threats
- **Digital artifacts** as the linking mechanism to ATT&CK
- **~160 defensive techniques** across 22 categories
- **Vendor-neutral** taxonomy for security control standardization

### Framework Structure

D3FEND organizes defensive techniques into **6 tactical categories**:

| Tactic | Purpose | Example Techniques | Typical Presence Rate |
|--------|---------|-------------------|---------------------|
| **Model** | Security engineering analysis | Threat modeling, asset inventory, risk assessment | 40% deployed |
| **Harden** | Increase exploit cost (pre-attack) | Application hardening, credential hardening, patch management | 65% deployed |
| **Detect** | Identify intrusions in real-time | File analysis, network traffic analysis, user behavior analytics | 60% deployed |
| **Isolate** | Contain threats | Network isolation, execution isolation, segmentation | 35% deployed |
| **Deceive** | Misdirect attackers | Honeypots, decoy credentials, deception networks | 5% deployed (rarely) |
| **Evict** | Remove adversaries | Credential eviction, process termination, file deletion | 25% deployed |

**Source**: [Picus Security D3FEND Guide](https://www.picussecurity.com/resource/glossary/what-is-mitre-defend-matrix)

---

## 2. The ATT&CK ↔ D3FEND Relationship

### Digital Artifacts: The Bridge Between Offense and Defense

[Digital artifacts](https://www.exabeam.com/explainers/mitre-attck/what-is-mitre-d3fend/) are the key innovation connecting ATT&CK to D3FEND:

```
┌──────────────────┐         ┌──────────────────┐         ┌──────────────────┐
│  ATT&CK          │         │  Digital         │         │  D3FEND          │
│  Technique       │────────>│  Artifact        │<────────│  Countermeasure  │
└──────────────────┘         └──────────────────┘         └──────────────────┘
       ↓                              ↓                              ↓
  T1078 (Valid              File, Credential,              D3-CH (Credential
  Accounts)                 Process, Network               Hardening),
                            Traffic, Logon                 D3-UBA (User
                            Session                        Behavior Analysis)
```

**Critical Insight**: [D3FEND has NO direct mapping](https://medium.com/@lerikson/how-i-use-the-mitre-d3fend-matrix-to-defend-against-att-ck-s-9f98cb23df60) from ATT&CK techniques to defensive techniques. Instead, it models what **digital artifacts** each technique interacts with, creating a graph structure that relates countermeasures to offensive techniques through their artifact manipulations.

### Example Mappings

| ATT&CK Technique | Digital Artifacts Affected | D3FEND Countermeasures | Expected Effectiveness |
|------------------|---------------------------|------------------------|----------------------|
| **T1078** (Valid Accounts) | Credential, Logon Session, User Account | D3-CH (Credential Hardening), D3-UBA (User Behavior Analysis), D3-MFA (Multi-Factor Authentication) | Effective (70-80%) |
| **T1059** (Command Scripting) | Process, File, Command Line | D3-PLA (Process Lineage Analysis), D3-CLA (Command Line Analysis), D3-SEA (Script Execution Analysis) | Partially Effective (50-60%) |
| **T1070** (Indicator Removal) | File, Log, Registry Key | D3-FIM (File Integrity Monitoring), D3-LR (Log Retention), D3-LA (Log Analysis) | Partially Effective (40-50%) |
| **T1055** (Process Injection) | Process, Memory | D3-PM (Process Monitoring), D3-PSA (Process Spawn Analysis), D3-EMA (Executable Memory Analysis) | Effective (65-75%) |

**Source**: [FourCore ATT&CK + D3FEND Integration](https://fourcore.io/blogs/mitre-attack-mitre-defend-detection-engineering-threat-hunting)

---

## 3. Testing Philosophy: Two-Dimensional Validation

### Presence vs. Effectiveness

Per [security control maturity models](https://www.standardfusion.com/blog/how-control-maturity-impacts-your-information-security-compliance-and-budget), validating defensive controls requires TWO distinct dimensions:

#### Dimension 1: Presence (Test of Design)

**Question**: "Do we have this defensive control deployed?"

**Validation Methods**:
- Configuration audits
- Policy documentation review
- Tool inventory scans
- Deployment coverage percentage

**Maturity Levels**:
1. **Not Implemented** (0%) - Control absent
2. **Planned** (0%) - On roadmap but not deployed
3. **Partial** (1-79%) - Deployed to some systems
4. **Deployed** (80-99%) - Widely deployed but not validated
5. **Validated** (100%) - Presence confirmed via audit

**Example**: "We have EDR installed on 95% of endpoints" = **Deployed**

#### Dimension 2: Effectiveness (Test of Effectiveness)

**Question**: "Does this control actually work when tested?"

**Validation Methods**:
- Purple team exercises
- Breach and attack simulation (BAS)
- Red team engagements
- Security control testing

**Effectiveness Scores**:
1. **Unknown** - Never tested
2. **Ineffective** (0-30% detection) - Tested but fails
3. **Partially Effective** (30-70%) - Works sometimes
4. **Effective** (70-90%) - Reliably works
5. **Highly Effective** (90%+) - Consistently effective

**Example**: "EDR detected 85% of process injection attacks during purple team exercise" = **Effective**

**Source**: [Secure Controls Framework Maturity Model](https://securecontrolsframework.com/free/capability-maturity-model/)

---

## 4. Proposed Data Model

### D3FEND Technique Schema

```typescript
/**
 * D3FEND defensive technique with two-dimensional validation.
 */
export interface D3FENDTechnique {
  id: string;                    // e.g., "D3-PLA" (Process Lineage Analysis)
  name: string;                  // Human-readable name
  description: string;           // Technique description
  tactic: D3FENDTactic;          // Model, Harden, Detect, Isolate, Deceive, Evict

  // Dimension 1: Presence - Do we have this control?
  presence: PresenceStatus;
  coveragePercentage?: number;   // 0-100% for Partial deployments

  // Dimension 2: Effectiveness - Does it work? (only if presence >= Deployed)
  effectiveness?: EffectivenessScore;
  effectivenessRate?: number;    // 0-100% detection/block rate from testing

  // Linking to ATT&CK
  digitalArtifacts: string[];    // ["Process", "File", "Network Traffic"]
  mitigatesATTACK: string[];     // ATT&CK technique IDs this defends against

  // Testing metadata
  lastTested?: string;           // ISO date
  testingMethod?: 'Purple Team' | 'BAS' | 'Red Team' | 'Audit' | 'Pen Test';
}

/**
 * D3FEND Tactic (6 categories)
 */
export type D3FENDTactic =
  | 'Model'      // Security engineering analysis
  | 'Harden'     // Increase exploit cost
  | 'Detect'     // Identify intrusions
  | 'Isolate'    // Contain threats
  | 'Deceive'    // Misdirect attackers
  | 'Evict';     // Remove adversaries

/**
 * Control presence status
 */
export type PresenceStatus =
  | 'Not Implemented'   // We don't have this control (0% coverage)
  | 'Planned'           // On roadmap (0% coverage)
  | 'Partial'           // Deployed to some systems (1-79% coverage)
  | 'Deployed'          // Fully deployed but not tested (80-99% coverage)
  | 'Validated';        // Presence confirmed via audit (100% coverage)

/**
 * Control effectiveness score (only applicable when presence >= Deployed)
 */
export type EffectivenessScore =
  | 'Unknown'           // Not tested (default for Deployed status)
  | 'Ineffective'       // Tested, doesn't work (0-30% success rate)
  | 'Partially Effective' // Works sometimes (30-70% success rate)
  | 'Effective'         // Reliably works (70-90% success rate)
  | 'Highly Effective'; // Consistently works (90%+ success rate)

/**
 * D3FEND Tactic with techniques
 */
export interface D3FENDCategory {
  id: string;           // e.g., "TA-DETECT"
  name: string;         // "Detect"
  description: string;
  techniques: D3FENDTechnique[];
}
```

### Color Scheme for D3FEND Heatmap

```typescript
// Presence Status Colors
export const presenceColors = {
  'Not Implemented': {
    background: 'bg-slate-800',      // Dark gray - critical gap
    text: 'text-slate-400',
    stroke: '#334155', // slate-800
  },
  'Planned': {
    background: 'bg-slate-600',      // Medium gray - roadmap
    text: 'text-slate-200',
    stroke: '#475569', // slate-600
  },
  'Partial': {
    background: 'bg-blue-700',       // Dark blue - partial coverage
    text: 'text-white',
    stroke: '#1d4ed8', // blue-700
  },
  'Deployed': {
    background: 'bg-yellow-600',     // Yellow - unvalidated
    text: 'text-black',
    stroke: '#ca8a04', // yellow-600
  },
  'Validated': {
    background: 'bg-emerald-700',    // Emerald - confirmed present
    text: 'text-white',
    stroke: '#047857', // emerald-700
  },
};

// Effectiveness Score Colors (overlays on presence)
export const effectivenessColors = {
  'Unknown': {
    background: 'bg-gray-500',       // Gray - not tested
    text: 'text-white',
    stroke: '#6b7280', // gray-500
  },
  'Ineffective': {
    background: 'bg-red-600',        // Red - doesn't work
    text: 'text-white',
    stroke: '#dc2626', // red-600
  },
  'Partially Effective': {
    background: 'bg-orange-500',     // Orange - works sometimes
    text: 'text-white',
    stroke: '#f97316', // orange-500
  },
  'Effective': {
    background: 'bg-green-600',      // Green - reliably works
    text: 'text-white',
    stroke: '#16a34a', // green-600
  },
  'Highly Effective': {
    background: 'bg-emerald-500',    // Bright green - consistently works
    text: 'text-white',
    stroke: '#10b981', // emerald-500
  },
};
```

---

## 5. Realistic Baseline Data Distribution

### D3FEND Presence by Tactic (Based on Industry Research)

Research shows most organizations focus on Detection (SIEM, EDR) while neglecting Deception and Eviction capabilities.

| Tactic | Not Impl % | Planned % | Partial % | Deployed % | Validated % | Rationale |
|--------|-----------|-----------|-----------|------------|-------------|-----------|
| **Model** | 40 | 20 | 15 | 20 | 5 | Threat modeling often incomplete or outdated |
| **Harden** | 20 | 15 | 20 | 35 | 10 | Patch management common but inconsistent |
| **Detect** | 15 | 10 | 15 | 45 | 15 | Most investment here (SIEM, EDR, IDS) |
| **Isolate** | 30 | 15 | 20 | 30 | 5 | Segmentation often planned but partial |
| **Deceive** | 70 | 15 | 10 | 4 | 1 | Honeypots rarely deployed (cost/complexity) |
| **Evict** | 35 | 20 | 20 | 20 | 5 | Incident response plans exist but untested |

**Key Insights**:
- **Detect** receives most investment but only 15% validated
- **Deceive** is rare (5% total deployment) - organizations avoid deception tech
- **Evict** capabilities often documented but never exercised
- **Model** (threat modeling) is foundational but 60% absent/planned

### D3FEND Effectiveness by Tactic (For Validated Controls)

Of the techniques that ARE tested for effectiveness, here's the typical distribution:

| Tactic | Ineffective % | Partially % | Effective % | Highly Effective % | Rationale |
|--------|--------------|-------------|-------------|-------------------|-----------|
| **Harden** | 5 | 15 | 50 | 30 | Hardening is binary - either works or doesn't |
| **Detect** | 20 | 40 | 30 | 10 | Detection tuning is hard, lots of false positives/negatives |
| **Isolate** | 10 | 25 | 45 | 20 | Network segmentation effective when properly configured |
| **Deceive** | 15 | 30 | 40 | 15 | Honeypots work but require maintenance |
| **Evict** | 25 | 35 | 30 | 10 | Eviction often incomplete (remnants left behind) |

**Key Insights**:
- **Harden** techniques are most effective when present (80% effective/highly effective)
- **Detect** techniques have high "Partially Effective" (40%) due to tuning challenges
- **Evict** techniques struggle with completeness (60% ineffective/partially effective)

---

## 6. Proposed Visualization Architecture

### Layout: Three-Panel View

```
┌─────────────────────────────────────────────────────────────────────────┐
│  OFFENSIVE POSTURE (ATT&CK) - "What Attackers Can Do"                  │
├─────────────────────────────────────────────────────────────────────────┤
│  ┌────────────────────────────────────────────────────────────────────┐│
│  │ Coverage by Tactic (Line Graph)                                    ││
│  │ Lines: Tested (blue), Untested (gray), Outcomes (red/orange/etc.)  ││
│  │ Y-axis: # of techniques | X-axis: 14 ATT&CK tactics                ││
│  └────────────────────────────────────────────────────────────────────┘│
│  ┌────────────────────────────────────────────────────────────────────┐│
│  │ Technique Heatmap (Color-coded Grid)                               ││
│  │ Columns: ATT&CK tactics | Rows: Techniques                         ││
│  │ Colors: Red (undetected), Orange (logged), Green (prevented)       ││
│  └────────────────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────┐
│  DEFENSIVE POSTURE (D3FEND) - "What Defenses We Have"                  │
├─────────────────────────────────────────────────────────────────────────┤
│  ┌────────────────────────────────────────────────────────────────────┐│
│  │ Defensive Coverage by Tactic (Line Graph)                          ││
│  │ Lines: Validated (green), Deployed (yellow), Not Impl (gray)       ││
│  │ Y-axis: # of techniques | X-axis: 6 D3FEND tactics                 ││
│  └────────────────────────────────────────────────────────────────────┘│
│  ┌────────────────────────────────────────────────────────────────────┐│
│  │ Defensive Technique Heatmap (Two-Layer Color Coding)               ││
│  │ Columns: D3FEND tactics | Rows: Techniques                         ││
│  │ Color Layer 1 (Presence): Gray → Blue → Yellow → Green             ││
│  │ Color Layer 2 (Effectiveness): Red (ineffective) → Green (works)   ││
│  └────────────────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────┐
│  COVERAGE GAP ANALYSIS (Combined ATT&CK ↔ D3FEND)                       │
├─────────────────────────────────────────────────────────────────────────┤
│  ┌────────────────────────────────────────────────────────────────────┐│
│  │ Critical Gaps: ATT&CK Techniques with No D3FEND Coverage           ││
│  │ Table: ATT&CK ID | Name | Severity | Missing D3FEND Techniques     ││
│  └────────────────────────────────────────────────────────────────────┘│
│  ┌────────────────────────────────────────────────────────────────────┐│
│  │ Coverage Completeness Score                                        ││
│  │ Metric: % of ATT&CK techniques with >= 1 Validated D3FEND control  ││
│  │ Example: "47/887 ATT&CK techniques have no validated defense"      ││
│  └────────────────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────────────────┘
```

### D3FEND Heatmap: Two-Layer Color Coding

The D3FEND heatmap uses a **two-layer approach** because each technique has TWO statuses:

**Layer 1: Presence (Background Color)**
- Not Implemented: `#1e293b` (slate-800) - dark gray
- Planned: `#475569` (slate-600) - medium gray
- Partial: `#1d4ed8` (blue-700) - blue
- Deployed: `#ca8a04` (yellow-600) - yellow
- Validated: `#047857` (emerald-700) - green

**Layer 2: Effectiveness (Border/Pattern Overlay) - Only for Validated**
- Unknown: Gray border (not tested)
- Ineffective: Red diagonal stripes
- Partially Effective: Orange border
- Effective: Green border
- Highly Effective: Bright green glow

**Visual Example**:
```
┌─────────┐  ┌─────────┐  ┌─────────┐
│   D3-   │  │   D3-   │  │   D3-   │
│   PLA   │  │   FIM   │  │   UBA   │
│ Partial │  │Validated│  │Validated│
│         │  │  ///    │  │  ═══    │
│  Blue   │  │Red Slash│  │Grn Bold │
└─────────┘  └─────────┘  └─────────┘
 Partial      Validated     Validated
 Not Tested   Ineffective   Highly Eff
```

---

## 7. Architecture Decisions (Approved)

Based on consultation with frontend-architect and frontend-reviewer, the following decisions are approved:

| Decision Area | Approved Approach | Rationale |
|--------------|-------------------|-----------|
| **Tab Structure** | React Router URL paths (`/validations/overview`, `/attack`, etc.) | Shareable links, browser history, matches settings pattern |
| **Component Org** | Tier 3 Hook-Based Pattern with `hooks/`, `tabs/`, `components/` | 40-60 files expected; data correlation needs |
| **Data Loading** | Dynamic import with React 19 `use()` hook + Suspense | Prevents 1.2MB blocking load |
| **Gap Computation** | Custom hooks with `useMemo` (client-side) | Reusable, supports future real-time updates |
| **Score Formula** | Weighted by prevalence (Picus Red Report data) | More meaningful than simple percentage |
| **Component Reuse** | Generic `FrameworkHeatmap` with config | DRY but not over-abstracted |

---

## 8. Detailed Implementation Roadmap

### Phase 1: Infrastructure & Tab Structure (Days 1-2)

**Objective**: Refactor existing validations to support four-tab architecture with lazy loading

#### Day 1: Infrastructure Setup

- [ ] **Create hooks directory structure**
  - File: `modules/chariot/ui/src/sections/validations/hooks/index.ts`
  - File: `modules/chariot/ui/src/sections/validations/hooks/useAttackData.ts`
    - Implement dynamic import with React 19 `use()` hook
    - Replace static import in MitreAttackGraph.tsx
    - Cache promise at module level
  - File: `modules/chariot/ui/src/sections/validations/hooks/useD3FENDData.ts` (placeholder for Phase 2)

- [ ] **Reorganize type definitions**
  - Create: `modules/chariot/ui/src/sections/validations/types/attack.ts`
    - Move existing types from `types.ts`
  - Create: `modules/chariot/ui/src/sections/validations/types/d3fend.ts`
    - `D3FENDTechnique`, `PresenceStatus`, `EffectivenessScore`
  - Create: `modules/chariot/ui/src/sections/validations/types/gaps.ts`
    - `Gap`, `GapAnalysisSummary`, `RemediationPriority`
  - Create: `modules/chariot/ui/src/sections/validations/types/index.ts` (barrel export)

- [ ] **Create data directory**
  - Create: `modules/chariot/ui/src/sections/validations/data/` directory
  - Move: `data.json` → `data/attack-data.json`
  - Update all import paths

- [ ] **Update existing components to use hooks**
  - Update: `components/MitreAttackGraph.tsx`
    - Replace `import tactics from '../data.json'` with `const tactics = useAttackData()`
    - Add Suspense requirement comment
  - Update: `components/MitreAttackTable.tsx`
    - Same hook-based data fetching

#### Day 2: Tab Structure Implementation

- [ ] **Create tabs directory**
  - Create: `modules/chariot/ui/src/sections/validations/tabs/` directory
  - Create: `tabs/AttackCoverageTab.tsx`
    - Extract existing MitreAttackGraph + MitreAttackTable
    - Wrap in ErrorBoundary
  - Create: `tabs/OverviewTab.tsx` (placeholder with "Coming Soon")
  - Create: `tabs/DefenseCoverageTab.tsx` (placeholder)
  - Create: `tabs/GapAnalysisTab.tsx` (placeholder)

- [ ] **Refactor main index.tsx**
  - Update: `modules/chariot/ui/src/sections/validations/index.tsx`
  - Add tab state management with `useSearchParams`
  - Implement React Router URL navigation (`/validations/overview`, etc.)
  - Add `startTransition` for smooth tab switching (follow Insights pattern)
  - Lazy load all tab components with `lazy()`
  - Add Suspense boundary with `<TabLoadingSkeleton />`
  - Add ErrorBoundary for graceful failures
  - Default to Overview tab on first visit

- [ ] **Verify Phase 1**
  - Run: `npm run ts` (0 errors)
  - Run: `npm run eslint` (0 errors)
  - Test: Navigate between tabs, verify URL updates
  - Test: Refresh page, tab state persists
  - Test: Attack Coverage tab shows existing ATT&CK visualization

**Deliverables**:
- ✅ Lazy-loading infrastructure
- ✅ Four-tab structure with URL routing
- ✅ Existing ATT&CK functionality preserved in Attack Coverage tab

---

### Phase 2: D3FEND Defense Coverage Tab (Days 3-5)

**Objective**: Build D3FEND visualization mirroring ATT&CK structure

#### Day 3: D3FEND Data Foundation

- [ ] **Generate D3FEND data**
  - Create: `modules/chariot/ui/src/sections/validations/scripts/generateD3FENDData.mjs`
    - Crawl https://d3fend.mitre.org/ matrix page
    - Extract 6 tactics: Model, Harden, Detect, Isolate, Deceive, Evict
    - For each tactic, fetch techniques from tactic detail pages
    - Apply realistic presence probabilities by tactic (from research)
    - Apply realistic effectiveness probabilities (for Deployed/Validated)
    - Generate: `data/d3fend-data.json`

- [ ] **Create D3FEND color constants**
  - Create: `modules/chariot/ui/src/sections/validations/constants/d3fendColors.ts`
  - Define `presenceColors` with hex stroke values:
    - Not Implemented: `#1e293b` (slate-800) - dark gray
    - Planned: `#475569` (slate-600) - medium gray
    - Partial: `#1d4ed8` (blue-700) - blue
    - Deployed: `#ca8a04` (yellow-600) - yellow (unvalidated warning)
    - Validated: `#047857` (emerald-700) - green
  - Define `effectivenessColors` for overlay/borders:
    - Unknown: `#6b7280` (gray-500)
    - Ineffective: `#dc2626` (red-600)
    - Partially Effective: `#f97316` (orange-500)
    - Effective: `#16a34a` (green-600)
    - Highly Effective: `#10b981` (emerald-500)

- [ ] **Run data generation**
  - Execute: `node scripts/generateD3FENDData.mjs`
  - Verify: `data/d3fend-data.json` created (~200KB)
  - Verify: JSON structure matches TypeScript types

#### Day 4: D3FEND Visualization Components

- [ ] **Create generic heatmap component**
  - Create: `modules/chariot/ui/src/sections/validations/components/shared/FrameworkHeatmap.tsx`
    - Generic configuration-driven heatmap
    - Props: `tactics`, `config` (framework type, colors, status derivation)
    - Supports both ATT&CK and D3FEND via config
    - Include TacticHeader, TechniqueCell sub-components

- [ ] **Create D3FEND graph component**
  - Create: `modules/chariot/ui/src/sections/validations/components/D3FENDGraph.tsx`
    - Mirror MitreAttackGraph structure
    - Use `useD3FENDData()` hook for data loading
    - Aggregate presence counts: Not Implemented, Planned, Partial, Deployed, Validated
    - Aggregate effectiveness counts: Unknown, Ineffective, Partially Effective, Effective, Highly Effective
    - Use presenceColors and effectivenessColors
    - Pass explicit `stroke` hex values to LineChart
    - Title: "D3FEND Defensive Coverage by Tactic"
    - Subtitle: "Security control deployment and effectiveness validation"

- [ ] **Create D3FEND table component**
  - Create: `modules/chariot/ui/src/sections/validations/components/D3FENDTable.tsx`
    - Use `FrameworkHeatmap` with D3FEND config
    - Config: framework='d3fend', colorMap=presenceColors
    - `getDisplayStatus()`: Returns presence status (Not Implemented → Validated)
    - External links to https://d3fend.mitre.org/technique/[id]
    - 6 tactic columns (narrower than ATT&CK's 14)

- [ ] **Update Defense Coverage Tab**
  - Update: `tabs/DefenseCoverageTab.tsx`
    - Add D3FENDGraph component
    - Add D3FENDTable component
    - Wrap in Suspense for useD3FENDData
    - Match layout of AttackCoverageTab

#### Day 5: Testing & Refinement

- [ ] **Create unit tests for D3FEND components**
  - Create: `components/__tests__/D3FENDGraph.test.tsx`
    - Test data aggregation logic
    - Mock useD3FENDData hook
  - Create: `components/__tests__/D3FENDTable.test.tsx`
    - Test color mapping
    - Test external links

- [ ] **Visual verification**
  - Run: `npm start`
  - Navigate: /validations?tab=defense
  - Verify: 6 tactic columns displayed
  - Verify: Presence colors applied correctly
  - Verify: Graph shows realistic distribution (Detect highest, Deceive lowest)

**Deliverables**:
- ✅ D3FEND Defense Coverage tab fully functional
- ✅ Generic FrameworkHeatmap component
- ✅ Test coverage for new components

---

### Phase 3: Overview Tab with Security Posture Score (Days 6-8)

**Objective**: Build executive dashboard with completeness scoring

#### Day 6: Score Calculation Infrastructure

- [ ] **Create score calculation utility**
  - Create: `modules/chariot/ui/src/sections/validations/utils/scoreCalculation.ts`
    - Function: `calculateSecurityPostureScore(attacks, defenses, mappings, weights)`
    - Weighted formula: `Σ(weight × coverage) / Σ(weight) × 100`
    - Weight source: Picus Red Report prevalence data
  - Create: `modules/chariot/ui/src/sections/validations/data/prevalence-weights.json`
    - Top 10 techniques from Picus with weights
    - Default weight: 1.0 for unmapped techniques

- [ ] **Create gap analysis utility**
  - Create: `modules/chariot/ui/src/sections/validations/utils/gapAnalysis.ts`
    - Function: `computeGapAnalysis(attacks, defenses, mappings)`
    - Returns: `{ undefendedTechniques, ineffectiveControls }`
    - Function: `computeGapSummary(gaps)` → returns counts by priority

- [ ] **Create gap analysis hook**
  - Create: `modules/chariot/ui/src/sections/validations/hooks/useGapAnalysis.ts`
    - Use `useAttackData()`, `useD3FENDData()`, and digital artifacts mapping
    - `useMemo` for expensive computation
    - Return gaps and summary statistics

- [ ] **Create security posture score hook**
  - Create: `modules/chariot/ui/src/sections/validations/hooks/useSecurityPostureScore.ts`
    - Use gap analysis data
    - Calculate weighted completeness score
    - Return: `{ score, breakdown, trend }`

#### Day 7: Overview Tab Components

- [ ] **Create security posture score widget**
  - Create: `modules/chariot/ui/src/sections/validations/components/overview/SecurityPostureScore.tsx`
    - Circular progress indicator (0-100)
    - Large centered score number
    - Color-coded: Red (<40), Yellow (40-70), Green (70+)
    - Subtitle with interpretation

- [ ] **Create mini coverage graphs**
  - Create: `modules/chariot/ui/src/sections/validations/components/overview/MiniCoverageGraph.tsx`
    - Simplified bar chart showing ATT&CK vs D3FEND coverage percentages
    - ATT&CK: "21% techniques detected"
    - D3FEND: "45% techniques validated"
    - Side-by-side comparison

- [ ] **Create top gaps table**
  - Create: `modules/chariot/ui/src/sections/validations/components/overview/TopGapsTable.tsx`
    - Show top 5-10 critical gaps
    - Columns: ATT&CK Tactic, # Undetected, # Missing Defenses, Priority
    - Click row → navigate to Gap Analysis tab with filter

- [ ] **Create recommendations widget**
  - Create: `modules/chariot/ui/src/sections/validations/components/overview/Recommendations.tsx`
    - Auto-generated recommendations
    - Example: "Deploy D3-PLA (Process Lineage Analysis) → Covers 15 techniques"
    - Link to D3FEND technique detail

#### Day 8: Overview Tab Assembly

- [ ] **Implement Overview Tab**
  - Update: `tabs/OverviewTab.tsx`
    - Layout: 2-column grid (score left, mini-graphs right)
    - Top gaps table below
    - Recommendations at bottom
    - Use `useSecurityPostureScore()` and `useGapAnalysis()` hooks

- [ ] **Add loading states**
  - Create: `components/overview/OverviewSkeleton.tsx`
    - Skeleton UI for score widget
    - Placeholder for graphs and tables

**Deliverables**:
- ✅ Security Posture Score calculation and display
- ✅ Overview tab with executive summary
- ✅ Mini-graphs and top gaps preview

---

### Phase 4: Gap Analysis Tab (Days 9-11)

**Objective**: Build action-oriented gap analysis with drill-down capabilities

#### Day 9: Gap Analysis Components

- [ ] **Create undefended techniques table**
  - Create: `modules/chariot/ui/src/sections/validations/components/gaps/UndefendedTechniquesTable.tsx`
    - Use `@tanstack/react-table` for sorting/filtering
    - Columns:
      - ATT&CK ID (with link)
      - Technique Name
      - Tactic
      - Testing Status (Tested/Untested)
      - Outcome (if tested)
      - Missing D3FEND Count
      - Risk Score
      - Recommended Action
    - Virtual scrolling if >100 rows
    - Click row → open detail drawer

- [ ] **Create ineffective controls table**
  - Create: `modules/chariot/ui/src/sections/validations/components/gaps/IneffectiveControlsTable.tsx`
    - Show D3FEND techniques marked "Ineffective"
    - Columns: D3FEND ID, Name, Tactic, Effectiveness Rate, Protected ATT&CK Count
    - Recommendation: "Tune" or "Replace"

- [ ] **Create coverage completeness widget**
  - Create: `modules/chariot/ui/src/sections/validations/components/gaps/CoverageCompleteness.tsx`
    - Donut chart or stacked bar
    - Show: Fully Covered, Partially Covered, No Coverage
    - Percentage breakdown

#### Day 10: Gap Detail Drawer

- [ ] **Create gap detail drawer**
  - Create: `components/gaps/GapDetailDrawer.tsx`
    - Opens when user clicks gap row
    - Shows:
      - ATT&CK technique details
      - Current testing status
      - Recommended D3FEND techniques (with deployment status)
      - Action buttons: "Mark as Deployed", "Schedule Test"
    - Links to MITRE ATT&CK and D3FEND docs

- [ ] **Create ATT&CK to D3FEND mapping**
  - Create: `modules/chariot/ui/src/sections/validations/data/attack-to-d3fend-mapping.json`
    - Structure: `{ "T1059": ["D3-PLA", "D3-CLA", "D3-SEA"], ... }`
    - Source: Extract from D3FEND website or API
    - Use in gap computation

#### Day 11: Gap Analysis Tab Assembly

- [ ] **Implement Gap Analysis Tab**
  - Update: `tabs/GapAnalysisTab.tsx`
    - Use `useGapAnalysis()` hook
    - Layout: Summary stats at top, tables below
    - Add filters: Priority, Tactic, Testing Status
    - Add export functionality (CSV/JSON)

- [ ] **Add interactive features**
  - Implement click-to-filter: Click "Defense Evasion" in summary → filters table
  - Implement drawer open/close with URL state
  - Add bulk actions: "Mark selected as priority", "Export to JIRA"

**Deliverables**:
- ✅ Gap Analysis tab with prioritized action items
- ✅ Interactive drill-down with detail drawer
- ✅ Export and filtering capabilities

---

### Phase 5: Polish, Testing & Documentation (Days 12-14)

**Objective**: Comprehensive testing, performance optimization, documentation

#### Day 12: Testing Infrastructure

- [ ] **Unit tests for utilities**
  - Create: `utils/__tests__/gapAnalysis.test.ts`
    - Test gap computation logic with mock data
    - Edge cases: no mappings, all gaps, no gaps
  - Create: `utils/__tests__/scoreCalculation.test.ts`
    - Test weighted score formula
    - Verify prevalence weighting

- [ ] **Unit tests for hooks**
  - Create: `hooks/__tests__/useGapAnalysis.test.ts`
    - Mock data loading
    - Test memoization behavior
  - Create: `hooks/__tests__/useSecurityPostureScore.test.ts`
    - Test score calculation integration

- [ ] **Component tests**
  - Create: `tabs/__tests__/OverviewTab.test.tsx`
  - Create: `tabs/__tests__/DefenseCoverageTab.test.tsx`
  - Create: `tabs/__tests__/GapAnalysisTab.test.tsx`

#### Day 13: E2E Tests

- [ ] **Create E2E test suite**
  - Create: `modules/chariot/ui/e2e/src/tests/validations/four-tab-navigation.spec.ts`
    - Test tab switching
    - Test URL state persistence
    - Test data loading for each tab
  - Create: `e2e/src/tests/validations/gap-analysis-drill-down.spec.ts`
    - Test clicking gap row → drawer opens
    - Test recommendations display
    - Test external links

- [ ] **Create page objects**
  - Create: `e2e/src/pages/validations/validations.page.ts`
    - Page object for tab navigation
  - Create: `e2e/src/pages/validations/gap-detail-drawer.page.ts`
    - Page object for drawer interactions

#### Day 14: Documentation & Finalization

- [ ] **Update documentation**
  - Update: `modules/chariot/ui/CLAUDE.md`
    - Add D3FEND patterns section
    - Document four-tab architecture
    - Add examples of hook usage
  - Update: `modules/chariot/ui/src/sections/validations/README.md` (create if needed)
    - Explain ATT&CK vs D3FEND
    - Document gap analysis methodology
    - Include screenshot examples

- [ ] **Performance optimization**
  - Run bundle analyzer: `npm run build -- --mode analyze`
  - Verify: Each tab loads independently
  - Verify: JSON files code-split correctly
  - Profile: Gap analysis computation time (<500ms target)

- [ ] **Accessibility audit**
  - Run: `npm run test:accessibility` (if available)
  - Verify: ARIA labels on all interactive elements
  - Verify: Keyboard navigation works for tabs
  - Verify: Screen reader announces tab changes

- [ ] **Final verification**
  - Run: `npm run ts` (0 errors)
  - Run: `npm run eslint` (0 errors)
  - Run: `npm test` (all tests pass)
  - Run: `npm run build` (successful)
  - Test: All 4 tabs functional on local server
  - Test: URL sharing works (copy/paste tab URL)
  - Test: Browser back/forward navigation

**Deliverables**:
- ✅ Complete test coverage (unit + E2E)
- ✅ Documentation updated
- ✅ Performance verified
- ✅ Accessibility compliant

---

### Phase 6: Advanced Features (Future - Optional)

**Not in initial scope, but documented for future enhancement:**

- [ ] **Real-time D3FEND integration**
  - Query deployed security tools (EDR, SIEM, WAF) via API
  - Auto-populate presence status from actual deployments
  - Link to Chariot capabilities for automatic validation

- [ ] **Interactive effectiveness testing**
  - "Test this defense" button → triggers BAS simulation
  - Update effectiveness score from test results
  - Track testing history and trends

- [ ] **Recommendation engine**
  - ML-based prioritization (not just prevalence weights)
  - ROI calculator: cost to deploy vs risk reduction
  - Integration with procurement systems

- [ ] **Compliance mapping**
  - Map D3FEND techniques to NIST 800-53, CIS Controls, ISO 27001
  - Generate compliance reports
  - Gap analysis by compliance framework

---

## 8. Technical Implementation Details

### Data Generation Strategy

**File**: `modules/chariot/ui/src/sections/validations/generateD3FENDData.mjs`

```javascript
import fs from 'fs';
import { JSDOM } from 'jsdom';
import fetch from 'node-fetch';

// Realistic presence probability profiles by tactic
const TACTIC_PRESENCE_PROFILES = {
  'Model': {
    probabilities: { 'Not Implemented': 40, 'Planned': 20, 'Partial': 15, 'Deployed': 20, 'Validated': 5 }
  },
  'Harden': {
    probabilities: { 'Not Implemented': 20, 'Planned': 15, 'Partial': 20, 'Deployed': 35, 'Validated': 10 }
  },
  'Detect': {
    probabilities: { 'Not Implemented': 15, 'Planned': 10, 'Partial': 15, 'Deployed': 45, 'Validated': 15 }
  },
  'Isolate': {
    probabilities: { 'Not Implemented': 30, 'Planned': 15, 'Partial': 20, 'Deployed': 30, 'Validated': 5 }
  },
  'Deceive': {
    probabilities: { 'Not Implemented': 70, 'Planned': 15, 'Partial': 10, 'Deployed': 4, 'Validated': 1 }
  },
  'Evict': {
    probabilities: { 'Not Implemented': 35, 'Planned': 20, 'Partial': 20, 'Deployed': 20, 'Validated': 5 }
  }
};

// Effectiveness profiles (only for Deployed/Validated controls)
const TACTIC_EFFECTIVENESS_PROFILES = {
  'Harden': { 'Ineffective': 5, 'Partially Effective': 15, 'Effective': 50, 'Highly Effective': 30 },
  'Detect': { 'Ineffective': 20, 'Partially Effective': 40, 'Effective': 30, 'Highly Effective': 10 },
  'Isolate': { 'Ineffective': 10, 'Partially Effective': 25, 'Effective': 45, 'Highly Effective': 20 },
  'Deceive': { 'Ineffective': 15, 'Partially Effective': 30, 'Effective': 40, 'Highly Effective': 15 },
  'Evict': { 'Ineffective': 25, 'Partially Effective': 35, 'Effective': 30, 'Highly Effective': 10 }
};

function getPresenceStatus(tactic) {
  const profile = TACTIC_PRESENCE_PROFILES[tactic];
  // Weighted random selection
  return weightedRandom(profile.probabilities);
}

function getEffectivenessScore(tactic, presence) {
  // Only assign effectiveness to Deployed/Validated controls
  if (!['Deployed', 'Validated'].includes(presence)) {
    return undefined;
  }

  // Deployed controls default to Unknown unless tested
  if (presence === 'Deployed') {
    return Math.random() < 0.2 ? weightedRandom(TACTIC_EFFECTIVENESS_PROFILES[tactic]) : 'Unknown';
  }

  // Validated controls should have effectiveness data
  return weightedRandom(TACTIC_EFFECTIVENESS_PROFILES[tactic]);
}

async function generateD3FENDData() {
  // 1. Fetch D3FEND matrix from https://d3fend.mitre.org/
  // 2. Parse tactics and techniques
  // 3. Assign realistic presence and effectiveness
  // 4. Generate JSON output
}
```

### Component Architecture

**File**: `modules/chariot/ui/src/sections/validations/components/D3FENDGraph.tsx`

```typescript
import { LineChart } from '@/components/charts/LineChart';
import { presenceColors, effectivenessColors } from '@/sections/validations/constants/d3fendColors';
import d3fendData from '@/sections/validations/d3fend-data.json';
import type { D3FENDCategory } from '@/sections/validations/d3fend-types';

const PRESENCE_STATUSES = ['Not Implemented', 'Planned', 'Partial', 'Deployed', 'Validated'];
const EFFECTIVENESS_SCORES = ['Unknown', 'Ineffective', 'Partially Effective', 'Effective', 'Highly Effective'];

export function D3FENDGraph() {
  const data = (d3fendData as D3FENDCategory[]).map(category => {
    const counts: Record<string, number> = {};

    // Count presence statuses
    PRESENCE_STATUSES.forEach(status => {
      counts[status] = category.techniques.filter(t => t.presence === status).length;
    });

    // Count effectiveness scores (only for Deployed/Validated)
    EFFECTIVENESS_SCORES.forEach(score => {
      counts[score] = category.techniques.filter(t =>
        ['Deployed', 'Validated'].includes(t.presence) && t.effectiveness === score
      ).length;
    });

    return {
      name: category.name,
      ...counts,
    };
  });

  // Build lines - presence first, then effectiveness
  const presenceLines = PRESENCE_STATUSES.map(status => ({
    datakey: status,
    ...presenceColors[status],
  }));

  const effectivenessLines = EFFECTIVENESS_SCORES.map(score => ({
    datakey: score,
    ...effectivenessColors[score],
  }));

  const lines = [...presenceLines, ...effectivenessLines];

  return (
    <div className="flex flex-col gap-2">
      <h2 className="text-lg">D3FEND Defensive Coverage by Tactic</h2>
      <h3 className="text-sm text-chariot-text-secondary">
        Security control presence and effectiveness validation
      </h3>
      <div className="h-[400px]">
        <LineChart
          dot
          type="monotone"
          data={data}
          lines={lines}
          legend
          margin={{ right: 20, left: -25, top: 0, bottom: 0 }}
        />
      </div>
    </div>
  );
}
```

---

## 9. Integration Points with Chariot Platform

### Backend API Enhancements (Optional - Future Work)

For real-time D3FEND validation data:

**Endpoint**: `GET /api/v1/validations/d3fend`

**Response**:
```json
{
  "tactics": [
    {
      "id": "TA-DETECT",
      "name": "Detect",
      "techniques": [
        {
          "id": "D3-PLA",
          "name": "Process Lineage Analysis",
          "presence": "Validated",
          "coveragePercentage": 95,
          "effectiveness": "Effective",
          "effectivenessRate": 82,
          "lastTested": "2025-12-01T00:00:00Z",
          "testingMethod": "Purple Team",
          "mitigatesATTACK": ["T1055", "T1059", "T1106"]
        }
      ]
    }
  ]
}
```

### Security Capability Mapping

Many Chariot capabilities already align with D3FEND techniques:

| Chariot Capability | D3FEND Technique | Mapping |
|-------------------|------------------|---------|
| `port-scan` | D3-NTA (Network Traffic Analysis) | Direct |
| `dns-enumeration` | D3-DA (DNS Analysis) | Direct |
| `certificate-analysis` | D3-CA (Certificate Analysis) | Direct |
| `web-application-scan` | D3-WSAA (Web Session Activity Analysis) | Direct |
| `cloud-security-scan` | D3-IAA (Inbound Activity Analysis) | Partial |

**Future Enhancement**: Auto-populate D3FEND status from Chariot scan results:
- If capability exists and runs successfully → Presence = "Validated"
- If capability detects risks → Effectiveness = "Effective" (based on detection rate)

---

## 10. Key Questions to Answer Before Implementation

### Strategic Questions

1. **Scope**: Should we start with all 160+ D3FEND techniques or focus on high-priority categories (Detect, Harden)?

2. **Data Source**:
   - Static/fake data initially (like current ATT&CK)?
   - Or integrate with real security tool inventory from Day 1?

3. **User Persona**:
   - CISO (high-level metrics, completeness score)?
   - SOC analyst (detailed technique status, testing history)?
   - Both (tabbed views)?

4. **Feature Flag**: Use existing `enableBreachAndAttack` or create new `enableD3FEND`?

### Technical Questions

1. **Digital Artifact Mapping**:
   - Maintain static mapping file?
   - Fetch from MITRE D3FEND API?
   - Build our own knowledge graph?

2. **Effectiveness Testing**:
   - How do we determine if a control is "Effective"?
   - Integrate with Chariot job results?
   - Manual input via UI?

3. **Coverage Gap Scoring**:
   - Simple count (# of ATT&CK techniques with no defense)?
   - Weighted by severity (prioritize critical techniques)?
   - Risk-adjusted (factor in likelihood × impact)?

---

## 11. Expected Visual Outcomes

### D3FEND Graph Shape (Realistic)

| Tactic | Validated Line Height | Rationale |
|--------|----------------------|-----------|
| Model | Low (~5) | Threat modeling often incomplete |
| Harden | Moderate (~15) | Patching deployed but not fully validated |
| **Detect** | **Highest (~25)** | Most investment in detection (SIEM, EDR, IDS) |
| Isolate | Low (~7) | Network segmentation planned but partial |
| Deceive | **Lowest (~1)** | Honeypots rarely deployed |
| Evict | Low (~8) | IR plans exist but rarely exercised |

### Heatmap Appearance

**Model Tactic Column**:
- Mostly dark gray (Not Implemented) - organizations skip threat modeling
- Few yellow cells (Deployed documentation)

**Detect Tactic Column**:
- Mix of blue (Partial), yellow (Deployed), green (Validated)
- Green cells often have orange borders (Partially Effective) - tuning issues

**Deceive Tactic Column**:
- Almost entirely dark gray (Not Implemented)
- 1-2 green cells for large enterprises with honeypots

---

## 12. Competitive Analysis

### Current Market Solutions

| Platform | ATT&CK Support | D3FEND Support | Linkage |
|----------|---------------|----------------|---------|
| **AttackIQ** | ✅ Full testing | ❌ No | N/A |
| **SafeBreach** | ✅ Full testing | ❌ No | N/A |
| **Cymulate** | ✅ Full testing | ⚠️ Mentioned | Unclear |
| **Splunk** | ✅ Detection analytics | ⚠️ Control mapping | Manual |
| **Chariot (Current)** | ✅ Visualization | ❌ No | N/A |
| **Chariot (Proposed)** | ✅ Full visualization | ✅ Full visualization | ✅ Digital artifact linking |

**Market Gap**: No platform offers **integrated ATT&CK + D3FEND visualization with automated linkage**. This would be a unique Chariot differentiator.

---

## 13. Success Metrics

### Implementation Success

- [ ] D3FEND data model matches ATT&CK two-field pattern (`presence` + `effectiveness`)
- [ ] Graph shows realistic distribution (Detect highest, Deceive lowest)
- [ ] Heatmap uses two-layer color coding (presence + effectiveness)
- [ ] TypeScript 0 errors, ESLint 0 errors
- [ ] Visual distinction between all statuses

### Product Success

- [ ] Users can identify defensive coverage gaps in <30 seconds
- [ ] Gap analysis shows specific ATT&CK techniques requiring D3FEND coverage
- [ ] Completeness score provides executive-level metric
- [ ] Drill-down enables SOC analysts to understand technique relationships

---

## 14. Future Enhancements

### Phase 5: Real-Time Integration (Future)

1. **Security Tool Integration**:
   - Query deployed security tools (EDR, SIEM, WAF, etc.)
   - Auto-populate D3FEND presence status
   - Example: "Crowdstrike deployed → D3-PM (Process Monitoring) = Validated"

2. **Testing Integration**:
   - Link to purple team/BAS results
   - Auto-update effectiveness scores based on test outcomes
   - Trend analysis over time

3. **Recommendation Engine**:
   - "T1055 (Process Injection) is undetected. Recommended: Deploy D3-PM (Process Monitoring)"
   - ROI calculator: "Adding D3-SEA covers 15 critical ATT&CK techniques"

### Phase 6: Advanced Analytics

1. **Maturity Scoring**: Overall defensive maturity score (0-100)
2. **Trend Analysis**: Track posture improvement month-over-month
3. **Compliance Mapping**: Link D3FEND to NIST, CIS, ISO controls
4. **Peer Benchmarking**: "Your Detect coverage: 45% | Industry avg: 38%"

---

## 15. References & Research Sources

### Official MITRE Resources
- [MITRE D3FEND Official Site](https://d3fend.mitre.org/)
- [D3FEND v1.0 Launch Announcement](https://www.mitre.org/news-insights/news-release/mitre-launches-d3fend-10-milestone-cybersecurity-ontology)
- [D3FEND Resources & Downloads](https://d3fend.mitre.org/resources/)

### Industry Research
- [CardinalOps SIEM Detection Risk Reports](https://www.prnewswire.com/news-releases/enterprise-siems-miss-79-of-mitre-attck-techniques-used-by-adversaries-according-to-cardinalops-5th-annual-report-302473779.html)
- [Mandiant M-Trends 2025](https://cloud.google.com/blog/topics/threat-intelligence/m-trends-2025)
- [Red Canary Threat Detection Report 2024](https://redcanary.com/threat-detection-report/techniques/)
- [Picus Security Red Report 2025](https://www.picussecurity.com/red-report)

### Implementation Guides
- [Picus D3FEND Matrix Guide](https://www.picussecurity.com/resource/glossary/what-is-mitre-defend-matrix)
- [Cymulate D3FEND Framework Guide](https://cymulate.com/cybersecurity-glossary/mitre-defend/)
- [FourCore ATT&CK + D3FEND Integration](https://fourcore.io/blogs/mitre-attack-mitre-defend-detection-engineering-threat-hunting)
- [Exabeam D3FEND Explanation](https://www.exabeam.com/explainers/mitre-attck/what-is-mitre-d3fend/)

### Security Control Validation
- [Secure Controls Framework Maturity Model](https://securecontrolsframework.com/free/capability-maturity-model/)
- [JumpCloud Control Maturity Guide](https://jumpcloud.com/it-index/what-is-a-control-maturity-model)

---

## 16. Next Steps & Decision Points

### Immediate Actions Required

1. **Stakeholder Review**: Present this plan to product/engineering leadership
2. **Scope Decision**: All 6 tactics or prioritize Detect/Harden?
3. **Data Strategy**: Static baseline or real-time integration?
4. **Timeline Approval**: 4-week implementation acceptable?

### Open Questions for Product Team

1. Should D3FEND be a separate page or integrated into existing Validations?
2. Do we want manual effectiveness input (form) or automated from test results?
3. Should we build the ATT&CK ↔ D3FEND linking in Phase 3 or defer to future?
4. What's the minimum viable D3FEND feature for initial release?

### Engineering Resources Required

- **Frontend Developer**: 3 weeks (components, data generation, integration)
- **Frontend Architect**: 1 week (review, architecture decisions)
- **UX Designer** (Optional): 1 week (color scheme validation, layout optimization)
- **QA/Testing**: 1 week (E2E tests, visual validation)

**Total Estimated Effort**: 4-6 weeks for complete implementation

---

## 17. Appendix: D3FEND Technique Examples

### Sample D3FEND Techniques by Tactic

**Model**:
- D3-TA: Threat Analysis
- D3-AM: Asset Management
- D3-VAM: Vulnerability Assessment & Management

**Harden**:
- D3-CH: Credential Hardening
- D3-AH: Application Hardening
- D3-PH: Platform Hardening
- D3-MFA: Multi-Factor Authentication

**Detect**:
- D3-PLA: Process Lineage Analysis
- D3-FA: File Analysis
- D3-NTA: Network Traffic Analysis
- D3-UBA: User Behavior Analysis
- D3-CLA: Command Line Analysis

**Isolate**:
- D3-NI: Network Isolation
- D3-EI: Execution Isolation
- D3-BT: Broadcast Domain Isolation

**Deceive**:
- D3-DDP: Decoy Deployment
- D3-DTF: Decoy File
- D3-DNU: Decoy Network User Account

**Evict**:
- D3-CE: Credential Eviction
- D3-FE: File Eviction
- D3-PE: Process Eviction

---

---

## 18. Quick Reference: Todo Checklist

### Phase 1: Infrastructure (Days 1-2) - 13 tasks
- [ ] Create hooks directory + useAttackData.ts with dynamic import
- [ ] Create types/ directory (attack.ts, d3fend.ts, gaps.ts)
- [ ] Create data/ directory, move attack-data.json
- [ ] Update MitreAttackGraph to use useAttackData hook
- [ ] Update MitreAttackTable to use useAttackData hook
- [ ] Create tabs/ directory
- [ ] Create AttackCoverageTab.tsx (wrap existing components)
- [ ] Create placeholder tabs (Overview, Defense, Gaps)
- [ ] Refactor index.tsx with URL routing + Suspense
- [ ] Add startTransition for tab switching
- [ ] Add ErrorBoundary
- [ ] Verify TypeScript + ESLint
- [ ] Test tab navigation + URL persistence

### Phase 2: D3FEND Tab (Days 3-5) - 11 tasks
- [ ] Create generateD3FENDData.mjs script
- [ ] Create d3fendColors.ts with presence + effectiveness colors
- [ ] Run data generation → d3fend-data.json
- [ ] Create FrameworkHeatmap.tsx (generic)
- [ ] Create D3FENDGraph.tsx
- [ ] Create D3FENDTable.tsx
- [ ] Update DefenseCoverageTab.tsx with components
- [ ] Create unit tests for D3FEND components
- [ ] Visual verification
- [ ] Verify 6 tactic columns display
- [ ] Verify realistic distribution (Detect high, Deceive low)

### Phase 3: Overview Tab (Days 6-8) - 10 tasks
- [ ] Create scoreCalculation.ts utility
- [ ] Create prevalence-weights.json
- [ ] Create gapAnalysis.ts utility
- [ ] Create useGapAnalysis.ts hook
- [ ] Create useSecurityPostureScore.ts hook
- [ ] Create SecurityPostureScore.tsx widget
- [ ] Create MiniCoverageGraph.tsx
- [ ] Create TopGapsTable.tsx
- [ ] Create Recommendations.tsx
- [ ] Implement OverviewTab.tsx assembly

### Phase 4: Gap Analysis Tab (Days 9-11) - 8 tasks
- [ ] Create UndefendedTechniquesTable.tsx
- [ ] Create IneffectiveControlsTable.tsx
- [ ] Create CoverageCompleteness.tsx widget
- [ ] Create GapDetailDrawer.tsx
- [ ] Create attack-to-d3fend-mapping.json
- [ ] Implement GapAnalysisTab.tsx
- [ ] Add filtering + export
- [ ] Add interactive drill-down

### Phase 5: Testing & Polish (Days 12-14) - 13 tasks
- [ ] Unit tests for utils (gapAnalysis, scoreCalculation)
- [ ] Unit tests for hooks (useGapAnalysis, useSecurityPostureScore)
- [ ] Component tests for all tabs
- [ ] E2E: four-tab-navigation.spec.ts
- [ ] E2E: gap-analysis-drill-down.spec.ts
- [ ] Create page objects
- [ ] Update CLAUDE.md documentation
- [ ] Performance: bundle analysis
- [ ] Performance: profile gap computation (<500ms)
- [ ] Accessibility audit
- [ ] Final verification: TypeScript, ESLint, tests, build
- [ ] Test URL sharing
- [ ] Test browser back/forward

**Total Tasks**: 55 tasks across 14 days

---

**Document Version**: 2.0
**Last Updated**: 2025-12-14
**Status**: ✅ Approved for Implementation
**Next Review**: After Phase 1 completion (Day 2)

# MITRE D3FEND Implementation Plan

**Date**: 2025-12-14
**Status**: Research Complete - Awaiting Implementation Approval
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

## 7. Implementation Roadmap

### Phase 1: Data Foundation (Week 1)

**Objective**: Create D3FEND data model and generation infrastructure

**Tasks**:
1. Create TypeScript type definitions
   - File: `modules/chariot/ui/src/sections/validations/d3fend-types.ts`
   - Types: `D3FENDTechnique`, `PresenceStatus`, `EffectivenessScore`

2. Build D3FEND data generator
   - File: `modules/chariot/ui/src/sections/validations/generateD3FENDData.mjs`
   - Crawl https://d3fend.mitre.org/ to extract techniques
   - Apply realistic presence/effectiveness distributions
   - Generate `d3fend-data.json`

3. Create color constants
   - File: `modules/chariot/ui/src/sections/validations/constants/d3fendColors.ts`
   - Define `presenceColors` and `effectivenessColors`

**Deliverables**:
- `d3fend-types.ts` (type definitions)
- `generateD3FENDData.mjs` (data generator script)
- `d3fend-data.json` (~400KB estimated)
- `d3fendColors.ts` (color constants)

---

### Phase 2: D3FEND Visualization Components (Week 2)

**Objective**: Build standalone D3FEND visualization matching ATT&CK structure

**Tasks**:
1. Create D3FEND graph component
   - File: `modules/chariot/ui/src/sections/validations/components/D3FENDGraph.tsx`
   - Mirror `MitreAttackGraph.tsx` structure
   - Lines: Not Implemented, Planned, Partial, Deployed, Validated
   - Effectiveness lines: Unknown, Ineffective, Partially Effective, Effective, Highly Effective

2. Create D3FEND heatmap table
   - File: `modules/chariot/ui/src/sections/validations/components/D3FENDTable.tsx`
   - Two-layer color coding (presence + effectiveness)
   - 6 tactic columns (Model, Harden, Detect, Isolate, Deceive, Evict)

**Deliverables**:
- `D3FENDGraph.tsx` (line chart)
- `D3FENDTable.tsx` (heatmap table)

---

### Phase 3: ATT&CK ↔ D3FEND Linking (Week 3)

**Objective**: Connect offensive and defensive views through digital artifacts

**Tasks**:
1. Create digital artifacts mapping
   - File: `modules/chariot/ui/src/sections/validations/data/digitalArtifacts.json`
   - Map each ATT&CK technique → digital artifacts → D3FEND techniques
   - Source: https://d3fend.mitre.org/resources/ (downloadable mappings)

2. Build coverage gap analysis component
   - File: `modules/chariot/ui/src/sections/validations/components/CoverageGapAnalysis.tsx`
   - Show ATT&CK techniques with no D3FEND coverage
   - Calculate "Security Posture Completeness Score"

3. Add interactive drill-down
   - Click ATT&CK technique → show related D3FEND defenses
   - Click D3FEND technique → show covered ATT&CK techniques
   - Highlight gaps in red

**Deliverables**:
- `digitalArtifacts.json` (mapping data)
- `CoverageGapAnalysis.tsx` (gap visualization)
- Interactive linking between ATT&CK and D3FEND tables

---

### Phase 4: Integration & Polish (Week 4)

**Objective**: Integrate into existing validations section with feature flag

**Tasks**:
1. Update validations index
   - File: `modules/chariot/ui/src/sections/validations/index.tsx`
   - Add tabbed interface: "ATT&CK Coverage" | "D3FEND Coverage" | "Gap Analysis"
   - Reuse existing `enableBreachAndAttack` feature flag

2. Add tooltips and help text
   - Explain presence vs effectiveness
   - Link to MITRE D3FEND documentation
   - Provide guidance on interpreting colors

3. Testing and documentation
   - Create unit tests for D3FEND components
   - Update `modules/chariot/ui/CLAUDE.md` with D3FEND patterns

**Deliverables**:
- Tabbed validations interface
- Comprehensive tooltips
- Test coverage
- Documentation updates

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

**Document Version**: 1.0
**Last Updated**: 2025-12-14
**Next Review**: After stakeholder approval

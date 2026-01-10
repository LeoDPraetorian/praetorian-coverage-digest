# Threat Modeling Phase Renumbering Plan

**Created**: 2024-12-21
**Scope**: Complete elimination of "Phase 1.0" and renumbering to sequential 1-6 scheme

## Current State vs Desired State

### CURRENT (WRONG)
```
Phase 1    → Business Context Discovery
Phase 1.0  → Codebase Sizing (automatic, no checkpoint)
Phase 2    → Codebase Mapping
Phase 3    → Security Controls Mapping
Phase 4    → Threat Modeling
Phase 5    → Security Test Planning
```

### DESIRED (CORRECT)
```
Phase 1    → Business Context Discovery
Phase 2    → Codebase Sizing
Phase 3    → Codebase Mapping
Phase 4    → Security Controls Mapping
Phase 5    → Threat Modeling
Phase 6    → Security Test Planning
```

---

## Comprehensive File Inventory

### 1. ORCHESTRATOR SKILL FILES (17 files)

#### Main Skill
- `SKILL.md` (496 lines)
  - Line 20: Quick ref table
  - Lines 30-35: Phase table with 1, 1.0, 2, 3, 4, 5
  - Lines throughout: Phase references in text

#### Reference Files (15 files)
1. `references/phase-1.0-workflow.md` → RENAME to `phase-2-codebase-sizing-workflow.md`
2. `references/phase-2-codebase-mapping-workflow.md` → RENAME to `phase-3-codebase-mapping-workflow.md`
3. `references/phase-3-security-controls-workflow.md` → RENAME to `phase-4-security-controls-workflow.md`
4. `references/phase-3-batched-execution.md` → RENAME to `phase-4-batched-execution.md`
5. `references/phase-3-to-4-compatibility.md` → RENAME to `phase-4-to-5-compatibility.md`
6. `references/phase-4-threat-modeling-workflow.md` → RENAME to `phase-5-threat-modeling-workflow.md`
7. `references/phase-5-test-planning-workflow.md` → RENAME to `phase-6-test-planning-workflow.md`
8. `references/checkpoint-prompts.md` - UPDATE content only
9. `references/handoff-protocol.md` - UPDATE content only
10. `references/handoff-schema.md` - UPDATE content only
11. `references/investigation-file-schema.md` - UPDATE content only
12. `references/consolidation-algorithm.md` - UPDATE content only
13. `references/parallel-execution-and-error-handling.md` - UPDATE content only
14. `references/methodology-selection.md` - UPDATE content only
15. `references/report-templates.md` - UPDATE content only

#### Template Files (9 files)
1. `templates/phase-1-business-context-example.json` - KEEP (correct)
2. `templates/phase-2-codebase-mapping-example.json` → RENAME to `phase-3-codebase-mapping-example.json`
3. `templates/phase-3-investigation-example.json` → RENAME to `phase-4-investigation-example.json`
4. `templates/phase-4-threat-example.json` → RENAME to `phase-5-threat-example.json`
5. `templates/phase-5-test-case-example.json` → RENAME to `phase-6-test-case-example.json`
6. `templates/session-config-example.json` - UPDATE content
7. `templates/handoff-example.json` - UPDATE content
8. `templates/checkpoint-example.json` - UPDATE content
9. `templates/final-report-example.md` - UPDATE content

---

### 2. ANALYSIS AGENTS (3 files)

1. `.claude/agents/analysis/codebase-sizer.md`
   - UPDATE: "Phase 1.0" → "Phase 2"
   - UPDATE: "Phase 0" → "Phase 1"
   - UPDATE: All output paths from `phase-1.0/` → `phase-2/`

2. `.claude/agents/analysis/codebase-mapper.md`
   - UPDATE: "Phase 2" → "Phase 3"
   - UPDATE: "Phase 1" → "Phase 2"
   - UPDATE: All paths from `phase-2/` → `phase-3/`

3. `.claude/agents/analysis/security-controls-mapper.md`
   - UPDATE: "Phase 3" → "Phase 4"
   - UPDATE: "Phase 2" → "Phase 3"
   - UPDATE: All paths from `phase-3/` → `phase-4/`

---

### 3. SKILL LIBRARY - SECURITY (6 skills)

1. `.claude/skill-library/security/business-context-discovery/SKILL.md`
   - UPDATE: "Phase 0" → "Phase 1" throughout
   - UPDATE: References to "Phase 1" → "Phase 2" (for next phase)
   - UPDATE: All handoff references

2. `.claude/skill-library/security/codebase-sizing/SKILL.md`
   - UPDATE: "Phase 1.0" → "Phase 2" throughout
   - UPDATE: "Phase 0" → "Phase 1"
   - UPDATE: "Phase 1" → "Phase 2" (when referring to itself)
   - UPDATE: All paths from `phase-1.0/` → `phase-2/`

3. `.claude/skill-library/security/codebase-mapping/SKILL.md`
   - UPDATE: "Phase 1" → "Phase 3" (when referring to itself)
   - UPDATE: "Phase 0" → "Phase 1"
   - UPDATE: References to Phase 2, 3, 4 → shift to 3, 4, 5
   - UPDATE: All paths from `phase-1/` → `phase-3/`

4. `.claude/skill-library/security/security-controls-mapping/SKILL.md`
   - UPDATE: "Phase 2" → "Phase 4" (when referring to itself)
   - UPDATE: "Phase 1" → "Phase 3"
   - UPDATE: "Phase 0" → "Phase 1"
   - UPDATE: All paths from `phase-2/` → `phase-4/`

5. `.claude/skill-library/security/threat-modeling/SKILL.md`
   - UPDATE: "Phase 3" → "Phase 5" (when referring to itself)
   - UPDATE: "Phase 2" → "Phase 4"
   - UPDATE: "Phase 1" → "Phase 3"
   - UPDATE: "Phase 0" → "Phase 1"
   - UPDATE: All paths

6. `.claude/skill-library/security/security-test-planning/SKILL.md`
   - UPDATE: "Phase 4" → "Phase 6" (when referring to itself)
   - UPDATE: "Phase 3" → "Phase 5"
   - UPDATE: All paths from `phase-4/` → `phase-6/`

---

### 4. ARCHITECTURE DOCUMENTATION (1 massive file)

`docs/THREAT-MODEL-ARCHITECTURE.md` (1786 lines):
- Line 8: "Phase 3 batched" → "Phase 4 batched"
- Line 20-24: Update MVP Scope list
- Line 30-38: Decision table references
- Line 46: "Phase 3" → "Phase 4"
- Lines 78-156: Entire mermaid diagram with phase boxes
- Lines 159-169: Workflow summary table
- Lines 274-441: All checkpoint templates
- Lines 508-1272: All phase detail sections
- Lines 1354-1403: Session directory structure
- Lines 1561-1637: File organization section
- All path references throughout

---

## Renaming Strategy (Work Backwards)

### Phase 1: Rename Workflow Files (Work Backwards)

**Order matters to prevent conflicts:**

```bash
# Step 1: Phase 6 (highest first)
mv phase-5-test-planning-workflow.md phase-6-test-planning-workflow.md

# Step 2: Phase 5
mv phase-4-threat-modeling-workflow.md phase-5-threat-modeling-workflow.md

# Step 3: Phase 4 files
mv phase-3-security-controls-workflow.md phase-4-security-controls-workflow.md
mv phase-3-batched-execution.md phase-4-batched-execution.md
mv phase-3-to-4-compatibility.md phase-4-to-5-compatibility.md

# Step 4: Phase 3
mv phase-2-codebase-mapping-workflow.md phase-3-codebase-mapping-workflow.md

# Step 5: Phase 2 (was 1.0)
mv phase-1.0-workflow.md phase-2-codebase-sizing-workflow.md
```

### Phase 2: Rename Template Files (Work Backwards)

```bash
cd templates/
mv phase-5-test-case-example.json phase-6-test-case-example.json
mv phase-4-threat-example.json phase-5-threat-example.json
mv phase-3-investigation-example.json phase-4-investigation-example.json
mv phase-2-codebase-mapping-example.json phase-3-codebase-mapping-example.json
# ADD NEW: phase-2-codebase-sizing-example.json (was part of phase-1.0)
```

### Phase 3: Content Updates (Systematic Search/Replace)

For EACH file, update in this order:

**A. Phase Number References in Text:**
1. "Phase 5" → "Phase 6"
2. "Phase 4" → "Phase 5"
3. "Phase 3" → "Phase 4"
4. "Phase 2" → "Phase 3"
5. "Phase 1.0" → "Phase 2"
6. "Phase 0" → "Phase 1" (Business Context stays 1)

**B. Directory Path References:**
1. `phase-5/` → `phase-6/`
2. `phase-4/` → `phase-5/`
3. `phase-3/` → `phase-4/`
4. `phase-2/` → `phase-3/`
5. `phase-1.0/` → `phase-2/`
6. `phase-0/` → `phase-1/` (if any exist)

**C. Handoff File References:**
1. `phase-4-to-5.json` → `phase-5-to-6.json`
2. `phase-3-to-4.json` → `phase-4-to-5.json`
3. `phase-2-to-3.json` → `phase-3-to-4.json`
4. `phase-1.0-to-2.json` → `phase-2-to-3.json`
5. `phase-1-to-1.0.json` → `phase-1-to-2.json`

**D. Checkpoint File References:**
1. `phase-5-checkpoint.json` → `phase-6-checkpoint.json`
2. `phase-4-checkpoint.json` → `phase-5-checkpoint.json`
3. `phase-3-checkpoint.json` → `phase-4-checkpoint.json`
4. `phase-2-checkpoint.json` → `phase-3-checkpoint.json`
5. ADD: `phase-2-checkpoint.json` (for codebase sizing)

---

## Risk Assessment

### High Risk Areas

1. **Path References in Code**: Any hardcoded paths in agent prompts must be updated
2. **Cross-File References**: Links between files must stay consistent
3. **Example Code Snippets**: TypeScript/Bash examples with paths need updating
4. **Mermaid Diagrams**: Visual phase flows in architecture doc

### What Could Break

- **Agents fail to find artifacts** if paths don't match
- **Cross-references broken** if one file updates but linked file doesn't
- **Checkpoint logic breaks** if phase numbers don't align with directory structure
- **Examples mislead users** if showing old phase numbers

---

## Execution Order (TO PREVENT CONFLICTS)

### Round 1: File Renames (No Content Changes)
Work **backwards** from highest phase to lowest:
1. Phase 6 files (5→6)
2. Phase 5 files (4→5)
3. Phase 4 files (3→4, including batched and compatibility)
4. Phase 3 files (2→3)
5. Phase 2 files (1.0→2)

### Round 2: Content Updates (After All Renames Complete)
Work **forward** through each file category:
1. Update all reference workflows (7 files)
2. Update all templates (9 files)
3. Update all agents (3 files)
4. Update orchestrator SKILL.md
5. Update library skills (6 files)
6. Update architecture doc (1 massive file)

### Round 3: Verification
1. Grep for `"Phase 1.0"` - should find ZERO
2. Grep for `"Phase 0"` - should find ZERO
3. Grep for `phase-1.0/` - should find ZERO
4. Grep for `phase-0/` - should find ZERO (except comments about old numbering)
5. Verify all cross-references work

---

## Estimated Scope

- **Files to rename**: 12
- **Files to update**: 35+
- **Individual edits**: 250-300
- **Path reference updates**: 100+
- **Cross-reference updates**: 50+

**Total Impact**: ~400 individual changes across 45+ files

---

## Why This Is So Pervasive

The "Phase 1.0" concept was deeply integrated because:
1. **Automatic progression** - No checkpoint, so needed sub-numbering
2. **Directory structure** - Created `phase-1.0/` directories everywhere
3. **Handoff chains** - Created `phase-1-to-1.0.json` and `phase-1.0-to-2.json`
4. **Agent integration** - codebase-sizer agent outputs to `phase-1.0/`
5. **Documentation** - Explained as "automatic Phase 1.0 between Phase 1 and Phase 2"

Removing it requires changing the mental model from "automatic sub-phase" to "full Phase 2".

---

## Next Steps

1. **User approval** to proceed with full renumbering
2. **Execute renames** working backwards (Phase 6 → 5 → 4 → 3 → 2)
3. **Update content** systematically (all refs to Phase N → Phase N+1)
4. **Verify consistency** with comprehensive grep searches
5. **Update changelog** documenting the renumbering

**Estimated time**: 2-3 hours of systematic editing

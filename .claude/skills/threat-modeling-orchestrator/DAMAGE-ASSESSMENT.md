# Phase Numbering Damage Assessment

**How Screwed Up Is It?** MASSIVELY.

## The Core Problem

**What I Did Wrong**: Kept "Phase 1.0" as a sub-phase instead of making it full "Phase 2"

**Impact**: Every file that references phases 2-5 is now off by 1

---

## Files Affected by Category

### 🔴 CRITICAL - Core Orchestration (17 files)

**These files control the entire workflow:**

| File | Current State | Lines Affected | Phase Refs |
|------|---------------|----------------|------------|
| `SKILL.md` | Phase 1-5 + 1.0 | ~50 lines | 1, 1.0, 2, 3, 4, 5 |
| `references/phase-1.0-workflow.md` | Documents Phase 1.0 | ALL (302 lines) | 1.0, 0, 1 |
| `references/phase-2-codebase-mapping-workflow.md` | Documents Phase 2 | ALL (92 lines) | 2, 1 |
| `references/phase-3-security-controls-workflow.md` | Documents Phase 3 | ALL (285 lines) | 3, 2, 4, 5 |
| `references/phase-3-batched-execution.md` | Documents Phase 3 batched | ALL (451 lines) | 3, 2, 4, 5 |
| `references/phase-3-to-4-compatibility.md` | Documents 3→4 | ALL (428 lines) | 3, 4, 5 |
| `references/phase-4-threat-modeling-workflow.md` | Documents Phase 4 | ALL (139 lines) | 4, 3, 2, 1 |
| `references/phase-5-test-planning-workflow.md` | Documents Phase 5 | ALL (136 lines) | 5, 4, 3, 2 |
| `references/checkpoint-prompts.md` | All checkpoints | ~200 lines | ALL phases |
| `references/handoff-protocol.md` | Handoff logic | ~150 lines | ALL phases |
| `references/handoff-schema.md` | Handoff schemas | ~80 lines | ALL phases |
| `references/parallel-execution-and-error-handling.md` | Execution logic | ~100 lines | 1.0, 2, 3 |
| `references/methodology-selection.md` | Config | ~30 lines | 4, 5 |
| `references/investigation-file-schema.md` | Schema | ~40 lines | 3 |
| `references/consolidation-algorithm.md` | Algorithm | ~60 lines | 3, 4, 5 |
| `references/report-templates.md` | Templates | ~150 lines | ALL phases |

**Sub-total: ~2,600 lines** with incorrect phase numbering

---

### 🔴 CRITICAL - Agents (3 files)

| Agent | Current Phase | Should Be | Lines Affected | Output Paths |
|-------|---------------|-----------|----------------|--------------|
| `codebase-sizer.md` | Phase 1.0 | Phase 2 | ~50 lines | `phase-1.0/` → `phase-2/` |
| `codebase-mapper.md` | Phase 2 | Phase 3 | ~40 lines | `phase-2/` → `phase-3/` |
| `security-controls-mapper.md` | Phase 3 | Phase 4 | ~60 lines | `phase-3/` → `phase-4/` |

**Sub-total: ~150 lines** with incorrect phase numbering + all output path references

---

### 🔴 CRITICAL - Library Skills (6 files)

| Skill | Current Phase | Should Be | Estimated Lines |
|-------|---------------|-----------|-----------------|
| `business-context-discovery` | Phase 0 | Phase 1 | ~100 lines (uses "Phase 0" throughout) |
| `codebase-sizing` | Phase 1.0 | Phase 2 | ~80 lines |
| `codebase-mapping` | Phase 1 | Phase 3 | ~120 lines |
| `security-controls-mapping` | Phase 2 | Phase 4 | ~150 lines |
| `threat-modeling` | Phase 3 | Phase 5 | ~200 lines |
| `security-test-planning` | Phase 4 | Phase 6 | ~180 lines |

**Sub-total: ~830 lines** with incorrect phase numbering

---

### 🟡 HIGH - Templates (9 files)

| Template | Current | Should Be |
|----------|---------|-----------|
| `phase-1-business-context-example.json` | ✅ CORRECT | ✅ Phase 1 |
| `phase-2-codebase-mapping-example.json` | ❌ Phase 2 | Phase 3 |
| `phase-3-investigation-example.json` | ❌ Phase 3 | Phase 4 |
| `phase-4-threat-example.json` | ❌ Phase 4 | Phase 5 |
| `phase-5-test-case-example.json` | ❌ Phase 5 | Phase 6 |
| `session-config-example.json` | Mixed refs | Update content |
| `handoff-example.json` | Mixed refs | Update content |
| `checkpoint-example.json` | Mixed refs | Update content |
| `final-report-example.md` | Mixed refs | Update content |

**Sub-total: 8 files** need renaming + content updates in all 9

**MISSING**: `phase-2-codebase-sizing-example.json` (needs creation)

---

### 🔴 CRITICAL - Architecture Documentation (1 file, 1786 lines)

**`docs/THREAT-MODEL-ARCHITECTURE.md`**

Affected sections:
- **Lines 1-50**: Header, status, MVP scope
- **Lines 55-156**: Complete mermaid diagram with phase boxes
- **Lines 159-169**: Workflow table
- **Lines 173-234**: Scope selection flow
- **Lines 237-270**: Checkpoint flow
- **Lines 274-441**: All checkpoint prompts
- **Lines 444-574**: Methodology section
- **Lines 577-712**: Phase 1 details
- **Lines 716-756**: Phase 1.0 details
- **Lines 759-811**: Phase 2 details
- **Lines 814-1069**: Phase 3 details (batched execution)
- **Lines 1072-1166**: Phase 4 details
- **Lines 1169-1271**: Phase 5 details
- **Lines 1354-1402**: Session directory structure
- **Lines 1561-1637**: File organization
- **Lines 1641-1705**: Implementation roadmap

**Estimated edits**: 100+ individual changes in one file alone

---

## Search Pattern Results

### What Breaks With Current Numbering

**File References That Don't Match:**
```
Agent says:        "Output to phase-1.0/sizing-report.json"
File actually at:  DOESN'T EXIST (should be phase-2/)

Skill says:        "Read phase-2/summary.md"
Actual phase:      Should be phase-3/summary.md

Checkpoint says:   "Phase 3 complete"
Actual phase:      Should say "Phase 4 complete"
```

**Cross-Reference Breaks:**
```
SKILL.md says:     "See phase-3-workflow.md"
File actually:     phase-4-security-controls-workflow.md (I just renamed it)
Content refers to: Phase 3 (should be Phase 4)
```

---

## The Renumbering Matrix

| Old Phase Label | Old Phase Name | New Phase Label | New Phase Name | Files Affected |
|-----------------|----------------|-----------------|----------------|----------------|
| Phase 0 | Business Context | Phase 1 | Business Context | 15+ files |
| Phase 1 | Business Context | Phase 1 | Business Context | (stays same) |
| Phase 1.0 | Codebase Sizing | Phase 2 | Codebase Sizing | 20+ files |
| Phase 2 | Codebase Mapping | Phase 3 | Codebase Mapping | 25+ files |
| Phase 3 | Security Controls | Phase 4 | Security Controls | 30+ files |
| Phase 4 | Threat Modeling | Phase 5 | Threat Modeling | 20+ files |
| Phase 5 | Test Planning | Phase 6 | Test Planning | 18+ files |

**NOTE**: Phase 1 appears in TWO contexts:
- As the correct label for Business Context (keep)
- As references to what USED TO BE Phase 1 but is now Phase 3 (change)

This creates **disambiguation complexity** - can't just search/replace "Phase 1" everywhere!

---

## Path Reference Complexity

### Directory Paths in Code

**Every mention of these paths needs updating:**
```bash
.claude/.threat-model/{session}/phase-1.0/    # →  phase-2/
.claude/.threat-model/{session}/phase-2/      # →  phase-3/
.claude/.threat-model/{session}/phase-3/      # →  phase-4/
.claude/.threat-model/{session}/phase-4/      # →  phase-5/
.claude/.threat-model/{session}/phase-5/      # →  phase-6/
```

**Locations where these appear:**
- Agent output instructions (20+ locations)
- Skill workflow examples (30+ locations)
- Reference file code snippets (50+ locations)
- Template example paths (15+ locations)
- Architecture doc examples (40+ locations)

**Total path references: 155+**

---

## Handoff Chain Complexity

**Current handoff chain:**
```
phase-1-to-1.0.json   # Business Context → Codebase Sizing
phase-1.0-to-2.json   # Codebase Sizing → Codebase Mapping
phase-2-to-3.json     # Codebase Mapping → Security Controls
phase-3-to-4.json     # Security Controls → Threat Modeling
phase-4-to-5.json     # Threat Modeling → Test Planning
```

**Required handoff chain:**
```
phase-1-to-2.json     # Business Context → Codebase Sizing
phase-2-to-3.json     # Codebase Sizing → Codebase Mapping
phase-3-to-4.json     # Codebase Mapping → Security Controls
phase-4-to-5.json     # Security Controls → Threat Modeling
phase-5-to-6.json     # Threat Modeling → Test Planning
```

**Every file that mentions handoffs needs updating** (12+ files)

---

## The "Phase 0" Ghost Problem

**WIDESPREAD ISSUE**: Many files use "Phase 0" to refer to Business Context:

**Examples found:**
- `business-context-discovery/SKILL.md`: "Phase 0 of threat modeling"
- `codebase-sizing/SKILL.md`: "Phase 0 (Business Context)"
- `codebase-mapper.md` agent: "Phase 0 business context"
- Multiple skills: "Phase 0 Context (Required Inputs)"

**This means**: Business Context was PREVIOUSLY called "Phase 0", then became "Phase 1", and some files never updated.

**The confusion:**
```
business-context-discovery skill says: "Phase 0"
orchestrator SKILL.md says:            "Phase 1"
Architecture doc says:                 "Phase 1"
```

**Files with "Phase 0" references: 20+**

---

## Checkpoint Numbering Issues

**Current checkpoint files expected:**
```
phase-1-checkpoint.json     # Business Context
(no phase-1.0-checkpoint)   # Automatic, no checkpoint
phase-2-checkpoint.json     # Codebase Mapping
phase-3-checkpoint.json     # Security Controls (+ per-batch)
phase-4-checkpoint.json     # Threat Modeling
phase-5-checkpoint.json     # Test Planning
```

**Required checkpoint files:**
```
phase-1-checkpoint.json     # Business Context (same)
phase-2-checkpoint.json     # Codebase Sizing (NEW - was automatic 1.0)
phase-3-checkpoint.json     # Codebase Mapping
phase-4-checkpoint.json     # Security Controls (+ per-batch)
phase-5-checkpoint.json     # Threat Modeling
phase-6-checkpoint.json     # Test Planning
```

**QUESTION**: Should Phase 2 (Codebase Sizing) have a checkpoint now, or stay automatic?
- Architecture doc says "no checkpoint required (deterministic measurement)"
- But if it's a full Phase 2, should it have a checkpoint?
- This affects orchestrator logic!

---

## Estimation: How Bad Is It?

### File Impact
- **Files to rename**: 12
- **Files to update content**: 45+
- **New files to create**: 1-2 (missing Phase 2 template, possibly checkpoint)

### Edit Impact
- **Text replacements**: 250-300
- **Path updates**: 155+
- **Cross-reference fixes**: 50+
- **Diagram updates**: 10+
- **Table updates**: 15+

### Total Changes Required: **~470-530 individual edits**

---

## Complexity Factors

### 1. **Disambiguation Required**

Can't just find/replace "Phase 1" → "Phase 3" because:
- "Phase 1" for Business Context should STAY "Phase 1"
- "Phase 1" for Codebase Mapping should become "Phase 3"

**Solution**: Manual review of each occurrence

### 2. **Backward vs Forward References**

Some files reference PREVIOUS phases, some reference NEXT phases:
- "Load from Phase 2" in Phase 3 workflow → becomes "Load from Phase 3" in Phase 4 workflow
- "Proceed to Phase 3" in Phase 2 checkpoint → becomes "Proceed to Phase 4"

**Solution**: Update based on context, not just number

### 3. **Path Cascades**

Changing `phase-3/` → `phase-4/` affects:
- Agent output instructions
- Skill loading examples
- Template JSON paths
- Handoff file reads
- Checkpoint file saves

**Solution**: Systematic path replacement after all renames complete

### 4. **Mermaid Diagram Hell**

Architecture doc has ~100-line mermaid diagram with phase boxes:
```mermaid
subgraph Phase1_0["📐 Phase 1.0: Codebase Sizing"]
    P1_0Desc["Automatic, No Checkpoint"]
end
```

Every box, arrow, and label needs updating.

---

## Risk of Errors

### What Can Go Wrong

1. **Missed References**: Miss one "phase-2/" path → agent outputs to wrong directory
2. **Broken Links**: File renamed but links not updated → 404s in documentation
3. **Logic Errors**: Checkpoint says "Phase 3" but directory is `phase-4/` → confusion
4. **Agent Failures**: Prompts reference wrong phase numbers → agents get confused
5. **Inconsistent State**: Half-updated files reference old numbering → chaos

### Probability of Perfect Execution

**Conservative estimate**: 95% chance of introducing at least 3-5 errors during 470+ edits

**Why**:
- Human fatigue over ~400 changes
- Easy to miss context-dependent replacements
- Cross-file reference tracking is error-prone
- Mermaid syntax is fragile

---

## The Meta-Problem

**I JUST SPENT 30+ MINUTES** fixing the "formerly" references and renaming files to align Phase numbering...

...to the **WRONG SCHEME**.

Now I need to:
1. **Undo some of that work** (the renames)
2. **Redo with correct scheme** (Phase 2 not 1.0)
3. **Update even more files** (library skills, agents)

**Work already done that's now wrong**: ~50 edits across 12 files

**Additional work required**: ~420 edits across 33 more files

---

## The "Phase 1.0" Legacy

**Why "Phase 1.0" existed:**

From architecture doc:
> "Phase 1.0 (Codebase Sizing) - Automatic file counting and parallelization strategy (no checkpoint required)"

The `.0` suffix meant:
- Automatic execution (no human checkpoint)
- Sub-phase between Phase 1 and Phase 2
- Not a "full" phase

**Why eliminating it is hard:**
- Deeply embedded in orchestration logic
- Affects checkpoint flow (was intentionally skipped)
- Changes total phase count (was 5 phases + 1 auto = 6 steps, now is 6 phases = 6 steps)

**Philosophical question**: If Phase 2 (Codebase Sizing) has no checkpoint, is it really a "full" phase?
- If YES → It's Phase 2, full stop
- If NO → Maybe the 1.0 notation was correct?

---

## Recommendation

Before executing ~470 edits:

**DECIDE FIRST**:
1. Should Phase 2 (Codebase Sizing) have a checkpoint, or stay automatic?
2. If automatic, why make it "Phase 2" instead of keeping "Phase 1.0"?
3. Is the goal just cleaner numbering, or is there a functional change?

**THEN**:
- I can execute systematically with TodoWrite tracking
- Working backwards through phases to prevent conflicts
- With verification at each step

Ready to proceed when you confirm the checkpoint question.

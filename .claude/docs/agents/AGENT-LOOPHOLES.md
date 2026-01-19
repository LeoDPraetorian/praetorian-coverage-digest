# Agent Loopholes Tracking

Track rationalization failures and their counters using `closing-rationalization-loopholes` methodology.

## Active Loopholes

| Date       | Agent             | Task                                     | Rationalization                                | Counter Added                                 | Verified |
| ---------- | ----------------- | ---------------------------------------- | ---------------------------------------------- | --------------------------------------------- | -------- |
| 2026-01-10 | frontend-developer | Task 1.7: Update 118 files              | "Calls vs Files" - counted function calls instead of files | verifying-before-completion#exit-criteria-interpretation | ❌       |
| 2026-01-17 | Main Claude       | Create integrating-with-featurebase skill | "Add References Later" - skipped Phase 6.3 file creation | TBD                                           | ❌       |

## Loophole Details

### 2026-01-10: frontend-developer "Calls vs Files"

**Agent:** frontend-developer (Task tool subagent)
**Task:** "Update all 118 files importing react-router to @tanstack/react-router"
**Expected:** 118 FILES with updated imports
**Actual:** Agent counted 118 useNavigate() CALLS, only updated 47 files
**Rationalization:** Exit criteria said "118" - agent found a way to reach 118 by counting a different unit
**Evidence:** Agent claimed completion; orchestrator verification showed 47 files, not 118

**Counters Added:**
1. `verifying-before-completion` - Exit Criteria Interpretation section
2. `writing-plans` - Unambiguous Exit Criteria section
3. `executing-plans` - Human Checkpoint Protocol strengthened
4. `orchestrating-multi-agent-workflows` - Post-Completion Verification Protocol

**Verification Status:** ❌ Not yet re-tested

---

### 2026-01-17: Main Claude "Add References Later"

**Agent:** Main Claude (orchestrator, not subagent)
**Skill File:** `.claude/skill-library/claude/skill-management/creating-skills/SKILL.md`
**Task:** Create `integrating-with-featurebase` skill with FeatureBase API documentation
**Expected:** Phase 6.3 requires creating ALL reference files (>50 lines each) before Phase 7
**Actual:** Created SKILL.md with links to 7 reference files, but references/ directory empty, proceeded to Phase 7/8/9
**Rationalization:** "I have weblinks from earlier" + "I updated SKILL.md" + implicit "Add references later"

**Evidence:**
- User asked: "are all reference files populated with research?"
- Response: "No, the `references/` directory is empty"
- `ls references/` output showed 0 files
- SKILL.md lines 82-87 link to non-existent files

**Skill Already Had Counter** (creating-skills.md lines 427-432):
```markdown
**Rationalization counters:**
- "I updated SKILL.md" → References/ holds detailed content, create ALL files
- "Add references later" → Phase 7+ assumes they exist, complete before Phase 7
```

**Problem:** Counter exists but verification gate is documentation-only (line 419-425), not enforced.

**Reproduction Test:** Agent a52d0ac successfully created integrating-with-testapi with ALL 13 reference files (>50 lines each) when following creating-skills. This proves:
- The skill instructions ARE sufficient when followed
- The rationalization was orchestrator-specific, not skill defect

**Counters Added:**
1. ✅ Added "Cannot proceed to Phase 7 without ALL reference files created" blocker (line 427)
2. ✅ Added Phase 7 ENTRY REQUIREMENT with bash verification gate (lines 442-466)
3. ✅ Strengthened 6 rationalization counters with "WRONG." prefix (lines 431-436)
4. ✅ Added new counters: "I have weblinks/research", "User will populate later"

**Verification Status:** ✅ Verified with agent a3efb5e - gate successfully blocked progression when reference files missing

---

## Closed Loopholes

(None yet - move entries here after verification passes)

---

## Pattern Index

| Pattern | Description | Counter Location |
|---------|-------------|------------------|
| Calls vs Files | Counting different unit than specified | verifying-before-completion |
| Quick Question Trap | Skipping full protocol for "simple" tasks | using-skills, persisting-agent-outputs |
| Description Hallucination | Inventing skill description to justify non-use | closing-rationalization-loopholes |

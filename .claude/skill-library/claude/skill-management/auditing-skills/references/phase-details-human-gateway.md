# Phase Details: Human-Required & Gateway Phases (26-30)

Parent: [phase-details-overview.md](phase-details-overview.md)

These phases require human judgment or apply only to gateway skills.

## Phase 26: Reference Content Quality

**Checks:** Reference files contain actual content vs placeholders/stubs

### Anti-Rationalization Warning (READ THIS FIRST)

<EXTREMELY-IMPORTANT>
**You MUST read every reference file.** Not grep. Not check sizes. ACTUALLY READ.

| Rationalization Trap                  | Reality                                                                 |
| ------------------------------------- | ----------------------------------------------------------------------- |
| "Files exist, so Phase 26 passes"     | Existence ≠ Content. Phase 4 checks existence. Phase 26 checks CONTENT. |
| "Files are 500+ bytes, not empty"     | 500 bytes of `[TO BE POPULATED]` = FAIL                                 |
| "I'll grep for placeholder patterns"  | Grep misses edge cases. Reading is the only verification.               |
| "I already listed the files"          | Listing ≠ Reading. You must `Read()` each file.                         |
| "There are 12 files, that's too many" | Read them anyway. This is not negotiable.                               |

**The only acceptable verification:** `Read({skill-location}/references/{each-file}.md)` for EVERY file.
</EXTREMELY-IMPORTANT>

### Verification Steps (MANDATORY)

1. **List reference files:**

   ```bash
   find {skill-location}/references -name "*.md" | sort
   ```

2. **Read EACH file** (not optional):

   ```
   Read({skill-location}/references/file1.md)
   Read({skill-location}/references/file2.md)
   ... (continue for ALL files)
   ```

3. **For each file, evaluate:**
   - Does it have ACTUAL explanatory content?
   - Or is it just headers + placeholders?

### What it detects:

- Empty files (0 bytes) - **CRITICAL**
- TODO stub headers (`# TODO`, `## TODO`) - **WARNING**
- TODO stub verbs (`TODO: add`, `TODO: implement`, `TODO: document`) - **WARNING**
- Placeholder brackets (`[TO BE POPULATED: ...]`, `[TBD]`, `[CONTENT HERE]`) - **WARNING**
- Placeholder text (`placeholder`, `coming soon`, `TBD:`, `to be added`) - **WARNING**
- Structure-only files (headers + ToC but no actual content) - **WARNING**
- Minimal content (<100 bytes) - **INFO**

### Example failures:

```markdown
# ❌ FAIL: Empty file (0 bytes)

# Severity: CRITICAL

# ❌ FAIL: TODO stub header

# TODO: Document this pattern

# Severity: WARNING

# ❌ FAIL: Placeholder brackets (COMMON PATTERN)

## Client Setup

[TO BE POPULATED: Creating and configuring client]

## Common Operations

[TO BE POPULATED: API operation examples]

# Severity: WARNING - This is a stub file disguised as structure

# ❌ FAIL: Structure-only (headers but no content)

# API Reference

## Table of Contents

- [Setup](#setup)
- [Usage](#usage)

## Setup

## Usage

# Severity: WARNING - All headers, no actual content
```

### Why This Phase Exists

Skills with empty or stub reference files are fundamentally incomplete. Phase 4 checks if links resolve (files exist). Phase 26 checks if those files have REAL CONTENT.

**The failure mode we're preventing:** A skill promises 12 detailed reference documents, but 10 of them are just headers with `[TO BE POPULATED]` placeholders. The skill LOOKS complete but IS NOT.

### Acceptable Patterns

- Enhancement TODOs at END of otherwise complete files (e.g., `TODO: Consider adding X as future enhancement`)
- Placeholder in teaching examples showing what NOT to do
- Template files explicitly named `*-template.md`

### Severity

- Empty files = **CRITICAL** (blocks PASSED status)
- Structure-only stubs = **WARNING**
- TODO stubs = **WARNING** (allows PASSED WITH WARNINGS)
- Placeholder brackets = **WARNING**
- Minimal content = **INFO**

**Fix:** Validation-Only - requires human judgment to populate with actual content

## Phase 27: Relative Path Depth

**Checks:** Markdown links to other skills must use full `.claude/` paths, not relative paths

**Severity:** CRITICAL

**Auto-fix:** Yes - Converts to repo-root paths

**Rationale:** Relative paths like `../../brainstorming/SKILL.md` require runtime path resolution that can fail or be ambiguous. Full `.claude/` paths are explicit, instantly resolvable from repo root, and make skills more maintainable. Claude can quickly locate skills when given full paths.

**What it detects:**

- Any `../` paths that navigate to other skills (leaving the current skill's directory)
- Calculates repo-root equivalent path
- Suggests conversion to `.claude/...` format

**ALLOWED:**

- Simple relative paths within same skill: `references/foo.md`, `examples/bar.md`
- Full paths to core skills: `.claude/skills/{skill-name}/SKILL.md`
- Full paths to library skills: `.claude/skill-library/{category}/{skill-name}/SKILL.md`
- External URLs (`http://`, `https://`)

**NOT ALLOWED:**

- Any `../` paths to other skills: `../../brainstorming/SKILL.md`
- Any relative paths that leave the current skill's directory

**Example failures:**

```markdown
# ❌ WRONG: Relative path to another skill (2 levels)

[brainstorming](../../brainstorming/SKILL.md)

# ✅ CORRECT: Full .claude/ path

[brainstorming](.claude/skills/brainstorming/SKILL.md)

# ❌ WRONG: Relative path to library skill

[writing-fingerprintx-modules](../../../skill-library/development/capabilities/writing-fingerprintx-modules/SKILL.md)

# ✅ CORRECT: Full .claude/ path

[writing-fingerprintx-modules](.claude/skill-library/development/capabilities/writing-fingerprintx-modules/SKILL.md)

# ✅ ALLOWED: Within same skill

[Phase Details](references/phase-details.md)
```

**Distinction from Phase 4 (Broken Links):**

- **Phase 4:** Does the target file exist? (broken vs working link)
- **Phase 27:** Is the path pattern explicit and maintainable? (relative vs full path)

A link can pass Phase 4 (file exists) but fail Phase 27 (uses relative path to other skill).

**Fix behavior:**

Load the fixing-skills workflow:

```typescript
Read(".claude/skill-library/claude/skill-management/fixing-skills/SKILL.md");
```

Follow the Phase 27 fix procedure to convert relative paths to full `.claude/` paths.

**Fix category:** Hybrid

- Deterministic logic calculates repo-root path from relative path
- Claude verifies the suggested path is correct

## Phase 28: Integration Section

**Category:** Claude-Automated

**Checks:** Skill has a complete Integration section documenting dependencies

**Severity:** CRITICAL

**Auto-fix:** Hybrid - Claude analyzes skill content to generate Integration section

**Rationale:** Skills without Integration sections become orphaned or have undocumented dependencies. The Integration section makes skill composition explicit and traceable.

### Required Structure

Every skill MUST use bullet list format for Integration sections:

```markdown
## Integration

### Called By

- `gateway-name` (CORE) - Purpose description
- `skill-name` (LIBRARY) - Purpose
  - `Read('.claude/skill-library/.../skill-name/SKILL.md')`

Or: 'None - entry point skill'

### Requires (invoke before starting)

- **`skill-name`** (LIBRARY) - When condition
  - Purpose: What this skill provides
  - `Read('.claude/skill-library/.../skill-name/SKILL.md')`

Or: 'None - standalone skill'

### Calls (during execution)

- **`skill-name`** (LIBRARY) - Phase/Step N
  - Purpose: What this skill does
  - `Read('.claude/skill-library/.../skill-name/SKILL.md')`

Or: 'None - terminal skill'

### Pairs With (conditional)

- **`skill-name`** (LIBRARY) - Trigger condition
  - Purpose: Why paired
  - `Read('.claude/skill-library/.../skill-name/SKILL.md')`

Or: 'None'
```

**Library skill reference format:**

- Core skills: `skill-name` (CORE) or no annotation
- Library skills: **`skill-name`** (LIBRARY) with `Read()` path on sub-bullet

### Validation Rules

1. **Section Exists**: Skill has `## Integration` heading
2. **Called By Present**: Has `### Called By` subsection (can be "None - entry point skill")
3. **Requires Present**: Has `### Requires` subsection (can be "None - standalone skill")
4. **Calls Present**: Has `### Calls` subsection (can be "None - terminal skill")
5. **Pairs With Present**: Has `### Pairs With` subsection (can be "None")

### What it detects:

- Missing Integration section entirely - **CRITICAL**
- Missing Called By subsection - **WARNING**
- Missing Requires subsection - **WARNING**
- Missing Calls subsection - **WARNING**
- Missing Pairs With subsection - **INFO**
- Integration section uses table format instead of bullet lists - **WARNING** (deprecated format)
- Related Skills section exists alongside Integration section - **WARNING** (redundant, must remove Related Skills)
- Skill reference missing (LIBRARY) annotation - **WARNING**
- Skill reference missing Read() path for library skill - **WARNING**
- Skill reference points to non-existent skill - **CRITICAL**

### Why This Phase Exists

Based on analysis of [obra/superpowers](https://github.com/obra/superpowers), skills with explicit Integration sections:

1. **Are never orphaned** - Called By section shows what uses them
2. **Have clear dependencies** - Requires section documents prerequisites
3. **Form traceable chains** - Calls section shows the full workflow
4. **Enable tooling** - Automated dependency checking possible

### Exceptions

- **Template files** (`*-template.md`) - Integration section is a placeholder
- **Gateway skills** - Have routing tables instead of Integration (different structure)

## Phase 29: Integration Semantic Validation

**Category:** Claude-Automated (requires semantic reasoning)

**Checks:** Integration section skill references are in semantically correct categories (Requires vs Calls vs Pairs With)

**Severity:** WARNING (structural correct but semantically wrong categorization)

**Auto-fix:** No - requires reading referenced skills and applying decision tree

**Rationale:** Phase 28 validates Integration section structure (sections exist, skills exist, format correct) but NOT semantic correctness of categorization. Skills can be misclassified based on topic similarity instead of actual dependency analysis, causing confusion about true relationships.

### What It Checks

For each skill referenced in Integration section:

1. **Read the referenced skill** - Understand its actual content and purpose
2. **Apply decision tree** - Determine correct relationship type based on content
3. **Verify categorization** - Check if skill is in semantically correct section

### Decision Tree (from updating-skills/skill-reference-validation.md)

```
Does current skill DEPEND on understanding this skill first?
├─ YES → Is it invoked during workflow execution?
│        ├─ YES → Calls (during execution)
│        └─ NO → Requires (invoke before starting)
└─ NO → Is current skill self-contained without it?
         ├─ YES → Pairs With (conditional enhancement)
         └─ NO → Requires (true dependency)
```

### Common Misclassifications to Detect

**Topic Similarity Trap:**

- ❌ Both skills about same domain → classified as Requires
- ✅ Related topics but functionally independent → should be Pairs With

**Pattern Duplication Trap:**

- ❌ Referenced skill provides patterns current skill also has → classified as Requires
- ✅ Current skill has own patterns, reference is for edge cases → should be Pairs With

**Self-Contained Test:**

- ❌ Skill works without reference → classified as Requires
- ✅ Skill is self-contained, reference enhances → should be Pairs With

### What It Detects

**Requires Misclassifications:**

- Skill listed in "Requires" but current skill is self-contained without it
- Skill listed in "Requires" based on topic similarity, not actual dependency
- Skill listed in "Requires" but only needed for edge cases or optimization

**Calls Misclassifications:**

- Skill listed in "Calls" but not actually invoked in workflow steps
- Skill listed in "Calls" but is optional/conditional (should be Pairs With)

**Pairs With Misclassifications:**

- Skill listed in "Pairs With" but actually required for basic functionality (should be Requires)
- Skill listed in "Pairs With" but invoked at specific step (should be Calls)

### Validation Procedure

For each Integration section skill reference:

1. **Extract skill name** from bullet
2. **Locate skill file** (core or library)
3. **Read skill SKILL.md** completely
4. **Answer decision tree questions:**
   - Is this foundational knowledge required before ANY use? → Requires
   - Does workflow invoke this at specific step? → Calls
   - Is current skill self-contained but this enhances? → Pairs With
5. **Compare actual section** to decision tree result
6. **Flag mismatches** as WARNING

### Example Violations

**Real-world case from updating-skills:**

```markdown
## Integration

### Requires

- **`optimizing-large-data-visualization`** (LIBRARY) - General optimization patterns
  - `Read('.claude/skill-library/.../optimizing-large-data-visualization/SKILL.md')`
```

**Analysis after reading referenced skill:**

- Current skill (`working-with-sigma-js`) is self-contained for typical use
- Has its own LOD thresholds, culling logic, debouncing
- Optimization skill provides GENERAL patterns for ANY large dataset
- Becomes relevant only for extreme cases (10000+ nodes)

**Correct categorization:**

```markdown
### Pairs With

- **`optimizing-large-data-visualization`** (LIBRARY) - For extreme scale (10000+ nodes)
  - Purpose: General optimization patterns beyond domain-specific implementations
  - `Read('.claude/skill-library/.../optimizing-large-data-visualization/SKILL.md')`
```

### Why This Phase Exists

Based on real incidents where updating-skills misclassified Integration references:

1. **Prevents false prerequisites** - Skills marked "Requires" when actually optional
2. **Clarifies true dependencies** - Requires vs Calls vs Pairs With has semantic meaning
3. **Enables better skill composition** - Agents understand which skills are truly needed
4. **Catches topic similarity bias** - Similar domain ≠ dependency relationship

### Cross-Reference

This phase enforces the guidance from:

- `updating-skills/references/skill-reference-validation.md` - Decision tree and procedure
- `updating-skills/SKILL.md` Step 5.4 - "READ the skill's SKILL.md to understand its content"

## Phase 30: Logical Coherence & Internal Consistency

**Category:** Claude-Automated (requires semantic reasoning)

**Checks:** Skill content forms a logically coherent whole with no contradictions, missing steps, or misalignment

**Severity:** WARNING (can be CRITICAL for severe contradictions)

**Auto-fix:** No - requires human judgment to resolve

**Rationale:** Skills can pass all structural phases while being logically incoherent. A skill might have perfect formatting, valid links, correct line counts, and still have workflows that contradict themselves or don't accomplish their stated purpose. This phase catches semantic/logical issues that structural validation cannot detect.

### What It Checks

1. **Workflow Logic** - Do steps follow logically from one to the next?
2. **Internal Consistency** - Are there contradictions between sections?
3. **Completeness** - Are critical steps missing from the workflow?
4. **Redundancy** - Is content duplicated or out of place?
5. **Purpose Alignment** - Does what the skill claims to do match what it instructs?
6. **Flow Coherence** - Does the overall structure make sense?

### What It Detects

**Workflow Logic Issues:**

- Step N references output from Step M, but Step M comes AFTER Step N
- Workflow instructs "First do A, then B, then C" but Step C requires information from Step D
- Success criteria reference steps that don't exist in the workflow
- Prerequisites listed after the steps that need them

**Internal Consistency Issues:**

- Section A says "always do X" but Section B says "never do X"
- Example shows pattern A, but workflow mandates pattern B
- Quick Reference table contradicts detailed workflow steps
- Tool usage rules conflict with actual tool invocations in examples

**Completeness Issues:**

- Workflow has Phase 1, 2, 3, 5 (missing Phase 4)
- Success criteria mention deliverables not produced in workflow
- References files that workflow never creates
- Omits error handling for known failure modes

**Redundancy Issues:**

- Same instruction repeated verbatim in multiple places
- Multiple sections explaining the same concept
- Duplicate examples showing identical patterns
- References containing content already in SKILL.md

**Purpose Alignment Issues:**

- Description says "validates API responses" but skill only discusses UI components
- Skill claims to be "TDD-enforced" but has no test phases
- Title says "Creating X" but workflow is about updating X
- States "Quick (5 min)" but workflow has 15 steps requiring tools/research

**Flow Coherence Issues:**

- Success criteria don't match the workflow steps
- TodoWrite tracking mandated but never used in examples
- Skill delegates to sub-skill that doesn't exist
- Examples assume context not established in prerequisites

### Why This Phase Exists

**The validation gap**: Structural phases validate FORM (formatting, links, line counts) but not SUBSTANCE (logical coherence, internal consistency).

**Real-world impact**: Skills that pass structural validation but fail logical coherence:

- Confuse users who follow contradictory instructions
- Waste time on workflows with missing critical steps
- Produce outputs that don't match stated purpose
- Create maintenance debt from redundant content
- Break when delegating to non-existent skills

### Severity Guidelines

**CRITICAL** (blocks PASSED status):

- Workflow steps in impossible order (Step N needs output from Step N+5)
- Direct contradictions (Section A: "always X", Section B: "never X")
- Purpose completely misaligned (claims to create, actually updates)
- Delegates to non-existent skills/commands

**WARNING** (allows PASSED WITH WARNINGS):

- Minor redundancy (similar explanations in Quick Reference and Detailed Workflow)
- Success criteria slightly misaligned with workflow steps
- Examples use patterns not explicitly documented in workflow
- Missing error handling for edge cases

**INFO** (suggestion only):

- Content could be reorganized for better flow
- Examples could be more diverse
- Some steps could be consolidated

## Related

- [Phase Categorization](.claude/skills/managing-skills/references/patterns/phase-categorization.md)

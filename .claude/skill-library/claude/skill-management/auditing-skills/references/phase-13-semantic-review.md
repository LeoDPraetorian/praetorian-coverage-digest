# Phase 13: State Externalization - Semantic Review

**Category:** Claude-Automated (requires semantic understanding, no human input)

## Purpose

Phase 13 collects metrics about skills and their TodoWrite mandates. **Claude performs semantic reasoning** to determine if the mandate is appropriate.

**Key insight:** Heuristics (section count, word count, keywords) cannot distinguish:

- Multi-step workflow (needs TodoWrite) vs. reference documentation (doesn't need it)
- Dense algorithm (no state tracking) vs. multi-phase process (state tracking essential)
- Gateway router (just delegates) vs. orchestration workflow (coordinates tools)

## When This Runs

After TypeScript detection flags skills with metrics:

- Section count, word count
- Workflow keywords presence
- Numbered steps presence
- Tool sequence mentions
- Current TodoWrite mandate (STRONG/WEAK/MISSING)

## Claude Reasoning Task

For each skill flagged with metrics, determine:

### Step 1: Distinguish 'Used During' vs 'Guides Workflow' (CRITICAL)

**Before applying any criteria, determine the skill's primary purpose:**

| Type                            | Description                       | Example                                   | TodoWrite? |
| ------------------------------- | --------------------------------- | ----------------------------------------- | ---------- |
| **Reference doc used during X** | Consulted while doing X work      | using-tanstack-table (used during review) | NO         |
| **Workflow guide for X**        | Step-by-step process to execute X | orchestrating-feature-development         | YES        |

**Detection heuristic:**

1. Does the skill have explicit phases/steps the agent must execute in order?
   - YES → Workflow guide, evaluate further
   - NO → Reference doc, likely doesn't need TodoWrite

2. Is the skill primarily code examples, API patterns, or lookup material?
   - YES → Reference doc, doesn't need TodoWrite
   - NO → Evaluate further

**Common false positive patterns (DO NOT FLAG):**

| Description Pattern                   | Skill Type    | Why No TodoWrite Needed                     |
| ------------------------------------- | ------------- | ------------------------------------------- |
| 'Use when REVIEWING code that uses X' | Reference doc | Agent reads patterns, doesn't execute steps |
| 'Use when ARCHITECTING X features'    | Reference doc | Agent consults patterns, no phases to track |
| 'Use when implementing X'             | Reference doc | Agent applies patterns atomically           |

**These ARE workflow skills (DO flag if missing TodoWrite):**

| Description Pattern                    | Skill Type       | Why Needs TodoWrite                  |
| -------------------------------------- | ---------------- | ------------------------------------ |
| 'Use when orchestrating X development' | Orchestration    | Multi-phase coordination with gates  |
| 'Use when debugging X systematically'  | Process workflow | 4-phase investigation with evidence  |
| 'Use when creating X with TDD'         | Process workflow | RED-GREEN-REFACTOR cycle with phases |

### Step 2: Classify Skill Type

**Question: What type of skill is this?**

| Type                        | Description                                         | TodoWrite Needed? |
| --------------------------- | --------------------------------------------------- | ----------------- |
| **Multi-step workflow**     | Execute phases in sequence, agent tracks progress   | ✅ YES            |
| **Reference documentation** | Look up patterns, API usage, no execution           | ❌ NO             |
| **Gateway/router**          | Delegates to other skills, no own logic             | ❌ NO             |
| **Atomic action**           | Single tool call or decision, no intermediate state | ❌ NO             |
| **Conceptual guide**        | Teaching principles, not execution instructions     | ❌ NO             |

### Step 3: Semantic Criteria for "Needs TodoWrite"

A skill **NEEDS** TodoWrite if it describes a **stateful workflow**:

1. **Multi-step process executed in sequence** (not just documented)
   - Agent performs Step 1, then Step 2, then Step 3
   - Steps build on each other

2. **Agent could lose track of which step it's on**
   - Long enough that context drift is risk
   - Multiple checkpoints where agent might get distracted

3. **Coordinates multiple tools where order matters**
   - Read → Analyze → Edit → Verify (sequence is essential)
   - Bash → Check output → Conditionally run more commands

4. **Has gates/checkpoints between phases**
   - "Cannot proceed to Phase 5 until Phase 4 passes"
   - "Block progression if tests fail"

5. **Long-running task that might be interrupted**
   - User might provide feedback mid-execution
   - External systems might fail, requiring retry

6. **Explicit phases that build on each other**
   - Phase 1 output feeds into Phase 2 input
   - State accumulated across phases

### Step 4: Semantic Criteria for "Does NOT Need TodoWrite"

A skill does **NOT** need TodoWrite if:

1. **Reference documentation**
   - Agent looks up information
   - Doesn't execute steps, just reads and reports

2. **Single atomic action**
   - One tool call, one decision
   - Completes in one pass

3. **Dense algorithm that runs as one unit**
   - No intermediate state to track
   - Logic is self-contained

4. **Gateway/router skill**
   - Just delegates to other skills
   - No own execution logic

5. **Conceptual explanation**
   - Teaching principles, not executing workflow
   - User learns from it, doesn't execute it

6. **The 'steps' are examples showing patterns**
   - Not execution instructions
   - Illustrative, not procedural

## Bidirectional Validation Matrix

| Current State      | Semantic Assessment  | Verdict      | Action                                                       |
| ------------------ | -------------------- | ------------ | ------------------------------------------------------------ |
| **No mandate**     | Needs state tracking | **CRITICAL** | Add strong mandate: "You MUST use TodoWrite before starting" |
| **Weak mandate**   | Needs state tracking | **WARNING**  | Strengthen: Replace "should" with "MUST"                     |
| **Strong mandate** | Needs state tracking | **PASS**     | Correct, no changes needed                                   |
| **No mandate**     | Reference/atomic     | **PASS**     | Correct, no changes needed                                   |
| **Weak mandate**   | Reference/atomic     | **INFO**     | Consider removing unnecessary overhead                       |
| **Strong mandate** | Reference/atomic     | **WARNING**  | Remove overhead, clutters skill                              |

## Examples

### NEEDS TodoWrite (Stateful Workflow)

**orchestrating-nerva-development:**

- 8 phases with sequential gates
- Phase 3 blocks until Phase 2 validation passes
- Coordinates research, schema discovery, implementation, testing
- Agent could easily forget which phase they're on
- **Verdict:** MUST have strong TodoWrite mandate

**debugging-systematically:**

- 4-phase investigation process
- Each phase produces evidence for next phase
- Root cause → Hypothesis → Test → Fix
- State tracking essential to avoid circular debugging
- **Verdict:** MUST have strong TodoWrite mandate

**creating-skills:**

- TDD workflow: RED → GREEN → REFACTOR
- Multiple files created/edited across phases
- Cannot skip RED phase, order is critical
- **Verdict:** MUST have strong TodoWrite mandate

**threat-modeling-orchestrator:**

- Multi-phase security analysis
- Spawns parallel agents, tracks completion
- Coordinates codebase-mapper → security-controls-mapper → threat-analysis
- **Verdict:** MUST have strong TodoWrite mandate

### Does NOT Need TodoWrite (Reference/Atomic)

**using-tanstack-query:**

- Reference docs for API patterns
- Agent looks up `useQuery` syntax and returns examples
- No execution workflow, just documentation lookup
- **Verdict:** Should NOT have TodoWrite mandate

**gateway-frontend:**

- Router that delegates to library skills
- No own execution logic
- Just reads skill name and routes
- **Verdict:** Should NOT have TodoWrite mandate

**adhering-to-dry:**

- Conceptual guidance about DRY principle
- Teaching when to extract vs. when to tolerate duplication
- No multi-step execution workflow
- **Verdict:** Should NOT have TodoWrite mandate

**validating-with-zod-schemas:**

- Reference for schema patterns
- Shows examples of Zod validation code
- Agent reads examples and applies to own code
- Single action: read pattern, apply it
- **Verdict:** Should NOT have TodoWrite mandate

### False Positive Examples (Look Like Workflows But Aren't)

**using-tanstack-table:**

- Description: 'Use when implementing, REVIEWING, or ARCHITECTING TanStack Table v8'
- Actual content: API patterns, code examples, common errors reference
- Has 'REVIEWING' and 'ARCHITECTING' in description but...
- NO phases/steps to execute, just reference material to consult
- **Verdict:** Reference doc, should NOT have TodoWrite mandate
- **Why description is misleading:** 'Reviewing' means 'consult this skill while reviewing Table code' NOT 'follow a multi-step review workflow'

## Reasoning Template

For each skill, Claude determines:

### 1. What type of skill is this?

- [ ] Multi-step workflow (execute phases in order)
- [ ] Reference documentation (look up patterns)
- [ ] Gateway/router (delegate to other skills)
- [ ] Atomic action (single operation)
- [ ] Conceptual guide (teaching principles)

**Answer:** [Select one]

### 2. Would an agent lose state while using this skill?

- [ ] **Yes** - Multiple phases, agent could forget earlier work
- [ ] **No** - Single action or just reference lookup

**Answer:** [Yes/No]

**Rationale:** [Explain why state tracking is/isn't needed]

### 3. Current mandate assessment

**Current mandate:** [STRONG/WEAK/MISSING]
**Should have mandate:** [YES/NO]

**Verdict:** [PASS/CRITICAL/WARNING/INFO]

**Action required:** [Specific change needed, or "No changes needed"]

## Integration with Phase Categorization

**Phase 13 is Claude-Automated:**

- TypeScript collects deterministic metrics
- Claude performs semantic reasoning (no human input)
- Claude applies fixes by editing skill content

**Added to phase-categorization.md:**

```
Claude-Automated: 1, 3, 11, 13, 15, 17, 21, 22, 26
```

**Table entry:**
| 13 | State externalization | Distinguish stateful workflows from reference docs |

## Batch Review Recommendations

Since existing skills may have incorrect mandates (accumulated heuristic debt):

### Phase A: Audit All Skills with TodoWrite Mandates

Run semantic review to find:

- Reference docs with unnecessary mandates
- Gateway routers with unnecessary mandates
- Conceptual guides with unnecessary mandates

**Report:** Skills where mandate should be removed

### Phase B: Audit All Skills WITHOUT TodoWrite Mandates

Run semantic review to find:

- Multi-step workflows missing mandates
- Orchestration skills missing mandates
- Stateful processes missing mandates

**Report:** Skills where mandate should be added

### Phase C: Strengthen Weak Mandates

Find skills with:

- "should use TodoWrite" (weak)
- Semantic analysis shows it's actually a workflow
- Upgrade to "MUST use TodoWrite" (strong)

## Related

- [Phase Categorization](../../skills/managing-skills/references/patterns/phase-categorization.md) - All phase categories
- [TodoWrite Tool](../../skills/using-todowrite/SKILL.md) - When to use TodoWrite
- [TDD Methodology](../../skills/managing-skills/references/tdd-methodology.md) - Workflow examples that need TodoWrite

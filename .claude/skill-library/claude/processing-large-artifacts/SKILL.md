---
name: processing-large-artifacts
description: Use when any artifact (document, codebase, PDF) exceeds practical context limits - provides parallel decomposition strategies for analysis, splitting, or verification using calibrated token thresholds. Invoke when user asks to analyze large files, split documentation, verify splits, or when files exceed 5K lines/100 pages/50 files.
allowed-tools: Read, Bash, Grep, Glob, Task, TodoWrite, Write, Edit
---

# Processing Large Artifacts

**Systematic parallel decomposition of artifacts that exceed context limits.**

## When to Use

Invoke this skill when encountering content that exceeds practical token limits:

| Content Type      | Threshold     | Token Basis          |
| ----------------- | ------------- | -------------------- |
| Code files        | > 5,000 lines | ~10 tokens/line      |
| Markdown files    | > 5,000 lines | ~8-10 tokens/line    |
| PDF (general)     | > 100 pages   | ~500 tokens/page     |
| PDF (academic)    | > 60 pages    | ~800 tokens/page     |
| Word documents    | > 100 pages   | ~500 tokens/page     |
| PowerPoint        | > 75 slides   | ~400 tokens/slide    |
| JSON/XML          | > 3,000 lines | ~12-15 tokens/line   |
| Codebase analysis | > 50 files    | Aggregate assessment |

**Also trigger when user mentions:** "too large", "context limit", "break down", "won't fit", "split this"

## Token Budget Reference

```
Agent Context:     150,000 tokens
---------------------------------
System prompts:    -10,000
Agent instructions: -5,000
Tool overhead:     -15,000
Output reserve:    -20,000
---------------------------------
Usable content:    ~100,000 tokens
Safe target:        ~50,000 tokens (50% buffer for safety)
```

**Conversion rates:**

- English text: 1 token ≈ 4 characters ≈ 0.75 words
- Code: 1 token ≈ 3 characters
- Markdown is 15% more efficient than JSON/XML

## Modes

| Mode    | Purpose                                      | Use When                             |
| ------- | -------------------------------------------- | ------------------------------------ |
| analyze | Extract understanding without loading entire | "Summarize this", "What's in X"      |
| split   | Decompose monolith into logical files        | "Break this up", "Make manageable"   |
| verify  | Confirm split captured all original content  | "Did we miss anything", "Compare..." |

## Quick Start

```bash
# 1. Measure artifact and estimate tokens
wc -l file.md  # Lines
# Code: lines * 10 = estimated tokens
# Markdown: lines * 8-10 = estimated tokens

# 2. Calculate decomposition strategy
# Sections = ceil(estimated_tokens / 50,000)
# Min 2 agents, max 10 agents

# 3. Identify natural boundaries
grep -n "^#" file.md | head -50  # For markdown
grep -n "^func |^class " file.go  # For code

# 4. Dispatch parallel agents (see references/agent-prompt-templates.md)
# Each agent processes independent section

# 5. Synthesize results
# Combine outputs, verify gaps, generate deliverable
```

## Workflow

### Phase 1: Assessment

1. **Measure artifact size**
   - Lines (`wc -l`), pages, file count
   - Calculate estimated tokens using conversion rates

2. **Identify natural boundaries**
   - Documents: H1/H2 headings, chapter markers
   - Code: Functions, classes, modules, packages
   - PDF: Chapter headings, section breaks

3. **Calculate decomposition strategy**
   - Target: 50K tokens per agent (safe buffer)
   - Sections = ceil(estimated_tokens / 50,000)
   - Minimum 2 agents, maximum 10 agents

### Phase 2: Boundary Mapping

Use Grep to find logical section boundaries:

```bash
# Documents
grep -n "^#" file.md | head -50

# Code
grep -n "^func |^class |^def " file.go

# PDF - extract TOC or chapter markers via metadata
```

### Phase 3: Parallel Agent Dispatch

**Independence Rule:** No agent should depend on another agent's output. Each works on isolated section.

**Agent allocation strategy:**

| Artifact Size   | Agents | Tokens Each |
| --------------- | ------ | ----------- |
| 50-100K tokens  | 2      | ~25-50K     |
| 100-200K tokens | 3-4    | ~30-50K     |
| 200-400K tokens | 5-7    | ~30-60K     |
| 400K+ tokens    | 8-10   | ~40-50K     |

**For agent prompt templates**, see [references/agent-prompt-templates.md](references/agent-prompt-templates.md).

### Phase 4: Synthesis

1. Collect all agent outputs
2. Merge based on mode:
   - **analyze**: Combine summaries, resolve conflicts
   - **split**: Verify no gaps between sections, create index
   - **verify**: Aggregate coverage reports, flag gaps
3. Generate unified deliverable

## Output Persistence

All outputs persist to `.claude/.output/large-artifact-processing/{timestamp}-{artifact-name}/`

**Directory structure:**

```
{timestamp}-{artifact-name}/
├── MANIFEST.yaml          # Workflow metadata
├── assessment.json        # Phase 1 results
├── boundary-map.json      # Phase 2 results
├── agent-outputs/         # Phase 3 raw outputs
│   ├── section-01.json
│   ├── section-02.json
│   └── ...
└── final/                 # Phase 4 deliverables
    ├── summary.md         # analyze mode
    ├── 00-INDEX.md        # split mode
    ├── gap-report.md      # verify mode
    └── {split-files}      # split mode outputs
```

**For MANIFEST.yaml structure**, see [references/output-persistence.md](references/output-persistence.md).

## Error Handling

| Error                           | Recovery                            |
| ------------------------------- | ----------------------------------- |
| Agent timeout                   | Retry with smaller section          |
| Section boundary splits block   | Adjust boundary to nearest complete |
| Estimated tokens wildly off     | Re-assess with actual token count   |
| Agent returns incomplete output | Flag in synthesis, note gap         |

## Examples

### Example 1: Analyzing Large Codebase

```
User: "Help me understand the authentication system in this codebase"

Assessment:
- modules/auth/ contains 47 files, ~12,000 lines
- Estimated: 120,000 tokens
- Strategy: 3 agents by module subdirectory

Agents:
1. modules/auth/handlers/ (4,200 lines)
2. modules/auth/middleware/ (3,800 lines)
3. modules/auth/models/ + utils/ (4,000 lines)

Synthesis: Combined architecture summary with cross-references
```

### Example 2: Splitting Large Document

```
User: "Split ARCHITECTURE.md into manageable files"

Assessment:
- 8,500 lines, ~85,000 tokens
- 12 H1 sections identified
- Strategy: 6 agents (combine small sections)

Output:
- 01-OVERVIEW.md (sections 1-2)
- 02-BACKEND.md (sections 3-4)
- 03-FRONTEND.md (sections 5-6)
- 04-DATA-LAYER.md (sections 7-8)
- 05-SECURITY.md (sections 9-10)
- 06-DEPLOYMENT.md (sections 11-12)
- 00-INDEX.md (navigation)
```

**For more examples**, see [references/examples.md](references/examples.md).

## Checklist

Before proceeding with large artifact processing:

- [ ] Measured artifact size and estimated tokens
- [ ] Identified natural boundaries (headings, functions, etc.)
- [ ] Calculated agent count (2-10 range)
- [ ] Verified section independence (no cross-dependencies)
- [ ] Created output directory structure
- [ ] Dispatched agents in parallel
- [ ] Collected all agent outputs
- [ ] Synthesized final deliverable
- [ ] Persisted all artifacts to output directory

## Integration

### Called By

- Main conversation when encountering large artifacts
- Orchestration skills needing decomposition strategies
- Analysis workflows with token budget constraints

### Requires (invoke before starting)

| Skill                                 | When  | Purpose                                |
| ------------------------------------- | ----- | -------------------------------------- |
| `orchestrating-multi-agent-workflows` | Start | Understand agent coordination patterns |
| `persisting-agent-outputs`            | Start | Output directory structure             |

### Calls (during execution)

| Skill | Phase | Purpose                        |
| ----- | ----- | ------------------------------ |
| None  | N/A   | Terminal skill (no delegation) |

### Pairs With (conditional)

| Skill                         | Trigger          | Purpose                     |
| ----------------------------- | ---------------- | --------------------------- |
| `orchestrating-research`      | After split      | Populate split sections     |
| `verifying-before-completion` | Before synthesis | Validate agent completeness |

## Related Skills

- `orchestrating-multi-agent-workflows` - Agent coordination patterns
- `orchestrating-research` - Parallel research for content population
- `persisting-agent-outputs` - Output directory structure
- `calibrating-time-estimates` - Prevent rationalization (processing seems faster than actually is)

## References

- [Agent Prompt Templates](references/agent-prompt-templates.md) - Detailed prompts for analyze/split/verify modes
- [Output Persistence](references/output-persistence.md) - MANIFEST.yaml structure and file organization
- [Examples](references/examples.md) - Complete workflow examples with real data
- [Token Calibration](references/token-calibration.md) - Detailed conversion rates and thresholds

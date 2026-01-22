# Synthesis Algorithm

This document describes the complete workflow for synthesizing parallel agent outputs into cohesive skill understanding.

## Phase 4: Synthesis Workflow

After collecting outputs from all parallel agents (Phase 3), synthesize them into a unified understanding.

### Input Data

From Phase 2 (Context Agent):

- Skill identity (name, type, location)
- Purpose and triggers
- Main sections and phases
- Integration relationships

From Phase 3 (Reference Agents):

- Per-file purpose and content summaries
- Cross-references between files
- Reading priority classifications
- Key concepts from each reference

### Step 1: Build Cross-Reference Map

**Purpose:** Understand how skill components relate to each other

**Algorithm:**

```
1. Create empty reference_map = {}

2. For each reference file:
   a. Extract "to_skill_md" references
   b. Extract "to_other_refs" references
   c. Extract "to_external" references
   d. Store in reference_map[filename]

3. Build bidirectional relationship matrix:
   - Which SKILL.md sections reference which files?
   - Which files reference each other?
   - What's the dependency chain?

4. Identify hubs (files referenced by many others)
5. Identify leaves (files that reference nothing)
```

**Output:** JSON structure mapping file relationships

### Step 2: Determine Reading Order

**Purpose:** Provide optimal sequence for understanding the skill

**Algorithm:**

```
1. Start with SKILL.md (always first)

2. Group references by priority from Phase 3:
   - required: Must read to understand core workflow
   - recommended: Extends understanding, read second
   - advanced: Optional depth, read last

3. Within each priority group, order by dependency:
   - Files with no dependencies come first
   - Files that reference others come after their dependencies
   - Break cycles by reading "hub" files first

4. Special rules:
   - If SKILL.md references file in specific section, list it near that section
   - If multiple files extend the same SKILL.md section, list together
   - Gateway skills: routing tables before examples
```

**Output:** Ordered list of files with rationale

**Example:**

```
Reading Order:
1. SKILL.md - Always first
2. workflow.md - Required, extends Phase 1-5 sections
3. patterns.md - Recommended, depends on workflow.md concepts
4. api-reference.md - Recommended, can be read independently
5. advanced-patterns.md - Advanced, builds on patterns.md
```

### Step 3: Extract Key Patterns

**Purpose:** Identify the most important concepts users should know

**Algorithm:**

```
1. Collect all "key_concepts" from reference agents

2. Count frequency of concept mentions:
   - Concepts mentioned in multiple files = high importance
   - Concepts mentioned in SKILL.md + references = critical
   - Concepts only in one reference = specialized

3. Categorize patterns:
   - Core patterns: Used throughout skill
   - Mode-specific patterns: Apply to specific modes
   - Edge case patterns: Handle special situations

4. For each pattern, note:
   - Where it's defined (which file/section)
   - Where it's used (examples)
   - What it solves (problem statement)
```

**Output:** Hierarchical list of patterns with locations

### Step 4: Map Integration Points

**Purpose:** Show how this skill connects to the broader ecosystem

**Algorithm:**

```
1. From context.json Integration section:
   - Extract called_by relationships
   - Extract requires relationships
   - Extract calls relationships
   - Extract pairs_with relationships

2. For each relationship:
   - Verify target skill exists (core or library)
   - Extract when/where relationship applies
   - Note any conditional triggers

3. Build integration graph:
   - Upstream: Who calls this skill
   - Downstream: What this skill calls
   - Peers: Conditional companions

4. Identify integration patterns:
   - Is this a terminal skill (calls nothing)?
   - Is this an orchestrator (calls many skills)?
   - Is this middleware (called by many, calls many)?
```

**Output:** Integration graph with relationship types

### Step 5: Generate Mode-Specific Output

**Purpose:** Tailor synthesis to user's analysis mode

**Algorithms per mode:**

#### understand Mode

```
1. Use output-templates.md "understand Mode Output" template
2. Populate sections:
   - Quick Summary: 2-3 sentences from context.json purpose
   - Purpose: Expanded problem statement
   - When to Use: From context.json triggers
   - Skill Type: From context.json type/location
   - Workflow: From context.json phases with brief descriptions
   - Component Map: From Step 2 reading order + priority
   - Integration Points: From Step 4 integration graph
   - Key Patterns: From Step 3 pattern extraction
   - Common Pitfalls: From SKILL.md pitfalls section if present
3. Generate mermaid diagram showing workflow phases
```

#### compare Mode

```
1. Run synthesis for EACH input skill independently (Steps 1-4)
2. Use output-templates.md "compare Mode Output" template
3. Build comparison matrix:
   - Purpose: Side-by-side problem statements
   - Triggers: When to use each
   - Complexity: Lines, phases, tool count
   - Output: What each produces
4. Identify overlaps:
   - Common capabilities both can do
   - Unique to skill-a only
   - Unique to skill-b only
5. Generate decision guide:
   - When to use skill-a
   - When to use skill-b
   - When to use both in sequence
```

#### trace Mode

```
1. Use output-templates.md "trace Mode Output" template
2. Build dependency graph (mermaid format):
   - Start with target skill (pink node)
   - Add upstream callers (blue nodes)
   - Add downstream callees (green nodes)
   - Show relationship labels (Phase N, Conditional)
3. Full chain analysis:
   - Entry point to terminal skill path
   - Identify critical dependencies
   - Find optional branches
4. Impact analysis:
   - Direct impact: Skills that call this directly
   - Indirect impact: Skills further upstream
   - Safe to modify: Isolated components
5. Risk assessment:
   - High risk: Changes affect many upstream skills
   - Medium risk: Changes affect few skills
   - Low risk: Changes isolated to this skill
```

### Step 6: Persist Outputs

**Purpose:** Save analysis for reference and reuse

**File structure:**

```
.claude/.output/skill-analysis/{timestamp}-{skill-name}/
├── MANIFEST.yaml              # Analysis metadata
├── context.json               # Phase 2 output
├── references/                # Phase 3 outputs
│   ├── ref-01.json
│   ├── ref-02.json
│   └── ref-N.json
├── synthesis/                 # Phase 4 outputs
│   ├── cross-reference-map.json
│   ├── reading-order.md
│   ├── key-patterns.md
│   └── integration-graph.json
└── final/                     # Phase 5 outputs
    ├── understanding.md       # understand mode
    ├── comparison.md          # compare mode
    └── dependency-trace.md    # trace mode
```

**MANIFEST.yaml format:**

```yaml
skill_name: "processing-large-skills"
analysis_mode: "understand"
timestamp: "2026-01-10T14:30:00Z"
phase_2_complete: true
phase_3_complete: true
agents_spawned: 3
synthesis_complete: true
total_tokens: 2100
output_files:
  - final/understanding.md
```

## Error Handling

### Agent Failed to Return

**Problem:** Reference agent crashed or timed out

**Recovery:**

1. Check agent output file for partial results
2. If partial: Use available data, mark file as "partial analysis"
3. If empty: Re-spawn agent with same prompt
4. If repeated failure: Continue synthesis without that file, note in output

### Circular Dependencies

**Problem:** File A references B, B references A

**Recovery:**

1. Detect cycle during Step 1 cross-reference mapping
2. Break cycle by treating "hub" file (more references) as prerequisite
3. Note circular dependency in synthesis output
4. Reading order: Read hub first, then spoke

### Missing Referenced Skills

**Problem:** Integration section references skill that doesn't exist

**Recovery:**

1. Flag as broken reference in synthesis output
2. Continue analysis but mark relationship as "broken"
3. Include in "Issues Found" section of final output
4. Suggest: Check for typos or deprecated skills

### Empty Reference Files

**Problem:** Reference file exists but has no content

**Recovery:**

1. Note in synthesis: "File X exists but empty"
2. Reduce confidence in analysis completeness
3. Mark file as "requires population" in output
4. Continue with remaining files

## Success Criteria

Synthesis complete when:

- ✅ Cross-reference map built from all agents
- ✅ Reading order determined with rationale
- ✅ Key patterns extracted and categorized
- ✅ Integration points mapped
- ✅ Mode-specific output generated
- ✅ All outputs persisted to .output/ directory
- ✅ MANIFEST.yaml created with metadata

## Related

- [Agent Prompts](agent-prompts.md) - Phase 2/3 prompt templates
- [Output Templates](output-templates.md) - Phase 5 output formats

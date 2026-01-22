# Agent Prompt Templates

**Detailed prompt templates for parallel agent dispatch in analyze, split, and verify modes.**

---

## Template Structure

All agent prompts follow this structure:

1. **Task declaration** - What mode and section
2. **Context** - Which artifact, which section, total sections
3. **Instructions** - Step-by-step process
4. **Output format** - JSON structure (parseable)
5. **Constraints** - Boundaries and limitations

---

## For Analyze Mode

**Purpose:** Extract understanding without loading entire artifact.

**Output:** Structured summary with sections, key findings, cross-references.

### Template

```
TASK: Analyze section of large artifact
ARTIFACT: {path}
SECTION: Lines {start}-{end} OR Pages {start}-{end}
TOTAL SECTIONS: {n} (you are section {i} of {n})

READ the specified section and extract:

1. STRUCTURE
   - Main headings/sections within your range
   - Hierarchy and organization

2. KEY CONTENT
   - Core concepts, definitions, important points
   - Code: Functions, classes, key logic
   - Docs: Main arguments, conclusions, data

3. CROSS-REFERENCES
   - References to content outside your section
   - Dependencies on other sections
   - Terms defined elsewhere

4. SUMMARY
   - 3-5 bullet points capturing essence
   - Notable omissions or gaps

OUTPUT FORMAT (JSON):
{
  "section": {i},
  "line_range": "{start}-{end}",
  "headings": ["..."],
  "key_points": ["..."],
  "cross_references": ["..."],
  "summary": "...",
  "confidence": "high|medium|low"
}

CONSTRAINTS:
- Stay within assigned line/page range
- Do not read beyond your section
- Flag if section boundary splits logical unit
```

### Example Invocation

```
TASK: Analyze section of large artifact
ARTIFACT: /path/to/THREAT-MODEL.md
SECTION: Lines 1-1500
TOTAL SECTIONS: 5 (you are section 1 of 5)

READ lines 1-1500 and extract:
[... rest of template ...]
```

---

## For Split Mode

**Purpose:** Decompose monolith into logical smaller files.

**Output:** New files + 00-INDEX.md with navigation map.

### Template

```
TASK: Extract section into standalone file
ARTIFACT: {path}
SECTION: Lines {start}-{end}
OUTPUT FILE: {output_path}
TOTAL SECTIONS: {n} (you are section {i} of {n})

PROCESS:
1. Read your assigned section
2. Identify logical boundaries within section
3. Extract content preserving:
   - All headings, text, code blocks
   - Internal cross-references
   - Formatting and structure

4. Add navigation header:
   # {Section Title}

   > Part {i} of {n} - Split from [{original_filename}]({relative_path})
   > Lines {start}-{end} of original

   **Navigation:** [Previous](...) | [Index](00-INDEX.md) | [Next](...)

5. Write to output file

OUTPUT FORMAT (JSON):
{
  "section": {i},
  "input_lines": "{start}-{end}",
  "output_file": "{path}",
  "title": "...",
  "headings_preserved": ["..."],
  "word_count": n,
  "notes": "any boundary issues or decisions made"
}
```

### Example Invocation

```
TASK: Extract section into standalone file
ARTIFACT: /path/to/ARCHITECTURE.md
SECTION: Lines 1-1420
OUTPUT FILE: /path/to/output/01-OVERVIEW.md
TOTAL SECTIONS: 6 (you are section 1 of 6)

PROCESS:
[... rest of template ...]
```

---

## For Verify Mode

**Purpose:** Confirm split captured all original content.

**Output:** Gap report with coverage matrix.

### Template

```
TASK: Verify split file captures original content
ORIGINAL: {original_path}
SPLIT FILE: {split_path}
EXPECTED COVERAGE: Lines {start}-{end} of original
SECTION: {i} of {n}

PROCESS:
1. Read the split file completely
2. Extract all:
   - H2/H3 headings
   - Code blocks (first line of each)
   - Key technical terms (5-10 unique)
   - Numerical values, URLs, file paths

3. Search original file (lines {start}-{end}) for each extracted item
4. Categorize findings:
   - FOUND: Item exists in original section
   - MISSING: Item in split but not in original (added content)
   - GAP: Item in original but not in split (lost content)

5. Calculate coverage percentage

OUTPUT FORMAT (JSON):
{
  "section": {i},
  "split_file": "{path}",
  "original_lines": "{start}-{end}",
  "items_checked": n,
  "found": n,
  "missing_from_original": ["..."],
  "gaps_in_split": ["..."],
  "coverage_percent": n,
  "status": "complete | minor gaps | significant gaps",
  "notes": "..."
}

SEARCH COMMANDS:
- Use Grep tool with pattern matching
- For headings: grep "^##" in both files
- For code blocks: grep with context
- For terms: case-insensitive search
```

### Example Invocation

```
TASK: Verify split file captures original content
ORIGINAL: /path/to/THREAT-MODEL.md
SPLIT FILE: /path/to/output/01-ARCHITECTURE.md
EXPECTED COVERAGE: Lines 1-1385 of original
SECTION: 1 of 5

PROCESS:
[... rest of template ...]
```

---

## Agent Dispatch Pattern

When dispatching agents in parallel:

```typescript
// Pseudo-code for orchestrator
const agents = [];
for (let i = 0; i < sections.length; i++) {
  const agent = Task({
    subagent_type: "general-purpose",
    description: `${mode} section ${i + 1} of ${sections.length}`,
    prompt: fillTemplate(mode, {
      path: artifact.path,
      start: sections[i].start,
      end: sections[i].end,
      i: i + 1,
      n: sections.length,
      output_path: mode === "split" ? `output/${i + 1}-${sections[i].title}.md` : undefined,
    }),
  });
  agents.push(agent);
}

// Dispatch all agents in parallel (single message with multiple Task calls)
// Wait for all to complete
// Proceed to synthesis
```

---

## Output Collection

After agents complete, collect outputs:

```bash
# Create agent-outputs directory
mkdir -p .claude/.output/large-artifact-processing/{timestamp}/agent-outputs

# Agents write to:
# - agent-outputs/section-01.json
# - agent-outputs/section-02.json
# - ...

# Orchestrator reads all section-*.json files and synthesizes
```

---

## Error Handling in Agent Prompts

Include these failure modes in agent instructions:

```
ERROR HANDLING:
- If section boundary splits logical unit (e.g., code block, table):
  Flag in output JSON: "boundary_issue": "Section splits XYZ"

- If cross-reference target is outside your section:
  Record in cross_references array with line number if available

- If content appears incomplete or truncated:
  Set confidence: "low" and explain in notes field
```

This ensures agents surface issues rather than silently failing.

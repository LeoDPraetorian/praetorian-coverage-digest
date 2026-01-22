# Phase 26 Reporting Examples

## Per-File Reporting (MANDATORY)

For Phase 26 (Reference Content Quality), you MUST report EACH stub file as a separate finding. Do NOT aggregate multiple stubs into a single finding.

### ❌ WRONG - Aggregated (fixing-skills cannot enumerate)

```
[CRITICAL] Phase 26: Reference Content Quality - 3 stub files detected
Location: references/
Recommendation: Populate stub files via research
```

### ✅ CORRECT - Per-file (fixing-skills can create TodoWrite per file)

```
[CRITICAL] Phase 26: Genuine stub - workflow.md
Location: references/workflow.md
Content: 12 lines, mostly headers, no substantive content
Recommendation: Populate via orchestrating-research

[CRITICAL] Phase 26: Genuine stub - api-reference.md
Location: references/api-reference.md
Content: Empty file (0 bytes)
Recommendation: Populate via orchestrating-research

[CRITICAL] Phase 26: Genuine stub - patterns.md
Location: references/patterns.md
Content: Contains '[Content to be added]' placeholder
Recommendation: Populate via orchestrating-research
```

## Why Per-File Reporting Matters

- fixing-skills creates one TodoWrite item per finding
- Aggregated findings result in single 'Fix Phase 26' item
- Per-file findings enable 'Populate workflow.md', 'Populate api-reference.md', etc.
- This ensures ALL stubs get tracked and populated

## Complete Example (Multiple Stubs)

When multiple stub files are detected, report each separately:

```
[CRITICAL] Phase 26: Genuine stub - workflow.md
Location: references/workflow.md
Content: File exists but only contains '# Workflow' header (1 line)
Classification: Genuine stub (not template, not redirect)
Recommendation: Populate via orchestrating-research with query 'workflow patterns for {skill-topic}'

[CRITICAL] Phase 26: Genuine stub - api-reference.md
Location: references/api-reference.md
Content: Empty file (0 bytes)
Classification: Genuine stub
Recommendation: Populate via orchestrating-research with Context7 source

[WARNING] Phase 26: Near-stub - patterns.md
Location: references/patterns.md
Content: 45 lines but 30 are code block structure, only 15 lines of prose
Classification: Borderline - has structure but lacks examples
Recommendation: Expand with concrete examples from research
```

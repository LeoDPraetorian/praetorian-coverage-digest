---
name: converting-books-to-skills
description: Use when converting technical books to skills with chapter detection, keyword extraction, and progressive disclosure.
allowed-tools: Read, Write, Edit, Bash, Grep, Glob, TodoWrite, AskUserQuestion
---

# Converting Books to Skills

**Automated workflow for transforming OCR'd technical books into well-structured skills with chapter-based reference documents.**

## When to Use

Use this skill when:

- Converting OCR'd technical books (markdown format) into skills
- Converting EPUB ebooks to skills (use `converting-epub-to-markdown` first)
- Organizing large technical references into discoverable skill format
- Updating existing book-based skills with improved OCR versions
- Creating chapter-based reference documentation from book content
- Building keyword-searchable technical knowledge bases

## Quick Reference

| Phase                | Purpose                                       | Output                              |
| -------------------- | --------------------------------------------- | ----------------------------------- |
| 1. Validation        | Verify book file exists and is valid markdown | Book path confirmed                 |
| 2. TOC Analysis      | Extract keywords from table of contents       | Keyword list for description        |
| 3. Chapter Detection | Identify chapter boundaries from headers      | Chapter boundary markers            |
| 4. Chunking          | Split book into chapter files                 | `references/chapters/chapter-XX.md` |
| 5. Skill Generation  | Create SKILL.md with chapter summaries        | Main skill document                 |
| 6. Location          | Determine skill category and placement        | Skill directory path                |
| 7. Verification      | Test skill discovery with book topics         | Skill loads on relevant queries     |

## Core Workflow

### Step 0: Prerequisites

Before starting conversion:

```bash
# Navigate to repository root
ROOT="$(git rev-parse --show-superproject-working-tree --show-toplevel | head -1)" && cd "$ROOT"

# Verify book file exists (user provides the path)
ls {path-to-book-file}.md
```

**Input required from user:**

- Path to markdown file containing the book
- Desired skill name (kebab-case)

**For EPUB files:** First use `converting-epub-to-markdown` skill to extract markdown:
```
Read(".claude/skill-library/claude/skill-management/converting-epub-to-markdown/SKILL.md")
```

**Cannot proceed without valid markdown file** ✅

### Step 1: Validate Book File

Verify the book markdown is properly formatted:

```bash
# Check file size (OCR books are typically 10K-30K lines)
wc -l {path-to-book-file}.md

# Preview first 200 lines to identify structure
head -200 {path-to-book-file}.md
```

**Look for:**

- Table of Contents section (usually in first 300 lines)
- Chapter markers (e.g., `## CHAPTER 8`, `## 1  INFECTION VECTORS`)
- Consistent header patterns for chapter detection

**Real examples from today's conversion:**

- Windows Internals Part 2: `## CHAPTER 8  System mechanisms` (line 534)
- Mac Malware Vol 1: `## 1  INFECTION VECTORS` (line 640)
- Mac Malware Vol 2: `## 1  EXAMINING PROCESSES` (line 548)

### Step 2: Extract Keywords from Table of Contents

The TOC typically contains the best keywords for skill description:

```bash
# Find TOC section (usually marked with "Table of Contents" or "Contents")
grep -n -i "table of contents\|^contents$\|^## BRIEF CONTENTS" {path-to-book-file}.md

# Extract chapter titles from TOC (adjust line range based on grep results)
sed -n '100,300p' {path-to-book-file}.md | grep -i "chapter"
```

**Manual keyword selection:**

1. Read extracted chapter titles from TOC
2. Identify 5-10 core technical topics
3. Use these for skill description

**Real examples from today's conversion:**

- Windows Internals Part 2: "system mechanisms, virtualization, VBS, VSM, registry, ETW, NTFS, boot"
- Mac Malware Vol 1: "infection vectors, persistence, capabilities, Mach-O, disassembly, anti-analysis"
- Mac Malware Vol 2: "Endpoint Security, code signing, network monitoring, tool development"

**See:** [references/keyword-extraction-patterns.md](references/keyword-extraction-patterns.md) for TOC parsing strategies.

### Step 3: Detect Chapter Boundaries

Identify the markdown header pattern used for chapters:

```bash
# Search for common chapter patterns
grep -n "^##\s\+CHAPTER\|^##\s\+[0-9]\|^##\s\+[0-9][0-9]" {path-to-book-file}.md | head -20
```

**Common patterns found in production:**

- `## CHAPTER 8  System mechanisms` (Windows Internals - H2 with "CHAPTER" keyword)
- `## 1  INFECTION VECTORS` (Mac Malware - H2 with digit and double space)
- `## {digit}  {TITLE}` (most common - note the double space)

**Record the pattern and line numbers** - you'll use these exact boundaries for extraction.

**CRITICAL: Verify chapter sequence**

After detecting chapter markers, verify no chapters are missing:

```bash
# List all detected chapters in order
grep -n "^##\s\+CHAPTER\|^##\s\+[0-9]" {path-to-book-file}.md

# Check the sequence for gaps (e.g., 1,2,3,8,9,10 - missing 4-7)
```

**Production note:** In today's conversion, we successfully detected:

- Windows Part 2: Chapters 8-12 (no gaps)
- Mac Vol 1: Chapters 1-11 (sequential)
- Mac Vol 2: Chapters 1-14 (sequential, but some chapter numbers on separate lines from headers)

**If the list looks incomplete or has gaps:**

Check the table of contents to see which chapters should exist, then search for missing chapter numbers in the file.

**See:** [references/ocr-gap-detection.md](references/ocr-gap-detection.md) for gap detection techniques.

### Step 4: Split Book into Chapter Files

**🚨 CRITICAL REQUIREMENT:**

**SKILL.md files MUST ONLY reference chapter files in `references/chapters/`, NEVER the full `Books/*.md` files.**

The Books/ files are too large to parse efficiently. All user-facing documentation in SKILL.md must point to chapter files only.

**Chunking Requirements:**

- **Target:** <25,000 tokens per chunk (Read tool limit)
- **Token estimation:** ~4 characters = 1 token, so max ~100,000 characters per file
- **Minimum:** 5+ chunks per book (ensures granular access)
- **Primary strategy:** Split by chapters
- **Fallback:** If book has <5 chapters, split by H2 sections within chapters
- **MANDATORY:** Extract ALL chapters from Books/ into chapter files, then update SKILL.md to reference only chapter files

**Validation:**

```bash
# After splitting, check chunk sizes (both lines and tokens)
wc -l references/chapters/*.md

# Check token counts (character count / 4 = approximate tokens)
for f in references/chapters/*.md; do
  chars=$(wc -c < "$f")
  tokens=$((chars / 4))
  echo "$f: $tokens tokens (approx)"
done

# Check for violations:
# - Any file >25,000 tokens (~100,000 characters)? → Need semantic splitting
# - Total count <5? → Need finer granularity (H2 sections)
```

**Step 4.5: Split Oversized Chapters (if needed)**

**If any chapter exceeds 25,000 tokens (~100,000 characters):**

1. Check token count: `chars=$(wc -c < chapter-NN.md); echo "$((chars / 4)) tokens (approx)"`
2. Find semantic split point: `grep -n "^##[^#]" chapter-NN.md`
3. Identify major topic shift around the midpoint
4. Split at that boundary using sed
5. Name as `chapter-NN-part1.md` and `chapter-NN-part2.md`
6. Delete the original unsplit chapter file
7. Re-validate: both parts should be <25,000 tokens (~100,000 characters)

**Production example (Windows Part 2 Chapter 8 - 8,389 lines, ~33,556 tokens):**

```bash
# Check token count first
chars=$(wc -c < chapter-08.md); echo "$((chars / 4)) tokens (approx)"

# Found semantic split at line 4300 (## Executive objects - major topic shift)
sed -n '1,4299p' chapter-08.md > chapter-08-part1.md    # 4,299 lines, ~17,196 tokens ✓
sed -n '4300,8389p' chapter-08.md > chapter-08-part2.md  # 4,090 lines, ~16,360 tokens ✓
rm chapter-08.md  # Remove unsplit version

# Verify both parts are under 25,000 token limit
for f in chapter-08-part*.md; do
  chars=$(wc -c < "$f")
  echo "$f: $((chars / 4)) tokens (approx)"
done
```

**Production example (Chapter 10 - 5,687 lines, ~22,748 tokens):**

```bash
# Check if splitting needed
chars=$(wc -c < chapter-10.md); echo "$((chars / 4)) tokens (approx)"

# Split at line 2668 (## Windows Management Instrumentation)
sed -n '1,2668p' chapter-10.md > chapter-10-part1.md    # 2,668 lines, ~10,672 tokens ✓
sed -n '2669,5687p' chapter-10.md > chapter-10-part2.md  # 3,019 lines, ~12,076 tokens ✓
rm chapter-10.md
```

**Result:** Oversized chapters (>25,000 tokens) split successfully, all parts now under token limit.

**Manual sed extraction (recommended - precise control):**

```bash
# Create chapters directory
mkdir -p .claude/skill-library/{category}/{skill-name}/references/chapters

# Extract each chapter using line boundaries from Step 3
# Format: sed -n '{start},{end}p' {source} > {output}

# Example from today's conversion (Windows Part 2):
sed -n '534,8922p' {path-to-book-file}.md > .claude/skill-library/{path}/references/chapters/chapter-08.md
sed -n '8923,12692p' {path-to-book-file}.md > .claude/skill-library/{path}/references/chapters/chapter-09.md
# ... repeat for each chapter

# Verify extraction
wc -l .claude/skill-library/{path}/references/chapters/*.md
```

**Production evidence from today:**

- Windows Part 2: Used exact line boundaries (534, 8923, 12693, 18380, 24803, 27497)
- Mac Vol 1: Used boundaries (640, 1124, 1888, 2526, etc.)
- Mac Vol 2: Used boundaries (548, 3347, 4923, etc.)

**Result:** All chapters extracted successfully with exact content boundaries.

**Expected output:**

- `chapter-01.md` through `chapter-NN.md` - Main chapters (numbered to match book)
- Each file <5,000 lines initially (will split oversized ones in next step)
- Total: 8-14 chapter files typical for technical books
- Chapter numbers match the book's numbering (e.g., Windows Part 2 has chapters 8-12, not 1-5)

**See:** [references/chapter-splitting-techniques.md](references/chapter-splitting-techniques.md) for handling complex book structures.

### Step 5: Generate SKILL.md with Chapter Summaries

**🚨 CRITICAL REQUIREMENT:**

**SKILL.md files MUST ONLY reference chapter files in `references/chapters/`, NEVER the source book file.**

The source markdown files are too large to parse efficiently. All user-facing documentation in SKILL.md must point to chapter files only.

**Required template:**

```markdown
---
name: { book-topic-skill-name }
description: Use when {keywords extracted from TOC} - {book purpose}
allowed-tools: Read, Grep, Bash
---

# {Book Title}

**{1-2 sentence description of book scope and purpose.}**

## When to Use

Use this skill when:

- {Topic area 1 from TOC}
- {Topic area 2 from TOC}
- {Topic area 3 from TOC}

## Book Overview

**Author**: {Author name}
**Edition**: {Edition info}
**Publisher**: {Publisher}
**Coverage**: {OS/platform versions covered}

{2-3 paragraphs describing book scope, author expertise, and value}

## Book Structure

All chapters are located in `references/chapters/` within this skill directory. {Note about organization}

### {Part/Section Name if applicable}

| File          | Chapter | Lines | Topics Covered | Key Content |
| ------------- | ------- | ----- | -------------- | ----------- |
| chapter-01.md | 1       | XXX   | {Topic}        | {Summary}   |
| chapter-02.md | 2       | XXX   | {Topic}        | {Summary}   |

[... repeat for all chapters ...]

## How to Use

### Reading Specific Chapters

To access chapter content, use the Read tool with the chapter file path:

\`\`\`markdown
Read(".claude/skill-library/{category}/{skill-name}/references/chapters/chapter-01.md")
\`\`\`

**Chapter selection guide:**

- {Topic area} → chapter-XX.md ({description})

### Search Across Chapters

Use Grep to search across all chapters:

\`\`\`bash

# Search all chapters for a topic

grep -i "keyword" .claude/skill-library/{category}/{skill-name}/references/chapters/\*.md

# Search with context

grep -i -C 5 "keyword" .claude/skill-library/{category}/{skill-name}/references/chapters/\*.md

# Find which chapter(s) contain a topic

grep -l "search term" .claude/skill-library/{category}/{skill-name}/references/chapters/\*.md
\`\`\`

## Notes

- **Chapter organization**: {N} chapter files ({total} lines total), all under 25,000 tokens
```

**CRITICAL CHECKS:**

- ❌ **NEVER** include `Read("{source-file-path}")` in SKILL.md
- ❌ **NEVER** include `grep "pattern" {source-file}` examples
- ✅ **ALWAYS** reference `references/chapters/chapter-XX.md` files
- ✅ **ALWAYS** provide chapter-level navigation and search examples

**Target: 300-450 lines** including chapter summaries.

**See:** [references/chapter-summarization-guide.md](references/chapter-summarization-guide.md) for writing effective summaries.

### Step 6: Determine Skill Location and Category

Ask user via AskUserQuestion:

```
Question: Which category should this book skill belong to?

Options based on book content:
1. security/{subcategory}/ - Security-focused books
2. development/{subcategory}/ - Development practices
3. infrastructure/{subcategory}/ - Infrastructure and operations
4. {custom-category}/ - Create new category
```

**Examples from existing books:**

- Windows Security Internals → `security/windows/`
- Art of Mac Malware → `security/macos/` (if created)
- Evading EDR → `security/evasion/` or `security/windows/`

**Pattern**: Group related books together for easy discovery.

### Step 7: Verify Skill Discovery

Test that Claude loads the skill when relevant topics are queried:

```bash
# Test query examples (run in fresh Claude Code conversation)
"Explain Windows access control mechanisms"  # Should load windows-security-internals skill
"How does kernel mode authentication work?"  # Should load windows-security-internals skill
```

**Verification checklist:**

- [ ] Skill appears in gateway routing table (if library skill)
- [ ] Keywords in description match chapter content
- [ ] Test queries trigger skill loading
- [ ] Chapter references are accessible

**Cannot mark conversion complete without verification** ✅

## Handling Improved OCR Versions

When replacing an existing book skill with improved OCR:

1. **Backup existing skill:**

   ```bash
   cp -r .claude/skill-library/{category}/{old-skill}/ \
         .claude/skill-library/{category}/{old-skill}.backup/
   ```

2. **Run conversion workflow with new book file:**
   - Use same skill name for replacement
   - Update "OCR Quality" field in Book Information
   - Preserve existing chapter summaries if still accurate

3. **Diff chapter content:**

   ```bash
   diff -u {old-skill}/references/chapters/chapter-01.md \
           {new-skill}/references/chapters/chapter-01.md
   ```

4. **Update changelog:**
   - Document OCR improvements
   - Note any structural changes

**See:** [references/ocr-improvement-workflow.md](references/ocr-improvement-workflow.md) for detailed replacement strategy.

## Common Issues and Solutions

For common issues encountered during book conversion (missing chapters, oversized chapters, unclear boundaries, generic keywords), see:

**[references/common-issues.md](references/common-issues.md)** - Complete troubleshooting guide with solutions

## Integration

### Called By

- `/skill-manager create` command when user specifies book conversion
- `creating-skills` skill when creating book-based skills
- Manual invocation: `Read(".claude/skill-library/claude/skill-management/converting-books-to-skills/SKILL.md")`

### Requires (invoke before starting)

| Skill                   | When | Purpose                 |
| ----------------------- | ---- | ----------------------- |
| None - standalone skill | N/A  | Self-contained workflow |

### Calls (during execution)

| Skill             | Phase/Step | Purpose                                 |
| ----------------- | ---------- | --------------------------------------- |
| `creating-skills` | Step 6     | If user wants to create skill structure |
| `updating-skills` | Step 7     | If replacing existing book skill        |

### Pairs With (conditional)

| Skill                        | Trigger                | Purpose                           |
| ---------------------------- | ---------------------- | --------------------------------- |
| `converting-epub-to-markdown` | EPUB input file        | Convert EPUB to markdown first    |
| `managing-skills`            | After conversion       | Audit new skill for compliance    |
| `searching-skills`           | Before conversion      | Check if book skill exists        |
| `gateway-*`                  | Step 6 location select | Route skill to appropriate domain |

## Related Skills

- `converting-epub-to-markdown` - Convert EPUB ebooks to markdown (prerequisite for EPUB files)
- `creating-skills` - General skill creation workflow (this skill is specialized for books)
- `updating-skills` - For replacing book skills with improved OCR versions
- `managing-skills` - Audit and fix book skills post-conversion
- `orchestrating-research` - For researching book topics during skill creation

**Existing book-based skills created with this workflow:**

- `windows-internals` - Windows Internals 7th Ed Part 1 (security/windows/)
- `windows-internals-part2` - Windows Internals 7th Ed Part 2 (security/windows/)
- `windows-security-internals` - Windows Security Internals (security/windows/)
- `evading-edr` - Evading EDR book (security/windows/)
- `art-of-mac-malware-development` - Art of Mac Malware Vol 1 (security/macos/)
- `art-of-mac-malware-detection` - Art of Mac Malware Vol 2 (security/macos/)

## Changelog

See [.history/CHANGELOG](.history/CHANGELOG) for version history.

## Examples

See [examples/](examples/) directory for:

- `windows-security-internals-conversion.md` - Complete conversion example
- `keyword-extraction-examples.md` - TOC keyword selection strategies
- `chapter-detection-examples.md` - Various chapter pattern examples

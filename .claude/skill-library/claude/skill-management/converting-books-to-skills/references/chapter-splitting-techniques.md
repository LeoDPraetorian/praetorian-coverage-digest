# Chapter Splitting Techniques

**Practical methods for extracting chapters from markdown books after boundary detection.**

## Overview

After detecting chapter boundaries (see [chapter-detection-strategies.md](chapter-detection-strategies.md)), you need to extract content between boundaries into separate files. This document covers proven techniques with code examples.

## Chunking Requirements

**Target:** <5,000 lines per chunk (ensures content is loadable into Claude context entirely)
**Minimum:** 5+ chunks per book (provides granular access to topics)

**Validation after splitting:**
```bash
# Check all chunk sizes
wc -l references/chapters/*.md

# Verify:
# - No file exceeds 5,000 lines
# - Total file count ≥ 5
```

**If book has <5 chapters:** Use finer granularity (H2 sections within chapters) to meet minimum requirement.

---

## Technique 1: Manual sed Extraction (Simple, Controlled)

### When to Use

✅ **Use manual sed when:**
- Converting 3-10 books
- Want full control over each chapter
- Can review each extraction step
- Prefer simplicity over automation

### Workflow

**Step 1: Get chapter boundary line numbers**
```bash
# Extract chapter headers with line numbers
grep -n "^## [0-9]" Books/WindowsSecurityInternals.md > boundaries.txt

# Example output:
# 156:## 0 Introduction
# 1847:## 1 Windows Authentication
# 4235:## 2 Access Control
# 7891:## 3 Cryptography
```

**Step 2: Create chapter extraction script**
```bash
#!/bin/bash
# extract-chapters.sh

BOOK="Books/WindowsSecurityInternals.md"
OUTPUT_DIR="references/chapters"

mkdir -p "$OUTPUT_DIR"

# Chapter 0: lines 156-1846
sed -n '156,1846p' "$BOOK" > "$OUTPUT_DIR/chapter-00.md"

# Chapter 1: lines 1847-4234
sed -n '1847,4234p' "$BOOK" > "$OUTPUT_DIR/chapter-01.md"

# Chapter 2: lines 4235-7890
sed -n '4235,7890p' "$BOOK" > "$OUTPUT_DIR/chapter-02.md"

# Chapter 3: lines 7891-EOF
sed -n '7891,$p' "$BOOK" > "$OUTPUT_DIR/chapter-03.md"

echo "Extracted 4 chapters to $OUTPUT_DIR"
```

**Step 3: Run and validate**
```bash
chmod +x extract-chapters.sh
./extract-chapters.sh

# Validate file sizes
ls -lh references/chapters/

# Validate no content loss
wc -l Books/WindowsSecurityInternals.md
wc -l references/chapters/*.md | tail -1  # Should match total
```

### Advantages

- Full control over each chapter
- Easy to debug (one chapter at a time)
- No dependencies (standard bash)
- Can handle edge cases manually

### Disadvantages

- Tedious for 20+ chapter books
- Manual line number calculation
- Error-prone for large books

---

## Technique 2: Automated awk Splitting (Fast, Scalable)

### When to Use

✅ **Use awk when:**
- Converting 10+ books
- Consistent chapter patterns
- Want one-command extraction
- Comfortable with awk syntax

### Implementation

**Basic awk splitter:**
```bash
awk '
/^## [0-9]+/ {
  # Close previous chapter file
  close(out)

  # Increment chapter counter
  chapter_num = sprintf("%02d", ++i)

  # Create output filename
  out = "references/chapters/chapter-" chapter_num ".md"

  print "Creating: " out > "/dev/stderr"
}
{
  # Write line to current chapter file
  if (out) print > out
}
' Books/book.md
```

**Enhanced version with metadata:**
```bash
awk '
BEGIN {
  output_dir = "references/chapters"
  system("mkdir -p " output_dir)
}

/^## [0-9]+/ {
  # Close previous file
  if (out) close(out)

  # Extract chapter number and title
  match($0, /^## ([0-9]+)\s+(.+)/, parts)
  num = parts[1]
  title = parts[2]

  # Zero-padded filename
  chapter_num = sprintf("%02d", num)
  out = output_dir "/chapter-" chapter_num ".md"

  print "Chapter " num ": " title > "/dev/stderr"

  # Write metadata comment at top of file
  print "<!-- Chapter " num ": " title " -->" > out
}
{
  # Write all lines to current chapter
  if (out) print >> out
}

END {
  if (out) close(out)
  print "Extraction complete!" > "/dev/stderr"
}
' Books/book.md
```

**Usage:**
```bash
# Run with error output visible
awk -f split-chapters.awk Books/WindowsSecurityInternals.md

# Output:
# Chapter 0: Introduction
# Chapter 1: Windows Authentication
# Chapter 2: Access Control
# ...
# Extraction complete!
```

### Advantages

- One command for entire book
- Handles variable chapter counts
- Fast execution (<1 second for most books)
- Portable (awk available everywhere)

### Disadvantages

- Assumes consistent chapter pattern
- Less control over individual chapters
- Harder to debug than manual approach

---

## Technique 3: Python Script (Full Control, Validation)

### When to Use

✅ **Use Python when:**
- Need OCR artifact filtering
- Want validation during extraction
- Require metadata generation
- Python environment available

### Implementation

```python
#!/usr/bin/env python3
"""
Split markdown book into chapters with validation.
"""
import re
import os
from pathlib import Path

def split_book(book_path, output_dir, pattern=r'^## (\d+)\s+(.+)$'):
    """
    Split book into chapters based on header pattern.

    Args:
        book_path: Path to markdown book file
        output_dir: Directory to write chapter files
        pattern: Regex pattern for chapter headers
    """
    # Create output directory
    os.makedirs(output_dir, exist_ok=True)

    # Read book
    with open(book_path, 'r', encoding='utf-8') as f:
        lines = f.readlines()

    # Detect chapter boundaries
    chapters = []
    current_chapter = None

    for line_num, line in enumerate(lines, start=1):
        match = re.match(pattern, line)
        if match:
            # Save previous chapter
            if current_chapter:
                current_chapter['end_line'] = line_num - 1
                chapters.append(current_chapter)

            # Start new chapter
            chapter_num = int(match.group(1))
            chapter_title = match.group(2).strip()

            current_chapter = {
                'number': chapter_num,
                'title': chapter_title,
                'start_line': line_num,
                'end_line': None  # Will be set when next chapter found
            }

    # Add last chapter
    if current_chapter:
        current_chapter['end_line'] = len(lines)
        chapters.append(current_chapter)

    print(f"Detected {len(chapters)} chapters")

    # Extract chapters
    for chapter in chapters:
        # Zero-padded filename
        filename = f"chapter-{chapter['number']:02d}.md"
        filepath = Path(output_dir) / filename

        # Extract lines
        start_idx = chapter['start_line'] - 1  # Convert to 0-indexed
        end_idx = chapter['end_line']
        chapter_lines = lines[start_idx:end_idx]

        # Write to file
        with open(filepath, 'w', encoding='utf-8') as f:
            f.writelines(chapter_lines)

        # Validate
        word_count = sum(len(line.split()) for line in chapter_lines)
        print(f"✓ {filename}: {chapter['title']} ({len(chapter_lines)} lines, {word_count} words)")

    # Summary
    print(f"\nExtraction complete!")
    print(f"Output directory: {output_dir}")
    print(f"Total chapters: {len(chapters)}")

if __name__ == '__main__':
    import sys

    if len(sys.argv) < 2:
        print("Usage: python split-chapters.py <book.md> [output_dir]")
        sys.exit(1)

    book_path = sys.argv[1]
    output_dir = sys.argv[2] if len(sys.argv) > 2 else 'references/chapters'

    split_book(book_path, output_dir)
```

**Usage:**
```bash
python split-chapters.py Books/WindowsSecurityInternals.md references/chapters

# Output:
# Detected 15 chapters
# ✓ chapter-00.md: Introduction (124 lines, 1847 words)
# ✓ chapter-01.md: Windows Authentication (287 lines, 4235 words)
# ...
# Extraction complete!
# Output directory: references/chapters
# Total chapters: 15
```

### Advantages

- Full control with validation
- Easy to extend (add OCR filtering, metadata generation)
- Readable code (easier to maintain than awk)
- Error handling

### Disadvantages

- Requires Python 3.6+
- Slower than awk (not significant for 3-20 books)
- More code to maintain

---

## Technique 4: Hybrid (Detect with Regex, Split with Python)

### When to Use

✅ **Use hybrid when:**
- Want to validate detection before extraction
- Need to handle edge cases
- Prefer two-phase workflow

### Workflow

**Step 1: Detect and validate boundaries**
```bash
# Extract candidates
grep -n "^## [0-9]" Books/book.md > candidates.txt

# Manual review of candidates.txt
# Remove any false positives, add missing chapters
```

**Step 2: Split with validated boundaries**
```python
def split_with_boundaries(book_path, boundaries_file, output_dir):
    """Split book using pre-validated boundary file."""
    # Read boundaries
    with open(boundaries_file, 'r') as f:
        boundaries = []
        for line in f:
            # Parse: "156:## 0 Introduction"
            parts = line.split(':', 1)
            line_num = int(parts[0])
            header = parts[1].strip()

            match = re.match(r'^## (\d+)\s+(.+)$', header)
            if match:
                boundaries.append({
                    'number': int(match.group(1)),
                    'title': match.group(2),
                    'line': line_num
                })

    # Read book
    with open(book_path, 'r') as f:
        lines = f.readlines()

    # Extract chapters using boundaries
    os.makedirs(output_dir, exist_ok=True)

    for i, boundary in enumerate(boundaries):
        start_line = boundary['line'] - 1  # 0-indexed
        end_line = boundaries[i + 1]['line'] - 1 if i + 1 < len(boundaries) else len(lines)

        filename = f"chapter-{boundary['number']:02d}.md"
        filepath = os.path.join(output_dir, filename)

        with open(filepath, 'w') as f:
            f.writelines(lines[start_line:end_line])

        print(f"✓ {filename}: {boundary['title']}")
```

---

## Technique 5: Finer Chunking (For Books <5 Chapters)

### When to Use

✅ **Use finer chunking when:**
- Book has <5 chapters (doesn't meet minimum requirement)
- Individual chapters exceed 5,000 lines
- Need more granular topic access

### Strategy: Split by H2 Sections

Instead of splitting only at chapter boundaries (H1 or H2), split at the next header level down:

**If chapters use H1:**
```bash
# Split at H2 level (sections within chapters)
awk '/^## / {
  close(out);
  section_num = sprintf("%02d", ++i);
  out = "references/chapters/section-" section_num ".md"
}
{ if (out) print > out }
' Books/book.md
```

**If chapters use H2:**
```bash
# Split at H3 level (subsections within chapters)
awk '/^### / {
  close(out);
  section_num = sprintf("%02d", ++i);
  out = "references/chapters/section-" section_num ".md"
}
{ if (out) print > out }
' Books/book.md
```

### Hybrid Approach

Combine chapter and section splitting:

```python
def split_with_granularity(book_path, output_dir, max_lines=5000, min_chunks=5):
    """
    Split book intelligently based on constraints.

    Args:
        book_path: Path to book markdown
        output_dir: Where to write chunks
        max_lines: Maximum lines per chunk (default: 5000)
        min_chunks: Minimum total chunks (default: 5)
    """
    # First, try chapter-level split
    chapters = detect_and_split_chapters(book_path)

    # Check if meets requirements
    if len(chapters) >= min_chunks and all(len(ch) < max_lines for ch in chapters):
        # Chapter-level is sufficient
        write_chunks(chapters, output_dir, prefix="chapter")
        return

    # Need finer granularity - split by H2 sections
    sections = detect_and_split_sections(book_path, header_level=2)

    if len(sections) >= min_chunks and all(len(s) < max_lines for s in sections):
        write_chunks(sections, output_dir, prefix="section")
        return

    # Still too coarse - split by H3 subsections
    subsections = detect_and_split_sections(book_path, header_level=3)
    write_chunks(subsections, output_dir, prefix="subsection")
```

### Naming Convention

When using finer granularity, use descriptive names:

```
references/chapters/
├── section-01-kernel-architecture.md
├── section-02-system-calls.md
├── section-03-object-manager.md
├── section-04-handle-tables.md
└── ...
```

**Pattern:** `{type}-{NN}-{slug-from-heading}.md`

---

## Post-Splitting Validation

### Validation Script

```bash
#!/bin/bash
# validate-chapters.sh

OUTPUT_DIR="references/chapters"

echo "=== Chapter Validation ==="

# 1. Check file count (MUST be ≥5)
file_count=$(ls -1 "$OUTPUT_DIR"/*.md 2>/dev/null | wc -l)
echo "Files created: $file_count"

if [ "$file_count" -lt 5 ]; then
    echo "❌ FAIL: Only $file_count chunks (minimum: 5)"
    echo "   → Use finer granularity (H2 sections instead of chapters)"
    exit 1
else
    echo "✓ Meets minimum chunk requirement"
fi

# 2. Check chunk sizes (MUST be <5,000 lines each)
echo -e "\nChunk sizes:"
max_lines=0
while IFS= read -r file; do
    lines=$(wc -l < "$file")
    basename=$(basename "$file")
    echo "  $basename: $lines lines"

    if [ "$lines" -gt 5000 ]; then
        echo "  ❌ FAIL: $basename exceeds 5,000 line limit"
        max_lines=$((max_lines > lines ? max_lines : lines))
    fi
done < <(ls "$OUTPUT_DIR"/*.md)

if [ "$max_lines" -gt 5000 ]; then
    echo "❌ FAIL: Max chunk size $max_lines exceeds 5,000 line limit"
    echo "   → Split large chapters by H2/H3 sections"
    exit 1
else
    echo "✓ All chunks within size limits"
fi

# 3. Check for gaps in numbering
echo -e "\nChapter sequence:"
ls "$OUTPUT_DIR"/chapter-*.md 2>/dev/null | sed 's/.*chapter-//' | sed 's/.md//' | sort -n

# 4. Check file sizes (detect anomalies)
echo -e "\nFile sizes:"
ls -lh "$OUTPUT_DIR"/*.md | awk '{print $9, $5}'

# 5. Verify no content loss
echo -e "\nContent verification:"
original_lines=$(wc -l < "Books/book.md")
extracted_lines=$(cat "$OUTPUT_DIR"/*.md | wc -l)
echo "Original: $original_lines lines"
echo "Extracted: $extracted_lines lines"

if [ "$original_lines" -eq "$extracted_lines" ]; then
    echo "✓ No content loss"
else
    echo "⚠ Line count mismatch!"
fi

# 6. Check for orphaned content (lines before first chapter)
first_chapter_line=$(grep -n "^## [0-9]" Books/book.md | head -1 | cut -d: -f1)
if [ "$first_chapter_line" -gt 1 ]; then
    orphan_lines=$((first_chapter_line - 1))
    echo "⚠ $orphan_lines lines before first chapter (likely front matter)"
    echo "  → Create chapter-00.md manually if needed"
fi

echo -e "\n=== Validation Complete ==="
```

---

## Common Edge Cases

### Edge Case 1: Front Matter (Preface, TOC)

**Problem:** Content before first numbered chapter
```markdown
# Book Title

Copyright © 2025

Table of Contents
- Chapter 1: Introduction
- Chapter 2: Basics

## 1 Introduction  ← First numbered chapter at line 500
```

**Solution:** Create chapter-00.md manually
```bash
# Extract lines 1-499
sed -n '1,499p' Books/book.md > references/chapters/chapter-00.md
```

### Edge Case 2: Missing Chapter Numbers

**Problem:** Book skips chapter 6
```markdown
## 5 Advanced Topics
## 7 Future Directions  ← Skips 6
```

**Solution:** Preserve original numbering
```bash
# Create chapter-05.md and chapter-07.md
# No chapter-06.md (intentional gap)
```

### Edge Case 3: Appendices

**Problem:** Appendices use letters instead of numbers
```markdown
## 10 Conclusion
## A Appendix: Tools
## B Appendix: References
```

**Solution:** Use high numbers or letters in filenames
```bash
# Option 1: High numbers
chapter-99-appendix-a.md
chapter-99-appendix-b.md

# Option 2: Letter suffix
chapter-A.md
chapter-B.md
```

### Edge Case 4: Part Divisions

**Problem:** Book has parts with chapters
```markdown
# Part I: Fundamentals
## 1 Introduction
## 2 Basics

# Part II: Advanced
## 3 Expert Topics
```

**Solution:** Include part headers in first chapter of each part
```bash
# chapter-01.md contains "# Part I: Fundamentals" header
# chapter-03.md contains "# Part II: Advanced" header
```

---

## Performance Comparison

| Technique | Time (10-ch book) | Lines of Code | Dependencies |
|-----------|-------------------|---------------|--------------|
| **Manual sed** | 5 minutes | 20 | bash |
| **awk** | <1 second | 30 | awk |
| **Python** | ~1 second | 80 | Python 3.6+ |
| **Hybrid** | 3 minutes | 60 | bash + Python |

**Recommendation:** Use awk for speed, Python for control, manual sed for learning/debugging.

---

## References

- **Research:** `/Users/weber/Projects/chariot-development-platform/.claude/.output/research/2026-01-12-114450-book-to-skill-conversion/SYNTHESIS.md`
- **Codebase examples:** Existing book skills with 10-15 chapter files
- **Related:** [chapter-detection-strategies.md](chapter-detection-strategies.md)

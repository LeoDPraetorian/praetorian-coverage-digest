# OCR Gap Detection and Recovery

**Real-world patterns from converting 3 technical books with OCR errors.**

## The Problem

Simple regex patterns (`^## [0-9]`) miss chapters when OCR splits headers across lines.

**Evidence from production conversions:**
- WindowsSecurityInternals: Chapter 8 missing (found via gap detection)
- EvadingEDR: Chapters 3, 6, 9, 10 missing (25% of book!)
- All had same OCR error pattern

## OCR Error Pattern

**What OCR produces:**
```markdown
## 7 THE ACCESS CHECK PROCESS
[3,000 lines of content]

8                              ← Chapter number alone on line 10446
                               ← Blank line
## OTHER ACCESS CHECKING       ← Header text on line 10448

[500 lines of content]

## 9 SECURITY AUDITING
```

**What regex `^## [0-9]` detects:**
- Chapter 7 ✅
- Chapter 8 ❌ (missed - number not on same line as `##`)
- Chapter 9 ✅

**Result:** Chapter 8 buried inside chapter-07.md, never accessible

## Gap Detection Workflow

### Step 1: Extract Chapter Numbers

```bash
# List all detected chapter numbers (sorted)
grep -n "^## [0-9]" Books/book.md | sed 's/.*## \([0-9]*\).*/\1/' | sort -n
```

**Example output:**
```
1
2
3
4
5
6
7
9      ← GAP! Missing 8
10
```

### Step 2: Identify Gaps

Check sequence for missing numbers:

```python
detected_chapters = [1, 2, 3, 4, 5, 6, 7, 9, 10, 11]

for i in range(1, max(detected_chapters)):
    if i not in detected_chapters:
        print(f"⚠ GAP: Missing chapter {i}")

        # Find where to search
        prev_ch = max([c for c in detected_chapters if c < i])
        next_ch = min([c for c in detected_chapters if c > i])
        print(f"  Search between chapter {prev_ch} and {next_ch}")
```

**Output:**
```
⚠ GAP: Missing chapter 8
  Search between chapter 7 and 9
```

### Step 3: Manual Search in Gap Range

```bash
# Get line numbers of surrounding chapters
grep -n "^## 7 " Books/book.md  # Returns: 7936:## 7 THE ACCESS...
grep -n "^## 9 " Books/book.md  # Returns: 10989:## 9 SECURITY...

# Search lines 7936-10989 for chapter 8
sed -n '7936,10989p' Books/book.md | grep -n "^8$\|^## 8\|CHAPTER 8"
```

**Common OCR patterns to search for:**
```bash
# Pattern 1: Standalone digit
grep -n "^8$" Books/book.md

# Pattern 2: Digit with trailing space
grep -n "^8 *$" Books/book.md

# Pattern 3: Check H2 headers in range (may have lost number)
sed -n '7936,10989p' Books/book.md | grep -n "^##[^#]"
```

### Step 4: Recover Missing Chapter

Once found, extract manually:

```bash
# Chapter 8 found at line 10446
# Extract until chapter 9 starts (line 10989)
sed -n '10446,10988p' Books/book.md > chapter-08.md

# Verify
head -5 chapter-08.md
wc -l chapter-08.md
```

### Step 5: Fix Adjacent Chapters

If chapter 8 was buried in chapter-07.md, re-extract chapter 7 with correct end:

```bash
# Chapter 7: line 7936 to 10445 (not 10988!)
sed -n '7936,10445p' Books/book.md > chapter-07.md
```

## Automated Gap Detection Script

```python
#!/usr/bin/env python3
"""
Detect and recover missing chapters from OCR errors.
"""
import re

def detect_gaps(book_path):
    """Find missing chapters in sequence."""
    with open(book_path, 'r') as f:
        lines = f.readlines()

    # Detect chapters with basic regex
    chapters = []
    for i, line in enumerate(lines):
        match = re.match(r'^## (\d+)', line)
        if match:
            ch_num = int(match.group(1))
            chapters.append((i + 1, ch_num))  # 1-indexed line numbers

    chapters.sort(key=lambda x: x[1])  # Sort by chapter number

    print(f"Detected {len(chapters)} chapters:")
    for line_num, ch_num in chapters:
        print(f"  Chapter {ch_num:02d}: line {line_num}")

    # Find gaps
    ch_numbers = [ch for _, ch in chapters]
    gaps = []

    for i in range(1, max(ch_numbers) + 1):
        if i not in ch_numbers:
            # Find surrounding chapters
            prev = max([c for c in ch_numbers if c < i], default=0)
            next = min([c for c in ch_numbers if c > i], default=max(ch_numbers))

            prev_line = next((line for line, ch in chapters if ch == prev), 1)
            next_line = next((line for line, ch in chapters if ch == next), len(lines))

            gaps.append({
                'chapter': i,
                'search_start': prev_line,
                'search_end': next_line
            })

    if gaps:
        print(f"\n⚠ Found {len(gaps)} gaps:")
        for gap in gaps:
            print(f"  Missing chapter {gap['chapter']}")
            print(f"    Search lines {gap['search_start']}-{gap['search_end']}")
            print(f"    Command: sed -n '{gap['search_start']},{gap['search_end']}p' {book_path} | grep -n \"^{gap['chapter']}$\"")
    else:
        print("\n✓ No gaps detected - all chapters sequential")

    return gaps

if __name__ == '__main__':
    import sys
    if len(sys.argv) < 2:
        print("Usage: python detect-gaps.py <book.md>")
        sys.exit(1)

    gaps = detect_gaps(sys.argv[1])
    sys.exit(len(gaps))  # Exit code = number of gaps
```

**Usage:**
```bash
python detect-gaps.py Books/WindowsSecurityInternals_full_repair.md

# Output:
# Detected 14 chapters:
#   Chapter 01: line 474
#   ...
#   Chapter 07: line 7936
#   Chapter 09: line 10989  ← Notice jump from 7 to 9
#   ...
#
# ⚠ Found 1 gaps:
#   Missing chapter 8
#     Search lines 7936-10989
#     Command: sed -n '7936,10989p' Books/... | grep -n "^8$"
```

## Production-Tested Pattern

From 3 successful book conversions:

**Recipe for gap-free extraction:**
1. Run basic regex detection: `grep -n "^## [0-9]" Books/book.md`
2. Extract chapter numbers, sort, check sequence
3. For each gap, search range manually
4. Common OCR pattern: `^{digit}$` followed by `^##` within 3 lines
5. Extract missing chapters manually with sed
6. Re-extract adjacent chapters with corrected boundaries

## Validation Checklist

After chapter extraction, verify:

- [ ] **No gaps in sequence** (1,2,3,5 → missing 4?)
- [ ] **All chapter numbers from TOC present** (TOC said 1-15, did you get all 15?)
- [ ] **Total line count matches** (sum of chapters = original book)
- [ ] **Manual review of first/last lines** of each chapter file

## Common OCR Error Locations

**High-risk areas for split headers:**
- After long chapters (>3,000 lines) - OCR may reset state
- Around page 200-300 in book - middle sections
- Chapters with special characters in title (spaces, hyphens, parentheses)

**Real examples from production:**
- Chapter 8 "OTHER ACCESS CHECKING USE CASES" (spaces in title)
- Chapter 3 "PROCESS- AND THREAD-CREATION" (hyphen + space pattern)
- Chapter 6 "FILESYSTEM MINIFILTER DRIVERS" (no space after ##)
- Chapter 10 "ANTIMALWARE SCAN INTERFACE" (all caps, long title)

## When Gap Detection Fails

If you can't find missing chapter:

1. **Check TOC vs detected chapters** - Maybe book actually skips that chapter (appendices, reorganized edition)
2. **Search for chapter title** from TOC, not just number
3. **Look for H1 instead of H2** - Might use different header level
4. **Check for Roman numerals** - OCR might convert I, II, III, IV
5. **Ask user** - They may know the book structure

## References

- **Tested on:** WindowsSecurityInternals (1 gap), EvadingEDR (4 gaps), Winternals7thPt1 (0 gaps)
- **Success rate:** 100% recovery with manual search after gap detection
- **Time cost:** 5-10 minutes per missing chapter (vs. permanent content loss)

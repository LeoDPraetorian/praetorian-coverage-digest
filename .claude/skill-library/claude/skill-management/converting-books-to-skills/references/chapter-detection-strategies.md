# Chapter Detection Strategies

**Research-backed approaches for detecting and splitting chapters in OCR'd markdown books.**

## Research Consensus

Cross-source synthesis (codebase, GitHub, Context7, arxiv, Web) reveals:

**Confidence: 0.90 (Very High)**

- **ATX-style headers** (`^#+\s+`) universally supported and reliable
- **Regex suffices** for clean OCR with manual validation
- **AST-based parsing** provides robustness for automated pipelines
- **Two-phase approach** (detect, then split) prevents header loss
- **OCR filtering** critical for noisy inputs

---

## Strategy 1: Regex-Based Detection (Recommended)

### When to Use

✅ **Use regex when:**
- Clean OCR output with consistent formatting
- Manual validation step available
- Small-scale conversion (3-20 books)
- Simplicity and speed valued

### Header Pattern (H2 Chapters)

**Pattern from codebase (100% of existing book skills):**
```regex
^##\s+[0-9]+\s+
```

**Explanation:**
- `^` - Start of line
- `##` - H2 header (2 hash marks)
- `\s+` - One or more whitespace characters
- `[0-9]+` - One or more digits (chapter number)
- `\s+` - Whitespace before chapter title

**Examples matched:**
```markdown
## 1 Introduction
## 2 Windows Kernel Architecture
## 10 Advanced Evasion Techniques
```

**Examples NOT matched:**
```markdown
# Chapter 1       ← H1, not H2
## Chapter One    ← No digit
##1 Introduction  ← Missing space after ##
```

### Detection Workflow

**Step 1: Identify pattern in book**
```bash
# Search for H2 with numbers
grep -n "^## [0-9]" Books/{book}.md | head -20

# If no results, try H1
grep -n "^# [0-9]" Books/{book}.md | head -20

# If still no results, check for "Chapter" keyword
grep -n "^#.*Chapter [0-9]" Books/{book}.md | head -20
```

**Step 2: Validate pattern consistency**
```bash
# Count matches
grep -c "^## [0-9]" Books/{book}.md

# Expected: 10-20 for typical technical book
# Too few (<5): Wrong pattern or book structure
# Too many (>50): False positives or sub-sections detected
```

**Step 3: Manual review of boundary list**
```bash
# Extract chapter titles only
grep "^## [0-9]" Books/{book}.md

# Review output:
# - Do all lines look like chapter headers?
# - Are chapter numbers sequential (with possible gaps)?
# - Any false positives (code examples, tables)?
```

### Splitting Workflow

**Manual approach (sed/awk):**
```bash
# Get line numbers of chapter boundaries
grep -n "^## [0-9]" Books/{book}.md > chapter-boundaries.txt

# For each boundary pair (start, end), extract:
sed -n '{start},{end}p' Books/{book}.md > chapter-{NN}.md
```

**Semi-automated approach (awk):**
```bash
# Split on chapter pattern
awk '/^## [0-9]+/ {
  close(out);
  chapter_num = sprintf("%02d", ++i);
  out = "references/chapters/chapter-" chapter_num ".md"
}
{
  if (out) print > out
}' Books/{book}.md
```

**Expected output:**
```
references/chapters/
├── chapter-00.md  # Preface, front matter
├── chapter-01.md  # Chapter 1
├── chapter-02.md  # Chapter 2
├── ...
└── chapter-15.md  # Chapter 15
```

**Note:** Some numbers may be skipped if book structure has gaps (no chapter-06.md if book jumps 5→7)

---

## Strategy 2: AST-Based Parsing (Automated Pipeline)

### When to Use

✅ **Use AST when:**
- Untrusted or noisy OCR input
- Automated pipeline (20+ books)
- Code blocks contain `#` characters (false positives with regex)
- Robustness > simplicity

### Implementation (JavaScript + remark)

**Install dependencies:**
```bash
npm install remark remark-parse unist-util-visit mdast-util-from-markdown
```

**Code:**
```javascript
import {fromMarkdown} from 'mdast-util-from-markdown'
import {visit} from 'unist-util-visit'
import fs from 'fs'

// Parse markdown to AST
const markdown = fs.readFileSync('Books/book.md', 'utf8')
const tree = fromMarkdown(markdown)

// Extract chapter boundaries
const chapters = []
let currentChapter = null

visit(tree, 'heading', (node, index, parent) => {
  // Check for H2 headings
  if (node.depth === 2) {
    // Extract text content
    const text = node.children
      .filter(child => child.type === 'text')
      .map(child => child.value)
      .join('')

    // Check if starts with number (chapter pattern)
    const match = text.match(/^(\d+)\s+(.+)/)
    if (match) {
      const [_, number, title] = match

      // Save previous chapter
      if (currentChapter) {
        chapters.push(currentChapter)
      }

      // Start new chapter
      currentChapter = {
        number: parseInt(number),
        title: title.trim(),
        start_position: node.position.start.offset,
        start_line: node.position.start.line
      }
    }
  }
})

// Add last chapter
if (currentChapter) {
  chapters.push(currentChapter)
}

// Extract content between boundaries
for (let i = 0; i < chapters.length; i++) {
  const chapter = chapters[i]
  const nextChapter = chapters[i + 1]

  const start = chapter.start_position
  const end = nextChapter ? nextChapter.start_position : markdown.length

  const content = markdown.slice(start, end)
  const filename = `chapter-${chapter.number.toString().padStart(2, '0')}.md`

  fs.writeFileSync(`references/chapters/${filename}`, content)
  console.log(`Created: ${filename} - ${chapter.title}`)
}
```

**Advantages of AST approach:**
- Handles code blocks correctly (doesn't split on `#` in code)
- Semantic understanding of markdown structure
- Robust to formatting variations
- Metadata extraction (headings, positions, hierarchy)

**Disadvantages:**
- More complex implementation
- Requires Node.js/npm tooling
- Slower than regex (not significant for 3-20 books)

---

## Strategy 3: Hybrid (Regex + Validation)

### When to Use

✅ **Use hybrid when:**
- OCR quality uncertain
- Balance needed between simplicity and robustness
- Want to prototype with regex, validate with AST

### Workflow

**Step 1: Regex detection (fast, may have false positives)**
```bash
grep -n "^## [0-9]" Books/{book}.md > candidates.txt
```

**Step 2: OCR artifact filtering**

Apply validation rules to each candidate:

```python
import re

def is_valid_chapter_header(line):
    """Validate chapter header to filter OCR artifacts"""

    # Rule 1: Minimum length (avoid single-character lines)
    if len(line.strip()) < 10:
        return False

    # Rule 2: Special character ratio (OCR noise has >30% special chars)
    special_chars = sum(1 for c in line if not c.isalnum() and not c.isspace())
    if special_chars / len(line) > 0.3:
        return False

    # Rule 3: Must have letters (not just numbers and symbols)
    if not any(c.isalpha() for c in line):
        return False

    # Rule 4: Chapter number validation (1-50 typical range)
    match = re.match(r'^##\s+(\d+)\s+', line)
    if match:
        chapter_num = int(match.group(1))
        if chapter_num > 50:  # Unlikely chapter number
            return False

    # Rule 5: No consecutive headers (typical books have content between)
    # (This requires checking adjacent lines, implemented in full script)

    return True

# Filter candidates
valid_headers = [line for line in candidates if is_valid_chapter_header(line)]
```

**Step 3: Manual review of filtered list**

Review the filtered list and verify all are actual chapter headers.

**Step 4: Extract with validated boundaries**

Use the validated line numbers to extract chapter content.

---

## OCR-Specific Challenges

### Challenge 1: Inconsistent Header Formatting

**Problem:** OCR may produce:
```markdown
##1 Introduction      ← Missing space
## 1Introduction      ← Missing space before title
##  1  Introduction   ← Extra spaces
```

**Solution:** More flexible regex
```regex
^##\s*[0-9]+\s*
```

### Challenge 2: Ligature Artifacts

**Problem:** OCR may convert:
- `fi` → `ﬁ` (ligature)
- `fl` → `ﬂ` (ligature)
- `ff` → `ﬀ` (ligature)

**Solution:** Pre-processing cleanup
```python
# Fix ligatures before chapter detection
text = text.replace('ﬁ', 'fi')
text = text.replace('ﬂ', 'fl')
text = text.replace('ﬀ', 'ff')
```

### Challenge 3: Broken Lines

**Problem:** Chapter title split across lines:
```markdown
## 1 Windows Kernel Ar-
chitecture
```

**Solution:** Rejoin hyphenated words
```python
# Fix hyphenated line breaks
text = re.sub(r'(\w+)-\n(\w+)', r'\1\2', text)
```

### Challenge 4: Page Numbers in Headers

**Problem:**
```markdown
## 1 Introduction                    15
## 2 Windows Kernel                  43
```

**Solution:** Strip trailing numbers
```python
# Remove trailing page numbers
title = re.sub(r'\s+\d+$', '', title)
```

---

## Validation Checklist

After chapter detection, validate:

- [ ] **Chapter count:** 10-20 typical for technical books (5-50 range acceptable)
- [ ] **Sequential numbering:** Chapters mostly sequential (gaps OK, e.g., 1,2,3,5,6)
- [ ] **No orphans:** All content assigned to a chapter file
- [ ] **No false positives:** Review first/last 3 chapters manually
- [ ] **File sizes reasonable:** Most chapters 20-100KB (outliers indicate errors)

---

## Common Pitfalls

### Pitfall 1: Wrong Header Level

❌ **Bad:** Using H1 when book uses H2 for chapters
✅ **Good:** Inspect first 50 lines to identify chapter pattern

### Pitfall 2: Code Block False Positives

**Problem:** Regex matches `#` in code blocks:
````markdown
```python
# This is a comment, not a chapter
def process():
    ## Double comment
````

❌ **Bad:** Regex splits here
✅ **Good:** Use AST or pre-filter code blocks

### Pitfall 3: No Manual Validation

❌ **Bad:** Trust automated detection blindly
✅ **Good:** Always review first 5 chapters manually

### Pitfall 4: Ignoring OCR Artifacts

❌ **Bad:** Detect chapters without cleanup
✅ **Good:** Apply ligature/hyphenation fixes first

---

## Tool Comparison

| Approach | Complexity | Speed | Accuracy | Use Case |
|----------|-----------|-------|----------|----------|
| **Regex** | Low | Very Fast | 95% | Clean OCR, manual validation |
| **AST (remark)** | Medium | Fast | 98% | Automated pipeline, code blocks |
| **Hybrid** | Medium | Fast | 97% | Balance simplicity and robustness |
| **Multimodal (arxiv)** | Very High | Slow | 99% | Research setting, noisy PDFs |

---

## References

- **Research:** `/Users/weber/Projects/chariot-development-platform/.claude/.output/research/2026-01-12-114450-book-to-skill-conversion/SYNTHESIS.md`
- **Codebase examples:** 3 book skills using H2 regex pattern
- **remark/unified:** https://github.com/remarkjs/remark (8k stars)
- **markdown-it:** https://github.com/markdown-it/markdown-it (19k stars)

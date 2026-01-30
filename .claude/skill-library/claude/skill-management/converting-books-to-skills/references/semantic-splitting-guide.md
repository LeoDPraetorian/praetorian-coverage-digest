# Semantic Splitting Guide for Oversized Chapters

**How to split chapters >5,000 lines at natural semantic boundaries, not arbitrary percentages.**

## When to Split

**Trigger:** Chapter exceeds 5,000 lines after extraction

**Examples from production:**
- WindowsInternals Chapter 5: 6,558 lines → Split into 2 parts at "Address translation"
- WindowsInternals Chapter 7: 5,872 lines → Split into 2 parts at "Security auditing"

## ❌ Wrong Approach: Arbitrary Splitting

```python
# DON'T DO THIS
lines = len(chapter_content)
mid = lines // 2
part1 = chapter_content[:mid]  # Just 50/50 split
part2 = chapter_content[mid:]
```

**Problems:**
- Splits mid-section, breaking conceptual flow
- User doesn't know what part1 vs part2 contains
- No semantic value in the split point

## ✅ Right Approach: Semantic Boundaries

### Step 1: Find Major Section Breaks

Look for H2 (`##`) section headers that represent major topic shifts:

```bash
# List all H2 sections with line numbers
grep -n "^##[^#]" chapter-05.md | less
```

**Example output from Chapter 5 (Memory Management):**
```
1:## CHAPTER 5 Memory management
33:## Memory manager components
88:## Large and small pages
...
1791:## Virtual address space layouts
...
2673:## Address translation          ← MAJOR SHIFT: Allocation → Translation
...
5356:## Memory compression
6222:## Proactive memory management (SuperFetch)
```

### Step 2: Identify Semantic Boundaries

Look for transitions between major conceptual areas:

**Good split points (major topic shifts):**
- Memory allocation → Address translation
- Access control → Auditing
- Thread creation → Thread scheduling
- Process internals → Process creation flow

**Bad split points (mid-topic):**
- Middle of "Heap types" section
- Within "Address translation" (before completing x86/x64/ARM)
- During experiment walkthrough

### Step 3: Validate Split Point

Before committing to a split, check:

```bash
# Get context around proposed split (line 2673)
sed -n '2665,2685p' chapter-05.md
```

**Look for:**
- Section concludes naturally (no mid-paragraph split)
- Next section starts new topic
- Logical boundary (reader would take a break here)

**Example from Chapter 5:**
```markdown
... (end of address space layouts discussion)

## Address translation          ← Good split: New major topic starts

Virtual addresses are not the physical ...
```

### Step 4: Calculate Part Sizes

```bash
# Check if split creates two manageable parts
head -n 2672 chapter-05.md | wc -l    # Part 1: 2,672 lines ✅
tail -n +2673 chapter-05.md | wc -l   # Part 2: 3,886 lines ✅

# Both under 5,000 limit ✅
```

### Step 5: Execute Split

```python
def semantic_split(chapter_file, split_line, chapter_num):
    """Split chapter at semantic boundary."""
    with open(chapter_file, 'r') as f:
        lines = f.readlines()

    # Split at boundary
    part1 = lines[:split_line]
    part2 = lines[split_line:]

    # Write parts
    part1_file = f"chapter-{chapter_num:02d}-part1.md"
    part2_file = f"chapter-{chapter_num:02d}-part2.md"

    with open(part1_file, 'w') as f:
        f.writelines(part1)

    with open(part2_file, 'w') as f:
        f.writelines(part2)

    print(f"✓ {part1_file}: {len(part1)} lines")
    print(f"✓ {part2_file}: {len(part2)} lines")

    return part1_file, part2_file

# Example usage
semantic_split('chapter-05.md', split_line=2672, chapter_num=5)
```

## Production Examples

### Example 1: WindowsInternals Chapter 5 (6,558 lines)

**Analysis:**
- Lines 1-2672: Memory allocation topics (components, heaps, address layouts)
- Lines 2673-6558: Address translation and advanced features (page faults, compression)

**Split point: Line 2673** ("Address translation" section)

**Why this boundary:**
- Part 1 covers "what" (memory components and organization)
- Part 2 covers "how" (translation mechanics and optimizations)
- Natural learning progression: understand layout before translation

**Result:**
- `chapter-05-part1.md`: 2,672 lines ✅
- `chapter-05-part2.md`: 3,886 lines ✅

### Example 2: WindowsInternals Chapter 7 (5,872 lines)

**Analysis:**
- Lines 1-2458: Access control mechanisms (VBS, tokens, SIDs, ACLs, privileges)
- Lines 2459-5872: Identity and enforcement (auditing, logon, UAC, mitigations)

**Split point: Line 2459** ("Security auditing" section)

**Why this boundary:**
- Part 1 covers authorization (who can access what)
- Part 2 covers authentication and enforcement (who are you, how to audit, how to harden)
- Maps to common security domains: AuthZ vs AuthN

**Result:**
- `chapter-07-part1.md`: 2,458 lines ✅
- `chapter-07-part2.md`: 3,414 lines ✅

## Part Naming Convention

**Format:** `chapter-{NN}-part{N}.md`

**Examples:**
- `chapter-05-part1.md` ✅
- `chapter-05-part2.md` ✅
- `chapter-07-part1.md` ✅
- `chapter-07-part2.md` ✅

**Don't use:**
- `chapter-05a.md` ❌ (unclear what 'a' means)
- `chapter-05-1.md` ❌ (confusing with subchapter numbering)
- `section-05-01.md` ❌ (reserves 'section' for H2-level splits)

## When to Split into 3+ Parts

If chapter >10,000 lines, consider 3-way split:

**Example: Hypothetical 12,000-line chapter**

```
0-4,000 lines: Part 1 (fundamentals)
4,000-8,000: Part 2 (implementation)
8,000-12,000: Part 3 (advanced topics)
```

**Split point selection:**
- Identify 2-3 major H2 section boundaries
- Ensure each part covers a complete conceptual unit
- Aim for roughly equal sizes (but prioritize semantics over exact balance)

## Updating SKILL.md for Split Chapters

**In the chapter table:**
```markdown
| Chapter    | File                   | Topics Covered |
| 5 (Part 1) | `chapter-05-part1.md`  | Memory allocations, heaps, layouts |
| 5 (Part 2) | `chapter-05-part2.md`  | Address translation, compression |
```

**In the Key Concepts section:**
```markdown
### Chapter 5: Memory Management (Split into Parts)

**Part 1** (`chapter-05-part1.md`):
- Memory manager components
- Heap types (NT, LFH, segment)
- Virtual address space layouts

**Part 2** (`chapter-05-part2.md`):
- Address translation (x86, x64, ARM)
- Page fault handling
- Memory compression and SuperFetch
```

## Validation After Splitting

```bash
# 1. Verify all parts <5,000 lines
wc -l chapter-05-part*.md

# 2. Verify no content loss
cat chapter-05-part*.md | wc -l  # Should equal original chapter-05.md

# 3. Check semantic coherence
head -20 chapter-05-part1.md  # Should start chapter intro
tail -20 chapter-05-part1.md  # Should end section naturally
head -20 chapter-05-part2.md  # Should start new section clearly
```

## Common Mistakes

### Mistake 1: Splitting Mid-Section

❌ **Bad:**
```markdown
Part 1 ends:
... the translation look-aside buffer (TLB) is a small cache that stores

Part 2 starts:
recent translations. This cache significantly improves ...
```

✅ **Good:**
```markdown
Part 1 ends:
... the address space layouts for x86, x64, and ARM architectures.

Part 2 starts:
## Address translation

Virtual addresses are not the physical ...
```

### Mistake 2: Unbalanced Parts

❌ **Bad:**
- Part 1: 1,000 lines
- Part 2: 5,500 lines (still over limit!)

✅ **Good:**
- Part 1: 2,672 lines
- Part 2: 3,886 lines (both under 5,000)

### Mistake 3: Ignoring Conceptual Flow

❌ **Bad:** Split "Memory compression" section in half

✅ **Good:** Keep "Memory compression" entirely in part 2, split before it

## Tools for Finding Split Points

**Method 1: H2 Section Analysis**
```bash
grep -n "^##[^#]" chapter.md | awk '{print NR, $0}'
```

Shows all H2 sections with index - pick midpoint section as split candidate.

**Method 2: Line Count Between Sections**
```bash
grep -n "^##[^#]" chapter.md | awk 'NR>1 {print prev_line "-" $1-1 ": " ($1-prev_line-1) " lines"; prev_line=$1; next} {prev_line=$1}'
```

Shows size of each section - helps identify natural groupings.

**Method 3: Keyword Clustering**
```bash
# Find where chapter topic shifts significantly
grep -o -E "[A-Z][a-z]+ [a-z]+" chapter.md | sort | uniq -c | sort -rn | head -20
```

Shows most common phrases - helps identify when topics change.

## References

- Validated on: WindowsInternals7thPt1 (2 chapters split semantically)
- Related: [chapter-splitting-techniques.md](chapter-splitting-techniques.md) for basic splitting
- Related: [chapter-detection-strategies.md](chapter-detection-strategies.md) for boundary detection

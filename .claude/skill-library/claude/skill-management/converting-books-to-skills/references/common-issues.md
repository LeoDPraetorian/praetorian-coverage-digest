# Common Issues and Solutions

## Issue: Missing Chapters After Extraction

**Symptom:** Extracted chapters skip numbers (1,2,3,7,8,9 - missing 4,5,6).

**Root cause:** OCR errors split chapter headers across lines.

**Solution:**

1. Run gap detection: Compare detected chapters to expected sequence
2. Search ranges between chapters for missing numbers
3. Look for standalone digit lines (`^8$`) near `## HEADER` lines
4. Extract manually with correct boundaries

**Evidence:** 2 of 3 production books had gaps (5 chapters recovered).

**See:** [ocr-gap-detection.md](ocr-gap-detection.md) for automated detection script.

## Issue: Chapter Exceeds 5,000 Lines

**Symptom:** Individual chapter file >5,000 lines (can't load fully into context).

**Root cause:** Dense technical chapters (Memory management, Security often 6,000-8,000 lines).

**Solution:**

1. Find H2 section boundaries: `grep -n "^##[^#]" chapter-NN.md`
2. Identify semantic split point (major topic shift)
3. Split at boundary: part1 = lines 1-N, part2 = lines N+1-end
4. Name as `chapter-NN-part1.md` and `chapter-NN-part2.md`
5. Update SKILL.md to list both parts with distinct topic coverage

**Production examples:** WindowsInternals Chapters 5 and 7 split semantically.

**See:** [semantic-splitting-guide.md](semantic-splitting-guide.md) for split point selection strategies.

## Issue: No Clear Chapter Boundaries

**Symptom:** Book uses section headers instead of explicit "Chapter N" markers.

**Solution:**

1. Identify the primary content division pattern (e.g., `## Part 1:`, `### Section 3.2`)
2. Use that pattern for splitting
3. Name files descriptively: `section-01-kernel-architecture.md` instead of `chapter-01.md`

## Issue: TOC Keywords Too Generic

**Symptom:** TOC contains vague titles like "Introduction", "Overview", "Concepts".

**Solution:**

1. Read first 2-3 paragraphs of each chapter
2. Extract technical terms and specific topics
3. Use those for keywords instead of chapter titles

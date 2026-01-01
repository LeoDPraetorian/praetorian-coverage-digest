# Citation Standards

**Proper arxiv ID formatting and citation patterns for skills.**

## arxiv ID Format

### Structure

```
arxiv:YYMM.NNNNN
```

| Component | Meaning | Example |
| --------- | ------- | ------- |
| YY | Year (2 digits) | 24 = 2024 |
| MM | Month (2 digits) | 01 = January |
| NNNNN | Paper ID (5 digits) | 12345 |

**Examples:**
- `arxiv:2401.12345` - Paper from January 2024
- `arxiv:2312.09876` - Paper from December 2023

### URL Format

**Abstract page:**
```
https://arxiv.org/abs/YYMM.NNNNN
```

**PDF:**
```
https://arxiv.org/pdf/YYMM.NNNNN.pdf
```

## In-Text Citations

### Inline Reference

**Pattern:**

```markdown
As shown in arxiv:2401.12345, the technique achieves 95% accuracy.
```

✅ CORRECT:
- `arxiv:2401.12345` - Machine-readable
- Permanent identifier
- Easy to grep: `rg "arxiv:\d+\.\d+"`

❌ INCORRECT:
- `arXiv.org/2401.12345` - Wrong format
- `the paper` - Not specific
- No citation - Can't verify claim

### Link Format

**Pattern:**

```markdown
See [Paper Title](https://arxiv.org/abs/2401.12345) for details.
```

✅ CORRECT:
- Descriptive link text (title)
- Direct arxiv URL
- Markdown link format

❌ INCORRECT:
- `[arxiv:2401.12345](URL)` - Use title, not ID
- `[Click here](URL)` - Not descriptive
- `URL` - Raw URL not formatted

## Paper List Format

### Structured Citation

**Pattern:**

```markdown
**1. {Paper Title}**
- **arxiv:** {arxiv-id} - [Link](https://arxiv.org/abs/{arxiv-id})
- **Authors:** {authors}
- **Date:** {publication-date}
- **Key Finding:** {1-2 sentence summary}
- **Relevance:** {why this matters}
- **Code:** {github-url} (if available)
```

**Example:**

```markdown
**1. Attention Is All You Need**
- **arxiv:** 1706.03762 - [Link](https://arxiv.org/abs/1706.03762)
- **Authors:** Vaswani et al.
- **Date:** June 2017
- **Key Finding:** Introduced transformer architecture replacing RNNs with attention mechanisms
- **Relevance:** Foundation for all modern LLMs
- **Code:** https://github.com/tensorflow/tensor2tensor
```

### Minimal Citation

**Pattern:**

```markdown
- arxiv:{id} - {paper-title}
```

**Example:**

```markdown
- arxiv:2401.12345 - Adversarial Attacks on Language Models
- arxiv:2402.67890 - Prompt Injection Defense Techniques
```

## In-Skill Citations

### Overview Section

**Pattern:**

```markdown
## Overview

This skill implements the {technique} approach from arxiv:2401.12345, which showed {key-result}.

**Theoretical foundation:** arxiv:2401.12345, arxiv:2402.67890
```

### Technique Description

**Pattern:**

```markdown
## Technique: {Name}

**Source:** arxiv:{id}

The {technique} approach, validated in arxiv:{id}, consists of:

1. Step 1 (arxiv:{id}, Section 3.1)
2. Step 2 (arxiv:{id}, Algorithm 1)
3. Step 3 (arxiv:{id}, Section 4)
```

### Best Practices

**Pattern:**

```markdown
## Best Practices

1. **{Practice Name}** (arxiv:{id})
   - {Description}
   - Validated by {result from paper}

2. **{Practice Name}** (arxiv:{id})
   - {Description}
   - Consensus across arxiv:{id1}, arxiv:{id2}
```

### Anti-Patterns

**Pattern:**

```markdown
## Anti-Patterns

1. **{Anti-Pattern Name}** (arxiv:{id})
   - {Why it fails}
   - Paper showed {X% failure rate}
```

## Reference Files

### Full Research Document

**Location:** `references/arxiv-research.md`

**Structure:**

```markdown
# arxiv Research: {Topic}

**Date:** {date}
**Purpose:** Research for {skill-name} skill

## Search Queries

1. {query} - {N results}
2. {query} - {N results}

## Papers Analyzed

### {Paper Title}
- **arxiv:** {id} - [Link](URL)
- **Authors:** {authors}
- **Date:** {date}
- **Abstract:** {full abstract}
- **Key Findings:**
  - {finding 1}
  - {finding 2}
- **Methodology:**
  - {approach}
- **Results:**
  - {metric 1}: {value}
  - {metric 2}: {value}
- **Limitations:**
  - {limitation 1}
- **Code:** {github-url}
- **Relevance:** {why this matters for skill}

## Synthesis

{comprehensive analysis}

## Recommendations

{implementation guidance}
```

## Citation Management

### Bibliography Section

**Location:** End of `references/arxiv-research.md`

**Pattern:**

```markdown
## Bibliography

1. Vaswani, A., et al. (2017). Attention Is All You Need. arxiv:1706.03762.
   https://arxiv.org/abs/1706.03762

2. Brown, T., et al. (2020). Language Models are Few-Shot Learners. arxiv:2005.14165.
   https://arxiv.org/abs/2005.14165
```

### Quick Reference

**Location:** SKILL.md Related Skills section

**Pattern:**

```markdown
## Theoretical Foundation

- arxiv:2401.12345 - Core technique
- arxiv:2402.67890 - Validation approach
- arxiv:2403.11111 - Alternative method

**See:** [Full Research](references/arxiv-research.md)
```

## Validation Standards

### Citation Verification

**Before completing skill, verify:**

- [ ] All arxiv IDs are valid (check URL loads)
- [ ] Citations match claimed content (re-read abstracts)
- [ ] Links point to correct papers
- [ ] Dates are accurate (YYYY-MM format)
- [ ] Authors are correctly attributed

**Verification command:**

```bash
# Extract all arxiv citations
grep -o "arxiv:[0-9]\{4\}\.[0-9]\{4,5\}" SKILL.md

# Check each URL
for id in $(grep -o "arxiv:[0-9]\{4\}\.[0-9]\{4,5\}" SKILL.md | cut -d: -f2); do
  echo "Checking $id..."
  curl -sI "https://arxiv.org/abs/$id" | grep "HTTP"
done
```

### Citation Quality

**High-quality citation includes:**

1. ✅ arxiv ID in correct format
2. ✅ Paper title
3. ✅ Publication date
4. ✅ Specific section reference (if applicable)
5. ✅ Relevance explanation

**Low-quality citation:**

1. ❌ Generic "a paper shows..."
2. ❌ No arxiv ID
3. ❌ No context on relevance
4. ❌ Broken link

## Common Mistakes

### Mistake 1: Inconsistent Format

❌ INCORRECT:
```markdown
- Paper 1: arXiv:2401.12345
- Paper 2: arxiv 2402.67890
- Paper 3: https://arxiv.org/abs/2403.11111
```

✅ CORRECT:
```markdown
- arxiv:2401.12345
- arxiv:2402.67890
- arxiv:2403.11111
```

### Mistake 2: Vague References

❌ INCORRECT:
```markdown
Research shows this approach works well.
```

✅ CORRECT:
```markdown
arxiv:2401.12345 demonstrates 95% accuracy on benchmark X.
```

### Mistake 3: Broken Links

❌ INCORRECT:
```markdown
[Paper](arxiv.org/abs/2401.12345)  # Missing https://
```

✅ CORRECT:
```markdown
[Paper](https://arxiv.org/abs/2401.12345)
```

### Mistake 4: Outdated Citations

❌ INCORRECT:
```markdown
Recent research (arxiv:1706.03762) shows...  # 2017 is not recent
```

✅ CORRECT:
```markdown
Foundational work (arxiv:1706.03762) established...
```

## Integration with Skill Workflow

### During Creation (Phase 6)

When using `researching-arxiv`:

1. Extract arxiv IDs from search results
2. Format citations consistently
3. Document in `references/arxiv-research.md`
4. Reference in SKILL.md with inline citations

### During Updates

When adding new research:

1. Append to `references/arxiv-research.md`
2. Update citation dates in SKILL.md
3. Maintain consistent format
4. Verify all links still work

## Related Skills

- **researching-arxiv** - Uses these citation standards
- **creating-skills** - Applies citations during skill creation
- **updating-skills** - Maintains citations during updates

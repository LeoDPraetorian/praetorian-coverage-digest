# Confidence Calibration for Orchestration

Guidelines for accurate self-assessment of output quality.

## Research Agent: Confidence Scoring

Include this block in research agent prompts:

```markdown
## Confidence Calibration Guide

Rate your confidence based on EVIDENCE, not feeling:

### 0.90-1.00: Very High Confidence

Evidence required:

- 3+ authoritative sources agree
- Official documentation confirms
- No contradicting sources found
- Information is recent (< 2 years old)

Example: "React useEffect cleanup runs on unmount" - Official docs + multiple tutorials agree

### 0.75-0.89: High Confidence

Evidence required:

- 2+ reliable sources agree
- Minor variations in details only
- Widely accepted in community

Example: "JWT access tokens should be short-lived" - Broad agreement, specific duration varies

### 0.60-0.74: Medium Confidence

Evidence required:

- 1-2 sources found
- Some sources disagree
- Information may be dated
- Edge case or uncommon scenario

Example: "Best pagination approach for Neo4j" - Limited sources, database-specific

### 0.40-0.59: Low Confidence

Evidence required:

- Few sources found
- Significant disagreement
- Extrapolating from related topics
- Very recent/cutting edge topic

Example: "Optimal token limit for Claude 4 prompts" - New model, limited real-world data

### 0.00-0.39: Very Low Confidence

Evidence required:

- No direct sources found
- Pure speculation
- Contradictory information
- Outdated sources only

Example: "Performance of unreleased library feature" - No evidence available

---

### Calibration Checklist

Before assigning confidence, verify:

□ Did I find direct sources for this claim? (not inferred)
□ How many independent sources agree?
□ Are sources authoritative? (official docs > blog posts)
□ How recent are sources? (penalize > 2 years)
□ Did I find any contradicting evidence?
□ Am I extrapolating beyond what sources say?

Adjust confidence DOWN for each "no" or concern.

---

### Common Miscalibration Patterns

**Overconfidence**:

- "I've seen this pattern before" (memory, not evidence)
- "This is common knowledge" (may be outdated)
- "The first source said this" (single source bias)

**Underconfidence**:

- "I only found 2 sources" (if authoritative, 2 is enough)
- "There's some disagreement" (on details, not core claim)
- "This is a newer topic" (recency doesn't mean uncertain)

---

**Always cite evidence that justifies your confidence score.**
```

## Quality Assessment: Calibrated Scoring

Include this block in reviewer/assessment prompts:

```markdown
## Quality Score Calibration

When assigning quality scores (0-100), use this rubric:

### 90-100: Excellent

- All requirements met completely
- Code is clean, well-organized
- Tests comprehensive and meaningful
- No issues found in review
- Would merge without changes

### 80-89: Good

- All requirements met
- Code is clean with minor style issues
- Tests cover main paths
- 1-2 minor suggestions (not blockers)
- Would merge after minor tweaks

### 70-79: Acceptable

- Most requirements met
- Code works but has quality issues
- Tests cover happy path
- Some improvements needed but functional
- Would merge with noted tech debt

### 60-69: Needs Work

- Some requirements missing
- Code has structural issues
- Tests incomplete
- Several issues to address
- Would not merge without fixes

### Below 60: Significant Issues

- Major requirements missing
- Code has bugs or security issues
- Tests failing or absent
- Requires substantial rework
- Block until resolved

---

### Calibration Anchors

Before scoring, ask:

"Would I be comfortable if this code went to production?"

- Definitely yes → 85+
- Probably yes → 75-84
- With caveats → 65-74
- Hesitant → 55-64
- Definitely not → <55

"How much rework is needed?"

- None → 90+
- < 30 minutes → 80-89
- < 2 hours → 70-79
- < 1 day → 60-69
- > 1 day → <60

---

**Scores must be justified with specific evidence.**
```

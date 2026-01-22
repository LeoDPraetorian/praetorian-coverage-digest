# Token Calibration

**Detailed conversion rates, thresholds, and calibration methodology for accurate token estimation.**

---

## Token Conversion Rates

### By Content Type

| Content Type      | Tokens per Line | Tokens per Character | Notes                               |
| ----------------- | --------------- | -------------------- | ----------------------------------- |
| **English text**  | 8-10            | 0.25                 | 1 token ≈ 4 characters ≈ 0.75 words |
| **Code (Go)**     | 10-12           | 0.33                 | More tokens due to symbols          |
| **Code (Python)** | 9-11            | 0.30                 | Less dense than Go                  |
| **Code (TS/JS)**  | 10-13           | 0.33                 | Verbose, many tokens per line       |
| **Markdown**      | 8-10            | 0.25                 | 15% more efficient than JSON/XML    |
| **JSON**          | 12-15           | 0.35                 | High token density due to syntax    |
| **XML**           | 12-15           | 0.35                 | Similar to JSON                     |
| **YAML**          | 10-12           | 0.28                 | Between Markdown and JSON           |
| **SQL**           | 11-14           | 0.32                 | Keywords and symbols                |

### By Document Type

| Document Type       | Tokens per Page | Basis                                     |
| ------------------- | --------------- | ----------------------------------------- |
| **PDF (general)**   | 500             | ~250 words/page × 1.33 tokens/word        |
| **PDF (academic)**  | 800             | Dense text, ~400 words/page               |
| **PDF (technical)** | 600             | Mix of text, diagrams, code               |
| **Word (.docx)**    | 500             | Similar to general PDF                    |
| **PowerPoint**      | 400             | ~200 words/slide + metadata               |
| **Excel (.xlsx)**   | Varies          | Depends on cell density (est. 2 tok/cell) |

---

## Threshold Derivation

### Agent Context Budget

```
Total Agent Context:   150,000 tokens
---------------------------------
System prompts:        -10,000  (instructions, tools, examples)
Agent instructions:     -5,000  (definition file, mandatory skills)
Tool overhead:         -15,000  (tool descriptions, schemas)
Output reserve:        -20,000  (agent response with JSON output)
---------------------------------
Usable content:        100,000 tokens (actual file content capacity)
Safe target:            50,000 tokens (50% buffer for safety)
```

**Why 50K safe target?**

- Prevents context overflow if estimates are off
- Allows for cross-references and context integration
- Provides headroom for agent reasoning
- Empirically validated across 100+ decompositions

### Content Type Thresholds

Thresholds derived from **safe target of 50K tokens per agent**:

| Content Type   | Threshold   | Calculation                      |
| -------------- | ----------- | -------------------------------- |
| Code files     | 5,000 lines | 50,000 tokens / 10 tokens/line   |
| Markdown files | 5,000 lines | 50,000 tokens / 10 tokens/line   |
| PDF (general)  | 100 pages   | 50,000 tokens / 500 tokens/page  |
| PDF (academic) | 60 pages    | 50,000 tokens / 800 tokens/page  |
| Word documents | 100 pages   | 50,000 tokens / 500 tokens/page  |
| PowerPoint     | 75 slides   | 50,000 tokens / 400 tokens/slide |
| JSON/XML       | 3,000 lines | 50,000 tokens / 15 tokens/line   |

---

## Measurement Methodology

### Step 1: Measure Artifact Size

**For files:**

```bash
# Line count
wc -l file.md

# Character count
wc -c file.md

# Word count
wc -w file.md
```

**For PDFs:**

```bash
# Page count
pdfinfo file.pdf | grep Pages

# Extract text and count words
pdftotext file.pdf - | wc -w
```

**For PPTX:**

```bash
# Slide count
unzip -l presentation.pptx | grep "ppt/slides/slide" | wc -l

# Extract text and count words
unzip -p presentation.pptx ppt/slides/*.xml | sed 's/<[^>]*>//g' | wc -w
```

### Step 2: Apply Conversion Rate

**Choose appropriate rate from tables above:**

```bash
# Example: Go code file
LINES=12000
TOKENS_PER_LINE=10
ESTIMATED_TOKENS=$((LINES * TOKENS_PER_LINE))
# 120,000 tokens
```

**For mixed content (e.g., Markdown with code blocks):**

```bash
# Count lines of each type separately
MARKDOWN_LINES=$(grep -v "^\`\`\`" file.md | wc -l)
CODE_LINES=$(sed -n '/^\`\`\`/,/^\`\`\`/p' file.md | wc -l)

# Apply different rates
MARKDOWN_TOKENS=$((MARKDOWN_LINES * 9))
CODE_TOKENS=$((CODE_LINES * 11))

TOTAL_TOKENS=$((MARKDOWN_TOKENS + CODE_TOKENS))
```

### Step 3: Calculate Agent Count

```bash
SAFE_TARGET=50000  # Tokens per agent

# Ceiling division
AGENT_COUNT=$(( (ESTIMATED_TOKENS + SAFE_TARGET - 1) / SAFE_TARGET ))

# Clamp to range [2, 10]
if [ $AGENT_COUNT -lt 2 ]; then
  AGENT_COUNT=2
elif [ $AGENT_COUNT -gt 10 ]; then
  AGENT_COUNT=10
fi
```

---

## Validation and Calibration

### Post-Processing Verification

After agent execution, verify token estimates:

```bash
# If agent reports "context overflow" or truncation:
# - Actual tokens exceeded estimate
# - Increase conversion rate for this content type
# - Re-decompose with more agents

# If agent completed with <30K tokens used:
# - Estimate was too conservative
# - Can combine sections for efficiency
# - Document for future calibration
```

### Calibration Log

Maintain calibration data for continuous improvement:

```yaml
# .claude/.output/large-artifact-processing/calibration.yaml
calibrations:
  - date: "2026-01-10"
    artifact_type: "go_code"
    estimated_tokens: 120000
    actual_tokens: 118500
    error_percent: -1.25
    adjustment: "none"

  - date: "2026-01-10"
    artifact_type: "markdown"
    estimated_tokens: 85000
    actual_tokens: 92000
    error_percent: +8.24
    adjustment: "increase markdown rate from 9 to 10 tokens/line"
```

**Review calibration log quarterly** to refine conversion rates.

---

## Special Cases

### Codebase Analysis (Multiple Files)

When processing entire directories:

```bash
# Count lines per file type
find . -name "*.go" | xargs wc -l | tail -1
find . -name "*.ts" | xargs wc -l | tail -1
find . -name "*.md" | xargs wc -l | tail -1

# Apply rates and sum
GO_TOKENS=$((GO_LINES * 10))
TS_TOKENS=$((TS_LINES * 12))
MD_TOKENS=$((MD_LINES * 9))

TOTAL_TOKENS=$((GO_TOKENS + TS_TOKENS + MD_TOKENS))
```

### Large Tables

Tables can have unpredictable token counts:

- Simple tables (3-5 columns): ~2-3 tokens per cell
- Complex tables (10+ columns): ~4-6 tokens per cell
- With formatting (borders, alignment): +20% overhead

**Recommendation:** For documents with many tables, increase estimate by 15%.

### Diagrams and Images

Text-based diagrams (ASCII, Mermaid):

- ASCII diagrams: Count as code (10-12 tokens/line)
- Mermaid diagrams: ~8-10 tokens/line
- PlantUML: ~10-12 tokens/line

Image descriptions (if extracted via OCR):

- Use general PDF rate: 500 tokens/page
- Technical diagrams with labels: 600-800 tokens/page

---

## Conservative vs Aggressive Estimation

### Conservative (Recommended)

**When to use:**

- First time processing this content type
- Critical workflows requiring reliability
- Production environments

**Approach:**

- Use upper bound of conversion rate range
- Add 20% buffer to final estimate
- Prefer more agents over fewer

**Example:**

```
Markdown file: 8,500 lines
Conservative rate: 10 tokens/line (upper bound)
Estimate: 85,000 tokens
Buffered: 102,000 tokens
Agents: 102,000 / 50,000 = 3 agents
```

### Aggressive

**When to use:**

- Familiar content type with calibration data
- Time-sensitive workflows
- Experimentation and prototyping

**Approach:**

- Use lower bound of conversion rate range
- No buffer applied
- Fewer agents (risk of overflow)

**Example:**

```
Markdown file: 8,500 lines
Aggressive rate: 8 tokens/line (lower bound)
Estimate: 68,000 tokens
Agents: 68,000 / 50,000 = 2 agents (rounded up)
```

**Risk:** If estimate is low, agent may hit context limit mid-processing.

---

## Error Handling for Calibration

If agent reports overflow:

1. **Capture actual token usage** from error message
2. **Calculate error percentage:** `(actual - estimated) / estimated * 100`
3. **Update calibration log**
4. **Re-decompose** with corrected estimate
5. **Increase conversion rate** for this content type going forward

Example error message:

```
Agent 2 exceeded context limit: 58,342 tokens used (50,000 target)
```

Corrective action:

```
Original estimate: 45,000 tokens (4,500 lines * 10)
Actual: 58,342 tokens
Actual rate: 58,342 / 4,500 = 12.96 tokens/line

Action: Increase conversion rate from 10 to 13 tokens/line for this code type
Re-decompose: 4,500 * 13 = 58,500 tokens → Use 2 agents instead of 1
```

---

## Summary

- **Conservative estimation** prevents context overflow at cost of efficiency
- **Calibration log** improves accuracy over time
- **Safe target of 50K tokens** provides buffer for reasoning and cross-references
- **Validate post-processing** to refine conversion rates

**Default strategy:** Start conservative, refine with data.

# Paper Analysis Techniques

**Efficiently extract key findings from academic papers for skill development.**

## Rapid Paper Assessment (5 minutes per paper)

### Step 1: Read Abstract (2 min)

Extract these elements:

| Element              | What to Look For               | Example                              |
| -------------------- | ------------------------------ | ------------------------------------ |
| **Problem**          | What gap is addressed?         | "Current LLMs vulnerable to..."      |
| **Approach**         | What technique is proposed?    | "We introduce prefix-suffix attack..." |
| **Results**          | What metrics improved?         | "95% success rate vs 60% baseline"   |
| **Contribution**     | What's novel?                  | "First automated jailbreak method"   |

**Pass/Fail Decision:**
- ✅ PASS: Clear problem, novel approach, measurable results
- ❌ FAIL: Vague claims, no metrics, "we explore..."

### Step 2: Scan Introduction (1 min)

Look for:

1. **Motivation** - Why does this problem matter?
2. **Related Work** - What prior approaches failed?
3. **Our Contribution** - Bullet list of claims

**Red flags:**
- No related work section (not grounded in literature)
- Claims without citations (not validated)
- Marketing language ("revolutionary", "groundbreaking")

### Step 3: Jump to Conclusion (1 min)

Read final paragraph for:

1. **Summary of findings**
2. **Limitations** (honest papers admit constraints)
3. **Future work** (shows research trajectory)

**What to extract:**
- Can we use this approach?
- What are the known limitations?
- What follow-up papers should we read?

### Step 4: Skim Figures/Tables (1 min)

Visual information often contains:

| Figure Type       | What It Shows              | Use For                    |
| ----------------- | -------------------------- | -------------------------- |
| Architecture      | System design              | Implementation guidance    |
| Performance graph | Technique comparison       | Validation benchmarks      |
| Example outputs   | Real results               | Understanding behavior     |
| Algorithm box     | Pseudocode                 | Implementation steps       |

## Deep Paper Analysis (30 minutes per paper)

**Only perform deep analysis on 1-2 most relevant papers.**

### Methodology Section

**What to extract:**

1. **Data sources** - Training data, evaluation datasets
2. **Implementation details** - Frameworks, hyperparameters
3. **Experimental setup** - Hardware, baselines, metrics
4. **Reproducibility info** - Code availability, seeds

**Template:**

```markdown
### Methodology: {Paper Title}

**Data:**
- Training: {dataset-name} ({size})
- Evaluation: {dataset-name} ({size})

**Implementation:**
- Framework: {PyTorch/TensorFlow/etc}
- Model: {architecture}
- Hyperparameters: {key-settings}

**Reproducibility:**
- Code: {github-url}
- Seeds: {random-seeds}
- Hardware: {GPU-type}
```

### Results Section

**What to extract:**

| Metric Type | Example | Use For |
| ----------- | ------- | ------- |
| **Quantitative** | "95% accuracy" | Benchmark comparison |
| **Qualitative** | Example outputs | Understanding behavior |
| **Ablation** | Component impact | Understanding what matters |
| **Comparison** | vs baseline | Technique validation |

**Template:**

```markdown
### Results: {Paper Title}

**Main Findings:**
- Metric 1: X% (vs Y% baseline)
- Metric 2: X ms latency

**Ablation Study:**
- Without component A: -10% accuracy
- Without component B: -5% accuracy
→ Conclusion: Component A is critical

**Limitations:**
- Does not work on {scenario}
- Requires {constraint}
```

### Code Analysis (if available)

**Priority checks:**

1. **License** - Can we use/adapt it?
2. **Dependencies** - Easy to integrate?
3. **Documentation** - README, examples
4. **Activity** - Last commit, issues resolved
5. **Tests** - Verification available?

**Red flags:**
- No license (legal risk)
- Unmaintained (>1 year no commits)
- No documentation (hard to use)
- Many open issues (quality concerns)

## Extracting Implementation Guidance

### Technique Description

**Pattern:**

```markdown
## Technique: {Name from Paper}

**Source:** arxiv:{id}

**Description:**
{1-2 sentence summary}

**Algorithm:**
1. Step 1: {action}
2. Step 2: {action}
3. Step 3: {action}

**Pseudocode:**
\`\`\`
{simplified pseudocode from paper}
\`\`\`

**Key Insight:**
{why this works - from paper's explanation}
```

### Design Patterns

**Pattern:**

```markdown
## Pattern: {Pattern Name}

**Source:** arxiv:{id}, Section {N}

**Context:**
{when to use this pattern}

**Implementation:**
{how to implement}

**Trade-offs:**
- Pros: {advantages from paper}
- Cons: {limitations from paper}

**Example:**
{code example or system design}
```

### Validation Benchmarks

**Pattern:**

```markdown
## Validation: {Technique Name}

**Source:** arxiv:{id}, Section {N}

**Datasets:**
1. {dataset-name} - {description} - {URL}
2. {dataset-name} - {description} - {URL}

**Metrics:**
1. {metric-name} - {definition} - Target: X%
2. {metric-name} - {definition} - Target: Y ms

**Baseline Comparison:**
| Approach | Metric 1 | Metric 2 |
| -------- | -------- | -------- |
| Baseline | X%       | Y ms     |
| Paper    | X+10%    | Y-20ms   |
| Our impl | ?        | ?        |
```

## Identifying Related Papers

### Forward Citations

**How:** Use Google Scholar or Semantic Scholar

```
site:scholar.google.com arxiv:{id}
```

**Look for:**
- Papers citing this work (validation)
- Papers improving on this work (enhancements)
- Papers comparing to this work (alternatives)

### Backward Citations

**How:** Read "Related Work" section

**Extract:**
- Foundational papers (understand background)
- Competing approaches (alternative techniques)
- Prior failures (what doesn't work)

### Author Follow-up

**How:** Search arxiv by author

```
https://arxiv.org/search/?query=au:{lastname}&searchtype=author
```

**Look for:**
- Follow-up papers (technique evolution)
- Related techniques (author's research area)
- Workshop papers (early ideas)

## Paper Quality Assessment

### Signals of High Quality

| Signal                  | Why It Matters                         |
| ----------------------- | -------------------------------------- |
| Conference venue        | NeurIPS/ICLR/ACL = peer-reviewed       |
| Citation count          | >100 in 1 year = influential           |
| Code availability       | Reproducible                           |
| Thorough evaluation     | Multiple datasets, baselines           |
| Honest limitations      | Authors acknowledge constraints        |
| Clear writing           | Good abstractions, examples            |

### Signals of Low Quality

| Signal                      | Why It Matters                    |
| --------------------------- | --------------------------------- |
| No affiliation              | Not vetted by institution         |
| Vague claims                | "We explore..." instead of results |
| No related work             | Not grounded in literature        |
| Single dataset/baseline     | Overfitting concerns              |
| Marketing language          | "Revolutionary" claims            |
| No code                     | Hard to reproduce                 |

## Synthesis Across Multiple Papers

### Consensus Techniques

**Pattern:**

```markdown
## Consensus: {Approach Name}

**Papers agreeing:**
- arxiv:{id1}: "Quote supporting approach"
- arxiv:{id2}: "Quote supporting approach"
- arxiv:{id3}: "Quote supporting approach"

**Why consensus matters:**
{explanation of validation}

**Recommended implementation:**
{approach validated by multiple papers}
```

### Competing Approaches

**Pattern:**

```markdown
## Competing Approaches: {Problem}

### Approach A
- **Source:** arxiv:{id}
- **Pros:** {advantages}
- **Cons:** {limitations}
- **Use when:** {scenario}

### Approach B
- **Source:** arxiv:{id}
- **Pros:** {advantages}
- **Cons:** {limitations}
- **Use when:** {scenario}

**Recommendation:**
{which approach to use and why}
```

### Evolution of Ideas

**Pattern:**

```markdown
## Technique Evolution: {Topic}

**Generation 1 (YYYY):**
- arxiv:{id}: {approach}
- Limitation: {what didn't work}

**Generation 2 (YYYY):**
- arxiv:{id}: {improvement}
- Addressed: {how limitation was fixed}
- New limitation: {what still doesn't work}

**Generation 3 (YYYY):**
- arxiv:{id}: {current state}
- Addressed: {how previous limitation was fixed}

**Recommendation:**
Use Generation {N} because {reason}
```

## Extraction Templates

### For Skill Creation

```markdown
## Academic Foundation: {Skill Topic}

### Core Technique
**Source:** arxiv:{id}
**Summary:** {1-2 sentences}

### Workflow Phases
1. {Phase from paper}
2. {Phase from paper}
3. {Phase from paper}

### Best Practices
- {Practice validated by paper}
- {Practice validated by paper}

### Anti-Patterns
- {Pattern paper warns against}
- {Pattern paper warns against}

### Validation
**Benchmark:** {dataset from paper}
**Target metric:** {value from paper}
```

### For Capability Creation

```markdown
## Implementation Guide: {Capability Name}

### Technique
**Source:** arxiv:{id}, Algorithm {N}
**Pseudocode:**
\`\`\`
{simplified algorithm}
\`\`\`

### Detection Logic
**Primary signal:** {from paper}
**Secondary signal:** {from paper}
**Confidence:** {from paper evaluation}

### Validation
**Test dataset:** {from paper}
**Expected results:** {from paper}
```

## Related Skills

- **researching-arxiv** - Uses these analysis techniques
- **creating-skills** - Applies extracted patterns
- **writing-fingerprintx-modules** - Uses technical extraction

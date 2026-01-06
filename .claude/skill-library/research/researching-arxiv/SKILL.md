---
name: researching-arxiv
description: Use when researching arxiv.org academic papers to find cutting-edge research on AI, ML, security, and technical topics - guides through query formulation, search execution, paper analysis, and synthesis with structured citations
allowed-tools: Read, Write, Edit, Bash, WebFetch, WebSearch, Grep, Glob, TodoWrite, AskUserQuestion
---

# Researching arxiv.org

**Research methodology for discovering and analyzing academic papers to ground skills in peer-reviewed research.**

## When to Use

Use this skill when:

- Creating skills that need academic backing
- Researching state-of-the-art techniques
- Finding papers on AI, ML, security topics
- Validating approaches against published research
- Understanding theoretical foundations for implementation

**Key Principle:** Academic research provides validated, peer-reviewed foundations. Build on proven techniques instead of ad-hoc solutions.

**You MUST use TodoWrite before starting to track all steps.**

## Quick Reference

| Phase                | Purpose                | Output                             |
| -------------------- | ---------------------- | ---------------------------------- |
| 1. Query Formulation | Define search strategy | 2-3 academic search queries        |
| 2. Search Execution  | Query arxiv.org        | Top 3-5 relevant paper IDs         |
| 3. Paper Analysis    | Extract key findings   | Abstracts, authors, arxiv IDs      |
| 4. Synthesis         | Summarize and cite     | Structured markdown with citations |
| 5. Recommendation    | Prioritize reading     | Ordered list of papers to read     |

## Progress Tracking (MANDATORY)

**Create these todos at workflow start:**

```
1. "Formulate academic search queries for {topic}" (Phase 1)
2. "Execute arxiv.org searches" (Phase 2)
3. "Analyze top papers and extract findings" (Phase 3)
4. "Synthesize research findings" (Phase 4)
5. "Recommend papers for full reading" (Phase 5)
```

---

## Phase 1: Query Formulation

### 1.1 Identify Research Topic

Ask via AskUserQuestion or extract from context:

| Question                                | Purpose                          |
| --------------------------------------- | -------------------------------- |
| What skill/capability are you creating? | Define research scope            |
| What specific technique/approach?       | Narrow search terms              |
| What problem does it solve?             | Identify relevant research areas |
| Any known papers/researchers?           | Starting point for citations     |

**Output:** Research topic statement (1-2 sentences).

### 1.2 Formulate Academic Queries

**Pattern:** Broad → Specific

**Query 1 (Broad):** Core topic with general terms

- Example: `LLM security attacks`
- Purpose: Survey landscape

**Query 2 (Specific):** Technique-focused with technical terms

- Example: `prompt injection jailbreak defense`
- Purpose: Find implementation approaches

**Query 3 (Narrow):** Problem-specific with domain terms

- Example: `retrieval augmented generation security`
- Purpose: Target exact use case

### 1.3 Academic vs Colloquial Terminology

**Use academic terminology, not colloquial:**

| Colloquial         | Academic                                 |
| ------------------ | ---------------------------------------- |
| "LLM hacking"      | "adversarial attacks on language models" |
| "finding services" | "service fingerprinting"                 |
| "agent framework"  | "autonomous agent architectures"         |
| "making AI safe"   | "alignment techniques"                   |

**Why:** arxiv.org indexes academic papers with formal terminology. Colloquial searches return fewer results.

---

## Phase 2: Search Execution

### 2.1 arxiv.org Search API

**Base URL:** `https://arxiv.org/search/`

**Query Parameters:**

| Parameter    | Values                               | Use Case       |
| ------------ | ------------------------------------ | -------------- |
| `query`      | URL-encoded search terms             | Required       |
| `searchtype` | `all`, `title`, `author`, `abstract` | Default: `all` |
| `order`      | `-announced_date_first` (newest)     | Default        |

**Search URL Pattern:**

```text
https://arxiv.org/search/?query={URL_ENCODED_QUERY}&searchtype=all&source=header
```

### 2.2 Execute Searches

For each query from Phase 1:

```bash
# Query 1 (Broad)
WebFetch("https://arxiv.org/search/?query=LLM+security+attacks&searchtype=all",
         "Extract the top 10 paper titles, authors, and arxiv IDs from search results")

# Query 2 (Specific)
WebFetch("https://arxiv.org/search/?query=prompt+injection+defense&searchtype=title",
         "Extract paper titles and arxiv IDs where title matches prompt injection defense")

# Query 3 (Narrow)
WebFetch("https://arxiv.org/search/?query=RAG+security&searchtype=abstract",
         "Extract papers with abstracts mentioning RAG security concerns")
```

### 2.3 Parse Search Results

Extract from each search results page:

| Field       | Location                | Format             |
| ----------- | ----------------------- | ------------------ |
| Paper Title | `<p class="title">`     | Plain text         |
| Authors     | `<p class="authors">`   | Comma-separated    |
| arxiv ID    | `/abs/{ID}`             | `YYMM.NNNNN`       |
| Published   | `<p class="is-size-7">` | Date string        |
| Abstract    | `/abs/{ID}` page        | Full abstract text |

**Output:** List of 10-15 papers with metadata.

---

## Phase 3: Paper Analysis

### 3.1 Identify Top 3-5 Relevant Papers

From search results, select papers based on:

| Criterion          | Why It Matters                      |
| ------------------ | ----------------------------------- |
| Title relevance    | Direct match to research topic      |
| Recent publication | State-of-the-art techniques         |
| Citation count     | Community validation (if available) |
| Author reputation  | Known researchers in the field      |

### 3.2 Fetch Paper Abstract Pages

For each selected paper:

```bash
WebFetch("https://arxiv.org/abs/{arxiv-id}",
         "Extract full abstract, authors, publication date, and any code/dataset links")
```

### 3.3 Extract Key Findings

For each paper, document:

**Paper Metadata:**

- Title
- Authors
- arxiv ID (e.g., `2401.12345`)
- Publication date
- Links (code repo, dataset, project page)

**Key Findings (1-2 sentences):**

- What technique/approach is proposed?
- What problem does it solve?
- What are the results/conclusions?

**Relevance to Current Task:**

- How does this apply to your skill/capability?
- What can you adopt or adapt?

---

## Phase 4: Synthesis

### 4.1 Structured Output Format

Create research findings document:

```markdown
## arxiv Research: {topic}

**Date:** {current-date}
**Purpose:** Research for {skill-name} skill creation

### Search Queries Used

1. {query1} - {N} results
2. {query2} - {N} results
3. {query3} - {N} results

### Relevant Papers

**1. {Paper Title}**

- **arxiv:** {arxiv-id} - [Link](https://arxiv.org/abs/{arxiv-id})
- **Authors:** {authors}
- **Date:** {publication-date}
- **Key Finding:** {1-2 sentence summary}
- **Relevance:** {why this matters for the current task}
- **Code:** {github-link} (if available)

**2. {Paper Title}**

- **arxiv:** {arxiv-id} - [Link](https://arxiv.org/abs/{arxiv-id})
- **Authors:** {authors}
- **Date:** {publication-date}
- **Key Finding:** {1-2 sentence summary}
- **Relevance:** {why this matters}

... (repeat for 3-5 papers)

### Synthesis

{2-3 paragraphs summarizing:}

- Common themes across papers
- Consensus approaches vs competing techniques
- Gaps in current research
- Recommendations for skill implementation

### Implementation Guidance

Based on research findings:

1. **Technique:** {recommended approach from papers}
2. **Pattern:** {design pattern validated by research}
3. **Validation:** {how to test against paper benchmarks}
4. **Limitations:** {known issues from papers}

### Recommended Reading

Priority order for full paper reading:

1. **{arxiv-id}** - {paper-title}
   - **Why:** {primary contribution relevant to task}

2. **{arxiv-id}** - {paper-title}
   - **Why:** {implementation details needed}

3. **{arxiv-id}** - {paper-title}
   - **Why:** {alternative approach for comparison}
```

### 4.2 Output Location

**Output location depends on invocation mode:**

**Mode 1: Standalone (invoked directly)**

```bash
ROOT="$(git rev-parse --show-superproject-working-tree --show-toplevel | head -1)"
TIMESTAMP=$(date +"%Y-%m-%d-%H%M%S")
TOPIC="{semantic-topic-name}"
mkdir -p "$ROOT/.claude/.output/research/${TIMESTAMP}-${TOPIC}-arxiv"
# Write synthesis to: $ROOT/.claude/.output/research/${TIMESTAMP}-${TOPIC}-arxiv/SYNTHESIS.md
```

**Mode 2: Orchestrated (invoked by orchestrating-research)**

When parent skill provides `OUTPUT_DIR`:

- Write synthesis to: `${OUTPUT_DIR}/arxiv.md`
- Do NOT create directory (parent already created it)

**Detection logic:** If parent skill passed an output directory path, use Mode 2. Otherwise use Mode 1.

### 4.3 Citation Format

**Always use arxiv ID format:**

✅ CORRECT:

- `arxiv:2401.12345`
- `[Paper Title](https://arxiv.org/abs/2401.12345)`
- "As shown in arxiv:2401.12345, the technique..."

❌ INCORRECT:

- `arXiv.org/2401.12345` (wrong domain format)
- `paper-url` (not machine-readable)
- No citation at all

**Why:** arxiv IDs are permanent identifiers. URLs and titles can change.

---

## Phase 5: Recommendation and Integration

### 5.1 Prioritize Papers for Full Reading

Order papers by:

1. **Direct relevance** - Addresses exact problem
2. **Implementation detail** - Provides code/algorithms
3. **Novelty** - Recent techniques not yet widely adopted
4. **Validation** - Includes benchmarks for testing

### 5.2 Integration with Skill Creation

Use research findings to populate skill content:

| Skill Section  | arxiv Research Input             |
| -------------- | -------------------------------- |
| Overview       | Synthesis summary                |
| Key Principle  | Consensus approach from papers   |
| Implementation | Techniques from paper algorithms |
| Best Practices | Validated patterns from research |
| Anti-Patterns  | Known limitations from papers    |
| References     | arxiv citations                  |

### 5.3 Update Skill with Citations

In skill SKILL.md:

```markdown
## Theoretical Foundation

This approach is grounded in:

- **Technique X:** Validated by arxiv:2401.12345 showing 95% accuracy
- **Pattern Y:** Based on arxiv:2402.67890 framework
- **Validation:** Benchmark against arxiv:2403.11111 dataset

**See:** [Research Findings](references/arxiv-research.md)
```

Place full research document in `references/arxiv-research.md`.

---

## Common Search Patterns by Topic

| Topic Area         | Example Queries                                                                           |
| ------------------ | ----------------------------------------------------------------------------------------- |
| **LLM Security**   | `adversarial attacks language models`, `prompt injection`, `jailbreak defense`            |
| **AI Agents**      | `autonomous agent architectures`, `tool use LLM`, `function calling`                      |
| **RAG**            | `retrieval augmented generation`, `vector search optimization`, `hallucination reduction` |
| **Fingerprinting** | `service detection`, `protocol fingerprinting`, `network scanning`                        |
| **Vulnerability**  | `vulnerability discovery`, `static analysis`, `fuzzing techniques`                        |
| **ML Security**    | `model inversion`, `membership inference`, `data poisoning`                               |

---

## Advanced Search Techniques

### Multi-Category Search

Combine categories with `+` (AND):

```text
https://arxiv.org/search/?query=cs.AI+AND+cs.CR&searchtype=all
```

**Common categories:**

- `cs.AI` - Artificial Intelligence
- `cs.CR` - Cryptography and Security
- `cs.LG` - Machine Learning
- `cs.SE` - Software Engineering
- `cs.NI` - Networking and Internet Architecture

### Author-Specific Search

```text
https://arxiv.org/search/?query=au:researcher_lastname&searchtype=author
```

### Date-Filtered Search

Add to query:

```text
query=LLM+security+AND+submittedDate:[202401+TO+202412]
```

---

## Quality Indicators

When selecting papers, look for:

| Indicator          | What It Means                                         |
| ------------------ | ----------------------------------------------------- |
| Author affiliation | University/research lab = peer review process         |
| References count   | >30 = comprehensive literature review                 |
| Abstract clarity   | Clear problem/approach/results = rigorous methodology |
| Code availability  | GitHub link = reproducible                            |
| Dataset provided   | Public dataset = verifiable                           |
| Version history    | Multiple versions = iterative refinement              |

**Red flags:**

- No affiliation listed
- Vague claims without metrics
- No references to prior work
- "Revolutionary" claims without proof

---

## Integration with Research Orchestration

This skill is invoked during research orchestration via `orchestrating-research`:

```
skill: "orchestrating-research"
```

Research orchestration typically delegates to:

1. **Codebase research** - Find similar skills/patterns
2. **Context7 research** - Library documentation
3. **arXiv research** - Academic papers (THIS SKILL)
4. **Web research** - Supplemental sources

**Output:** Comprehensive research document combining all sources.

---

## Common Rationalizations (DO NOT SKIP)

| Rationalization                  | Why It's Wrong                                |
| -------------------------------- | --------------------------------------------- |
| "I know this topic"              | Training data is 12-18 months stale           |
| "Just use WebSearch"             | Blog posts ≠ peer-reviewed research           |
| "Too academic for practical use" | Academic papers contain production techniques |
| "No time for research"           | 15 min research prevents hours of rework      |
| "This is too simple"             | Even basic topics have cutting-edge research  |
| "Papers are too theoretical"     | Many include implementation sections          |

---

## Validation Checklist

Before completing research:

- [ ] Formulated 2-3 academic queries (not colloquial)
- [ ] Executed searches on arxiv.org (not generic search)
- [ ] Analyzed 3-5 papers (not just abstracts)
- [ ] Cited with arxiv IDs (not generic URLs)
- [ ] Created structured synthesis (not just list)
- [ ] Prioritized reading list (not random order)
- [ ] Integrated findings into skill content

---

## References

- [Search Query Formulation](references/query-formulation.md) - Academic terminology patterns
- [Paper Analysis Techniques](references/paper-analysis.md) - Extract key findings efficiently
- [Citation Standards](references/citation-standards.md) - Proper arxiv ID formatting

## Related Skills

| Skill                    | Purpose                                         |
| ------------------------ | ----------------------------------------------- |
| `orchestrating-research` | Orchestrator delegating to this skill (CORE)    |
| `researching-protocols`  | Sibling skill for network protocol research     |
| `creating-skills`        | Uses research orchestration in Phase 6          |
| `updating-skills`        | Uses research orchestration when adding content |

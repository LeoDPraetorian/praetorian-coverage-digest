# Book-to-Skill Architecture

**Domain-specific specialization of large artifact processing for technical books with known structure.**

## Design Philosophy

This skill is **NOT** a general-purpose large artifact processor. It is a **domain-specific specialization** optimized for technical books where we have **guaranteed structural assumptions**:

1. **Input format is always markdown** (either OCR'd or converted from EPUB)
2. **Books always have hierarchical chapter structure** (numbered chapters with sections)
3. **Table of Contents exists** (for keyword extraction and chapter mapping)
4. **Content is static** (no streaming, no dynamic generation)
5. **Output is skill documentation** (references/chapters/ + SKILL.md)

These assumptions enable architectural choices that would be inappropriate for general artifact processing.

## Architectural Differences from `processing-large-artifacts`

### Scope Comparison

| Aspect               | `processing-large-artifacts`                           | `converting-books-to-skills` (This Skill)                    |
| -------------------- | ------------------------------------------------------ | ------------------------------------------------------------ |
| **Input formats**    | Any (code, MD, PDF, JSON, XML, PPT, Word)              | Markdown only (OCR'd books or EPUB-converted)                |
| **Structure**        | Unknown - must discover boundaries dynamically         | Known - chapters with numbered/titled headers                |
| **Boundary logic**   | Generic (H1/H2, functions, classes, arbitrary splits)  | Book-specific (chapter numbers, TOC references)              |
| **Token estimation** | Multi-format heuristics (10/line code, 8/line MD, etc) | Single format (markdown: ~8-10 tokens/line)                  |
| **Modes**            | 3 modes (analyze, split, verify)                       | Single mode (convert to skill)                               |
| **Output**           | Variable (summaries, split files, coverage reports)    | Fixed (SKILL.md + references/chapters/ + keyword extraction) |
| **Parallelization**  | Dynamic (2-10 agents based on size)                    | Sequential (chapter-by-chapter extraction)                   |
| **Metadata**         | Generic (MANIFEST.yaml with workflow phases)           | Book-specific (title, author, edition, TOC keywords)         |

### Why These Differences Matter

**1. Input Format Specialization**

```bash
# processing-large-artifacts: Must detect format first
wc -l file.md         # Lines
file -b file.pdf      # MIME type detection
jq . file.json        # Format validation

# converting-books-to-skills: Markdown guaranteed
wc -l book.md         # Lines (already know format)
head -200 book.md     # Preview structure (skip format detection)
```

**Rationale:** Books converted via OCR or EPUB are always markdown. No need for multi-format detection logic. This eliminates an entire phase of the workflow.

**2. Structure Detection Strategy**

```bash
# processing-large-artifacts: Generic boundary discovery
grep -n "^#" file.md | head -50              # Any H1/H2
grep -n "^func |^class |^def " code.go       # Functions/classes
# Unknown what boundary pattern will exist

# converting-books-to-skills: Book-specific patterns
grep -n "^##\s\+CHAPTER\|^##\s\+[0-9]" book.md  # Chapter markers (known pattern)
sed -n '100,300p' book.md | grep -i "chapter"   # TOC validation (known location)
```

**Rationale:** Technical books follow consistent conventions:

- Chapters are numbered (sequential integers)
- Chapter headers follow patterns (`## CHAPTER 8`, `## 1 TITLE`)
- Table of Contents lists all chapters (for validation)

We don't need generic boundary discovery - we know chapters exist and can directly search for them.

**3. Token Budget Simplification**

```bash
# processing-large-artifacts: Multi-format estimation
# Code: lines * 10 = tokens
# Markdown: lines * 8-10 = tokens
# JSON: lines * 12-15 = tokens
# Need conditional logic based on format

# converting-books-to-skills: Single format
# Markdown: lines * 8-10 = tokens (always)
# Fixed calculation, no branching
```

**Rationale:** Since input is always markdown, we use a single token estimation formula. This removes complexity from size checking and chunk validation.

**4. Workflow Modes**

```bash
# processing-large-artifacts: 3 modes
Mode: analyze  → Parallel agents extract understanding
Mode: split    → Parallel agents decompose monolith
Mode: verify   → Compare split vs original coverage

# converting-books-to-skills: Single mode
Always: Convert book → SKILL.md + references/chapters/
```

**Rationale:** Books have one use case: become discoverable skills with chapter-based references. We don't need analysis-only mode (always converting) or verification mode (chapters are extracted sequentially, not parallelized, so coverage is guaranteed).

**5. Output Structure**

```bash
# processing-large-artifacts: Variable outputs
analyze mode:  summary.md (synthesis from parallel agents)
split mode:    00-INDEX.md + {split-files} (decomposed monolith)
verify mode:   gap-report.md (coverage analysis)

# converting-books-to-skills: Fixed outputs
Always:        SKILL.md (skill interface) + references/chapters/chapter-NN.md (content)
```

**Rationale:** Books always become skills with the same structure:

- SKILL.md (skill interface with chapter navigation)
- references/chapters/ (chapter files for content access)
- Keywords extracted from TOC (for skill description)

This fixed structure enables templates and eliminates mode-specific logic.

**6. Parallelization Strategy**

```bash
# processing-large-artifacts: Parallel agent dispatch
# Sections = ceil(estimated_tokens / 50,000)
# Min 2 agents, max 10 agents
# Each agent processes independent section concurrently

Task(prompt="Analyze section 1...", subagent_type="general-purpose", description="Section 1")
Task(prompt="Analyze section 2...", subagent_type="general-purpose", description="Section 2")
# ... N agents running in parallel

# converting-books-to-skills: Sequential extraction
# Extract chapter boundaries first (single grep)
# Extract each chapter with sed (sequential, deterministic)

sed -n '534,8922p' book.md > chapter-08.md
sed -n '8923,12692p' book.md > chapter-09.md
# ... Sequential sed commands
```

**Rationale:**

- **Books have clear boundaries** - chapters are already delineated by headers, we just extract them
- **No synthesis needed** - chapters are independent content units, no cross-referencing required during extraction
- **Deterministic output** - sed with line ranges guarantees exact chapter content, no agent interpretation
- **Simpler debugging** - sequential extraction is easier to verify than parallel agent coordination

**When to use parallel agents (processing-large-artifacts pattern):**

- Boundaries are ambiguous (need human judgment to split)
- Content needs synthesis (multiple perspectives on same data)
- Analysis requires context (agents must interpret relationships)

**When to use sequential extraction (this skill's pattern):**

- Boundaries are explicit (grep finds chapter markers)
- Content is pre-structured (chapters are independent)
- Output is literal (copy content, don't transform)

**7. Metadata Extraction**

```bash
# processing-large-artifacts: Generic workflow metadata
MANIFEST.yaml:
  artifact_type: code/document/pdf
  boundary_strategy: h1/h2/functions/classes
  agent_count: N
  sections: [list of split boundaries]

# converting-books-to-skills: Book-specific metadata
SKILL.md frontmatter:
  name: book-topic-skill
  description: keywords from TOC
SKILL.md content:
  author: {from book metadata}
  edition: {from book metadata}
  chapter_table: [chapter summaries]
```

**Rationale:** Books have domain-specific metadata (author, edition, TOC keywords) that's more valuable than generic workflow metadata (agent count, boundary strategy). We extract the metadata readers care about.

## Architectural Trade-offs

### What We Gain

**Simplicity:**

- Single input format → No format detection
- Known structure → Direct chapter extraction
- Fixed output → Template-based generation
- Sequential workflow → No agent coordination overhead

**Speed:**

- Skip boundary discovery → Use chapter pattern directly
- Skip parallelization → Sequential sed faster for deterministic splits
- Skip synthesis → Chapters are independent content units

**Reliability:**

- Chapters always exist → No "what if structure is missing" logic
- TOC provides validation → Can verify all chapters found
- Sequential extraction → Deterministic output, no agent hallucination

### What We Lose

**Generality:**

- Cannot process non-book content (e.g., API docs without chapters)
- Cannot handle unstructured text (e.g., blog posts)
- Cannot adapt to non-markdown formats (e.g., PDF without OCR)

**Flexibility:**

- Single output structure (cannot produce summaries-only or index-only)
- Chapter-based chunking only (cannot split by topics across chapters)
- Sequential processing (cannot leverage parallelization for very large books)

### Why These Trade-offs Are Acceptable

**Books are a bounded domain:**

- Technical books follow consistent conventions (chapters, TOC, numbered structure)
- OCR and EPUB conversion produce predictable markdown
- Content structure is hierarchical and explicit (not ambiguous)

**Specialization enables automation:**

- Template-based SKILL.md generation (no manual writing)
- Automated keyword extraction from TOC (no manual tagging)
- Deterministic chapter splitting (no boundary judgment calls)

**Users expect fixed output:**

- Skills always have SKILL.md + references/ structure
- Chapter files are the access pattern for book content
- Keyword-based discovery is standard for skills

## When to Use Which Skill

### Use `converting-books-to-skills` (This Skill)

**Criteria:**

- ✅ Input is markdown (OCR'd or EPUB-converted)
- ✅ Content is a technical book with chapters
- ✅ Goal is to create a discoverable skill
- ✅ Table of Contents exists (for keyword extraction)
- ✅ Chapters are numbered/titled consistently

**Examples:**

- "Convert Windows Internals Part 2 to a skill"
- "Create a skill from Art of Mac Malware (EPUB)"
- "Make the Evading EDR book searchable in Claude"

### Use `processing-large-artifacts` Skill

**Criteria:**

- ✅ Input format is unknown or non-markdown (PDF, code, JSON, etc.)
- ✅ Content structure is ambiguous (need boundary discovery)
- ✅ Goal is analysis/summary (not skill creation)
- ✅ Multiple output modes needed (analyze vs split vs verify)
- ✅ Parallelization required (>400K tokens, need speed)

**Examples:**

- "Analyze this 50K-line codebase for security issues"
- "Split ARCHITECTURE.md into logical files"
- "Summarize this 200-page PDF research paper"
- "Verify no gaps between split documentation files"

### Overlap Cases (Either Skill Could Work)

**Markdown documentation without clear chapters:**

- `processing-large-artifacts`: Use analyze mode to understand structure first
- `converting-books-to-skills`: Not suitable (requires chapter structure)

**Book with 20+ chapters (very large):**

- `processing-large-artifacts`: Could parallelize analysis across chapters
- `converting-books-to-skills`: Sequential extraction still works (books rarely exceed context limits)

**Book needs summary-only (no skill creation):**

- `processing-large-artifacts`: Use analyze mode
- `converting-books-to-skills`: Not suitable (always creates skill structure)

## Architectural Principles

These principles guided the design of this skill:

**1. Leverage Domain Constraints**

Don't write generic code when domain-specific assumptions enable simpler solutions.

```bash
# Generic: "Find boundaries in any content"
# Book-specific: "Extract chapters by number"
```

**2. Fixed Structure Enables Templates**

When output is predictable, use templates instead of dynamic generation.

```bash
# Generic: "Synthesize summary from agent outputs"
# Book-specific: "Fill SKILL.md template with chapter table"
```

**3. Sequential > Parallel for Deterministic Tasks**

Parallelization adds complexity. Only use it when speed matters and tasks are independent.

```bash
# Books: Chapters are explicit → Sequential sed extraction
# Codebases: Boundaries ambiguous → Parallel agent analysis
```

**4. Metadata Extraction Is Domain-Specific**

Extract the metadata users need, not generic workflow data.

```bash
# Generic: "How many agents? What boundaries?"
# Book-specific: "Who's the author? What topics?"
```

**5. Optimize for the Common Case**

Most technical books:

- Have 8-14 chapters (not 100+)
- Use numbered chapters (not unlabeled sections)
- Have TOC in first 300 lines (not missing)
- Fit in context (not 500K+ tokens)

Design for the 95% case. Edge cases can be handled manually.

## Future Enhancements (Not Implemented)

**If we encounter books that violate assumptions:**

**1. Books without chapters (e.g., reference manuals with A-Z entries):**

→ Fallback to `processing-large-artifacts` for boundary discovery

**2. Books with 50+ chapters (rare, but possible):**

→ Add parallelization for chapter extraction (currently sequential)

**3. Non-markdown input (raw PDF, EPUB without conversion):**

→ Add format detection phase (currently skipped)

**4. Books without TOC (e.g., OCR errors):**

→ Add keyword extraction from chapter titles (currently TOC-based)

**Currently, these edge cases are rare enough to handle manually.** The architectural simplicity gained by specializing for the common case outweighs the cost of manual edge case handling.

## Related Documentation

- [chapter-detection-strategies.md](chapter-detection-strategies.md) - How we find chapters (domain-specific patterns)
- [keyword-extraction-patterns.md](keyword-extraction-patterns.md) - How we extract keywords from TOC (book metadata)
- [chapter-splitting-techniques.md](chapter-splitting-techniques.md) - How we handle oversized chapters (>25K tokens)
- [semantic-splitting-guide.md](semantic-splitting-guide.md) - When to split chapters at topic boundaries

## Comparison to `processing-large-artifacts`

For detailed comparison of the general-purpose skill, see:

```
Read(".claude/skill-library/claude/processing-large-artifacts/SKILL.md")
```

**Key insight:** `processing-large-artifacts` is the **general-purpose framework** for any large content. This skill is a **specialized implementation** for the bounded domain of technical books. Both exist because:

- **General-purpose tools** handle edge cases and unknown inputs
- **Specialized tools** are simpler and faster for known domains

**Use the right tool for the job.**

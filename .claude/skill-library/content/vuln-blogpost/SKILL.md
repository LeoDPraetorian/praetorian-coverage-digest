---
name: vuln-blogpost
description: Generate interactive branded HTML blog outlines from vulnerability show-and-tell transcripts with anonymization, Writer Mode, FAQ/AEO, code scaffolds, CVE cross-references, social drafts, and publishing checklists
allowed-tools: Read, Write, Bash, Grep, Glob, TodoWrite, Skill, WebFetch, WebSearch, Task, Edit
---

# Generating Vulnerability Blog Posts

**End-to-end pipeline that transforms weekly vulnerability presentations into branded, interactive HTML blog outlines that engineers actually want to use.**

Each outline is a self-contained HTML file with two modes:
- **The Pitch** — Branded Praetorian outline for reading or printing to PDF
- **The Writer** — Interactive section-by-section writing companion with auto-save, word counts, and markdown export

## How to Run This

### The Simple Way (just say it)

```
"Process the [date] show and tell transcript"
"Generate blog outlines from the vulnerability meeting"
"Here's the transcript from this week's vuln show and tell"
```

The `gateway-reporting` routes these phrases to this skill automatically.

### Step-by-Step (what happens)

1. You provide the transcript file (drag-and-drop or file path)
2. Claude normalizes the transcript, identifies findings, scores each one
3. Findings scoring 7.0+ get full branded HTML outlines generated in parallel
4. All client/vendor names are anonymized, branding applied from Marketing Color Guide
5. Writer Mode is injected into each HTML file
6. Files open in your browser — ready to send to engineers

**Total time: ~15-20 minutes for 3 findings**

---

## Quick Reference

| Phase                         | Purpose                                                  | Time    |
| ----------------------------- | -------------------------------------------------------- | ------- |
| 0. Transcript Normalization   | Parse any transcript format into clean speaker-turns     | 1-2 min |
| 1. Transcript Analysis        | Score blog potential, identify findings, lookup CVEs     | 3-5 min |
| 2. Anonymization Planning     | Apply vendor/client redaction rules                      | 2-3 min |
| 3. HTML Outline Generation    | Branded HTML with SEO/AEO, FAQ, code scaffolds, socials | 6-8 min |
| 4. Writer Mode Injection      | Add interactive writing companion to each HTML file      | 1-2 min |
| 5. Verification & Delivery    | Open files, verify anonymization, generate MANIFEST      | 1-2 min |

---

## Input Specification

### Transcript File

Supported formats (auto-detected):

| Format | Source | Detection Pattern |
|--------|--------|-------------------|
| Gemini .docx | Google Meet + Gemini | `.docx` with speaker labels and timestamps |
| Markdown/Text | Manual transcription | `.md` or `.txt` extension |
| VTT | Zoom, Google Meet | `WEBVTT` header, `HH:MM:SS.mmm --> HH:MM:SS.mmm` timestamps |
| SRT | Subtitle exports | Sequential numbering + `HH:MM:SS,mmm --> HH:MM:SS,mmm` |
| Otter.ai | Otter transcription | Speaker labels like `Speaker 1 00:00` |

**For .docx files**: Use `python3 -c "import docx; ..."` or equivalent to extract text content, then process as markdown.

### Optional Metadata (speeds processing)

```yaml
metadata:
  session_date: 2026-02-19
  presenter: "Name"
  presenter_title: "Senior Security Researcher"
  topic_hint: "AI agent sandbox escape via binary deception"
  related_engagement: "ENG-12345"
  disclosure_date: 2024-01-15
```

If metadata is not provided, extract from transcript content where possible.

---

## Workflow

### Phase 0: Transcript Normalization

**Goal**: Convert any transcript format into clean speaker-turn markdown.

**Process:**

1. **Detect format** from file extension and content patterns
2. **For .docx files**: Extract text using python-docx or similar tooling
3. **Strip timestamps** (preserve as comments if useful for engineer reference)
4. **Identify speakers** — separate presenter content from Q&A discussion
5. **Identify individual findings** — each presenter typically covers one vulnerability
6. **Extract key moments** — flag sections with POC demos, code references, disclosure discussion
7. **Output**: Clean markdown with `### Presenter:` and `### Q&A:` sections per finding

---

### Phase 1: Transcript Analysis

**Goal**: Determine blog potential per finding, extract structured data, gather CVE context.

**Process:**

1. **Read normalized transcript and supporting materials**
2. **Extract findings** — For each presenter/finding, capture: vulnerability type, CVSS estimate, impact scope, POC results, disclosure status
3. **Score blog potential (0-10 scale)** — Threshold: 7.0+ recommended. If <7.0, ask user whether to proceed.
4. **Search for related CVEs** — Use WebSearch to find CVEs in the same vulnerability class. Include 2-3 related CVEs per finding.
5. **Identify technical gaps** — disclosure timelines, CVSS scores, vendor responses, screenshot status, client approval needs
6. **Calculate estimated read time** — Sum word count targets per section, divide by 238 wpm
7. **Rank findings by blog potential** — Recommend publication order

**See:** [references/blog-potential-scoring.md](references/blog-potential-scoring.md) for scoring rubrics.

---

### Phase 2: Anonymization Planning

**Goal**: Apply consistent redaction rules. This is NOT optional.

**Process:**

1. **Identify all proper nouns** in transcript — client names, vendor names, product names, people, URLs, internal tool names
2. **Apply rubric systematically** — document every preserve/redact decision
3. **Create anonymization map per finding** — e.g., `"ClientCo" → "a SaaS platform"`, `"AcmeVendor" → "the email provider"`
4. **Determine legal gate** — If client engagement under NDA: `legal_gate: REQUIRED`. If public bug bounty: `legal_gate: NOT_REQUIRED`

**Edge cases requiring user confirmation:**

- Vendor is both client AND product owner
- Vulnerability disclosed but fix not deployed
- Product name uniquely identifies client

**See:** [references/anonymization-rubric.md](references/anonymization-rubric.md) for decision rules.

---

### Phase 3: HTML Outline Generation

**Goal**: Generate branded, self-contained HTML blog outlines using the Praetorian template.

**CRITICAL: Read these reference files before generating:**

```
Read("references/blog-outline-template.html")   — HTML/CSS template with brand system
Read("references/voice-and-seo-standards.md")    — Voice profile, SEO/AEO standards
Read("references/engineer-markers.md")           — Engineer marker patterns
Read("references/publishing-checklists.md")      — Checklist templates
```

**Process per finding:**

1. **Read the HTML template** at `references/blog-outline-template.html`
2. **Generate the complete HTML file** following the template structure exactly
3. **Apply anonymization** from Phase 2 — replace all entities per the anonymization map
4. **Populate all sections**: Title Options, Keywords/Meta, Blog Structure (with content direction, voice notes, engineer markers per section), FAQ (3-5 Q&A pairs), Code Scaffolds, CVE table, Internal Links, Social Drafts, Anonymization Log, Publishing Checklist
5. **Wrap the body content** in `<div id="pitch-mode">` (required for Writer Mode)
6. **Apply brand colors** from the Praetorian Marketing Color Guide (already in template CSS)
7. **Save as**: `blog-outline-{n}-{slug}-ANONYMIZED.html`

**Brand Color Guide** (enforced in template CSS variables):

| Color | Hex | Usage |
|-------|-----|-------|
| Primary Red | `#E63948` | Action, CTA, emphasis |
| Primary Background | `#0D0D0D` | Page background |
| Secondary Background | `#1F252A` | Cards, header |
| Tertiary Background | `#3A4044` | Hover states, borders |
| Primary Border | `#535B61` | Borders, muted text |
| Secondary Blue | `#11C3DB` | Intelligence, links (sparingly) |
| Complementary Gold | `#D4AF37` | Authority, accent (rare) |
| Secondary Text | `#A0A4A8` | Body text |
| **NO PURPLE** | — | Purple is NOT in the brand guide |

**Parallel generation**: When processing multiple findings, use the Task tool to generate outlines in parallel (one agent per finding). Each agent should read the template and references independently.

**Title crafting**: Generate 3 options — narrative hook (RECOMMENDED), technical depth (SEO), practitioner-focused (engagement).

**FAQ generation rules:**

- Transform AEO target questions into full Q&A pairs
- Lead each answer with 2-3 sentence direct answer (optimized for AI snippet extraction)
- Reference the blog section containing full detail
- Minimum 3, maximum 5 Q&A pairs

**Code extraction rules:**

- Scan transcript for: `curl` commands, JSON payloads, Python/Go snippets, API paths, configuration blocks
- Scaffold each into a fenced code block with language tag
- Mark each: `ENGINEER TO COMPLETE: verify accuracy, sanitize credentials, test reproduction`

**See:**

- [references/engineer-markers.md](references/engineer-markers.md) for marker patterns
- [references/voice-and-seo-standards.md](references/voice-and-seo-standards.md) for voice and SEO
- [references/publishing-checklists.md](references/publishing-checklists.md) for checklists

---

### Phase 4: Writer Mode Injection

**Goal**: Add the interactive writing companion to each HTML file.

**Process:**

1. **Read the Writer Mode snippet**: `Read("references/writer-mode-snippet.html")`
2. **For each HTML outline file**, inject the snippet before `</body>`:
   - The snippet includes: Start Writing button, Writer overlay (sidebar + main), Export modal, Celebration/Completion overlays, all CSS, all JavaScript
   - The JavaScript automatically extracts sections from the `#pitch-mode` DOM at runtime
3. **Verify injection** — grep each file for: `id="pitch-mode"`, `id="writer-overlay"`, `start-writing-btn`, `id="export-modal"`

**Writer Mode features (included in snippet):**

- Section-by-section writing wizard with content direction reference cards
- Word count tracking per section with visual progress bars
- Auto-save to localStorage (persists across browser sessions)
- Writing timer
- Markdown generation with CMS frontmatter
- Download as `.md` or copy to clipboard
- Section completion celebrations
- Draft completion overlay with stats

---

### Phase 5: Verification & Delivery

**Goal**: Verify everything works, generate MANIFEST, deliver to user.

**Process:**

1. **Verify anonymization** — `grep -ri` for all client/vendor/product names across all HTML files. Zero matches required.
2. **Verify brand compliance** — No `#7A5AF1` (purple), no `#1A1A2E` (old backgrounds) in any file.
3. **Verify HTML structure** — Each file has `pitch-mode`, `writer-overlay`, `export-modal`, `start-writing-btn`.
4. **Generate MANIFEST.yaml** with metadata for each finding
5. **Open all files in browser** — `open <file>` for macOS
6. **Report to user** with summary: finding count, scores, publication order, any legal gates

---

## Output Format

Blog post outlines are saved to: `.claude/.output/blog-posts/{date}-{session-slug}/`

**Files created:**

- `blog-outline-{n}-{slug}-ANONYMIZED.html` — Branded interactive HTML (THE deliverable)
- `MANIFEST.yaml` — Metadata, scores, rankings, processing log

**MANIFEST.yaml structure:**

```yaml
session:
  date: 2026-02-19
  title: "Weekly Vulnerability Show and Tell"
  transcript_source: "filename.docx"
  presenters:
    - Name One
    - Name Two
  generated: 2026-02-24
  generator: vuln-blogpost v3.0
  output_format: branded_html

artifacts:
  - path: blog-outline-1-{slug}-ANONYMIZED.html
    type: blog-outline-html
    finding_number: 1
    presenter: Name One
    metadata:
      title: "Blog Title Here"
      blog_potential_score: 8.5
      vulnerability_types: [type1, type2]
      anonymization_status: ANONYMIZED
      engineer_markers_count: 12
      estimated_word_count: 2400
      estimated_read_time: "10 min"
      disclosure_status: vendor_bug_bounty
      related_cves: ["CVE-2024-XXXXX"]
      faq_questions_count: 4
      code_scaffolds_count: 2
      social_drafts_included: true
      legal_gate: NOT_REQUIRED
      complexity: MEDIUM

rankings:
  by_blog_potential:
    1: "Finding N - Description (score)"
  recommended_publication_order:
    1: "Finding N - Reason"
```

---

## Trigger Mechanisms

### Claude Code (Primary)

Say any of these:

```
"Process the [date] show and tell transcript"
"Generate blog outlines from this vulnerability meeting"
"vuln blog from [file]"
"show and tell transcript → blog outlines"
```

The `gateway-reporting` skill detects keywords ("vuln blog", "meeting transcript", "show and tell") and routes here.

### Planned: Email Automation

```
1. Vulnerability call happens (weekly)
2. Gemini generates .docx transcript
3. You upload transcript to Claude Code
4. Outlines generate automatically
5. Outlines are emailed to presenters with the interactive HTML attached
```

---

## Integration

### Called By

- `gateway-reporting` (via keyword detection)
- Security researchers after weekly vulnerability presentations
- Content calendar workflows (104 posts/year pipeline)

### Requires (invoke before starting)

- **`persisting-agent-outputs`** (CORE) — Output directory management

### Calls (during execution)

- **WebSearch** — CVE cross-reference lookup during Phase 1
- **Task tool** — Parallel outline generation (one agent per finding)

### Pairs With (conditional)

- **`generate-blogpost`** (LIBRARY) — After outline approval, convert to full draft
- **`verifying-before-completion`** (CORE) — Before finalizing delivery

---

## Examples

**Example 1: Full pipeline from Gemini .docx transcript**

```
User: "Process the Feb 19 show and tell transcript" [provides .docx file]

Phase 0: Detect Gemini .docx format, extract text, identify 3 presenters
Phase 1: 3 findings scored: AI sandbox escape (8.7), email parser (8.5), code platform (7.4)
Phase 2: Anonymization maps created per finding. Finding 1 requires client approval.
Phase 3: 3 branded HTML outlines generated in parallel using Task agents
Phase 4: Writer Mode injected into all 3 files
Phase 5: Anonymization verified (0 client names), files opened in browser

Output: 3 HTML files + MANIFEST.yaml in .claude/.output/blog-posts/2026-02-24-vuln-show-tell-feb19/
```

**Example 2: Single finding from text transcript**

```
User: "Generate blog outline from this SSRF transcript" [provides .md file]

Phase 0: Already clean markdown, minimal normalization
Phase 1: 1 finding. Score 7.8/10. Found 2 related CVEs.
Phase 2: Client under NDA → full anonymization, legal_gate: REQUIRED
Phase 3: 1 branded HTML outline generated
Phase 4: Writer Mode injected
Phase 5: Verified, opened

Output: 1 HTML file + MANIFEST.yaml
```

---

## Anti-Patterns

**See:** [references/anti-patterns.md](references/anti-patterns.md) for detailed failure modes.

1. **Generating markdown instead of HTML** — Always use the branded HTML template
2. **Skipping blog potential scoring** — Score first, respect 7.0 threshold
3. **Ad-hoc anonymization** — Apply rubric systematically, verify with grep
4. **Using purple in the design** — Purple is NOT in the Praetorian Marketing Color Guide
5. **Missing engineer markers** — Insert for all incomplete information
6. **Forgetting Writer Mode** — Always inject the writer-mode-snippet.html
7. **No FAQ section** — Always generate 3-5 AEO Q&A pairs
8. **No social drafts** — Generate LinkedIn + Twitter alongside outline
9. **Not verifying anonymization** — Grep for every client/vendor name before delivery
10. **Sequential generation** — Use parallel Task agents for multiple findings

---

## Reference Files

- [references/blog-outline-template.html](references/blog-outline-template.html) — **Branded HTML template** with Praetorian Marketing Color Guide
- [references/writer-mode-snippet.html](references/writer-mode-snippet.html) — **Writer Mode injection** (interactive writing companion)
- [references/blog-potential-scoring.md](references/blog-potential-scoring.md) — Scoring rubric with criteria, weights, and formulas
- [references/anonymization-rubric.md](references/anonymization-rubric.md) — Complete decision rules and 20+ entity examples
- [references/engineer-markers.md](references/engineer-markers.md) — Pattern matching automation and marker placement
- [references/publishing-checklists.md](references/publishing-checklists.md) — Checklist templates and auto-population logic
- [references/voice-and-seo-standards.md](references/voice-and-seo-standards.md) — Voice profile, SEO/AEO practices, title formulas
- [references/anti-patterns.md](references/anti-patterns.md) — Failure modes and detection checklist

---

## Changelog

- **v3.0** (2026-02-24): HTML output with branded template, Writer Mode, Praetorian Marketing Color Guide, parallel generation, .docx support
- **v2.0** (2026-02-24): Added FAQ/AEO, code scaffolds, CVE cross-references, social drafts, publishing checklists
- **v1.0**: Initial skill with markdown output

See [.history/CHANGELOG](.history/CHANGELOG) for full version history.

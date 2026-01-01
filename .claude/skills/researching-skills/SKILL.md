---
name: researching-skills
description: Use when researching any topic - orchestrates 6 specialized research methods (Codebase, Context7, GitHub, arxiv, Perplexity, Web) with user-selected sources, smart recommendations, and persistent output to .claude/research/
allowed-tools: Read, Write, Bash, Glob, Grep, TodoWrite, AskUserQuestion
---

# Researching Skills

**Pure router for orchestrating research across 6 specialized methods with user control and persistent output.**

## When to Use

Use this skill when:

- Researching any topic that benefits from structured research
- Creating or updating skills (need patterns, docs, examples)
- Investigating libraries, frameworks, or technologies
- Finding academic papers or state-of-the-art techniques
- Discovering open-source implementations

**Key Principle:** User selects research sources. Router delegates to specialized skills. All findings synthesized and persisted.

## Quick Reference

| Source         | Skill Path (Library)                                                       | Recommend When                                    |
| -------------- | -------------------------------------------------------------------------- | ------------------------------------------------- |
| **Codebase**   | `.claude/skill-library/research/researching-codebase/SKILL.md`             | "pattern", "convention", "local", skill creation  |
| **Context7**   | `.claude/skill-library/research/researching-context7/SKILL.md`             | npm package mentioned (@tanstack, zustand, zod)   |
| **GitHub**     | `.claude/skill-library/research/researching-github/SKILL.md`               | "github", "open source", "repo", "implementation" |
| **arxiv**      | `.claude/skill-library/research/researching-arxiv/SKILL.md`                | "paper", "research", "academic", "ML/AI"          |
| **Perplexity** | `.claude/skill-library/research/researching-perplexity/SKILL.md`           | "AI search", "quick synthesis", "citations"       |
| **Web**        | `.claude/skill-library/research/researching-web/SKILL.md`                  | "tutorial", "blog", "how to", "Stack Overflow"    |

## Workflow Phases

**You MUST use TodoWrite to track all phases.**

| Phase | Purpose                                | Tools               |
| ----- | -------------------------------------- | ------------------- |
| 1     | Identify topic, derive semantic name   | -                   |
| 2     | Analyze context for recommendations    | -                   |
| 3     | Prompt user for source selection       | AskUserQuestion     |
| 4     | Execute selected research sequentially | Read (skill), tools |
| 5     | Synthesize findings across sources     | -                   |
| 6     | Save artifacts to .claude/research/    | Write, Bash         |

---

## Phase 1: Topic Identification

Extract research topic from user's request. Derive a semantic topic name:

- **Format**: kebab-case, 2-4 words
- **Examples**: `tanstack-query-patterns`, `rate-limiting-go`, `llm-security-attacks`

**Bad topic names** (too generic): `research`, `query`, `topic`, `stuff`

---

## Phase 2: Context Analysis for Recommendations

Scan user's request for keywords to determine recommendations:

| Keywords Detected                        | Recommend Source                       |
| ---------------------------------------- | -------------------------------------- |
| "pattern", "convention", "local", "code" | Codebase                               |
| npm package name, "@tanstack", "zustand" | Context7                               |
| "github", "repo", "open source", "impl"  | GitHub                                 |
| "paper", "research", "academic", "arxiv" | arxiv                                  |
| "AI", "synthesis", "summarize"           | Perplexity (if API key configured)     |
| "tutorial", "blog", "how to", "docs"     | Web OR Perplexity (if API key)         |
| skill creation task                      | Codebase + Context7 (if library skill) |

**Multiple matches**: Mark all matching sources as recommended.

**Perplexity smart default**: If Perplexity API key is configured (`.claude/tools/config/credentials.json` has valid `perplexity.apiKey`) AND web-research keywords detected ("tutorial", "blog", "how to", "docs", "AI", "synthesis"), recommend Perplexity over Web. Both can be recommended if thoroughness needed.

---

## Phase 3: User Source Selection

**BEFORE prompting**: Check if Perplexity API key is configured:

```bash
cat .claude/tools/config/credentials.json | grep -A 2 '"perplexity"'
```

**API key detection logic**:

- If `perplexity.apiKey` exists AND not placeholder `${PERPLEXITY_API_KEY}` → `perplexity_available = true`
- Otherwise → `perplexity_available = false`

Prompt user via AskUserQuestion with **TWO questions** (tool has maxItems: 4 per question):

```
AskUserQuestion:
  questions:
    - header: "Code Sources"
      question: "Which code & documentation sources? (I marked recommendations based on your request)"
      multiSelect: true
      options:
        - label: "Codebase (Recommended)" OR "Codebase"
          description: "Find local patterns, conventions, and code examples"
        - label: "Context7 (Recommended)" OR "Context7"
          description: "Fetch official npm/library documentation"
        - label: "GitHub (Recommended)" OR "GitHub"
          description: "Search open-source repos, code, issues, discussions"

    - header: "External Sources"
      question: "Which external research sources?"
      multiSelect: true
      options:
        - label: "Web (Recommended)" OR "Web"
          description: "Search blogs, tutorials, Stack Overflow, general docs"
        - label: "Perplexity (Recommended)" OR "Perplexity" OR "Perplexity (requires setup)"
          description: "AI-powered search with citations - faster synthesis" OR (if not available) "AI-powered search with citations. Requires API key - see .claude/tools/perplexity/README.md"
        - label: "arxiv (Recommended)" OR "arxiv"
          description: "Find academic papers and peer-reviewed research"
```

**Mark "(Recommended)"** only for sources identified in Phase 2.

**Perplexity label logic**:

- If `perplexity_available = true` → Use "Perplexity (Recommended)" or "Perplexity" based on Phase 2
- If `perplexity_available = false` → Use "Perplexity (requires setup)" and add setup note to description

---

## Phase 4: Sequential Research Execution

For each selected source, in order:

1. **Create todo**: `"Execute {source} research"`
2. **Read the specialized skill**:
   ```
   Read(".claude/skill-library/research/researching-{source}/SKILL.md")
   ```
3. **Follow that skill's workflow completely**
4. **Capture output** for synthesis (key findings, citations, patterns)
5. **Mark todo completed**

**Order**: Codebase → Context7 → GitHub → arxiv → Perplexity → Web (if multiple selected)

**Rationale**: Perplexity before Web because it's faster and provides AI synthesis; traditional Web can fill gaps and cross-validate.

---

## Phase 5: Synthesis

Combine findings from all sources into unified output.

**Use the synthesis template in** [references/synthesis-template.md](references/synthesis-template.md).

Key sections:

- Executive Summary (2-3 paragraphs)
- Findings by Source (summary from each)
- Cross-Source Patterns (themes across multiple sources)
- Conflicts & Discrepancies (disagreements with analysis)
- Recommendations (actionable next steps)
- Citations (all URLs, arxiv IDs, file paths)

---

## Phase 6: Persist Research Artifacts

### 6.1 Create Output Directory

```bash
TIMESTAMP=$(date +"%Y-%m-%d-%H%M%S")
TOPIC="{semantic-topic-name}"
mkdir -p .claude/research/${TIMESTAMP}-${TOPIC}
```

### 6.2 Write Files

| File            | Content                                  |
| --------------- | ---------------------------------------- |
| `SYNTHESIS.md`  | Combined findings (always created)       |
| `codebase.md`   | Codebase research output (if selected)   |
| `context7.md`   | Context7 research output (if selected)   |
| `github.md`     | GitHub research output (if selected)     |
| `arxiv.md`      | arxiv research output (if selected)      |
| `perplexity.md` | Perplexity research output (if selected) |
| `web.md`        | Web research output (if selected)        |

### 6.3 Report Location

Tell user: "Research saved to `.claude/research/{timestamp}-{topic}/`"

---

## Key Principles

1. **PURE ROUTER** - Never implement research logic inline. Always delegate to specialized skills.
2. **USER CONTROL** - Always prompt user for source selection. Never skip even if recommendations are strong.
3. **SMART RECOMMENDATIONS** - Analyze context clues before prompting to mark recommended sources.
4. **SEQUENTIAL EXECUTION** - Run each selected skill's full workflow before moving to next.
5. **SYNTHESIS REQUIRED** - Always create SYNTHESIS.md, even for single-source research.
6. **PERSISTENT OUTPUT** - Always save to `.claude/research/` with timestamped directory.
7. **TODOWRITE TRACKING** - Create todos for all phases; mark in_progress/completed in real-time.

---

## Anti-Patterns

| Anti-Pattern                              | Why It's Wrong                                    |
| ----------------------------------------- | ------------------------------------------------- |
| Implement WebSearch/Grep inline           | Violates pure router; use specialized skills      |
| Skip user prompt ("context clues enough") | User must decide; recommendations are suggestions |
| Skip synthesis for single source          | Synthesis adds structure and citations            |
| Use generic topic name ("research")       | Semantic names enable finding research later      |
| Forget to save output                     | Research without persistence is wasted work       |
| Run sources in parallel                   | Sequential ensures context builds properly        |

---

## Progress Tracking Template

Create these todos at workflow start:

```
1. "Identify research topic and derive semantic name" - Phase 1
2. "Analyze context for source recommendations" - Phase 2
3. "Prompt user for source selection" - Phase 3
4. "Execute {source} research" - One per selected source (Phase 4)
5. "Synthesize findings across sources" - Phase 5
6. "Save research artifacts to .claude/research/" - Phase 6
```

---

## Example Invocation

**User**: "Research TanStack Query best practices for our skill"

**Phase 1**: Topic = `tanstack-query-practices`

**Phase 2**: Detected "TanStack Query" (npm package) + "skill" (skill creation)

- Recommend: Context7, Codebase

**Phase 3**: Prompt with Context7 and Codebase marked as recommended

**Phase 4**: User selects Context7 + Codebase + Web

- Execute researching-context7 → capture findings
- Execute researching-codebase → capture findings
- Execute researching-web → capture findings

**Phase 5**: Synthesize all findings

**Phase 6**: Save to `.claude/research/2025-12-31-143052-tanstack-query-practices/`

---

## References

- [Synthesis Template](references/synthesis-template.md) - Full SYNTHESIS.md template
- [Recommendation Logic](references/recommendation-logic.md) - Keyword detection patterns
- [Output Structure](references/output-structure.md) - File organization details

## Related Skills

| Skill                      | Access Method                   | Purpose                                |
| -------------------------- | ------------------------------- | -------------------------------------- |
| **researching-codebase**   | Read (library skill path above) | Local pattern discovery                |
| **researching-context7**   | Read (library skill path above) | npm/library official docs              |
| **researching-github**     | Read (library skill path above) | Open-source repos, code, issues        |
| **researching-arxiv**      | Read (library skill path above) | Academic papers                        |
| **researching-perplexity** | Read (library skill path above) | AI-powered web research with citations |
| **researching-web**        | Read (library skill path above) | Blogs, tutorials, Stack Overflow       |
| **managing-skills**        | `skill: "managing-skills"`      | Skill lifecycle (create, update)       |
| **creating-skills**        | Read library skill              | Uses this skill in Phase 6             |

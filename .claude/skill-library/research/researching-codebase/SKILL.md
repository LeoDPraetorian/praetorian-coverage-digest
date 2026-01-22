---
name: researching-codebase
description: Use when creating/updating skills and need to discover patterns, conventions, and implementations in ANY codebase - use when you need code examples, when looking for existing patterns, when researching a codebase before writing documentation, or when populating skill content with real examples - provides systematic 6-phase workflow with technology detection, targeted searches, convention analysis, and durable code references (function signatures not line numbers)
allowed-tools: Bash, Grep, Glob, Read, Write, TodoWrite, AskUserQuestion
---

# Researching Codebases for Skill Creation

**Systematic workflow for discovering patterns, conventions, and implementations in any codebase to inform skill content.**

## When to Use

Use this skill when:

- **Creating a new skill** - Need to find existing patterns to model after
- **Updating a skill** - Need to verify current codebase conventions
- **Populating skill content** - Need accurate code examples from any codebase
- **Discovering patterns** - Need to find hooks, utilities, or patterns that skills should reference
- **Validating alignment** - Need to ensure proposed skill patterns match codebase reality
- **Researching before writing docs** - Need to understand codebase structure before documenting

**DO NOT use when:**

- Analyzing for **implementation** (use native `Explore` agent via Task tool)
- Performing **security/threat modeling** (use `codebase-mapper` agent)
- Looking for **library documentation** (use `researching-context7` skill)

---

## When NOT to Skip This Skill

**You MUST use this skill even when:**

- ❌ "I can just grep for examples quickly"
  - ✅ Quick grep misses: technology detection, convention patterns, anti-patterns, naming standards
- ❌ "I already know the codebase"
  - ✅ Memory is unreliable. Codebases evolve. This skill ensures current, accurate patterns.
- ❌ "I only need 1-2 examples"
  - ✅ Without systematic research, you'll pick the first examples you find, not the BEST examples
- ❌ "Time pressure - meeting/deadline/production urgent"
  - ✅ Bad examples deployed fast create MORE work than good examples deployed methodically
- ❌ "Already spent X hours, need to finish"
  - ✅ Sunk cost is not a reason to skip rigor. 15-20 minutes of research prevents hours of corrections.

**If you're tempted to skip systematic research:** That's exactly when you need it most.

## Quick Reference

| Phase                | Purpose                                          | Tools                    | Time    |
| -------------------- | ------------------------------------------------ | ------------------------ | ------- |
| 1. Scope Definition  | Get target path, identify research goals         | AskUserQuestion          | 2 min   |
| 2. Tech Detection    | Detect languages, frameworks, monorepo structure | Bash (find, ls)          | 2 min   |
| 3. Pattern Discovery | Execute targeted searches based on stack         | Grep, Bash (find)        | 5-10min |
| 4. Convention        | Identify naming conventions, directory structure | Grep, Read               | 5 min   |
| 5. Example Extract   | Read files, capture snippets with paths          | Read                     | 5 min   |
| 6. Synthesis         | Summarize findings for skill content             | Write (output artifacts) | 3 min   |

**For detailed workflows, templates, and anti-patterns, see [references/](references/).**

---

## Critical: Target Path Input

**All commands use `{TARGET_PATH}` placeholder. User MUST specify the codebase path at start.**

**Phase 1 MUST ask via AskUserQuestion if not provided:**

```
Question: What is the path to the codebase you want to research?

Examples:
- ./modules/chariot
- /path/to/project
- . (current directory)
```

**All subsequent grep/find commands substitute `{TARGET_PATH}` with the user's answer.**

---

## Phase 1: Scope Definition

### 1.1 Get Target Codebase Path (REQUIRED)

Use `AskUserQuestion` to collect:

1. **Target path** - Where is the codebase? (e.g., `./modules/chariot`, `/path/to/project`, `.`)
2. **Research goal** - What are you trying to learn? (e.g., "Go handler patterns", "React component structure", "Test organization")
3. **Specific patterns** - Any specific names/terms to search for? (e.g., "Repository interface", "useQuery hook", "pytest fixtures")

**Record these answers** - they guide all subsequent phases.

### 1.2 Create TodoWrite Tracking

**YOU MUST use TodoWrite** to track research phases:

```
todos: [
  { content: "Define scope and get target path", status: "completed" },
  { content: "Detect technology stack", status: "in_progress" },
  { content: "Discover patterns with targeted searches", status: "pending" },
  { content: "Analyze conventions (naming, structure)", status: "pending" },
  { content: "Extract code examples with paths", status: "pending" },
  { content: "Synthesize findings into skill content recommendations", status: "pending" }
]
```

---

## Phase 2: Technology Detection

**Before pattern searching, detect the stack to use appropriate search patterns.**

### 2.1 Detect Languages Present

```bash
find {TARGET_PATH} -type f \( -name '*.go' -o -name '*.ts' -o -name '*.tsx' -o -name '*.py' -o -name '*.rs' -o -name '*.java' \) | sed 's/.*\.//' | sort | uniq -c | sort -rn | head -5
```

**Output:** Language counts (e.g., `1523 go`, `842 ts`, `156 tsx`)

### 2.2 Detect Frameworks

```bash
ls {TARGET_PATH}/package.json {TARGET_PATH}/go.mod {TARGET_PATH}/requirements.txt {TARGET_PATH}/Cargo.toml 2>/dev/null
```

**Output:** Which manifest files exist

### 2.3 Check for Monorepo

```bash
ls {TARGET_PATH}/pnpm-workspace.yaml {TARGET_PATH}/go.work {TARGET_PATH}/lerna.json 2>/dev/null
```

**Output:** Monorepo indicators

**Record detected stack** - this determines which search templates to use in Phase 3.

**For complete technology detection examples, see [references/technology-detection.md](references/technology-detection.md).**

---

## Phase 3: Pattern Discovery

**Execute targeted searches based on detected stack from Phase 2.**

### Generic Pattern Search

```bash
# Replace {pattern} with actual search term
grep -rn '{pattern}' {TARGET_PATH} --include='*.go' --include='*.ts' --include='*.py' -l | head -20
```

### Type/Interface Definitions

```bash
grep -rn 'type.*{Name}\|interface.*{Name}\|class.*{Name}' {TARGET_PATH} -l
```

### Function Patterns

```bash
grep -rn 'func.*{name}\|function.*{name}\|def.*{name}' {TARGET_PATH} -l
```

### Test Files

```bash
find {TARGET_PATH} -name '*_test.go' -o -name '*.test.ts' -o -name 'test_*.py' | head -20
```

**For stack-specific search templates (Go, TypeScript/React, Python, Rust), see [references/search-templates.md](references/search-templates.md).**

---

## Phase 4: Convention Analysis

### 4.1 Naming Conventions

Analyze discovered files for patterns:

- **Files** - kebab-case? snake_case? PascalCase?
- **Functions** - camelCase? snake_case? Prefixes?
- **Types** - PascalCase? Interface prefix? Suffix conventions?

### 4.2 Directory Structure

Document the organization:

```
{TARGET_PATH}/
├── pkg/          # Shared packages
├── internal/     # Internal implementations
├── cmd/          # Entry points
└── tests/        # Test files
```

### 4.3 Import Patterns

Note how code is organized and imported:

- Relative imports vs absolute?
- Barrel exports?
- Circular dependency avoidance patterns?

### 4.4 Error Handling Conventions

- Sentinel errors vs wrapped errors?
- Custom error types?
- Error handling middleware?

**For complete convention analysis examples, see [references/convention-analysis.md](references/convention-analysis.md).**

---

## Phase 5: Example Extraction

### 5.1 Read Representative Files

From pattern discovery results, read 3-5 files that best demonstrate patterns:

```
Read({TARGET_PATH}/path/to/representative-file.go)
```

### 5.2 Extract Code Snippets

Capture relevant examples with:

- **File path** (relative to `{TARGET_PATH}`)
- **Function/type signature** - NOT line numbers (see Code Reference Pattern below)
- **Usage context** - How is this pattern used?

### 5.3 Note Anti-Patterns

Identify things to **avoid** in skill content:

- Deprecated patterns still in codebase
- Known technical debt
- Patterns being migrated away from

**For extraction best practices and examples, see [references/example-extraction.md](references/example-extraction.md).**

---

## Phase 6: Synthesis

### 6.1 Summarize Findings

Create a structured output document with:

1. **Target details** - Path, detected stack, structure type
2. **Scope** - What was researched and why
3. **Discovered patterns** - Each pattern with location, convention, example
4. **Naming conventions** - Files, functions, types
5. **Directory structure** - Relevant organization
6. **Code examples table** - Pattern, file, signature, usage
7. **Anti-patterns** - What to avoid and why
8. **Recommendations** - How to use findings in skill content

**For complete output format template, see [references/output-format.md](references/output-format.md).**

### 6.2 Write Output Artifact

Save the synthesis document:

```
Write({skill-path}/references/codebase-research-{topic}.md, synthesized-content)
```

This document becomes reference material for the skill being created/updated.

---

## Code Reference Pattern (MANDATORY)

**When capturing code examples for skill content:**

❌ **NEVER use static line numbers** - they become outdated with every code change:

```markdown
❌ BAD: `file.go:123-127`
❌ BAD: See line 154 in nuclei.go
```

✅ **USE durable patterns** - stable across refactors:

```markdown
✅ GOOD: `file.go` - `func (t *Type) MethodName(...)`
✅ GOOD: `file.go (between Match() and Invoke() methods)`
✅ GOOD: `file.go` (for general file reference)
```

**Why this matters:**

- Line numbers drift with every insert/deletion/refactor
- Function signatures are stable and grep-friendly: `rg "func.*MethodName"`
- Audit Phase 21 will flag line number references as compliance failures

**For complete code reference patterns, see:**

- [Code Reference Patterns](../../../../skills/managing-skills/references/patterns/code-reference-patterns.md)

---

## Difference from Related Tools

| This Skill                | Explore Agent (native)          | codebase-mapper                |
| ------------------------- | ------------------------------- | ------------------------------ |
| Research for **SKILLS**   | Research for **IMPLEMENTATION** | Research for **SECURITY**      |
| Find patterns to document | Find code to reuse              | Find attack surface            |
| Works on ANY codebase     | Works on ANY codebase           | Any codebase                   |
| Output: skill content     | Output: reuse report            | Output: threat model artifacts |

**When to use each:**

- **researching-codebase** - Creating/updating skill documentation
- **Explore agent** - Implementing features (find reusable code) - use via Task tool with "very thorough" mode
- **codebase-mapper** - Threat modeling and security analysis

---

## Key Principles

1. **Path-agnostic** - Never hardcode paths. Always use `{TARGET_PATH}` from user input.
2. **Stack-agnostic** - Detect technology first, then use appropriate search patterns.
3. **Evidence-based** - All findings must cite specific file paths and function signatures.
4. **Skill-focused** - Output is for creating/updating skills, not implementation.
5. **Durable references** - Use function signatures, not line numbers.
6. **TodoWrite tracking** - Track all six phases for visibility.

---

## Related Skills

| Skill                              | Access Method                                                                              | Purpose                                   |
| ---------------------------------- | ------------------------------------------------------------------------------------------ | ----------------------------------------- |
| `orchestrating-research` (LIBRARY) | `Read(".claude/skill-library/research/orchestrating-research/SKILL.md")`                   | Orchestrator for all research types       |
| **researching-context7**           | `Read(".claude/skill-library/research/researching-context7/SKILL.md")` (LIBRARY)           | Library/framework documentation           |
| **researching-arxiv**              | `Read(".claude/skill-library/research/researching-arxiv/SKILL.md")` (LIBRARY)              | Academic papers and research              |
| **creating-skills**                | `Read(".claude/skill-library/claude/skill-management/creating-skills/SKILL.md")` (LIBRARY) | Skill creation workflow (invokes this)    |
| **updating-skills**                | `Read(".claude/skill-library/claude/skill-management/updating-skills/SKILL.md")` (LIBRARY) | Skill update workflow (may invoke this)   |
| **Explore agent**                  | `Task(subagent_type="Explore")` (NATIVE AGENT)                                             | Implementation-focused pattern discovery  |
| **codebase-mapper**                | `Task(subagent_type="codebase-mapper")` (AGENT)                                            | Security-focused codebase mapping         |
| **debugging-systematically**       | `skill: "debugging-systematically"` (CORE)                                                 | When research results don't match reality |

---

## Changelog

See `.history/CHANGELOG` for historical changes.

Initial creation: 2025-12-30

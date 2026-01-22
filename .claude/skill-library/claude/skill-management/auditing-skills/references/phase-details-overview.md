# Phase Details Overview

This document provides the foundational architecture and detection principles for skill auditing. Load this first before consulting specific phase categories.

## Architecture Note

Phases are numbered sequentially and described across multiple files. Phase validation is performed instruction-based by Claude reading these files and applying the documented rules.

## General Detection Principles

These principles apply across all phases when auditing skills:

### 1. Skip Teaching Content (WRONG/❌ Examples)

When checking code patterns, commands, or references, SKIP content that is deliberately showing BAD PRACTICE examples for teaching purposes.

**Markers indicating teaching content:**

- Preceded by "WRONG:", "❌", "Bad:", "Anti-pattern:", "Problem:" (within 5 lines)
- In a before/after comparison showing the fix
- Explicitly labeled as "do NOT do this"
- Part of documentation explaining why something is problematic

**Example:**

```markdown
# ❌ WRONG: Creates nested directories

mkdir -p .claude/.output/research/output

# ✅ CORRECT: Use ROOT

ROOT="$(git rev-parse ...)"
mkdir -p "$ROOT/.claude/.output/research/output"
```

→ Do NOT flag the first command - it's teaching content, not a real violation.

### 2. Only Audit Code Blocks (For Command Patterns)

When checking for bash command patterns (Phase 11), only examine content inside fenced code blocks with `bash or `sh language tags.

**Rationale:** Prose text discussing commands ("use mkdir to create directories") should not be flagged. Only actual executable command examples matter.

**How to detect code blocks:**

- Track ``` opening/closing markers
- Check language tag (bash, sh, shell)
- Examine only content between the markers

### 3. Check Context for ROOT Calculation

When flagging commands with .claude/ paths (Phase 11), check if ROOT was calculated first.

**Acceptable patterns:**

```bash
ROOT="$(git rev-parse --show-superproject-working-tree --show-toplevel | head -1)"
mkdir -p "$ROOT/.claude/.output/research/output"
```

```bash
ROOT="$(git rev-parse ...)"
cd "$ROOT"
mkdir -p .claude/.output/research/output  # OK - already in repo root
```

**How to check:**

- Look at current line for ROOT= or $ROOT
- Look at preceding line for ROOT calculation
- If found, do NOT flag the .claude/ path

### 4. Severity Context Matters

Some issues are context-dependent:

- Missing language tag on code block showing OUTPUT → INFO (not code, just results)
- Missing language tag on actual code example → WARNING (needs syntax highlighting)
- Line number reference in teaching content → INFO (teaching about the anti-pattern)
- Line number reference in actual navigation → WARNING (will become stale)

### 5. Template vs Real Content

Some files are templates or examples that intentionally have placeholders:

- File named _-template.md or _-example.md
- Content with {placeholder} syntax
- TODO comments indicating "fill this in"

These should be treated differently than production skills.

---

## Navigation

**Phase categories** (read specific categories as needed):

- [Deterministic Phases (1-9)](phase-details-deterministic.md) - Name, tools, line count, links, organization
- [Hybrid Phases (10-14)](phase-details-hybrid.md) - References, commands, state, tables
- [Claude-Automated Phases (15-25)](phase-details-automated.md) - Content quality, structure, staleness
- [Human-Required & Gateway Phases (26-30)](phase-details-human-gateway.md) - Reference content, gateway validation, skill references

**Quick lookup**: See [phase-quick-reference.md](phase-quick-reference.md) for phase number → category mapping.

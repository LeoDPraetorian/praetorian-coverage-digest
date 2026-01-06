---
name: semantic-code-operations
description: Use when ANY code task (reading, analyzing, reviewing, debugging, editing, explaining) - routes to Serena MCP for semantic search, symbol editing, project memory (core code tool)
allowed-tools: Read, Bash
---

# Semantic Code Operations

**🚨 CRITICAL: This is a CORE CODE TOOL used constantly by developers, NOT an occasional external API.**

## Immediate Action Required

**🚨 YOU MUST use TodoWrite before starting to track all steps when using Serena operations.**

**You MUST immediately route to the library skill:**

```javascript
Read(".claude/skill-library/claude/mcp-tools/mcp-tools-serena/SKILL.md");
```

**Do not proceed without loading the full Serena wrapper catalog.**

## Why This Skill Exists

Traditional text-based tools have fundamental limitations for code operations:

| Traditional Tool | Limitation                              | Serena Advantage                                    |
| ---------------- | --------------------------------------- | --------------------------------------------------- |
| **grep/Grep**    | Text search (no semantic understanding) | `find_symbol` uses LSP for type/scope/relationship  |
| **Edit**         | Line-based editing (fragile)            | `replace_symbol_body` edits complete definitions    |
| **Read**         | Full-file loading (token-heavy)         | `get_symbols_overview` shows only top-level symbols |
| **Manual notes** | No cross-session memory                 | `write_memory`/`read_memory` persist project state  |

**Token efficiency:** Serena saves ~70% tokens vs full-file reading (validated by arxiv MarsCode Agent paper on LSP-based semantic operations).

## Serena Modes

Serena provides 4 operational modes:

| Mode            | Purpose                                       | When to Use                    |
| --------------- | --------------------------------------------- | ------------------------------ |
| **Planning**    | High-level architecture, symbol discovery     | Initial exploration, design    |
| **Editing**     | Targeted symbol modifications                 | Implementing specific changes  |
| **One-shot**    | Single operation without mode switching       | Quick queries, ad-hoc searches |
| **Interactive** | Multi-turn conversation with context retained | Complex refactoring, debugging |

## Quick Usage Examples

### Example 1: Find a Function Semantically

```javascript
// ❌ Text-based (grep): Finds all text matches, no type awareness
// grep -r "processPayment" src/

// ✅ Semantic (Serena): Finds function definition by signature
find_symbol("processPayment", { type: "function" });
```

### Example 2: Edit Symbol Definitions

```javascript
// ❌ Line-based (Edit): Requires exact line numbers, breaks on refactors
Edit(file_path, old_string, new_string);

// ✅ Semantic (Serena): Edits complete symbol body by name
replace_symbol_body("MyClass.myMethod", "new implementation");
```

### Example 3: Token-Efficient Symbol Overview

```javascript
// ❌ Full-file (Read): Loads entire file (1000+ lines = 2000+ tokens)
Read("/path/to/large-file.ts");

// ✅ Symbol overview (Serena): Shows only top-level symbols (100 tokens)
get_symbols_overview("/path/to/large-file.ts");
```

### Example 4: Cross-Session Project Memory

```typescript
// Store project context (survives session restarts)
write_memory("auth-architecture", {
  pattern: "JWT tokens",
  middleware: "src/middleware/auth.ts",
  notes: "Uses RS256 signing",
});

// Retrieve in next session
read_memory("auth-architecture");
```

## When to Use This Skill

**Use Serena for ALL code operations:**

- Finding functions, classes, interfaces by semantic meaning
- Editing method bodies, class definitions without line numbers
- Understanding file structure without reading entire files
- Persisting project knowledge across sessions
- Navigating codebases with LSP intelligence

### Explicit Triggers - You MUST Use This Skill When:

**✅ User provides a file path with code extension:**

- `.ts`, `.tsx`, `.js`, `.jsx`, `.go`, `.py`, `.rs`, `.java`, `.c`, `.cpp`, etc.
- Example: "analyze `.claude/tools/config/lib/serena-pool.ts`" → **USE THIS SKILL**

**✅ User asks you to analyze code:**

- "Analyze this implementation"
- "Review this code"
- "What does this code do?"
- "Explain this architecture"
- "Find issues in this code"
  → **ALL of these require this skill**

**✅ User asks about code structure:**

- "How is this organized?"
- "Where is X defined?"
- "What functions are in this file?"
- "Show me the class structure"
  → **Use `get_symbols_overview` instead of Read**

**✅ User asks you to understand code:**

- "Read this file and tell me..."
- "Look at this implementation..."
- "Check if this code..."
  → **Use semantic tools, not just Read**

### ⚠️ ANTI-PATTERN: Common Rationalizations

**❌ "I'm just analyzing, not editing"**

- **WRONG**: Analysis IS working with code. Use this skill.
- **Reality**: `get_symbols_overview`, `find_symbol` are analysis tools.

**❌ "It's just one file, Read is simpler"**

- **WRONG**: Even single files benefit from semantic operations.
- **Reality**: `get_symbols_overview` shows structure without loading full file.

**❌ "The user didn't explicitly say 'use Serena'"**

- **WRONG**: If ANY code file is mentioned, this skill applies.
- **Reality**: The mention of a `.ts`/`.go`/`.py` file IS the trigger.

**❌ "I'll just quickly read it first"**

- **WRONG**: This violates the "skill before action" rule.
- **Reality**: Load this skill FIRST, then decide which Serena tools to use.

**Target agents** (should load in "first actions" protocol):

- `frontend-developer`
- `backend-developer`
- `capability-developer`
- `python-developer`

**Note:** The native `Explore` agent handles discovery tasks and manages its own tooling.

## Red Flags - STOP and Use Serena

**If you catch yourself thinking ANY of these, STOP and load the Serena skill:**

| Rationalization                              | Reality                                                           | Use Serena Instead                                      |
| -------------------------------------------- | ----------------------------------------------------------------- | ------------------------------------------------------- |
| "Grep is faster for finding functions"       | Text search misses semantic context, requires multiple iterations | `find_symbol` with type/scope filters                   |
| "I already have line numbers, just use Edit" | Line numbers drift with every change, sunk cost fallacy           | `replace_symbol_body` by symbol name                    |
| "Read is most direct for listing functions"  | Loads entire file (1000s of tokens wasted)                        | `get_symbols_overview` (10x fewer tokens)               |
| "No time to learn new tool"                  | Serena saves time on 2nd+ usage, investment pays off immediately  | Load library skill (2 min) vs repeated grep/read cycles |
| "This is a one-off task"                     | Code operations are NEVER one-off, you'll repeat this pattern     | Build Serena habit now, save hours later                |

**NOT EVEN WHEN:**

- Production is down (semantic search is faster than text search)
- Deadline in 15 minutes (Serena prevents wasted grep iterations)
- You're tired (Serena does the thinking for you)
- You've used Grep successfully before (semantic > text always)

## Serena vs External APIs

**Serena is NOT like Linear, Context7, or Perplexity (occasional external APIs).**

| Aspect         | External APIs (Linear, Context7) | Serena (Code Tool)             |
| -------------- | -------------------------------- | ------------------------------ |
| **Frequency**  | Occasional (create issue)        | Constant (every code edit)     |
| **Purpose**    | External service integration     | Core development operations    |
| **Visibility** | Gateway routing                  | Core skill (immediate access)  |
| **Startup**    | 0 tokens (spawned on-demand)     | ~50-100 tokens (when called)   |
| **Examples**   | Create Linear ticket             | Find function, edit class body |

## Semantic Routing (Super-Repo Optimization)

**🚨 CRITICAL: Always provide `semanticContext` to avoid 60s+ timeouts in super-repos.**

All Serena wrappers support `semanticContext` for intelligent module routing:

```typescript
// ✅ CORRECT: With semanticContext (~5-10s cold start)
find_symbol({
  name_path_pattern: "Asset",
  semanticContext: "Find Asset class in React frontend", // Routes to chariot module
});

// ❌ WRONG: Without semanticContext (60s+ timeout on super-repo)
find_symbol({ name_path_pattern: "Asset" }); // Scans entire super-repo
```

### Verifying Routing Worked

When a Serena call executes, you will see `[Serena]` log messages:

```
[Serena] ✓ Routed: chariot (matched: react, frontend, asset)
[Serena] ✓ find_symbol completed in 6234ms (routed to chariot)
```

**What to look for:**

1. `✓ Routed: <module>` - confirms routing happened
2. `completed in Xms` - timing for the call
3. `(routed to <module>)` - which module was targeted

**Warning signs:**

- `⚠️ No semanticContext` - missing context, will be slow
- `⚠️ Routing failed` - fallback to full super-repo
- `>30000ms` - indicates full super-repo scan happened

### Expected Performance

| Scenario            | Time         | Cause                            |
| ------------------- | ------------ | -------------------------------- |
| With routing (cold) | 5-15s        | Module-scoped LSP initialization |
| With routing (warm) | 1-3s         | Cached connection                |
| Without routing     | 60s+ TIMEOUT | Full super-repo scan             |

## Architecture Notes

- **23 TypeScript wrappers** in `.claude/tools/serena/` with 119 tests passing
- **Semantic routing** via keyword matching to 21+ modules in super-repo
- **On-demand MCP spawn**: 0 tokens at startup, ~50-100 when first called
- **Official integration**: Uses custom adapter pattern (validated by Serena maintainers)
- **Progressive loading**: Gateways for other MCPs, core skill for Serena

## Related Skills and Tools

| Resource                       | Access Method                                                              | Purpose                                |
| ------------------------------ | -------------------------------------------------------------------------- | -------------------------------------- |
| **mcp-tools-serena** (LIBRARY) | `Read('.claude/skill-library/claude/mcp-tools/mcp-tools-serena/SKILL.md')` | Complete wrapper catalog (23 tools)    |
| **gateway-mcp-tools** (CORE)   | `skill: "gateway-mcp-tools"`                                               | Other external APIs (Linear, Context7) |
| **MCP Architecture**           | Read `docs/mcps/MCP-TOOLS-ARCHITECTURE.md`                                 | System design and patterns             |

## Summary

1. **Load library skill immediately**: `Read('.claude/skill-library/claude/mcp-tools/mcp-tools-serena/SKILL.md')`
2. **Use for all code operations**: Semantic search, symbol editing, project memory
3. **Understand modes**: Planning, Editing, One-shot, Interactive
4. **Token efficiency**: 70% savings vs full-file reading
5. **Core tool status**: Fundamental to development, not an occasional API

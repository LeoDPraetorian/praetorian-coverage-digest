---
description: Use when researching topics, searching the web, or needing AI reasoning - just describe what you want
argument-hint: <describe your query naturally>
allowed-tools: Bash, Read
---

# Perplexity AI Search & Research

**Speak naturally!** Just describe what you want after `/perplexity` - I'll figure it out.

## What You Can Do

- **Web search** - Search the web for current information
- **Ask questions** - Conversational AI responses
- **Deep research** - Comprehensive research with citations
- **Reasoning** - Advanced logical analysis and problem-solving

---

## Natural Language Examples

```bash
/perplexity search for TypeScript best practices 2025
/perplexity what is Model Context Protocol?
/perplexity research large language model developments
/perplexity analyze the tradeoffs between REST and GraphQL
```

---

## How It Works

1. **You describe** your query naturally
2. **I detect** the operation type (search, ask, research, reason)
3. **I execute** the CLI with your query
4. **I display** clean results

---

## Implementation

When you invoke this command, I will:

### Step 1: Detect Operation Type

Analyze your input for keywords:
- Contains "search", "find", "look up", "latest" → **search**
- Contains "research", "comprehensive", "deep dive" → **research**
- Contains "reason", "analyze", "think through", "logic" → **reason**
- Default (questions, explanations) → **ask**

### Step 2: Execute CLI

**Use standard Git path resolution** - works from super-repo and submodules.

Execute commands using the industry-standard pattern:

**search** - Web search for current information
```bash
ROOT="$(git rev-parse --show-superproject-working-tree --show-toplevel | head -1)" && $ROOT/.claude/bin/perplexity.ts search "your query here"
```

**ask** - Conversational AI response
```bash
ROOT="$(git rev-parse --show-superproject-working-tree --show-toplevel | head -1)" && $ROOT/.claude/bin/perplexity.ts ask "your question here"
```

**research** - Deep research with citations
```bash
ROOT="$(git rev-parse --show-superproject-working-tree --show-toplevel | head -1)" && $ROOT/.claude/bin/perplexity.ts research "your topic here"
```

**reason** - Advanced reasoning
```bash
ROOT="$(git rev-parse --show-superproject-working-tree --show-toplevel | head -1)" && $ROOT/.claude/bin/perplexity.ts reason "your problem here"
```

### Step 3: Display Results

Format and display the response cleanly.

---

## Tool Selection Guide

| If your query mentions... | Command | Best For |
|---------------------------|---------|----------|
| search, find, look up, latest | `search` | Current events, documentation |
| research, comprehensive, deep | `research` | Academic topics, thorough analysis |
| reason, analyze, logic, think | `reason` | Problem-solving, decisions |
| (default) questions | `ask` | Quick answers, explanations |

---

## CLI Reference

```bash
# Show help
ROOT="$(git rev-parse --show-superproject-working-tree --show-toplevel | head -1)" && $ROOT/.claude/bin/perplexity.ts --help

# Search with options
ROOT="$(git rev-parse --show-superproject-working-tree --show-toplevel | head -1)" && $ROOT/.claude/bin/perplexity.ts search "query" --max-results 5

# Output raw JSON
ROOT="$(git rev-parse --show-superproject-working-tree --show-toplevel | head -1)" && $ROOT/.claude/bin/perplexity.ts ask "question" --json
```

## Authentication

Perplexity API key is stored in 1Password:

- **Vault:** "Claude Code Tools"
- **Item:** "Perplexity API Key"
- **Field:** password

The first API call will prompt for biometric authentication. Credentials are cached for 15 minutes.

**Legacy (deprecated):** credentials.json is no longer supported. Migrate to 1Password.

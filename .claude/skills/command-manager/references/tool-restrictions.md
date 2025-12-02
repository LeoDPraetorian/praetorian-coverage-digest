# Tool Restrictions Guide

## Decision Tree

```
Does command delegate to a skill?
│
├─ YES → Use ONLY Skill, AskUserQuestion
│        (skill has all tools it needs)
│
└─ NO → What type of operation?
         │
         ├─ Git commands → Bash(git:*)
         ├─ File listing → Glob, Bash(ls:*)
         ├─ HTTP requests → WebFetch
         ├─ Complex logic → CREATE A SKILL FIRST
         └─ System info → Bash(specific:*)
```

## Tool Categories

### Always Allowed (Router Pattern)

| Tool | When to Use |
|------|-------------|
| `Skill` | Delegating to any skill |
| `AskUserQuestion` | Gathering user input |

These are the ONLY tools needed when following Router Pattern.

### Conditional (Direct Commands)

| Tool | When Allowed | Example |
|------|--------------|---------|
| `Bash(git:*)` | Git operations without skill | Show status |
| `Bash(npm:*)` | NPM operations | Run tests |
| `Glob` | File discovery | Find patterns |
| `Read` | File reading | View config |
| `WebFetch` | HTTP requests | API calls |

**Rule:** Only use these when NO skill exists for the operation.

### Never with Skills

| Tool | Problem |
|------|---------|
| `Bash` (broad) | Enables hallucination |
| `Write` | Command shouldn't write |
| `Edit` | Command shouldn't edit |
| `Task` | Command shouldn't spawn agents |

**Rule:** If command has `skills:` frontmatter, these tools are Tool Leakage.

## Examples by Use Case

### Command Delegating to Skill

```yaml
# CORRECT
---
allowed-tools: Skill, AskUserQuestion
skills: my-skill
---

# WRONG (Tool Leakage)
---
allowed-tools: Skill, Bash, Read, AskUserQuestion
skills: my-skill
---
```

### Git Status Command (No Skill)

```yaml
# CORRECT
---
description: Show git status
allowed-tools: Bash(git status:*)
---

# WRONG (Too broad)
---
allowed-tools: Bash(*)
---
```

### File Search Command

```yaml
# CORRECT
---
description: Find files by pattern
allowed-tools: Glob
---

# ALTERNATIVE
---
allowed-tools: Bash(find:*)
---
```

### Command Needing User Input

```yaml
# CORRECT
---
allowed-tools: Skill, AskUserQuestion
skills: interactive-skill
---
```

## Security Implications

### Broad Bash Access

```yaml
# DANGEROUS
allowed-tools: Bash(*)
```

**Risks:**
- Command injection
- Unintended file operations
- System modifications
- Data exfiltration

**Fix:** Use specific patterns:
```yaml
allowed-tools: Bash(git status:*), Bash(npm test:*)
```

### Tool Leakage with Skills

```yaml
# DANGEROUS
allowed-tools: Skill, Bash, Read, AskUserQuestion
skills: my-skill
```

**Risks:**
- LLM works around skill failures
- Hallucinated fixes
- Unpredictable behavior
- Security bypass

**Fix:** Remove extra tools:
```yaml
allowed-tools: Skill, AskUserQuestion
skills: my-skill
```

## Audit Detection

The `command-manager audit` Check 8 detects:

| Violation | Severity | Auto-Fix |
|-----------|----------|----------|
| `skills:` + extra tools | CRITICAL | Yes |
| `Bash(*)` broad access | WARNING | No |
| `Write` in command | WARNING | No |

## Common Questions

### Q: My skill needs Bash, so my command needs it too?

**A:** No. Skills have their own `allowed-tools`. The command doesn't inherit or pass through tools. Just use `Skill` in the command.

### Q: What if the skill fails?

**A:** The command should report the failure, not try to fix it. That's the point of Router Pattern - deterministic behavior over hallucinated workarounds.

### Q: Can I use Task in a command?

**A:** Generally no. Commands shouldn't spawn agents. If you need agent orchestration, create a skill that does it.

### Q: What about MCP tools?

**A:** MCP tools follow the same rules. If delegating to a skill, don't include MCP tools in the command. The skill will have access to what it needs.

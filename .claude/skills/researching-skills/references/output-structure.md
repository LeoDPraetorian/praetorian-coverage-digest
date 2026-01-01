# Output Structure

File organization for research artifacts in `.claude/research/`.

## Directory Naming

```
.claude/research/{YYYY-MM-DD}-{HHMMSS}-{topic}/
```

**Components:**
- `YYYY-MM-DD` - Date (e.g., 2025-12-31)
- `HHMMSS` - Time in 24h format (e.g., 143052)
- `topic` - Semantic topic name in kebab-case (e.g., tanstack-query-patterns)

**Examples:**
```
.claude/research/2025-12-31-143052-tanstack-query-patterns/
.claude/research/2025-12-31-150000-rate-limiting-go/
.claude/research/2025-12-31-160000-llm-security-attacks/
```

## File Structure

```
.claude/research/{timestamp}-{topic}/
├── SYNTHESIS.md         # Combined findings (ALWAYS created)
├── codebase.md          # Codebase research output
├── context7.md          # Context7 research output
├── github.md            # GitHub research output
├── arxiv.md             # arxiv research output
└── web.md               # Web research output
```

**Rules:**
- `SYNTHESIS.md` is always created, even for single-source research
- Individual source files are only created if that source was selected
- No other files should be added to this directory

## File Contents

### SYNTHESIS.md
See [synthesis-template.md](synthesis-template.md) for full template.

### Individual Source Files (codebase.md, context7.md, etc.)

Each source file should contain:

```markdown
# {Source} Research: {Topic}

**Date:** {YYYY-MM-DD}
**Skill Used:** researching-{source}

## Search Queries / Methods Used
{What was searched for}

## Raw Findings
{Detailed output from the specialized skill}

## Key Takeaways
{Bullet points of most important findings}

## Citations
{All references with URLs/paths}
```

## Timestamp Generation

Use this bash command to generate the timestamp:

```bash
TIMESTAMP=$(date +"%Y-%m-%d-%H%M%S")
```

**Output format:** `2025-12-31-143052`

## Topic Name Guidelines

| Good Topic Names | Bad Topic Names |
| ---------------- | --------------- |
| `tanstack-query-caching` | `research` |
| `go-rate-limiting` | `query` |
| `react-hook-form-validation` | `stuff` |
| `llm-prompt-injection` | `topic` |
| `playwright-e2e-patterns` | `data` |

**Rules:**
- 2-4 words in kebab-case
- Descriptive of the research subject
- Specific enough to identify later
- No generic words alone

## Finding Past Research

To find previous research:

```bash
# List all research
ls -la .claude/research/

# Find research by topic
ls .claude/research/ | grep "tanstack"

# Find research by date
ls .claude/research/ | grep "2025-12-31"
```

## Cleanup Policy

Research directories are persistent by default. Users may clean up old research:

```bash
# Remove research older than 30 days
find .claude/research/ -type d -mtime +30 -exec rm -rf {} +
```

**Note:** The `.claude/research/` directory should be gitignored to avoid committing research artifacts.

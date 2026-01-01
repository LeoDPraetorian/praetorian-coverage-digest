# Recommendation Logic

How to analyze user context and mark recommended sources in Phase 2.

## Keyword Detection Patterns

### Codebase (researching-codebase)

**Trigger keywords:**
- "pattern", "patterns"
- "convention", "conventions"
- "local", "codebase", "our code"
- "example", "examples" (in context of existing code)
- "how do we", "how does our"
- "existing", "current implementation"

**Also recommend when:**
- User is creating/updating a skill
- User mentions a specific file or directory
- Task involves understanding existing architecture

### Context7 (researching-context7)

**Trigger keywords:**
- Any npm package name: `@tanstack`, `zustand`, `zod`, `react-hook-form`
- "library", "package", "npm"
- "official docs", "documentation"
- "API", "hooks" (in context of libraries)
- Framework names: "React", "Vue", "Next.js"

**Also recommend when:**
- User mentions a specific library version
- Task involves library integration
- Creating a library/framework skill

### GitHub (researching-github)

**Trigger keywords:**
- "github", "repo", "repository"
- "open source", "open-source", "OSS"
- "implementation", "implementations"
- "example project", "starter"
- "how others", "real world"
- "issues", "discussions"

**Also recommend when:**
- User wants to see how others solved a problem
- Looking for production examples
- Investigating community adoption

### arxiv (researching-arxiv)

**Trigger keywords:**
- "paper", "papers", "research"
- "academic", "peer-reviewed"
- "state of the art", "SOTA"
- "ML", "machine learning", "AI", "LLM"
- "technique", "algorithm"
- "theory", "theoretical"

**Also recommend when:**
- Topic involves cutting-edge techniques
- User needs validated/proven approaches
- Security or ML-related research

### Web (researching-web)

**Trigger keywords:**
- "tutorial", "tutorials"
- "blog", "blog post", "article"
- "how to", "guide"
- "Stack Overflow", "stackoverflow"
- "best practices" (general)
- "comparison", "vs"

**Also recommend when:**
- Topic is too new for academic papers
- Need practical/pragmatic guidance
- Looking for community consensus

## Multiple Source Recommendations

When context suggests multiple sources, mark all as recommended:

| Context | Recommended Sources |
| ------- | ------------------- |
| Creating a library skill | Codebase + Context7 |
| Implementing new feature with external lib | Context7 + GitHub + Web |
| Security research | arxiv + GitHub + Web |
| Understanding our patterns | Codebase only |
| General "how to" question | Web + GitHub |
| Academic technique implementation | arxiv + GitHub |

## Recommendation Priority

If user's request is ambiguous, default recommendations by task type:

| Task Type | Default Recommendations |
| --------- | ----------------------- |
| Skill creation | Codebase, Context7 (if library) |
| Feature implementation | Context7, GitHub |
| Bug investigation | Codebase, GitHub (issues) |
| Architecture decision | GitHub, Web, arxiv |
| Learning new tech | Context7, Web, GitHub |

## Edge Cases

### No Clear Keywords
If no keywords match, ask user directly:
> "I couldn't determine which research sources would be most helpful. Could you tell me more about what you're trying to learn?"

### All Keywords Match
If 4+ sources seem relevant, still show all as recommended but note:
> "Based on your request, multiple research sources seem relevant. You can select as many as needed."

### Conflicting Keywords
If keywords suggest conflicting sources (e.g., "simple tutorial" vs "academic research"), recommend both and let user decide.

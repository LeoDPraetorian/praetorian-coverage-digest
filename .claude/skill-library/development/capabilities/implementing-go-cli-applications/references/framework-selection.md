# Framework Selection Guide

Complete decision framework for choosing Go CLI libraries based on project requirements.

## Decision Matrix

Based on comprehensive research across 100+ sources (GitHub, Perplexity, community blogs):

| Criterion              | Cobra                             | Kong                       | urfave/cli             | stdlib flag       |
| ---------------------- | --------------------------------- | -------------------------- | ---------------------- | ----------------- |
| **Stars**              | 42.8k                             | 5k+ projects               | 23.8k                  | Built-in          |
| **Binary Size**        | 3420 KB                           | 3384 KB                    | 3684 KB                | Minimal           |
| **Dependencies**       | pflag, Viper (optional)           | Minimal                    | None (stdlib only)     | None              |
| **Learning Curve**     | Moderate                          | Moderate                   | Low-Moderate           | Very Low          |
| **Complexity Support** | High (>15 nested commands)        | Medium (5-15 commands)     | Medium (5-15 commands) | Low (<5 commands) |
| **Type Safety**        | Runtime                           | Compile-time (struct tags) | Runtime                | Runtime           |
| **Code Generation**    | Required (cobra-cli)              | No                         | No                     | No                |
| **Shell Completion**   | Yes (bash, zsh, fish, PowerShell) | Yes                        | Limited                | No                |
| **Auto Documentation** | Yes (markdown, man pages)         | No                         | No                     | No                |

## Selection Criteria

### Choose **Cobra** When:

- Complex command hierarchies (3+ levels deep)
- Need kubectl/docker-style commands
- Require auto-generated documentation
- Shell completion is critical
- Team already invested in Cobra/Viper ecosystem
- Enterprise applications with extensive subcommands

**Examples**: Kubernetes kubectl, GitHub CLI (gh), Docker buildx, Hugo

**Trade-offs**:

- Larger binary size (3420 KB)
- "Weird edge cases" reported by community
- Steeper learning curve
- Often requires Viper (adds complexity)

### Choose **Kong** When:

- New projects prioritizing clean architecture
- Want struct-based type safety
- Minimal dependencies required
- Container/Lambda deployment (binary size matters)
- Rapid development (40 min to migrate 7 commands)
- Compile-time validation preferred

**Examples**: 5,000+ projects across Go ecosystem

**Trade-offs**:

- Smaller ecosystem vs Cobra
- Less mature (but growing rapidly)
- Fewer third-party integrations

### Choose **urfave/cli** When:

- Zero dependencies are critical
- Medium-complexity CLIs (5-15 commands)
- Prefer Action callbacks over command structs
- No code generation acceptable
- Internal tools or rapid prototyping

**Examples**: Docker Compose, Gitea

**Trade-offs**:

- Largest binary size (3684 KB)
- No built-in shell completion
- Manual documentation

### Choose **stdlib flag** When:

- Simple scripts (<5 flags)
- Absolute minimal dependencies
- POSIX compliance not required
- No subcommands needed
- Quick utility tools

**Examples**: Simple internal scripts

**Trade-offs**:

- No double-dash syntax (--flag)
- No shorthand flags (-f)
- No subcommands
- Manual help text

## Migration Paths

### From Cobra to Kong

- Reported migration time: 40 minutes for 7 commands
- Struct-based approach reduces boilerplate
- Binary size reduction: 3420 KB → 3384 KB
- Remove dependency on pflag and Viper

### From urfave/cli to Cobra

- Necessary for complex nested commands
- Gain shell completion and auto-docs
- Accept larger binary size
- Adds code generation requirement

### From stdlib flag to pflag

- Drop-in replacement
- Gain GNU/POSIX-style --flags
- Maintain zero external dependencies if using standalone
- Used internally by Cobra

## Real-World Usage Patterns

### Kubernetes kubectl

- **Framework**: Cobra
- **Commands**: 50+ top-level commands, deeply nested
- **Reason**: Complex hierarchical structure, shell completion, resource-oriented

### Docker CLI

- **Framework**: Cobra (management commands)
- **Commands**: Container, image, network, volume management
- **Reason**: Clear noun-verb structure, extensive plugin system

### GitHub CLI (gh)

- **Framework**: Cobra
- **Commands**: Repo, issue, pr, workflow operations
- **Reason**: Interactive prompts, shell completion, auto-docs

### Gitea

- **Framework**: urfave/cli
- **Commands**: Admin, web, dump, migrate
- **Reason**: Zero dependencies, internal tool, moderate complexity

## Community Sentiment (2025-2026)

**Cobra**:

- "Battle-tested but has weird edge cases"
- "Forces flag definitions in init() functions"
- "Heavyweight for simple tools"
- "Industry standard for enterprise CLIs"

**Kong**:

- "Cleaner interface, easier to grok"
- "Ditching Cobra for Kong on new projects"
- "Struct-based approach is more Go-idiomatic"
- "Growing adoption in 2025-2026"

**urfave/cli**:

- "Middle ground between simplicity and features"
- "Zero dependencies is a killer feature"
- "Action callbacks cleaner than Cobra's Run functions"

## Binary Size Impact

For containerized applications (Chariot's use case):

```
Flag package only: ~1 MB
Kong: 3384 KB (3.3 MB)
Cobra: 3420 KB (3.35 MB)
urfave/cli: 3684 KB (3.6 MB)
```

**Layer caching consideration**: Smaller binaries improve Docker layer efficiency and Lambda cold starts.

## Recommendation for Chariot

**Use Kong for new CLI tools** (nebula, trajan, future tools):

1. **Binary size**: Smallest feature-complete option (3384 KB)
2. **Dependencies**: Minimal attack surface for security tools
3. **Type safety**: Compile-time validation reduces runtime errors
4. **Container-optimized**: Better for Lambda/Docker deployment
5. **Clean architecture**: Struct-based approach aligns with Go best practices

**Keep Cobra for existing tools** if:

- Already deeply integrated with Viper
- Team familiar with Cobra patterns
- Migration cost exceeds benefits

## Sources

- GitHub: kubernetes/kubectl, cli/cli, docker/cli, go-gitea/gitea
- Perplexity: Framework comparison, binary size analysis, community sentiment
- Web: Developer blogs, migration experiences, Stack Overflow discussions
- Research date: 2026-01-05
- Research output: `.claude/.output/research/2026-01-05-213532-go-cli-best-practices/`

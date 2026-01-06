---
name: mapping-python-dependencies-to-go
description: Use when porting Python projects to Go - systematically maps Python dependencies to Go equivalents through MANDATORY web research
allowed-tools: Read, WebSearch, WebFetch, Bash, Grep, TodoWrite
---

# Mapping Python Dependencies to Go

**Systematic dependency mapping through mandatory web research. Prevents false "no equivalent" claims that derail porting projects.**

## When to Use

Use this skill when:

- Porting Python projects to Go (like garak → venator)
- Analyzing Python dependencies for Go alternatives
- Creating dependency mapping tables for porting documentation
- You need to verify if Go equivalents exist before claiming custom implementation needed

**Critical**: This skill exists because initial assumptions about "no Go equivalent" are frequently wrong.

## Real Failure This Skill Prevents

**Without this skill** (RED phase documentation):

```
Initial claim: "litellm, transformers, torch have no Go equivalent"
Result: Would have planned custom implementations
Impact: Months of unnecessary work
```

**With mandatory research** (GREEN phase):

```
Actual finding: All have mature Go libraries
- litellm → LangChainGo (8.3k stars), Bifrost (1.4k stars)
- transformers → hugot (ONNX), go-huggingface (API)
- torch → gotch (LibTorch), gorgonia (pure Go)
Result: Use existing libraries
Impact: Port proceeds with confidence
```

## Quick Reference

| Phase                | Purpose                                      | Time     |
| -------------------- | -------------------------------------------- | -------- |
| 1. Extract           | Parse pyproject.toml/requirements.txt        | 5min     |
| 2. Research          | **MANDATORY** web search for each dependency | 30-60min |
| 3. Categorize        | Direct/Partial/None/Proto/N/A                | 10min    |
| 4. Document          | Tables with stars, status, notes             | 15min    |
| 5. Identify Blockers | Blocking vs non-blocking                     | 5min     |

**Total time**: 1-2 hours for ~40 dependencies (like garak)

## The MANDATORY Research Rule

🚨 **NEVER claim a dependency has no Go equivalent without web research first.**

**Why this rule exists:**

- Training data is 12-18 months stale
- Go ecosystem evolves rapidly (new libraries monthly)
- Official vendor SDKs often exist (cohere-ai/cohere-go pattern)
- Niche libraries have ports (base2048, ecoji, zalgo all exist)

**Cannot proceed to Phase 3 (Categorize) without completing Phase 2 (Research) for ALL dependencies.** ✅

### No "Obvious" Exception

**Not even for "common" dependencies:**

- ❌ "requests is obviously net/http, skip research"
- ❌ "I know colorama has Go equivalent, skip research"
- ❌ "numpy is common, defer research for niche ones"

**Reality check:**

- "Obvious" litellm had 3 Go equivalents we initially missed
- "Common" transformers has 2 approaches we didn't know
- "Simple" base2048 has a Go port despite being obscure

**Research EVERY dependency means EVERY dependency.** No confidence-based filtering. No "I know this one" shortcuts. ALL means ALL.

## Process

### Phase 1: Extract Dependencies

Read Python dependency files and list ALL dependencies:

```bash
# Primary sources
cat pyproject.toml | grep -A 50 "dependencies = \["
cat requirements.txt
cat setup.py | grep -A 20 "install_requires"
```

**Categorize by domain:**

| Category         | Examples                                     |
| ---------------- | -------------------------------------------- |
| LLM/AI Providers | openai, anthropic, cohere, mistralai, ollama |
| ML Frameworks    | torch, transformers, accelerate              |
| NLP Libraries    | nltk, spacy, sentencepiece                   |
| Data Processing  | numpy, pandas, pillow                        |
| Web/HTTP         | requests, aiohttp, httpx                     |
| Utilities        | colorama, tqdm, jinja2, backoff              |
| Domain-Specific  | (project-specific packages)                  |

**Output**: Categorized list of ALL dependencies (including optional/dev).

### Phase 2: Research Each Dependency (MANDATORY)

For **EVERY** dependency, perform web search using current year (2025):

**Search query templates:**

```
golang {package-name} equivalent library 2025 github
golang {functionality} library 2025 github
go {package-name} client API github
```

**Check these sources (in order):**

1. **pkg.go.dev** - Official Go package registry
   - Import count (popularity indicator)
   - Last update date (avoid abandoned)
   - Example: `pkg.go.dev/github.com/{org}/{repo}`

2. **GitHub search** - Direct repository lookup
   - Star count (>500 preferred for production)
   - Recent commits (active maintenance)
   - Issue/PR activity (community health)

3. **Official vendor SDKs** - Check `{vendor}-ai/{vendor}-go` pattern
   - Example: `cohere-ai/cohere-go`, `anthropics/anthropic-sdk-go`

4. **LangChainGo integrations** - Multi-provider framework
   - Check `github.com/tmc/langchaingo/llms/{provider}`

**Collect for each dependency:**

| Data Point                   | Why It Matters             |
| ---------------------------- | -------------------------- |
| Go package name + GitHub URL | Direct reference           |
| Star count                   | Community adoption signal  |
| Import count (pkg.go.dev)    | Production usage indicator |
| Last update date             | Maintenance status         |
| Official vs community        | Support expectations       |
| Feature coverage             | Full port vs partial       |

**For complete search patterns and source prioritization**, see [references/research-methodology.md](references/research-methodology.md).

### Phase 3: Categorize Results

Assign each dependency to one status category:

**Status Categories:**

| Symbol | Status         | Definition                                         | Action                     |
| ------ | -------------- | -------------------------------------------------- | -------------------------- |
| ✅     | **Direct**     | Full-featured Go equivalent (>500 stars preferred) | Use directly               |
| ⚠️     | **Partial**    | Go library exists but missing features             | Use with workarounds       |
| ❌     | **None**       | No Go equivalent after research                    | Custom implementation      |
| 🔧     | **Proto/gRPC** | Protocol buffer definitions exist                  | Generate Go bindings       |
| ⏭️     | **N/A**        | Not needed for port scope                          | Skip (e.g., training-only) |

**Categorization criteria:**

- **Direct**: >500 stars, active maintenance, feature-complete
- **Partial**: Library exists but gaps (e.g., ONNX-only for transformers)
- **None**: Zero results from ALL search sources after 3+ queries
- **Proto/gRPC**: Service provides .proto files (NVIDIA Riva, etc.)
- **N/A**: Training/dev-only libs for inference-only port

### Phase 4: Document Output

Create structured tables for each category:

#### Direct Equivalents Table

| Python | Go Equivalent                     | Stars | Status              | Notes          |
| ------ | --------------------------------- | ----- | ------------------- | -------------- |
| openai | github.com/sashabaranov/go-openai | 9k+   | ✅ Official-quality | Widely used    |
| cohere | github.com/cohere-ai/cohere-go    | 69    | ✅ Official         | Vendor SDK     |
| boto3  | github.com/aws/aws-sdk-go-v2      | 2.5k  | ✅ Official         | AWS maintained |

#### Partial Equivalents Table

| Python       | Go Equivalent                          | Stars | Gap       | Workaround                          |
| ------------ | -------------------------------------- | ----- | --------- | ----------------------------------- |
| transformers | github.com/knights-analytics/hugot     | 200   | ONNX only | Use for inference, API for training |
| fschat       | github.com/nexptr/llmchain/llms/fschat | ~10   | API only  | Missing conversation templates      |

#### No Equivalent (Custom Implementation)

| Python    | Functionality      | Effort | Recommendation                       |
| --------- | ------------------ | ------ | ------------------------------------ |
| ftfy      | Mojibake detection | High   | Port heuristics or defer (edge case) |
| avidtools | AI vuln database   | Medium | Port data classes (structured data)  |

#### Not Applicable

| Python     | Reason                                         |
| ---------- | ---------------------------------------------- |
| accelerate | Training-only, not needed for inference port   |
| datasets   | Training data loading, unnecessary for scanner |

**For template examples and formatting guidelines**, see [references/output-templates.md](references/output-templates.md).

### Phase 5: Identify Blockers

Classify each dependency by criticality:

**Classification:**

| Level            | Definition                      | Example                                   | Action                   |
| ---------------- | ------------------------------- | ----------------------------------------- | ------------------------ |
| **Blocking**     | Core functionality, must have   | LLM API clients (openai, anthropic)       | Must resolve before port |
| **Non-blocking** | Nice-to-have, workarounds exist | Specific text encodings (ecoji, base2048) | Defer or simplify        |
| **Skip**         | Not relevant to port scope      | Training frameworks (accelerate)          | Exclude from port        |

**Output**: Prioritized list of what MUST be resolved vs what can be deferred.

## Quality Gates

Before completing dependency mapping, verify:

- [ ] Every dependency has been web-searched (no assumptions made)
- [ ] Star counts recorded for all Go libraries found
- [ ] Update dates checked (avoid abandoned projects)
- [ ] Official vendor SDKs checked (GitHub {vendor}-ai/ pattern)
- [ ] pkg.go.dev import counts noted for production confidence
- [ ] Blocking vs non-blocking classification complete
- [ ] Custom implementation effort estimated for gaps
- [ ] Tables formatted with `npx prettier --write *.md`

**Cannot mark research complete without all quality gates passed.** ✅

## Anti-Patterns (NEVER DO)

### ❌ Claiming "No Equivalent" Without Research

**Wrong:**

```
"litellm has no Go port, need custom implementation"
```

**Right:**

```
1. Search: "golang litellm equivalent 2025 github"
2. Find: LangChainGo (8.3k stars), Bifrost (1.4k stars), gollm (600 stars)
3. Document: Three mature alternatives exist
```

### ❌ Using Stale Search Results

**Wrong:**

```
"Search says 2024, probably still accurate"
```

**Right:**

```
Always use current year (2025) in queries
Re-verify star counts and update dates
Check for recent releases (libraries evolve)
```

### ❌ Missing Official Vendor SDKs

**Wrong:**

```
"cohere → custom HTTP client"
```

**Right:**

```
Check: github.com/cohere-ai/cohere-go
Find: Official SDK (69 stars, maintained)
Use: Vendor SDK with support
```

### ❌ Ignoring Star Counts

**Wrong:**

```
"Found a library, any Go port works"
```

**Right:**

```
<100 stars → Community experiment
100-500 → Growing adoption
>500 → Production-ready
>1000 → Widely adopted
Check import count on pkg.go.dev
```

### ❌ Skipping pkg.go.dev

**Wrong:**

```
"GitHub has it, that's enough"
```

**Right:**

```
Check pkg.go.dev for:
- Import count (usage indicator)
- Last publish date
- Go version compatibility
- Godoc completeness
```

### ❌ Assuming Niche = Non-Existent

**Wrong:**

```
"base2048, ecoji, zalgo are obscure → no Go ports"
```

**Right:**

```
Research found ALL have Go implementations:
- base2048 → github.com/Milly/go-base2048
- ecoji → github.com/keith-turner/ecoji (canonical)
- zalgo → github.com/kortschak/zalgo
Even niche encodings have Go ports
```

## Example Corrections From Real Research

| Initially Assumed               | Actual Finding                                                    | Lesson                                 |
| ------------------------------- | ----------------------------------------------------------------- | -------------------------------------- |
| "litellm has no Go equivalent"  | LangChainGo (8.3k stars), Bifrost (1.4k stars), gollm (600 stars) | Always check multi-provider frameworks |
| "transformers needs subprocess" | hugot (ONNX pipelines), go-huggingface (API client)               | Check both local + API approaches      |
| "torch not available in Go"     | gotch (LibTorch bindings), gorgonia (pure Go)                     | Both bindings AND native ports exist   |
| "nltk is Python-only"           | prose (3k stars - tokenization, POS, NER)                         | Mature NLP ecosystem in Go             |
| "rapidfuzz is Python C++"       | fuzzysearch (1k+ stars), closestmatch (20x faster)                | Go optimizations can exceed Python     |
| "Niche libs don't have ports"   | base2048, ecoji, zalgo all have Go implementations                | Even obscure encodings ported          |

**Pattern**: Initial assumptions are systematically wrong. Research always reveals more than expected.

## Integration with Porting Workflow

This skill is **Phase 2** of the porting workflow:

```
1. Architecture Analysis → understand what we're porting
2. **Dependency Mapping** → THIS SKILL (maps Python → Go)
3. Reference Port → port simplest capability first
4. Systematic Port → port remaining with parity tracking
```

**Input**: Python project with dependencies
**Output**: Categorized mapping table + blocker list
**Next phase**: Use mapping to inform reference port selection

## Related Skills

- `analyzing-python-for-go-port` - Analyze Python module structure for porting
- `translating-python-idioms-to-go` - Port Python patterns to Go idioms
- `orchestrating-go-port` - Full porting workflow orchestration
- `gateway-backend` - Go backend patterns and libraries

## Common Rationalizations (DO NOT SKIP RESEARCH)

**See [references/research-rationalizations.md](references/research-rationalizations.md)** for complete list of excuses that lead to failure:

| Rationalization                   | Reality                               | Why It Fails                     |
| --------------------------------- | ------------------------------------- | -------------------------------- |
| "I already know this"             | Training data 12-18 months stale      | Libraries evolve monthly         |
| "Simple libs don't need research" | base2048, ecoji, zalgo all have ports | Even niche libs ported           |
| "No time for research"            | 15min research prevents hours of work | False paths cost days            |
| "Obvious from name"               | litellm ≠ no Go equiv                 | Assumptions systematically wrong |

**Cannot skip research. This is not negotiable.** ✅

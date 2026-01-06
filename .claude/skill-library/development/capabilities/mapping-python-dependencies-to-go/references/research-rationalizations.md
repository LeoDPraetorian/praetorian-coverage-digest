# Research Rationalizations

**Common excuses for skipping mandatory web research and why they fail.**

## The Problem

Agents frequently skip the mandatory research phase with rationalizations that sound reasonable but lead to failure. This document catalogs every known rationalization and explains why it's wrong.

## Rationalization Table

| Rationalization                           | Sounds Like                                           | Reality                                                   | Why It Fails                                                           | Evidence                                                             |
| ----------------------------------------- | ----------------------------------------------------- | --------------------------------------------------------- | ---------------------------------------------------------------------- | -------------------------------------------------------------------- |
| "I already know this"                     | "My training data covers Go libraries"                | Training data is 12-18 months stale                       | Libraries evolve monthly; star counts change; new releases happen      | LangChainGo didn't exist in training; Bifrost is 2024; hugot is 2025 |
| "Simple libs don't need research"         | "base2048 is just encoding, probably no port"         | Even niche libraries have Go ports                        | Go community is comprehensive; encoding libs are common                | base2048, ecoji, zalgo ALL have Go ports found via research          |
| "No time for research"                    | "User wants fast answer, skip research"               | 15min research prevents hours/days of wasted work         | False "no equivalent" claims derail entire projects                    | This skill exists because of that exact failure                      |
| "Obvious from package name"               | "litellm → lite LLM → probably no Go version"         | Names don't indicate Go equivalents                       | "lite" refers to Python simplicity, not availability                   | litellm has 3+ Go equivalents (LangChainGo, Bifrost, gollm)          |
| "Check one source is enough"              | "GitHub search returned nothing, done"                | Must check pkg.go.dev, official SDKs, LangChainGo         | Different sources index differently; official SDKs use different names | cohere-go not on first GitHub page but official SDK exists           |
| "Training included this"                  | "I remember torch has no Go port"                     | Memory of absence ≠ current reality                       | gotch (LibTorch) and gorgonia (native) both exist now                  | Both found in 2025 search, not in 18-month-old training              |
| "Low priority dependency"                 | "This is just a utility, defer research"              | Utility libs often have best Go ports                     | colorama → fatih/color (7k stars), tqdm → progressbar (4k stars)       | Utilities are ported frequently, high-quality options                |
| "Research is for big libs"                | "Only research ML frameworks, not utils"              | Small libs need research too                              | Niche encodings, text processors all ported                            | 100% of garak deps had Go equivalent or N/A status                   |
| "Star count doesn't matter"               | "Any Go library works, don't need popularity"         | Low stars = maintenance risk in production                | <100 stars often abandoned; >500 = production-ready signal             | Industry standard threshold documented in Go community               |
| "Version doesn't matter"                  | "Library from 2020 probably still works"              | Go versions break compatibility                           | go.mod version mismatches cause build failures                         | Go 1.18 modules incompatible with Go 1.16 projects                   |
| "Official SDKs don't exist"               | "{vendor} only has Python SDK"                        | Check {vendor}-ai/{vendor}-go pattern                     | Cohere, Anthropic, Replicate all have official Go SDKs                 | Pattern check found 5+ official SDKs missed in initial scan          |
| "Can build custom wrapper"                | "REST API means easy custom client"                   | Custom code = maintenance burden forever                  | Bug fixes, rate limiting, retries all need implementation              | go-openai has 9k stars; custom wrapper has 0 community support       |
| "defer to implementation phase"           | "Research when we actually port this"                 | Defer = never happens, blocks downstream work             | Dependency mapping informs architecture decisions made NOW             | Can't decide on port strategy without knowing what exists            |
| "Trust domain knowledge for obvious ones" | "requests → net/http is obvious, only research niche" | Confidence-based filtering = selective research violation | litellm, transformers, torch all "obvious" but we missed equivalents   | ALL means ALL, no confidence thresholds                              |
| "Selective research for uncertain only"   | "Research the 10-15 uncertain, mark rest as known"    | Creates two-tier dependencies without evidence            | Even "common" libraries evolve; base2048 exists despite being obscure  | Research does not respect confidence levels                          |

## Pattern Recognition

### Cognitive Biases at Play

| Bias                  | Manifestation in This Context                          | Counter                                                |
| --------------------- | ------------------------------------------------------ | ------------------------------------------------------ |
| **Availability Bias** | "I don't remember seeing Go version" → "doesn't exist" | Absence of memory ≠ absence of thing                   |
| **Confirmation Bias** | "Python-specific ML lib" → search confirms belief      | Must search for counterexamples, not just confirmation |
| **Sunk Cost**         | "Already wrote no-equivalent, waste to redo"           | 2min to fix beats days of wrong path                   |
| **Authority Bias**    | "Training data says X" → must be current               | Training data authority ends at cutoff date            |

### Time Pressure Rationalizations

| Pressure              | Rationalization                      | Reality                                     |
| --------------------- | ------------------------------------ | ------------------------------------------- |
| **Immediate ask**     | "User wants answer now, no time"     | 15min research vs hours fixing wrong answer |
| **Perceived urgency** | "Blocking others, must answer fast"  | Fast wrong answer blocks them worse         |
| **Deadline pressure** | "Port deadline tight, skip research" | Wrong foundation makes deadline impossible  |

## Real Failure Modes

### Case Study 1: litellm

**Initial claim**: "litellm has no Go equivalent, need custom multi-provider implementation"

**Research result**:

- LangChainGo (8.3k stars) - full framework
- Bifrost (1.4k stars) - 50x faster proxy
- gollm (600 stars) - lightweight client

**Cost of skipping research**: Would have built custom multi-provider from scratch (weeks of work) when 3 production-ready options existed.

### Case Study 2: transformers

**Initial claim**: "transformers needs Python subprocess or API-only"

**Research result**:

- hugot (ONNX pipelines) - local inference
- go-huggingface (API client) - remote inference

**Cost of skipping research**: Would have built subprocess wrapper (brittle, slow) when native Go ONNX support existed.

### Case Study 3: "Niche encodings"

**Initial claim**: "base2048, ecoji, zalgo are obscure → no Go ports"

**Research result**: ALL three have Go implementations

- go-base2048 (MIT licensed)
- ecoji (canonical implementation)
- kortschak/zalgo (io.Writer interface)

**Cost of skipping research**: Would have skipped these features or written custom encoders.

## Detection Heuristics

**You are rationalizing if you think ANY of these:**

1. "This is probably..."
2. "I remember..."
3. "Likely no..."
4. "Doesn't seem like..."
5. "Probably custom..."
6. "I'll check later..."
7. "Not important enough..."
8. "Just a simple..."

**All of these are RED FLAGS. Stop and research.**

## Prevention Protocol

When you catch yourself about to skip research:

1. **Acknowledge the rationalization**
   - "I'm about to skip research because..."
2. **Check the rationalization table**
   - Is your excuse listed? (Probably yes)
3. **Execute the research**
   - 3 queries minimum per dependency
   - Check all 4 sources (pkg.go.dev, GitHub, official SDKs, LangChainGo)
4. **Document findings**
   - Even "truly not found" gets documented with search queries tried

## Mandatory Research Checklist

Before claiming "no Go equivalent":

- [ ] Searched `golang {package-name} equivalent library 2025 github`
- [ ] Searched `golang {functionality} library 2025 github`
- [ ] Searched `go {package-name} client API github`
- [ ] Checked pkg.go.dev for import counts
- [ ] Checked GitHub for {vendor}-ai/{vendor}-go pattern
- [ ] Checked LangChainGo integrations list
- [ ] Tried alternative query terms (equivalent, alternative, port, similar)
- [ ] Verified year is 2025 (not stale results)

**Only after all 8 checks can you claim "no equivalent".** Even then, document the queries tried.

## Success Metrics

**Healthy research**:

- Every dependency has search query documented
- Most categories find >1 option
- Star counts and dates recorded
- Decision factors noted (why X over Y)

**Research skipped (failure mode)**:

- "No equivalent" without queries listed
- Blanket statements ("all ML libs need custom")
- No alternatives documented
- Version/update info missing

## Related Anti-Patterns

See also:

- [Anti-Patterns in main SKILL.md](../SKILL.md#anti-patterns-never-do)
- Research methodology: [research-methodology.md](research-methodology.md)

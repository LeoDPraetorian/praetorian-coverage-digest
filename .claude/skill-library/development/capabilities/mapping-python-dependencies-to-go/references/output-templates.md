# Output Templates

**Structured table templates for documenting Python→Go dependency mappings.**

## Complete Mapping Document Structure

```markdown
# Python → Go Dependency Mapping

Project: {project-name}
Python Version: {version}
Generated: {date}

## Summary

| Category | Total | Direct | Partial | None | Proto | N/A |
|----------|-------|--------|---------|------|-------|-----|
| LLM/AI   | 10    | 8      | 1       | 0    | 1     | 0   |
| ML       | 5     | 3      | 1       | 0    | 0     | 1   |
| ...      | ...   | ...    | ...     | ...  | ...   | ... |
| **TOTAL**| **40**| **30** | **5**   | **2**| **1** | **2**|

## Direct Equivalents (✅)

...tables...

## Partial Equivalents (⚠️)

...tables...

## No Equivalent (❌)

...tables...

## Proto/gRPC (🔧)

...tables...

## Not Applicable (⏭️)

...tables...

## Blocker Analysis

...blocking classification...
```

## Direct Equivalents Table

```markdown
## Direct Equivalents (✅)

Full-featured Go equivalents with production readiness (>500 stars preferred).

### LLM/AI Providers

| Python | Go Equivalent | Stars | Status | Notes |
|--------|---------------|-------|--------|-------|
| openai | github.com/sashabaranov/go-openai | 9k+ | ✅ Official-quality | Widely used, all endpoints |
| anthropic | github.com/anthropics/anthropic-sdk-go | official | ✅ Official | Vendor SDK |
| cohere | github.com/cohere-ai/cohere-go | 69 | ✅ Official | Chat, embeddings, complete |
| ollama | github.com/ollama/ollama/api | part of 120k | ✅ Official | Built into Ollama |

### ML Frameworks

| Python | Go Equivalent | Stars | Status | Notes |
|--------|---------------|-------|--------|-------|
| torch | github.com/sugarme/gotch | 400+ | ✅ Direct | LibTorch bindings, CUDA support |
| numpy | gonum.org/v1/gonum | 7k+ | ✅ Direct | Matrices, linear algebra, stats |

### Utilities

| Python | Go Equivalent | Stars | Status | Notes |
|--------|---------------|-------|--------|-------|
| requests | net/http (stdlib) | native | ✅ Native | Built-in HTTP client |
| colorama | github.com/fatih/color | 7k+ | ✅ Direct | Terminal colors |
| tqdm | github.com/schollz/progressbar | 4k+ | ✅ Direct | Progress bars |
```

## Partial Equivalents Table

```markdown
## Partial Equivalents (⚠️)

Go libraries exist but with feature gaps or limitations.

| Python | Go Equivalent | Stars | Gap | Workaround |
|--------|---------------|-------|-----|------------|
| transformers | github.com/knights-analytics/hugot | 200 | ONNX inference only, no training | Use for inference, API clients for training |
| fschat | github.com/nexptr/llmchain/llms/fschat | ~10 | API integration only | Missing conversation templates, port if needed |
| datasets | github.com/gomlx/go-huggingface | ~50 | Download only, no streaming | Use for model downloads, custom streaming |
```

### Gap Documentation Format

**Structure**:
- **Gap**: What's missing compared to Python package
- **Workaround**: How to achieve similar functionality
- **Effort**: Low/Medium/High if custom implementation needed

## No Equivalent Table

```markdown
## No Equivalent (Custom Implementation Needed) (❌)

No Go library found after exhaustive research. Custom implementation required.

| Python | Functionality | Effort | Recommendation |
|--------|---------------|--------|----------------|
| ftfy | Mojibake detection and repair | High | Port heuristics (complex), or defer (edge case), or use `golang.org/x/text/encoding` for basic cases |
| avidtools | AI vulnerability database integration | Medium | Port data classes (Vulnerability, Report) - structured data is straightforward |
| specific-internal-lib | Project-specific functionality | Varies | Assess criticality, defer if non-blocking |
```

### Effort Estimation Guide

| Effort | Definition | Example |
|--------|------------|---------|
| **Low** | <1 day, simple data structures or API calls | REST client, data classes |
| **Medium** | 1-3 days, moderate algorithms or state | Template engine, basic heuristics |
| **High** | >3 days, complex algorithms or ML | ML model inference, advanced NLP |

## Proto/gRPC Table

```markdown
## Proto/gRPC (Generate Bindings) (🔧)

Protocol buffer definitions exist, generate Go bindings with `protoc`.

| Python | Service | Proto Location | Generation Command |
|--------|---------|----------------|-------------------|
| nvidia-riva-client | NVIDIA Riva Speech AI | github.com/nvidia-riva/common | `protoc --go_out=. --go-grpc_out=. *.proto` |
| custom-grpc-service | Internal service | internal/proto/*.proto | See service docs |
```

## Not Applicable Table

```markdown
## Not Applicable (Not Needed for Port) (⏭️)

Python dependencies not relevant to Go port scope.

| Python | Reason |
|--------|--------|
| accelerate | Training optimization library, port is inference-only |
| datasets | Training data loading, scanner doesn't train models |
| jupyter | Interactive notebook environment, CLI port doesn't need |
| pytest | Python testing framework, Go uses `go test` |
| black | Python formatter, Go uses `gofmt`/`goimports` |
```

## Blocker Analysis Template

```markdown
## Blocker Analysis

### Blocking Dependencies

**Must resolve before port can proceed:**

| Dependency | Category | Issue | Resolution |
|------------|----------|-------|------------|
| openai | LLM Provider | Core functionality | ✅ go-openai available |
| transformers | ML Framework | Model inference | ⚠️ hugot for ONNX, API for others |

### Non-Blocking Dependencies

**Can defer or work around:**

| Dependency | Category | Impact | Workaround |
|------------|----------|--------|------------|
| ecoji | Text Encoding | Niche encoding feature | Defer, low usage frequency |
| ftfy | Text Repair | Edge case handling | Skip, validate UTF-8 at boundaries |

### Skip (Out of Scope)

| Dependency | Reason |
|------------|--------|
| accelerate | Training-only, not needed |
| pytest | Testing framework, use Go's |
```

## Formatting Guidelines

### Table Alignment

Use Prettier for consistent formatting:

```bash
npx prettier --write dependency-mapping.md
```

### Star Count Format

- Exact count if <1000: "234"
- Rounded if 1000-9999: "1.2k", "4.5k"
- Rounded if >10000: "12k+", "50k+"

### Status Symbols

Consistent usage:
- ✅ Direct (green checkmark)
- ⚠️ Partial (warning triangle)
- ❌ None (red X)
- 🔧 Proto/gRPC (wrench)
- ⏭️ N/A (fast-forward)

### URL Format

Always include full GitHub URL:
- ✅ `github.com/org/repo`
- ❌ `org/repo`

Exception: Standard library
- ✅ `net/http (stdlib)`
- ✅ `gonum.org/v1/gonum`

## Complete Example

See `examples/garak-to-venator-mapping.md` for a full 40-dependency mapping using these templates.

# Research Methodology

**Complete search patterns, source prioritization, and data collection for Python→Go dependency mapping.**

## Search Query Construction

### Query Templates (Priority Order)

1. **Direct package lookup**:
   ```
   golang {package-name} equivalent library 2025 github
   ```
   Example: `golang litellm equivalent library 2025 github`

2. **Functionality-based**:
   ```
   golang {functionality} library 2025 github
   ```
   Example: `golang LLM multi-provider unified API 2025 github`

3. **Vendor-specific**:
   ```
   go {vendor} API client github
   ```
   Example: `go cohere API client github`

### Query Refinement Strategies

**If no results**: Try alternative terms
- "equivalent" → "alternative", "similar", "port"
- "library" → "package", "SDK", "client"
- Add specific features: "streaming", "async", "embeddings"

**If too many results**: Add qualifiers
- Add stars threshold: "golang X library github stars"
- Add specific use case: "golang X production ready"
- Add year to filter stale results

### Year Usage

Always use current year (2025) because:
- Libraries published in last 12 months won't appear in training data
- Go ecosystem evolves rapidly (major releases monthly)
- Star counts and adoption change significantly year-over-year

## Source Priority Matrix

| Source | Why Check | What to Extract | Red Flags |
|--------|-----------|-----------------|-----------|
| **pkg.go.dev** (Priority 1) | Official registry | Import count, last update, Go version | No imports, >12mo since update |
| **GitHub** (Priority 2) | Source of truth | Stars, commits, issues, PRs | <50 stars, archived, no commits 6mo+ |
| **Vendor SDKs** (Priority 3) | Official support | Maintenance guarantees | None if official |
| **LangChainGo** (Priority 4) | Integration exists | Multi-provider option | May be wrapper-only |

### Priority 1: pkg.go.dev

**Why first**: Official registry shows production usage

**URL pattern**: `pkg.go.dev/github.com/{org}/{repo}`

**Extract**:
- Import count (right sidebar) - indicates production adoption
- Last published date - maintenance indicator
- Go version compatibility
- Documentation completeness (Godoc coverage)

**Example**:
```
pkg.go.dev/github.com/sashabaranov/go-openai
→ 1,200+ importers
→ Last published: Dec 2024
→ Go 1.18+
```

### Priority 2: GitHub Repository

**URL pattern**: `github.com/{org}/{repo}`

**Extract**:
- Star count (top right)
- Last commit date (commit history)
- Open issues vs closed ratio
- PR activity (community health)
- Releases (version stability)

**Quality signals**:
- >500 stars = production-ready
- >1000 stars = widely adopted
- Commits within 30 days = actively maintained
- Issue response <7 days = healthy community

### Priority 3: Official Vendor SDKs

**Pattern**: `github.com/{vendor}-ai/{vendor}-go`

**Examples**:
- `cohere-ai/cohere-go`
- `anthropics/anthropic-sdk-go`
- `aws/aws-sdk-go-v2`

**Why check**: Vendor SDKs often have lower stars but higher quality/support

**Extract**:
- Vendor affiliation (org name)
- License (official SDKs usually permissive)
- Support channels

### Priority 4: LangChainGo Integrations

**Pattern**: `github.com/tmc/langchaingo/llms/{provider}`

**Check when**: Multiple providers needed (litellm equivalent)

**Extract**:
- List of supported providers
- Integration completeness
- Framework overhead

## Data Collection Checklist

For each dependency, collect:

- [ ] Go package name (full import path)
- [ ] GitHub URL
- [ ] Star count
- [ ] Import count from pkg.go.dev
- [ ] Last update date (within 6 months = good)
- [ ] Official vs community maintained
- [ ] Feature coverage notes (full/partial/specific gaps)

## Coverage Assessment

**Full Coverage (Direct ✅)**:
- All major features present
- Production-ready (>500 stars or official)
- Active maintenance (commits within 3 months)

**Partial Coverage (Partial ⚠️)**:
- Core features present, some gaps
- Example: hugot supports ONNX inference but not training
- Workaround exists or gap is acceptable

**No Coverage (None ❌)**:
- Zero results from ALL search queries
- No official SDK, no community library
- Only after trying 3+ query variations

## Special Cases

### Case 1: Multiple Options

**When found**: Multiple Go libraries for same Python package

**Strategy**:
1. Check official vendor SDK first
2. Compare stars (higher = more adoption)
3. Check imports on pkg.go.dev
4. Choose most actively maintained

**Example**: litellm has 3 options
- LangChainGo (8.3k stars) - framework
- Bifrost (1.4k stars) - gateway/proxy
- gollm (600 stars) - lightweight client

**Decision factors**: Use case (framework vs proxy vs lightweight)

### Case 2: Bindings vs Native

**When found**: Both C bindings and pure Go implementations

**Examples**:
- torch: gotch (LibTorch bindings) + gorgonia (pure Go)
- image processing: govips (libvips bindings) + imaging (pure Go)

**Document both**:
- Bindings: Performance, feature parity with C lib
- Native: Easier deployment, no CGo dependencies

### Case 3: Proto/gRPC Only

**When found**: Service provides .proto files, no Go SDK

**Examples**:
- NVIDIA Riva
- Some enterprise services

**Document**:
- Proto file location
- Generate command: `protoc --go_out=. --go-grpc_out=. *.proto`
- Mark as 🔧 Proto/gRPC category

## Research Time Estimates

| Dependency Count | Research Time | Notes |
|------------------|---------------|-------|
| 1-10 | 15-30 min | Quick scan |
| 10-25 | 30-60 min | Most projects |
| 25-50 | 1-2 hours | Large project (like garak) |
| 50+ | 2-3 hours | Consider parallelization |

**Parallelization**: Can research categories in parallel (LLM providers, ML frameworks, utilities)

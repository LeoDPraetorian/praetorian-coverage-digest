# Search Query Formulation

**Academic terminology patterns for effective arxiv.org searches.**

## Academic vs Colloquial Terminology

### AI/ML Domain

| Colloquial Term            | Academic Term                          | Why It Matters                    |
| -------------------------- | -------------------------------------- | --------------------------------- |
| "LLM hacking"              | "adversarial attacks on language models" | Indexed in security papers     |
| "AI hallucination"         | "factual inconsistency in generation"  | Precise technical term            |
| "making AI safe"           | "alignment techniques"                 | Established research area         |
| "AI agents"                | "autonomous agent architectures"       | Academic terminology              |
| "chatbot"                  | "conversational AI system"             | Broader technical scope           |
| "prompt engineering"       | "input optimization for LLMs"          | Research-focused terminology      |

### Security Domain

| Colloquial Term     | Academic Term                | Why It Matters               |
| ------------------- | ---------------------------- | ---------------------------- |
| "finding bugs"      | "vulnerability discovery"    | Security research terminology |
| "breaking security" | "cryptanalytic attack"       | Precise attack classification |
| "network scanning"  | "service enumeration"        | Network security terminology  |
| "hacking tools"     | "penetration testing frameworks" | Professional terminology |
| "data leak"         | "information disclosure"     | Academic classification       |

### System/Architecture Domain

| Colloquial Term        | Academic Term                     | Why It Matters                |
| ---------------------- | --------------------------------- | ----------------------------- |
| "microservices"        | "distributed system architecture" | Broader research context      |
| "cloud computing"      | "distributed computing infrastructure" | Academic framing       |
| "API design"           | "interface specification"         | Formal terminology            |
| "database performance" | "query optimization"              | Research-focused term         |

## Query Patterns

### Pattern 1: Broad → Specific

Start with broad survey, narrow to specific technique:

```
Query 1 (Broad):     "adversarial attacks language models"
Query 2 (Specific):  "prompt injection jailbreak LLM"
Query 3 (Narrow):    "prefix suffix attack GPT defense"
```

**Why:** Broad queries identify research landscape, specific queries find implementation details.

### Pattern 2: Problem → Solution

Start with problem statement, then search for solutions:

```
Query 1 (Problem):   "factual inconsistency language model generation"
Query 2 (Solution):  "retrieval augmented generation hallucination reduction"
Query 3 (Approach):  "grounded generation verification techniques"
```

**Why:** Problem-focused papers explain the gap, solution papers provide techniques.

### Pattern 3: Technique → Application

Start with general technique, then domain-specific applications:

```
Query 1 (Technique): "transformer attention mechanism"
Query 2 (Domain):    "attention visualization interpretability"
Query 3 (Application): "attention-based security analysis"
```

**Why:** Technique papers provide foundations, application papers show practical use.

## Query Operators

### Boolean Operators

**AND (implicit with +):**
```
query=adversarial+attacks+AND+language+models
```

**OR:**
```
query=prompt+injection+OR+jailbreak
```

**NOT:**
```
query=LLM+security+NOT+vision
```

### Category Filtering

**Single category:**
```
query=cs.CR+prompt+injection
```
- `cs.CR` = Cryptography and Security

**Multiple categories:**
```
query=(cs.AI+OR+cs.LG)+AND+adversarial
```
- `cs.AI` = Artificial Intelligence
- `cs.LG` = Machine Learning

### Common arXiv Categories

| Code    | Category                          | Use For                      |
| ------- | --------------------------------- | ---------------------------- |
| cs.AI   | Artificial Intelligence           | LLM, agents, planning        |
| cs.CR   | Cryptography and Security         | Security, attacks, defenses  |
| cs.LG   | Machine Learning                  | ML techniques, algorithms    |
| cs.SE   | Software Engineering              | Development practices        |
| cs.NI   | Networking and Internet Architecture | Protocols, fingerprinting |
| cs.CY   | Computers and Society             | Ethics, policy               |
| cs.HC   | Human-Computer Interaction        | UI/UX research               |
| stat.ML | Machine Learning (Statistics)     | Statistical ML methods       |

## Date Filtering

### Recent Papers (Last Year)

```
query=LLM+security+AND+submittedDate:[202401+TO+202412]
```

### Specific Year

```
query=adversarial+attacks+AND+submittedDate:[202301+TO+202312]
```

### Last N Months

For current date 2025-12-30, last 6 months:

```
query=prompt+injection+AND+submittedDate:[202506+TO+202512]
```

**Why date filtering matters:**
- AI/ML field moves rapidly (techniques become outdated in 6-12 months)
- Security research responds to new threats (need recent papers)
- Foundational work can be older (e.g., attention mechanisms from 2017)

## Query Refinement Strategy

### If Too Many Results (>100)

1. Add category filter: `query=cs.CR+{your-query}`
2. Add date filter: `submittedDate:[YYYYMM+TO+YYYYMM]`
3. Make query more specific: "prompt injection" → "prefix suffix attack"
4. Search by title instead of all fields: `searchtype=title`

### If Too Few Results (<5)

1. Remove category filter
2. Broaden date range
3. Use more general terms: "GPT-4 attack" → "LLM attack"
4. Search abstracts: `searchtype=abstract`
5. Try synonyms: "jailbreak" vs "adversarial prompt"

### If Irrelevant Results

1. Add NOT filter: `query=LLM+NOT+vision`
2. Use more precise terminology (see tables above)
3. Add domain-specific terms: "security", "attack", "defense"
4. Check for homonyms: "transformer" (ML) vs "transformer" (electrical)

## Example Query Sessions

### Session 1: LLM Security Research

```
# Phase 1: Survey landscape
query=adversarial+attacks+language+models&searchtype=all

# Phase 2: Narrow to technique
query=prompt+injection+jailbreak+defense&searchtype=title

# Phase 3: Specific approach
query=prefix+suffix+attack+mitigation&searchtype=abstract
```

### Session 2: RAG Systems

```
# Phase 1: Broad understanding
query=retrieval+augmented+generation&searchtype=all

# Phase 2: Problem focus
query=RAG+hallucination+factuality&searchtype=abstract

# Phase 3: Solution techniques
query=grounded+generation+verification&searchtype=title
```

### Session 3: Service Fingerprinting

```
# Phase 1: General technique
query=service+fingerprinting+protocol+detection&searchtype=all

# Phase 2: Domain-specific
query=HTTP+fingerprinting+API+detection&searchtype=abstract

# Phase 3: Implementation
query=network+scanning+service+enumeration&searchtype=title
```

## Related Skills

- **researching-arxiv** - Uses these query patterns
- **researching-skills** - Parent router for research workflows

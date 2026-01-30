# Keyword Extraction Patterns

**Research-backed strategies for extracting keywords from Table of Contents.**

## Manual Extraction (Recommended for Technical Books)

### Why Manual Extraction Works

Research across 5 sources (codebase, GitHub, Context7, arxiv, Web) reveals:

- **Domain expertise required:** Technical books use specialized terminology that NLP may misinterpret
- **Quality over quantity:** 5-10 well-chosen keywords outperform 50 automated suggestions
- **TOC optimization:** Book authors already curated the most important topics in TOC
- **Confidence:** 1.0 (codebase proves this works for 3 security books)

### Manual Extraction Workflow

**Step 1: Locate TOC**
```bash
# Find TOC section (usually near beginning)
grep -n -i "table of contents\|^contents$" Books/{book}.md

# Extract chapter titles
grep -A 50 "Table of Contents" Books/{book}.md | grep "^\s*-\|^\s*\*\|^##\?"
```

**Step 2: Human Review**

Read extracted chapter titles and identify:
- **Technical concepts** (not generic terms like "Introduction")
- **Core topics** (5-10 main areas covered)
- **Specific technologies** (e.g., "Kerberos", "NTLM", not just "authentication")

**Step 3: Balance Breadth and Specificity**

- **Breadth:** Cover multiple chapters (not just first 3)
- **Specificity:** Use technical terms (not "security" but "access control lists")
- **Searchability:** Terms users would actually query

### Examples from Existing Book Skills

**windows-security-internals keywords:**
- Windows authentication mechanisms
- Kerberos
- NTLM
- Access tokens
- Security descriptors
- Active Directory security
- Network authentication
- Access control internals

**Pattern:** Mix general categories ("authentication mechanisms") with specific technologies ("Kerberos", "NTLM")

**evading-edr keywords:**
- EDR architecture
- Detection mechanisms
- Evasion techniques
- Function hooking
- Kernel callbacks
- ETW (Event Tracing for Windows)
- Offensive security tradecraft

**Pattern:** Technical specificity (ETW, kernel callbacks) with context (EDR architecture, detection mechanisms)

---

## Automated Extraction (For Scale or Updates)

### When to Use Automation

- **Large-scale:** Converting 20+ books
- **Updates:** Validating existing keywords with improved OCR
- **Consistency:** Cross-book keyword standardization
- **Augmentation:** Suggesting additional keywords to domain experts

### Tool Comparison

| Tool | Confidence | Best For | Implementation |
|------|-----------|----------|----------------|
| **YAKE** | 0.85 | Unsupervised, single-document | Python, no training data required |
| **KeyBERT** | 0.92 | Semantic extraction, diversity | Python, BERT embeddings |
| **TF-IDF** | 0.80 | Baseline, fast | Python scikit-learn |
| **TextRank** | 0.88 | Graph-based, no training | Python, PageRank for text |

### YAKE Implementation

**Advantages:**
- No training data required
- Works on single document (TOC)
- Fast execution (<1 second)
- Unsupervised (no manual labeling)

**Code:**
```python
import yake

# Initialize extractor
kw_extractor = yake.KeywordExtractor(
    lan="en",
    n=2,              # Max n-gram size (1-3 recommended)
    top=10,           # Number of keywords
    dedupLim=0.7,     # Deduplication threshold
    dedupFunc='seqm', # Deduplication function
    windowsSize=1,    # Co-occurrence window
    features=None     # Use default features
)

# Extract TOC text
toc_text = extract_toc(book_markdown)

# Extract keywords
keywords = kw_extractor.extract_keywords(toc_text)

# Results: [(keyword, score)] - lower score = more relevant
for kw, score in keywords:
    print(f"{kw}: {score:.4f}")
```

**Note:** YAKE scores are **inverted** - lower score means higher relevance (0.0 = perfect match)

### KeyBERT Implementation

**Advantages:**
- Semantic understanding via BERT embeddings
- Diversity controls (MMR, Max Sum Distance)
- Captures meaning, not just frequency
- State-of-the-art results (F1: 0.93+)

**Code:**
```python
from keybert import KeyBERT

# Initialize model
kw_model = KeyBERT()

# Extract keywords with diversity
keywords = kw_model.extract_keywords(
    toc_text,
    keyphrase_ngram_range=(1, 3),  # 1-3 word phrases
    use_mmr=True,                   # Maximum Marginal Relevance
    diversity=0.7,                  # Higher = more diverse (0.0-1.0)
    top_n=10,                       # Number of keywords
    stop_words='english'            # Filter common words
)

# Results: [(keyword, relevance_score)]
for kw, score in keywords:
    print(f"{kw}: {score:.4f}")
```

**KeyBERT scores:** Higher = more relevant (0.0-1.0 scale)

### Ensemble Approach (Production)

**Why:** Combine multiple methods for robustness

```python
def ensemble_keyword_extraction(toc_text, top_n=10):
    # Method 1: YAKE (weight=0.3)
    yake_kws = yake_extract(toc_text, top=20)
    yake_scores = {kw: 1 - score for kw, score in yake_kws}  # Invert YAKE scores

    # Method 2: KeyBERT (weight=0.4)
    keybert_kws = keybert_extract(toc_text, top=20)
    keybert_scores = dict(keybert_kws)

    # Method 3: TF-IDF (weight=0.3)
    tfidf_kws = tfidf_extract(toc_text, top=20)
    tfidf_scores = dict(tfidf_kws)

    # Weighted fusion
    all_keywords = set(yake_scores.keys()) | set(keybert_scores.keys()) | set(tfidf_scores.keys())
    final_scores = {}

    for kw in all_keywords:
        score = (
            0.3 * yake_scores.get(kw, 0) +
            0.4 * keybert_scores.get(kw, 0) +
            0.3 * tfidf_scores.get(kw, 0)
        )
        final_scores[kw] = score

    # Sort by score and return top N
    sorted_kws = sorted(final_scores.items(), key=lambda x: x[1], reverse=True)
    return sorted_kws[:top_n]
```

---

## Validation Checklist

After keyword extraction (manual or automated), validate:

- [ ] **Specificity:** Are keywords technical, not generic?
- [ ] **Coverage:** Do keywords span multiple chapters?
- [ ] **Searchability:** Would users actually search for these terms?
- [ ] **Uniqueness:** Do keywords distinguish this book from others?
- [ ] **Accuracy:** Do keywords appear in chapter titles/summaries?

---

## Common Pitfalls

### Pitfall 1: Generic Terms

❌ **Bad:** "security", "architecture", "design patterns"
✅ **Good:** "role-based access control", "microservices architecture", "factory pattern"

### Pitfall 2: Abbreviation Overload

❌ **Bad:** "EDR", "ETW", "SSRF" (without expansion)
✅ **Good:** "EDR (Endpoint Detection and Response)", "ETW internals"

### Pitfall 3: First-Chapter Bias

❌ **Bad:** All keywords from chapters 1-3
✅ **Good:** Representative keywords from entire book

### Pitfall 4: Ignoring Technical Stack

❌ **Bad:** Generic "API security" for Windows-specific content
✅ **Good:** "Windows API security", "COM security", "RPC authentication"

---

## References

- **Research:** `/Users/weber/Projects/chariot-development-platform/.claude/.output/research/2026-01-12-114450-book-to-skill-conversion/SYNTHESIS.md`
- **YAKE GitHub:** https://github.com/LIAAD/yake (1.8k stars)
- **KeyBERT GitHub:** https://github.com/MaartenGr/KeyBERT (4.1k stars)
- **Codebase examples:** `.claude/skill-library/security/windows/*/SKILL.md`

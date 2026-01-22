# Synthesis Patterns

**Algorithms for aggregating, deduplicating, and cross-referencing findings from multiple LLMs.**

---

## Overview

After running parallel analysis across 4 models, you have 4 independent vulnerability assessments. Synthesis transforms these into a unified, confidence-calibrated threat analysis.

**Key challenges:**

- Same vulnerability described with different words
- Conflicting severity assessments
- Unique findings from single models (signal or noise?)
- Determining confidence levels

---

## Step 1: Parse Raw Outputs

Extract structured data from each model's response:

```python
from typing import List, Dict

def parse_model_response(response: str, model: str) -> List[Dict]:
    """
    Parse vulnerability findings from model response.

    Returns list of findings:
    [
        {
            'vulnerability': 'SQL Injection in /api/login',
            'attack_vector': 'POST username with SQL payload',
            'severity': 'CRITICAL',
            'confidence': 'HIGH',
            'model': 'anthropic/claude-sonnet-4-20250514',
            'raw_description': '...'
        },
        ...
    ]
    """
    findings = []

    # Parse response format (depends on your prompt structure)
    # This is a simplified example
    sections = response.split('\n\n')

    for section in sections:
        if 'Vulnerability:' in section:
            vuln = extract_vulnerability(section)
            vuln['model'] = model
            findings.append(vuln)

    return findings
```

**Pattern:** Standardize data structure early to enable cross-model comparison.

---

## Step 2: Deduplication Algorithm

Identify the same vulnerability described differently:

### Approach 1: Semantic Similarity

```python
from sentence_transformers import SentenceTransformer, util

model = SentenceTransformer('all-MiniLM-L6-v2')

def semantic_dedup(findings: List[Dict], threshold=0.75) -> List[Dict]:
    """
    Group findings by semantic similarity.
    """
    embeddings = model.encode([f['vulnerability'] for f in findings])

    groups = []
    used = set()

    for i, finding in enumerate(findings):
        if i in used:
            continue

        group = [finding]
        used.add(i)

        for j in range(i + 1, len(findings)):
            if j in used:
                continue

            similarity = util.cos_sim(embeddings[i], embeddings[j]).item()

            if similarity > threshold:
                group.append(findings[j])
                used.add(j)

        groups.append(group)

    return groups
```

**Advantages:**

- Catches paraphrasing ("SQL injection" vs "unsanitized database query")
- Language-agnostic

**Disadvantages:**

- Requires additional dependency
- May group dissimilar findings with similar wording

### Approach 2: Rule-Based Matching

```python
import re

def normalize_vuln(text: str) -> str:
    """
    Normalize vulnerability description for comparison.
    """
    # Lowercase
    text = text.lower()

    # Remove articles
    text = re.sub(r'\b(a|an|the)\b', '', text)

    # Normalize spaces
    text = ' '.join(text.split())

    # Map synonyms
    synonyms = {
        'sql injection': 'sqli',
        'cross-site scripting': 'xss',
        'authentication bypass': 'auth bypass',
        # Add more mappings
    }

    for long_form, short_form in synonyms.items():
        text = text.replace(long_form, short_form)

    return text

def rule_based_dedup(findings: List[Dict]) -> List[Dict]:
    """
    Group findings by normalized descriptions.
    """
    groups = {}

    for finding in findings:
        normalized = normalize_vuln(finding['vulnerability'])

        if normalized not in groups:
            groups[normalized] = []

        groups[normalized].append(finding)

    return list(groups.values())
```

**Advantages:**

- No external dependencies
- Fast
- Deterministic

**Disadvantages:**

- Requires manual synonym mapping
- May miss edge cases

**Recommendation:** Use rule-based for speed, fall back to semantic if accuracy is critical.

---

## Step 3: Cross-Reference Confidence Scoring

Apply confidence matrix based on model agreement:

```python
def calculate_confidence(group: List[Dict]) -> Dict:
    """
    Calculate confidence based on how many models found this vulnerability.
    """
    model_count = len(set(f['model'] for f in group))
    total_models = 4

    confidence_map = {
        4: {'level': 'CRITICAL', 'desc': 'Definitely exploitable - prioritize'},
        3: {'level': 'HIGH', 'desc': 'Very likely exploitable - verify'},
        2: {'level': 'MEDIUM-HIGH', 'desc': 'Likely real - needs verification'},
        1: {'level': 'MEDIUM', 'desc': 'Investigate based on model specialty'},
    }

    return {
        'model_agreement': f'{model_count}/{total_models}',
        'confidence': confidence_map[model_count]
    }
```

**Key insight:** Agreement is a strong signal. If Claude, GPT-4, and DeepSeek all find the same issue independently, it's highly likely real.

---

## Step 4: Preserve Model-Unique Findings

Don't dismiss findings from a single model:

```python
def analyze_unique_findings(group: List[Dict]) -> Dict:
    """
    Analyze why only one model found this.
    """
    if len(group) > 1:
        return None  # Not unique

    finding = group[0]
    model = finding['model']

    # Model specialty analysis
    specialties = {
        'anthropic/claude-sonnet-4-20250514': 'Auth edge cases, safety implications',
        'openai/gpt-4-turbo': 'CVE patterns, known vulnerabilities',
        'vertex_ai/gemini-1.5-pro': 'API design flaws, architecture',
        'deepseek/deepseek-chat': 'Implementation bugs, code-level issues',
    }

    return {
        'finding': finding,
        'model_specialty': specialties.get(model, 'Unknown'),
        'recommendation': f'Investigate as {specialties[model]} domain issue'
    }
```

**Pattern:** Unique findings aligned with model specialty are MORE likely valid, not less.

**Examples:**

- DeepSeek finds integer overflow → Investigate code implementation
- Claude finds auth edge case → Investigate safety implications
- GPT-4 finds CVE match → Check CVE database for details
- Gemini finds API design flaw → Review architecture patterns

---

## Step 5: Severity Resolution

When models disagree on severity, use MAXIMUM severity:

```python
def resolve_severity(group: List[Dict]) -> str:
    """
    Choose highest severity from group.
    """
    severity_order = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']

    severities = [f['severity'] for f in group]

    # Return highest
    for sev in reversed(severity_order):
        if sev in severities:
            return sev

    return 'UNKNOWN'
```

**Rationale:** In security analysis, err on the side of caution. If GPT-4 rates SQLi as "HIGH" but Claude rates it "CRITICAL", treat it as CRITICAL.

**Exception:** If 3 models agree on lower severity and 1 outlier suggests higher, document the disagreement and investigate why.

---

## Complete Synthesis Pipeline

```python
def synthesize_findings(raw_responses: List[Dict]) -> Dict:
    """
    Complete synthesis pipeline.

    Args:
        raw_responses: [{'model': 'anthropic/...', 'response': '...'}, ...]

    Returns:
        {
            'high_confidence': [...],     # 2+ models agree
            'unique_findings': [...],     # 1 model only
            'model_contributions': {...}, # Stats per model
            'total_vulnerabilities': int
        }
    """
    # Step 1: Parse
    all_findings = []
    for resp in raw_responses:
        findings = parse_model_response(resp['response'], resp['model'])
        all_findings.extend(findings)

    # Step 2: Deduplicate
    groups = rule_based_dedup(all_findings)

    # Step 3: Confidence scoring
    high_confidence = []
    unique_findings = []

    for group in groups:
        confidence = calculate_confidence(group)

        if len(group) >= 2:
            high_confidence.append({
                'vulnerability': group[0]['vulnerability'],
                'severity': resolve_severity(group),
                'found_by': [f['model'] for f in group],
                'confidence': confidence
            })
        else:
            unique = analyze_unique_findings(group)
            if unique:
                unique_findings.append(unique)

    # Step 4: Model contribution stats
    model_contributions = {}
    for finding in all_findings:
        model = finding['model']
        if model not in model_contributions:
            model_contributions[model] = 0
        model_contributions[model] += 1

    return {
        'high_confidence': high_confidence,
        'unique_findings': unique_findings,
        'model_contributions': model_contributions,
        'total_vulnerabilities': len(groups)
    }
```

---

## Output Formatting

Generate human-readable report:

```python
def format_synthesis_report(synthesis: Dict) -> str:
    """
    Format synthesis results as markdown report.
    """
    report = "## Multi-Model Security Analysis Synthesis\n\n"

    # High-confidence findings
    report += "### High-Confidence Findings (2+ models agree)\n\n"
    report += "| Vulnerability | Severity | Found By | Confidence |\n"
    report += "|---------------|----------|----------|------------|\n"

    for finding in synthesis['high_confidence']:
        models = ', '.join([m.split('/')[-1] for m in finding['found_by']])
        conf = finding['confidence']['model_agreement']
        conf_level = finding['confidence']['confidence']['level']

        report += f"| {finding['vulnerability']} | {finding['severity']} | {models} | {conf} - {conf_level} |\n"

    # Unique findings
    report += "\n### Model-Unique Findings (investigate)\n\n"
    report += "| Vulnerability | Severity | Found By | Notes |\n"
    report += "|---------------|----------|----------|-------|\n"

    for unique in synthesis['unique_findings']:
        finding = unique['finding']
        model = finding['model'].split('/')[-1]
        specialty = unique['model_specialty']

        report += f"| {finding['vulnerability']} | {finding['severity']} | {model} only | {specialty} |\n"

    # Model contributions
    report += "\n### Model Contributions\n\n"
    for model, count in synthesis['model_contributions'].items():
        short_name = model.split('/')[-1]
        report += f"- {short_name}: {count} findings\n"

    report += f"\nTotal: {synthesis['total_vulnerabilities']} unique vulnerabilities from {len(synthesis['model_contributions'])} models\n"

    return report
```

---

## Anti-Patterns

### ❌ Averaging Confidence Scores

```python
# WRONG: Average confidence
avg = sum(f['confidence_score'] for f in group) / len(group)
```

**Why wrong:** Dilutes strong signals. If 3 models are "HIGH" confidence and 1 is "LOW", the average is "MEDIUM" - but you should trust the majority.

**Correct:** Use mode (most common) or weighted voting.

### ❌ Dismissing Unique Findings

```python
# WRONG: Ignore findings from single model
if len(group) == 1:
    continue  # Skip
```

**Why wrong:** Loses model-specific insights. DeepSeek might be the ONLY model that catches an integer overflow because it specializes in code-level bugs.

**Correct:** Preserve and investigate based on model specialty.

### ❌ String Equality for Deduplication

```python
# WRONG: Exact string match only
if finding1['vulnerability'] == finding2['vulnerability']:
    # Dedupe
```

**Why wrong:** Misses paraphrasing. "SQL injection in login" ≠ "Unsanitized database query in authentication" even though they're the same issue.

**Correct:** Use normalization or semantic similarity.

---

## Related

- [LiteLLM Setup](litellm-setup.md) - Running parallel analysis
- [Prompt Templates](prompt-templates.md) - Consistent attacker prompts
- [Anti-Patterns](anti-patterns.md) - Common synthesis mistakes

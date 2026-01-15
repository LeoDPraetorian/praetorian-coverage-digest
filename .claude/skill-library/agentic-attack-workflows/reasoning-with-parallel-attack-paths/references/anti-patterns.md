# Anti-Patterns

**Common mistakes when using parallel LLM analysis and how to avoid them.**

---

## Execution Anti-Patterns

### ❌ Different Prompts Per Model

**Mistake:**

```python
prompts = {
    'claude': "You're an auth security expert. Find auth bugs in...",
    'gpt4': "You're a CVE researcher. Find known vulnerabilities in...",
    'gemini': "You're an architect. Find design flaws in...",
    'deepseek': "You're a code reviewer. Find implementation bugs in...",
}

for model, prompt in prompts.items():
    response = await acompletion(model=model, messages=[{'role': 'user', 'content': prompt}])
```

**Why it fails:**
- You're telling models what to find (confirmation bias)
- Defeats emergent diversity from model architecture
- Creates artificial specialization that may miss cross-domain issues

**Correct approach:**

```python
# Same prompt for ALL models
prompt = "You are a security researcher. Analyze this system for vulnerabilities..."

for model in MODELS:
    response = await acompletion(model=model, messages=[{'role': 'user', 'content': prompt}])
```

**Key insight:** Diversity comes from MODEL DIFFERENCES, not prompt differences.

---

### ❌ Sequential Execution

**Mistake:**

```python
results = []
for model in MODELS:
    response = await acompletion(model=model, ...)  # Waits for each to complete
    results.append(response)
```

**Why it fails:**
- 4x latency (4 models × 30s each = 120s total)
- No parallel benefit
- Wastes time

**Correct approach:**

```python
tasks = [acompletion(model=m, ...) for m in MODELS]
results = await asyncio.gather(*tasks, return_exceptions=True)  # All at once
```

**Performance:**
- Sequential: 4 × 30s = 120s
- Parallel: max(30s, 30s, 30s, 30s) = 30s

---

### ❌ Skipping Synthesis

**Mistake:**

```python
# Just concatenate all outputs
report = ""
for result in results:
    report += result.choices[0].message.content + "\n\n"

print(report)  # No deduplication, no confidence scoring
```

**Why it fails:**
- User sees duplicate findings (same SQLi reported 4 times with different wording)
- No confidence calibration (can't tell if 1 model or 4 models found it)
- Overwhelms with raw data instead of synthesized insights

**Correct approach:**

```python
# Deduplicate, cross-reference, score confidence
synthesis = synthesize_findings(results)

report = format_synthesis_report(synthesis)  # Organized by confidence level
```

---

## Synthesis Anti-Patterns

### ❌ Dismissing 1/4 Findings

**Mistake:**

```python
# Ignore findings from single model
for group in groups:
    if len(group) < 2:
        continue  # Skip unique findings
```

**Why it fails:**
- Loses model-specific insights (DeepSeek's code-level bugs, Claude's auth edge cases)
- Assumes only consensus matters (but unique findings can be valid)
- Misses specialized vulnerabilities

**Correct approach:**

```python
for group in groups:
    if len(group) >= 2:
        high_confidence.append(group)
    else:
        # Investigate based on model specialty
        unique = analyze_unique_finding(group[0])
        unique_findings.append(unique)
```

**Example:** DeepSeek alone finds integer overflow in payment calculation → Investigate (code-level is DeepSeek's specialty).

---

### ❌ Averaging Severity

**Mistake:**

```python
# Average severity scores
severities = {'Claude': 9.0, 'GPT-4': 8.5, 'Gemini': 7.0, 'DeepSeek': 9.5}
avg = sum(severities.values()) / len(severities)  # 8.5
```

**Why it fails:**
- Hides worst-case risk (one model rates CRITICAL, others HIGH → avg is HIGH)
- Security decisions should be risk-averse (assume worst case)
- Dilutes strong signals

**Correct approach:**

```python
# Use MAXIMUM severity
severity = max(severities.values())  # 9.5 (CRITICAL)
```

**Rationale:** If even ONE model thinks it's critical, treat it as critical until proven otherwise.

---

### ❌ String Equality Deduplication

**Mistake:**

```python
# Exact string matching
seen = set()
unique = []

for finding in findings:
    if finding['vulnerability'] not in seen:
        seen.add(finding['vulnerability'])
        unique.append(finding)
```

**Why it fails:**
- Misses paraphrasing:
  - "SQL injection in login" ≠ "Unsanitized database query in authentication"
  - "XSS in search" ≠ "Cross-site scripting in query parameter"
- Results in false duplicates

**Correct approach:**

```python
# Use normalization or semantic similarity
def normalize(text):
    text = text.lower()
    text = text.replace('sql injection', 'sqli')
    text = text.replace('cross-site scripting', 'xss')
    return text

# Or use semantic embeddings
embeddings = model.encode([f['vulnerability'] for f in findings])
groups = cluster_by_similarity(embeddings, threshold=0.75)
```

---

## Prompt Anti-Patterns

### ❌ Leading Questions

**Mistake:**

```
Analyze this JWT implementation. Check for:
1. Missing expiration claims
2. Weak HMAC secrets
3. Algorithm confusion attacks
```

**Why it fails:**
- Confirms your hypothesis instead of discovering issues
- Misses vulnerabilities you didn't think to list
- Reduces model creativity

**Correct approach:**

```
Analyze this JWT implementation for security vulnerabilities.
Your goal is to find exploitable flaws.
```

**Let models discover issues independently.**

---

### ❌ Overly Prescriptive Output Format

**Mistake:**

```
Return ONLY valid JSON in this exact format, no other text:
{
  "vulnerability_id": "string",
  "cvss_score": 0.0,
  "cwe_id": "CWE-000",
  ...
}
```

**Why it fails:**
- Constrains model analysis to rigid schema
- Discourages narrative explanation (which provides context)
- May miss nuanced findings that don't fit schema

**Correct approach:**

```
For each vulnerability provide:
1. Vulnerability name and type
2. Attack vector (step-by-step)
3. Severity (Critical/High/Medium/Low)
4. Confidence level

Use clear formatting but explain your reasoning.
```

**Allow structured but flexible output.**

---

## Configuration Anti-Patterns

### ❌ Insufficient Timeout

**Mistake:**

```python
response = await acompletion(
    model=model,
    messages=[...],
    timeout=30  # Too short for complex analysis
)
```

**Why it fails:**
- Complex threat analysis takes time (60-120s)
- Timeouts interrupt mid-analysis
- Lose valuable findings

**Correct approach:**

```python
response = await acompletion(
    model=model,
    messages=[...],
    timeout=120  # 2 minutes for thorough analysis
)
```

---

### ❌ No Error Handling

**Mistake:**

```python
tasks = [acompletion(model=m, ...) for m in MODELS]
results = await asyncio.gather(*tasks)  # Fails if any model errors
```

**Why it fails:**
- One API error (rate limit, timeout) kills entire analysis
- Lose results from successful models
- No visibility into which model failed

**Correct approach:**

```python
tasks = [acompletion(model=m, ...) for m in MODELS]
results = await asyncio.gather(*tasks, return_exceptions=True)

successful = []
failed = []

for i, result in enumerate(results):
    if isinstance(result, Exception):
        failed.append({'model': MODELS[i], 'error': str(result)})
    else:
        successful.append(result)
```

---

## Cost Anti-Patterns

### ❌ Using Most Expensive Models for Simple Tasks

**Mistake:**

```python
# Use Claude Opus 4 for all analysis
MODELS = ['anthropic/claude-opus-4-20241120'] * 4
```

**Why it fails:**
- Unnecessary cost ($15/M tokens × 4 models = $60/M tokens)
- Overkill for simple checks
- Same results as cheaper models for straightforward issues

**Correct approach:**

```python
# Mix models by cost/capability
MODELS = [
    'anthropic/claude-sonnet-4-20250514',  # $3/M - good reasoning
    'openai/gpt-4-turbo',                   # $10/M - CVE knowledge
    'vertex_ai/gemini-1.5-pro',             # $1.25/M - architecture
    'deepseek/deepseek-chat',               # $0.14/M - code analysis
]
```

---

### ❌ No Output Token Limit

**Mistake:**

```python
response = await acompletion(
    model=model,
    messages=[...],
    # No max_tokens set - model can generate indefinitely
)
```

**Why it fails:**
- Output tokens cost 3-5x more than input tokens
- Verbose responses waste money
- No guarantee of conciseness

**Correct approach:**

```python
response = await acompletion(
    model=model,
    messages=[...],
    max_tokens=2000  # Cap output length
)
```

---

## Reporting Anti-Patterns

### ❌ Raw Output Dump

**Mistake:**

```markdown
## Findings

Claude says:
[entire Claude response]

GPT-4 says:
[entire GPT-4 response]

Gemini says:
[entire Gemini response]

DeepSeek says:
[entire DeepSeek response]
```

**Why it fails:**
- User sees 4x duplicate findings
- No synthesis or confidence scoring
- Overwhelming amount of text
- Can't tell which findings are most important

**Correct approach:**

```markdown
## High-Confidence Findings (3-4 models agree)
| Vulnerability | Severity | Confidence |
|---------------|----------|------------|
| SQLi in /api/login | CRITICAL | 4/4 models |

## Medium-Confidence Findings (2 models agree)
...

## Model-Unique Findings (investigate)
...
```

---

### ❌ Ignoring Model Specialty Context

**Mistake:**

```markdown
## Findings

1. Integer overflow in payment calculation (found by DeepSeek)
   Status: ❌ Low confidence, only 1 model found it
```

**Why it fails:**
- DeepSeek specializes in code-level bugs
- Dismisses finding due to low model count
- Ignores that this aligns with model's strength

**Correct approach:**

```markdown
## Model-Unique Findings

1. Integer overflow in payment calculation (found by DeepSeek)
   Status: ⚠️ INVESTIGATE - DeepSeek specialty (code-level bugs)
   Recommendation: Code review payment logic for arithmetic flaws
```

---

## Related

- [Synthesis Patterns](synthesis-patterns.md) - Correct deduplication and cross-referencing
- [Prompt Templates](prompt-templates.md) - Well-designed attacker prompts
- [LiteLLM Setup](litellm-setup.md) - Proper async configuration and error handling

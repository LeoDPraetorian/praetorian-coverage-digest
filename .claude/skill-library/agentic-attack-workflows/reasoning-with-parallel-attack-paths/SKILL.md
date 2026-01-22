---
name: reasoning-with-parallel-attack-paths
description: Use when orchestrators need diverse security analysis by running the SAME attacker prompt across MULTIPLE LLMs (Claude, GPT-4, Gemini, DeepSeek) in parallel using LiteLLM
allowed-tools: Read, Bash, TodoWrite, AskUserQuestion, Task
---

# Reasoning with Parallel Attack Paths

**Achieve diverse security vulnerability analysis through model architecture differences, not prompt differences.**

## Core Principle

**Diversity comes from MODEL DIFFERENCES, not prompt differences.**

All models receive the IDENTICAL attacker-focused prompt. Each model's unique architecture, training data, and reasoning patterns naturally produce different attack vectors.

**Inspired by ParaThinker Research** (arxiv:2509.04475):

- Tunnel vision occurs when early mistakes propagate through sequential reasoning
- Parallel width beats sequential depth for complex reasoning
- Isolated paths prevent error contamination

**Our adaptation:** ParaThinker trains models for internal parallelism. We achieve similar emergent diversity by using multiple DIFFERENT models externally via LiteLLM.

---

## When to Use

Use for security analysis where:

- Multiple perspectives help (different models find different vulnerabilities)
- Blind spot coverage matters (any single model has gaps)
- Thoroughness over speed (can afford 4 parallel API calls)
- Authorized penetration testing context

**Do NOT use for:**

- Non-security tasks
- Time-critical decisions (4x API latency cost)
- Simple code reviews
- Unauthorized security assessment

---

## Quick Reference

| Model    | Same Attacker Prompt | Natural Strength                                |
| -------- | -------------------- | ----------------------------------------------- |
| Claude   | Attacker mindset     | Auth edge cases, safety implications, behaviors |
| GPT-4    | Attacker mindset     | Known CVE patterns, injection vectors, vulns    |
| Gemini   | Attacker mindset     | API design flaws, architecture weaknesses       |
| DeepSeek | Attacker mindset     | Implementation bugs, logic errors, code-level   |

**Cross-Reference Confidence Matrix:**

| Models Agreeing | Confidence  | Action                               |
| --------------- | ----------- | ------------------------------------ |
| 4/4             | CRITICAL    | Definitely exploitable - prioritize  |
| 3/4             | HIGH        | Very likely exploitable - verify     |
| 2/4             | MEDIUM-HIGH | Likely real - needs verification     |
| 1/4             | MEDIUM      | Investigate based on model specialty |

---

## Workflow

### Phase 1: Setup LiteLLM Environment

**Prerequisites:**

- LiteLLM installed (`pip install litellm`)
- API keys configured for: Anthropic, OpenAI, Google Cloud, DeepSeek

See [references/litellm-setup.md](references/litellm-setup.md) for complete configuration.

### Phase 2: Define Attack Target

Prepare the system/component description for analysis:

```python
target = """
[Component description, architecture, data flows, trust boundaries]
"""
```

**Critical:** Provide sufficient context for models to understand the attack surface.

### Phase 3: Execute Parallel Analysis

Run the SAME attacker prompt across ALL models:

```python
import asyncio
from litellm import acompletion

MODELS = [
    'anthropic/claude-sonnet-4-20250514',
    'openai/gpt-4-turbo',
    'vertex_ai/gemini-1.5-pro',
    'deepseek/deepseek-chat',
]

async def parallel_attack_analysis(target: str) -> list:
    prompt = f'''You are a security researcher performing authorized penetration testing.

Analyze this system for vulnerabilities. Your goal is to find security flaws that could be exploited.

TARGET:
{target}

Provide:
1. Vulnerabilities found (specific, exploitable)
2. Attack vectors (how to exploit each)
3. Severity (Critical/High/Medium/Low)
4. Confidence level (High/Medium/Low)
5. What would make this unexploitable?
'''
    tasks = [acompletion(model=m, messages=[{'role': 'user', 'content': prompt}]) for m in MODELS]
    return await asyncio.gather(*tasks, return_exceptions=True)
```

**See:** [references/prompt-templates.md](references/prompt-templates.md) for domain-specific attacker templates.

### Phase 4: Synthesis Protocol

Aggregate findings from all models:

**Step 4.1: Parse Raw Outputs**

Extract vulnerabilities, severity, confidence from each model's response.

**Step 4.2: Deduplicate**

Identify the same vulnerability described differently by models. See [references/synthesis-patterns.md](references/synthesis-patterns.md).

**Step 4.3: Cross-Reference**

Build confidence matrix based on model agreement:

- Count how many models found each vulnerability
- Apply confidence scoring from Quick Reference table

**Step 4.4: Preserve Unique Findings**

Don't dismiss 1/4 findings - they may represent model-specific insights:

- DeepSeek finding alone → investigate code-level implementation
- Claude finding alone → investigate auth/safety edge case
- GPT-4 finding alone → check against CVE database
- Gemini finding alone → review architecture patterns

**Step 4.5: Use Max Severity**

When models disagree on severity, use the HIGHEST severity rating.

### Phase 5: Generate Report

See [Example Output Structure](#example-output-structure) below.

---

## Key Synthesis Rules

1. **Deduplicate** - Same vulnerability described differently by models
2. **Cross-reference** - Agreement increases confidence
3. **Preserve unique findings** - 1/4 findings from specialist models are often valid
4. **Use max severity** - When models disagree, use highest severity

---

## Example Output Structure

```markdown
## Multi-Model Security Analysis Synthesis

### High-Confidence Findings (2+ models agree)

| Vulnerability      | Severity | Found By              | Confidence |
| ------------------ | -------- | --------------------- | ---------- |
| SQLi in /api/login | CRITICAL | Claude, GPT, DeepSeek | 3/4 - HIGH |

### Model-Unique Findings (investigate)

| Vulnerability    | Severity | Found By      | Notes                |
| ---------------- | -------- | ------------- | -------------------- |
| Integer overflow | HIGH     | DeepSeek only | Code-level specialty |

### Model Contributions

- Claude: 3 findings (auth edge cases)
- GPT-4: 3 findings (CVE patterns)
- Gemini: 3 findings (architecture gaps)
- DeepSeek: 3 findings (implementation bugs)

Total: 9 unique vulnerabilities from 4 models
```

---

## Anti-Patterns

| Anti-Pattern                | Why It Fails                  | Correct Approach         |
| --------------------------- | ----------------------------- | ------------------------ |
| Different prompts per model | Defeats model diversity       | Same attacker prompt     |
| Skipping synthesis          | Misses cross-reference value  | Always aggregate/dedupe  |
| Dismissing 1/4 findings     | Loses model-specific insights | Investigate by specialty |
| Sequential execution        | Wastes time                   | Use asyncio.gather()     |
| Averaging severity          | Hides worst-case risk         | Use maximum severity     |

See [references/anti-patterns.md](references/anti-patterns.md) for detailed examples.

---

## Key Insights

1. **Same prompt, different models** = emergent diversity without orchestrator bias
2. **Cross-reference builds confidence** = 3/4 agreement means high exploitability
3. **Unique findings have value** = each model's blind spots are different
4. **Parallel execution essential** = asyncio.gather() for efficiency
5. **Synthesis mandatory** = raw outputs need aggregation and deduplication

---

## Integration

### Called By

- `threat-modeling-orchestrator` - Phase 5 threat identification
- Security-focused orchestration skills requiring diverse attack perspectives

### Requires (invoke before starting)

| Skill                         | When | Purpose                 |
| ----------------------------- | ---- | ----------------------- |
| None - standalone methodology | -    | Can be invoked directly |

### Calls (during execution)

| Skill | Phase/Step | Purpose |
| ----- | ---------- | ------- |
| None  | -          | -       |

### Pairs With (conditional)

| Skill                         | Trigger                    | Purpose                    |
| ----------------------------- | -------------------------- | -------------------------- |
| `verifying-before-completion` | Before reporting findings  | Verify all findings tested |
| `debugging-systematically`    | When results are ambiguous | Investigate discrepancies  |

---

## Related Skills

- `verifying-before-completion` - Verify findings before reporting
- `debugging-systematically` - Investigate ambiguous results
- `threat-modeling-orchestrator` - Orchestrates full threat modeling workflow
- `security-test-planning` - Generate test plans from threat analysis

---

## Reference Files

**See these files for detailed implementation guidance:**

- [references/litellm-setup.md](references/litellm-setup.md) - API key configuration, model identifiers, async patterns
- [references/synthesis-patterns.md](references/synthesis-patterns.md) - Deduplication algorithms, cross-reference logic, severity resolution
- [references/prompt-templates.md](references/prompt-templates.md) - Domain-specific attacker templates (auth, API, cloud, infrastructure)
- [references/anti-patterns.md](references/anti-patterns.md) - Common mistakes and fixes

**Examples:**

- [examples/security-analysis.md](examples/security-analysis.md) - Complete JWT auth analysis walkthrough with 4 models

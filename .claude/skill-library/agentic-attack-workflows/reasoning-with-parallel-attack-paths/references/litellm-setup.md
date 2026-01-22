# LiteLLM Setup Guide

**Complete configuration for running parallel LLM analysis with LiteLLM.**

---

## Installation

```bash
pip install litellm
```

**Version requirements:**

- Python 3.8+
- litellm >= 1.0.0

---

## API Key Configuration

LiteLLM requires API keys for each model provider. Configure via environment variables:

### Anthropic (Claude)

```bash
export ANTHROPIC_API_KEY="sk-ant-..."
```

**Get key:** https://console.anthropic.com/settings/keys

### OpenAI (GPT-4)

```bash
export OPENAI_API_KEY="sk-..."
```

**Get key:** https://platform.openai.com/api-keys

### Google Cloud (Gemini)

```bash
export GOOGLE_APPLICATION_CREDENTIALS="/path/to/service-account-key.json"
```

**Setup:**

1. Create service account in Google Cloud Console
2. Enable Vertex AI API
3. Grant "Vertex AI User" role
4. Download JSON key file

### DeepSeek

```bash
export DEEPSEEK_API_KEY="sk-..."
```

**Get key:** https://platform.deepseek.com/api_keys

---

## Model Identifiers

LiteLLM uses provider-prefixed model identifiers:

| Provider  | Model Identifier                     | Context Window | Cost (per 1M tokens) |
| --------- | ------------------------------------ | -------------- | -------------------- |
| Anthropic | `anthropic/claude-sonnet-4-20250514` | 200K           | $3.00 / $15.00       |
| OpenAI    | `openai/gpt-4-turbo`                 | 128K           | $10.00 / $30.00      |
| Google    | `vertex_ai/gemini-1.5-pro`           | 1M             | $1.25 / $5.00        |
| DeepSeek  | `deepseek/deepseek-chat`             | 64K            | $0.14 / $0.28        |

**Note:** Costs shown as input / output per 1M tokens. Actual pricing may vary.

---

## Async Patterns

LiteLLM supports async API calls via `acompletion()`:

### Basic Async Call

```python
import asyncio
from litellm import acompletion

async def single_analysis():
    response = await acompletion(
        model="anthropic/claude-sonnet-4-20250514",
        messages=[{"role": "user", "content": "Analyze this..."}]
    )
    return response
```

### Parallel Async Calls

```python
async def parallel_analysis():
    models = [
        'anthropic/claude-sonnet-4-20250514',
        'openai/gpt-4-turbo',
        'vertex_ai/gemini-1.5-pro',
        'deepseek/deepseek-chat',
    ]

    tasks = [
        acompletion(
            model=m,
            messages=[{"role": "user", "content": "Analyze this..."}]
        ) for m in models
    ]

    # Run all models in parallel
    results = await asyncio.gather(*tasks, return_exceptions=True)
    return results
```

**Key points:**

- Use `asyncio.gather()` for parallel execution
- Set `return_exceptions=True` to handle failures gracefully
- Models run concurrently, not sequentially

---

## Error Handling

Handle API errors and rate limits:

```python
async def robust_parallel_analysis():
    results = await asyncio.gather(*tasks, return_exceptions=True)

    successful = []
    failed = []

    for i, result in enumerate(results):
        if isinstance(result, Exception):
            failed.append({
                'model': models[i],
                'error': str(result)
            })
        else:
            successful.append({
                'model': models[i],
                'response': result
            })

    return successful, failed
```

**Common errors:**

- `RateLimitError` - Too many requests, implement backoff
- `AuthenticationError` - Invalid API key
- `TimeoutError` - Increase timeout parameter
- `InvalidRequestError` - Check message format

---

## Rate Limiting and Retries

Configure retry behavior:

```python
from litellm import acompletion

response = await acompletion(
    model="anthropic/claude-sonnet-4-20250514",
    messages=[...],
    max_retries=3,           # Retry failed requests
    timeout=120,             # Timeout in seconds
    num_retries=3,           # Number of retry attempts
    retry_delay=5            # Delay between retries (seconds)
)
```

**Best practices:**

- Set reasonable timeouts (60-120s for complex analysis)
- Use exponential backoff for retries
- Monitor rate limit headers in responses

---

## Cost Optimization

**Strategies to reduce API costs:**

1. **Use appropriate models per task**
   - Simple tasks: Use DeepSeek (cheapest)
   - Complex reasoning: Use Claude/GPT-4

2. **Cache repeated prompts**
   - Store analysis results for identical targets
   - Reuse findings across sessions

3. **Parallel instead of sequential**
   - 4 parallel calls ≈ same time as 1 call
   - Total cost = sum of all calls
   - But saves 3x wall-clock time

4. **Set output token limits**
   ```python
   response = await acompletion(
       model=...,
       messages=[...],
       max_tokens=2000  # Limit response length
   )
   ```

---

## Testing Configuration

Verify your setup before running analysis:

```python
import asyncio
from litellm import acompletion

async def test_setup():
    models = [
        'anthropic/claude-sonnet-4-20250514',
        'openai/gpt-4-turbo',
        'vertex_ai/gemini-1.5-pro',
        'deepseek/deepseek-chat',
    ]

    test_prompt = "Return 'OK' if you receive this message."

    for model in models:
        try:
            response = await acompletion(
                model=model,
                messages=[{"role": "user", "content": test_prompt}],
                max_tokens=10
            )
            print(f"✅ {model}: {response.choices[0].message.content}")
        except Exception as e:
            print(f"❌ {model}: {e}")

# Run test
asyncio.run(test_setup())
```

**Expected output:**

```
✅ anthropic/claude-sonnet-4-20250514: OK
✅ openai/gpt-4-turbo: OK
✅ vertex_ai/gemini-1.5-pro: OK
✅ deepseek/deepseek-chat: OK
```

---

## Environment File Template

Create `.env` file for API keys:

```bash
# .env file
ANTHROPIC_API_KEY=sk-ant-...
OPENAI_API_KEY=sk-...
GOOGLE_APPLICATION_CREDENTIALS=/path/to/google-key.json
DEEPSEEK_API_KEY=sk-...
```

Load in Python:

```python
from dotenv import load_dotenv
load_dotenv()

# API keys now available via environment variables
```

**⚠️ Security:** Never commit `.env` to version control. Add to `.gitignore`.

---

## Troubleshooting

### "Authentication failed"

**Solution:** Verify API keys are set correctly:

```bash
echo $ANTHROPIC_API_KEY
echo $OPENAI_API_KEY
```

### "Model not found"

**Solution:** Check model identifier spelling. Use exact strings from Model Identifiers table above.

### "Rate limit exceeded"

**Solution:** Implement exponential backoff:

```python
import time

for attempt in range(3):
    try:
        response = await acompletion(...)
        break
    except RateLimitError:
        wait_time = 2 ** attempt  # 1s, 2s, 4s
        time.sleep(wait_time)
```

### "Timeout"

**Solution:** Increase timeout parameter:

```python
response = await acompletion(
    ...,
    timeout=180  # 3 minutes
)
```

---

## Related

- [Synthesis Patterns](synthesis-patterns.md) - Processing LiteLLM responses
- [Prompt Templates](prompt-templates.md) - Attacker prompts for different domains

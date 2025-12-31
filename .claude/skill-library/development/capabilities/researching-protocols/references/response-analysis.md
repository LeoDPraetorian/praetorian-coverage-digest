# Response Analysis

Techniques for identifying unique markers in service responses.

## JSON Marker Identification

### Unique Field Detection

Look for fields that appear in only one service:

```json
// Ollama-specific
{"models": [...], "digest": "sha256:..."}

// vLLM-specific
{"version": "0.4.0"}  // at /version endpoint

// OpenAI-specific
{"object": "list", "data": [...]}
{"system_fingerprint": "fp_..."}

// Anthropic-specific
{"type": "message", "stop_reason": "end_turn"}
```

### Field Presence Matrix

| Field              | Ollama | vLLM | LocalAI | OpenAI |
| ------------------ | ------ | ---- | ------- | ------ |
| `models`           | Yes    | No   | No      | No     |
| `version`          | Yes    | Yes  | No      | No     |
| `object`           | No     | Yes  | Yes     | Yes    |
| `owned_by`         | No     | "vllm" | varies | "openai" |
| `system_fingerprint` | No   | No   | No      | Yes    |

### Field Value Patterns

Beyond presence, check field values:

```go
// owned_by field distinguishes OpenAI-compatible servers
if ownedBy == "vllm" {
    return ServiceVLLM
} else if ownedBy == "openai" {
    return ServiceOpenAI
}
```

## Header Analysis

### Service-Specific Headers

| Service   | Header                    | Example Value           |
| --------- | ------------------------- | ----------------------- |
| OpenAI    | `openai-organization`     | `org-xxx`               |
| OpenAI    | `openai-processing-ms`    | `1234`                  |
| Anthropic | `anthropic-ratelimit-*`   | Rate limit info         |
| Ollama    | (none specific)           | Standard HTTP           |

### Content-Type Patterns

| Pattern                     | Service Type        |
| --------------------------- | ------------------- |
| `application/json`          | Standard REST API   |
| `application/x-ndjson`      | Ollama streaming    |
| `text/event-stream`         | SSE (most LLMs)     |
| `text/plain`                | Banner/simple APIs  |

## Banner Detection

### Text Banner Patterns

```bash
# Exact match
"Ollama is running"
"LocalAI API is running"

# Pattern match
/^Redis server v[\d.]+/
/^SSH-[\d.]+-OpenSSH/
```

### JSON Banner Patterns

```json
// Structured banners
{"message": "LocalAI API is running"}
{"status": "healthy", "service": "..."}
```

## Error Response Analysis

Errors are also fingerprints:

### Error Format Comparison

| Service   | Error Structure                              |
| --------- | -------------------------------------------- |
| OpenAI    | `{"error": {"message": "...", "type": "...", "code": "..."}}` |
| Anthropic | `{"type": "error", "error": {"type": "...", "message": "..."}}` |
| Ollama    | `{"error": "..."}` (simple string)           |

### HTTP Status Patterns

| Status | OpenAI              | Anthropic          | Ollama         |
| ------ | ------------------- | ------------------ | -------------- |
| 401    | `invalid_api_key`   | `authentication_error` | (no auth)   |
| 429    | `rate_limit_exceeded` | Rate limit headers | (no limits)  |
| 404    | `model_not_found`   | `not_found_error`  | `model not found` |

## Version Extraction Patterns

### JSON Path Patterns

```bash
# Direct field
$.version                    # {"version": "1.0.0"}

# Nested field
$.data[0].version           # {"data": [{"version": "1.0.0"}]}

# Server info
$.server.version            # {"server": {"version": "1.0.0"}}
```

### Regex Extraction

```go
// From banner
re := regexp.MustCompile(`v([\d.]+)`)
version := re.FindStringSubmatch(banner)[1]

// From header
version := resp.Header.Get("X-Version")
```

## Confidence Scoring

Rate detection confidence:

| Confidence | Criteria                                    |
| ---------- | ------------------------------------------- |
| **High**   | Service-specific endpoint + unique field    |
| **Medium** | Unique field OR service-specific endpoint   |
| **Low**    | Banner match only OR port-based             |

Example:
- Ollama `/api/tags` with `models` array = HIGH
- Port 11434 with generic HTTP = LOW

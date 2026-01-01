# perplexity_ask - Schema Discovery

**Description:** Engages in a conversation using the Sonar API. Accepts an array of messages (each with a role and content) and returns a chat completion response from the Perplexity model.

**Discovery Date:** 2025-12-31T01:21:16.603Z

---

## Input Schema

```json
{
  "type": "object",
  "properties": {
    "messages": {
      "type": "array",
      "items": {
        "type": "object",
        "properties": {
          "role": {
            "type": "string",
            "description": "Role of the message (e.g., system, user, assistant)"
          },
          "content": {
            "type": "string",
            "description": "The content of the message"
          }
        },
        "required": [
          "role",
          "content"
        ],
        "additionalProperties": false
      },
      "description": "Array of conversation messages"
    }
  },
  "required": [
    "messages"
  ],
  "additionalProperties": false,
  "$schema": "http://json-schema.org/draft-07/schema#"
}
```

## Test Cases

### Test Case 1: General question

**Input:**
```json
{
  "messages": [
    {
      "role": "user",
      "content": "What is the capital of France?"
    }
  ]
}
```

**Error:** Unexpected token '*', "**The capi"... is not valid JSON

### Test Case 2: Technical question

**Input:**
```json
{
  "messages": [
    {
      "role": "user",
      "content": "How does TypeScript type inference work?"
    }
  ]
}
```

**Error:** Unexpected token '*', "**TypeScri"... is not valid JSON

### Test Case 3: Multi-turn conversation

**Input:**
```json
{
  "messages": [
    {
      "role": "user",
      "content": "What are REST APIs?"
    },
    {
      "role": "assistant",
      "content": "REST APIs are..."
    },
    {
      "role": "user",
      "content": "How do they compare to GraphQL?"
    }
  ]
}
```

**Error:** Unexpected token '*', "**REST API"... is not valid JSON

## Token Reduction Strategy

Based on the test results above:

1. **Essential Fields:** Identify which fields are critical for Claude's usage
2. **Token Budget:** Aim for 80% reduction in response size
3. **Filtering Strategy:**
   - Keep: Core data fields required for decision-making
   - Truncate: Long text fields (descriptions, content) to first 500-1000 chars
   - Remove: Metadata, timestamps, internal IDs unless needed
   - Conditionally include: Optional fields only when present and valuable

**Target:** Original response ~5000 tokens → Filtered ~1000 tokens (80% reduction)

## Security Considerations

### Input Validation

- **Control characters:** Reject null bytes, escape sequences
- **Path traversal:** Validate no ../ patterns in inputs
- **Command injection:** Sanitize shell metacharacters
- **SQL injection:** Escape quotes and special characters (if applicable)
- **XSS:** Sanitize HTML/script tags in query strings

### API Security

- **API key exposure:** Never log or return API keys in responses
- **Rate limiting:** Consider implementing rate limits to prevent abuse
- **Timeout:** Use 30-second timeout to prevent hanging requests
- **Error messages:** Don't leak sensitive information in error responses

### Data Privacy

- **PII handling:** Be cautious with personal information in queries/responses
- **Audit logging:** Consider logging requests for security monitoring (if enabled)

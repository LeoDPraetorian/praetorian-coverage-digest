# perplexity_reason - Schema Discovery

**Description:** Performs reasoning tasks using the Perplexity API. Accepts an array of messages (each with a role and content) and returns a well-reasoned response using the sonar-reasoning-pro model.

**Discovery Date:** 2025-12-31T01:24:27.926Z

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
    },
    "strip_thinking": {
      "type": "boolean",
      "description": "If true, removes <think>...</think> tags and their content from the response to save context tokens. Default is false."
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

### Test Case 1: Logical problem

**Input:**
```json
{
  "messages": [
    {
      "role": "user",
      "content": "If all cats are animals, and some animals are pets, what can we conclude?"
    }
  ]
}
```

**Error:** Unexpected token '<', "<think>
Th"... is not valid JSON

### Test Case 2: Mathematical reasoning with strip_thinking

**Input:**
```json
{
  "messages": [
    {
      "role": "user",
      "content": "Explain why the sum of angles in a triangle is 180 degrees"
    }
  ],
  "strip_thinking": true
}
```

**Error:** Unexpected token 'T', "The sum of"... is not valid JSON

### Test Case 3: Decision analysis

**Input:**
```json
{
  "messages": [
    {
      "role": "user",
      "content": "What factors should be considered when choosing between microservices and monolithic architecture?"
    }
  ],
  "strip_thinking": false
}
```

**Error:** Unexpected token '<', "<think>
Th"... is not valid JSON

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

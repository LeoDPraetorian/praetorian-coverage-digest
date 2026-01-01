# perplexity_search - Schema Discovery

**Description:** Performs web search using the Perplexity Search API. Returns ranked search results with titles, URLs, snippets, and metadata. Perfect for finding up-to-date facts, news, or specific information.

**Discovery Date:** 2025-12-31T01:24:51.442Z

---

## Input Schema

```json
{
  "type": "object",
  "properties": {
    "query": {
      "type": "string",
      "description": "Search query string"
    },
    "max_results": {
      "type": "number",
      "minimum": 1,
      "maximum": 20,
      "description": "Maximum number of results to return (1-20, default: 10)"
    },
    "max_tokens_per_page": {
      "type": "number",
      "minimum": 256,
      "maximum": 2048,
      "description": "Maximum tokens to extract per webpage (default: 1024)"
    },
    "country": {
      "type": "string",
      "description": "ISO 3166-1 alpha-2 country code for regional results (e.g., 'US', 'GB')"
    }
  },
  "required": [
    "query"
  ],
  "additionalProperties": false,
  "$schema": "http://json-schema.org/draft-07/schema#"
}
```

## Test Cases

### Test Case 1: Simple search query

**Input:**
```json
{
  "query": "What is Model Context Protocol?"
}
```

**Error:** Unexpected token 'F', "Found 10 s"... is not valid JSON

### Test Case 2: Technical search with options

**Input:**
```json
{
  "query": "TypeScript async/await best practices 2025",
  "max_results": 5
}
```

**Error:** Unexpected token 'F', "Found 5 se"... is not valid JSON

### Test Case 3: Search with country filter

**Input:**
```json
{
  "query": "AI news December 2025",
  "max_results": 10,
  "country": "US"
}
```

**Error:** Unexpected token 'F', "Found 10 s"... is not valid JSON

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

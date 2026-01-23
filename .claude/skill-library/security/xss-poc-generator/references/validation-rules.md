# Validation Rules

Input validation and common pitfalls when generating XSS action payloads.

## Token Extraction Validation

### Meta Tag Validation

**Correct selector syntax:**
```javascript
// ✅ Correct
document.querySelector('meta[name="csrf-token"]')
document.querySelector('meta[name="csrf-token"]').content
document.querySelector('meta[name="csrf-token"]')?.content  // With null safety

// ❌ Wrong
document.querySelector('meta[name=csrf-token]')  // Missing quotes
document.querySelector('meta[csrf-token]')  // Wrong attribute format
document.querySelector('meta.csrf-token')  // Class selector, not attribute
```

**Safe extraction pattern:**
```javascript
const metaTag = document.querySelector('meta[name="csrf-token"]');
const csrfToken = metaTag ? metaTag.content : null;
// OR
const csrfToken = document.querySelector('meta[name="csrf-token"]')?.content;
```

---

### Form Field Validation

**Common field name formats:**
```javascript
// Hidden inputs
'input[name="_token"]'           // Laravel
'input[name="csrfmiddlewaretoken"]'  // Django
'input[name="__RequestVerificationToken"]'  // ASP.NET
'input[name="authenticity_token"]'  // Rails
'input[name="_csrf"]'            // Express/csurf

// Type-specific (more precise)
'input[type="hidden"][name="_token"]'
```

**Watch for:**
- Multiple forms with different tokens - target the correct form
- Dynamic form loading - token may not exist on page load
- Token rotation - may change after certain actions

---

### Cookie Validation

**Cookie extraction patterns:**
```javascript
// ✅ Correct - handles URL encoding
function getCookie(name) {
  const match = document.cookie.match(new RegExp('(^| )' + name + '=([^;]+)'));
  return match ? decodeURIComponent(match[2]) : null;
}

// ⚠️ Risky - doesn't handle encoding
document.cookie.split(';').find(c => c.trim().startsWith('XSRF-TOKEN='))

// ❌ Wrong - HttpOnly cookies not accessible
document.cookie.match(/session_id=([^;]+)/)  // Session cookies are usually HttpOnly
```

**Important notes:**
- Laravel's `XSRF-TOKEN` is URL-encoded - must use `decodeURIComponent()`
- Django's `csrftoken` is plain text - no decoding needed
- HttpOnly cookies CANNOT be read via JavaScript (this is the whole point of HttpOnly)

---

### API Endpoint Validation

**Valid endpoint patterns:**
```javascript
// ✅ Relative URLs (recommended)
'/api/csrf'
'/api/csrf-token'
'/auth/csrf'

// ⚠️ Absolute same-origin (works but unnecessary)
'https://example.com/api/csrf'  // Only if same origin

// ❌ Cross-origin (will fail without CORS)
'https://different-domain.com/api/csrf'
```

---

## Request Structure Validation

### Content-Type Validation

**JSON requests:**
```javascript
// ✅ Correct
headers: {
  'Content-Type': 'application/json'
},
body: JSON.stringify({ key: 'value' })

// ❌ Wrong - body not stringified
headers: {
  'Content-Type': 'application/json'
},
body: { key: 'value' }  // Object, not string
```

**Form-urlencoded requests:**
```javascript
// ✅ Correct
headers: {
  'Content-Type': 'application/x-www-form-urlencoded'
},
body: new URLSearchParams({ key: 'value' })

// Also correct
body: 'key=value&other=data'

// ❌ Wrong - sending JSON with form content type
headers: {
  'Content-Type': 'application/x-www-form-urlencoded'
},
body: JSON.stringify({ key: 'value' })  // JSON body with wrong content type
```

---

### CSRF Header Names

**Framework-specific header names:**

| Framework | Expected Header | Common Mistake |
|-----------|-----------------|----------------|
| Rails | `X-CSRF-Token` | `X-CSRF-TOKEN` (case matters on some servers) |
| Django | `X-CSRFToken` | `X-CSRF-Token` (no hyphen before Token) |
| Angular | `X-XSRF-TOKEN` | `X-CSRF-Token` (different naming) |
| Laravel | `X-XSRF-TOKEN` | `X-CSRF-TOKEN` (XSRF not CSRF) |
| Spring | `X-XSRF-TOKEN` | Varies by configuration |
| Express/csurf | `CSRF-Token` or `X-CSRF-Token` | Configurable |

**Validation:**
```javascript
// Check response headers or inspect network tab to confirm expected header name
// Some frameworks are case-sensitive, some are not
```

---

## Common Pitfalls

### 1. Token Not Found

**Symptoms:** `Cannot read property 'content' of null`

**Causes:**
- Wrong selector
- Token loaded dynamically (not in initial HTML)
- Token in different location than expected

**Solution:**
```javascript
// Always use null-safe access
const csrfToken = document.querySelector('meta[name="csrf-token"]')?.content;
if (!csrfToken) {
  console.error('CSRF token not found');
  return;
}
```

---

### 2. Token Validation Failure (403/419)

**Symptoms:** Server returns 403 Forbidden or 419 (Laravel)

**Causes:**
- Wrong header name
- Token expired
- Token/session mismatch
- Token not properly decoded

**Solution:**
```javascript
// Check header name matches framework expectation
// Verify token is fresh (not cached)
// Ensure cookie extraction includes decodeURIComponent() if needed
```

---

### 3. CORS Errors

**Symptoms:** `Access-Control-Allow-Origin` error in console

**Causes:**
- Trying to fetch from different origin
- Missing credentials mode
- Preflight check failed

**Solution:**
```javascript
// For same-origin requests (most common)
credentials: 'same-origin'

// For cross-origin (rare, requires server CORS config)
credentials: 'include'
```

---

### 4. Cookie Not Accessible

**Symptoms:** Cookie extraction returns `null` for known cookie

**Causes:**
- Cookie is HttpOnly
- Cookie is on different domain/path
- Cookie has SameSite=Strict

**Verification:**
```javascript
// Check all accessible cookies
console.log(document.cookie);
// If cookie doesn't appear, it's HttpOnly or on different path
```

---

### 5. Wrong Content-Type for Backend

**Symptoms:** 400 Bad Request, empty body on server

**Causes:**
- Backend expects form data, payload sends JSON
- Backend expects JSON, payload sends form data
- Missing Content-Type header

**Detection:**
```javascript
// Check existing forms/API calls in the application
// Network tab shows what Content-Type the app normally uses
```

---

## Validation Checklist

Before generating payload, validate:

| Check | How to Verify |
|-------|--------------|
| Token exists | `document.querySelector('...')` in console |
| Token is fresh | Check if page has been cached |
| Header name correct | Network tab → existing requests → headers |
| Content-Type correct | Network tab → existing requests → Content-Type |
| Endpoint exists | Network tab → confirm endpoint path |
| Credentials mode | Same-origin for most cases |
| Cookie encoded | Check raw cookie value for `%` characters |

---

## Quick Debugging Commands

Run these in browser console to debug:

```javascript
// Check for meta tag token
document.querySelector('meta[name="csrf-token"]')?.content

// Check for form field token
document.querySelector('input[name="_token"]')?.value
document.querySelector('input[name="csrfmiddlewaretoken"]')?.value
document.querySelector('input[name="__RequestVerificationToken"]')?.value

// Check all cookies (non-HttpOnly only)
document.cookie

// Check specific cookie
document.cookie.match(/XSRF-TOKEN=([^;]+)/)

// Test selector
document.querySelectorAll('[name*="csrf"], [name*="token"]')
```

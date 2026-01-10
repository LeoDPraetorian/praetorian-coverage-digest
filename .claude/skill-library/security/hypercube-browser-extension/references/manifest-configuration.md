# Manifest Configuration & Templates

**Manifest V3 configuration patterns per pretext type with CSP and permission declarations.**

---

## Base Manifest Template

**Source**: `modules/hypercube-ng/extension/manifest.json`

```json
{
  "manifest_version": 3,
  "name": "YOUR_EXTENSION_NAME",
  "version": "0.1",
  "description": "Brief description that justifies permissions",
  "permissions": [
    "webRequest",
    "cookies",
    "storage",
    "declarativeNetRequest"
  ],
  "background": {
    "service_worker": "background.js"
  },
  "host_permissions": [
    "<all_urls>"
  ],
  "content_security_policy": {
    "extension_pages": "script-src 'self' 'wasm-unsafe-eval'; object-src 'self';"
  },
  "action": {
    "default_popup": "ui/popup.html",
    "default_icon": {
      "16": "ui/assets/icon16.png",
      "48": "ui/assets/icon48.png",
      "128": "ui/assets/icon128.png"
    }
  },
  "icons": {
    "16": "ui/assets/icon16.png",
    "48": "ui/assets/icon48.png",
    "128": "ui/assets/icon128.png"
  }
}
```

---

## Critical Configuration Elements

### 1. Content Security Policy (CSP)

**Required for WASM execution:**

```json
"content_security_policy": {
  "extension_pages": "script-src 'self' 'wasm-unsafe-eval'; object-src 'self';"
}
```

**Why `'wasm-unsafe-eval'` is needed:**
- Enables `WebAssembly.instantiate()` and `WebAssembly.instantiateStreaming()`
- Required for Go WASM execution in service worker
- Without this, WASM loading fails with CSP violation

**Alternative (if WASM not needed):**
```json
"content_security_policy": {
  "extension_pages": "script-src 'self'; object-src 'self';"
}
```

### 2. Permissions Array

**Standard hypercube-ng permission set:**

```json
"permissions": [
  "webRequest",           // Network traffic inspection
  "cookies",              // Cookie access and manipulation
  "storage",              // Persistent configuration
  "declarativeNetRequest" // Dynamic request modification
]
```

**Permission notes:**
- `webRequest` - Inspect but cannot block in Manifest V3 (use for logging)
- `declarativeNetRequest` - Can block/redirect requests (use for active blocking)
- `cookies` - Full read/write access to all cookies
- `storage` - `chrome.storage.local` unlimited storage

### 3. Host Permissions

**Universal access:**

```json
"host_permissions": ["<all_urls>"]
```

**Alternative (specific domains only):**

```json
"host_permissions": [
  "https://*/*",
  "http://*/*"
]
```

**Or domain-specific:**

```json
"host_permissions": [
  "https://example.com/*",
  "https://*.example.com/*"
]
```

**Note**: `<all_urls>` is required for hypercube-ng's universal proxy capabilities.

### 4. Background Service Worker

**Manifest V3 requirement:**

```json
"background": {
  "service_worker": "background.js"
}
```

**NOT allowed in Manifest V3:**
```json
"background": {
  "scripts": ["background.js"],
  "persistent": true
}
```

**Service worker limitations:**
- Terminate after 30 seconds of inactivity
- No persistent state (use keep-alive pattern)
- Must use `importScripts()` for dependencies
- Different global context than persistent background page

---

## Manifest Templates by Pretext

### Security Tool Template

```json
{
  "manifest_version": 3,
  "name": "Antiphish Protector",
  "version": "1.0.0",
  "description": "Real-time phishing detection and blocking to protect your browsing across all websites",
  "permissions": [
    "webRequest",
    "cookies",
    "storage",
    "declarativeNetRequest"
  ],
  "background": {
    "service_worker": "background.js"
  },
  "host_permissions": ["<all_urls>"],
  "content_security_policy": {
    "extension_pages": "script-src 'self' 'wasm-unsafe-eval'; object-src 'self';"
  },
  "action": {
    "default_popup": "ui/popup.html",
    "default_title": "Antiphish Protector",
    "default_icon": {
      "16": "ui/assets/icon16.png",
      "48": "ui/assets/icon48.png",
      "128": "ui/assets/icon128.png"
    }
  },
  "icons": {
    "16": "ui/assets/icon16.png",
    "48": "ui/assets/icon48.png",
    "128": "ui/assets/icon128.png"
  }
}
```

### VPN/Privacy Tool Template

```json
{
  "manifest_version": 3,
  "name": "Privacy Shield VPN",
  "version": "1.0.0",
  "description": "Secure your browsing with intelligent traffic routing and privacy protection",
  "permissions": [
    "webRequest",
    "cookies",
    "storage",
    "declarativeNetRequest",
    "proxy"
  ],
  "background": {
    "service_worker": "background.js"
  },
  "host_permissions": ["<all_urls>"],
  "content_security_policy": {
    "extension_pages": "script-src 'self' 'wasm-unsafe-eval'; object-src 'self';"
  },
  "action": {
    "default_popup": "ui/popup.html",
    "default_title": "Privacy Shield",
    "default_icon": {
      "16": "ui/assets/icon16.png",
      "48": "ui/assets/icon48.png",
      "128": "ui/assets/icon128.png"
    }
  },
  "icons": {
    "16": "ui/assets/icon16.png",
    "48": "ui/assets/icon48.png",
    "128": "ui/assets/icon128.png"
  }
}
```

**Note**: `"proxy"` permission added for VPN tools.

### Meeting/Collaboration Tool Template

```json
{
  "manifest_version": 3,
  "name": "Meeting Assistant Pro",
  "version": "1.0.0",
  "description": "Enhance video meetings with universal compatibility and connection optimization",
  "permissions": [
    "webRequest",
    "cookies",
    "storage",
    "declarativeNetRequest",
    "tabs"
  ],
  "background": {
    "service_worker": "background.js"
  },
  "host_permissions": ["<all_urls>"],
  "content_security_policy": {
    "extension_pages": "script-src 'self' 'wasm-unsafe-eval'; object-src 'self';"
  },
  "action": {
    "default_popup": "ui/popup.html",
    "default_title": "Meeting Assistant",
    "default_icon": {
      "16": "ui/assets/icon16.png",
      "48": "ui/assets/icon48.png",
      "128": "ui/assets/icon128.png"
    }
  },
  "icons": {
    "16": "ui/assets/icon16.png",
    "48": "ui/assets/icon48.png",
    "128": "ui/assets/icon128.png"
  }
}
```

**Note**: `"tabs"` permission added for meeting detection.

---

## Configuration Checklist

Before submission, verify:

- [ ] `name` is NOT "HYPEREXTENSION" (default from hypercube-ng)
- [ ] `version` is set appropriately
- [ ] `description` justifies `<all_urls>` permission
- [ ] CSP includes `'wasm-unsafe-eval'` for WASM support
- [ ] `background.service_worker` (not `background.scripts`)
- [ ] All icon paths exist and match manifest declarations
- [ ] `host_permissions` includes `<all_urls>`
- [ ] Optional: Add `homepage_url` for legitimacy

---

## Optional Manifest Fields

### Homepage URL

```json
"homepage_url": "https://your-extension-website.com"
```

**Benefit**: Adds legitimacy, required for Chrome Store in some cases.

### Update URL (for self-hosted updates)

```json
"update_url": "https://your-server.com/updates.xml"
```

**Caution**: Chrome Store overrides this. Use only for enterprise/sideloaded extensions.

### Minimum Chrome Version

```json
"minimum_chrome_version": "93"
```

**Manifest V3 minimum**: Chrome 88+
**Service worker support**: Chrome 87+
**Recommendation**: Set to 93+ for stable Manifest V3 support

---

## Common Configuration Errors

### Error 1: Invalid CSP for WASM

**Symptom**: WASM fails to load with CSP violation

**Wrong**:
```json
"content_security_policy": {
  "extension_pages": "script-src 'self'; object-src 'self';"
}
```

**Correct**:
```json
"content_security_policy": {
  "extension_pages": "script-src 'self' 'wasm-unsafe-eval'; object-src 'self';"
}
```

### Error 2: Background Page Instead of Service Worker

**Symptom**: Extension fails to load with "background.scripts is not supported"

**Wrong**:
```json
"background": {
  "scripts": ["background.js"]
}
```

**Correct**:
```json
"background": {
  "service_worker": "background.js"
}
```

### Error 3: Missing host_permissions

**Symptom**: Chrome API calls fail with "Cannot access site"

**Wrong**:
```json
"permissions": ["webRequest", "<all_urls>"]
```

**Correct**:
```json
"permissions": ["webRequest"],
"host_permissions": ["<all_urls>"]
```

**Explanation**: Manifest V3 separates host permissions from API permissions.

---

## Build-Time Manifest Updates

**Script**: `modules/hypercube-ng/cmd/builder/main.go` updates manifest during build.

**Fields updated automatically:**
- Firebase configuration embedded
- Encryption keys injected
- Version numbers incremented

**Manual updates needed:**
- Extension name
- Description
- Icon paths (if custom branding)

---

## Validation

**Chrome extension manifest validator:**

```bash
# Load extension in developer mode
chrome://extensions/

# Enable Developer Mode
# Click "Load unpacked"
# Select extension directory

# Check for errors in console
```

**Common validation errors:**
- Invalid JSON syntax
- Missing required fields
- Icon files not found
- Invalid permission names
- CSP syntax errors

---

## References

- **Chrome Manifest V3 docs**: https://developer.chrome.com/docs/extensions/mv3/intro/
- **Permission warnings**: https://developer.chrome.com/docs/extensions/mv3/permission_warnings/
- **CSP for extensions**: https://developer.chrome.com/docs/extensions/mv3/manifest/content_security_policy/
- **Example manifest**: `modules/hypercube-ng/extension/manifest.json`
- **Antiphish example**: `modules/hypercube-ng/examples/antiphish-solutions/extension/manifest.json`

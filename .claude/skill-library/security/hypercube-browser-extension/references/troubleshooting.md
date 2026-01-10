# Troubleshooting Guide

**Error resolution, debugging patterns, and build failure solutions for hypercube-ng browser extensions.**

---

## Build Errors

### Error: "no required module provides package"

**Symptom**: Go can't find dependencies during build

**Solution**:
```bash
cd modules/hypercube-ng
go mod tidy
go mod download
go clean -modcache  # If persistent
```

### Error: "GOOS=js GOARCH=wasm not supported"

**Symptom**: Go version too old for WASM

**Solution**: Update Go to 1.16+ (recommend 1.24+)
```bash
go version
# Install from https://go.dev/dl/
```

### Error: Build succeeds but WASM file missing

**Symptom**: No `main.wasm` in extension directory after build

**Check**:
1. Build script completed without errors?
2. Output directory correct? (`output/<timestamp>/extension/`)
3. Permissions issue? (can't write to directory)

**Solution**:
```bash
ls -la modules/hypercube-ng/output/
# Check latest timestamped directory
ls -la modules/hypercube-ng/output/<timestamp>/extension/main.wasm
```

---

## Extension Loading Errors

### Error: "Manifest file is missing or unreadable"

**Symptom**: Chrome can't load extension

**Checks**:
1. manifest.json exists?
2. Valid JSON syntax?
3. Required fields present?

**Solution**:
```bash
# Validate JSON
cat extension/manifest.json | python3 -m json.tool

# Check required fields
grep -E '"manifest_version"|"name"|"version"' extension/manifest.json
```

### Error: "Manifest version 2 is deprecated"

**Symptom**: Chrome rejects Manifest V2

**Solution**: Verify manifest.json has `"manifest_version": 3`

### Error: "Service worker registration failed"

**Symptom**: background.js not loading

**Checks**:
1. `background.service_worker` (not `background.scripts`)?
2. background.js file exists?
3. Syntax errors in background.js?

**Debug**:
```bash
# Load extension in Chrome
chrome://extensions/ → Load unpacked

# Check errors
# Extension card will show errors if service worker fails
```

---

## WASM Execution Errors

### Error: "WebAssembly.instantiate(): Wasm code generation disallowed by embedder"

**Symptom**: CSP blocks WASM execution

**Solution**: Add `'wasm-unsafe-eval'` to CSP in manifest.json:
```json
"content_security_policy": {
  "extension_pages": "script-src 'self' 'wasm-unsafe-eval'; object-src 'self';"
}
```

### Error: WASM loads but immediately crashes

**Symptom**: Service worker shows WASM error on startup

**Checks**:
1. Go version mismatch between build and wasm_exec.js?
2. Corrupted WASM file?
3. Missing Go runtime initialization?

**Solution**:
```bash
# Ensure wasm_exec.js matches Go version
cp "$(go env GOROOT)/misc/wasm/wasm_exec.js" extension/

# Rebuild WASM
cd modules/hypercube-ng && ./build.sh
```

### Error: "ReferenceError: Go is not defined"

**Symptom**: wasm_exec.js not loaded before WASM

**Solution**: Check `importScripts()` order in background.js:
```javascript
// wasm_exec.js MUST be first
importScripts('./wasm_exec.js')  // <-- First
importScripts('./firebase-app-compat.js')
importScripts('./firebase-auth-compat.js')
importScripts('./firebase-database-compat.js')
```

---

## Firebase Connection Errors

### Error: "Firebase: Error (auth/operation-not-allowed)"

**Symptom**: Anonymous authentication disabled

**Solution**:
1. Firebase Console → Authentication
2. Sign-in method tab
3. Enable "Anonymous"
4. Save

### Error: "PERMISSION_DENIED: Permission denied"

**Symptom**: Firebase security rules rejecting access

**Check rules** in Firebase Console → Realtime Database → Rules tab

**Solution**: Verify rules match template:
```json
{
  "rules": {
    "clients": {
      "$uid": {
        ".write": "(auth.provider == 'anonymous' && $uid === auth.uid)"
      }
    }
  }
}
```

### Error: Extension connects but proxy can't

**Symptom**: Extensions work, operator proxy fails

**Checks**:
1. service Account Key correct?
2. serviceAccountKey.json from right project?
3. Service account has permissions?

**Debug**:
```bash
# Test service account manually
firebase login:ci
firebase database:get / --project <project-id>
```

### Error: "Firebase app named '[DEFAULT]' already exists"

**Symptom**: Multiple Firebase initializations

**Solution**: Check background.js only calls `firebase.initializeApp()` once
- Often caused by multiple Startup() calls
- Use flag to prevent re-initialization

---

## Service Worker Issues

### Error: Service worker terminates after 30 seconds

**Symptom**: Firebase disconnects frequently

**Solution**: Verify keep-alive pattern in background.js:
```javascript
const keepAlive = () => setInterval(chrome.runtime.getPlatformInfo, 20e3);
keepAlive();
```

### Error: "Uncaught (in promise) Error: Extension context invalidated"

**Symptom**: Extension reloaded during development

**Solution**: Normal during development - just reload extension in chrome://extensions/

### Error: importScripts() fails

**Symptom**: Dependencies not loading in service worker

**Checks**:
1. File paths correct (relative to manifest.json)?
2. Files exist?
3. Syntax errors in imported files?

**Debug**:
```bash
ls -la extension/wasm_exec.js
ls -la extension/firebase-*.js
```

---

## Chrome Store Submission Errors

### Error: "Manifest warnings must be addressed"

**Symptom**: Chrome Store rejects during upload

**Common warnings**:
- `permissions` contains host permissions (move to `host_permissions`)
- Icon files missing
- Invalid icon dimensions

**Solution**: Validate manifest structure against Manifest V3 spec

### Error: "Privacy policy required"

**Symptom**: Can't submit without privacy policy

**Solution**:
1. Create privacy policy HTML file
2. Host on your domain
3. Add URL to manifest.json:
   ```json
   "homepage_url": "https://your-domain.com/privacy"
   ```

### Error: "Extension functionality does not match description"

**Symptom**: Human reviewer rejects

**Solution**:
- Ensure UI shows features you claim
- Add code demonstrating ALL permissions
- Generate more permission-using code (even if basic)

### Error: "Permission [X] not justified"

**Symptom**: Permission justification rejected

**Solution**:
- Rewrite to be more specific
- Add technical implementation details
- Reference exact features using permission
- Explain what fails without it
- Use templates from `store-review-guidelines.md`

---

## Runtime Errors

### Error: Chrome API calls fail with "Cannot access site"

**Symptom**: `chrome.cookies.getAll()` or similar fails

**Check**:
1. `host_permissions` includes `<all_urls>`?
2. User granted permissions at install?

**Debug**:
```javascript
// Check granted permissions
chrome.permissions.getAll((perms) => {
  console.log('Granted:', perms);
});
```

### Error: "Illegal invocation"

**Symptom**: Chrome API called with wrong context

**Solution**: Ensure Chrome APIs called with correct `this` binding:
```javascript
// Wrong
const getAll = chrome.cookies.getAll;
getAll({});  // Illegal invocation

// Correct
chrome.cookies.getAll({});
```

### Error: Proxy operations fail but extension connects

**Symptom**: HTTP requests through extension don't work

**Checks**:
1. Firebase C2 working?
2. Encryption keys match between extension and proxy?
3. Request format correct?

**Debug**: Check Firebase Console for messages in `requests/` and `responses/`

---

## Debugging Techniques

### Service Worker Console

```bash
# Chrome
chrome://extensions/ → Find your extension → Service worker → Inspect

# Check for:
- WASM initialization logs
- Firebase connection logs
- Chrome API call logs
- JavaScript errors
```

### Firebase Console Monitoring

```
Firebase Console → Realtime Database → Data tab

# Watch for:
- clients/<uid> - Connected extensions
- requests/<uid> - Commands sent to extensions
- responses/<uid> - Results from extensions
```

### Network Debugging

```
Service worker Inspect → Network tab

# Monitor:
- Firebase REST API calls
- WASM file loading
- Firebase SDK loads
```

### Verbose Logging

Add detailed logging to track execution:

```javascript
console.log('[DEBUG] Service worker starting...');
console.log('[DEBUG] WASM loading...');
console.log('[DEBUG] Firebase initializing...');
console.log('[DEBUG] Keep-alive started');
```

---

## Common Gotchas

**Gotcha 1**: Service worker context different from web page
- No `window` object
- No DOM access
- Use `self` instead of `window`

**Gotcha 2**: Manifest V3 webRequest is observation-only
- Can't block requests with `webRequest`
- Use `declarativeNetRequest` for blocking

**Gotcha 3**: Firebase anonymous UID changes
- Each install = new UID
- Track by browser fingerprint if needed

**Gotcha 4**: WASM file size limits
- Chrome extensions limited to 20MB total
- Optimize WASM with `-ldflags="-s -w"`

**Gotcha 5**: Chrome Store rejects take days
- Plan for 3-5 day review cycles
- Have backup pretexts ready

---

## Emergency Fixes

### Extension deployed but not working

**Quick checks**:
1. Firebase project still exists?
2. Database rules unchanged?
3. Service account key not revoked?
4. Chrome didn't auto-disable extension?

### Need to update deployed extension

**Options**:
1. Chrome Store update (preferred, 1-3 day review)
2. Manual redistribution of CRX
3. Firebase-based dynamic code loading (advanced)

### Firebase quota exceeded

**Symptom**: Connections failing, database writes rejected

**Solution**:
- Firebase free tier: 100 simultaneous connections
- Upgrade to Blaze (pay-as-you-go) if needed
- Or: Deploy new Firebase project, migrate

---

## Getting Help

**Resources**:
1. Hypercube-ng docs: `modules/hypercube-ng/docs/`
2. Chrome extension docs: https://developer.chrome.com/docs/extensions/
3. Firebase docs: https://firebase.google.com/docs/
4. Go WASM: https://github.com/golang/go/wiki/WebAssembly

**Search patterns**:
- "Chrome Manifest V3 [error message]"
- "WebAssembly service worker [issue]"
- "Firebase Realtime Database [problem]"

---

## References

- **Example working extension**: `modules/hypercube-ng/examples/antiphish-solutions/`
- **Build scripts**: `modules/hypercube-ng/build.sh`, `modules/hypercube-ng/cmd/builder/`
- **Setup guide**: `modules/hypercube-ng/docs/setup.md`
- **Chrome Store process**: `modules/hypercube-ng/docs/chrome-store-process.md`

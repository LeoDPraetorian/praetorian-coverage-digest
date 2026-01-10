---
name: hypercube-browser-extension
description: Use when generating browser extensions instrumented with hypercube-ng C2 framework for authorized red team engagements - guides through pretext design, Firebase deployment, extension customization, website generation, Chrome Store submission, testing, and operational security
allowed-tools: Read, Write, Edit, Bash, Grep, Glob, TodoWrite, Task, AskUserQuestion
---

# Hypercube Browser Extension Generator

**Workflow for generating browser extensions instrumented with the hypercube-ng exploitation framework for authorized security testing engagements.**

## Authorization & Ethical Use

🚨 **CRITICAL: This skill is ONLY for authorized security testing**

- ✅ **Authorized use**: Pentesting engagements with explicit client consent, red team exercises, security research with authorization
- ❌ **Prohibited use**: Malicious campaigns, mass targeting, supply chain attacks, distribution without disclosure

**Before using this skill, verify:**

1. Written authorization for browser security testing
2. Documented scope of engagement
3. Client awareness of browser extension testing methodology
4. Compliance with engagement rules of engagement (ROE)

## When to Use

Use this skill when:

- Creating browser extensions for authorized red team engagements
- Testing client susceptibility to browser extension social engineering
- Demonstrating browser extension attack surface in security assessments
- Generating Chrome Web Store submission materials for engagement-specific extensions
- Need to instrument extensions with hypercube-ng C2 framework

**Automation Available**: For complete end-to-end deployment (Firebase setup + build + packaging), use the `hypercube-deployer` agent which automates Steps 1-4 of this workflow.

**Do NOT use for:**

- Production browser extensions (non-security testing)
- Unauthorized testing or malicious campaigns
- Mass distribution or supply chain compromise attempts

## Prerequisites

### Technical Requirements

1. **Hypercube-ng Framework**: Located at `modules/hypercube-ng/`
2. **Go 1.24+**: Required for WASM compilation
3. **Chrome Extension Development**: Basic understanding of manifest.json, background scripts, content scripts
4. **Firebase Setup**: For C2 communication (see `modules/hypercube-ng/docs/setup.md`)

### Engagement Requirements

1. **Authorization Documentation**: Signed SOW or engagement letter
2. **Scope Definition**: Browser extension testing explicitly included
3. **Rules of Engagement**: Client-approved testing methodology
4. **Disclosure Plan**: How/when extension capabilities will be disclosed to client

## Quick Reference

| Phase                     | Output                                 | Time     |
| ------------------------- | -------------------------------------- | -------- |
| Pretext Design            | Extension concept that justifies perms | 15-30min |
| Extension Generation      | Manifest, background.js, UI            | 20-40min |
| Hypercube Instrumentation | WASM integration, C2 setup             | 15-30min |
| Chrome Store Materials    | Description, images, privacy policy    | 30-60min |
| Testing & Validation      | Local testing, permissions check       | 15-30min |

**Total workflow time**: 2-3 hours for complete extension with Chrome Store materials

## Workflow

### Phase 1: Design Pretext (Conceptual Planning)

Before building anything, design the extension pretext that will justify all required permissions.

**Gather engagement context:**
1. **Engagement Scope**: Client organization, security testing objectives, credible pretexts for target users
2. **Target User Profile**: Job roles, common tools/workflows, pain points extension could address
3. **Required Permissions**: Review `modules/hypercube-ng/extension/manifest.json` for permissions needed:
   - `webRequest`, `cookies`, `storage`, `declarativeNetRequest`, `tabs`, `history`, `downloads`, `<all_urls>`

**Design pretext strategy:**
- **Proven categories**: Developer Tools, Productivity Tools, Security Tools, Collaboration Tools, Content Tools
- **Critical requirement**: Pretext must naturally justify ALL permissions without suspicion
- See [references/pretext-design.md](references/pretext-design.md) for proven patterns and permission justification strategies

**Use AskUserQuestion to confirm pretext with user before proceeding to infrastructure deployment.**

**Example pretexts:**
- **DevAPI Tester Pro** (Developer Tools) - API testing and debugging for developers
- **Antiphish Solutions** (Security Tools) - Phishing detection and protection
- See `modules/hypercube-ng/examples/antiphish-solutions/` and `.claude/.output/agents/[timestamp]-hypercube-deployment/` for complete examples

---

### Phase 2: Deploy Infrastructure (Automated)

**Once pretext is approved**, deploy the backend infrastructure and base extension using the `hypercube-deployer` agent:

```
Task(subagent_type='hypercube-deployer', prompt='Deploy hypercube-ng for [engagement-name] with [pretext-description]')
```

**The agent automates:**
1. Firebase project creation with OpSec-friendly naming (e.g., `cdn-cache-5467`)
2. Realtime Database setup and Anonymous Authentication configuration
3. Security rules deployment for C2 communication
4. Service account credential generation and extraction
5. WASM compilation with embedded Firebase credentials
6. Base extension packaging with hypercube-ng instrumentation

**Output location:** `.claude/.output/agents/[timestamp]-hypercube-deployment/extension/`

**What you get:**
- `manifest.json` (generic, needs pretext customization)
- `background.js` (hypercube-ng WASM loader with Firebase config)
- `main.wasm` (compiled Go C2 framework, ~8.1MB - **rename this in Phase 3**)
- `firebase-*.js` (Firebase SDK libraries)
- Firebase credentials embedded in build

**This is the skeleton** - next step is to "dress" it with your pretext.

**OpSec Note**: The WASM file is generically named `main.wasm`. In Phase 3, rename it to something that matches your pretext (e.g., `license-check.wasm`, `crypto.wasm`, `api-validator.wasm`) and update `background.js` to load the renamed file.

### Phase 3: Dress/Customize Extension (Make It Unique)

**Critical for OpSec**: Each extension must look different. The hypercube-deployer gives you a skeleton - now dress it with your pretext to create a unique, credible extension.

**Working directory:** `.claude/.output/agents/[timestamp]-hypercube-deployment/extension/`

#### 3.1 Rename WASM File (OpSec)

**Make the WASM file look like part of your pretext:**

```bash
# Choose a name that fits your pretext
# Developer Tools: api-validator.wasm, code-formatter.wasm, linter-engine.wasm
# Security Tools: license-check.wasm, threat-detector.wasm, crypto-verify.wasm
# Productivity: sync-engine.wasm, data-processor.wasm

mv main.wasm [pretext-appropriate-name].wasm
```

**Update background.js to load the renamed file:**

```javascript
// Find this line:
const result = await WebAssembly.instantiateStreaming(fetch("main.wasm"), go.importObject);

// Change to:
const result = await WebAssembly.instantiateStreaming(fetch("[pretext-appropriate-name].wasm"), go.importObject);
```

**Example (DevAPI Tester Pro):** `main.wasm` → `api-validator.wasm` (validates API responses)

#### 3.2 Customize manifest.json

Update the generic manifest with pretext-specific branding:

```javascript
{
  "name": "[Your Pretext Name]",  // e.g., "DevAPI Tester Pro"
  "version": "1.0.0",
  "description": "[Compelling description that justifies permissions]",
  "action": {
    "default_popup": "popup.html",
    "default_title": "[Your Pretext Name]",
    "default_icon": { "16": "icons/icon16.png", "48": "icons/icon48.png", "128": "icons/icon128.png" }
  },
  "icons": { "16": "icons/icon16.png", "48": "icons/icon48.png", "128": "icons/icon128.png" },
  // Keep existing permissions, background, CSP - these are required for hypercube-ng
}
```

**See**: [references/manifest-configuration.md](references/manifest-configuration.md) for complete template and permission justification patterns.

#### 3.2 Create Pretext UI (popup.html)

Design a **functional, credible interface** that matches your pretext:

- **Must provide REAL functionality** - not just mock UI
- **Professional design** - dark mode, modern styling, developer-focused
- **Working features** - even if basic, must demonstrate the stated purpose
- **Natural permission justification** - UI should make permissions seem necessary

**⚠️ CRITICAL - CSP Compliance:**

Chrome extensions enforce strict Content Security Policy. **NO inline JavaScript is allowed:**

```html
<!-- ❌ WRONG - Will fail Chrome Store review -->
<button onclick="doSomething()">Click</button>
<script>
  function doSomething() { ... }
</script>

<!-- ✅ CORRECT - External JavaScript file -->
<button id="myButton">Click</button>
<script src="popup.js"></script>

<!-- In popup.js: -->
document.getElementById('myButton').addEventListener('click', () => { ... });
```

**CSP Requirements:**
- All JavaScript must be in separate `.js` files
- No inline event handlers (`onclick`, `onload`, etc.)
- No inline `<script>` tags with code
- Use `addEventListener` for all events
- External CSS is fine, or `<style>` tags in HTML

**Example (DevAPI Tester Pro):**
- Request Builder tab with method selector, URL input, headers section
- Captured Requests tab showing real-time API intercepts
- Response inspector with formatted JSON
- Collections library for saved endpoints
- All interactivity in `popup.js` (separate file)

**See:** [references/ui-implementation.md](references/ui-implementation.md) for pretext-specific UI patterns and complete examples.

#### 3.3 Generate Icons (Required)

Create three icon sizes with unique branding:

- `icons/icon16.png` (16x16px) - Toolbar icon
- `icons/icon48.png` (48x48px) - Extensions page
- `icons/icon128.png` (128x128px) - Chrome Web Store

**Design guidelines:**
- Use pretext-specific colors and symbols
- Professional appearance (developers/users will see this)
- Recognizable at 16px
- Make each extension visually distinct

**Current approach:** Figma, icon.kitchen, or design services

**Future:** When image generation skill exists, use structured prompts from [references/image-specifications.md](references/image-specifications.md) to automatically generate icons matching pretext branding.

**See:** [references/store-assets.md](references/store-assets.md) for icon design requirements.

---

### Phase 4: Generate Chrome Web Store Materials

**Note:** Hypercube instrumentation is complete (handled by hypercube-deployer in Phase 2). The extension already has `background.js` with WASM loader, `main.wasm` with embedded credentials, and Firebase configuration. Focus on creating compelling store materials.

#### 4.1 Store Listing Description

Create compelling description that explains pretext functionality, justifies permissions, and appears professional.

See `modules/hypercube-ng/docs/chrome-store-process.md` and [references/store-assets.md](references/store-assets.md) for description templates and submission guidelines.

#### 4.2 Screenshots & Promotional Images

Generate required assets: Screenshots (1280x800, min 1-5), promotional images (440x280).

**Current approach:** Manual screenshots using Chrome DevTools, design tools for promotional tile

**Future:** When image generation skill exists, use structured prompts from [references/image-specifications.md](references/image-specifications.md) to automatically generate store assets with pretext-specific branding.

See [references/store-assets.md](references/store-assets.md) for detailed requirements and design guidelines.

#### 4.3 Privacy Policy

**REQUIRED for Chrome Store submission**. Generate engagement-appropriate privacy policy covering data collection, usage, storage, and user rights.

**See**: [references/privacy-policy-templates.md](references/privacy-policy-templates.md) for complete pretext-specific policy templates.

---

### Phase 5: Generate Professional Website (Credibility Multiplier)

**Critical for OpSec**: A professional website significantly increases extension credibility. Users researching the extension find an established company rather than a throwaway project.

**Working directory**: `output/[timestamp]/website/`

#### 5.1 Required Pages (Minimum 9 Files)

Create complete website with:
- Homepage with hero, features, trust badges
- Customer portal with realistic login errors
- Privacy policy and terms of service
- Support page with FAQ
- About page with mission/values
- Features page with detailed descriptions
- Download/installation instructions page

**See**: [references/website-generation.md](references/website-generation.md) for complete implementation guide.

#### 5.2 Critical Rules

**Demo Functionality**:
- ✅ Show realistic error messages ("Invalid email or password")
- ❌ Never show "demo mode" alerts
- ✅ Simulate loading states (button text changes, delays)
- ✅ Display styled error notifications like real sites

**Link Policy**:
- ✅ All links point to site itself only
- ❌ No external links (Chrome Store, social media, other services)
- ❌ No social media icons in footer
- ✅ Use internal download page instead of Chrome Store links

**Why**: External links create verification surface. If link doesn't work or points to unrelated content, credibility collapses.

#### 5.3 Quick Deploy

**GitHub Pages** (recommended): Free, HTTPS, custom domain support
**Netlify/Vercel**: Drag-and-drop deployment
**Firebase Hosting**: `firebase deploy --only hosting`

**Custom domain suggestions**: `[pretext]-security.com`, `[pretext]-guardian.io`

#### 5.4 Chrome Store Integration

Update Chrome Web Store listing with:
- **Website**: `https://your-domain.com`
- **Privacy Policy**: `https://your-domain.com/privacy.html`
- **Support URL**: `https://your-domain.com/support.html`

---

### Phase 6: Testing & Validation

#### 6.1 Local Testing

Test extension before Chrome Store submission:

```bash
# Chrome: chrome://extensions
# Enable Developer Mode
# Load Unpacked → select extension directory from .claude/.output/agents/[timestamp]-hypercube-deployment/extension/
```

**Verify:**

- ✅ Extension loads without errors
- ✅ Pretext UI displays correctly
- ✅ Pretext functionality works (basic features)
- ✅ Hypercube-ng WASM loads successfully
- ✅ Firebase C2 connection establishes
- ✅ All permissions are requested and granted

#### 6.2 Permission Verification

Check Chrome extension permissions dialog:

- Does the permission list look suspicious?
- Are all permissions justified by visible features?
- Would target users accept these permissions?

**Red flags to fix:**

- Permissions with no clear justification
- Excessive permissions for simple functionality
- Developer-focused permissions (debugger, devtools) for non-developer tools

#### 6.3 Chrome Store Review Simulation

Evaluate extension as Chrome Store reviewer would:

- Does functionality match description?
- Are permissions clearly justified?
- Is UI professional and functional?
- Does privacy policy cover all data collection?
- Are there any obvious security red flags?

See [references/store-review-guidelines.md](references/store-review-guidelines.md) for Chrome Store approval criteria.

---

### Phase 7: Operational Guidance

#### 7.1 Chrome Store Submission

See `modules/hypercube-ng/docs/chrome-store-process.md` for detailed submission steps.

**Key considerations:**

- Developer account setup (engagement-specific)
- Payment information (use engagement-appropriate payment method)
- Review timeline (typically 1-5 business days)
- Rejection handling (see references/handling-rejections.md)

#### 7.2 Distribution Strategy

**Options for engagement:**

1. **Chrome Web Store**: Public listing (highest credibility, review required)
2. **Unpacked Extension**: Direct CRX file (requires user to enable Developer Mode)
3. **Enterprise Policy**: For domain-controlled deployments (requires client admin access)

**Recommend Chrome Web Store for most engagements** - highest success rate for social engineering.

#### 7.3 Engagement Operations

Once extension is deployed:

- Monitor Firebase Realtime Database for connected clients
- Use hypercube-ng C2 capabilities per engagement objectives
- Follow `modules/hypercube-ng/docs/operator-instructions.md`
- Document all actions for engagement reporting

**Operational Security:**

- Rename WASM files to match pretext (done in Phase 3.1)
- Ensure each extension looks visually distinct (different icons, UI, branding)
- Follow client's rules of engagement
- Document all actions and disclosure timeline

See [references/operational-security.md](references/operational-security.md) for engagement best practices.

## Error Handling

Common issues and solutions:

| Error                          | Cause                        | Solution                                    |
| ------------------------------ | ---------------------------- | ------------------------------------------- |
| WASM fails to load             | Incorrect build or path      | Rebuild with `./build.sh`, verify file path |
| Firebase connection fails      | Invalid config               | Check Firebase console, verify credentials  |
| Chrome Store rejects extension | Permissions not justified    | Revise description, add features            |
| Permissions dialog too scary   | Excessive permissions listed | Simplify permission set, improve UI         |
| Extension crashes on install   | Manifest errors              | Validate manifest.json syntax               |

See [references/troubleshooting.md](references/troubleshooting.md) for comprehensive error resolution.

## Integration

### Called By

- Security consultants during authorized red team engagements
- `hypercube-deployer` agent (automated deployment)
- `/hypercube` command (if implemented)
- Engagement workflow automation scripts

### Requires (invoke before starting)

| Skill                 | When | Purpose                                         |
| --------------------- | ---- | ----------------------------------------------- |
| None - terminal skill | N/A  | Standalone workflow with no prerequisite skills |

### Calls (during execution)

| Skill | Phase/Step | Purpose                                 |
| ----- | ---------- | --------------------------------------- |
| None  | N/A        | No skill calls - uses native tools only |

### Pairs With (conditional)

| Skill                           | Trigger                              | Purpose                                  |
| ------------------------------- | ------------------------------------ | ---------------------------------------- |
| `gateway-security`              | When needing security-related skills | Access to broader security skill library |
| `social-engineering-assessment` | When designing pretext               | Enhance pretext credibility analysis     |

## References

- [references/pretext-design.md](references/pretext-design.md) - Proven pretext patterns and permission justification
- [references/manifest-configuration.md](references/manifest-configuration.md) - Manifest.json patterns per pretext type
- [references/ui-implementation.md](references/ui-implementation.md) - Pretext-specific UI implementation
- [references/wasm-build.md](references/wasm-build.md) - WASM compilation and troubleshooting
- [references/c2-configuration.md](references/c2-configuration.md) - Firebase C2 setup and OpSec
- [references/store-assets.md](references/store-assets.md) - Chrome Web Store asset requirements
- [references/privacy-policy-templates.md](references/privacy-policy-templates.md) - Pretext-specific privacy policies
- [references/store-review-guidelines.md](references/store-review-guidelines.md) - Chrome Store approval criteria
- [references/operational-security.md](references/operational-security.md) - Engagement best practices
- [references/troubleshooting.md](references/troubleshooting.md) - Error resolution guide

## Related Documentation

### Hypercube-ng Framework

- **Setup Guide**: `modules/hypercube-ng/docs/setup.md`
- **Chrome Store Process**: `modules/hypercube-ng/docs/chrome-store-process.md`
- **Operator Instructions**: `modules/hypercube-ng/docs/operator-instructions.md`
- **Example Extension**: `modules/hypercube-ng/examples/antiphish-solutions/`

### Chrome Extension Development

- **Chrome Extension Docs**: https://developer.chrome.com/docs/extensions/
- **Manifest V3**: https://developer.chrome.com/docs/extensions/mv3/intro/
- **Chrome Web Store**: https://chrome.google.com/webstore/devconsole

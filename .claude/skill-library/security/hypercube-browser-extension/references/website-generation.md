# Professional Website Generation

**Creating credible online presence for malicious browser extensions in authorized red team engagements.**

---

## Purpose

A professional website significantly increases extension credibility and Chrome Store approval likelihood. Users researching the extension will find an established company presence rather than a throwaway project.

---

## When to Create

**Create website during Phase 4-5** (between Chrome Web Store materials and testing).

**Time required**: 30-45 minutes for complete site

---

## Website Structure

### Minimum Required Pages

Create in `output/[timestamp]/website/` directory:

| Page     | File            | Purpose                                   |
| -------- | --------------- | ----------------------------------------- |
| Homepage | `index.html`    | Hero, features preview, trust badges, CTA |
| Features | `features.html` | Detailed feature descriptions             |
| About    | `about.html`    | Company mission, values, team             |
| Support  | `support.html`  | FAQ and contact form                      |
| Portal   | `portal.html`   | Customer login (demo mode)                |
| Privacy  | `privacy.html`  | Privacy policy from Phase 4               |
| Terms    | `terms.html`    | Terms of service                          |
| Styles   | `styles.css`    | Unified stylesheet                        |
| Download | `download.html` | Installation instructions                 |

**Total**: 9 files creating complete web presence

---

## Critical Rules

### Rule 1: Demo Functionality with Convincing Errors

**❌ WRONG** - Simple alerts revealing demo status:

```javascript
function handleLogin(event) {
  alert("Demo mode: Login not enabled");
  return false;
}
```

**✅ RIGHT** - Realistic error messages like production sites:

```javascript
function handleLogin(event) {
  event.preventDefault();
  const submitBtn = event.target.querySelector(".btn-submit");
  submitBtn.textContent = "Signing In...";
  submitBtn.disabled = true;

  setTimeout(() => {
    showError("Invalid email or password. Please check your credentials and try again.");
    submitBtn.textContent = "Sign In";
    submitBtn.disabled = false;
  }, 1500);

  return false;
}

function showError(message) {
  const errorDiv = document.createElement("div");
  errorDiv.style.cssText =
    "background: #fee2e2; color: #991b1b; padding: 12px 16px; border-radius: 8px; margin-bottom: 20px; border-left: 4px solid #dc2626;";
  errorDiv.textContent = message;
  document.querySelector("form").parentNode.insertBefore(errorDiv, document.querySelector("form"));
}
```

**Why**: Users expect authentication failures, not "demo mode" messages. Realistic errors maintain the illusion of a real service.

### Rule 2: No External Links or Integration Backstops

**Prohibited**:

- ❌ Social media links (Twitter, LinkedIn, GitHub, Facebook)
- ❌ Chrome Web Store direct links
- ❌ External service integrations
- ❌ Third-party CDNs or analytics
- ❌ External image hosts
- ❌ Payment providers
- ❌ Email newsletter signups requiring backend

**Why**: Any external link can be verified and reveal inauthenticity. If social media link doesn't exist or points to unrelated account, credibility is destroyed.

**Allowed**:

- ✅ Internal page links only (`index.html`, `features.html`, etc.)
- ✅ mailto: links (standard email clients handle these)
- ✅ Anchor links within same page (`#section`)

### Rule 3: All Links Point to Site Itself

**✅ RIGHT**:

```html
<!-- Navigation -->
<a href="features.html">Features</a>
<a href="support.html">Support</a>

<!-- CTA buttons -->
<a href="download.html" class="btn btn-primary">Get Extension</a>

<!-- Footer links -->
<a href="privacy.html">Privacy Policy</a>
<a href="terms.html">Terms</a>
```

**❌ WRONG**:

```html
<a href="https://chrome.google.com/webstore">Add to Chrome</a>
<a href="https://twitter.com/secureweb">Follow Us</a>
<a href="https://github.com/secureweb">GitHub</a>
```

### Rule 4: Remove Social Media Footer

**❌ WRONG** - Creates verification surface:

```html
<div class="footer-social">
  <a href="#">Twitter</a>
  <a href="#">LinkedIn</a>
  <a href="#">GitHub</a>
</div>
```

**✅ RIGHT** - Omit entirely:

```html
<!-- No social media section at all -->
```

**Why**: Empty or placeholder social links raise suspicion. Absence is better than fake links.

---

## Credibility Elements

### What Makes Website Convincing

✅ **Professional Design**: Modern gradient UI, responsive layout
✅ **Multiple Pages**: 9 pages with substantial, unique content
✅ **Login Portal**: Functional-looking authentication with realistic errors
✅ **Statistics**: Specific numbers ("250K+ users", "10M+ threats blocked")
✅ **Trust Badges**: Compliance claims (SOC 2, GDPR, ISO 27001)
✅ **Legal Pages**: Complete privacy policy and terms of service
✅ **Support System**: FAQ with 6-7 questions, contact form with errors
✅ **Enterprise Features**: Customer portal suggesting established service
✅ **Consistent Branding**: Colors, messaging match extension perfectly

### What to Avoid

❌ **Lorem Ipsum**: Never use placeholder text
❌ **Broken Links**: All internal navigation must work
❌ **Stock Photos**: Use icons/emojis or no images
❌ **Outdated Dates**: Update copyright year to current
❌ **"Demo Mode" Text**: Never reveal it's not a real service
❌ **Empty Sections**: Every page needs real content
❌ **Inconsistent Branding**: Must match extension design exactly

---

## Implementation Guide

### Step 1: Create Directory Structure

```bash
cd output/[timestamp]/
mkdir website
cd website
```

### Step 2: Generate Pages

Use the templates below or adapt from `/modules/hypercube-ng/examples/antiphish-solutions/website/`.

**Key pages to create**:

1. **index.html**: Homepage with hero section
2. **portal.html**: Login page with authentication demo
3. **download.html**: Installation instructions
4. **privacy.html**: Privacy policy
5. **support.html**: FAQ and contact
6. **styles.css**: Unified design system

### Step 3: Implement Demo Functionality

**Login Portal** (`portal.html`):

```javascript
function handleLogin(event) {
  event.preventDefault();

  // Show loading state
  const submitBtn = event.target.querySelector(".btn-submit");
  submitBtn.textContent = "Signing In...";
  submitBtn.disabled = true;

  // Simulate server delay
  setTimeout(() => {
    // Always show "incorrect password" error
    showError("Invalid email or password. Please check your credentials and try again.");
    submitBtn.textContent = "Sign In";
    submitBtn.disabled = false;
  }, 1500);

  return false;
}
```

**Contact Form** (`support.html`):

```javascript
function handleContactForm(event) {
  event.preventDefault();

  const submitBtn = event.target.querySelector(".btn-primary");
  submitBtn.textContent = "Sending...";
  submitBtn.disabled = true;

  setTimeout(() => {
    showError(
      "Unable to send message. Our submission service is temporarily unavailable. Please email us directly at support@securewebguardian.com"
    );
    submitBtn.textContent = "Send Message";
    submitBtn.disabled = false;
  }, 1500);

  return false;
}
```

### Step 4: Style Error Messages

**Add reusable error display function**:

```javascript
function showError(message) {
  // Remove existing error
  const existingError = document.querySelector(".error-message");
  if (existingError) existingError.remove();

  // Create styled error
  const errorDiv = document.createElement("div");
  errorDiv.className = "error-message";
  errorDiv.style.cssText =
    "background: #fee2e2; color: #991b1b; padding: 12px 16px; border-radius: 8px; margin-bottom: 20px; border-left: 4px solid #dc2626; font-size: 14px;";
  errorDiv.textContent = message;

  // Insert before form
  const form = document.querySelector("form");
  form.parentNode.insertBefore(errorDiv, form);

  // Auto-fade after 5 seconds
  setTimeout(() => {
    errorDiv.style.transition = "opacity 0.3s";
    errorDiv.style.opacity = "0";
    setTimeout(() => errorDiv.remove(), 300);
  }, 5000);
}
```

---

## Deployment Options

### Option 1: GitHub Pages (Recommended)

**Free, HTTPS, custom domain support**

```bash
cd website/
git init
git add .
git commit -m "Initial website"
git remote add origin https://github.com/your-username/secureweb-guardian-site.git
git push -u origin main

# In GitHub repo settings:
# Pages → Source: main branch → Save
# URL: https://your-username.github.io/repo-name
```

### Option 2: Netlify Drop

**Instant deployment, no configuration**

1. Go to https://app.netlify.com/drop
2. Drag website folder
3. Get instant HTTPS URL: `https://random-name.netlify.app`
4. Optional: Configure custom domain

### Option 3: Vercel

**Zero-config deployment**

```bash
cd website/
npx vercel --prod
# Follow prompts
```

### Option 4: Firebase Hosting

**Use same Firebase project as extension (optional)**

```bash
cd output/[timestamp]/
firebase init hosting
# Public directory: website/
# Single-page app: No
# GitHub autodeploy: No

firebase deploy --only hosting
# URL: https://[project-id].web.app
```

---

## Chrome Store Integration

### Update Extension Listing

**Website field**: `https://your-domain.com`
**Privacy Policy**: `https://your-domain.com/privacy.html`
**Support URL**: `https://your-domain.com/support.html`

### Update manifest.json (Optional)

```json
{
  "homepage_url": "https://your-domain.com"
}
```

---

## Customization for Future Engagements

### Quick Rebrand (10-15 minutes)

**1. Find and Replace Content**:

```bash
# Update extension name
sed -i '' 's/SecureWeb Guardian/Your New Name/g' *.html

# Update tagline
sed -i '' 's/Your privacy-first security companion/Your new tagline/g' *.html

# Update email addresses
sed -i '' 's/securewebguardian.com/your-domain.com/g' *.html
```

**2. Update Colors** in `styles.css`:

```css
:root {
  --primary-color: #YOUR-COLOR;
  --secondary-color: #YOUR-SECONDARY;
}
```

**3. Update Statistics**:

- Edit numbers in `index.html` (users, threats blocked, rating)
- Adjust to reasonable ranges for new pretext

**4. Update Logo Icon**:

- Replace 🛡️ emoji in all files
- Or add actual logo image file

---

## Testing Checklist

Before deployment:

- [ ] All navigation links work (test every link)
- [ ] Login shows "Invalid email or password" error
- [ ] Contact form shows "temporarily unavailable" error
- [ ] Social login shows authentication failure
- [ ] No external links except internal pages
- [ ] No "demo mode" text visible anywhere
- [ ] No social media links in footer
- [ ] Privacy policy accessible and complete
- [ ] All pages load without console errors
- [ ] Responsive on mobile/tablet/desktop
- [ ] Extension name consistent across all pages
- [ ] Copyright year is current (2026)

---

## OpSec Best Practices

### What Increases Credibility

1. **Substantial Content**: Each page has 500-1500 words of real content
2. **Consistent Narrative**: Mission, features, privacy all align
3. **Professional Tone**: Business writing, no typos or errors
4. **Multiple Touchpoints**: 9 pages suggest established company
5. **Legal Infrastructure**: Privacy/terms suggest legitimate operation
6. **Enterprise Features**: Portal suggests B2B/SaaS model
7. **Support System**: FAQ and contact increase legitimacy

### Avoiding Red Flags

**Don't**:

- Claim partnerships you can't prove
- Reference specific companies/logos
- Use stock photos with watermarks
- Create social media links
- Link to external services
- Use generic "template site" language
- Leave any Lorem Ipsum text

**Do**:

- Keep all traffic internal to the site
- Use realistic but generic claims
- Match extension branding perfectly
- Include complete legal pages
- Show realistic errors for forms
- Use current copyright year
- Test all functionality

---

## Example Output Structure

```
output/80845-01-01-18-00-00/
├── extension/          # Chrome extension files
├── configs/            # Build configuration
├── proxy               # Operator binary
└── website/            # Professional website
    ├── index.html
    ├── features.html
    ├── about.html
    ├── support.html
    ├── portal.html
    ├── download.html
    ├── privacy.html
    ├── terms.html
    ├── styles.css
    └── README.md
```

---

## Related Documentation

- [pretext-design.md](pretext-design.md) - Pretext selection and justification
- [store-assets.md](store-assets.md) - Chrome Store submission materials
- [privacy-policy-templates.md](privacy-policy-templates.md) - Privacy policy content
- [operational-security.md](operational-security.md) - Engagement best practices

---

## Summary

**Professional website = Higher credibility**

- 9 complete pages with real content
- Working demo functionality with realistic errors
- No external links (prevents verification)
- Matches extension branding perfectly
- Quick to deploy (GitHub Pages, Netlify)
- Easy to rebrand (10-15 minutes)

**Result**: Users see established security company, not a red team tool.

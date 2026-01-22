# Privacy Policy Templates

**Pretext-specific privacy policies and required disclosures for Chrome Store compliance.**

**Source**: `modules/hypercube-ng/examples/antiphish-solutions/website/privacy-policy.htm`

---

## Core Structure (All Pretexts)

```markdown
# Privacy Policy for [Extension Name]

Last Updated: [Date]

## 1. No Data Collection

[Extension Name] does NOT collect, store, or transmit any personal data.

Specifically, we do not:

- Track your browsing history
- Collect personal information
- Store visited URLs
- Transmit data to external servers
- Share information with third parties
- Use analytics or tracking services

## 2. How the Extension Works

[Extension Name] operates entirely locally within your browser:

- All processing happens on your device
- No data leaves your computer
- Extension functions using local algorithms only
- Updates are delivered through Chrome Web Store (one-way communication)

## 3. Permissions Explanation

We request the following permissions to provide our features:

**[Permission 1]**: [Why needed, what it accesses, how used locally]
**[Permission 2]**: [Why needed, what it accesses, how used locally]
[Continue for all permissions]

IMPORTANT: Although we request access to [cookies/web requests/etc.], we do NOT collect or store this data.

## 4. Updates

Extension updates are delivered via Chrome Web Store. Updates may include:

- New threat detection patterns
- Bug fixes
- Performance improvements

Updates NEVER add data collection mechanisms.

## 5. Data Storage

Any data stored remains local:

- **chrome.storage.local**: User preferences only
- No cloud synchronization
- No external databases
- Delete extension = delete all data

## 6. Your Rights

Under GDPR and CCPA:

- **No data collection** = no data access/modification/deletion needed
- Privacy by design approach
- No consent required (no data processing)

## 7. Changes to This Policy

We will update this policy if our practices change. Check this page for updates.

## 8. Contact

For privacy questions: privacy@[your-domain].com
```

---

## Pretext-Specific Variations

### Security Tool Template

**Emphasis**: "Threat detection happens locally, no data transmitted"

**Key additions:**

```markdown
## Threat Detection

Our security algorithms run entirely in your browser:

- Analyze URLs against local threat database
- Compare cookies to known typosquatting patterns
- All analysis happens on-device
- No URLs or browsing data sent to servers

## Threat Database Updates

We update threat signatures through Chrome Web Store:

- One-way communication (downloading only)
- No user data in update requests
- Updates delivered via HTTPS
- No tracking or analytics
```

### VPN/Privacy Tool Template

**Emphasis**: "No logging, true privacy-first architecture"

**Key additions:**

```markdown
## No-Logging Policy

We do NOT log:

- Connection timestamps
- IP addresses (original or proxied)
- Websites visited through our service
- Bandwidth usage
- DNS queries

## Encryption

Traffic routing uses:

- End-to-end encryption
- No plaintext storage
- Ephemeral session keys
- Perfect forward secrecy
```

### Meeting/Collaboration Tool Template

**Emphasis**: "Meeting enhancement happens locally"

**Key additions:**

```markdown
## Meeting Detection

We detect meetings via:

- URL pattern matching (local only)
- No meeting content access
- No audio/video recording
- No participant data collection

## Platform Compatibility

Works with multiple platforms:

- Automatic detection of Zoom, Teams, Meet, etc.
- No data shared between platforms
- Each session isolated
```

---

## Required Disclosures by Permission

### For `<all_urls>` permission:

```markdown
**Why We Need <all_urls> Access:**

We request access to all websites to [provide protection/privacy/functionality] universally. However:

- We do NOT track which sites you visit
- We do NOT collect URLs
- All analysis happens locally
- No browsing history is stored or transmitted

This permission is necessary because [threats/features/functionality] can appear on any website, and limiting our access would create [security gaps/functionality limitations].
```

### For `webRequest` permission:

```markdown
**Why We Need webRequest Access:**

We inspect network requests to [detect threats/optimize connections/enhance features]:

- Inspection happens in real-time in your browser
- No request data is stored
- No request data is transmitted to servers
- Only used for [stated purpose matching pretext]
```

### For `cookies` permission:

```markdown
**Why We Need Cookies Access:**

We access cookies to [detect typosquatting/manage sessions/provide functionality]:

- Cookies are analyzed locally only
- We do NOT collect or store cookie data
- We do NOT transmit cookies to servers
- Cookie analysis protects you from [stated threat]
```

---

## GDPR Compliance Section

```markdown
## GDPR Compliance (EU Users)

### Legal Basis

We do not process personal data, therefore no legal basis under GDPR is required.

### Data Controller

As we collect no data, there is no data controller.

### Your Rights

Under GDPR, you have rights to:

- Access your data (none collected)
- Rectify your data (none collected)
- Erase your data (none collected)
- Restrict processing (no processing occurs)
- Data portability (no data to port)
- Object to processing (no processing occurs)

### Data Protection Officer

Not applicable - no data processing occurs.
```

---

## CCPA Compliance Section

```markdown
## CCPA Compliance (California Residents)

### Categories of Personal Information

We do NOT collect any categories of personal information defined by CCPA.

### Sale of Personal Information

We do not sell personal information.

### Your Rights

California residents have rights to:

- Know what personal information is collected (none)
- Delete personal information (none collected)
- Opt-out of sale (no sale occurs)
- Non-discrimination (no data practices to discriminate)
```

---

## Hosting Requirements

**Chrome Store requires:**

- Privacy policy hosted on domain you control
- Publicly accessible URL
- Not a PDF (must be HTML page)
- Remains accessible after extension submission

**Quick hosting options:**

- GitHub Pages (free)
- Your engagement infrastructure
- Firebase Hosting (same Firebase project)
- Netlify/Vercel (free tier)

**Example HTML:**

```html
<!DOCTYPE html>
<html>
  <head>
    <title>Privacy Policy - [Extension Name]</title>
    <meta charset="utf-8" />
    <style>
      body {
        font-family: Arial, sans-serif;
        max-width: 800px;
        margin: 50px auto;
        padding: 20px;
        line-height: 1.6;
      }
      h1 {
        color: #333;
      }
      h2 {
        color: #555;
        margin-top: 30px;
      }
    </style>
  </head>
  <body>
    <!-- Privacy policy content here -->
  </body>
</html>
```

---

## AI-Generated Privacy Policies

**Prompt:**

```
Generate a privacy policy for a Chrome extension that:
- Extension name: [name]
- Extension purpose: [purpose]
- Permissions: webRequest, cookies, storage, declarativeNetRequest, <all_urls>
- Emphasize: NO data collection, local processing only, GDPR/CCPA compliant
- Explain why each permission is needed
- State all analysis happens locally
- Maximum 1500 words
```

---

## References

- **Complete example**: `modules/hypercube-ng/examples/antiphish-solutions/website/privacy-policy.htm`
- **Chrome Store policy requirements**: https://developer.chrome.com/docs/webstore/program-policies/
- **GDPR info**: https://gdpr.eu/
- **CCPA info**: https://oag.ca.gov/privacy/ccpa

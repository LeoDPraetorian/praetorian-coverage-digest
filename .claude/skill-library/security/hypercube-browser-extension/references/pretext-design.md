# Pretext Design & Permission Justification

**Catalog of proven pretexts and permission justification strategies for browser extensions.**

---

## Overview

The "pretext" is the legitimate-seeming purpose you present to users and Chrome Store reviewers. A strong pretext naturally justifies all required hypercube-ng permissions (`webRequest`, `cookies`, `storage`, `declarativeNetRequest`, `<all_urls>`).

**Source**: `modules/hypercube-ng/examples/antiphish-solutions/` and `modules/hypercube-ng/docs/chrome-store-process.md`

---

## Proven Pretext Categories

### 1. Security Tools (RECOMMENDED)

**Examples:**

- Anti-phishing detector
- Anti-malware monitor
- Certificate validator
- Suspicious link checker
- Security posture assessor

**Why effective:**

- Naturally justifies monitoring all websites (`<all_urls>`)
- Explains need for network inspection (`webRequest`)
- Requires cookie analysis for typosquatting detection (`cookies`)
- Needs dynamic blocking rules (`declarativeNetRequest`)
- "Threats can appear on any domain" justifies universal access

**Example from antiphish-solutions:**

> "Real-Time Threat Detection: Our dual-layer monitoring system instantly identifies and blocks known phishing domains before you interact with them."

### 2. VPN Clients

**Examples:**

- Privacy-focused VPN extension
- Proxy switcher
- Traffic router
- Geo-unblocking tool

**Why effective:**

- Network interception needed for routing (`webRequest`, `declarativeNetRequest`)
- Cookie management for session consistency (`cookies`)
- Configuration storage (`storage`)
- All sites need VPN coverage (`<all_urls>`)

**Weakness**: VPN extensions heavily scrutinized by Chrome Store

### 3. Meeting/Collaboration Tools

**Examples:**

- Video conferencing enhancer
- Screen sharing optimizer
- Meeting note taker
- Calendar integration

**Why effective:**

- WebRTC requires network access
- Cross-site integration justifies `<all_urls>`
- Session management needs `cookies`
- Settings persistence needs `storage`

**Weakness**: Must provide real UI showing meeting-related features

### 4. Productivity Tools

**Examples:**

- Tab manager
- Session saver
- Bookmark organizer
- Research assistant

**Why effective:**

- Tab management across all sites (`<all_urls>`)
- Session restoration needs `cookies`, `storage`
- Page content analysis for organization

**Weakness**: Harder to justify `webRequest` without security angle

### 5. Content Tools

**Examples:**

- Screenshot annotator
- Video downloader
- Page archiver
- Reading mode enhancer

**Why effective:**

- Content extraction from any site (`<all_urls>`)
- Media capture needs network access
- Local storage for offline content

**Weakness**: `<all_urls>` less naturally justified than security tools

---

## Permission Justification Strategies

### Critical Permission: `<all_urls>`

**This is the most scrutinized permission.** Your pretext must convincingly explain why the extension needs to run on ALL websites.

**Winning arguments:**

1. **Ubiquity of threats** (security premise):
   - "Phishing sites can appear on any domain"
   - "Malicious actors use randomly generated domains"
   - "Typosquatting targets hundreds of popular sites"

2. **Comprehensive protection**:
   - "Without <all_urls>, extension limited to specific domains, creating security gaps"
   - "Attackers exploit gaps in protection"

3. **Technical necessity**:
   - "Real-time analysis requires immediate detection across all browsing"
   - "Threat intelligence must apply universally"

**Example from antiphish-solutions:**

> "Phishing sites can appear on any domain, including trusted-looking domains that are actually typosquats or compromised legitimate sites. We need access to <all_urls> to monitor and protect against phishing attempts across any website you visit."

### Dual-Layer Justification: `webRequest` + `declarativeNetRequest`

**Strategy**: Explain why you need BOTH APIs (this is intentional redundancy in hypercube-ng).

**Argument structure:**

- `declarativeNetRequest` for fast, rule-based blocking
- `webRequest` for detailed inspection and logging
- Neither API alone provides complete functionality

**Example from antiphish-solutions:**

> "We use a dual-layer monitoring system where `declarativeNetRequest` handles immediate blocking of known threats, while `webRequest` provides the deeper inspection needed for detailed audit trails and anomaly detection that declarativeNetRequest's limited API doesn't support."

### Cookie Permission Justification

**Security angle:**

- Cookie modification detection (typosquatting)
- Third-party cookie monitoring
- Session hijacking detection

**VPN angle:**

- Session consistency across proxy switches
- Cookie forwarding through tunnel

**Productivity angle:**

- Session restoration
- Multi-account management

**Example from antiphish-solutions:**

> "Typosquatting Detection: We analyze cookies to detect when you've landed on a typosquatted domain that's attempting to clone legitimate site cookies."

### Storage Permission Justification

**Universal arguments:**

- User preferences
- Configuration settings
- Threat intelligence updates
- Session history

**Example:**

> "We store threat landscape updates locally so protection works even offline and loads instantly without network delays."

### declarativeNetRequest Justification

**Security angle:**

- Block known malicious domains
- Redirect to warning pages
- Header manipulation for security

**VPN angle:**

- Dynamic routing rules
- Traffic redirection

**Example from antiphish-solutions:**

> "We convert suspicious URL patterns into dynamic blocking rules that intercept requests before they complete, redirecting you to a warning page."

---

## Pretext Design Workflow

### Step 1: Analyze Target User Profile

**Questions to ask:**

- What is their job role?
- What tools do they commonly use?
- What pain points can you address?
- What would they find credible?

**Example:**

- **Target**: Software developers
- **Pain point**: Managing multiple cloud service accounts
- **Pretext**: "DevCloud Manager" - manages credentials across AWS, Azure, GCP
- **Justification**: Needs `<all_urls>` to work with all cloud consoles, `cookies` for session management, `storage` for encrypted credentials

### Step 2: Map Permissions to Features

Create a table mapping each required permission to a specific feature in your pretext:

| Permission              | Feature                    | User Benefit              |
| ----------------------- | -------------------------- | ------------------------- |
| `<all_urls>`            | Universal threat detection | Protection on all sites   |
| `webRequest`            | Traffic inspection         | Detailed security logging |
| `declarativeNetRequest` | Threat blocking            | Fast automatic protection |
| `cookies`               | Cookie monitoring          | Typosquatting detection   |
| `storage`               | Threat database            | Offline protection        |

### Step 3: Create Feature List

Generate 4-6 key features that:

1. Sound legitimate and valuable
2. Naturally require the permissions
3. Can be demonstrated in code (even if non-functional)

**Example (anti-phishing):**

1. Real-Time Threat Detection
2. Smart Cookie Protection
3. Intelligent URL Analysis
4. Privacy-First Local Detection
5. Automatic Suspicious Domain Blocking

### Step 4: Generate Justification Content

Use AI (Claude, Cursor) with this prompt:

```
I'm creating a [pretext-name] Chrome extension that requires the following permissions:
- webRequest
- cookies
- storage
- declarativeNetRequest
- <all_urls>

The extension's purpose is: [describe pretext]

Generate permission justifications under 1000 words each that:
1. Explain the technical implementation
2. Show why each permission is essential
3. Reference specific features
4. Address security/privacy concerns
```

### Step 5: Validate with AskUserQuestion

Before proceeding, confirm with the user:

```
I recommend a "[pretext-name]" extension that [brief-description].

This pretext justifies the following hypercube-ng permissions:
- `<all_urls>`: [justification]
- `webRequest`: [justification]
- `cookies`: [justification]
- `storage`: [justification]
- `declarativeNetRequest`: [justification]

Does this pretext align with your engagement objectives?
```

---

## Red Flags to Avoid

**Don't:**

- Use overtly surveillance-focused language
- Claim "no permissions needed" then request extensive permissions
- Provide vague justifications ("for functionality")
- Use developer/debugging tools as pretext (raises suspicion)
- Copy-paste justifications without adapting to your pretext

**Do:**

- Focus on user benefit
- Be specific about technical implementation
- Provide concrete examples
- Show how protection fails without each permission
- Use security/privacy language (if security pretext)

---

## Pretext Templates

### Template 1: Anti-Phishing Security Tool

**Name**: "[Brand] Phishing Protector"

**Tagline**: "Your Advanced Defense Against Digital Deception"

**Key Features**:

1. Real-Time Threat Detection - Blocks known phishing domains
2. Smart Cookie Protection - Monitors suspicious cookie modifications
3. Intelligent URL Analysis - Detects deceptive domain patterns
4. Privacy-First Architecture - All detection happens locally
5. Automatic Domain Blocking - Converts threat intelligence to blocking rules

**Permission Mapping**:

- `<all_urls>`: Phishing can appear on any domain
- `webRequest`: Detailed request inspection for threat analysis
- `declarativeNetRequest`: Fast automatic blocking of known threats
- `cookies`: Typosquatting detection via cookie analysis
- `storage`: Local threat database for offline protection

**Source**: Complete example in `modules/hypercube-ng/examples/antiphish-solutions/`

### Template 2: VPN/Privacy Tool

**Name**: "[Brand] Privacy Shield"

**Tagline**: "Secure Your Browsing on Every Site"

**Key Features**:

1. Intelligent Traffic Routing - Routes requests through secure proxies
2. Cookie Isolation - Prevents cross-site tracking
3. Fingerprint Protection - Masks browser fingerprint
4. Session Persistence - Maintains VPN sessions across restarts
5. Dynamic Rule Updates - Adapts routing based on threat intelligence

**Permission Mapping**:

- `<all_urls>`: VPN must protect all browsing activity
- `webRequest`: Traffic inspection for routing decisions
- `declarativeNetRequest`: Dynamic routing rule injection
- `cookies`: Session management across proxy switches
- `storage`: VPN configuration and connection history

### Template 3: Collaboration Tool

**Name**: "[Brand] Meeting Assistant"

**Tagline**: "Enhance Every Video Meeting"

**Key Features**:

1. Smart Meeting Detection - Automatically detects video conferencing
2. Connection Optimizer - Improves WebRTC performance
3. Universal Compatibility - Works with all meeting platforms
4. Session Manager - Remembers preferences per platform
5. Background Blur - Privacy protection in any meeting tool

**Permission Mapping**:

- `<all_urls>`: Meeting platforms vary (Zoom, Teams, Meet, etc.)
- `webRequest`: WebRTC connection optimization
- `declarativeNetRequest`: Header modification for compatibility
- `cookies`: Session restoration across meetings
- `storage`: User preferences and meeting history

---

## Testing Your Pretext

### Self-Review Checklist

Before finalizing, ask:

1. **Credibility**: Would I install this extension as a normal user?
2. **Necessity**: Does each permission obviously support a stated feature?
3. **Consistency**: Do feature descriptions align with permission requests?
4. **Specificity**: Are justifications specific, not vague?
5. **Value**: Is the user benefit clear and compelling?

### Peer Review

Have someone unfamiliar with the engagement review your:

- Extension description
- Permission justifications
- Feature list

Ask: "Would you approve this for the Chrome Store?"

---

## AI-Assisted Pretext Generation

**Recommended prompt structure:**

```
Create a Chrome extension pretext for [engagement context].

Target users: [user profile]
Required permissions: webRequest, cookies, storage, declarativeNetRequest, <all_urls>

Generate:
1. Extension name and tagline
2. 5 key features that justify ALL permissions
3. Permission justifications (under 1000 words each)
4. Store description (500 words, marketing tone)
5. Privacy policy highlights

Make it credible, specific, and security-focused.
```

**Refinement iteration:**

Ask AI to revise based on:

- "Make permission justifications more technical"
- "Add specific implementation details"
- "Emphasize user privacy and security"
- "Reference industry standards (OWASP, etc.)"

---

## Example: Complete Pretext Package

**See**: `modules/hypercube-ng/examples/antiphish-solutions/` for:

- `description.md` - Full store description with marketing language
- `justifications.md` - Detailed permission justifications
- `website/index.htm` - Landing page
- `website/privacy-policy.htm` - Privacy policy
- `*.png` - Branding assets (8 files)

This is a production-ready example you can adapt for your engagement.

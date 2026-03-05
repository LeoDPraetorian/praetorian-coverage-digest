# Voice Profile and SEO Standards

## Purpose

This reference defines Praetorian's blog voice standards, SEO/AEO optimization requirements, and provides a concrete checklist example.

---

## Voice Profile: Praetorian Blog Standards

**Tone**: Professional but accessible. Avoid sensationalism while maintaining reader engagement.

**Target audience**: Security practitioners (red teamers, pentesters, security engineers) + technical decision-makers.

**Key characteristics:**

- Lead with technical accuracy over narrative flair
- Explain concepts for broader audience without dumbing down
- Use real proof-of-concept results, not hypotheticals
- Frame through attacker lens: what does defender see vs. attacker controls?
- Include practitioner tips that wouldn't appear in formal CVE descriptions

**Example title transformations:**

| Generic (avoid)                    | Praetorian voice (prefer)                             |
| ---------------------------------- | ----------------------------------------------------- |
| "Security Flaw in Healthcare App"  | "We Reported This Three Years Ago. It's Still There." |
| "API Key Vulnerability Found"      | "Never Share This Key Publicly - They Did Anyway"     |
| "Authentication Bypass Discovered" | "How a Six-Digit Code Becomes Zero Protection"        |

---

## Title Crafting Strategy

Generate 3 title options targeting different angles:

### 1. Narrative Hook (RECOMMENDED for Praetorian voice)

- Example: "We Reported This Three Years Ago. It's Still There."
- Pattern: Surprising timeline/contrast/irony

### 2. Technical Depth (for SEO)

- Example: "OTP Brute Force Attack Against Healthcare Apps: No Rate Limiting, No Security"
- Pattern: [Vulnerability Type] + [Target] + [Technical Detail]

### 3. Practitioner-Focused (for engagement)

- Example: "How a Six-Digit Code Becomes Zero Protection"
- Pattern: How/Why [Common Assumption] Fails

---

## SEO/AEO Best Practices

### Dual Optimization Strategy (2026)

**Critical Context**: 25% of organic search traffic is shifting to AI chatbots by 2026 (Gartner). Content must serve both traditional search engines AND answer engines.

**Implementation Pattern**:
- Lead each section with 1-2 sentence direct answer (AEO)
- Follow with long-form expansion (SEO)
- Use question-based H2/H3 headings
- Total word count: 1200-2500 words

**Example Structure**:
```markdown
### What Makes OTP Brute Force Attacks Possible?

**Direct Answer (AEO)**: OTP brute force succeeds when applications lack rate limiting, allowing attackers to enumerate all 1 million 6-digit combinations in minutes.

**Expanded Analysis (SEO)**: In our testing of the Abbott MyFreeStyle application, we discovered that the OTP endpoint implemented no throttling mechanisms whatsoever. This meant we could submit authentication attempts as fast as our network connection allowed...
```

### E-E-A-T Signals for Security Content

**Experience, Expertise, Authoritativeness, Trust** remain vital ranking factors. Every blog post must include:

- **Author credentials**: "Aaron W., Senior Security Researcher at Praetorian"
- **Original research data**: Actual POC results, timings, CVSS scores
- **Citations**: Link to CVEs, vendor advisories, industry standards
- **Methodology transparency**: Describe testing approach and constraints

### Title Crafting (5 Proven Patterns)

**Critical**: Search engines rewrite 62% of meta titles. Use intentional formulas under 60 characters.

1. **Vulnerability Formula**: `[Type] in [Product]: [Impact]`
   - Example: "Authentication Bypass in OAuth: Full Account Takeover"

2. **Discovery Formula**: `How We Discovered [X]`
   - Example: "How We Discovered a Critical SSRF in Microsoft Azure"

3. **Analysis Formula**: `Deep Dive: [Vulnerability/Technique]`
   - Example: "Deep Dive: Exploiting Race Conditions in JWT Validation"

4. **Impact Formula**: `[Number] [Systems] Vulnerable to [Attack]`
   - Example: "1M+ Kubernetes Clusters Vulnerable to RCE"

5. **Defensive Formula**: `Defending Against [Attack]: A [Role] Guide`
   - Example: "Defending Against Supply Chain Attacks: A DevOps Guide"

**Optimization Principles**:
- Front-load keywords for search visibility
- Use action verbs ("Discovered", "Exploiting", "Defending")
- Create curiosity while remaining specific
- Promise clear value to reader

### Meta Description

- **Length**: 150-155 characters (strict)
- **Include**: Primary keyword, value proposition
- **Tone**: Action-oriented, specific
- **Example**: "Abbott MyFreeStyle app exposed millions of diabetes patients to OTP brute force attacks with no rate limiting. We reported this three years ago."

### URL Slug

- **Length**: Under 60 characters
- **Format**: `/blog/{primary-keyword-dash-separated}`
- **Example**: `/blog/abbott-myfreestyle-otp-brute-force-healthcare`

### Internal Linking

- **Minimum**: 2 links to related vulnerability posts
- **Anchor text**: Descriptive (not "click here")
- **Target**: Posts with topical/technical relevance

### Image Optimization

- **Featured image**: 1200x630px (Open Graph standard)
- **Alt text**: Include keywords naturally
- **Example alt text**: "Abbott MyFreeStyle OTP brute force attack diagram showing 6-digit code enumeration"

### Schema Markup

- **Type**: Article (structured data)
- **Required fields**:
  - `headline`: Title of post
  - `author`: Author name (e.g., "Aaron W.")
  - `datePublished`: ISO 8601 format
  - `image`: Featured image URL

### AEO Target Questions

Generate 3-5 questions the blog will answer for voice search:

- "How do OTP brute force attacks work?"
- "What is rate limiting and why is it important?"
- "How can healthcare apps prevent authentication bypass?"

### Core Web Vitals Optimization

Technical SEO requirements for 2026:
- **Largest Contentful Paint (LCP)**: < 2.5 seconds
- **First Input Delay (FID)**: < 100 milliseconds
- **Cumulative Layout Shift (CLS)**: < 0.1

Ensure blog platform meets these thresholds for ranking.

---

## Example: Complete Checklist for Abbott MyFreeStyle Blog Post

```markdown
## Publishing Checklist

### Technical Validation

- [ ] **Disclosure timeline verified**
  - [ ] Date reported to Abbott: 2022-01-15
  - [ ] Date vendor acknowledged: 2022-01-22
  - [ ] Date fix deployed: 2022-04-10
  - [ ] CVE: None assigned (coordinated disclosure)
- [ ] **CVSS score calculated**
  - [ ] Vector: CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:H/A:N
  - [ ] Score: 9.1 (Critical)
  - [ ] Justification: Network-accessible, no auth required, complete account takeover
- [ ] **Proof-of-concept documented**
  - [ ] Test environment: Production-like (isolated test accounts)
  - [ ] Reproduction: 6-digit OTP brute forced in 8 minutes
  - [ ] Success rate: 100% (all test accounts compromised)
  - [ ] Tools: Custom Python script for OTP enumeration
- [ ] **Screenshots sanitized**
  - [ ] AWS account IDs: Redacted from API responses
  - [ ] Credentials: Test account tokens removed
  - [ ] URLs: `https://[REDACTED]/api/v2/auth` format used
  - [ ] Alt text: Added for accessibility

### Legal Review

- [ ] **Client approval**: NOT REQUIRED (Abbott is third-party vendor, not client)
- [ ] **Vendor response documented**
  - [ ] Disclosure email: 2022-01-15
  - [ ] Abbott acknowledgment: 2022-01-22
  - [ ] Fix confirmation: 2022-04-10
  - [ ] Communication thread saved: `/legal/disclosures/abbott-2022-01/`
- [ ] **Disclosure policy compliant**
  - [ ] 90-day timeline met (85 days from report to fix)
  - [ ] No exceptions required
- [ ] **NDA review**: NOT REQUIRED (Abbott is vendor, not client)

### SEO/AEO

- [ ] **Schema markup**
  - [ ] Article type with fields: headline, author (Aaron W.), datePublished, image
- [ ] **Meta description** (153 chars)
  - "Abbott MyFreeStyle app exposed millions of diabetes patients to OTP brute force attacks with no rate limiting. We reported this three years ago."
- [ ] **Internal links**
  - [ ] Link to: "OTP Security Best Practices" (2021-08-15)
  - [ ] Link to: "Healthcare App Security Audit Findings" (2022-06-22)
- [ ] **Image optimization**
  - [ ] Featured image: 1200x630, alt text "Abbott MyFreeStyle OTP brute force attack diagram"
  - [ ] Inline screenshot: alt text "API response showing successful OTP validation"
- [ ] **URL slug** (58 chars)
  - `/blog/abbott-myfreestyle-otp-brute-force-healthcare`

### Marketing Promotion

- [ ] **Social media**
  - [ ] Twitter thread (9 tweets):
    1. "We reported this three years ago. It's still there. 🧵"
    2. [Technical hook about OTP security]
    3. [Impact: millions of diabetes patients]
    4. [Disclosure timeline]
    5. [Technical deep-dive link]
    6. [Practitioner takeaway]
    7. [Related research]
    8. [Call-to-action: read full post]
    9. [Tag: @AbbottGlobal]
  - [ ] LinkedIn post:
    - Angle: "Healthcare IoT security challenges"
    - Target: CISOs, security architects
  - [ ] Reddit:
    - r/netsec: "Abbott MyFreeStyle OTP Brute Force: A Case Study in Healthcare API Security"
    - r/diabetes: [Check community rules for disclosure posts]
- [ ] **Graphics**
  - [ ] Featured image: Requested from design (medical device + lock icon concept)
  - [ ] Inline diagram: OTP brute force flow (6-digit space visualization)
- [ ] **Cross-promotion**
  - [ ] Update "Healthcare App Security" post with backlink
  - [ ] Newsletter: Feature in "Vulnerability of the Month" section
  - [ ] CMS: Create tag "Abbott" + "Healthcare IoT" + "OTP Security"
```

---

## Content Direction Guidelines

### Hook (100-150 words)

**Elements:**

- Opening narrative beat (relatable scenario or surprising fact)
- Stakes establishment (who's affected, what's at risk)
- Thesis statement (what this post will demonstrate)

**Voice notes:**

- Professional tone, avoid hyperbole
- Lead with concrete detail, not abstract threat
- Example: "Three years ago, we reported a critical vulnerability..." (specific) vs. "Healthcare apps are under attack..." (generic)

### Background Section

**H2 format**: Question-based for AEO

- Example: "What is Abbott MyFreeStyle?"

**Content:**

- Product/vendor overview (1 paragraph)
- User base and impact scope
- Why this matters to practitioners

### Technical Deep-Dive

**H2 format**: "How the Attack Works" or similar

**Content:**

- Step-by-step attack chain
- Technical diagrams/screenshots
- Proof-of-concept results with actual timings
- Defense mechanisms that failed

### Practitioner Takeaways

**H2 format**: "What Security Teams Should Know"

**Content:**

- Actionable recommendations
- Detection strategies
- Mitigation patterns
- Related vulnerability classes

---

## Quality Gates

Before publishing, verify:

1. **Voice consistency**: Matches Praetorian standards (professional + accessible)
2. **SEO compliance**: All checklist items completed
3. **Technical accuracy**: Engineer markers resolved
4. **Legal clearance**: Client approval/NDA review (if required)
5. **Marketing readiness**: Social content drafted, graphics requested

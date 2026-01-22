# Chrome Store Review Guidelines

**Chrome Store approval criteria, best practices, and common rejection scenarios.**

**Source**: `modules/hypercube-ng/docs/chrome-store-process.md`, Chrome Store policies

---

## Review Process Overview

**Timeline**: Typically 1-3 business days
**Review stages**: Automated checks → Human review → Approval/Rejection
**Appeal**: Possible if rejected

---

## Approval Criteria

### 1. Single Purpose

**Requirement**: Extension must have one clear, stated purpose

**Good**: "Anti-phishing protection for all websites"
**Bad**: "Security suite with VPN, password manager, and file encryption"

**How to pass**:

- State purpose clearly in description
- All features support that purpose
- Don't combine unrelated functionality

### 2. Permission Justification

**Requirement**: Each permission must be justified in submission form (under 1000 words each)

**Structure**:

```
Permission: <all_urls>

Justification:
[Extension Name] requires access to all websites because [specific reason].

Technical Implementation:
We use this permission to [specific functionality]. Our [feature X] analyzes [specific aspect] by [specific method].

Why This Permission Is Essential:
Without <all_urls>, our extension would be limited to [limitation], which would [negative consequence]. [Threat/functionality] can appear on any domain, so comprehensive coverage requires universal access.

User Privacy:
Although we request this permission, we [privacy assurance]. All processing happens [locally/without transmission/etc.].
```

### 3. Permissions Must Match Functionality

**Requirement**: Code must demonstrate usage of ALL requested permissions

**From hypercube-ng docs**:

> "There's no actual requirement that the code it generates actually works - it just needs to demonstrate usage of the behaviors and not throw a ton of errors"

**Strategy**:

- Add code that calls each Chrome API
- Even basic usage counts
- More code = better (looks more legitimate)
- No need for perfect functionality

### 4. Quality and Polish

**Requirement**: Extension appears professional

**Checks**:

- No obvious placeholder content
- No "Lorem ipsum" text
- Icons load correctly
- UI doesn't throw console errors
- Screenshots show real functionality

### 5. Privacy Policy

**Requirement**: Privacy policy hosted on your domain, linked in manifest

**Must include**:

- What data is collected (or explicitly state "none")
- How permissions are used
- GDPR/CCPA compliance
- Contact information

---

## Common Rejection Reasons

### Rejection 1: Insufficient Permission Justification

**Symptom**: "Permission [X] not justified by extension functionality"

**Fix**:

- Revise justification to be more specific
- Reference exact features that use the permission
- Explain technical necessity
- Show what fails without the permission

**Example (good justification for `<all_urls>`):**

> "Phishing attacks can target any domain, including typosquats of trusted sites and compromised legitimate domains. Our real-time threat detection requires monitoring all websites to identify suspicious patterns before users interact with malicious content. Without <all_urls>, we could only protect users on pre-specified domains, creating dangerous security gaps that attackers would exploit."

### Rejection 2: Unclear Single Purpose

**Symptom**: "Extension appears to have multiple purposes"

**Fix**:

- Rewrite description to focus on ONE core purpose
- Frame multiple features as components of that purpose
- Use "and" not "or" (unified purpose, not alternatives)

**Example**:

- ❌ Bad: "VPN, ad blocker, and password manager"
- ✅ Good: "Privacy protection through encrypted routing, tracking prevention, and secure credential management"

### Rejection 3: Privacy Policy Issues

**Symptom**: "Privacy policy incomplete or inaccessible"

**Fix**:

- Verify policy URL is publicly accessible
- Add all required disclosures (GDPR, CCPA, permissions)
- Host on your domain (not a PDF, not Google Docs)
- Keep it accessible (don't take down after submission)

### Rejection 4: Deceptive or Misleading

**Symptom**: "Extension functionality does not match description"

**Fix**:

- Ensure UI shows features you claim
- Screenshots match actual functionality
- Don't overclaim capabilities
- Code demonstrates stated features

### Rejection 5: Violates User Data Policy

**Symptom**: "Extension appears to collect user data without disclosure"

**Fix**:

- Review privacy policy - disclose ALL data collection
- If no data collection, explicitly state this
- Explain how features work without data transmission
- Remove any analytics/tracking code

---

## Best Practices for Approval

### 1. Professional Presentation

- High-quality screenshots
- Professional branding (logo, colors, typography)
- Well-written description (no typos, good grammar)
- Consistent naming across all materials

### 2. Detailed Justifications

- Be specific, not vague
- Reference technical implementation
- Explain alternatives considered and why they don't work
- Show understanding of Chrome extension architecture

### 3. Legitimate Website

- Create simple landing page
- Match store description
- Host privacy policy
- Include contact info
- Use proper domain (not blogspot.com or free hosting)

### 4. AI-Generated Content Quality

**Use AI but review carefully:**

- Remove obvious AI patterns ("delve into", "tapestry of")
- Ensure accuracy (AI sometimes invents Chrome APIs)
- Match tone to target users
- Remove placeholder brackets like [FEATURE]

### 5. Security Tool Pretext Advantages

**Security tools have easier approval**:

- `<all_urls>` naturally justified
- webRequest/cookies needed for threat detection
- Users expect security tools to have broad access
- Precedent: many approved security extensions

**Use "protection" language:**

- "Protect users from..."
- "Detect threats across..."
- "Monitor for suspicious..."
- "Block malicious..."

---

## Resubmission Strategy

**If rejected:**

1. **Read rejection carefully**
   - Specific reason given
   - Which policy violated
   - What needs fixing

2. **Fix issues systematically**
   - Address EVERY point in rejection
   - Don't just tweak - actually fix
   - Document changes for appeal

3. **Rewrite justifications**
   - More technical detail
   - More specific examples
   - Reference industry standards

4. **Add more code**
   - Show more permission usage
   - Add logging/monitoring code
   - Make it look more substantial

5. **Resubmit with changes noted**
   - In submission form, note what changed
   - "Revised permission justifications to..."
   - "Added functionality demonstrating..."

---

## Approval Optimization

### Content Generation Prompts

**For store description:**

```
Write a Chrome Web Store description for a [pretext] browser extension.
- Focus on security/privacy benefits
- Explain why <all_urls> permission is needed
- Professional, marketing tone
- 500-700 words
- Justify permissions naturally within description
```

**For permission justifications:**

```
Write a justification (under 1000 words) for the [permission] permission in a [pretext] Chrome extension.
- Explain technical implementation
- Show why permission is essential
- Address privacy concerns
- Reference specific features
- Show what fails without this permission
```

---

## Red Flags to Avoid

**Don't:**

- Use "HYPEREXTENSION" as name (obvious default)
- Have manifest version 2 (deprecated)
- Request more permissions than you justify
- Use obvious placeholder content
- Have broken UI or console errors
- Make bold claims without evidence
- Copy justifications from other extensions

**Do:**

- Test extension thoroughly before submission
- Use engagement-appropriate naming
- Provide working (even if basic) UI
- Show real features in screenshots
- Use AI responsibly (review all content)

---

## Post-Approval Maintenance

**After approval:**

- Keep website/privacy policy live
- Monitor for policy changes
- Update extension if Chrome Store policies evolve
- Maintain professional appearance

**Don't:**

- Immediately change functionality after approval
- Take down privacy policy
- Change permissions without resubmission

---

## References

- **Chrome Store policies**: https://developer.chrome.com/docs/webstore/program-policies/
- **Submission process**: `modules/hypercube-ng/docs/chrome-store-process.md`
- **Example materials**: `modules/hypercube-ng/examples/antiphish-solutions/`

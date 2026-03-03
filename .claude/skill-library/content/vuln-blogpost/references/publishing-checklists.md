# Publishing Checklist Templates

## Purpose

Every blog post outline MUST include a comprehensive publishing checklist. This prevents publication of incomplete, legally risky, or SEO-deficient content.

## 90-Day Disclosure Standard (Industry Convergence)

**Critical Context**: Industry is converging on 90-day responsible disclosure window, with explicit acceleration for active exploitation.

### Timeline Framework

- **Standard vulnerabilities**: 90 days from vendor notification to public disclosure
- **Critical vulnerabilities (actively exploited)**: 7 days maximum
- **Unresponsive vendors**: 45 days minimum before disclosure (CISA model)
- **Alternative models**: 60 days (Rapid7), 60-120 days (industry range)

### Legal Protections

**Test only with authorization**:
- Obtain written permission before security testing
- Avoid privacy violations, data destruction, system disruption
- Use exploits only to extent necessary to confirm vulnerability

### CVE Coordination Requirements

**Mandatory Steps**:
1. **CVE Assignment**: Request through CISA (cve-coordination@cisa.dhs.gov) or vendor CNA
2. **Vendor Notification**: Document timeline and vendor responses
3. **Standards Alignment**: Follow ISO/IEC 29147 (disclosure) and 30111 (handling)
4. **Framework Compliance**: CISA CVD program or ENISA guidelines

**Documentation Required**:
- Initial disclosure email to vendor
- Vendor acknowledgment receipt
- Patch deployment confirmation or 90-day expiration notice
- CVE ID assignment confirmation

## Core Template Structure

```yaml
# Auto-populated from Phase 1 analysis and Phase 2 anonymization
publishing_checklist:
  technical_validation: {}
  legal_review: {}
  seo_aeo: {}
  marketing_promotion: {}
```

## Section 1: Technical Validation

**Template (YAML format for outline reference):**

```yaml
technical_validation:
  disclosure_timeline_verified:
    items:
      - date_vulnerability_reported: "YYYY-MM-DD"
      - date_vendor_acknowledged: "YYYY-MM-DD"
      - date_fix_deployed: "YYYY-MM-DD or 'Still vulnerable as of {date}'"
      - public_disclosure_date: "YYYY-MM-DD"
      - cve_id: "CVE-YYYY-NNNNN or 'None assigned'"
    status: PENDING
    marker_reference: "[ENGINEER TO COMPLETE: Disclosure timeline...]"

  cvss_score_calculated:
    items:
      - cvss_vector_string: "CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:H/A:N"
      - numeric_score: "X.X"
      - severity_rating: "Low/Medium/High/Critical"
      - attack_complexity_justification: "Rationale for AC rating"
    status: PENDING
    marker_reference: "[ENGINEER TO COMPLETE: CVSS score...]"

  proof_of_concept_documented:
    items:
      - test_environment: "local/production-like/staging"
      - reproduction_steps: "Step-by-step POC"
      - actual_results: "Timing, success rate, evidence"
      - tools_used: "Burp Suite, custom scripts, etc."
    status: PENDING
    marker_reference: "[ENGINEER TO COMPLETE: Proof-of-concept results...]"

  screenshots_sanitized:
    items:
      - aws_account_ids_redacted: true
      - internal_credentials_removed: true
      - client_identifying_info_masked: true
      - urls_sanitized: "per anonymization rubric"
      - alt_text_added: "for accessibility"
    status: PENDING
    marker_reference: "[ENGINEER TO COMPLETE: Screenshot showing...]"
```

**Markdown checklist format (for blog outline):**

```markdown
## Publishing Checklist

### Technical Validation

- [ ] **Disclosure timeline verified**
  - [ ] Date vulnerability reported: **\_\_\_**
  - [ ] Date vendor acknowledged: **\_\_\_**
  - [ ] Date fix deployed (or current status): **\_\_\_**
  - [ ] CVE ID (if assigned): **\_\_\_**
- [ ] **CVSS score calculated**
  - [ ] CVSS 3.1 vector string documented
  - [ ] Numeric score with severity rating
  - [ ] Attack complexity justified
- [ ] **Proof-of-concept documented**
  - [ ] Test environment details included
  - [ ] Reproduction steps validated
  - [ ] Actual results with timing/success rate
- [ ] **Screenshots sanitized**
  - [ ] AWS account IDs redacted
  - [ ] Internal credentials removed
  - [ ] Client-identifying information masked
  - [ ] URLs sanitized per anonymization rubric
```

## Section 2: Legal Review

**Template (YAML format):**

```yaml
legal_review:
  disclosure_timeline:
    standard: "90_day_coordinated_disclosure"
    critical_exception: "7_day_if_actively_exploited"
    date_vendor_notified: "YYYY-MM-DD"
    date_90_day_window_expires: "YYYY-MM-DD"
    active_exploitation_detected: yes | no
    timeline_compliant: yes | no

  cve_coordination:
    cve_id: "CVE-YYYY-NNNNN or 'Requested from CISA'"
    cve_assignment_authority: "CISA | Vendor CNA | Other"
    iso_iec_29147_compliant: yes | no
    iso_iec_30111_compliant: yes | no
    status: ASSIGNED | PENDING | NOT_REQUIRED

  client_approval:
    required_if: vulnerability_in_client_product
    evidence_required: "email confirmation or contract clause"
    deadline: "90_days_from_disclosure_date"
    status: REQUIRED | NOT_REQUIRED
    sign_off_from: "[name/email]"

  vendor_response:
    required_if: vendor_identified_in_post
    evidence_required: "disclosure communication thread"
    status: DOCUMENTED | PENDING
    vendor_contact: "[name/email]"

  disclosure_policy_compliant:
    standard: "90_day_coordinated_disclosure"
    exceptions_documented: yes | no
    exception_reason: "[if applicable]"

  nda_review:
    required_if: client_relationship_active
    sign_off_from: "[legal team member name]"
    status: CLEARED | PENDING
```

**Markdown checklist format:**

```markdown
### Legal Review

- [ ] **90-Day Disclosure Timeline**
  - [ ] Vendor notified: [YYYY-MM-DD]
  - [ ] 90-day window expires: [YYYY-MM-DD]
  - [ ] Active exploitation check: [YES/NO - if YES, 7-day exception applies]
  - [ ] Timeline compliant: [YES/NO]
- [ ] **CVE Coordination**
  - [ ] CVE ID assigned: [CVE-YYYY-NNNNN or 'Pending']
  - [ ] Assignment authority: [CISA/Vendor CNA/Other]
  - [ ] ISO/IEC 29147 compliant (disclosure): [YES/NO]
  - [ ] ISO/IEC 30111 compliant (handling): [YES/NO]
- [ ] **Client approval** (if REQUIRED)
  - [ ] Written approval obtained
  - [ ] Evidence: [email/contract clause reference]
  - [ ] Deadline: [90 days from disclosure]
- [ ] **Vendor response documented**
  - [ ] Disclosure communication thread saved
  - [ ] Vendor acknowledgment received
  - [ ] Patch status: [DEPLOYED/PENDING/UNRESPONSIVE]
- [ ] **Disclosure policy compliance**
  - [ ] Meets 90-day coordinated disclosure standard
  - [ ] Exceptions documented (if applicable)
- [ ] **NDA review** (if client relationship active)
  - [ ] Legal team sign-off: [name]
  - [ ] No prohibited information disclosed
```

## Section 3: SEO/AEO Requirements

**Template (YAML format):**

```yaml
seo_aeo:
  schema_markup:
    type: Article
    required_fields:
      - headline: true
      - author: true
      - datePublished: true
      - image: true
    status: PENDING

  meta_description:
    max_length: 155
    includes_target_keyword: yes | no
    draft: "[150-155 character description]"
    status: PENDING

  internal_links:
    minimum: 2
    target: related_vulnerability_posts
    candidates:
      - "[Post title 1]"
      - "[Post title 2]"
    status: PENDING

  image_optimization:
    all_images_have_alt: yes | no
    alt_text_includes_keywords: yes | no
    featured_image_size: "1200x630"
    status: PENDING

  url_slug:
    max_length: 60
    includes_primary_keyword: yes | no
    draft: "[proposed-url-slug]"
    status: PENDING
```

**Markdown checklist format:**

```markdown
### SEO/AEO

- [ ] **Schema markup implemented**
  - [ ] Article type with required fields (headline, author, datePublished, image)
- [ ] **Meta description**
  - [ ] Under 155 characters
  - [ ] Includes target keyword
  - [ ] Draft: **\_\_\_**
- [ ] **Internal links**
  - [ ] Minimum 2 links to related vulnerability posts
  - [ ] Candidates: [Post 1], [Post 2]
- [ ] **Image optimization**
  - [ ] All images have alt text
  - [ ] Alt text includes keywords
  - [ ] Featured image: 1200x630px
- [ ] **URL slug**
  - [ ] Under 60 characters
  - [ ] Includes primary keyword
  - [ ] Draft: **\_\_\_**
```

## Section 4: Marketing Promotion

**Template (YAML format):**

```yaml
marketing_promotion:
  social_media:
    twitter_thread:
      tweets_drafted: 7-10
      hook_tweet: "[compelling opening]"
      status: PENDING
    linkedin_post:
      professional_angle: "[B2B framing]"
      status: PENDING
    reddit_targeting:
      subreddits: ["r/netsec", "r/websecurity"]
      submission_title: "[Reddit-friendly title]"
      status: PENDING

  graphics:
    featured_image:
      size: "1200x630"
      design_brief: "[visual concept]"
      status: REQUESTED
    inline_diagrams:
      required_for: ["[Section name]"]
      status: PENDING

  cross_promotion:
    related_posts_updated: yes | no
    backlinks_added: yes | no
    newsletter_feature_scheduled: yes | no
    vendor_tag_created: yes | no
```

**Markdown checklist format:**

```markdown
### Marketing Promotion

- [ ] **Social media**
  - [ ] Twitter thread drafted (7-10 tweets)
  - [ ] LinkedIn post with professional angle
  - [ ] Reddit targeting (r/netsec, r/websecurity)
- [ ] **Graphics**
  - [ ] Featured image requested (1200x630px)
  - [ ] Inline diagrams for complex sections
- [ ] **Cross-promotion**
  - [ ] Related blog posts updated with backlinks
  - [ ] Newsletter feature scheduled
  - [ ] Vendor/product tag created in CMS
```

## Auto-Population Logic

Checklist items auto-populate based on:
- **Phase 1 Analysis**: High impact → CVSS priority HIGH, POC gaps → CRITICAL_GAP
- **Phase 2 Anonymization**: Client approval pending → legal gate REQUIRED, vendor preserved → response REQUIRED
- **Engineer Markers**: >15 markers → HIGH_COMPLEXITY status

## Two-Tier Handoff Documentation Pattern

**Pattern**: Separate project-level context from technical implementation details, with mandatory overlap period.

### Tier 1: Project-Level Documentation

- **Business Purpose**: Why this vulnerability matters to organization
- **Background Information**: Discovery context, affected systems, timeline
- **Publishing Timeline**: Disclosure status, CVE coordination, publication schedule
- **User-Facing Documentation**: How to reproduce vulnerability, impact demonstration

### Tier 2: Technical Documentation

- **Architecture and Systems**: Affected components, dependency mapping
- **Proof of Concept Code**: Reproduction scripts, test harnesses
- **Testing Procedures**: Tests as executable documentation
- **Deployment Considerations**: Mitigation strategies, patch deployment notes

### Three Audience Sections

1. **User Support**: How to use/reproduce the vulnerability
2. **QA Workflow**: How to validate findings and regression testing
3. **Technical Details**: Code structure, data models, test suites

### Critical Success Factor: Overlap Period

**Requirement**: Minimum 1 month transition period
- **Week 1-2**: Documentation creation by original researcher
- **Week 3-4**: Knowledge transfer with original researcher available for Q&A
- **Rationale**: Communicating "how" and "why," not just "what"

### Centralized Storage

- **Git Repository**: `${REPO_ROOT}/.claude/.output/blog-posts/{vuln-id}/`
- **Confluence/Notion**: Workspace for collaborative editing
- **Version Control**: Track changes and maintain audit trail

## Validation Before Publishing

**Final checklist verification:**

1. **All checkboxes marked**: No `[ ]` should remain unchecked
2. **Evidence collected**: Links/references for all required items
3. **Engineer markers resolved**: `grep "[ENGINEER TO COMPLETE:" returns 0 results`
4. **Legal sign-off**: If required, documented approval obtained
5. **SEO elements finalized**: Meta description, URL slug, schema markup implemented
6. **Handoff documentation complete**: Both tiers documented with overlap period scheduled

**Blocker detection:**

If ANY of these remain incomplete, post CANNOT be published:

- Client approval (when REQUIRED)
- Disclosure timeline verification
- Screenshot sanitization
- NDA review (when REQUIRED)
- Handoff documentation (if engineering transition required)

**Publishing decision tree:**

```
All technical validation complete? → YES
All legal gates cleared? → YES
All SEO requirements met? → YES
Marketing promotion scheduled? → YES
Handoff documentation ready? → YES (or N/A)
→ APPROVED FOR PUBLICATION

Any blocker present? → YES
→ HOLD PUBLICATION, resolve blocker first
```

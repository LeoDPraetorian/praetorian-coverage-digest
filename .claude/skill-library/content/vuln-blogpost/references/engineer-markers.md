# Engineer Marker Automation

## Purpose

Engineer markers (`[ENGINEER TO COMPLETE: ...]`) flag gaps in the outline that require technical validation before publishing. These are NOT optional placeholders - they're quality gates preventing incomplete or inaccurate blog posts.

## Automated Pattern Matching

The skill automatically inserts markers when transcript analysis reveals these patterns:

| Pattern in Transcript                                      | Marker Inserted                                                                                |
| ---------------------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| Mentions "disclosed", "reported", "timeline" without dates | `[ENGINEER TO COMPLETE: Disclosure timeline - {date} reported, {date} fixed, {date} deployed]` |
| Severity mentioned without CVSS                            | `[ENGINEER TO COMPLETE: CVSS score - currently estimated at {X.X}]`                            |
| Numeric claims without attribution                         | `[ENGINEER TO COMPLETE: Source for "{statistic}" claim]`                                       |
| Technical descriptions needing visual proof                | `[ENGINEER TO COMPLETE: Screenshot showing {specific behavior}]`                               |
| API paths/URLs in detail                                   | `[ENGINEER TO COMPLETE: Sanitize endpoint URLs for publication approval]`                      |
| "Millions of users", "large user base"                     | `[ENGINEER TO COMPLETE: Exact user base numbers if approved for disclosure]`                   |
| References to "our testing" without result details         | `[ENGINEER TO COMPLETE: Proof-of-concept timing - {X} attempts in {Y} minutes]`                |

## Detailed Pattern Recognition

### 1. Disclosure Timeline Gaps

**Trigger phrases:**

- "We reported this to the vendor"
- "Vulnerability was disclosed"
- "They fixed it eventually"
- "Still waiting for a patch"

**Missing information:**

- Date vulnerability reported
- Date vendor acknowledged
- Date fix deployed (or current status if unfixed)
- CVE ID (if assigned)

**Marker format:**

```markdown
[ENGINEER TO COMPLETE: Disclosure timeline

- Reported: {YYYY-MM-DD}
- Vendor acknowledged: {YYYY-MM-DD}
- Fix deployed: {YYYY-MM-DD or "Still vulnerable as of {date}"}
- CVE: {CVE-YYYY-NNNNN or "None assigned"}
  ]
```

**Placement**: In "Background" or "Disclosure Timeline" section

### 2. CVSS Score Calculation

**Trigger phrases:**

- "High severity"
- "Critical vulnerability"
- "Could lead to [impact]"
- Severity mentioned without numeric score

**Missing information:**

- CVSS 3.1 vector string
- Numeric score (0.0-10.0)
- Severity rating (Low/Medium/High/Critical)
- Attack complexity justification

**Marker format:**

```markdown
[ENGINEER TO COMPLETE: CVSS score

- CVSS 3.1 Vector: {vector string}
- Score: {X.X} ({Severity})
- Attack Complexity: {justification}
- Currently estimated at {X.X} based on transcript
  ]
```

**Placement**: Early in outline (metadata or first section)

### 3. Proof-of-Concept Results

**Trigger phrases:**

- "We tested this"
- "Our POC showed"
- "Successfully exploited"
- "Brute forced the OTP"

**Missing information:**

- Exact timing (how long did attack take?)
- Success rate (100% success or multiple attempts?)
- Test environment details
- Tools used

**Marker format:**

```markdown
[ENGINEER TO COMPLETE: Proof-of-concept results

- Test environment: {local/production-like/staging}
- Tools: {Burp Suite, custom script, etc.}
- Timing: Successful exploit in {X minutes/hours}
- Success rate: {Y}% success across {Z} attempts
  ]
```

**Placement**: In "Technical Analysis" or "Exploitation" section

### 4. Screenshot Requirements

**Trigger phrases:**

- "The dashboard showed"
- "API returned sensitive data"
- "We captured traffic showing"
- Descriptions of visual elements without proof

**Missing information:**

- Screenshot file path
- Sanitization confirmation
- Alternative text for accessibility
- Context caption

**Marker format:**

```markdown
[ENGINEER TO COMPLETE: Screenshot showing {specific behavior}

- File: {path to sanitized screenshot}
- Alt text: "{descriptive alt text}"
- Caption: "{context for reader}"
- Verification: AWS IDs, credentials, client info redacted
  ]
```

**Placement**: Inline where visual proof is needed

### 5. API Endpoint Sanitization

**Trigger phrases:**

- Mentions specific API paths
- References production URLs
- Describes internal endpoints

**Missing information:**

- Sanitized version of URL
- Confirmation no client-identifying domains remain
- Generic pattern if full URL not necessary

**Marker format:**

```markdown
[ENGINEER TO COMPLETE: Sanitize endpoint URLs

- Original (internal): {full production URL}
- Public version: https://[REDACTED]/api/v2/users
- Verification: No client domain, AWS account ID, or internal IPs exposed
  ]
```

**Placement**: Inline where URL is mentioned

### 6. User Statistics / Metrics

**Trigger phrases:**

- "Millions of users"
- "Large user base"
- "Widely deployed"
- "X percent of customers"

**Missing information:**

- Exact numbers (if approved for disclosure)
- Source of statistic
- Client approval status for specific metrics

**Marker format:**

```markdown
[ENGINEER TO COMPLETE: User base metrics

- Generic claim: "millions of users"
- Exact number (if approved): {X.X million active users}
- Source: {company SEC filing, press release, client approval}
- Disclosure status: {approved/pending approval}
  ]
```

**Placement**: In "Background" or "Impact" section

### 7. Source Attribution for Claims

**Trigger phrases:**

- Statistics without sources
- Industry claims
- Comparative statements ("most common", "rarely seen")

**Missing information:**

- Source URL or citation
- Date of data
- Credibility verification

**Marker format:**

```markdown
[ENGINEER TO COMPLETE: Source for "{claim}"

- Claim: "{exact text from outline}"
- Source: {URL or citation}
- Date: {when data was published}
- Verification: Credible source (research org, vendor, regulatory body)
  ]
```

**Placement**: Inline or in footnotes section

## Engineer Marker Density Guidelines

**Typical marker counts per blog post:**

- Low complexity (basic vulnerability): 5-8 markers
- Medium complexity (multi-step exploit): 10-15 markers
- High complexity (novel research): 15-20+ markers

**Red flag**: If outline has <3 markers for a vulnerability blog post, manually review for missed gaps.

## Integration with Publishing Checklist

Engineer markers automatically populate the "Technical Validation" section of the publishing checklist:

```yaml
technical_validation:
  - disclosure_timeline_verified:
      status: ENGINEER_TO_COMPLETE
      marker_id: [section reference]
  - cvss_score_calculated:
      status: ENGINEER_TO_COMPLETE
      marker_id: [section reference]
  - screenshots_sanitized:
      status: ENGINEER_TO_COMPLETE
      marker_id: [section reference]
```

## Completion Workflow

### Engineer Responsibilities

1. **Locate all markers**: Search outline for `[ENGINEER TO COMPLETE:`
2. **Gather information**: Collect required data from:
   - Disclosure communication threads
   - CVSS calculator
   - Test environment logs
   - Screenshot files
3. **Replace markers**: Update with actual data
4. **Verify**: Cross-reference checklist to ensure all markers addressed

### Example: Before and After

**Before (outline with marker):**

```markdown
## Disclosure Timeline

The vulnerability was reported to Abbott in early 2022.

[ENGINEER TO COMPLETE: Disclosure timeline

- Reported: {YYYY-MM-DD}
- Vendor acknowledged: {YYYY-MM-DD}
- Fix deployed: {YYYY-MM-DD or "Still vulnerable as of {date}"}
- CVE: {CVE-YYYY-NNNNN or "None assigned"}
  ]
```

**After (engineer completed):**

```markdown
## Disclosure Timeline

The vulnerability was reported to Abbott on January 15, 2022. Abbott acknowledged receipt on January 22, 2022, and deployed a fix to production on April 10, 2022. No CVE was assigned as the vulnerability was addressed through coordinated disclosure.

**Timeline:**

- Reported: 2022-01-15
- Vendor acknowledged: 2022-01-22
- Fix deployed: 2022-04-10
- CVE: None assigned
```

## Anti-Patterns

### 1. Ignoring Obvious Gaps

❌ **Wrong:**

```markdown
The application has poor authentication security.
```

✅ **Right:**

```markdown
The application has poor authentication security.

[ENGINEER TO COMPLETE: Specific authentication weakness - OTP brute force, session fixation, or other mechanism]
```

### 2. Vague Markers

❌ **Wrong:**

```markdown
[ENGINEER TO COMPLETE: Add more details here]
```

✅ **Right:**

```markdown
[ENGINEER TO COMPLETE: CVSS score calculation

- Vector string
- Numeric score with severity rating
- Attack complexity justification
  ]
```

### 3. Leaving Markers in Published Post

**Critical error**: Blog posts must NEVER be published with `[ENGINEER TO COMPLETE:` markers remaining.

**Prevention**: Publishing checklist includes validation step:

```yaml
technical_validation:
  - all_engineer_markers_resolved:
      verification: grep for "[ENGINEER TO COMPLETE:" returns 0 results
```

### 4. Over-Marking

❌ **Wrong:** Inserting markers for information already present

```markdown
Abbott is a Fortune 500 healthcare company.

[ENGINEER TO COMPLETE: Verify Abbott is Fortune 500]
```

✅ **Right:** Only mark actual gaps

```markdown
Abbott is a Fortune 500 healthcare company (NYSE:ABT).

# No marker needed - information is complete
```

## Marker Validation Checklist

Before finalizing outline:

- [ ] All patterns from automation table checked
- [ ] Each marker includes specific completion criteria
- [ ] Marker placement is in relevant section (not bunched at end)
- [ ] Markers reference specific missing data (not vague)
- [ ] Marker count proportional to complexity (5-20 typical)
- [ ] Publishing checklist populated from marker inventory

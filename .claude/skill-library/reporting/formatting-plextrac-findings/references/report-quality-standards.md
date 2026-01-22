# Report Quality Standards

**Critical quality checks derived from real assessment feedback to ensure professional, client-ready deliverables.**

---

## Client Quote Handling

**CRITICAL RULE:** Never include verbatim client quotes in findings. Always paraphrase professionally.

**Why:** Direct quotes can create defensive or contentious environment when clients read their own statements in formal reports.

### Example Transformations

| ❌ Verbatim Quote                                                                                                      | ✅ Professional Paraphrase                                                                                                                                  |
| ---------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `stating "this seems really bad"`                                                                                      | `acknowledged this as a significant security concern`                                                                                                       |
| `"This is definitely a weak point..."`                                                                                 | `Security team identified this configuration as a vulnerability requiring remediation`                                                                      |
| `"We've tried and failed many times..."`                                                                               | `Security team reported that despite multiple attempts, the functionality proved unreliable`                                                                |
| `"Both stronger from the certificate perspective, but weaker from the authentication user authentication perspective"` | `Acknowledged the security tradeoff, noting the configuration maintains hardware-backed certificate strength while accepting weaker authentication factors` |

### Application

- Paraphrase all statements from interviews, walkthrough calls, and email exchanges
- Use third-person professional voice: "Administrators explained...", "Security team confirmed...", "Client acknowledged..."
- Preserve technical accuracy while removing conversational tone
- Never include client names in quotes unless explicitly approved for attribution

---

## Internal Reference Removal

**CRITICAL RULE:** Remove all internal tracking references and file paths from findings before final report.

### Must Remove

- ❌ `.claude/.output/okta-assessments/2026-01-09-salesforce/findings/PHASE3-screen-sharing-review.md:35-37`
- ❌ `Source Files:` sections with internal directory paths
- ❌ File system paths from evidence sections (`/Users/john.novak/...`, `./analysis/...`)
- ❌ Internal document citations (`.local/`, `.history/`, internal wiki links)
- ❌ Line number references from source files (`:35-37`, `line 142`)
- ❌ Internal project codenames or identifiers

### Must Keep

- ✅ Independently verifiable evidence (JSON excerpts, API responses, DNS output, policy configurations)
- ✅ Public documentation references (vendor docs, CVE links, NIST guidance)
- ✅ Vendor configuration files (sanitized to remove client-specific data)
- ✅ Command output that client can reproduce (`curl`, `dig`, `nmap`, API queries)

### Why This Matters

Internal references are meaningless to clients and unprofessional in deliverables. They also expose your internal workflow and file structure, which may contain confidential information about other clients or internal processes.

### Verification Step

Before finalizing findings, search for:

- `.claude`
- `.local`
- `.history`
- `/Users/`
- `.md:`
- `findings/`
- `Source Files:`

If found, remove or rewrite to reference only the evidence itself, not where you stored it internally.

---

## Priority Label Handling

**CRITICAL DISTINCTION:** Policy priority (technical data) vs. Project priority (internal labels)

### ✅ ACCEPTABLE: Priority Numbers from Okta Policy JSON

These are technical configuration data describing policy evaluation order:

- `"priority": 5` field from Okta policy export JSON
- "MFA Enrollment Policy (Priority 5)" in Systems Impacted section
- "Policy evaluation order: Priority 1 (highest) → Priority 8 (lowest)"

**Why OK:** These describe actual system configuration, not project timelines. Okta evaluates policies in priority order (1 = highest priority), so documenting "priority: 5" is technical factual information.

### ❌ UNACCEPTABLE: Internal Project Prioritization

These are internal project management labels, not client-facing language:

- `P0 within 7 days`
- `P1 within 30 days`
- `P2 within 90 days`
- `P3 within 180 days`
- `Priority: P1` (at end of Remediation section)

**Why Not OK:** P0/P1/P2/P3 notation is internal Praetorian project shorthand. Clients don't know what "P0" means, and the timelines (7 days, 30 days) are often unrealistic for enterprise organizations.

### Replacement: Descriptive Timeline Labels

Use business-appropriate, realistic timelines:

- `Immediate (Within 14-30 Days)` - Critical security gaps requiring urgent attention
- `Short-Term (Within 60-90 Days)` - Important security improvements
- `Long-Term (Within 6-12 Months)` - Architectural changes and preventive controls
- `As Resources Permit` - Best practice improvements for mature security programs

**Additional considerations:**

- For large enterprises (>5000 users), add 50-100% to timelines (change management overhead)
- Include phased rollout: Monitor → Pilot → Deploy
- Acknowledge business impact and testing requirements

### Real Example Correction

❌ **WRONG:**

```markdown
### Remediation

**Immediate (P0 - Within 7 Days):**

1. Disable user-agent string bypass policy
2. Enable MFA enforcement

**Short-Term (P1 - Within 30 Days):**

1. Deploy hardware-backed authentication to Windows devices

Priority: P1
```

✅ **RIGHT:**

```markdown
### Recommendations

**Immediate (Within 14-30 Days):**

1. Monitor authentication patterns for user-agent bypass attempts
2. Begin hardware-backed authentication deployment planning

**Short-Term (Within 60-90 Days):**

1. Pilot hardware-backed authentication deployment to 10% of Windows fleet
2. Implement bifurcated Microsoft SSO configuration

**Long-Term (Within 90-180 Days):**

1. Complete hardware-backed authentication rollout to all Windows devices
2. Remove user-agent string exception policy
```

---

## Cross-Finding References

**CRITICAL RULE:** Never reference findings by internal notation (F01, F02, Finding 9, etc.). Use descriptive titles.

### Why This Matters

Final reports may:

- Reorder findings by severity or category
- Remove findings that were later determined invalid
- Deliver subsets of findings to different audiences
- Split findings across multiple reports

Internal notation like "F01" or "Finding 9" breaks in all these scenarios.

### Example Transformations

| ❌ Internal Notation                     | ✅ Descriptive Reference                                                             |
| ---------------------------------------- | ------------------------------------------------------------------------------------ |
| `documented in Finding 9`                | `documented in finding "Remote Access Tool Users Permitted Weak Authentication"`     |
| `See Finding 6`                          | `See finding "VDI User Accounts with Authentication Policy Gaps"`                    |
| `(Finding 1, Finding 3, Finding 4)`      | `(authentication bypass, service account weak controls, enrollment security bypass)` |
| `Similar to Finding 2`                   | `Similar to the authentication delegation bypass finding`                            |
| `Finding 6 scored higher than Finding 9` | `VDI finding scored higher than remote access finding`                               |

### Implementation Guide

When referencing another finding:

1. Use the full finding title (Title Case)
2. If title is long, use a shortened descriptive phrase
3. Make the reference specific enough to be unique

**Test:** Would this reference make sense to a reader who only sees this one finding in isolation? If no, rewrite.

### Reference in Context

Good cross-references provide context:

```markdown
### Recommendations

**Context:** Client's planned hardware-backed authentication deployment (described in the
authentication bypass finding) will also address this enrollment security
concern by providing certificate-based authentication during initial
device enrollment.
```

Not just:

```markdown
The authentication bypass fix will resolve this.
```

---

## Title Formatting Convention

**CRITICAL RULE:** Always use Title Case for finding titles.

### Title Case Rules

- Capitalize major words (nouns, verbs, adjectives, adverbs, pronouns)
- Lowercase articles (a, an, the)
- Lowercase conjunctions (and, or, but, nor, yet, so, for)
- Lowercase short prepositions (in, on, at, to, by, for, with)
- Always capitalize first and last words regardless of part of speech
- Capitalize words of 4+ letters regardless of part of speech

### Examples

| ❌ Sentence case                                                              | ✅ Title Case                                                                 |
| ----------------------------------------------------------------------------- | ----------------------------------------------------------------------------- |
| `User agent string bypass enables password-only access to Microsoft services` | `User Agent String Bypass Enables Password-Only Access to Microsoft Services` |
| `Single active signing key with no rotation evidence`                         | `Single Active Signing Key with No Rotation Evidence`                         |
| `Linux NoMachine users permitted fishable MFA`                                | `Linux NoMachine Users Permitted Fishable MFA`                                |
| `VDI user accounts permitted password-only authentication`                    | `VDI User Accounts Permitted Password-Only Authentication`                    |
| `On-premises MFA dependency introduces availability risk`                     | `On-Premises MFA Dependency Introduces Availability Risk`                     |

### Common Mistakes

| Incorrect                                                                     | Reason                                                       | Correct                                                                       |
| ----------------------------------------------------------------------------- | ------------------------------------------------------------ | ----------------------------------------------------------------------------- |
| `User Agent String Bypass Enables Password-Only Access To Microsoft Services` | "To" capitalized (short preposition)                         | `User Agent String Bypass Enables Password-Only Access to Microsoft Services` |
| `Single Active Signing Key With No Rotation Evidence`                         | "With" capitalized (short preposition)                       | `Single Active Signing Key with No Rotation Evidence`                         |
| `On-premises mfa Dependency`                                                  | "mfa" lowercase (acronym), "premises" lowercase after hyphen | `On-Premises MFA Dependency`                                                  |

### Why Title Case

Professional report formatting standards require Title Case for:

- Report titles
- Section headings
- Finding titles
- Table headers

Consistency across findings improves professionalism and readability.

---

## Section Header Preferences

**NOTE:** Some clients prefer specific terminology. Check engagement-specific preferences during kickoff.

### Common Client Preferences

| Preferred Term                            | Instead Of                       | Rationale                                                                               |
| ----------------------------------------- | -------------------------------- | --------------------------------------------------------------------------------------- |
| **"Recommendations"**                     | "Remediation"                    | More consultative tone; implies improvement opportunity vs. "broken/failed" connotation |
| **"Verification and Attack Information"** | "Evidence" or "Proof of Concept" | PlexTrac VKB layout field name; emphasizes both verification AND attack scenarios       |
| **"Impact"**                              | (often missing)                  | Required for business risk communication to non-technical stakeholders                  |
| **"Systems Impacted"**                    | "Affected Systems"               | PlexTrac VKB layout field name                                                          |

### Why "Recommendations" vs "Remediation"

**Remediation** implies:

- Something is broken or failed
- Client made a mistake
- Prescriptive fix required

**Recommendations** implies:

- Opportunities for improvement
- Collaborative problem-solving
- Consultative guidance

In security consulting, recommendations frame creates more productive client conversations.

### When In Doubt

1. Check engagement kickoff notes for client preferences
2. Use PlexTrac VKB layout field names exactly (highest fidelity)
3. Default to "Recommendations" over "Remediation"
4. Ask engagement lead if client has strong terminology preferences

---

## Walkthrough Content Integration

**CRITICAL RULE:** Paraphrase all walkthrough call content; never include direct quotes or timestamps.

### Why This Matters

Walkthrough calls are informal technical discussions. Including raw quotes or timestamps makes reports feel like meeting notes rather than professional deliverables.

### Transform Walkthrough Notes Into Professional Narrative

| ❌ Raw Walkthrough Notes                                                                                                                                                 | ✅ Professional Integration                                                                                                                                                                                                                                                               |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `Walkthrough call (timestamp 00:40:33): Person X said "We've tried and failed many times to pass the hardware key through to the remote device and it just is so flaky"` | `Administrators explained the technical constraints during the security architecture review. Despite multiple attempts, USB passthrough functionality for hardware security keys proved unreliable in the remote access environment, leading to the current password+push configuration.` |
| `Meeting transcript line 18: "this seems really bad"`                                                                                                                    | `Security team acknowledged this as a significant security concern requiring remediation.`                                                                                                                                                                                                |
| `Person Y (timestamp 01:15:22): "This legacy temp token thing is basically 2FA, but it's delegating this factor to a legacy IDP..."`                                     | `Administrators identified the legacy authenticator when discussing available MFA factors. They explained it represents a legacy on-premises identity provider that remains available for backward compatibility with a specific user population.`                                        |

### Professional Integration Guidelines

1. **Remove timestamps** - Date references OK, specific timestamps too granular
2. **Remove speaker names** - Use "Administrators", "Security team", "Client team"
3. **Remove conversational filler** - "um", "you know", "like", rhetorical questions
4. **Preserve technical accuracy** - Don't oversimplify or change technical details
5. **Use third-person** - "explained", "confirmed", "acknowledged", "noted"
6. **Add context** - Why was this discussed? What decision resulted?

### When Attribution Is Needed

If you need to attribute a statement (rare), use role-based attribution:

- ✅ "The Identity and Access Management lead confirmed..."
- ✅ "Senior security engineers reported..."
- ❌ "Person X said..." (never use individual names)

Only use individual names with explicit approval for testimonial-style attribution.

### Acceptable Date References

- ✅ "During the architecture review walkthrough..."
- ✅ "Security team explained in Phase 3 validation sessions..."
- ❌ "On [specific date] at [timestamp], [person name] said..."

---

## Quality Checklist

Before finalizing any finding, verify:

- [ ] **Client quotes paraphrased** - No verbatim quotes in findings
- [ ] **Internal references removed** - No `.claude/`, `/Users/`, `.md:` paths
- [ ] **Priority labels fixed** - Policy priority OK, P0/P1/P2/P3 removed
- [ ] **Cross-references descriptive** - No internal notation (use descriptive finding titles)
- [ ] **Title in Title Case** - All major words capitalized correctly
- [ ] **Section headers match client preference** - "Recommendations" not "Remediation"
- [ ] **Walkthrough content professional** - No timestamps, speaker names, raw quotes
- [ ] **Impact section present** - Between Description and Verification
- [ ] **Evidence embedded in Verification** - Not separate "Evidence" section

---

## Source

These standards were derived from comprehensive feedback on a large enterprise identity provider security assessment, where initial findings contained all of these quality issues. The updated formatting-plextrac-findings skill (2026-01-13) incorporates these lessons to prevent recurrence.

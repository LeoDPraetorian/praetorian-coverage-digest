---
name: praetorian-cloud-finding-format
description: Use when writing cloud security findings for Praetorian clients - enforces 6-section structure, CVSS 4.0 rating, Praetorian voice standards, and progressive detail from high-level vulnerability description to detailed verification steps.
---

# Praetorian Cloud Finding Format

**Structured methodology for writing cloud security findings that follow Praetorian's writing standards and client deliverable format.**

## When to Use

Use this skill when:

- Writing security findings for cloud vulnerabilities (AWS, Azure, GCP)
- Converting rough notes/analysis into formal finding documentation
- User provides: vulnerability description, impact details, verification evidence, recommendations
- Creating Plextrac-compatible findings with proper CVSS ratings

**DO NOT use for:**

- Web application findings (different format)
- Network security findings (different structure)
- Quick vulnerability notes (not client-deliverable format)

---

## What This Skill Does

Guides Claude through generating properly formatted cloud security findings with:

1. **CVSS 4.0 Base Metrics** - Accurate risk rating
2. **Six Required Sections** - Vulnerability Description, Impact, Resources Impacted, Verification and Attack Information, Recommendations, References
3. **Praetorian Voice** - Past tense, active voice, professional tone, avoid repetition
4. **Progressive Detail** - High-level context → specific impact → detailed verification

**For complete writing rules and format structure**, see [references/writing-rules.md](references/writing-rules.md) and [references/finding-structure.md](references/finding-structure.md).

---

## Prerequisites

**Required Input from User:**

- Vulnerability description (what Praetorian found)
- Client environment context (disconnected information about infrastructure)
- Impact details (who can exploit, what they achieve, business consequences)
- Verification evidence (commands executed, outputs, screenshots)
- Resources affected (accounts, buckets, roles, etc.)
- Remediation recommendations

**Optional Input:**

- Screenshot descriptions (placeholder format: `screenshot: description`)
- Direct images (evidence of exploitation)
- Code blocks with commands and outputs
- Links for References section

---

## Critical Rules (Quick Reference)

**MUST follow these rules:**

- ❌ **Do NOT proceed** without asking for clarification on missing/unclear details
- ❌ **Do NOT make up facts** or fill logical gaps
- ❌ **Do NOT use hyperbole** or exaggerated language (avoid "catastrophic", "devastating", "massive")
- ❌ **Do NOT create unnecessary bullet points** - use prose when a single succinct statement conveys the idea
- ❌ **Do NOT repeat information** across sections - each section should add new detail, not restate previous content
- ✅ Use `%%CLIENT_SHORT%%` instead of actual client name
- ✅ Resource names in backticks: `role-name`, `bucket-name`, `arn:aws:iam::...`
- ✅ Past tense for activities: "Praetorian verified that...", "The application used..."
- ✅ Avoid "Praetorian" as first word in more than two successive sentences
- ✅ Section headings are H4: `####`
- ✅ Images: `ImageName - CAPTION` format
- ✅ Numbers: Words for ≤13 (eleven, eight), numerals for >13
- ✅ Be succinct - prefer clear, direct statements over verbose explanations

**For complete rules**, see [references/writing-rules.md](references/writing-rules.md).

---

## Workflow

### Step 1: Gather Input and Clarify

**Ask user for missing information:**

"Before writing the finding, I need clarification on the following:
- [List any missing details from prerequisites]
- [List any ambiguous or conflicting information]
- [Ask about specific technical details needed for verification]"

**Cannot proceed to Step 2 until all details are clear.**

### Step 2: Generate CVSS 4.0 Rating

Calculate CVSS 4.0 base metrics based on:

- **Attack Vector (AV)**: Network (N), Adjacent (A), Local (L), Physical (P)
- **Attack Complexity (AC)**: Low (L), High (H)
- **Attack Requirements (AT)**: None (N), Present (P)
- **Privileges Required (PR)**: None (N), Low (L), High (H)
- **User Interaction (UI)**: None (N), Passive (P), Active (A)
- **Confidentiality/Integrity/Availability (VC/VI/VA)**: None (N), Low (L), High (H)
- **Subsequent Confidentiality/Integrity/Availability (SC/SI/SA)**: None (N), Low (L), High (H)

**Format**: `CVSS:4.0/AV:N/AC:L/AT:N/PR:N/UI:N/VC:N/VI:N/VA:N/SC:N/SI:N/SA:N`

**For CVSS calculation guidance**, see [references/cvss-calculation.md](references/cvss-calculation.md).

### Step 3: Write Finding Sections

Generate the six required sections following the structure and intentions documented in [references/finding-structure.md](references/finding-structure.md):

#### Section 1: Vulnerability Description (2 paragraphs)

**Paragraph 1**: What Praetorian found (specific to client environment)
**Paragraph 2**: General explanation of the vulnerability type (no client context)

**Target**: Product Owners, Team Leaders, Managers, Engineers

#### Section 2: Impact

Describe negative consequences with:

- Who can abuse the security gap
- Level of compromise (confidentiality, data exfiltration, disruption, modification)
- Business impact if successfully attacked (compliance, reputation, customer relations)
- Technical achievement for attacker

**Use bullet points** for multiple impact scenarios.

**Target**: Executives (business), Team Leads/Managers (business), Engineers (technical)

#### Section 3: Resources Impacted

**Format depends on resource type:**

- **Table format**: For resources with properties (IAM roles → account, Lambda → region + execution role)
- **Bullet list**: For simple resources (hostnames, IP addresses)

**Target**: Client Engineers, Security team (remediation)

#### Section 4: Verification and Attack Information

**Three-part structure:**

**Part 1**: How Praetorian identified the issue (discovery process)
**Part 2**: Steps to demonstrate impact (commands, actions, methodology)
**Part 3**: Results (quantifiable evidence, screenshots with captions)

**Include**:
- Mermaid diagrams for complex attack paths (use subgraphs for boundaries, nodes for entities)
- Code blocks for actual commands executed (DO NOT invent these)
- Image captions in format: `ImageName - CAPTION`

**For low-risk/informational findings**: Use "Praetorian did not attempt to demonstrate an exploit and, instead, focused on providing a proof of concept."

**Target**: Client Engineers, Security team (remediation)

#### Section 5: Recommendations

**Strategic + tactical recommendations** without prescriptive implementation details.

- Focus on desired/ideal state rather than specific technologies
- Include people/process recommendations where applicable
- Keep it objective - mention what to fix, not exactly how to implement

**Target**: Engineers (technology), Executives/Team Leads (people/process)

#### Section 6: References

**Format**: `- [caption](link)` (one per line)

**If no links provided**: Leave with placeholder `- [link](url)`

### Step 4: Review and Validate

Before presenting to user, verify:

- [ ] CVSS 4.0 rating included
- [ ] All six H4 sections present
- [ ] Client name replaced with `%%CLIENT_SHORT%%`
- [ ] Resources in backticks
- [ ] Images in correct format
- [ ] Past tense used throughout
- [ ] No "Praetorian" repetition in successive sentences
- [ ] Recommendations are strategic, not prescriptive

---

## Example Output Structure

```markdown
CVSS:4.0/AV:N/AC:L/AT:N/PR:N/UI:N/VC:H/VI:L/VA:N/SC:N/SI:N/SA:N

#### Vulnerability Description

Praetorian found several S3 Buckets with overly permissive bucket policies and block public access configurations, making them accessible for read and write by any public actor on the internet.

Amazon S3 access is governed by IAM policies and bucket resource policies, among other S3 access mechanisms. These policies allow for both bucket-level and object-level access, including infrastructure management on the S3 Bucket, such as setting bucket policies, setting bucket configuration, and object management within the S3 Bucket, including retrieving and uploading objects to the S3 Bucket. Overpermissive S3 Bucket Access may make S3 Buckets and the data stored in them susceptible to misconfiguration, exfiltration, or public exposure.

#### Impact

- The `testbucket` bucket contained an `Archive.zip` file that a malicious actor could overwrite by abusing the overly permissive policy. This could potentially impact downstream services that may depend on the content within the zip file.
- An attacker could also misuse the overly permissive policies on the impacted buckets to upload arbitrary objects, abusing %%CLIENT_SHORT%%'s storage space. This could negatively impact %%CLIENT_SHORT%%'s financials through high object storage billing.
- Similarly, the weak policies could be abused to upload and distribute malicious, pirated, or other socially unacceptable information, impacting %%CLIENT_SHORT%%'s public image.

**NOTE:** Praetorian used the `testbucket` bucket to demonstrate impact; however, similar attacks are possible with all impacted buckets.

#### Accounts/Buckets Impacted

| Account     | Bucket      | Weakness                         |
| ----------- | ----------- | -------------------------------- |
| 11223445567 | testbucket  | `s3:*` allowed on all objects    |

#### Verification and Attack Information

Praetorian discovered this issue while triaging results from automated cloud configuration analysis tooling. Then, Praetorian manually verified its exploitability by reviewing the security controls on the impacted S3 bucket. Evidence for the overly permissive policy is shown below.

buck_s3_policy.png - Praetorian found that `testbucket` bucket policy allowed all principals to perform any actions on all objects within the bucket.

Next, the team emulated a public actor by leveraging a Praetorian-owned AWS account to successfully download existing content in the S3 bucket using the following command:

~~~bash
aws s3 cp s3://testbucket/Archive.zip ./Archive.zip
~~~

Evidence of a successful download of the `Archive.zip` file in the bucket as well as an upload of the POC file is shown below.

s3-file-download-upload.png - Praetorian demonstrated a download of the bucket content and an upload of a test file to the S3 bucket.

s3_bucket_prelim_finding.png - Praetorian confirmed the uploaded test file in the console.

Additionally, Praetorian found that this S3 bucket had the Public Access Block setting disabled, as shown below.

s3_bucket_bpa.png - Praetorian found that the Block Public Access setting was disabled.

#### Recommendation

Praetorian recommends %%CLIENT_SHORT%% implement the following:

- Reduce the number of permitted operations specified by the `Action` element from `s3:*` (all S3 actions) to a moderate scope of operations (like `s3:GetObject` and `s3:ListObject`).
- The S3 actions should be limited to only specific principals that require the access to perform business operations.
- Enable the S3 Block Public Access setting at the account or bucket level for buckets that are not meant to be public by design (static content for websites, etc.).
- If a bucket is intended to be public, ensure those buckets are tagged and have an easily identifiable name.
- Review publicly accessible buckets at a regular cadence, verify they are free of sensitive information, and have a valid business use case for being made public.

#### References

- [Rapid7: Open S3 Buckets](https://community.rapid7.com/community/infosec/blog/2013/03/27/1951-open-s3-buckets)
- [Amazon S3 Preventative Security Best Practices](https://docs.aws.amazon.com/AmazonS3/latest/userguide/security-best-practices.html#security-best-practices-prevent)
```

---

## Integration

### Called By

- User request: "Write a cloud security finding"
- After security triage/analysis completion
- Converting hunting output to client deliverable

### Requires (invoke before starting)

| Skill | When  | Purpose                     |
| ----- | ----- | --------------------------- |
| None  | N/A   | Standalone writing workflow |

### Calls (during execution)

| Tool            | Step   | Purpose                       |
| --------------- | ------ | ----------------------------- |
| AskUserQuestion | Step 1 | Clarify missing details       |
| Write           | Step 3 | Generate finding markdown     |

### Pairs With (conditional)

| Skill                          | Trigger                         | Purpose                            |
| ------------------------------ | ------------------------------- | ---------------------------------- |
| adding-chariot-findings        | After writing finding           | Create risk in Chariot with evidence |
| Security analysis/triage skills | Before writing                  | Generate verification evidence     |

---

## Key Principles

✅ **Ask before assuming** - Clarify all missing details before writing
✅ **Facts only** - Do not make up technical details or fill logical gaps
✅ **Progressive disclosure** - High-level → specific → detailed
✅ **Consistent voice** - Past tense, active voice, professional tone
✅ **Client-agnostic** - Use `%%CLIENT_SHORT%%` placeholder
✅ **Strategic recommendations** - Desired state, not implementation specifics

---

## Related Skills

- `adding-chariot-findings` - Create risk in Chariot after writing finding
- Security triage/analysis skills - Generate verification evidence before writing

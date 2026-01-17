# Writing Rules

**Complete writing standards for Praetorian cloud security findings.**

---

## Conciseness and Clarity

### Avoid Hyperbole

**Do NOT use exaggerated or sensationalized language:**

❌ **Hyperbolic**:
- "catastrophic breach"
- "devastating security flaw"
- "massive vulnerability"
- "critically dangerous exposure"
- "total compromise"

✅ **Factual**:
- "security breach"
- "security flaw"
- "vulnerability"
- "exposure"
- "compromise"

**Be precise and objective** - let the facts speak for themselves without emotional amplification.

### Avoid Unnecessary Bullet Points

**Use bullet points only when representing multiple distinct items.**

❌ **Unnecessary bullets** (single point or prose is better):
```markdown
#### Impact

- An attacker could exploit this vulnerability to gain unauthorized access to the S3 bucket.
```

✅ **Prose for single points**:
```markdown
#### Impact

An attacker could exploit this vulnerability to gain unauthorized access to the S3 bucket.
```

✅ **Bullets for multiple distinct items**:
```markdown
#### Impact

- The `testbucket` bucket contained an `Archive.zip` file that a malicious actor could overwrite.
- An attacker could upload arbitrary objects, abusing %%CLIENT_SHORT%%'s storage space.
- The weak policies could be abused to distribute malicious information, impacting %%CLIENT_SHORT%%'s reputation.
```

**When in doubt**: If you can state it clearly in one or two sentences, use prose instead of a single bullet point.

### Avoid Repetition Across Sections

**Each section should add new information, not restate what was already covered.**

❌ **Repetitive** (same information in multiple sections):
```markdown
#### Vulnerability Description
Praetorian found an S3 bucket with public read access, allowing anyone to download sensitive files.

#### Impact
An attacker could exploit the public read access to download sensitive files from the S3 bucket.

#### Verification and Attack Information
Praetorian verified the public read access by successfully downloading sensitive files from the bucket.
```

✅ **Progressive detail** (each section adds specificity):
```markdown
#### Vulnerability Description
Praetorian found an S3 bucket with public read access due to overly permissive bucket policies.

#### Impact
An attacker could download sensitive customer data, including PII and financial records, leading to compliance violations and reputation damage.

#### Verification and Attack Information
Praetorian validated the issue by accessing the bucket without authentication and downloading a sample file containing customer email addresses.
```

**Progression principle**: Vulnerability Description (what + why it's bad) → Impact (consequences) → Verification (proof with specifics).

### Be Succinct

**Prefer clear, direct statements over verbose explanations.**

❌ **Verbose**:
```markdown
It is important to note that there exists a significant security vulnerability in the configuration of the S3 bucket, which could potentially be leveraged by malicious actors who may seek to gain unauthorized access to the sensitive data contained within.
```

✅ **Succinct**:
```markdown
The S3 bucket configuration allows unauthorized access to sensitive data.
```

**Remove filler phrases**:
- ❌ "It is important to note that..."
- ❌ "There exists a situation where..."
- ❌ "It should be mentioned that..."
- ✅ State the fact directly

---

## Voice and Tone

### Tense

- **Past tense** for activities and environment details
  - ✅ "Praetorian verified that..."
  - ✅ "The application used OAuth 2.0 client credentials flow to authenticate..."
  - ❌ "Praetorian verifies that..."

### Active vs Passive Voice

- **Prefer active voice** unless necessary to convey meaning
  - ✅ "Praetorian found several S3 buckets..."
  - ❌ "Several S3 buckets were found by Praetorian..."

### Professional and Clear Language

- Use clear, direct language without unnecessary jargon
- Explain technical concepts briefly when first introduced
- Avoid overly complex sentence structures

---

## Repetition and Variation

### Praetorian Name Usage

- **Avoid repeating "Praetorian" as the first word in more than two successive sentences**
  - After two sentences starting with "Praetorian", use alternatives:
    - "The engineering team..."
    - "The engineers..."
    - "This team..."
  - Keep alternative phrasings to a minimum
- **"Praetorian" is a noun** - never use "the Praetorian"
  - ✅ "Praetorian verified..."
  - ❌ "The Praetorian verified..."

### Action Verb Variants

Use variants of `Praetorian [action verb] xyz`:
- Praetorian found...
- Praetorian verified...
- Praetorian discovered...
- Praetorian validated...
- Praetorian confirmed...

---

## Formatting Rules

### Client References

- **Always use `%%CLIENT_SHORT%%`** instead of actual client name
  - ✅ "%%CLIENT_SHORT%%'s storage space"
  - ❌ "CoStar's storage space"

### Resource Names

- **Usernames, hosts, roles, resource names in backticks**
  - ✅ `role-name`
  - ✅ `arn:aws:iam::123456789012:role/developers`
  - ✅ `testbucket`
  - ✅ `ec2-instance-profile`

### Section Headings

- **All section headings are H4** (`####`)
  - Vulnerability Description
  - Impact
  - Resources Impacted
  - Verification and Attack Information
  - Recommendations
  - References

### Numbers

- **Words for numbers ≤13**: eleven, eight, three, etc.
- **Numerals for numbers >13**: 15, 24, 142, etc.
  - ✅ "Praetorian found eleven S3 buckets..."
  - ✅ "The bucket contained 142 files..."

---

## Lists and Punctuation

### Bullet Points

- **Only use bullet points when representing a list of items**
- Not required for single sentences or paragraphs
- **If bulleted items are complete sentences, end with punctuation**
- **If not complete sentences, no punctuation**
  - ✅ "- The `testbucket` bucket contained sensitive data." (period)
  - ✅ "- IAM Role" (no period)

### Line Spacing

- **Add an extra newline between lists and preceding text**

```markdown
Praetorian found the following issues:

- Issue 1
- Issue 2
```

---

## Images and Evidence

### Image Format

**Images must use this exact format:**

```
ImageName - CAPTION
```

- No file extension in `ImageName`
- Caption describes what the image shows
- Examples:
  - `buck_s3_policy.png - Praetorian found that testbucket bucket policy allowed all principals to perform any actions`
  - `s3-file-download-upload.png - Praetorian demonstrated a download of the bucket content and an upload of a test file`

### Screenshot Placeholders

- Input may contain placeholders starting with `screenshot:`
- These signify there are screenshots with that description
- Convert to proper image format in output

---

## Tables vs Lists

### When to Use Tables

- **Resources with properties** worth mentioning
  - IAM roles (need account reference)
  - Lambda functions (need region, execution role)
  - S3 buckets (need account, permissions)

### When to Use Bullet Lists

- **Simple resources** without complex properties
  - Hostnames only
  - IP addresses only
  - Simple counts

**Example table**:

```markdown
| Account     | Role              | Permissions      |
| ----------- | ----------------- | ---------------- |
| 12345678901 | developer-role    | `lambda:*`       |
| 98765432109 | admin-role        | `*:*`            |
```

**Example list**:

```markdown
- `web-server-01.example.com`
- `api-gateway-02.example.com`
- `database-03.example.com`
```

---

## Pronouns

### Gender-Neutral Language

- **Do NOT use gendered pronouns** (he/she/his/her)
- **Use they/their/them** instead
  - ✅ "An attacker could use their credentials..."
  - ❌ "An attacker could use his credentials..."

---

## References Section

### Link Format

**Each link on its own line in this exact format:**

```markdown
- [caption](url)
```

**Example:**

```markdown
- [AWS IAM Best Practices](https://docs.aws.amazon.com/IAM/latest/UserGuide/best-practices.html)
- [OWASP Cloud Security](https://owasp.org/www-project-cloud-security/)
```

**If no links provided**: Leave placeholder `- [link](url)`

---

## Recommendations

### Strategic, Not Prescriptive

- **Focus on desired/ideal state**, not specific implementation
- **Mention what to fix**, not exactly how
- **Brief solutions** without excessive implementation details
- **Include "should" language** for flexibility

**Examples:**

✅ **Strategic**: "Reduce the number of permitted operations specified by the `Action` element from `s3:*` to a moderate scope of operations."

❌ **Too Prescriptive**: "Update the IAM policy JSON file at line 15 to change `s3:*` to `s3:GetObject` and redeploy using Terraform apply command."

✅ **Strategic**: "Enable the S3 Block Public Access setting at the account or bucket level for buckets not meant to be public."

❌ **Too Prescriptive**: "Run `aws s3api put-public-access-block --bucket testbucket --public-access-block-configuration BlockPublicAcls=true` for each bucket."

---

## Notes and Context

### Impact Notes

- **Add notes with `**NOTE:**` format** sparingly
- Only when necessary to improve clarity or provide critical context
- Place at end of Impact section

**Example:**

```markdown
**NOTE:** Praetorian used the `testbucket` bucket to demonstrate impact; however, similar attacks are possible with all impacted buckets.
```

---

## Do Not Invent

### Critical Rule

- **Do NOT make up facts or fill logical gaps in explanation**
- **Do NOT invent commands, outputs, or technical details**
- **Only include code blocks if provided by user**
- **If details are missing, ask the user for clarification**

**Before writing, ask:**

"Before writing the finding, I need clarification on:
- [List missing details]
- [List ambiguous information]
- [Ask for specific technical details]"

**Only proceed with writing if absolutely certain about all details.**

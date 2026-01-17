# Finding Structure

**Six-section H4 structure for Praetorian cloud security findings.**

---

## Overall Template

```markdown
CVSS:4.0/AV:N/AC:L/AT:N/PR:N/UI:N/VC:N/VI:N/VA:N/SC:N/SI:N/SA:N

#### Vulnerability Description

[Two paragraphs: specific finding + general explanation]

#### Impact

[Bullet points describing negative consequences]

#### Resources Impacted

[Table or list of affected resources]

#### Verification and Attack Information

[Three parts: discovery + demonstration + results]

#### Recommendation

[Strategic recommendations without prescriptive details]

#### References

- [caption](url)
```

---

## Section 1: Vulnerability Description

### Purpose

- Provide high-level overview of the finding with sufficient context
- Focus on the gap between observed and desired states
- Explain why that gap is an issue
- **NOT** a repetition of Impact, Verification, or Recommendation sections

### Structure

**Two paragraphs:**

1. **Paragraph 1**: What Praetorian found (specific to client environment)
   - Brief description of the weakness discovered
   - Context about where it was found
   - Specific resource names, configurations, or settings

2. **Paragraph 2**: General explanation of the vulnerability type (no client context)
   - Background information about the technology/service
   - Why this configuration is problematic
   - Security implications of the weakness

### Target Audience

- Product Owners
- Team Leaders
- Managers
- Engineers (stakeholders responsible for remediation)

### Example

```markdown
#### Vulnerability Description

Praetorian found several S3 Buckets with overly permissive bucket policies and block public access configurations, making them accessible for read and write by any public actor on the internet.

Amazon S3 access is governed by IAM policies and bucket resource policies, among other S3 access mechanisms. These policies allow for both bucket-level and object-level access, including infrastructure management on the S3 Bucket, such as setting bucket policies, setting bucket configuration, and object management within the S3 Bucket, including retrieving and uploading objects to the S3 Bucket. Overpermissive S3 Bucket Access may make S3 Buckets and the data stored in them susceptible to misconfiguration, exfiltration, or public exposure.
```

---

## Section 2: Impact

### Purpose

- Describe negative consequences of exploitation
- Explain who can abuse the security gap
- Detail the level of compromise
- Articulate business impact if attack succeeds
- Describe technical achievements possible for attacker

### Content Guidelines

**Include:**

- **Who can abuse**: External attackers, malicious insiders, compromised accounts
- **Level of compromise**: Confidentiality (data exfiltration), Integrity (modification), Availability (disruption)
- **Business impact**: Compliance violations, reputation damage, financial loss, customer impact
- **Technical achievement**: What attacker gains (admin access, data access, persistence)

**Context considerations:**

- Tie back to Terminal Goals and User Roles if threat model included
- If business context insufficient (posture review), focus on facts rather than imaginary scenarios
- Stick to what is factual - avoid misleading details with low information

### Format

- Use **bullet points** for multiple impact scenarios
- Each bullet should be a complete thought
- Optional **NOTE:** at end for additional context (use sparingly)

### Target Audience

- **Executives**: Business impact
- **Team Leads/Managers**: Business impact
- **Engineers**: Technical impact

### Example

```markdown
#### Impact

- The `testbucket` bucket contained an `Archive.zip` file that a malicious actor could overwrite by abusing the overly permissive policy. This could potentially impact downstream services that may depend on the content within the zip file.
- An attacker could also misuse the overly permissive policies on the impacted buckets to upload arbitrary objects, abusing %%CLIENT_SHORT%%'s storage space. This could negatively impact %%CLIENT_SHORT%%'s financials through high object storage billing.
- Similarly, the weak policies could be abused to upload and distribute malicious, pirated, or other socially unacceptable information, impacting %%CLIENT_SHORT%%'s public image.

**NOTE:** Praetorian used the `testbucket` bucket to demonstrate impact; however, similar attacks are possible with all impacted buckets.
```

---

## Section 3: Resources Impacted (or Accounts/Buckets Impacted, etc.)

### Purpose

- Clearly identify which resources and environments are vulnerable
- Enable remediation team to locate and fix specific instances

### Format Decision

**Use Table when:**

- Resources have properties worth documenting
- Need to show relationships (IAM role → account, Lambda → region + execution role)
- Multiple attributes per resource

**Example table:**

```markdown
| Account     | Bucket      | Weakness                      |
| ----------- | ----------- | ----------------------------- |
| 11223445567 | testbucket  | `s3:*` allowed on all objects |
| 11223445567 | prod-data   | Public read access enabled    |
```

**Use List when:**

- Simple resources without complex properties
- Just hostnames or IP addresses
- No relationships to document

**Example list:**

```markdown
- `web-server-01.example.com`
- `api-gateway-02.example.com`
- `192.168.1.100`
```

### Target Audience

- Client Engineers (remediation)
- Security Team (remediation)

---

## Section 4: Verification and Attack Information

### Purpose

- Provide clear instructions for engineers to replicate the issue
- Evidence of Praetorian's successful finding
- Enable client to understand methodology and validate independently

### Three-Part Structure

**Part 1: Discovery Process**

- One sentence explaining how Praetorian identified the issue
- Describe process and environment components
- Keep it simple and easy to follow

**Example**: "Praetorian discovered this issue while triaging results from automated cloud configuration analysis tooling."

**Part 2: Demonstration Steps**

- Easy to understand steps describing how to demonstrate impact
- Keep it objective and reproducible
- **Include code blocks or commands ONLY if provided by user**
- **Do NOT invent technical details**

**Example**:

```markdown
Next, the team emulated a public actor by leveraging a Praetorian-owned AWS account to successfully download existing content in the S3 bucket using the following command:

~~~bash
aws s3 cp s3://testbucket/Archive.zip ./Archive.zip
~~~
```

**Part 3: Results and Evidence**

- Quantifiable results where appropriate
- Screenshots with proper captions (`ImageName - CAPTION`)
- Demonstrable proof of exploitation

**Example**: "Evidence of a successful download of the `Archive.zip` file in the bucket as well as an upload of the POC file is shown below."

### Optional Components

**Mermaid Diagrams**:

- For complex environments with multiple attack path steps
- Use subgraphs for boundaries (AWS accounts, networks)
- Use nodes for individual entities (roles, functions, instances)
- Shapes: `node(Label)` or `node([Label])`
- NO legend needed - diagram should be self-explanatory

**Low-Risk Findings**:

- For low-risk or informational findings without exploitation
- Use language: "Praetorian did not attempt to demonstrate an exploit and, instead, focused on providing a proof of concept."

### Two Sub-Sections (Conceptual)

1. **Proof of Finding** (not applicable for foundational assessments)
   - Specific evidence of ONE instance
   - Impact assessment for the client
   - Methodology + screenshots showing exploitation

2. **Steps to Reproduce** (environment-agnostic)
   - Repeatable commands client can run
   - Should regenerate list of impacted resources
   - Client uses to track remediation progress

### Target Audience

- Client Engineers (remediation)
- Security Team (remediation)

---

## Section 5: Recommendation

### Purpose

- Provide client with clear plan to address finding
- Focus on desired/ideal state rather than specific technologies
- Avoid identical issues in future (if applicable)
- Strategic guidance, not prescriptive implementation

### Content Guidelines

**Focus on:**

- **Desired state**: What should be true after remediation
- **Strategic approach**: General principles and goals
- **Brief solutions**: High-level remediation without implementation minutiae
- **Optional technology suggestions**: Stimulate ideas but don't mandate specific tools

**Avoid:**

- Prescriptive implementation details
- Step-by-step configuration instructions
- Specific command-line examples for remediation
- Assuming client's technology stack

### Format

- Bullet points for multiple recommendations
- Each recommendation should be actionable at strategic level
- Include people/process recommendations where applicable

### Target Audience

- **Client Engineers** (technology recommendations)
- **Security Team** (technology recommendations)
- **Executives** (people/process recommendations)
- **Team Leads/Managers** (people/process recommendations)

### Example

```markdown
#### Recommendation

Praetorian recommends %%CLIENT_SHORT%% implement the following:

- Reduce the number of permitted operations specified by the `Action` element from `s3:*` (all S3 actions) to a moderate scope of operations (like `s3:GetObject` and `s3:ListObject`).
- The S3 actions should be limited to only specific principals that require the access to perform business operations.
- Enable the S3 Block Public Access setting at the account or bucket level for buckets that are not meant to be public by design (static content for websites, etc.).
- If a bucket is intended to be public, ensure those buckets are tagged and have an easily identifiable name.
- Review publicly accessible buckets at a regular cadence, verify they are free of sensitive information, and have a valid business use case for being made public.
```

---

## Section 6: References

### Purpose

- Provide additional resources for understanding and remediation
- Link to authoritative documentation and best practices

### Format

**Each link on its own line:**

```markdown
- [caption](url)
```

**If no links provided by user**: Leave placeholder

```markdown
- [link](url)
```

### Example

```markdown
#### References

- [Rapid7: Open S3 Buckets](https://community.rapid7.com/community/infosec/blog/2013/03/27/1951-open-s3-buckets)
- [Amazon S3 Preventative Security Best Practices](https://docs.aws.amazon.com/AmazonS3/latest/userguide/security-best-practices.html#security-best-practices-prevent)
```

---

## Optional Section: Mitigating Factors

### When to Use

- Too many mitigating factors dilute the Impact section
- Need cleaner segregation between aggravating and mitigating factors
- Nuances to explain (e.g., S3 public access block) make Impact section long

### Purpose

- Document defense-in-depth measures that reduced risk
- Explain security controls that partially mitigated the finding
- Improve readability by separating positive from negative factors

### Placement

- Optional section between Impact and Resources Impacted
- Only include if there are substantial mitigating factors worth highlighting

**Example:**

```markdown
#### Mitigating Factors

- AWS CloudTrail logging was enabled, providing visibility into S3 access attempts
- S3 Server Access Logging captured bucket-level activity
- GuardDuty was monitoring for suspicious S3 API calls

While these controls provide detection capabilities, they do not prevent the unauthorized access described in the Impact section.
```

---

## Section Order Summary

1. CVSS 4.0 Rating
2. **Vulnerability Description** (H4)
3. **Impact** (H4)
4. [**Mitigating Factors** (H4)] - Optional
5. **Resources Impacted** (H4)
6. **Verification and Attack Information** (H4)
7. **Recommendation** (H4)
8. **References** (H4)

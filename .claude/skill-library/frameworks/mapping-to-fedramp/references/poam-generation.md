# POA&M (Plan of Action and Milestones) Generation

**Complete guidance for generating FedRAMP-compliant POA&Ms for security findings.**

---

## What is a POA&M?

A **Plan of Action and Milestones (POA&M)** is a required FedRAMP document that:

- Tracks security control weaknesses and deficiencies
- Documents remediation plans with specific milestones
- Provides risk context and mitigation timelines
- Enables continuous monitoring of risk posture

**When Required**: Any control not fully implemented or any significant finding from assessments or scans.

---

## Official FedRAMP POA&M Template

**Location**: https://www.fedramp.gov/documents-templates/

**Format**: Excel spreadsheet with required fields

**Key Characteristics**:

- Standardized across all CSPs
- Required for authorization package
- Updated monthly for ConMon submissions
- Reviewed by FedRAMP PMO and AOs

---

## Required POA&M Fields

### 1. Control Identifier

**Format**: Control-ID with enhancement (if applicable)

**Examples**:

- `SI-2` (base control)
- `SI-2(2)` (control with enhancement 2)
- `RA-5(1)` (RA-5 with enhancement 1)

**Source**: NIST 800-53 Rev 5 control catalog

### 2. Control Name

**Examples**:

- Flaw Remediation (for SI-2)
- Vulnerability Monitoring and Scanning (for RA-5)
- Transmission Confidentiality and Integrity (for SC-8)

### 3. Weakness Description

**What to Include**:

- Specific finding details
- Affected systems/components
- Current state vs required state
- Impact if not remediated

**Example**:

```
Web application servers are running TLS 1.0/1.1 which are deprecated protocols.
NIST SP 800-52 Rev 2 requires TLS 1.2 or higher.
Affected: API Gateway (api.example.gov), Web Portal (portal.example.gov)
Impact: Potential man-in-the-middle attacks, data interception, non-compliance with SC-8.
```

### 4. Point of Contact (POC)

**Include**:

- Name
- Title/Role
- Email
- Phone (optional)

**Example**: "John Smith, Security Engineer, john.smith@example.com"

### 5. Resources Required

**Categories**:

- **Personnel**: Who will perform the work?
- **Tools/Technology**: What software/hardware needed?
- **Budget**: Estimated cost (if applicable)
- **External Support**: Contractors, vendors, consultants

**Example**:

```
- Personnel: DevOps Engineer (40 hours), Security Engineer (8 hours)
- Tools: Load balancer configuration update, SSL certificate renewal
- Budget: $2,500 (certificate renewal)
- External: None
```

### 6. Scheduled Completion Date

**Rules**:

- Must align with vulnerability severity timelines
- High: ≤30 days
- Moderate: ≤90 days
- Low: ≤180 days
- Operational Requirement (OR): ≤365 days (requires risk acceptance)

**Example**: "2026-02-05" (30 days for high severity)

### 7. Milestones with Completion Dates

**Breakdown work into measurable steps**:

**Example**:

1. Obtain TLS 1.3 certificates - 2026-01-15
2. Update load balancer configuration - 2026-01-22
3. Test TLS 1.2/1.3 on staging - 2026-01-29
4. Deploy to production during maintenance window - 2026-02-05
5. Validate with vulnerability scanner - 2026-02-06

**Best Practice**: 3-7 milestones per POA&M

### 8. Status

**Options**:

- **Ongoing**: Work in progress
- **Completed**: Remediation finished, validated
- **Risk Accepted**: Approved waiver (requires justification + AO approval)

### 9. Risk Level

**Based on likelihood × impact**:

- **Critical**: Immediate exploitation risk, severe impact
- **High**: Likely exploitation, significant impact
- **Moderate**: Possible exploitation, moderate impact
- **Low**: Unlikely exploitation, minimal impact

### 10. Original Detection Date

**When was the finding first identified?**

**Example**: "2025-12-15" (from quarterly vulnerability scan)

### 11. Vendor Dependency (Optional)

**If remediation depends on vendor**:

- Vendor name
- Ticket/case number
- Expected vendor fix date
- Workarounds applied

---

## Vulnerability Remediation Timelines

| Severity                         | Maximum Time | FedRAMP Requirement                    |
| -------------------------------- | ------------ | -------------------------------------- |
| **Critical/High**                | 30 days      | Mandatory                              |
| **Moderate**                     | 90 days      | Mandatory                              |
| **Low**                          | 180 days     | Mandatory                              |
| **Operational Requirement (OR)** | 365 days     | Requires AO approval + risk acceptance |

**Deviation Process**:
If cannot meet timeline, must:

1. Document reason in POA&M
2. Provide compensating controls
3. Obtain AO approval for extension
4. Update milestones with revised dates

---

## POA&M Creation Workflow

### Step 1: Identify Control Deficiency

From assessment, scan, or continuous monitoring:

- Control not implemented
- Control partially implemented
- Control fails validation testing
- New vulnerability discovered

### Step 2: Map to Control(s)

Use finding-to-control mapping patterns:

- Primary control (main deficiency)
- Related controls (if affected)

### Step 3: Determine Severity

**Factors**:

- CVSS score (for vulnerabilities)
- Likelihood of exploitation
- Impact if exploited
- Data sensitivity
- System criticality

### Step 4: Calculate Remediation Timeline

Based on severity:

- High → 30 days maximum
- Moderate → 90 days maximum
- Low → 180 days maximum

### Step 5: Create Milestones

Break down remediation into phases:

1. Planning/design
2. Development/configuration
3. Testing (dev/staging)
4. Deployment (production)
5. Validation/verification

### Step 6: Assign POC and Resources

Identify:

- Who owns the remediation?
- What resources are needed?
- Are there dependencies?

### Step 7: Submit for Approval

**Review by**:

- ISSO (Information System Security Officer)
- CSO (Cloud Security Officer)
- AO (Authorizing Official) for risk acceptances

---

## POA&M Examples

### Example 1: Unpatched Critical Vulnerability

```yaml
Control Identifier: SI-2
Control Name: Flaw Remediation
Weakness Description: |
  Critical CVE-2024-12345 discovered in Apache Struts 2.x on web application servers.
  CVSS Score: 9.8 (Critical). Public exploit available.
  Affected Systems: app-server-01, app-server-02, app-server-03 (production)
  Current Version: Apache Struts 2.5.30
  Required Version: Apache Struts 2.5.33+ (patched)
  Impact: Remote code execution, full system compromise, data breach potential

POC: Jane Doe, Application Security Lead, jane.doe@agency.gov

Resources Required:
  - Personnel: DevOps Engineer (16 hours), Security Engineer (8 hours)
  - Tools: Patch testing environment, vulnerability scanner
  - Budget: $0 (patching only)
  - External Support: None

Scheduled Completion Date: 2026-02-05 (within 30 days - High severity)

Milestones: 1. Download and test patch in dev environment - 2026-01-15
  2. Validate application functionality with patch - 2026-01-22
  3. Deploy patch to staging and retest - 2026-01-29
  4. Deploy to production during maintenance window - 2026-02-05
  5. Rescan with vulnerability scanner to confirm remediation - 2026-02-06

Status: Ongoing

Risk Level: Critical

Original Detection Date: 2026-01-06

Vendor Dependency: No - patch available from Apache Foundation
```

### Example 2: Weak TLS Configuration

```yaml
Control Identifier: SC-8(1)
Control Name: Transmission Confidentiality and Integrity | Cryptographic Protection
Weakness Description: |
  Web application supports TLS 1.0 and TLS 1.1 (deprecated per NIST SP 800-52 Rev 2).
  Only TLS 1.2+ should be enabled.
  Affected: API Gateway (api.agency.gov), Admin Portal (admin.agency.gov)
  Impact: Vulnerable to BEAST, POODLE, and other protocol attacks

POC: John Smith, Network Security Engineer, john.smith@agency.gov

Resources Required:
  - Personnel: Network Engineer (24 hours), Security Engineer (8 hours)
  - Tools: Load balancer configuration, SSL Labs validation
  - Budget: $2,500 (certificate renewal for TLS 1.3)
  - External Support: Certificate Authority (DigiCert)

Scheduled Completion Date: 2026-03-15 (within 90 days - Moderate severity)

Milestones: 1. Procure TLS 1.3 certificates from DigiCert - 2026-02-01
  2. Update load balancer to disable TLS 1.0/1.1, enable TLS 1.2/1.3 - 2026-02-15
  3. Test configuration on staging environment - 2026-02-22
  4. Deploy to production (api.agency.gov) - 2026-03-01
  5. Deploy to production (admin.agency.gov) - 2026-03-08
  6. Validate with SSL Labs scan - 2026-03-15

Status: Ongoing

Risk Level: Moderate

Original Detection Date: 2026-01-06

Vendor Dependency: DigiCert (certificate issuance - 5 business days)
```

### Example 3: Risk Acceptance (Operational Requirement)

```yaml
Control Identifier: SC-7(5)
Control Name: Boundary Protection | Deny by Default / Allow by Exception
Weakness Description: |
  Legacy application requires inbound port 8080 (HTTP) open to internet for vendor support access.
  This violates least privilege network segmentation (SC-7(5)).
  Vendor will not support application over VPN or alternative secure channels.
  Affected: legacy-app-server-01 (10.20.30.40)
  Impact: Potential unauthorized access via unencrypted channel

POC: Sarah Johnson, IT Director, sarah.johnson@agency.gov

Compensating Controls:
  1. IP allow-listing (only vendor IPs: 203.0.113.0/24)
  2. Temporary firewall rule (disabled after support session)
  3. Enhanced logging on port 8080 connections (AU-2)
  4. Real-time SIEM alerting for anomalies (SI-4)

Resources Required:
  - Personnel: Migration project team (6 months effort)
  - Tools: Replacement application procurement
  - Budget: $150,000 (new application + migration)
  - External Support: Application vendor (replacement evaluation)

Scheduled Completion Date: 2026-12-31 (Operational Requirement - 365 days)

Milestones:
  1. Evaluate replacement applications - 2026-03-31
  2. Procure replacement application - 2026-06-30
  3. Migrate data and workflows - 2026-09-30
  4. Decommission legacy application - 2026-12-31

Status: Risk Accepted (AO Approval: 2026-01-10, Authorization expires: 2026-12-31)

Risk Level: High (with compensating controls: Moderate)

Original Detection Date: 2025-10-15

Vendor Dependency: Legacy Vendor Inc. (will not provide secure access alternative)

Risk Acceptance Justification:
  Mission-critical application with no secure vendor support alternative.
  Replacement project underway with 12-month timeline.
  Compensating controls reduce risk to acceptable level.
  AO approval obtained with annual reauthorization requirement.
```

---

## Monthly POA&M Updates

**FedRAMP Requirement**: Update POA&M monthly with ConMon submissions.

**Required Updates**:

1. **Status Changes**: Mark completed POA&Ms, update ongoing status
2. **Milestone Updates**: Revise dates if delayed, add explanations
3. **New Findings**: Add POA&Ms for new scan/assessment findings
4. **Closure Validation**: Attach evidence for completed POA&Ms

**Submission**: Excel file via FedRAMP portal

---

## POA&M Best Practices

### Do's

✅ **Be Specific**: Detailed weakness descriptions with affected systems
✅ **Be Realistic**: Achievable milestones, realistic timelines
✅ **Be Accountable**: Clear POC assignments, resource identification
✅ **Be Proactive**: Identify potential delays early, request extensions before deadline
✅ **Be Evidence-Based**: Attach scan reports, assessment findings

### Don'ts

❌ **Don't Be Vague**: "Improve security" is not a weakness description
❌ **Don't Miss Deadlines**: Late POA&Ms = compliance issues, potential ATO suspension
❌ **Don't Skip Milestones**: Every POA&M needs measurable progress steps
❌ **Don't Ignore Dependencies**: Document vendor dependencies, external blockers
❌ **Don't Create Duplicate POA&Ms**: Consolidate similar findings when appropriate

---

## Automation Opportunities

### From Vulnerability Scanners

Many scanners can export findings in formats compatible with POA&M generation:

- CVSS scores → Severity mapping
- CVE IDs → Control mappings (with custom rules)
- Affected hosts → System inventory correlation

### POA&M Management Tools

Third-party tools provide:

- Automated POA&M generation from scans
- Workflow tracking (milestones, deadlines)
- Dashboard reporting for AO visibility
- Integration with ticketing systems (Jira, ServiceNow)

**Examples**: GovReady, Tugboat Logic, Hyperproof, Drata

---

## References

- [FedRAMP POA&M Documentation](https://www.fedramp.gov/docs/rev5/playbook/csp/authorization/poam/)
- [FedRAMP Continuous Monitoring Deliverables Template](https://www.fedramp.gov/resources/templates/FedRAMP-Continuous-Monitoring-Deliverables-Template.xlsx)
- [NIST SP 800-171 POA&M Guidance](https://csrc.nist.gov/publications/detail/sp/800-171/rev-2/final)
- [FedRAMP PMO Guidance](https://www.fedramp.gov/documents-templates/)

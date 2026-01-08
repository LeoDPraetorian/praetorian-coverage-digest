# CIS Benchmark Scoring Methodology

**Purpose**: Detailed assessment and scoring guidance for CIS Benchmark compliance

**Last Updated**: 2026-01-07

---

## Assessment Classification

### Terminology Evolution

**Historical (deprecated)**:
- "Scored" = Recommendations that affected the compliance score
- "Not Scored" = Recommendations excluded from scoring

**Current (CIS Controls v8+)**:
- "Automated" = System state can be automatically evaluated
- "Manual" = Requires human verification and judgment

**Rationale for change**: Old terminology implied manual recommendations were less important. New terminology clarifies **assessment method**, not importance.

---

## Automated Recommendations

### Definition

Recommendations where **system state can be automatically evaluated** against the recommended state, producing definitive pass/fail results.

### Characteristics

✅ **Deterministic** - Same input always produces same result
✅ **Repeatable** - Can be assessed multiple times with consistent outcomes
✅ **Tool-supported** - CIS-CAT Pro, cloud-native tools can assess automatically
✅ **API/CLI accessible** - Configuration values queryable programmatically

### Examples

**AWS**:
```
[CloudTrail.1] - CloudTrail enabled in all regions
    ↳ Automated: Query AWS API → TRUE/FALSE

[EC2.7] - EBS default encryption enabled
    ↳ Automated: Check account settings → ENABLED/DISABLED
```

**Azure**:
```
3.15 - Storage minimum TLS version 1.2
    ↳ Automated: Query storage account → TLS_1_2 or lower

5.1.6 - NSG Flow Logs captured
    ↳ Automated: Enumerate NSGs → FlowLogsEnabled TRUE/FALSE
```

**Linux**:
```
5.2.1 - Ensure SSH Protocol is set to 2
    ↳ Automated: grep /etc/ssh/sshd_config → Protocol 2

1.1.1.1 - Ensure mounting of cramfs filesystems is disabled
    ↳ Automated: lsmod | grep cramfs → (no output = pass)
```

### Scoring Impact

**Automated recommendations ALWAYS affect the compliance score.**

---

## Manual Recommendations

### Definition

Recommendations requiring **manual steps** to determine whether the system's configured state is as expected. Cannot be automatically assessed due to:

- Complex policy decisions
- Context-dependent configurations
- Human judgment requirements
- Business-specific interpretations

### Characteristics

⚠️ **Contextual** - Implementation varies by organization
⚠️ **Judgment-based** - Requires human evaluation
⚠️ **Policy-driven** - Depends on organizational policies
⚠️ **Not automatable** - No API/CLI can definitively assess

### Examples

**Organizational Policies**:
```
Security awareness training completion
    ↳ Manual: Review training records, completion rates
    ↳ Cannot automate: Requires verification of training quality, retention

Incident response plan adequacy
    ↳ Manual: Review IR plan, tabletop exercise results
    ↳ Cannot automate: Requires expert judgment on plan effectiveness
```

**Physical Security**:
```
Physical access controls to data center
    ↳ Manual: Site inspection, badge reader logs review
    ↳ Cannot automate: Requires physical verification

Proper disposal of sensitive media
    ↳ Manual: Review disposal procedures, chain of custody
    ↳ Cannot automate: Requires verification of destruction process
```

**Business Context**:
```
Third-party risk assessment reviews
    ↳ Manual: Evaluate vendor security questionnaires
    ↳ Cannot automate: Requires business judgment on acceptable risk

Data classification policy enforcement
    ↳ Manual: Spot-check data labeling compliance
    ↳ Cannot automate: Requires understanding of data sensitivity
```

### Scoring Impact

**Manual recommendations are EXCLUDED from the compliance score.**

**Critical Principle**: Manual recommendations are **equally important** for security posture but excluded from scoring to prevent misleading metrics.

---

## Result Statuses

### Pass

**Definition**: The recommendation was correctly applied and verified.

**Requirements**:
- Configuration matches CIS recommendation
- Verification confirms correct implementation
- No deviations from benchmark guidance

**Example**: CloudTrail enabled in all regions → API query returns multi-region trail → **PASS**

### Fail

**Definition**: The recommendation was not applied or incorrectly configured.

**Requirements**:
- Configuration does not match CIS recommendation
- Missing control or insecure setting detected

**Example**: EBS default encryption disabled → API query returns disabled status → **FAIL**

### Not Applicable (N/A)

**Definition**: The recommendation relates to requirements that aren't relevant to the specific environment.

**Valid Reasons for N/A**:
- **Technology not in use**: Recommendation for Docker Swarm, but environment uses Kubernetes
- **Service not enabled**: Recommendation for Amazon RDS, but organization uses Aurora Serverless
- **Platform difference**: Recommendation for Windows, but system is Linux
- **Architecture decision**: Recommendation for on-premise, but organization is cloud-only

**Example**:
```
Kubernetes Recommendation 5.2.7: Ensure admission of containers with added capabilities
    ↓
Organization doesn't use Kubernetes → N/A
```

**Scoring Treatment**: N/A recommendations are **excluded from both numerator and denominator** in score calculation.

---

## Compliance Score Calculation

### Formula

```
Compliance Score = (Passed Automated Checks / Total Automated Checks - N/A) × 100
```

### Components

- **Passed Automated Checks**: Number of automated recommendations with PASS status
- **Total Automated Checks**: All automated recommendations in the benchmark
- **N/A**: Not Applicable recommendations (excluded from denominator)
- **Manual Recommendations**: NOT included in any part of the calculation

### Detailed Example

**Environment**: AWS with CIS Foundations Benchmark v3.0.0 (43 controls)

**Assessment Results**:
- Total recommendations: 43
- Automated recommendations: 38
- Manual recommendations: 5
- Automated PASS: 30
- Automated FAIL: 6
- Automated N/A: 2 (organization doesn't use specific AWS services)

**Score Calculation**:
```
Compliance Score = (30 / (38 - 2)) × 100
                 = (30 / 36) × 100
                 = 83.33%
```

**Manual recommendations** (5) are tracked separately but don't affect the 83.33% score.

### Score Ranges

| Score Range | Interpretation                | Recommended Action                  |
| ----------- | ----------------------------- | ----------------------------------- |
| 95-100%     | Excellent compliance          | Maintain continuous monitoring      |
| 85-94%      | Strong compliance             | Address remaining gaps              |
| 70-84%      | Moderate compliance           | Prioritize failed checks            |
| 50-69%      | Weak compliance               | Significant remediation required    |
| <50%        | Non-compliant                 | Urgent security improvements needed |

**Note**: Organizations set their own thresholds. Common targets: 80%, 90%, 95%.

---

## Assessment Tools and Methods

### CIS-CAT Pro Assessor

**Capabilities**:
- Automated scanning of system configurations
- XCCDF/OVAL-based assessments
- HTML reports with pass/fail details
- Compliance score calculation (0-100%)
- Historical trend analysis

**Scoring Output**:
```
Benchmark: CIS Microsoft Windows Server 2022 v1.0.0
Profile: Level 1
Total Recommendations: 237
Automated: 189
Manual: 48
Passed: 156
Failed: 28
Not Assessed: 5
Compliance Score: 85.2%
```

### Cloud-Native Tools

**AWS Security Hub**:
- CIS AWS Foundations Benchmark v3.0.0 certified
- Continuous compliance monitoring
- Pass/Fail/Not Available statuses
- Security score (0-100) based on passed checks
- Integration with AWS Config Rules

**Azure Policy**:
- 200+ built-in CIS controls
- Compliance percentage per policy initiative
- Real-time compliance dashboard
- Remediation recommendations
- Policy-as-Code deployment

**GCP Security Command Center**:
- CIS GCP Foundations Benchmark certified (multiple versions)
- Daily compliance calculation
- Active + muted findings model
- Compliance percentage per resource

### Manual Assessment

**When Required**:
- Manual recommendations (cannot be automated)
- Initial benchmark familiarization
- Verification of automated tool accuracy
- Compliance audit preparation

**Process**:
1. Review benchmark PDF for manual recommendations
2. Collect evidence (policies, logs, screenshots)
3. Document compliance status with justification
4. Maintain audit trail for all manual assessments

---

## Continuous Assessment Best Practices

### Scheduling

**Automated Scans**:
- **Critical systems**: Daily
- **Production systems**: Weekly
- **Development systems**: Monthly
- **Per CIS Control 7.1**: Quarterly minimum (authenticated scans)

**Manual Assessments**:
- **Organizational policies**: Quarterly
- **Physical security**: Semi-annually
- **Compliance audits**: Annually

### Configuration Drift Detection

**Problem**: Systems drift from compliant state over time due to:
- Manual configuration changes
- Software updates
- New deployments
- Infrastructure-as-Code updates

**Solution**: Continuous monitoring

**Implementation**:
```
SIEM Integration
    ↓
Configuration Change Detected
    ↓
Evaluate Against CIS Benchmark
    ↓
If Drift Detected → Alert + Create Ticket
    ↓
Automated Remediation (if possible)
```

### Trending and Reporting

**Metrics to Track**:
1. **Overall compliance score** (trend over time)
2. **New failures introduced** (since last scan)
3. **Time to remediation** (from failure detection to resolution)
4. **Persistent failures** (failures not addressed for >30 days)
5. **N/A justifications** (review periodically for validity)

**Reporting Frequency**:
- **Executive dashboard**: Monthly summary
- **Security team**: Weekly detailed reports
- **Compliance auditors**: Quarterly comprehensive reports

---

## Common Scoring Challenges

### Challenge 1: N/A Misuse

**Problem**: Marking controls as N/A to artificially inflate score

**Example**:
```
AWS [CloudTrail.1] - CloudTrail enabled in all regions
Status: N/A
Justification: "We don't use CloudTrail"
```

**Why it's wrong**: CloudTrail is a foundational logging service; choosing not to use it doesn't make the control N/A.

**Correct approach**:
```
Status: FAIL
Remediation plan: Enable CloudTrail by Q2
```

**Rule**: N/A is only valid when the technology/service genuinely doesn't exist in your environment, not when you choose not to implement a control.

### Challenge 2: Ignoring Manual Recommendations

**Problem**: Focusing solely on automated checks because they affect the score

**Why it's dangerous**: Manual recommendations often cover critical organizational controls:
- Security awareness training
- Incident response plans
- Physical security
- Vendor risk management

**Best Practice**: Track manual recommendations separately with same rigor as automated checks.

### Challenge 3: Tool Lag Behind Benchmarks

**Problem**: Automated tools may lag behind latest benchmark versions

**Example**:
- **Latest CIS Docker Benchmark**: v1.7.0 (July 2024)
- **docker-bench-security**: v1.6.0 (6-12 months behind)

**Impact**: Compliance score may not reflect latest security guidance

**Mitigation**:
1. Note benchmark version used in reports
2. Supplement with manual checks for new recommendations
3. Plan for tool updates when available

### Challenge 4: Cross-Platform Scoring

**Problem**: Different platforms have different control counts and automation levels

**Example**:
- AWS CIS Benchmark v3.0.0: 43 controls (95% automated)
- Azure CIS Benchmark v2.0.0: 100+ controls (85% automated)
- Linux CIS Benchmark: Distribution-specific (80-90% automated)

**Implication**: 85% on one platform is not directly comparable to 85% on another

**Best Practice**: Report scores per platform benchmark, not aggregated across platforms

---

## Scoring Transparency

### What to Include in Reports

**Essential Elements**:
1. **Benchmark name and version** (e.g., CIS AWS Foundations v3.0.0)
2. **Profile level assessed** (Level 1, Level 2, STIG)
3. **Total recommendations** (all controls in benchmark)
4. **Automated vs Manual breakdown**
5. **Pass/Fail/N/A counts**
6. **Compliance score formula shown**
7. **N/A justifications documented**
8. **Assessment date and tool used**
9. **Manual assessment status** (tracked separately)

**Example Report Header**:
```
CIS Benchmark Compliance Report

Benchmark: CIS Amazon Web Services Foundations Benchmark
Version: v3.0.0
Profile: Level 1
Assessment Date: 2026-01-07
Tool: AWS Security Hub

Total Recommendations: 43
  - Automated: 38
  - Manual: 5

Automated Recommendations:
  - Passed: 30
  - Failed: 6
  - Not Applicable: 2

Compliance Score: (30 / 36) × 100 = 83.33%

Manual Recommendations: Tracked separately (see Appendix A)
```

---

## Key Takeaways

1. **Only Automated Recommendations Affect Score**: Manual recommendations are equally important but excluded from scoring
2. **N/A Must Be Justified**: Not Applicable status requires valid business/technical justification
3. **Manual Recommendations Still Matter**: Track manual controls with same rigor despite exclusion from score
4. **Tool Lag**: Automated tools may lag behind latest benchmarks; note version discrepancies
5. **Platform-Specific Scores**: Don't compare scores across different platforms (AWS vs Azure vs GCP)
6. **Continuous Monitoring**: One-time assessments miss configuration drift; implement continuous scanning
7. **Trending is Key**: Single score is a snapshot; trend over time shows security posture improvement
8. **Transparency**: Always document benchmark version, profile, N/A justifications, and manual assessment status

---

## References

- [Changes to CIS Benchmark Scoring](https://www.cisecurity.org/insights/blog/changes-to-cis-benchmark-assessment-recommendation-scoring)
- [CIS-CAT Pro Assessor Documentation](https://ciscat-assessor.docs.cisecurity.org/)
- [CIS Benchmarks FAQ](https://www.cisecurity.org/cis-benchmarks/cis-benchmarks-faq)
- [AWS Security Hub CIS Scoring](https://docs.aws.amazon.com/securityhub/latest/userguide/securityhub-standards-cis.html)
- [Azure Policy CIS Compliance](https://learn.microsoft.com/en-us/azure/governance/policy/samples/cis-azure-2-0-0)

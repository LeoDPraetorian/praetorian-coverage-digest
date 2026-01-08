---
name: mapping-to-cis-benchmarks
description: Use when mapping security findings to CIS Benchmark recommendations - provides control IDs, profile levels, scoring methodology, and remediation guidance across AWS, Azure, GCP, Linux, Windows, Kubernetes, and Docker platforms
allowed-tools: Read, Grep, Glob, WebFetch, WebSearch
---

# Mapping to CIS Benchmarks

**Guidance for mapping security findings and misconfigurations to CIS (Center for Internet Security) Benchmark recommendations for compliance reporting, remediation, and audit readiness.**

## When to Use

Use this skill when:

- Mapping a security finding to a CIS Benchmark control ID
- Determining which CIS profile level (Level 1, Level 2, STIG) a recommendation belongs to
- Referencing CIS recommendations in vulnerability reports or security capabilities
- Scoring compliance against CIS Benchmarks (pass/fail/not applicable)
- Providing remediation guidance based on CIS hardening standards
- Working with VQL capabilities, Nuclei templates, or security scanners that need compliance mapping

## CIS Benchmarks Overview

CIS Benchmarks are consensus-based security configuration guidelines developed by cybersecurity experts. They provide prescriptive hardening recommendations across platforms and technologies.

### Benchmark Structure

Each CIS Benchmark follows a hierarchical structure:

- **Sections**: Major security domains (e.g., Identity and Access Management, Logging and Monitoring)
- **Recommendations**: Specific control items with unique IDs (e.g., CIS AWS 2.1.1)
- **Profiles**: Implementation levels (Level 1, Level 2, STIG)
- **Scoring**: Assessment status (Scored vs Not Scored)

### Profile Levels

| Profile | Purpose                                | Target Environment         |
| ------- | -------------------------------------- | -------------------------- |
| Level 1 | Basic security, minimal impact         | All environments           |
| Level 2 | Defense-in-depth, may impact usability | High-security environments |
| STIG    | DoD compliance requirements            | Government systems         |

**Note**: Recommendations can belong to multiple profiles. Level 2 includes all Level 1 recommendations.

## Platform Coverage

CIS provides benchmarks for multiple platforms. See [references/platform-coverage.md](references/platform-coverage.md) for detailed platform-specific guidance.

**Quick reference:**

| Platform   | Benchmark Name                       | Latest Version | Key Focus Areas                     |
| ---------- | ------------------------------------ | -------------- | ----------------------------------- |
| AWS        | CIS Amazon Web Services Foundations  | v3.0.0         | IAM, Storage, Logging, Networking   |
| Azure      | CIS Microsoft Azure Foundations      | v2.1.0         | Identity, Storage, Logging, Network |
| GCP        | CIS Google Cloud Platform Foundation | v2.0.0         | IAM, Storage, Logging, Network      |
| Linux      | CIS Distribution Independent Linux   | v3.0.0         | Access Control, Services, Network   |
| Windows    | CIS Microsoft Windows                | Multiple       | Access Control, Audit, Services     |
| Kubernetes | CIS Kubernetes                       | v1.9.0         | API, Control Plane, Worker Nodes    |
| Docker     | CIS Docker                           | v1.6.0         | Host, Daemon, Images, Containers    |

## Mapping Methodology

### Step 1: Identify Finding Type

Categorize the security finding:

- **Misconfiguration**: Incorrect settings (e.g., public S3 bucket)
- **Missing control**: Security feature not enabled (e.g., MFA disabled)
- **Weak configuration**: Insecure settings (e.g., weak password policy)
- **Compliance violation**: Policy requirement not met

### Step 2: Determine Platform and Scope

Identify:

- **Platform**: AWS, Azure, GCP, Linux, Windows, Kubernetes, Docker
- **Service/Component**: Specific resource type (S3, IAM, VM, etc.)
- **Security domain**: IAM, Logging, Network, Storage, etc.

### Step 3: Locate CIS Control

Use [references/control-mapping-index.md](references/control-mapping-index.md) to find:

- **Control ID**: Unique identifier (e.g., CIS AWS 2.1.1)
- **Control Title**: Human-readable name
- **Profile Level**: Level 1, Level 2, or STIG
- **Scored**: Whether the control is scored in assessments

### Step 4: Document Mapping

Include in security finding:

- **CIS Control ID**: e.g., "CIS AWS 2.1.1"
- **Control Title**: e.g., "Ensure S3 bucket access logging is enabled"
- **Profile Level**: e.g., "Level 1"
- **Benchmark Version**: e.g., "v3.0.0"
- **Remediation Reference**: Link to CIS documentation section

## Scoring Methodology

CIS Benchmarks use a three-state scoring model:

| Status         | Definition                                | Action                 |
| -------------- | ----------------------------------------- | ---------------------- |
| Pass           | Configuration meets CIS recommendation    | No action required     |
| Fail           | Configuration violates CIS recommendation | Remediation required   |
| Not Applicable | Control doesn't apply to this environment | Document justification |

### Assessment Approach

1. **Automated scanning**: Use security tools to check configurations
2. **Manual verification**: Validate findings requiring human judgment
3. **Exception handling**: Document justified deviations with risk acceptance
4. **Continuous monitoring**: Re-assess after configuration changes

## Common Mapping Examples

### Cloud Storage

**Finding**: Public S3 bucket detected

**CIS Mapping**:

- **Control**: CIS AWS 2.1.5 - Ensure S3 buckets are not publicly accessible
- **Profile**: Level 1 (Scored)
- **Remediation**: Remove public access, implement bucket policies with least privilege

### Identity and Access

**Finding**: MFA not enabled for root account

**CIS Mapping**:

- **Control**: CIS AWS 1.4 - Ensure MFA is enabled for the root user account
- **Profile**: Level 1 (Scored)
- **Remediation**: Enable virtual or hardware MFA for root account

### Logging and Monitoring

**Finding**: CloudTrail logging disabled

**CIS Mapping**:

- **Control**: CIS AWS 3.1 - Ensure CloudTrail is enabled in all regions
- **Profile**: Level 1 (Scored)
- **Remediation**: Enable CloudTrail with multi-region configuration

## Vulnerability Scanner Integration

### CVE-to-CIS Mapping Pattern

**Critical Finding**: No direct CVE-to-CIS API mapping database exists. Integration occurs through CIS Control 7 (Continuous Vulnerability Management).

**Integration Architecture**:
```
CVE Database (NVD)
    ↓
Vulnerability Scanner (Tenable, Qualys, etc.)
    ↓
Security Platform
    ↓
CIS Control 7 Mapping (Vulnerability Management)
    ↓
Compliance Report
```

### CIS Control 7: Continuous Vulnerability Management

**Primary control for vulnerability-to-CIS mapping**:
- **Requirements**: Authenticated scans quarterly minimum, SCAP-compliant tools
- **Standards**: CVE list, NIST SCAP, standardized vulnerability classification
- **Implementation Groups**: Controls 7.1-7.4 apply to all (IG1, IG2, IG3)

### Tool Integration Examples

**Tenable Integration**:
- Active credentialed scanning across all implementation groups
- CIS Control 3/18 dashboard for vulnerability management
- Real-time continuous monitoring and reporting

**Nucleus Platform**:
- Native import of CIS compliance scan data
- Each CIS control becomes a finding in compliance section
- Severity scoring from scanner + third-party data

**Qualys SCA**:
- Automated security configuration assessment based on CIS Benchmarks
- Integration with GRC, ticketing systems, SIEM, ERM, IDS

**SIEM Integration Pattern**:
```
System Configuration Change
    ↓
SIEM detects event via log collection
    ↓
Correlation rule evaluates against CIS Benchmark
    ↓
Configuration drift identified
    ↓
Automated alert/remediation triggered
```

### Vulnerability Finding Structure

**Include in vulnerability findings**:
```json
{
  "cve_id": "CVE-2024-1234",
  "cvss_score": 7.5,
  "cis_control_id": "7.3",
  "cis_control_title": "Perform Automated Vulnerability Scans",
  "cis_benchmark_id": "AWS [EC2.7]",
  "cis_profile": "Level 1",
  "benchmark_version": "v3.0.0"
}
```

## VQL Capability Integration

When implementing VQL capabilities that detect CIS Benchmark violations:

```vql
-- Example: Check for public S3 buckets (CIS AWS 2.1.5)
LET findings = SELECT
  bucket_name,
  'CIS AWS 2.1.5' AS cis_control_id,
  'Ensure S3 buckets are not publicly accessible' AS cis_control_title,
  'Level 1' AS cis_profile,
  'v3.0.0' AS benchmark_version
FROM aws_s3_buckets
WHERE public_access = TRUE
```

Include CIS metadata in finding output:

- `cis_control_id`: CIS Benchmark control identifier
- `cis_control_title`: Human-readable control name
- `cis_profile`: Profile level (Level 1, Level 2, STIG)
- `benchmark_version`: CIS Benchmark version number

## Nuclei Template Integration

When creating Nuclei templates for CIS compliance checks:

```yaml
id: cis-aws-s3-public-access
info:
  name: CIS AWS 2.1.5 - S3 Bucket Public Access
  author: security-team
  severity: high
  reference:
    - https://www.cisecurity.org/benchmark/amazon_web_services
  classification:
    cis-benchmark: "AWS v3.0.0"
    cis-control-id: "2.1.5"
    cis-profile: "Level 1"
  tags: cis,aws,s3,compliance
```

## Integration

### Called By

- Security capability developers implementing compliance checks
- Security engineers mapping findings to compliance frameworks
- Audit teams generating CIS compliance reports
- Capability-lead, capability-developer agents during security capability design

### Requires (invoke before starting)

None - standalone framework reference skill

### Calls (during execution)

None - terminal skill providing framework documentation

### Pairs With (conditional)

| Skill                     | Trigger                                | Purpose                          |
| ------------------------- | -------------------------------------- | -------------------------------- |
| `mapping-to-cwe`          | When mapping to multiple frameworks    | Map finding to CWE weakness      |
| `mapping-to-mitre-attack` | When threat context needed             | Map to ATT&CK tactics/techniques |
| `mapping-to-nist-csf`     | When NIST CSF compliance also required | Map to NIST CSF categories       |
| `cvss-scoring`            | When quantitative risk scoring needed  | Calculate CVSS score             |
| `mapping-to-sans-top-25`  | When prioritizing by exploitability    | Map to SANS Top 25 weaknesses    |

## References

- [references/platform-coverage.md](references/platform-coverage.md) - Platform-specific CIS Benchmark details
- [references/control-mapping-index.md](references/control-mapping-index.md) - Comprehensive control ID index
- [references/profile-guidance.md](references/profile-guidance.md) - Level 1 vs Level 2 vs STIG selection criteria
- [references/remediation-scripts.md](references/remediation-scripts.md) - Example remediation code for common findings
- [references/scoring-methodology.md](references/scoring-methodology.md) - Detailed assessment and scoring guidance
- [references/links-to-official-docs.md](references/links-to-official-docs.md) - Official CIS Benchmark documentation links

## Related Resources

### Official Documentation

- **CIS Benchmarks**: https://www.cisecurity.org/cis-benchmarks
- **CIS Controls**: https://www.cisecurity.org/controls
- **CIS SecureSuite Membership**: https://www.cisecurity.org/cis-securesuite
- **CIS WorkBench**: https://workbench.cisecurity.org/

### Download Benchmarks

- **AWS Foundations Benchmark**: https://www.cisecurity.org/benchmark/amazon_web_services
- **Azure Foundations Benchmark**: https://www.cisecurity.org/benchmark/azure
- **GCP Foundations Benchmark**: https://www.cisecurity.org/benchmark/google_cloud_computing_platform
- **Distribution Independent Linux**: https://www.cisecurity.org/benchmark/distribution_independent_linux
- **Kubernetes Benchmark**: https://www.cisecurity.org/benchmark/kubernetes
- **Docker Benchmark**: https://www.cisecurity.org/benchmark/docker

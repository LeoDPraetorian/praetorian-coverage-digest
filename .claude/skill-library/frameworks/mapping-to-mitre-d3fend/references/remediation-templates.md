# Remediation Guidance Templates

Templates for writing D3FEND-aligned remediation guidance in Chariot security findings.

---

## Standard Remediation Template

**Format for remediation guidance:**

```
1. [Primary Defense Category]: [Specific Action] (D3-XXX)
   - Implementation: [How to deploy]
   - Priority: Critical/High/Medium

2. [Secondary Defense Category]: [Specific Action] (D3-XXX)
   - Implementation: [How to deploy]
   - Priority: High/Medium

3. [Detection Category]: [Monitoring Action] (D3-XXX)
   - Implementation: [What to monitor]
   - Priority: Medium
```

---

## Template Examples

### Example 1: Hardcoded Credentials (T1552.001)

```
Remediation for T1552.001 (Hardcoded Credentials):

1. Harden: Remove hardcoded credentials (D3-CH)
   - Implementation: Migrate to AWS Secrets Manager / HashiCorp Vault
   - Priority: Critical

2. Harden: Rotate compromised credentials (D3-CH)
   - Implementation: Revoke existing keys, generate new ones
   - Priority: Critical

3. Detect: Scan code repositories for secrets (D3-FA)
   - Implementation: Implement git-secrets / TruffleHog in CI/CD
   - Priority: High
```

### Example 2: IMDSv1 Enabled (T1552.005)

```
Remediation for T1552.005 (Cloud Metadata API):

1. Harden: Enforce IMDSv2 (D3-NTA for detection, D3-NI to isolate metadata endpoint)
   - Implementation: Set EC2 metadata options to require IMDSv2 tokens
   - Priority: Critical

2. Harden: Use IAM roles with least privilege (D3-UA)
   - Implementation: Review IAM role permissions, remove unused permissions
   - Priority: High

3. Detect: Monitor 169.254.169.254 access (D3-NTA)
   - Implementation: VPC Flow Logs with alerts on metadata endpoint access
   - Priority: Medium
```

### Example 3: Public S3 Bucket (T1530)

```
Remediation for T1530 (Data from Cloud Storage):

1. Harden: Set bucket to private (D3-UA)
   - Implementation: Update bucket policy to deny public access
   - Priority: Critical

2. Harden: Enable encryption (D3-ECR)
   - Implementation: Enable default encryption with SSE-S3 or SSE-KMS
   - Priority: High

3. Detect: Monitor bucket access (D3-RA)
   - Implementation: Enable S3 access logging, CloudTrail data events
   - Priority: Medium
```

---

## Chariot Finding Integration

### Go Code Pattern

```go
type Finding struct {
    Title       string   `json:"title"`
    Description string   `json:"description"`
    CWE         string   `json:"cwe"`
    MITREAttack []string `json:"mitre_attack"`
    D3FEND      []string `json:"d3fend"`         // NEW: Defensive techniques
    Remediation string   `json:"remediation"`    // Plain-text guidance
}

// Example: IMDSv1 finding with complete chain
finding := &tabularium.Finding{
    Title:       "EC2 Instance Metadata Service v1 Enabled",
    Description: "IMDSv1 allows SSRF attacks to steal IAM credentials",
    CWE:         "CWE-918",  // SSRF
    MITREAttack: []string{"T1552.005"},  // Cloud Metadata API
    D3FEND:      []string{"D3-NTA", "D3-NI"},  // Network Traffic Analysis + Network Isolation
    Remediation: "1. Enforce IMDSv2 (D3-NTA for detection, D3-NI to isolate metadata endpoint)\n" +
                 "2. Use IAM roles with least privilege (D3-UA)\n" +
                 "3. Monitor 169.254.169.254 access (D3-NTA)",
}
```

### Python Code Pattern

```python
from dataclasses import dataclass
from typing import List

@dataclass
class Finding:
    title: str
    description: str
    cwe: str
    mitre_attack: List[str]
    d3fend: List[str]
    remediation: str

# Example: Hardcoded credentials
finding = Finding(
    title="Hardcoded AWS Credentials",
    description="AWS access keys found in source code",
    cwe="CWE-798",
    mitre_attack=["T1552.001"],
    d3fend=["D3-CH"],
    remediation="""1. Harden: Remove hardcoded credentials (D3-CH)
   - Implementation: Migrate to AWS Secrets Manager
   - Priority: Critical

2. Detect: Scan repositories for secrets (D3-FA)
   - Implementation: git-secrets in pre-commit hooks
   - Priority: High"""
)
```

---

## Validation Checklist

Before finalizing D3FEND recommendations, verify:

1. ✅ Is defensive technique specific (D3-XXX ID, not generic)?
2. ✅ Does it directly counter the ATT&CK technique?
3. ✅ Is there a defense-in-depth approach (multiple defenses)?
4. ✅ Are defenses prioritized (Critical > High > Medium)?
5. ✅ Is implementation guidance provided?

---

## Common Patterns

### Pattern 1: Multi-Layer Defense

**For critical vulnerabilities, always recommend 3+ defenses:**

```
1. Harden (Prevention) - Primary
2. Detect (Identification) - Backup
3. Isolate (Containment) - Failsafe
```

### Pattern 2: Complete CWE → ATT&CK → D3FEND Chain

**Always provide the full mapping chain:**

```go
finding := &Finding{
    CWE:         "CWE-XXX",     // Weakness type
    MITREAttack: []string{"T####"}, // Offensive technique
    D3FEND:      []string{"D3-XXX"}, // Defensive technique
    Remediation: "[Actionable guidance with D3FEND IDs]",
}
```

### Pattern 3: Priority-Based Recommendations

**Order remediation steps by priority:**

```
1. Critical: Immediate action required (D3-CH, D3-UA)
2. High: Deploy within 30 days (D3-ECR, D3-MFAA)
3. Medium: Deploy within 90 days (D3-NTA, D3-FA)
```

---

## Anti-Patterns to Avoid

### ❌ Generic Advice Without D3FEND IDs

**Wrong:**

```
Remediation: Use intrusion detection
```

**Correct:**

```
Remediation: Implement D3-ISVA (Inbound Session Volume Analysis) to detect exploit attempts
```

### ❌ Single Defense for Critical Vulnerabilities

**Wrong:**

```
Remediation: Enable MFA
```

**Correct:**

```
Remediation:
1. Harden: Enable MFA (D3-MFAA) - Priority: Critical
2. Harden: Enforce least privilege (D3-UA) - Priority: High
3. Detect: Monitor authentication logs (D3-ACH) - Priority: Medium
```

### ❌ Detection Instead of Prevention

**Wrong:**

```
Remediation for hardcoded password:
1. Detect: Scan for secrets (D3-FA)
```

**Correct:**

```
Remediation for hardcoded password:
1. Harden: Remove hardcoded password (D3-CH) - Priority: Critical
2. Detect: Scan for secrets (D3-FA) - Priority: High (backup)
```

---

## External Resources

- [D3FEND Defensive Techniques](https://d3fend.mitre.org/techniques/)
- [ATT&CK to D3FEND Mappings](https://d3fend.mitre.org/offensive-technique/)

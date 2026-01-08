# NIST CSF 2.0 Implementation Examples

**Real-world capability implementations mapped to NIST CSF 2.0 categories with practical examples for the Chariot platform.**

---

## Capability Coverage Matrix

### Chariot Platform Capabilities

| Capability Type        | Example                    | Primary CSF Category | Secondary CSF Category | Notes                                |
| ---------------------- | -------------------------- | -------------------- | ---------------------- | ------------------------------------ |
| Asset Discovery        | DNS enumeration, port scan | ID.AM-01             | ID.RA-01               | Hardware/software inventory          |
| Vulnerability Scanner  | CVE detection (Nuclei)     | ID.RA-01             | PR.IP-12               | Vuln identification → patching       |
| Cloud Misconfiguration | AWS security group audit   | ID.RA-01             | PR.AC-05               | Network segregation gaps             |
| Secret Scanner         | GitHub token detection     | ID.RA-01             | PR.DS-08               | Secrets management integrity         |
| Certificate Analysis   | Weak TLS detection         | ID.RA-01             | PR.DS-02               | Data in transit protection           |
| IAM Policy Audit       | Overprivileged IAM         | ID.RA-01             | PR.AA-04               | Least privilege assessment           |
| Container Security     | Dockerfile linting         | ID.RA-01             | PR.PS-01               | Baseline configuration               |
| SIEM Integration       | Log forwarding             | DE.CM-01             | DE.AE-01               | Continuous monitoring + baseline     |
| Threat Intelligence    | IOC correlation            | DE.AE-02             | RS.AN-05               | Threat intel → incident analysis     |
| Incident Response      | Automated containment      | RS.MI-01             | RS.MA-01               | Mitigation → incident management     |

---

## Implementation Examples by Category

### GOVERN (GV) Examples

**GV.OC - Organizational Context**
- **Chariot Use Case**: Asset inventory tagged by business criticality (crown jewels identified)
- **Implementation**: Assets tagged with `business_criticality: high/medium/low` metadata
- **CSF Mapping**: GV.OC-04 (Critical objectives/services communicated)

**GV.RM - Risk Management Strategy**
- **Chariot Use Case**: Risk appetite thresholds (auto-escalate Critical CVEs to leadership)
- **Implementation**: Findings with CVSS ≥9.0 trigger board notification workflow
- **CSF Mapping**: GV.RM-02 (Risk appetite and tolerance defined)

**GV.SC - Supply Chain Risk**
- **Chariot Use Case**: Third-party dependency scanning (npm, Go modules, Docker images)
- **Implementation**: Dependency scanner → GV.SC-07 (ongoing supplier monitoring)
- **Tools**: Snyk, GitHub Dependabot, Trivy for container images

---

### IDENTIFY (ID) Examples

**ID.AM - Asset Management**
- **Chariot Use Case**: Automated asset discovery via network scanning, cloud API enumeration
- **Implementation**:
  - DNS enumeration → ID.AM-01 (hardware inventory)
  - AWS EC2 listing → ID.AM-02 (software/systems inventory)
  - Network topology mapping → ID.AM-03 (network data flows)
- **Tools**: Nmap, AWS Config, Azure Resource Graph

**ID.RA - Risk Assessment**
- **Chariot Use Case**: Vulnerability scanning with prioritization
- **Implementation**:
  - Nuclei templates → ID.RA-01 (vulnerability identification)
  - Threat feed integration → ID.RA-02 (cyber threat intelligence)
  - CVSS scoring → ID.RA-05 (determine risk from threats/vulns)
  - Auto-prioritization → ID.RA-06 (risk responses identified)
- **Tools**: Nuclei, Nessus, Qualys VMDR, ThreatConnect

---

### PROTECT (PR) Examples

**PR.AA - Identity Management, Authentication, and Access Control**
- **Chariot Use Case**: IAM policy auditing for least privilege
- **Implementation**:
  - AWS IAM policy analysis → PR.AA-05 (access permissions managed)
  - MFA compliance check → PR.AA-03 (authentication)
  - Service account audit → PR.AA-01 (identities/credentials managed)
- **Tools**: AWS IAM Access Analyzer, Azure AD Identity Protection

**PR.DS - Data Security**
- **Chariot Use Case**: Encryption compliance scanning
- **Implementation**:
  - S3 bucket encryption check → PR.DS-01 (data at rest protected)
  - TLS/SSL analysis → PR.DS-02 (data in transit protected)
  - Data leak prevention checks → PR.DS-05 (leak protections implemented)
- **Tools**: CloudSploit, Prowler, custom VQL capabilities

**PR.PS - Platform Security**
- **Chariot Use Case**: Configuration baseline scanning and patch management
- **Implementation**:
  - CIS benchmark compliance → PR.PS-01 (configuration management)
  - Unpatched software detection → PR.PS-02 (software maintenance)
  - Container image scanning → PR.PS-01 (baseline configuration)
- **Tools**: Lynis, OpenSCAP, Docker Bench Security

---

### DETECT (DE) Examples

**DE.AE - Anomalies and Events**
- **Chariot Use Case**: Anomaly detection via behavior analysis
- **Implementation**:
  - Network traffic baseline → DE.AE-01 (baseline established)
  - Threat intel correlation → DE.AE-02 (detected events analyzed)
  - Phishing detection → DE.AE-06 (phishing/social engineering detected)
- **Tools**: Zeek, Suricata, CrowdStrike, Darktrace

**DE.CM - Continuous Monitoring**
- **Chariot Use Case**: 24/7 security monitoring and logging
- **Implementation**:
  - Network monitoring → DE.CM-01 (networks monitored)
  - Privileged user activity logs → DE.CM-03 (personnel activity monitored)
  - Daily vulnerability scans → DE.CM-08 (vulnerability scans performed)
- **Tools**: Splunk, ELK Stack, AWS GuardDuty, Azure Sentinel

---

### RESPOND (RS) Examples

**RS.MA - Incident Management**
- **Chariot Use Case**: Automated incident response workflows
- **Implementation**:
  - Critical finding detection → auto-create incident ticket → RS.MA-01
  - Integration with PagerDuty/ServiceNow for triaging → RS.MA-02
- **Tools**: PagerDuty, ServiceNow, Jira Service Management

**RS.MI - Incident Mitigation**
- **Chariot Use Case**: Automated containment for high-severity findings
- **Implementation**:
  - Auto-quarantine compromised EC2 instance → RS.MI-01 (incidents contained)
  - Newly discovered CVE → auto-add to patch queue → RS.MI-02 (newly identified vulns mitigated)
  - Update vulnerability database → RS.MI-03 (vulns incorporated into mgmt processes)
- **Tools**: AWS Lambda, Azure Functions, SOAR platforms

---

### RECOVER (RC) Examples

**RC.RP - Incident Recovery Plan Execution**
- **Chariot Use Case**: Automated backup restoration testing
- **Implementation**:
  - Scheduled backup validation → RC.RP-01 (recovery plan executed)
  - RTO/RPO compliance tracking → RC.RP-02 (recovery objectives met)
  - Post-incident lessons learned integration → RC.RP-03 (recovery processes updated)
- **Tools**: AWS Backup, Veeam, Commvault

**RC.CO - Incident Recovery Communication**
- **Chariot Use Case**: Stakeholder notification during recovery
- **Implementation**:
  - Auto-notify customers via status page → RC.CO-01 (public relations managed)
  - Internal recovery coordination via Slack → RC.CO-03 (recovery activities communicated)
- **Tools**: Statuspage.io, Slack, Microsoft Teams

---

## Gap Analysis Example

**Scenario**: Chariot platform currently has 10 capabilities. Perform CSF coverage analysis.

### Current Coverage

| Function   | Categories Covered     | Gap Categories                | Coverage % |
| ---------- | ---------------------- | ----------------------------- | ---------- |
| **GV**     | GV.OC, GV.RM, GV.SC    | GV.RR, GV.PO, GV.OV           | 50%        |
| **ID**     | ID.AM, ID.RA           | ID.IM                         | 67%        |
| **PR**     | PR.AA, PR.DS, PR.PS    | PR.AT, PR.IR                  | 60%        |
| **DE**     | DE.AE, DE.CM           | None                          | 100%       |
| **RS**     | RS.MA, RS.MI           | RS.AN, RS.CO                  | 50%        |
| **RC**     | RC.RP                  | RC.CO                         | 50%        |

### Prioritized Gap Remediation

**Priority 1 (High Impact):**
1. **ID.IM (Improvement)** - No lessons learned process
   - **Action**: Implement post-incident review workflow
   - **Effort**: 2 weeks
   - **CSF Mapping**: ID.IM-01, ID.IM-02, ID.IM-03

2. **GV.PO (Policy)** - No formal cybersecurity policies
   - **Action**: Document security policies, integrate with GV.OC
   - **Effort**: 4 weeks
   - **CSF Mapping**: GV.PO-01, GV.PO-02

**Priority 2 (Medium Impact):**
3. **PR.AT (Awareness and Training)** - No security training program
   - **Action**: Implement security awareness campaigns, phishing simulations
   - **Effort**: 3 weeks
   - **CSF Mapping**: PR.AT-01, PR.AT-02

4. **RS.AN (Incident Analysis)** - Limited forensics capabilities
   - **Action**: Deploy forensics tools, train SOC analysts
   - **Effort**: 6 weeks
   - **CSF Mapping**: RS.AN-01, RS.AN-02, RS.AN-03

**Priority 3 (Low Impact):**
5. **RC.CO (Recovery Communication)** - No formal recovery communication plan
   - **Action**: Create communication templates, integrate with status page
   - **Effort**: 2 weeks
   - **CSF Mapping**: RC.CO-01, RC.CO-02, RC.CO-03

---

## Tool Integration Examples

### Qualys VMDR → NIST CSF Mapping

**Auto-tag Qualys findings with CSF categories:**

```python
# Qualys API response
vuln = {
    "qid": 12345,
    "title": "OpenSSL Heartbleed Vulnerability",
    "severity": 5,
    "cvss_score": 9.3
}

# Map to CSF
csf_mapping = {
    "primary_function": "ID",
    "primary_category": "ID.RA",
    "primary_subcategory": "ID.RA-01",
    "supporting_categories": ["PR.IP-12"],  # Patch management
    "tier_impact": 2  # Impacts Tier 2 maturity (vulnerability mgmt)
}
```

### Splunk SIEM → CSF Dashboard

**Splunk query for CSF compliance:**

```spl
index=security
| eval csf_function=case(
    sourcetype="vulnerability_scan", "ID",
    sourcetype="access_logs", "PR",
    sourcetype="network_traffic", "DE",
    sourcetype="incident_alerts", "RS",
    sourcetype="backup_logs", "RC"
  )
| stats count by csf_function, severity
| eval compliance_status=if(count > threshold, "At Risk", "Compliant")
```

### AWS Security Hub → CSF 2.0 Standards

**Enable CSF 2.0 standard in Security Hub:**

```bash
aws securityhub batch-enable-standards \
  --standards-subscription-requests '[{
    "StandardsArn": "arn:aws:securityhub:us-east-1::standards/nist-csf/v2.0"
  }]'
```

---

## Official Sources

- **NIST CSF 2.0**: https://nvlpubs.nist.gov/nistpubs/CSWP/NIST.CSWP.29.pdf
- **Finding mappings**: See [finding-type-mappings.md](finding-type-mappings.md)
- **Subcategory reference**: See [subcategory-reference.md](subcategory-reference.md)

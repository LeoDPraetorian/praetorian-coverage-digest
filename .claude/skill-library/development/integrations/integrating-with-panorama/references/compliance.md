# Panorama Compliance Guide

> Last Updated: January 2026

This guide provides comprehensive compliance considerations for Panorama firewall API integrations, covering major regulatory frameworks and audit requirements.

---

## Overview

Firewall API integrations require careful attention to compliance requirements. Panorama, as a centralized firewall management platform, touches critical security infrastructure that is subject to multiple regulatory frameworks.

### Key Compliance Considerations

| Area              | Primary Concern               | Related Frameworks   |
| ----------------- | ----------------------------- | -------------------- |
| Access Control    | API credential management     | SOC 2, PCI-DSS, NIST |
| Audit Logging     | Configuration change tracking | All frameworks       |
| Data Protection   | Log data handling             | GDPR, SOC 2          |
| Network Security  | Firewall rule integrity       | PCI-DSS, NIST        |
| Change Management | Controlled modifications      | SOC 2, PCI-DSS       |

### Integration Points Requiring Compliance Review

```
Panorama Integration
├── Authentication Layer
│   ├── API key storage
│   ├── Session management
│   └── Access logging
├── Configuration Management
│   ├── Rule modifications
│   ├── Policy changes
│   └── Object updates
├── Data Collection
│   ├── Log retrieval
│   ├── Traffic statistics
│   └── Threat intelligence
└── Reporting
    ├── Compliance reports
    ├── Audit evidence
    └── Change history
```

---

## SOC 2 Compliance

### Trust Service Criteria Mapping

SOC 2 Type II audits evaluate controls against five Trust Service Criteria. The following table maps Panorama integration controls to each criterion.

| Criterion | Description                 | Panorama Integration Controls                          |
| --------- | --------------------------- | ------------------------------------------------------ |
| **CC1**   | Control Environment         | Documented integration architecture, defined roles     |
| **CC2**   | Communication & Information | API documentation, error handling procedures           |
| **CC3**   | Risk Assessment             | Threat modeling for API access, vulnerability scanning |
| **CC4**   | Monitoring Activities       | Real-time API monitoring, anomaly detection            |
| **CC5**   | Control Activities          | Access controls, change management workflows           |
| **CC6**   | Logical Access Controls     | API key rotation, RBAC implementation                  |
| **CC7**   | System Operations           | Incident response, backup procedures                   |
| **CC8**   | Change Management           | Approval workflows, rollback procedures                |
| **CC9**   | Risk Mitigation             | Rate limiting, input validation                        |

### Required Controls for API Integrations

#### Access Control (CC6)

```typescript
// SOC 2 Compliant Access Control Implementation
interface SOC2AccessControl {
  // CC6.1: Logical access security
  authentication: {
    method: "api_key" | "oauth2" | "certificate";
    mfaRequired: boolean;
    sessionTimeout: number; // minutes
  };

  // CC6.2: Access provisioning
  authorization: {
    rbacEnabled: boolean;
    minimumPrivilege: boolean;
    accessReviewFrequency: "quarterly" | "monthly";
  };

  // CC6.3: Access removal
  deprovisioning: {
    automatedRevocation: boolean;
    orphanedKeyDetection: boolean;
  };
}

// Implementation checklist
const accessControlChecklist = [
  "API keys stored in secrets manager (not code)",
  "Role-based access control implemented",
  "Access reviews conducted quarterly",
  "Terminated user access revoked within 24 hours",
  "Multi-factor authentication for administrative access",
  "Session timeout configured (max 30 minutes)",
];
```

#### Monitoring (CC4, CC7)

```typescript
// SOC 2 Compliant Monitoring Configuration
interface SOC2Monitoring {
  // CC4.1: Ongoing monitoring
  realTimeMonitoring: {
    apiCallTracking: boolean;
    errorRateAlerting: boolean;
    anomalyDetection: boolean;
  };

  // CC7.2: Incident management
  incidentResponse: {
    alertingConfigured: boolean;
    escalationPath: string[];
    responseTimeTarget: number; // minutes
  };
}
```

### Evidence Collection Patterns

SOC 2 audits require documented evidence. Implement automated evidence collection:

```typescript
interface SOC2Evidence {
  controlId: string;
  evidenceType: "screenshot" | "log" | "configuration" | "report";
  collectionDate: Date;
  retentionPeriod: number; // days
  location: string;
}

// Evidence collection for Panorama integration
const evidenceRequirements: SOC2Evidence[] = [
  {
    controlId: "CC6.1",
    evidenceType: "configuration",
    collectionDate: new Date(),
    retentionPeriod: 365,
    location: "/evidence/access-control/api-key-config.json",
  },
  {
    controlId: "CC7.2",
    evidenceType: "log",
    collectionDate: new Date(),
    retentionPeriod: 365,
    location: "/evidence/monitoring/incident-logs/",
  },
];
```

### Audit Log Requirements

| Log Type              | Retention | Format      | Storage              |
| --------------------- | --------- | ----------- | -------------------- |
| API Access Logs       | 1 year    | JSON        | Immutable storage    |
| Configuration Changes | 7 years   | JSON        | Encrypted, versioned |
| Error Logs            | 90 days   | JSON        | Searchable index     |
| Security Events       | 1 year    | SIEM format | Centralized SIEM     |

---

## PCI-DSS Requirements

PCI-DSS has specific requirements for firewall configurations and network security. Panorama integrations must address these directly.

### Firewall Configuration Requirements (Requirement 1)

| Sub-Requirement | Description                              | Implementation                    |
| --------------- | ---------------------------------------- | --------------------------------- |
| 1.1.1           | Formal process for approving connections | Change management workflow        |
| 1.1.2           | Network diagram documentation            | Auto-generated topology export    |
| 1.1.3           | Data flow documentation                  | Traffic flow analysis integration |
| 1.2.1           | Restrict inbound/outbound traffic        | Policy validation checks          |
| 1.3             | Prohibit direct public access            | DMZ configuration validation      |

```typescript
// PCI-DSS Requirement 1 Validation
interface PCIDSSFirewallValidation {
  requirement1_1_1: {
    changeApprovalWorkflow: boolean;
    approverDocumented: boolean;
    approvalRetained: boolean;
  };

  requirement1_2_1: {
    inboundRestrictionsValidated: boolean;
    outboundRestrictionsValidated: boolean;
    denyAllDefault: boolean;
  };

  requirement1_3: {
    dmzConfigured: boolean;
    directPublicAccessProhibited: boolean;
  };
}

// Validation function
async function validatePCIDSSRequirement1(
  panoramaClient: PanoramaClient
): Promise<PCIDSSFirewallValidation> {
  const policies = await panoramaClient.getSecurityPolicies();

  return {
    requirement1_1_1: {
      changeApprovalWorkflow: policies.every((p) => p.approvedBy !== null),
      approverDocumented: policies.every((p) => p.approverRole !== null),
      approvalRetained: policies.every((p) => p.approvalTimestamp !== null),
    },
    requirement1_2_1: {
      inboundRestrictionsValidated: validateInboundRules(policies),
      outboundRestrictionsValidated: validateOutboundRules(policies),
      denyAllDefault: policies.some((p) => p.name === "deny-all" && p.position === "last"),
    },
    requirement1_3: {
      dmzConfigured: await validateDMZConfiguration(panoramaClient),
      directPublicAccessProhibited: await validateNoDirectPublicAccess(panoramaClient),
    },
  };
}
```

### Network Segmentation Validation (Requirement 1.3)

```typescript
// Network segmentation validation for PCI-DSS
interface SegmentationValidation {
  cdeIsolated: boolean;
  segmentBoundaries: SegmentBoundary[];
  validationDate: Date;
  nextReviewDate: Date;
}

interface SegmentBoundary {
  sourceZone: string;
  destinationZone: string;
  allowedServices: string[];
  deniedServices: string[];
  controllingPolicy: string;
}

// Automated segmentation check
async function validateSegmentation(
  panoramaClient: PanoramaClient,
  cdeZones: string[]
): Promise<SegmentationValidation> {
  const zones = await panoramaClient.getZones();
  const policies = await panoramaClient.getSecurityPolicies();

  const boundaries = analyzeBoundaries(zones, policies, cdeZones);

  return {
    cdeIsolated: boundaries.every((b) => validateCDEIsolation(b, cdeZones)),
    segmentBoundaries: boundaries,
    validationDate: new Date(),
    nextReviewDate: addMonths(new Date(), 6),
  };
}
```

### Change Management Controls (Requirement 6.4)

| Control            | Description            | Automation            |
| ------------------ | ---------------------- | --------------------- |
| Impact analysis    | Assess change impact   | Pre-commit validation |
| Rollback procedure | Documented rollback    | Automated snapshot    |
| Testing            | Test before production | Staging environment   |
| Approval           | Management approval    | Workflow integration  |

### Logging and Monitoring Requirements (Requirement 10)

```typescript
// PCI-DSS Requirement 10 Logging Configuration
interface PCIDSSLogging {
  // 10.1: Audit trails for all access
  auditTrails: {
    userAccessLogged: boolean;
    systemAccessLogged: boolean;
    allComponentsCovered: boolean;
  };

  // 10.2: Specific events logged
  eventLogging: {
    userAccess: boolean;
    privilegedActions: boolean;
    accessToLogs: boolean;
    invalidAccessAttempts: boolean;
    authenticationMechanisms: boolean;
    auditLogInitialization: boolean;
    objectCreationDeletion: boolean;
  };

  // 10.5: Secure audit trails
  logProtection: {
    immutableStorage: boolean;
    accessControlled: boolean;
    integrityVerification: boolean;
  };

  // 10.7: Retention
  retention: {
    onlineAvailability: number; // days (min 90)
    totalRetention: number; // days (min 365)
  };
}
```

---

## NIST Framework

### Identify, Protect, Detect, Respond, Recover Mapping

| Function     | Category              | Panorama Integration Control |
| ------------ | --------------------- | ---------------------------- |
| **Identify** | Asset Management      | Device inventory sync        |
| **Identify** | Risk Assessment       | Policy risk scoring          |
| **Protect**  | Access Control        | API authentication           |
| **Protect**  | Data Security         | Encrypted communications     |
| **Detect**   | Anomalies             | Traffic anomaly detection    |
| **Detect**   | Continuous Monitoring | Real-time log analysis       |
| **Respond**  | Response Planning     | Automated rule deployment    |
| **Respond**  | Mitigation            | Emergency policy push        |
| **Recover**  | Recovery Planning     | Configuration backup         |
| **Recover**  | Improvements          | Post-incident analysis       |

### Security Controls Implementation

```typescript
// NIST CSF Control Implementation
interface NISTControls {
  identify: {
    // ID.AM: Asset Management
    assetInventory: () => Promise<Asset[]>;
    deviceDiscovery: () => Promise<Device[]>;

    // ID.RA: Risk Assessment
    riskAssessment: () => Promise<RiskScore>;
    vulnerabilityAnalysis: () => Promise<Vulnerability[]>;
  };

  protect: {
    // PR.AC: Access Control
    accessControl: AccessControlConfig;

    // PR.DS: Data Security
    dataEncryption: EncryptionConfig;

    // PR.IP: Information Protection
    configurationManagement: () => Promise<ConfigState>;
  };

  detect: {
    // DE.AE: Anomalies and Events
    anomalyDetection: () => Promise<Anomaly[]>;

    // DE.CM: Continuous Monitoring
    continuousMonitoring: MonitoringConfig;
  };

  respond: {
    // RS.RP: Response Planning
    incidentResponse: () => Promise<void>;

    // RS.MI: Mitigation
    automaticMitigation: (threat: Threat) => Promise<void>;
  };

  recover: {
    // RC.RP: Recovery Planning
    configurationRestore: (snapshot: string) => Promise<void>;

    // RC.IM: Improvements
    lessonsLearned: () => Promise<Improvement[]>;
  };
}
```

### Risk Assessment Integration

```typescript
// NIST Risk Assessment Integration
interface RiskAssessment {
  assetId: string;
  threatLevel: "low" | "medium" | "high" | "critical";
  vulnerabilities: Vulnerability[];
  controls: Control[];
  residualRisk: number; // 0-100
  acceptanceStatus: "accepted" | "mitigating" | "unacceptable";
  reviewDate: Date;
}

// Risk calculation based on firewall policy analysis
async function calculatePolicyRisk(
  panoramaClient: PanoramaClient,
  policy: SecurityPolicy
): Promise<RiskAssessment> {
  const exposedServices = await analyzeExposure(policy);
  const knownVulnerabilities = await getServiceVulnerabilities(exposedServices);
  const mitigatingControls = await getControlsForPolicy(policy);

  return {
    assetId: policy.id,
    threatLevel: calculateThreatLevel(exposedServices),
    vulnerabilities: knownVulnerabilities,
    controls: mitigatingControls,
    residualRisk: calculateResidualRisk(knownVulnerabilities, mitigatingControls),
    acceptanceStatus: determineAcceptanceStatus(policy.riskOwner),
    reviewDate: new Date(),
  };
}
```

---

## GDPR Considerations

### Data Minimization in Logs

GDPR Article 5(1)(c) requires data minimization. Apply these principles to Panorama logs:

```typescript
// GDPR-Compliant Log Configuration
interface GDPRLogConfig {
  // Minimize personal data in logs
  personalDataFields: {
    ipAddresses: "hash" | "truncate" | "exclude";
    userIdentifiers: "pseudonymize" | "exclude";
    deviceIdentifiers: "hash" | "exclude";
  };

  // Retention limits
  retention: {
    maxDays: number;
    automaticDeletion: boolean;
    deletionVerification: boolean;
  };

  // Legal basis
  processingBasis: "legitimate_interest" | "contract" | "consent";
  documentedPurpose: string;
}

// Example compliant configuration
const gdprLogConfig: GDPRLogConfig = {
  personalDataFields: {
    ipAddresses: "hash", // SHA-256 with salt
    userIdentifiers: "pseudonymize",
    deviceIdentifiers: "hash",
  },
  retention: {
    maxDays: 90,
    automaticDeletion: true,
    deletionVerification: true,
  },
  processingBasis: "legitimate_interest",
  documentedPurpose: "Network security monitoring and threat detection",
};
```

### Right to Erasure Implementation

```typescript
// GDPR Article 17: Right to Erasure
interface ErasureRequest {
  requestId: string;
  dataSubjectIdentifier: string;
  requestDate: Date;
  verificationStatus: "pending" | "verified" | "rejected";
  processingStatus: "queued" | "processing" | "completed" | "failed";
  completionDate?: Date;
  affectedSystems: string[];
}

async function processErasureRequest(request: ErasureRequest): Promise<ErasureResult> {
  // Identify all logs containing personal data for the subject
  const affectedLogs = await findLogsForSubject(request.dataSubjectIdentifier);

  // For each log, apply erasure or anonymization
  const results = await Promise.all(affectedLogs.map((log) => eraseOrAnonymize(log, request)));

  // Document the erasure for compliance records
  await documentErasure({
    requestId: request.requestId,
    logsProcessed: results.length,
    completionDate: new Date(),
    method: "anonymization", // Preserves security utility
  });

  return {
    success: results.every((r) => r.success),
    processedCount: results.length,
    errors: results.filter((r) => !r.success),
  };
}
```

### Data Retention Policies

| Data Type             | Retention Period | Legal Basis         | Deletion Method |
| --------------------- | ---------------- | ------------------- | --------------- |
| Traffic logs          | 90 days          | Legitimate interest | Automatic purge |
| Security events       | 1 year           | Legal obligation    | Secure deletion |
| Configuration history | 7 years          | Contract            | Archived        |
| User access logs      | 1 year           | Legitimate interest | Automatic purge |

### Cross-Border Data Transfers

```typescript
// GDPR Chapter V: Cross-border transfer compliance
interface DataTransferConfig {
  // Transfer mechanism
  legalBasis: "adequacy_decision" | "scc" | "bcr" | "derogation";

  // Standard Contractual Clauses if applicable
  sccDetails?: {
    version: string;
    signatureDate: Date;
    dataImporter: string;
    dataExporter: string;
  };

  // Data localization
  primaryRegion: string;
  allowedRegions: string[];
  prohibitedRegions: string[];

  // Technical measures
  encryptionInTransit: boolean;
  encryptionAtRest: boolean;
  pseudonymization: boolean;
}
```

---

## Audit Logging

### What to Log for Compliance

```typescript
// Comprehensive audit log event types
enum AuditEventType {
  // Access events
  API_AUTHENTICATION = "api.auth",
  API_AUTHORIZATION = "api.authz",
  SESSION_START = "session.start",
  SESSION_END = "session.end",

  // Configuration changes
  POLICY_CREATE = "policy.create",
  POLICY_UPDATE = "policy.update",
  POLICY_DELETE = "policy.delete",
  OBJECT_CREATE = "object.create",
  OBJECT_UPDATE = "object.update",
  OBJECT_DELETE = "object.delete",

  // Administrative actions
  USER_CREATE = "user.create",
  USER_UPDATE = "user.update",
  USER_DELETE = "user.delete",
  ROLE_CHANGE = "role.change",

  // Security events
  FAILED_AUTH = "security.auth.failed",
  PRIVILEGE_ESCALATION = "security.privilege.escalation",
  ANOMALY_DETECTED = "security.anomaly",
}

interface AuditLogEntry {
  timestamp: Date;
  eventType: AuditEventType;
  actor: {
    id: string;
    type: "user" | "service" | "system";
    ipAddress: string;
    userAgent?: string;
  };
  target: {
    type: string;
    id: string;
    name: string;
  };
  action: string;
  outcome: "success" | "failure";
  details: Record<string, unknown>;
  correlationId: string;
}
```

### Log Retention Requirements

| Framework | Minimum Retention | Recommended      |
| --------- | ----------------- | ---------------- |
| SOC 2     | 1 year            | 3 years          |
| PCI-DSS   | 1 year            | 3 years          |
| GDPR      | As needed         | 90 days for most |
| NIST      | Risk-based        | 1-7 years        |
| HIPAA     | 6 years           | 7 years          |

### Log Integrity Protection

```typescript
// Log integrity using cryptographic chaining
interface IntegrityProtectedLog {
  entry: AuditLogEntry;
  hash: string; // SHA-256 of entry
  previousHash: string; // Hash of previous entry (chain)
  signature: string; // Digital signature
  signatureTimestamp: Date;
}

async function protectLogIntegrity(
  entry: AuditLogEntry,
  previousEntry: IntegrityProtectedLog | null
): Promise<IntegrityProtectedLog> {
  const entryHash = await sha256(JSON.stringify(entry));
  const previousHash = previousEntry?.hash || "GENESIS";
  const chainedHash = await sha256(entryHash + previousHash);

  return {
    entry,
    hash: chainedHash,
    previousHash,
    signature: await signWithHSM(chainedHash),
    signatureTimestamp: new Date(),
  };
}
```

### Query Examples for Auditors

```typescript
// Common audit queries for compliance reviews

// 1. All configuration changes in date range
const configurationChanges = `
  SELECT * FROM audit_logs
  WHERE event_type IN ('policy.create', 'policy.update', 'policy.delete')
  AND timestamp BETWEEN :startDate AND :endDate
  ORDER BY timestamp DESC
`;

// 2. Failed authentication attempts
const failedAuth = `
  SELECT actor_id, COUNT(*) as attempts, MIN(timestamp) as first_attempt
  FROM audit_logs
  WHERE event_type = 'security.auth.failed'
  AND timestamp >= :since
  GROUP BY actor_id
  HAVING COUNT(*) > 5
`;

// 3. Privileged actions
const privilegedActions = `
  SELECT * FROM audit_logs
  WHERE actor_role IN ('admin', 'security_admin')
  AND timestamp BETWEEN :startDate AND :endDate
  ORDER BY timestamp DESC
`;

// 4. Changes by specific user
const userActivity = `
  SELECT * FROM audit_logs
  WHERE actor_id = :userId
  AND timestamp BETWEEN :startDate AND :endDate
  ORDER BY timestamp DESC
`;
```

---

## Change Management

### Configuration Change Tracking

```typescript
// Change tracking with full audit trail
interface ConfigurationChange {
  changeId: string;
  type: "policy" | "object" | "setting";
  target: {
    id: string;
    name: string;
    path: string;
  };

  // What changed
  previousState: Record<string, unknown>;
  newState: Record<string, unknown>;
  diff: string; // Human-readable diff

  // Who and when
  requestedBy: string;
  requestedAt: Date;
  approvedBy: string | null;
  approvedAt: Date | null;
  appliedBy: string;
  appliedAt: Date;

  // Workflow
  ticketReference: string;
  businessJustification: string;
  riskAssessment: RiskLevel;
  testingEvidence: string[];
  rollbackPlan: string;
}
```

### Approval Workflows

```yaml
# Change approval workflow configuration
workflows:
  standard_change:
    description: "Low-risk, pre-approved change types"
    risk_levels: [low]
    approvals_required: 0
    auto_approve: true
    documentation: required

  normal_change:
    description: "Typical changes requiring single approval"
    risk_levels: [medium]
    approvals_required: 1
    approvers:
      - role: security_admin
      - role: network_admin
    documentation: required
    testing: recommended

  emergency_change:
    description: "Urgent changes with expedited approval"
    risk_levels: [high, critical]
    approvals_required: 1
    approvers:
      - role: security_admin
      - role: incident_commander
    documentation: required_within_24h
    post_implementation_review: required

  major_change:
    description: "High-impact changes requiring CAB approval"
    risk_levels: [critical]
    approvals_required: 3
    approvers:
      - role: security_admin
      - role: change_advisory_board
      - role: business_owner
    documentation: comprehensive
    testing: required
    rollback_tested: required
```

### Rollback Procedures

```typescript
// Automated rollback capability
interface RollbackProcedure {
  changeId: string;
  snapshotId: string;
  snapshotTimestamp: Date;

  // Rollback execution
  async execute(): Promise<RollbackResult>;
  async verify(): Promise<VerificationResult>;
  async document(): Promise<void>;
}

// Rollback checklist
const rollbackChecklist = [
  'Snapshot verified and accessible',
  'Change window approved for rollback',
  'Stakeholders notified',
  'Rollback commands tested in staging',
  'Verification criteria defined',
  'Escalation path confirmed',
  'Post-rollback testing planned',
];
```

### Documentation Requirements

| Change Type | Required Documentation                                           |
| ----------- | ---------------------------------------------------------------- |
| Standard    | Change ticket, description                                       |
| Normal      | Ticket, justification, approval, test results                    |
| Emergency   | Ticket, justification, approval, post-implementation review      |
| Major       | Full RFC, risk assessment, test plan, rollback plan, CAB minutes |

---

## Reporting Templates

### Compliance Status Report Structure

```markdown
# Compliance Status Report

## Executive Summary

- Overall compliance status: [GREEN/YELLOW/RED]
- Key findings: [count]
- Remediation items: [count]
- Report period: [start] to [end]

## Framework Compliance Summary

| Framework | Status | Controls Passed | Controls Failed | In Progress |
| --------- | ------ | --------------- | --------------- | ----------- |
| SOC 2     | GREEN  | 45              | 0               | 2           |
| PCI-DSS   | YELLOW | 50              | 2               | 5           |
| NIST CSF  | GREEN  | 98              | 0               | 5           |
| GDPR      | GREEN  | 12              | 0               | 0           |

## Control Details

[Detailed findings per control]

## Remediation Plan

[Action items with owners and due dates]

## Evidence Attachments

[List of supporting documentation]
```

### Evidence Collection Automation

```typescript
// Automated evidence collection for audit preparation
interface EvidenceCollection {
  framework: string;
  controlId: string;
  evidenceItems: EvidenceItem[];
  collectionDate: Date;
  validUntil: Date;
}

interface EvidenceItem {
  type: "configuration" | "screenshot" | "log" | "report" | "attestation";
  description: string;
  location: string;
  hash: string; // Integrity verification
  collectedBy: "automated" | "manual";
  reviewer?: string;
}

// Automated collection schedule
const collectionSchedule = {
  daily: ["access_logs", "change_logs", "security_events"],
  weekly: ["configuration_snapshots", "user_access_reviews", "policy_compliance_scans"],
  monthly: ["risk_assessments", "vulnerability_scans", "access_certifications"],
  quarterly: ["penetration_test_results", "business_continuity_tests", "policy_reviews"],
};
```

### Audit Preparation Checklist

```markdown
## Pre-Audit Preparation Checklist

### 30 Days Before Audit

- [ ] Confirm audit scope and timeline
- [ ] Identify audit team contacts
- [ ] Review previous audit findings
- [ ] Verify remediation of prior findings
- [ ] Update system documentation

### 14 Days Before Audit

- [ ] Run compliance scans
- [ ] Generate evidence packages
- [ ] Validate log availability
- [ ] Brief stakeholders
- [ ] Prepare demonstration environments

### 7 Days Before Audit

- [ ] Final evidence review
- [ ] Access credentials for auditors
- [ ] Schedule interviews
- [ ] Prepare meeting rooms/virtual links
- [ ] Backup all current configurations

### Day of Audit

- [ ] Auditor credentials active
- [ ] Support staff available
- [ ] Evidence portal accessible
- [ ] Escalation contacts confirmed
- [ ] Daily debrief scheduled
```

---

## Cross-References

- **Security Implementation**: See `security.md` for technical security controls
- **Error Handling**: See `troubleshooting.md` for incident response
- **Architecture**: See `architecture.md` for system design
- **API Reference**: See `api-reference.md` for Panorama API details

---

## Revision History

| Version | Date         | Author       | Changes                  |
| ------- | ------------ | ------------ | ------------------------ |
| 1.0     | January 2026 | Chariot Team | Initial compliance guide |

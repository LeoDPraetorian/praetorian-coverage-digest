# Interview Questions Bank

**Complete question bank for business context discovery structured by category.**

## Business Purpose Questions

### Core Questions

- What does this application do in one sentence?
- Who are the primary users? (employees, customers, partners, public)
- What business processes does this application support?
- What business value does it provide to the organization?
- What makes this application critical to business operations?

### Context Questions

- How many users does it serve?
- What's the application's lifecycle stage? (MVP, production, legacy)
- What's the deployment model? (SaaS, on-premise, hybrid)
- What's the revenue impact? (revenue-generating, cost-center, enabler)

## Data Classification Questions

### Identification Questions

- Does it handle personally identifiable information (PII)?
  - Names, email addresses, physical addresses, phone numbers
  - Social security numbers, national IDs
  - Biometric data, photos
- Does it handle financial data?
  - Credit card numbers, bank account details
  - Transaction history, account balances
  - Payment methods, billing information
- Does it handle authentication credentials?
  - Passwords, password hashes
  - API keys, access tokens, session tokens
  - OAuth tokens, certificates
- Does it handle health information (PHI)?
  - Medical records, diagnoses, treatment plans
  - Prescription data, insurance information
  - Healthcare provider details
- Does it handle proprietary business data?
  - Trade secrets, intellectual property
  - Customer lists, business strategies
  - Financial forecasts, M&A information

### Sensitivity Assessment

- What's the MOST sensitive data this application handles?
- What data would cause the most damage if leaked?
- What data is subject to regulatory requirements?
- What data retention requirements exist?

## Threat Actor Questions

### Exposure Questions

- Is this application internet-facing or internal only?
- What network zones does it operate in?
- What authentication is required to access it?
- Are there any public-facing components?

### Motivation Questions

- Who would benefit from compromising this application?
- What would an attacker gain from successful breach?
- Are there known competitors interested in this data?
- Is this in an industry targeted by nation-states?
- Is insider threat a significant concern?

### Capability Assessment

- What attacker skill level is realistic for this target?
  - Script kiddie (automated tools, public exploits)
  - Skilled attacker (custom tools, 0-days)
  - Organized crime (sustained campaigns)
  - Nation-state (advanced persistent threats)
- Have there been past security incidents?
- What attack vectors are most likely?

## Business Impact Questions

### Data Breach Impact

- What happens if this data is leaked publicly?
- What regulatory penalties apply to data breach?
- What customer notification requirements exist?
- Estimated financial cost of data breach?
- What's the reputational impact?

### Availability Impact

- What happens if this application goes down?
- What's the cost per hour of downtime?
- What's the maximum tolerable downtime?
- Are there SLA commitments to customers?
- What's the recovery time objective (RTO)?

### Integrity Impact

- What happens if data is modified by attacker?
- Could data tampering cause physical harm?
- What's the cost of data corruption/loss?
- How quickly could we detect tampering?

## Compliance Questions

### Regulatory Requirements

- Does SOC2 compliance apply? (Type I or Type II?)
- Does PCI-DSS apply? (processing credit cards?)
- Does HIPAA apply? (handling PHI?)
- Does GDPR apply? (EU citizen data?)
- Does CCPA apply? (California resident data?)
- Are there industry-specific regulations? (FINRA, FDA, etc.)

### Contractual Requirements

- Do customer contracts require specific security controls?
- Are penetration tests required by customers?
- Are security audits required? How often?
- Are there data residency requirements?

### Internal Policies

- What internal security policies apply?
- Are there data classification policies?
- What's the incident response plan?
- What's the change management process?

## Security Objectives Questions

### Protection Priorities

- What are the top 3 assets to protect?
- Is confidentiality, integrity, or availability most critical?
- What's the acceptable risk level for this application?
- What's the risk appetite of the organization?

### Recovery Objectives

- What's the recovery time objective (RTO)?
- What's the recovery point objective (RPO)?
- What's the backup strategy?
- How often are backups tested?

## Follow-Up Questions

### Clarification Questions

Use these when initial answers are vague:

- "Can you give a specific example?"
- "What would be the financial impact in dollars?"
- "Who specifically would we notify if this happened?"
- "How long can the business operate without this?"

### Validation Questions

Use these to confirm understanding:

- "So the most sensitive data is X, correct?"
- "If I understand correctly, the primary threat actor is Y?"
- "The main business impact would be Z?"

## Question Customization by Industry

### Financial Services

- What financial instruments are handled?
- What trading data exists?
- Are there real-time transaction requirements?
- What anti-money laundering (AML) controls exist?

### Healthcare

- What types of PHI are stored?
- Who has access to patient records?
- What's the HIPAA audit history?
- Are there telemedicine components?

### E-Commerce

- What payment processors are integrated?
- What customer data is stored?
- What fraud detection mechanisms exist?
- What's the order fulfillment process?

### SaaS

- What customer data isolation exists (multi-tenancy)?
- What's the data export/portability capability?
- Are customer API keys/secrets handled?
- What's the disaster recovery plan?

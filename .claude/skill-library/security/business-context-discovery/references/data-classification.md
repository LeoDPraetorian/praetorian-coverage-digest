# Data Classification Guide

**Framework for identifying and classifying sensitive data types with regulatory mapping.**

## Classification Categories

### 1. Personally Identifiable Information (PII)

**Definition**: Any data that could identify a specific individual.

**Examples**:

- **Direct identifiers**: Full name, email address, phone number, physical address
- **Indirect identifiers**: IP address, device ID, cookie ID
- **Government IDs**: SSN, passport number, driver's license, national ID
- **Biometric**: Fingerprints, facial recognition data, voice prints
- **Online**: Usernames, account numbers, profile photos

**Regulatory Context**:

- **GDPR** (EU): Personal data of EU residents
- **CCPA** (California): Personal information of California residents
- **PIPEDA** (Canada): Personal information of Canadians

**Sensitivity**: Medium to High (context-dependent)

### 2. Protected Health Information (PHI)

**Definition**: Any health-related data that can be linked to an individual.

**Examples**:

- Medical records, diagnoses, treatment plans
- Prescription information
- Lab results, imaging studies
- Insurance information
- Healthcare provider details
- Mental health records
- Genetic information

**Regulatory Context**:

- **HIPAA** (US): Applies to covered entities and business associates
- **HITECH Act**: Breach notification requirements
- **State laws**: Additional requirements (e.g., California CMIA)

**Sensitivity**: High (strict regulations, breach notification requirements)

### 3. Financial Data

**Definition**: Data related to financial transactions or accounts.

**Examples**:

- **Payment card**: Credit/debit card numbers, CVV, expiration date
- **Bank account**: Account numbers, routing numbers
- **Transaction data**: Purchase history, payment amounts
- **Account balance**: Current balances, credit limits
- **Tax information**: Tax IDs, W-2/1099 forms

**Regulatory Context**:

- **PCI-DSS**: Credit card data (Levels 1-4 based on volume)
- **GLBA** (Gramm-Leach-Bliley): Financial institution customer data
- **SOX** (Sarbanes-Oxley): Financial reporting data

**Sensitivity**: High (fraud risk, PCI-DSS requirements)

### 4. Authentication Credentials

**Definition**: Data used to verify identity or grant access.

**Examples**:

- **Passwords**: Plaintext (critical), hashed (high)
- **API keys**: Service authentication tokens
- **Session tokens**: Active user sessions
- **OAuth tokens**: Delegated access tokens
- **Certificates**: TLS certificates, code signing certs
- **MFA secrets**: TOTP seeds, backup codes
- **Security questions**: Answers to challenge questions

**Regulatory Context**:

- **NIST 800-63**: Password requirements
- **GDPR Article 32**: Appropriate security measures
- **SOC2 CC6.1**: Logical access controls

**Sensitivity**: Critical (direct access to systems)

### 5. Proprietary Business Data

**Definition**: Non-public business information providing competitive advantage.

**Examples**:

- **Trade secrets**: Algorithms, formulas, processes
- **Intellectual property**: Patents, source code
- **Customer lists**: Client databases, contact information
- **Financial data**: Revenue, profit margins, forecasts
- **Strategic plans**: M&A targets, product roadmaps
- **Pricing**: Cost structures, discount tiers

**Regulatory Context**:

- **Trade Secrets Act**: Federal protection
- **DTSA** (Defend Trade Secrets Act): Civil remedies
- **State laws**: Uniform Trade Secrets Act (UTSA)

**Sensitivity**: High (competitive advantage, insider trading risk)

### 6. Legal and Compliance Data

**Definition**: Data related to legal matters or regulatory compliance.

**Examples**:

- **Legal documents**: Contracts, NDAs, litigation records
- **Compliance records**: Audit trails, certifications
- **Employee records**: HR files, performance reviews
- **Internal investigations**: Incident reports

**Regulatory Context**:

- **Attorney-client privilege**: Legal communications
- **Work product doctrine**: Litigation materials
- **Various regulations**: Specific retention requirements

**Sensitivity**: High (legal risk, privilege concerns)

## Classification Matrix

| Data Type      | GDPR | CCPA | HIPAA | PCI-DSS | SOC2 | Sensitivity |
| -------------- | ---- | ---- | ----- | ------- | ---- | ----------- |
| Name, Email    | ✅   | ✅   | -     | -       | ✅   | Medium      |
| SSN, Gov ID    | ✅   | ✅   | -     | -       | ✅   | High        |
| Health Records | ✅   | ✅   | ✅    | -       | ✅   | High        |
| Payment Cards  | ✅   | ✅   | -     | ✅      | ✅   | High        |
| Passwords      | ✅   | ✅   | -     | -       | ✅   | Critical    |
| Trade Secrets  | -    | -    | -     | -       | ✅   | High        |

## Crown Jewels Identification

**Crown jewels** are the most valuable/sensitive assets that require the highest protection.

### Identification Criteria

Ask these questions to identify crown jewels:

1. **Damage Question**: "What data would cause the most damage if leaked?"
2. **Value Question**: "What data is most valuable to attackers?"
3. **Regulatory Question**: "What data breach would trigger the most severe penalties?"
4. **Business Question**: "What data loss would threaten business viability?"

### Industry-Specific Crown Jewels

| Industry               | Typical Crown Jewels                                   |
| ---------------------- | ------------------------------------------------------ |
| **Financial Services** | Account numbers, transaction data, trading algorithms  |
| **Healthcare**         | PHI, medical records, insurance information            |
| **E-Commerce**         | Payment methods, customer PII, purchase history        |
| **SaaS**               | Customer API keys, tenant data, proprietary algorithms |
| **Manufacturing**      | Trade secrets, formulas, supply chain data             |

## Data Flow Considerations

When classifying data, consider:

### Data States

- **Data at rest**: Stored in databases, filesystems, backups
- **Data in transit**: Network communications, API calls
- **Data in use**: Active in memory, processing

### Data Lifecycle

- **Collection**: How is data obtained?
- **Storage**: Where is it stored? How long?
- **Processing**: How is it transformed?
- **Sharing**: Who has access? Third parties?
- **Deletion**: Retention policies? Secure disposal?

## Regulatory Requirements Summary

### GDPR (EU General Data Protection Regulation)

**Applies to**: Processing personal data of EU residents

**Key Requirements**:

- Lawful basis for processing
- Data minimization principle
- Right to erasure ("right to be forgotten")
- Data breach notification (72 hours)
- Data Protection Impact Assessment (DPIA)

**Penalties**: Up to €20M or 4% of annual global turnover

### CCPA (California Consumer Privacy Act)

**Applies to**: Businesses collecting personal information of California residents

**Key Requirements**:

- Right to know what data is collected
- Right to delete personal information
- Right to opt-out of sale
- Data breach notification

**Penalties**: Up to $7,500 per intentional violation

### HIPAA (Health Insurance Portability and Accountability Act)

**Applies to**: Covered entities and business associates handling PHI

**Key Requirements**:

- Administrative safeguards (policies, training)
- Physical safeguards (facility access control)
- Technical safeguards (encryption, audit controls)
- Breach notification (HHS, individuals, media if >500)

**Penalties**: Up to $1.5M per violation category per year

### PCI-DSS (Payment Card Industry Data Security Standard)

**Applies to**: Organizations processing, storing, or transmitting credit card data

**Key Requirements** (12 requirements):

1. Install and maintain firewall configuration
2. Don't use vendor-supplied defaults
3. Protect stored cardholder data
4. Encrypt transmission of cardholder data
5. Use and regularly update anti-virus
6. Develop and maintain secure systems
7. Restrict access by business need-to-know
8. Assign unique ID to each person with computer access
9. Restrict physical access to cardholder data
10. Track and monitor all access to network resources
11. Regularly test security systems and processes
12. Maintain information security policy

**Levels**:

- Level 1: 6M+ transactions/year
- Level 2: 1M-6M transactions/year
- Level 3: 20K-1M transactions/year
- Level 4: <20K transactions/year

**Penalties**: Fines from payment brands + potential loss of ability to process cards

## Classification Process

### Step 1: Inventory Data Types

List all data the application handles:

```json
{
  "data_inventory": [
    { "field": "user_email", "type": "PII", "location": "users table" },
    { "field": "credit_card", "type": "financial", "location": "payments table" },
    { "field": "password_hash", "type": "credentials", "location": "auth table" }
  ]
}
```

### Step 2: Apply Regulatory Mapping

For each data type, identify applicable regulations:

```json
{
  "user_email": {
    "regulations": ["GDPR", "CCPA"],
    "requirements": ["consent", "deletion", "breach_notification"]
  }
}
```

### Step 3: Assess Sensitivity

Rate sensitivity based on:

- Regulatory impact (Critical/High/Medium/Low)
- Breach damage potential
- Attacker value

### Step 4: Identify Crown Jewels

Select top 3-5 most critical data types:

```json
{
  "crown_jewels": ["payment_card_data", "user_passwords", "api_keys"],
  "rationale": "Highest regulatory penalties + immediate access to customer funds"
}
```

## Output Format

Use this JSON structure for `data-classification.json`:

```json
{
  "timestamp": "2025-12-18T...",
  "data_types": [
    {
      "category": "PII",
      "examples": ["email", "name", "address"],
      "sensitivity": "high",
      "storage_locations": ["users_db", "analytics_db"],
      "regulatory_requirements": ["GDPR", "CCPA"],
      "encryption_at_rest": true,
      "encryption_in_transit": true,
      "retention_period": "7 years"
    }
  ],
  "crown_jewels": [
    {
      "data_type": "payment_card_data",
      "rationale": "PCI-DSS Level 1 compliance required, direct financial impact",
      "protection_requirements": ["encryption", "tokenization", "access_logging"]
    }
  ],
  "regulatory_summary": {
    "applicable_regulations": ["GDPR", "PCI-DSS"],
    "compliance_status": "in_progress",
    "last_audit": "2024-06-01"
  }
}
```

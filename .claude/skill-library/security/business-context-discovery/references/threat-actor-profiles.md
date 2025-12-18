# Threat Actor Profiles

**Common attacker archetypes organized by motivation, capability, and industry targeting.**

## Threat Actor Classification Framework

### By Motivation

| Motivation | Description | Typical Targets |
|------------|-------------|-----------------|
| **Financial Gain** | Profit through theft, ransom, fraud | Payment data, credentials, ransomware targets |
| **Espionage** | Steal IP, trade secrets, competitive intelligence | Proprietary data, R&D, M&A plans |
| **Hacktivism** | Political/social agenda, publicity | Public-facing sites, government, controversial orgs |
| **Sabotage** | Disrupt operations, cause damage | Critical infrastructure, competitors |
| **Insider Threat** | Revenge, theft, negligence | Any internal data, systems |

### By Capability

| Level | Skills | Resources | Tactics |
|-------|--------|-----------|---------|
| **Script Kiddie** | Minimal technical skills | Public tools, tutorials | Automated scanning, known exploits |
| **Skilled Attacker** | Programming, networking, security | Custom tools, 0-days | Targeted attacks, custom exploits |
| **Organized Crime** | Professional teams | Dedicated infrastructure | Sophisticated campaigns, money laundering |
| **Nation-State** | Elite hackers, researchers | Unlimited resources | APTs, supply chain attacks, 0-days |

## Common Threat Actor Profiles

### 1. Opportunistic Attackers (Script Kiddies)

**Motivation**: Financial gain (low-effort)

**Capability**: Low (use public tools)

**Tactics**:
- Automated vulnerability scanning
- Credential stuffing attacks
- Exploit kits for known CVEs
- Phishing campaigns
- Cryptomining malware

**Targets**:
- Internet-facing applications
- Default credentials
- Unpatched systems
- Low-hanging fruit

**Industry Focus**: Indiscriminate (target everything)

**Indicators**:
- Application is internet-facing
- No WAF or basic security controls
- Default configurations in use

**Risk Level**: Medium (high volume, low sophistication)

---

### 2. Financially Motivated Cybercriminals

**Motivation**: Profit maximization

**Capability**: Medium to High

**Tactics**:
- Ransomware deployment
- Payment card theft
- Banking trojan distribution
- Business email compromise (BEC)
- Cryptocurrency theft

**Targets**:
- Payment processing systems
- Financial data
- Backup systems (for ransom)
- Executive email accounts

**Industry Focus**:
- Healthcare (ransomware)
- E-commerce (card theft)
- Financial services (fraud)
- Any organization with funds

**Indicators**:
- Handles payment data
- Valuable databases
- Limited backup/recovery capability
- High ransom payment likelihood

**Risk Level**: High (proven ROI, persistent)

---

### 3. Nation-State APT (Advanced Persistent Threat)

**Motivation**: Espionage, sabotage

**Capability**: Very High (elite teams)

**Tactics**:
- Spear phishing
- Supply chain attacks
- 0-day exploits
- Long-term persistence
- Data exfiltration
- Living-off-the-land techniques

**Targets**:
- Intellectual property
- Government systems
- Critical infrastructure
- Defense contractors
- Strategic industries

**Industry Focus**:
- Defense/aerospace
- Energy/utilities
- Telecommunications
- Government
- Advanced technology
- Healthcare (during crisis)

**Indicators**:
- Organization in strategic industry
- Government contracts
- Proprietary technology
- International operations

**Risk Level**: Critical (if targeted), Low (if not in focus areas)

**Notable Groups**: APT28, APT29, APT41, Lazarus Group

---

### 4. Insider Threat (Malicious)

**Motivation**: Financial gain, revenge, ideology

**Capability**: High (legitimate access)

**Tactics**:
- Data exfiltration via authorized channels
- Privilege abuse
- Sabotage of systems/data
- Selling access to external attackers
- IP theft before resignation

**Targets**:
- Proprietary data
- Customer databases
- Financial records
- Credentials/access

**Industry Focus**: Any (universal risk)

**Indicators**:
- Disgruntled employees
- Employees with financial stress
- Contractors/third parties with access
- Weak access controls
- Poor monitoring

**Risk Level**: High (hardest to detect, legitimate access)

---

### 5. Insider Threat (Negligent)

**Motivation**: None (unintentional)

**Capability**: Low (lack of security awareness)

**Tactics**:
- Clicking phishing links
- Using weak passwords
- Sharing credentials
- Misconfiguring systems
- Losing devices
- Shadow IT usage

**Targets**: Any data they have access to

**Industry Focus**: Universal

**Indicators**:
- Limited security training
- No phishing simulation
- Weak password policies
- No mobile device management (MDM)

**Risk Level**: Medium to High (very common)

---

### 6. Hacktivists

**Motivation**: Political/social agenda

**Capability**: Low to Medium

**Tactics**:
- Website defacement
- DDoS attacks
- Data leaks ("doxing")
- Account takeovers
- Publicity-seeking breaches

**Targets**:
- Public-facing websites
- Social media accounts
- Government organizations
- Controversial companies

**Industry Focus**:
- Government
- Political organizations
- Oil/gas, mining
- Financial institutions
- Any controversial industry

**Indicators**:
- Organization in controversial industry
- Recent PR crisis
- Government affiliation
- High public profile

**Risk Level**: Medium (depends on controversy level)

**Notable Groups**: Anonymous, LulzSec

---

### 7. Competitors (Corporate Espionage)

**Motivation**: Competitive advantage

**Capability**: Medium to High (may hire professionals)

**Tactics**:
- Insider recruitment
- Spear phishing executives
- Social engineering
- Attending conferences for intelligence
- Exploiting business relationships

**Targets**:
- Product roadmaps
- Pricing strategies
- Customer lists
- R&D data
- M&A plans

**Industry Focus**:
- Any competitive market
- Tech startups
- Manufacturing
- Pharmaceuticals

**Indicators**:
- Intense market competition
- Valuable IP
- Pending M&A
- Key differentiators at risk

**Risk Level**: Medium (hard to attribute)

---

### 8. Supply Chain Attackers

**Motivation**: Varies (often espionage or financial)

**Capability**: High

**Tactics**:
- Compromising vendors/partners
- Software supply chain (dependencies)
- Managed service provider (MSP) attacks
- Hardware implants
- Trojanized updates

**Targets**:
- Third-party software
- Cloud service providers
- Build pipelines
- Update mechanisms

**Industry Focus**:
- Software vendors (high-value targets)
- MSPs/MSSPs
- Cloud providers
- Any organization with valuable customers

**Indicators**:
- Many downstream customers
- Software distribution mechanism
- Privileged access to customer systems

**Risk Level**: Critical (wide impact)

**Notable Examples**: SolarWinds, Kaseya

---

## Industry-Specific Threat Actor Mapping

### Financial Services

**Primary Threat Actors**:
1. Financially motivated cybercriminals (fraud, theft)
2. Nation-state APTs (espionage)
3. Insider threats (data exfiltration)

**Key Tactics**: Card skimming, account takeover, wire fraud, ATM malware

**Crown Jewels at Risk**: Account numbers, transaction data, credentials

---

### Healthcare

**Primary Threat Actors**:
1. Ransomware groups (financially motivated)
2. Nation-state APTs (PHI for espionage)
3. Insider threats (PHI theft for identity fraud)

**Key Tactics**: Ransomware, phishing, EHR system targeting

**Crown Jewels at Risk**: PHI, medical records, insurance data

---

### E-Commerce

**Primary Threat Actors**:
1. Cybercriminals (payment card theft)
2. Competitors (pricing/strategy intel)
3. Opportunistic attackers (card testing)

**Key Tactics**: Magecart/skimming, credential stuffing, API abuse

**Crown Jewels at Risk**: Payment methods, customer PII, purchase history

---

### SaaS/Cloud Platforms

**Primary Threat Actors**:
1. Supply chain attackers (leverage customer access)
2. Nation-state APTs (target high-value customers)
3. Insider threats (customer data access)

**Key Tactics**: API key theft, tenant isolation bypass, credential compromise

**Crown Jewels at Risk**: Customer API keys, tenant data, platform credentials

---

### Manufacturing/Industrial

**Primary Threat Actors**:
1. Competitors (trade secret theft)
2. Nation-state APTs (IP theft)
3. Sabotage actors (disruption)

**Key Tactics**: Spear phishing, OT/ICS attacks, insider recruitment

**Crown Jewels at Risk**: Trade secrets, formulas, supply chain data

---

## Threat Actor Assessment Worksheet

Use this to profile threat actors for your specific application:

```json
{
  "threat_actors": [
    {
      "name": "Financially motivated cybercriminals",
      "motivation": "financial_gain",
      "capability": "medium",
      "likelihood": "high",
      "rationale": "Application handles payment data, limited security controls, high-value target",
      "attack_vectors": [
        "SQL injection for card data theft",
        "Credential stuffing",
        "Ransomware via phishing"
      ],
      "mitigations": [
        "PCI-DSS compliance",
        "MFA enforcement",
        "WAF deployment"
      ]
    }
  ]
}
```

### Assessment Questions

1. **Who would benefit from compromising this application?**
   - Financial gain, espionage, disruption, publicity?

2. **What is our industry's threat landscape?**
   - Review threat intelligence reports for industry

3. **What past incidents have occurred?**
   - Similar companies, same industry, same technologies

4. **What is our attacker surface?**
   - Internet-facing, internal, partner networks

5. **What is the effort-to-reward ratio for attackers?**
   - High-value data + low security = high likelihood

## MITRE ATT&CK Mapping

Map threat actors to ATT&CK techniques for detailed analysis:

| Threat Actor Type | Common ATT&CK Techniques |
|------------------|--------------------------|
| **Ransomware Operators** | T1486 (Data Encrypted for Impact), T1490 (Inhibit System Recovery) |
| **APT Groups** | T1071 (Application Layer Protocol), T1027 (Obfuscated Files) |
| **Opportunistic Attackers** | T1190 (Exploit Public-Facing Application), T1110 (Brute Force) |
| **Insiders** | T1213 (Data from Information Repositories), T1048 (Exfiltration Over Alternative Protocol) |

## Output Format

Use this structure for `threat-actors.json`:

```json
{
  "assessment_date": "2025-12-18",
  "threat_actors": [
    {
      "id": "TA-001",
      "name": "Financially motivated cybercriminals",
      "motivation": "financial_gain",
      "capability": "medium",
      "likelihood": "high",
      "rationale": "Payment processing, limited controls",
      "likely_targets": ["payment_data", "credentials", "customer_pii"],
      "attack_vectors": [
        "SQL injection",
        "Credential stuffing",
        "Phishing"
      ],
      "mitre_attck_techniques": ["T1190", "T1110", "T1566"],
      "mitigations": [
        "PCI-DSS compliance",
        "MFA enforcement",
        "Input validation"
      ]
    }
  ],
  "industry_context": {
    "industry": "e-commerce",
    "common_threat_actors": ["cybercriminals", "opportunistic_attackers"],
    "recent_incidents": ["competitor_breach_2024", "ransomware_campaign_2023"]
  }
}
```

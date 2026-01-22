# DORA Covered Entities

**Complete classification of 20+ entity types subject to DORA, exemptions, proportionality application, and extraterritoriality provisions.**

## Entity Types Subject to DORA

### Traditional Financial Institutions

**Credit Institutions** (Article 2(1)(a))

- Commercial banks
- Building societies
- Savings banks
- Cooperative banks
- **Obligation:** Full Chapters II-V compliance

**Investment Firms** (Article 2(1)(b))

- Broker-dealers
- Trading platforms
- Investment advisors
- Portfolio managers
- **Obligation:** Full Chapters II-V compliance

**Insurance and Reinsurance Companies** (Article 2(1)(c))

- Life insurance
- Non-life insurance
- Reinsurance undertakings
- **Obligation:** Full Chapters II-V compliance

**Occupational Retirement Provision Schemes (IORPs)** (Article 2(1)(d))

- Pension funds
- Retirement schemes
- **Obligation:** Full compliance (proportionality applied)

**Management Companies** (Article 2(1)(e))

- UCITS management companies
- Fund managers
- **Obligation:** Full compliance

**Alternative Investment Fund Managers (AIFMs)** (Article 2(1)(f))

- Private equity fund managers
- Hedge fund managers
- Real estate fund managers
- **Obligation:** Full compliance

### Payment and Electronic Money

**Payment Institutions** (Article 2(1)(g))

- Payment processors
- Money transfer services
- Payment initiation services
- **Obligation:** Full compliance (PSD2 coordination)

**E-Money Institutions** (Article 2(1)(h))

- E-wallet providers
- Prepaid card issuers
- Digital money services
- **Obligation:** Full compliance

**Account Information Service Providers** (Article 2(1)(i))

- Financial aggregation services
- Account data providers
- **Obligation:** Full compliance

### Modern Financial Services

**Crypto-Asset Service Providers** (Article 2(1)(j))

- Cryptocurrency exchanges
- Wallet providers
- Crypto trading platforms
- Custody services
- **Obligation:** Full compliance (under MiCA regulation)
- **Note:** MiCA and DORA coordination required

**Crowdfunding Service Providers** (Article 2(1)(k))

- Equity crowdfunding platforms
- Lending crowdfunding platforms
- **Obligation:** Full compliance

**Payment Fintechs**

- Mobile payment services
- QR code payment providers
- Buy-now-pay-later (BNPL) services
- **Obligation:** Covered under payment institution classification

### Market Infrastructure

**Central Securities Depositories (CSDs)** (Article 2(1)(l))

- Securities settlement systems
- Central depositories
- **Obligation:** Full compliance + enhanced testing (pre-deployment vulnerability assessments)

**Central Counterparties (CCPs)** (Article 2(1)(m))

- Clearing houses
- Derivatives clearing
- **Obligation:** Full compliance + enhanced testing

**Trading Venues** (Article 2(1)(n))

- Stock exchanges
- Multilateral trading facilities (MTFs)
- Organized trading facilities (OTFs)
- **Obligation:** Full compliance

**Trade Repositories** (Article 2(1)(o))

- Derivatives trade data repositories
- **Obligation:** Full compliance

**Credit Rating Agencies (CRAs)** (Article 2(1)(p))

- Rating agencies
- **Obligation:** Full compliance

**Administrators of Critical Benchmarks** (Article 2(1)(q))

- LIBOR successors (SOFR, SONIA, etc.)
- Index administrators
- **Obligation:** Full compliance

### ICT Third-Party Service Providers

**Cloud Service Providers**

- Infrastructure as a Service (IaaS): AWS, Azure, Google Cloud, Oracle Cloud
- Platform as a Service (PaaS)
- Software as a Service (SaaS) for financial services
- **Obligation:** Chapter V + CTPP oversight if designated

**Data Centers and Colocation Providers**

- Equinix, Digital Realty, Cyxtera, InterXion
- **Obligation:** Chapter V + CTPP oversight if designated

**Infrastructure and Network Services**

- CDN providers: Cloudflare, Akamai
- Network infrastructure: Lumen Technologies
- DNS providers
- DDoS protection services
- **Obligation:** Chapter V + CTPP oversight if designated

**Financial Services Technology Vendors**

- Core banking systems: FIS, Finastra, Temenos
- Trading platforms: ION Group
- Financial messaging and settlement: Broadridge, SS&C
- **Obligation:** Chapter V + CTPP oversight if designated

**Managed Security Service Providers (MSSPs)**

- SOC-as-a-Service
- SIEM providers
- Threat intelligence services
- **Obligation:** Chapter V if serving financial entities

**Software Vendors Providing Critical Services**

- ERP systems for finance
- Risk management platforms
- Compliance software
- **Obligation:** Chapter V if critical/important function

---

## Extraterritoriality Provisions

**DORA applies to non-EU ICT providers serving EU financial entities** (similar to GDPR extraterritorial reach).

### Non-EU Provider Obligations

**If providing services to EU financial entities:**

- Subject to Chapter V (ICT third-party risk management)
- Must comply with Article 30 contractual requirements
- Can be designated as CTPP (critical provider)
- Subject to direct ESA oversight if CTPP-designated
- Must maintain **EU-based representative** for CTPP compliance

**Examples of Non-EU Providers Subject to DORA:**

- **Amazon Web Services (US)** - CTPP designated November 2025
- **Microsoft Azure (US)** - CTPP designated November 2025
- **Google Cloud (US)** - CTPP designated November 2025
- **Oracle Cloud (US)** - CTPP designated November 2025

### Data Residency and Sovereignty

**Article 30 considerations for non-EU providers:**

- Data location and jurisdictional risks assessment required
- Third-country legal framework analysis
- Data transfer mechanisms (EU-US Data Privacy Framework, Standard Contractual Clauses)
- Access by non-EU authorities (CLOUD Act implications for US providers)

**Financial entities must:**

- Assess legal risks of non-EU provider jurisdictions
- Document data residency controls
- Evaluate concentration risk from single-jurisdiction providers
- Consider multi-region/multi-cloud architectures

---

## Exemptions and Exclusions

### Microenterprises (Article 4(6))

**Definition:**

- **<10 employees** AND
- **<€2 million annual turnover** OR
- **<€2 million total assets**

**Exemptions:**

- Simplified ICT risk management framework (Article 15)
- Exempt from advanced TLPT requirements (Article 26)
- Streamlined testing obligations
- Proportionate third-party risk management

**Still Required:**

- Major incident reporting (Article 19) - NO exemption
- Basic ICT risk management
- Business continuity planning
- Third-party contractual arrangements (simplified)

### Non-Financial Entities Explicitly Excluded

**NOT covered by DORA:**

- Manufacturing companies
- Retail businesses (non-financial)
- Healthcare providers
- Energy companies
- Telecommunications providers (covered by NIS2 Directive instead)
- General technology vendors not serving financial services

**Exception:** Technology vendors **become covered** if they provide ICT services to financial entities (Chapter V applies).

---

## Proportionality Application

DORA applies requirements proportionate to:

1. **Size** of the entity
2. **Complexity** of operations
3. **Nature** of services
4. **Risk profile**

### Size-Based Proportionality

| Entity Size            | ICT Risk Framework  | TLPT Frequency         | Testing Rigor   | Reporting     |
| ---------------------- | ------------------- | ---------------------- | --------------- | ------------- |
| Microenterprise        | Simplified (Art 15) | Exempt                 | Basic           | Full (Art 19) |
| Small                  | Proportionate       | Risk-based (>3y)       | Moderate        | Full          |
| Medium                 | Standard            | Every 3-4 years        | Standard        | Full          |
| Large/Significant      | Full                | Every 3 years          | Advanced (TLPT) | Enhanced      |
| Systemically Important | Full + Enhanced     | Every 3 years + ad-hoc | TLPT mandatory  | Real-time     |

### Complexity-Based Proportionality

**Simple operations** (single product, limited channels):

- Streamlined risk assessments
- Focused testing on critical systems
- Proportionate third-party oversight

**Complex operations** (multi-product, cross-border, high-frequency trading):

- Comprehensive risk assessments
- Extensive testing programs
- Rigorous third-party due diligence
- Enhanced governance structures

### Risk-Based Proportionality

**Lower risk profile:**

- Less frequent testing cycles
- Simplified incident classification
- Proportionate vendor management

**Higher risk profile:**

- Mandatory TLPT every 3 years
- Real-time monitoring requirements
- Enhanced third-party oversight
- Stricter concentration risk limits

---

## Designation Criteria for "Significant" Entities

**Significant entities** (subject to mandatory TLPT under Article 26):

### Credit Institutions

- Systemically important banks (Global SIBs, O-SIIs)
- Total assets >€30 billion
- Cross-border operations across multiple EU member states

### Investment Firms

- Class 1 investment firms under IFR/IFD
- Significant trading volumes
- Critical market infrastructure participation

### Central Securities Depositories and Central Counterparties

- **All CSDs and CCPs** automatically designated as significant
- Pre-deployment vulnerability assessments mandatory

### Other Entities

- Designated by national competent authorities based on:
  - Systemic importance
  - Client base size
  - Interconnectedness with financial system
  - Cross-border activity

---

## Entity Classification Workflow

```
1. Is entity a financial institution? (Article 2 list)
   ↓ YES → Continue
   ↓ NO → DORA does not apply (unless ICT third-party provider)
   ↓
2. Is entity a microenterprise? (<10 employees, <€2M turnover)
   ↓ YES → Simplified requirements (Article 15), but still Article 19 reporting
   ↓ NO → Continue
   ↓
3. Determine entity size and complexity
   ↓
4. Assess risk profile (services, clients, operations)
   ↓
5. Apply proportionate requirements:
   - Small/low risk: Proportionate ICT framework, risk-based testing
   - Medium: Standard requirements
   - Large/significant: Full requirements including TLPT
   ↓
6. Identify all ICT third-party providers (Chapter V)
   ↓
7. Classify third-party services (critical/important/other)
   ↓
8. Apply Article 28-30 requirements proportionately
```

---

## Common Entity Classification Questions

**Q: Does DORA apply to a UK-based bank with EU branches?**
**A:** Yes. The EU branches are subject to DORA. The UK operations are not (unless providing services into EU).

**Q: Does DORA apply to a US fintech serving EU customers?**
**A:** Yes, if licensed in EU as payment institution or e-money institution. The entity is covered.

**Q: Does DORA apply to an AWS data center in the US?**
**A:** Yes, via extraterritoriality. AWS (US) is CTPP-designated, subject to Chapter V and ESA oversight.

**Q: Does DORA apply to a small crypto exchange with 8 employees?**
**A:** Possibly exempt as microenterprise, but **must still report major incidents** (Article 19). Simplified framework otherwise.

**Q: Does DORA apply to Salesforce CRM used by a bank?**
**A:** If Salesforce supports critical/important functions for the bank, Chapter V applies (third-party risk management, Article 30 contracts).

---

## Official Guidance on Entity Classification

- **EBA Register:** https://www.eba.europa.eu/risk-analysis-and-data/register-of-financial-entities
- **ESMA Database:** https://registers.esma.europa.eu/
- **EIOPA Register:** https://www.eiopa.europa.eu/tools-and-data/registers_en
- **National Competent Authorities:** Jurisdiction-specific guidance on entity classification

# DORA Threat-Led Penetration Testing (TLPT) Requirements

**Articles 24-27 implementation guidance using TIBER-EU framework (updated February 11, 2025).**

## Overview

Threat-Led Penetration Testing (TLPT) is **mandatory for significant entities** under DORA Article 26, conducted using the **TIBER-EU framework** developed by the European Central Bank.

**Purpose:**

- Test resilience against realistic, intelligence-driven cyber attacks
- Identify vulnerabilities before malicious actors exploit them
- Validate detection, response, and recovery capabilities
- Enhance organizational cyber resilience through simulated real-world scenarios

**Frequency:** Every **3 years** minimum (Article 26(11))

**Scope:** Live production systems (with controlled risk)

## Mandatory Entities

**TLPT required for:**

- **Significant credit institutions** (systemically important banks)
- **Large investment firms**
- **Central securities depositories (CSDs)**
- **Central counterparties (CCPs)**
- **Other entities designated by competent authorities** based on risk

**Optional for:**

- Smaller entities (but recommended for critical functions)
- Entities seeking enhanced assurance

**Pooled TLPT:**

- Multiple smaller entities can pool resources
- Shared testing infrastructure and costs
- Regulatory approval required
- Cost-effective for entities with similar profiles

## TIBER-EU Framework Phases

### Phase 1: Preparation (6 months typical)

**1.1 Scope Definition**

- **Critical functions** to be tested (payment systems, trading platforms, customer data)
- **In-scope systems and networks** (production, not test environments)
- **Out-of-scope boundaries** (what should NOT be tested)
- **Risk appetite** and acceptable impact thresholds
- **Testing windows** (dates, times, blackout periods)

**1.2 Threat Intelligence Gathering**

- **Generic threat intelligence**: Applicable to financial sector
- **Targeted threat intelligence**: Specific to the entity (sector, geography, services)
- **Threat actor profiling**: Likely adversaries (organized crime, nation-state, hacktivists)
- **TTPs** (Tactics, Techniques, Procedures) relevant to identified threats
- **Attack scenarios** based on intelligence (minimum 3 scenarios required)

**1.3 Stakeholder Engagement**

- **White Team**: Project management and coordination (entity's staff)
- **Red Team**: External penetration testers selected
- **Blue Team**: Entity's security operations (detection and response)
- **Purple Team**: Coordination between red and blue (mandatory as of 2025 update)
- **Competent Authority**: Notification and approval

**1.4 Red Team Selection**

- **External testers required** at least once per 3-year cycle
- **Internal testing allowed** for 2 of 3 cycles if capabilities exist
- **Qualification requirements**:
  - 5+ years penetration testing experience
  - Professional indemnity insurance (minimum coverage levels)
  - Recognized certifications: **OSCP** (Offensive Security Certified Professional), **CREST**, **CEH** (Certified Ethical Hacker)
  - Financial services sector experience preferred
  - TIBER-EU training certification

**1.5 Legal and Contractual Arrangements**

- **Rules of engagement**: What's allowed, what's prohibited
- **Liability and indemnification**: Insurance, damage clauses
- **Confidentiality**: NDA for sensitive information
- **Data protection**: GDPR compliance for test data
- **Notification protocols**: When to escalate, emergency stop procedures

**1.6 Regulatory Notification**

- **Competent authority approval** before testing
- **TLPT testing plan submission** (scope, scenarios, dates)
- **Cross-border coordination** if multi-jurisdiction entity

### Phase 2: Testing (12+ weeks typical)

**2.1 Intelligence-Based Scenarios (Minimum 3)**

Scenarios must be based on threat intelligence, not generic testing:

**Example Scenario 1: Financially Motivated Organized Crime**

- **Objective**: Exfiltrate customer financial data for sale on dark web
- **Attack Vector**: Phishing → credential theft → lateral movement → data exfiltration
- **TTPs**: Spear phishing, credential stuffing, Mimikatz, data staging

**Example Scenario 2: Nation-State Espionage**

- **Objective**: Long-term persistent access for intelligence gathering
- **Attack Vector**: Supply chain compromise → backdoor implant → C2 establishment
- **TTPs**: Watering hole attacks, zero-day exploits, custom malware, steganography

**Example Scenario 3: Hacktivist Disruption**

- **Objective**: Disrupt services to damage reputation and cause financial loss
- **Attack Vector**: DDoS + web application attacks → defacement + service outage
- **TTPs**: Botnet DDoS, SQL injection, XSS, public disclosure of vulnerabilities

**2.2 Attack Execution**

**Reconnaissance (2-4 weeks):**

- **OSINT** (Open Source Intelligence): Public information gathering
- **Network mapping**: External footprint, DNS, subdomains
- **Social engineering prep**: Employee profiling via LinkedIn, social media
- **Vulnerability scanning**: External-facing assets
- **Identify entry points**: Email, web applications, VPN, partners

**Initial Compromise (1-2 weeks):**

- **Phishing campaigns**: Spear phishing, watering hole attacks
- **Exploitation**: Known vulnerabilities, zero-day if intelligence supports
- **Physical access attempts** (if in scope): Tailgating, USB drops
- **Third-party compromise**: Supplier or partner as entry vector

**Lateral Movement (2-4 weeks):**

- **Privilege escalation**: Local admin → domain admin
- **Credential harvesting**: Kerberoasting, NTLM relay, password reuse
- **Network traversal**: Pivot through internal systems
- **Persistence mechanisms**: Backdoors, scheduled tasks, registry modifications

**Objective Achievement (2-4 weeks):**

- **Data exfiltration**: Customer data, financial records, intellectual property
- **Service disruption**: Critical function impairment
- **C2 (Command and Control)** establishment for persistent access
- **Evidence collection**: Screenshots, file samples, access logs

**2.3 Testing Without Operational Awareness**

**True Red Team Testing:**

- **Blue Team (SOC) NOT informed** of testing dates or methods
- Tests real-world detection and response capabilities
- Simulates actual attack where defenders don't expect it

**Controlled Risk:**

- **White Team monitoring** throughout testing
- **Emergency stop procedures** if critical impact
- **Pre-defined thresholds** for halting (e.g., production outage risk)

**2.4 Purple Teaming (Mandatory as of February 2025 TIBER-EU Update)**

**After Red Team completes attack:**

- **Joint debrief**: Red team shows what they did, how they avoided detection
- **Blue team learns**: Detection gaps, control weaknesses
- **Collaborative remediation**: Red team helps validate fixes
- **Re-testing**: Blue team requests re-test of specific scenarios after improvements

**Benefits:**

- Accelerated learning cycle
- Immediate control enhancement
- Builds internal capability
- More value from testing investment

### Phase 3: Closure (2-4 months typical)

**3.1 Red Team Report Delivery**

**Report Structure:**

- **Executive Summary**: High-level findings for management and board
- **Technical Findings**: Detailed vulnerability and exploitation documentation
- **Attack Timeline**: Complete chronology of testing activities
- **Evidence**: Screenshots, logs, artifacts proving objective achievement
- **Detection Gaps**: What blue team missed, why
- **Control Weaknesses**: Specific failures (technical, process, people)
- **Severity Ratings**: Critical, high, medium, low vulnerabilities
- **Remediation Recommendations**: Prioritized by risk

**Report Audience:**

- Management body (executive summary)
- CISO and security teams (technical findings)
- Competent authority (regulatory submission)
- Internal audit (oversight validation)

**3.2 Management Remediation Plan**

**Required within 30-60 days of red team report:**

- **Prioritized remediation roadmap**: Critical → high → medium → low
- **Assigned owners**: Who's responsible for each fix
- **Timelines**: When each remediation will be completed
- **Resource requirements**: Budget, staff, tools needed
- **Interim controls**: Compensating controls while permanent fixes in progress
- **Re-test plan**: How fixes will be validated

**3.3 Regulatory Submission**

**Submit to competent authority:**

- Red team report (may be redacted for sensitive details)
- Management remediation plan
- Timeline for completion
- Key lessons learned
- Impact on risk register and controls

**Authority Review:**

- Assess findings severity
- Evaluate remediation plan adequacy
- May require enhancements or accelerated timelines
- Can mandate follow-up testing

**3.4 Lessons Learned**

**Organizational Improvements:**

- **Technical controls**: Patch vulnerabilities, enhance monitoring, improve segmentation
- **Process improvements**: Incident response, change management, access control procedures
- **People enhancements**: Security awareness training, phishing simulations, SOC analyst skills
- **Third-party management**: Vendor security requirements, supply chain risk assessment

**Knowledge Sharing:**

- Share anonymized findings with industry peers (Article 45 information sharing)
- Participate in threat intelligence communities
- Contribute to sector-wide resilience

## 2025 TIBER-EU Framework Updates

**Published February 11, 2025 to align with DORA enforcement:**

### Key Changes

1. **Purple Teaming Mandatory** (previously optional)
   - Red and blue team collaboration required
   - Accelerates defensive improvements
   - Validates remediation effectiveness

2. **Enhanced Threat Intelligence Integration**
   - Real-time threat feeds during testing
   - Incorporation of latest TTPs
   - Scenario updates mid-testing if new threats emerge

3. **Automated Attack Simulation Tools Permitted**
   - Breach and Attack Simulation (BAS) platforms allowed for testing
   - Must be intelligence-driven, not generic scans
   - Human red team oversight required

4. **Cloud Environment Testing Guidance**
   - Specific TTPs for cloud-native attacks
   - Multi-cloud and hybrid environment scenarios
   - Shared responsibility model testing (entity vs provider controls)

5. **Supply Chain Attack Scenarios**
   - Third-party compromise as entry vector
   - Software supply chain (dependencies, open source)
   - Service provider compromise scenarios

6. **Ransomware-Specific Testing**
   - Data exfiltration before encryption (double extortion)
   - Backup integrity testing
   - Recovery time validation

## Testing Frequency and Cycles

**3-Year Cycle Breakdown:**

| Year | Testing Type     | Tester Type | Scope                                     |
| ---- | ---------------- | ----------- | ----------------------------------------- |
| 1    | Full TLPT        | External    | All critical functions                    |
| 2    | Targeted testing | Internal    | High-risk areas identified in Y1          |
| 3    | Full TLPT prep   | External    | Intelligence gathering, scenario planning |

**Flexibility:**

- Competent authorities may require more frequent testing for high-risk entities
- Major incidents or control failures may trigger unscheduled TLPT
- Significant changes (M&A, new critical services) may reset cycle

## Cost Considerations

**Typical TLPT costs:**

- **External red team**: €100,000 - €500,000 (depends on scope, duration)
- **Threat intelligence**: €20,000 - €100,000
- **Internal resource costs**: 1-2 FTEs for 6-12 months (white team, coordination)
- **Remediation**: Variable (can exceed testing costs for major findings)

**Cost Reduction Strategies:**

- **Pooled TLPT**: Share costs with similar entities
- **Internal testing**: Years 2 and 3 if capabilities exist
- **Phased approach**: Test critical functions first, expand over time

## Common TLPT Findings (Financial Sector)

**Based on early DORA TLPT results:**

1. **Phishing Success Rates: 15-30%** (employees clicking malicious links)
2. **Lateral Movement**: 80%+ of tests achieved domain admin within 72 hours
3. **Detection Gaps**: 60% of red team activities undetected by SOC
4. **Patch Management**: Critical vulnerabilities unpatched beyond timelines
5. **Privileged Access**: Excessive admin rights, weak password policies
6. **Third-Party Risks**: Supplier VPN access led to compromise in 40% of tests
7. **Cloud Misconfiguration**: Public S3 buckets, over-permissive IAM roles
8. **Backup Integrity**: Ransomware simulation successfully compromised backups in 25% of tests

## Tooling and Techniques

**Red Team Toolset (examples):**

- **Reconnaissance**: nmap, Shodan, theHarvester, Maltego
- **Exploitation**: Metasploit, Cobalt Strike, custom exploits
- **Credential Harvesting**: Mimikatz, Rubeus, Kerberoasting tools
- **Lateral Movement**: PsExec, WMI, PowerShell Empire
- **C2 Frameworks**: Cobalt Strike, Sliver, Havoc
- **Evasion**: Obfuscation, in-memory execution, living-off-the-land binaries

**Blue Team Detection (what TLPT validates):**

- **SIEM**: Log correlation and alerting
- **EDR/XDR**: Endpoint and extended detection
- **Network Security**: IDS/IPS, NetFlow analysis
- **Deception**: Honeypots, honey tokens
- **Threat Hunting**: Proactive adversary search
- **User Behavior Analytics (UBA)**: Anomaly detection

## Compliance Checklist

- [ ] Competent authority notified and TLPT plan approved
- [ ] Scope defined (critical functions, in-scope systems)
- [ ] Threat intelligence gathered (generic + targeted)
- [ ] Minimum 3 intelligence-based scenarios developed
- [ ] External red team selected (qualifications verified)
- [ ] Rules of engagement documented and signed
- [ ] Legal and contractual arrangements finalized
- [ ] White team project management established
- [ ] Blue team (SOC) prepared (but not informed of testing dates)
- [ ] Purple teaming protocol established (2025 requirement)
- [ ] Emergency stop procedures defined
- [ ] Testing executed (12+ weeks)
- [ ] Red team report delivered (within 30 days of testing completion)
- [ ] Management remediation plan created (within 60 days)
- [ ] Regulatory submission completed
- [ ] Remediation in progress with tracking
- [ ] Lessons learned documented and shared
- [ ] Next cycle planning initiated (Year 3 for next full TLPT)

## References

- **TIBER-EU Framework** (February 2025 update): [ECB TIBER-EU](https://www.ecb.europa.eu/pub/pdf/other/ecb.tiber_eu_framework.en.pdf)
- **DORA Articles 24-27**: [EUR-Lex](https://eur-lex.europa.eu/eli/reg/2022/2554/oj)
- **EBA RTS on TLPT** (July 2024)
- **CREST**: Certification body for testers
- **Offensive Security**: OSCP certification
- **FS-ISAC**: Financial services threat intelligence sharing

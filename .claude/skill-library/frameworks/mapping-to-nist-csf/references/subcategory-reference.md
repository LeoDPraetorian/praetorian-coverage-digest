# Complete NIST CSF 2.0 Subcategory Reference

**Source:** NIST CSWP 29 (February 26, 2024)
**Total Subcategories:** 106

This document provides the complete enumeration of all NIST CSF 2.0 subcategories organized by Function and Category.

---

## GOVERN (GV) Function - ~30 Subcategories

### GV.OC - Organizational Context (5 subcategories)

| ID           | Subcategory                     | Description                                                                                                                           |
| ------------ | ------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| **GV.OC-01** | Organizational Mission          | The organizational mission is understood and informs cybersecurity risk management                                                    |
| **GV.OC-02** | Stakeholder Understanding       | Internal and external stakeholder needs regarding security governance are identified and addressed                                    |
| **GV.OC-03** | Legal & Regulatory Requirements | Organizations identify and manage compliance obligations spanning privacy, civil liberties, and sector regulations (formerly ID.GV-3) |
| **GV.OC-04** | External Dependencies           | Critical services that external parties depend on are documented and communicated (formerly ID.BE-4 and ID.BE-5)                      |
| **GV.OC-05** | Internal Dependencies           | Essential capabilities and services the organization relies on are identified and documented (formerly ID.BE-1 and ID.BE-4)           |

### GV.RM - Risk Management Strategy (7-8 subcategories)

| ID           | Subcategory               | Description                                                                                                                          |
| ------------ | ------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| **GV.RM-01** | Risk Objectives           | Risk management objectives are established and agreed to by organizational stakeholders (formerly ID.RM-1)                           |
| **GV.RM-02** | Risk Appetite & Tolerance | Organizations define and communicate acceptable risk boundaries                                                                      |
| **GV.RM-03** | Enterprise Integration    | Security risk management activities integrate into broader organizational risk frameworks                                            |
| **GV.RM-04** | Strategic Response        | Clear frameworks guide selection among mitigation, acceptance, transfer, or avoidance strategies                                     |
| **GV.RM-05** | Communication Lines       | Formal channels facilitate cybersecurity risk discussions across the organization and third parties                                  |
| **GV.RM-06** | Risk Calculation          | A standardized method for calculating, documenting, categorizing, and prioritizing cybersecurity risks                               |
| **GV.RM-07** | Positive Risks            | Opportunities and strategic benefits from security investments are identified and tracked                                            |
| **GV.RM-08** | Strategy Review           | Effectiveness and adequacy of cybersecurity risk management strategy and results are assessed and reviewed by organizational leaders |

### GV.RR - Roles, Responsibilities, and Authorities (2-4 subcategories)

| ID           | Subcategory               | Description                                                                                                                               |
| ------------ | ------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| **GV.RR-01** | Leadership Accountability | Executives drive security culture and are accountable for governance outcomes                                                             |
| **GV.RR-02** | Role Definition           | Roles, responsibilities, and authorities related to cybersecurity risk management are established, communicated, understood, and enforced |
| **GV.RR-03** | Resource Allocation       | Adequate resources are allocated commensurate with the cybersecurity risk strategy, roles, responsibilities, and policies                 |
| **GV.RR-04** | HR Integration            | Cybersecurity responsibilities are embedded in job descriptions, training, and performance evaluations                                    |

### GV.PO - Policy (2 subcategories)

| ID           | Subcategory          | Description                                                                                    |
| ------------ | -------------------- | ---------------------------------------------------------------------------------------------- |
| **GV.PO-01** | Policy Establishment | Organizations develop formal cybersecurity policies aligned with strategy and business context |
| **GV.PO-02** | Policy Maintenance   | Policies are regularly reviewed and updated to reflect regulatory changes and threat evolution |

### GV.OV - Oversight (3 subcategories)

| ID           | Subcategory            | Description                                                                                              |
| ------------ | ---------------------- | -------------------------------------------------------------------------------------------------------- |
| **GV.OV-01** | Strategy Review        | Cybersecurity risk management strategy outcomes are reviewed to inform and adjust strategy and direction |
| **GV.OV-02** | Coverage Assessment    | The strategy is evaluated to ensure it addresses evolving organizational requirements and risks          |
| **GV.OV-03** | Performance Evaluation | Program effectiveness is monitored through KPIs and periodic assessments                                 |

### GV.SC - Cybersecurity Supply Chain Risk Management (10 subcategories) **[LARGEST CATEGORY]**

| ID           | Subcategory                    | Description                                                                                     |
| ------------ | ------------------------------ | ----------------------------------------------------------------------------------------------- |
| **GV.SC-01** | Program Establishment          | A formal supply chain risk management program with objectives and processes is established      |
| **GV.SC-02** | Third-Party Roles              | Cybersecurity responsibilities for suppliers and partners are defined and communicated          |
| **GV.SC-03** | ERM Integration                | Supply chain security practices integrate into enterprise risk management frameworks            |
| **GV.SC-04** | Supplier Prioritization        | Vendors are inventoried and ranked according to operational criticality                         |
| **GV.SC-05** | Contractual Requirements       | Cybersecurity obligations are embedded in supplier agreements and contracts                     |
| **GV.SC-06** | Pre-Relationship Due Diligence | Risk assessments occur before formalizing vendor relationships                                  |
| **GV.SC-07** | Ongoing Monitoring             | Supplier risks are continuously assessed, documented, and monitored throughout the relationship |
| **GV.SC-08** | Incident Coordination          | Suppliers participate in incident response planning and recovery exercises                      |
| **GV.SC-09** | Lifecycle Integration          | Supply chain security is monitored throughout products and services' operational lifecycles     |
| **GV.SC-10** | Post-Agreement Management      | Contracts address data handling and access revocation after partnerships conclude               |

---

## IDENTIFY (ID) Function - ~20 Subcategories

### ID.AM - Asset Management (7 subcategories, intentional gap at ID.AM-06)

| ID           | Subcategory          | Description                                                                                                                        |
| ------------ | -------------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| **ID.AM-01** | Hardware Inventory   | Inventories of hardware managed by the organization are maintained                                                                 |
| **ID.AM-02** | Software Inventory   | Inventories of software, services, and systems managed by the organization are maintained                                          |
| **ID.AM-03** | Network Mapping      | Representations of the organization's authorized network communication and internal and external network data flows are maintained |
| **ID.AM-04** | Supplier Services    | Inventories of services provided by suppliers are maintained                                                                       |
| **ID.AM-05** | Asset Prioritization | Assets are prioritized based on classification, criticality, resources, and impact on the mission                                  |
| **ID.AM-07** | Data Inventory       | Inventories of data and corresponding metadata for designated data types are maintained                                            |

_Note: ID.AM-06 was removed/does not exist in final version (intentional gap in numbering)_

### ID.RA - Risk Assessment (~6-10 subcategories)

| ID           | Subcategory                                        | Description                                                                                                     |
| ------------ | -------------------------------------------------- | --------------------------------------------------------------------------------------------------------------- |
| **ID.RA-01** | Vulnerability Identification                       | **Vulnerabilities in assets are identified, validated, and recorded** (PRIMARY for vulnerability management)    |
| **ID.RA-02** | Cyber Threat Intelligence                          | Cyber threat intelligence is received from information sharing forums and sources                               |
| **ID.RA-03** | Threat Information Incorporation                   | Internal and external threat information is used to understand likelihood and impact of cybersecurity events    |
| **ID.RA-04** | Business Impact Analysis                           | Potential business impacts and likelihoods are identified                                                       |
| **ID.RA-05** | Threats, Vulnerabilities, Likelihoods, and Impacts | Threats, vulnerabilities, likelihoods, and impacts are used to determine risk                                   |
| **ID.RA-06** | Risk Responses                                     | Risk responses are identified and prioritized                                                                   |
| **ID.RA-08** | Vulnerability Disclosure Management                | **NEW IN CSF 2.0:** Establishes processes for receiving, analyzing, and responding to vulnerability disclosures |

### ID.IM - Improvement (~3 subcategories)

| ID           | Subcategory                         | Description                                                                      |
| ------------ | ----------------------------------- | -------------------------------------------------------------------------------- |
| **ID.IM-01** | Improvement Plans                   | Improvements are identified from detection/response activities and other sources |
| **ID.IM-02** | Response and Recovery Plans Updated | Response and recovery plans are updated based on lessons learned and reviews     |
| **ID.IM-03** | Improvement Plan Implementation     | Plans incorporate lessons learned and are executed                               |

---

## PROTECT (PR) Function - ~20 Subcategories

### PR.AA - Identity Management, Authentication, and Access Control (6 subcategories)

| ID           | Subcategory                        | Description                                                                                                                                                                                   |
| ------------ | ---------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **PR.AA-01** | Identity and Credential Management | Identities and credentials for authorized users, services, and hardware are managed by the organization                                                                                       |
| **PR.AA-02** | Identity Proofing                  | Identities are proofed and bound to credentials based on the context of interactions                                                                                                          |
| **PR.AA-03** | Authentication                     | Users, services, and hardware are authenticated                                                                                                                                               |
| **PR.AA-04** | Identity Assertion Protection      | Identity assertions are protected, conveyed, and verified                                                                                                                                     |
| **PR.AA-05** | Access Control                     | **Access permissions, entitlements, and authorizations are defined in a policy, managed, enforced, and reviewed, and incorporate the principles of least privilege and separation of duties** |
| **PR.AA-06** | Physical Access Control            | Physical access to assets is managed, monitored, and enforced commensurate with risk                                                                                                          |

### PR.AT - Awareness and Training (2 subcategories)

| ID           | Subcategory                      | Description                                                                                                            |
| ------------ | -------------------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| **PR.AT-01** | Personnel Awareness and Training | Personnel are provided cybersecurity awareness and training so that they can perform their cybersecurity-related tasks |
| **PR.AT-02** | Privileged Users                 | Privileged users understand their roles and responsibilities                                                           |

### PR.DS - Data Security (11 subcategories)

| ID           | Subcategory                          | Description                                                                                                      |
| ------------ | ------------------------------------ | ---------------------------------------------------------------------------------------------------------------- |
| **PR.DS-01** | Data-at-Rest Protection              | **Data at rest are protected** (PRIMARY for encryption issues)                                                   |
| **PR.DS-02** | Data-in-Transit Protection           | **Data in transit are protected** (PRIMARY for TLS/SSL issues)                                                   |
| **PR.DS-03** | Asset Lifecycle Management           | Assets are formally managed throughout removal, transfers, and disposition                                       |
| **PR.DS-04** | Adequate Capacity                    | Adequate capacity to ensure availability is maintained                                                           |
| **PR.DS-05** | Data Leak Protection                 | **Protections against data leaks are implemented**                                                               |
| **PR.DS-06** | Integrity Checking Software          | Integrity checking mechanisms are used to verify software, firmware, and information integrity                   |
| **PR.DS-07** | Development and Testing Environments | Development and testing environments are separated from production                                               |
| **PR.DS-08** | Integrity Checking Mechanisms        | **Integrity checking mechanisms are used to verify hardware and software integrity** (for tampering, corruption) |
| **PR.DS-09** | Availability and Resilience Testing  | The resilience of systems and assets is tested                                                                   |
| **PR.DS-10** | Confidentiality and Integrity        | Data at rest, in use, and in transit have confidentiality and integrity protected                                |
| **PR.DS-11** | Backup and Recovery                  | **Backups of information are conducted, maintained, and tested**                                                 |

### PR.PS - Platform Security (2-6 subcategories)

| ID           | Subcategory                | Description                                                                                             |
| ------------ | -------------------------- | ------------------------------------------------------------------------------------------------------- |
| **PR.PS-01** | Configuration Management   | **Configuration management practices are established and applied** (baseline configurations)            |
| **PR.PS-02** | Software Maintenance       | **Software is maintained, replaced, and removed commensurate with risk** (PRIMARY for patch management) |
| **PR.PS-03** | Hardware Maintenance       | Hardware is maintained, replaced, and removed commensurate with risk                                    |
| **PR.PS-04** | Log Records                | Log records are generated and made available for continuous monitoring                                  |
| **PR.PS-05** | Installation and Execution | Installation and execution of unauthorized software are prevented                                       |
| **PR.PS-06** | Secure Development         | **Secure software development practices are integrated** (SDLC, secure coding)                          |

### PR.IR - Technology Infrastructure Resilience (4 subcategories)

| ID           | Subcategory                  | Description                                                                                                                    |
| ------------ | ---------------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| **PR.IR-01** | Networks and Environments    | Networks and environments are protected from unauthorized logical access                                                       |
| **PR.IR-02** | Security Architectures       | Security architectures are managed with the organization's risk strategy                                                       |
| **PR.IR-03** | System Resilience            | Systems and assets are managed to achieve resilience                                                                           |
| **PR.IR-04** | Incident Response Capability | Adequate resources are maintained to ensure services are restored within time frames consistent with organizational objectives |

---

## DETECT (DE) Function - ~15 Subcategories

### DE.AE - Anomalies and Events (4-6 subcategories)

| ID           | Subcategory                | Description                                                                                                 |
| ------------ | -------------------------- | ----------------------------------------------------------------------------------------------------------- |
| **DE.AE-01** | Baseline Establishment     | **A baseline of network operations and expected data flows is established and managed**                     |
| **DE.AE-02** | Event Analysis             | **Detected events are analyzed to understand attack targets and methods** (threat intelligence integration) |
| **DE.AE-03** | Event Correlation          | Event data are aggregated and correlated from multiple sources and sensors                                  |
| **DE.AE-04** | Event Impact Determination | The estimated impact and scope of cybersecurity events are understood                                       |
| **DE.AE-05** | Incident Alert Thresholds  | Incident alert thresholds are established                                                                   |
| **DE.AE-06** | Phishing Detection         | **Phishing and social engineering events are detected**                                                     |

### DE.CM - Continuous Monitoring (9 subcategories)

| ID           | Subcategory                                | Description                                                                                                         |
| ------------ | ------------------------------------------ | ------------------------------------------------------------------------------------------------------------------- |
| **DE.CM-01** | Network Monitoring                         | **Networks and network services are monitored to find potentially adverse events** (PRIMARY for network monitoring) |
| **DE.CM-02** | Physical Environment Monitoring            | The physical environment is monitored to find potentially adverse events                                            |
| **DE.CM-03** | Personnel Activity Monitoring              | **Personnel activity is monitored to find potentially adverse events** (privileged account logging)                 |
| **DE.CM-04** | Malicious Code Detection                   | Malicious code is detected                                                                                          |
| **DE.CM-05** | Unauthorized Activity Detection            | Unauthorized mobile code and connections are detected                                                               |
| **DE.CM-06** | External Service Provider Activity         | **External service provider activity is monitored to find potentially adverse events**                              |
| **DE.CM-07** | Unauthorized Personnel Monitoring          | Monitoring for unauthorized personnel, connections, devices, and software is performed                              |
| **DE.CM-08** | Vulnerability Scans                        | Vulnerability scans are performed                                                                                   |
| **DE.CM-09** | Computing Hardware and Software Monitoring | Computing hardware and software are monitored to find potentially adverse events                                    |

---

## RESPOND (RS) Function - ~10 Subcategories

### RS.MA - Incident Management (2 subcategories)

| ID           | Subcategory               | Description                                                                                    |
| ------------ | ------------------------- | ---------------------------------------------------------------------------------------------- |
| **RS.MA-01** | Incident Response Process | **The incident response process is executed upon the detection of an event**                   |
| **RS.MA-02** | Incident Reports          | Incident reports are triaged and analyzed to support investigation and response prioritization |

### RS.AN - Incident Analysis (5 subcategories)

| ID           | Subcategory              | Description                                                                                    |
| ------------ | ------------------------ | ---------------------------------------------------------------------------------------------- |
| **RS.AN-01** | Incident Notification    | Notifications from detection systems are investigated                                          |
| **RS.AN-02** | Incident Impact Analysis | The impact of cybersecurity incidents is understood                                            |
| **RS.AN-03** | Forensics                | **Forensics are performed**                                                                    |
| **RS.AN-04** | Incident Categorization  | Incidents are categorized consistent with response plans                                       |
| **RS.AN-05** | Incident Processes       | **Incident response processes are consistent with incident response priorities and playbooks** |

### RS.CO - Incident Response Reporting and Communication (3 subcategories)

| ID           | Subcategory         | Description                                                                  |
| ------------ | ------------------- | ---------------------------------------------------------------------------- |
| **RS.CO-01** | Personnel Roles     | Personnel know their roles and order of operations when a response is needed |
| **RS.CO-02** | Incident Reporting  | Incidents are reported consistent with established criteria                  |
| **RS.CO-03** | Information Sharing | Information is shared with designated external stakeholders                  |

### RS.MI - Incident Mitigation (3 subcategories)

| ID           | Subcategory                                   | Description                                                                                              |
| ------------ | --------------------------------------------- | -------------------------------------------------------------------------------------------------------- |
| **RS.MI-01** | Incident Containment                          | **Incidents are contained and mitigated** (PRIMARY for vulnerability containment)                        |
| **RS.MI-02** | Newly Identified Vulnerabilities Mitigated    | Newly identified vulnerabilities are mitigated or documented as accepted risks                           |
| **RS.MI-03** | Newly Identified Vulnerabilities Incorporated | Newly identified vulnerabilities are documented and incorporated into vulnerability management processes |

---

## RECOVER (RC) Function - ~10 Subcategories

### RC.RP - Incident Recovery Plan Execution (2-3 subcategories)

| ID           | Subcategory              | Description                                                                                             |
| ------------ | ------------------------ | ------------------------------------------------------------------------------------------------------- |
| **RC.RP-01** | Recovery Plan Execution  | **The recovery plan is executed during or after a cybersecurity incident**                              |
| **RC.RP-02** | Recovery Time Objectives | Recovery time objectives (RTOs) and recovery point objectives (RPOs) are met                            |
| **RC.RP-03** | Recovery Process Updates | **Recovery processes are updated based on lessons learned** (NEW in CSF 2.0, formerly tied to RC.RP-01) |

### RC.CO - Incident Recovery Communication (3 subcategories)

| ID           | Subcategory                      | Description                                                                                                           |
| ------------ | -------------------------------- | --------------------------------------------------------------------------------------------------------------------- |
| **RC.CO-01** | Public Relations                 | Public relations are managed                                                                                          |
| **RC.CO-02** | Reputation Repair                | Reputation is repaired after an incident                                                                              |
| **RC.CO-03** | Recovery Activities Communicated | Recovery activities are communicated to internal and external stakeholders, as well as executive and management teams |

---

## Official Sources

- **NIST CSWP 29** (February 26, 2024): https://nvlpubs.nist.gov/nistpubs/CSWP/NIST.CSWP.29.pdf
- **NIST CSF 2.0 Reference Tool**: https://csrc.nist.gov/projects/cybersecurity-framework
- **Machine-Readable JSON**: https://csrc.nist.gov/extensions/nudp/services/json/csf/download?olirids=all

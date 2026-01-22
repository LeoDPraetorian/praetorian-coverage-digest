# Threat Actor Attribution

**APT/ransomware group identification and tracking for threat intelligence reports.**

## Nation-State APT Groups

### Russian Federation

| Group        | Alternative Names              | Primary Focus           | MITRE ID |
| ------------ | ------------------------------ | ----------------------- | -------- |
| **APT28**    | Fancy Bear, Sofacy, Sednit     | Military/Government     | G0007    |
| **APT29**    | Cozy Bear, The Dukes           | Intelligence collection | G0016    |
| **Turla**    | Snake, Uroburos, Venomous Bear | Long-term espionage     | G0010    |
| **Sandworm** | BlackEnergy, Voodoo Bear       | Critical infrastructure | G0034    |

### Chinese APT Groups

| Group     | Alternative Names            | Primary Focus             | MITRE ID |
| --------- | ---------------------------- | ------------------------- | -------- |
| **APT1**  | Comment Crew, PLA Unit 61398 | Intellectual property     | G0006    |
| **APT10** | Stone Panda, MenuPass        | Managed service providers | G0045    |
| **APT41** | Double Dragon, Barium        | Dual criminal/espionage   | G0096    |
| **APT40** | Leviathan, TEMP.Periscope    | Maritime/Naval            | G0065    |

### North Korean APT Groups

| Group       | Alternative Names      | Primary Focus              | MITRE ID |
| ----------- | ---------------------- | -------------------------- | -------- |
| **Lazarus** | Hidden Cobra, ZINC     | Financial theft, espionage | G0032    |
| **APT37**   | Reaper, ScarCruft      | South Korea targeting      | G0067    |
| **APT38**   | BeagleBoyz, Bluenoroff | Financial institutions     | G0082    |

### Iranian APT Groups

| Group     | Alternative Names           | Primary Focus                  | MITRE ID |
| --------- | --------------------------- | ------------------------------ | -------- |
| **APT33** | Elfin, Holmium              | Energy/Aviation                | G0064    |
| **APT34** | OilRig, Helix Kitten        | Middle East government/finance | G0049    |
| **APT35** | Charming Kitten, Phosphorus | Credentials harvesting         | G0059    |

## Ransomware Groups

### Ransomware-as-a-Service (RaaS)

| Group              | Active Since | Affiliate Model | Targeting                           |
| ------------------ | ------------ | --------------- | ----------------------------------- |
| **LockBit 3.0**    | 2019         | Yes             | Opportunistic, high-value           |
| **Black Basta**    | 2022         | Yes             | Enterprise, critical infrastructure |
| **ALPHV/BlackCat** | 2021         | Yes             | Large enterprises, government       |
| **Cl0p**           | 2019         | Selective       | Zero-day exploitation campaigns     |

### Independent Groups

| Group        | Active Since | Notable TTPs                 | Targeting                       |
| ------------ | ------------ | ---------------------------- | ------------------------------- |
| **Conti**    | 2020         | Rapid encryption, data theft | Healthcare, manufacturing       |
| **REvil**    | 2019         | Supply chain attacks         | High-profile, large ransoms     |
| **DarkSide** | 2020         | Double extortion             | Energy, critical infrastructure |

## Attribution Confidence Levels

### HIGH Confidence

**Criteria**:

- Multiple Tier 1/2 sources (CISA + Microsoft TI, etc.)
- Technical indicators (malware, infrastructure, TTPs)
- Government attribution statements

**Example**:

> APT28 exploiting CVE-2025-55182 - HIGH confidence
> Sources: CISA Alert, Microsoft TI, Unit 42 reports

### MEDIUM Confidence

**Criteria**:

- Single Tier 2 source OR multiple Tier 3 sources
- TTPs consistent with known group
- Limited technical indicators

**Example**:

> APT41 likely behind CVE-2024-12345 campaign - MEDIUM confidence
> Source: Single vendor report, TTP analysis

### LOW Confidence

**Criteria**:

- Only Tier 3 sources (researcher blogs)
- Speculation without technical evidence
- TTPs generic/shared

**Example**:

> Possible Chinese APT involvement - LOW confidence
> Source: Security researcher hypothesis

## Threat Actor Types

### Nation-State Characteristics

**Persistence**: Long-term access, stealth over speed
**Sophistication**: Custom malware, zero-days
**Motivation**: Espionage, geopolitical objectives
**Targeting**: Specific sectors/organizations

### Ransomware Characteristics

**Speed**: Rapid encryption, short dwell time
**Sophistication**: Varies (commodity to advanced)
**Motivation**: Financial gain
**Targeting**: Opportunistic OR targeted

### Opportunistic Characteristics

**Speed**: Exploitation as soon as public PoC available
**Sophistication**: Low (script kiddies to automated bots)
**Motivation**: Varies (financial, disruption, botnet growth)
**Targeting**: Mass scanning, indiscriminate

## MITRE ATT&CK Mapping

When attributing to threat actors, reference MITRE ATT&CK group profiles:

**URL Format**: `https://attack.mitre.org/groups/{MITRE_ID}/`

**Examples**:

- APT28: https://attack.mitre.org/groups/G0007/
- LockBit: https://attack.mitre.org/software/S0654/

## Attribution Sources

### Tier 1 (Official)

- CISA Advisories
- FBI/DHS Joint Alerts
- Government attribution statements

### Tier 2 (Vendor Threat Intelligence)

- Microsoft Threat Intelligence Center
- Mandiant/Google TAG
- CrowdStrike Intelligence
- Unit 42 (Palo Alto Networks)
- Arctic Wolf Labs
- Wiz Security Research
- Recorded Future

### Tier 3 (Community)

- Security researcher blogs
- Twitter/X security community
- Conference presentations
- Independent analysis

## Multi-Actor Scenarios

**Convergence Pattern**: Multiple groups exploit same vulnerability

**Example**:

> CVE-2024-XXXXX exploited by:
>
> - APT28 (Jan 1, 2025) - First mover, sophisticated targeting
> - LockBit 3.0 (Jan 5, 2025) - Opportunistic exploitation
> - Mass scanning (Jan 10+) - Automated exploitation

**Implication**: High-value target, easy exploitation, broad threat landscape

## Related References

- [Attribution Research Methodology](attribution-research-methodology.md) - How to gather attribution data
- [Prioritization Algorithm](prioritization-algorithm.md) - How attribution affects priority scoring

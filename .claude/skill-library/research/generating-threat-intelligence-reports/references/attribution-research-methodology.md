# Attribution Research Methodology

**Comprehensive guide for enriching CISA KEV data with threat actor attribution from public sources.**

---

## Priority Sources

Target these authoritative sources for attribution:

### Tier 1 (Official)
- CISA advisories and alerts
- US-CERT notifications
- CISA KEV "Notes" field (already captured in Phase 1)

### Tier 2 (Vendor Threat Intelligence)
- Unit 42 (Palo Alto Networks)
- Mandiant/Google TAG
- Microsoft Threat Intelligence Center
- CrowdStrike Intelligence
- Arctic Wolf Labs
- Wiz Security Research
- Recorded Future

### Tier 3 (Community)
- Security researcher blogs
- Exploit POC repositories (GitHub)
- CVE write-ups

---

## WebSearch Query Patterns

For each CVE, execute these targeted searches:

### Query 1: Direct Attribution
```
"{CVE-ID} threat actor attribution"
```

**Purpose:** Find explicit attribution statements

**Example:**
```
"CVE-2025-55182 threat actor attribution"
```

### Query 2: Campaign Context
```
"{CVE-ID} APT ransomware campaign"
```

**Purpose:** Discover named campaigns and actor types

**Example:**
```
"CVE-2025-55182 APT ransomware campaign"
```

### Query 3: Product-Specific Exploitation
```
"{Product} {CVE-ID} exploitation {current-year}"
```

**Purpose:** Find recent exploitation reports

**Example:**
```
"React Server Components CVE-2025-55182 exploitation 2025"
```

---

## Attribution Data Extraction

For each CVE, extract and document:

| Attribution Field | What to Capture | Example |
|------------------|-----------------|---------|
| **Primary Actor** | Nation-state APT or ransomware group | APT28, LockBit 3.0 |
| **Actor Type** | Nation-state, Ransomware, Opportunistic | Nation-state |
| **Country Attribution** | If nation-state | Russia, China, North Korea, Iran |
| **Campaign Name** | If named campaign | "Winter Vivern", "Operation XYZ" |
| **Exploitation Timeline** | When exploitation first observed | "Within 48 hours of disclosure" |
| **Target Sectors** | Industries/sectors targeted | Financial, Healthcare, Government |
| **Source Citations** | URL + publication date | [Unit 42 Blog](url) - Jan 5, 2025 |

---

## Citation Format (MANDATORY)

Always cite sources for transparency and verification:

```markdown
**Attribution:** APT28 (Russia)
**Source:** Microsoft Threat Intelligence - "APT28 Exploiting React Server Components" - Jan 3, 2025
**Campaign:** Winter Vivern
**Targets:** Government agencies (US, EU)
```

**Why citations matter:**
- Enables customer verification
- Tracks attribution over time
- Supports confidence scoring
- Provides audit trail

---

## Attribution Confidence Levels

Assign confidence to each attribution based on source quality:

| Confidence | Criteria | Examples | Impact on Priority |
|------------|----------|----------|-------------------|
| **HIGH** | Multiple Tier 1/2 sources confirm | CISA + Microsoft TI both attribute to APT28 | Full weight in scoring |
| **MEDIUM** | Single Tier 2 source OR multiple Tier 3 | Only Unit 42 report OR 3+ researcher blogs | Partial weight (0.7x) |
| **LOW** | Only Tier 3 OR speculation | Single blog post, no official confirmation | Minimal weight (0.3x) |
| **UNKNOWN** | No public attribution found | No results from any tier | Flag for investigation |

### Confidence Scoring Logic

```python
if tier1_sources >= 1 and tier2_sources >= 1:
    confidence = "HIGH"
elif tier2_sources >= 1 or tier3_sources >= 3:
    confidence = "MEDIUM"
elif tier3_sources >= 1:
    confidence = "LOW"
else:
    confidence = "UNKNOWN"
```

---

## Handling Missing Attribution

If no attribution found after WebSearch:

### Option 1: Search for Exploitation Indicators

Look for:
- Public exploit POCs (GitHub, Exploit-DB)
- Scanning activity reports (Shodan, Censys)
- Honeypot data (SANS ISC)

**Query pattern:**
```
"{CVE-ID} exploit POC public"
"{CVE-ID} mass scanning activity"
```

### Option 2: Use Perplexity for Synthesis

If WebSearch results are fragmented:

```
Read(".claude/skill-library/research/researching-perplexity/SKILL.md")
```

**Query:**
"Provide comprehensive threat intelligence on {CVE-ID} including threat actor attribution, exploitation campaigns, targeted sectors, and timeline. Cite specific sources from CISA, vendor threat intelligence, and security researchers."

### Option 3: Mark as "Opportunistic"

If no specific actor identified but exploitation confirmed:

```markdown
**Attribution:** Opportunistic exploitation
**Confidence:** MEDIUM
**Evidence:** Public exploit available since {date}, scanning activity observed
**Source:** CISA KEV catalog - confirmed exploitation
```

---

## Multi-Actor Scenarios

When multiple threat actors exploit the same CVE:

### Primary + Secondary Attribution

```markdown
**Primary Actor:** APT28 (Russia) - First observed Jan 1, 2025
**Secondary Actors:**
  - LockBit 3.0 (Ransomware) - Observed Jan 5, 2025
  - Opportunistic actors - Mass exploitation Jan 10+

**Convergence:** Multiple threat groups leveraging same vulnerability indicates high value target
```

### Priority Impact

Multi-actor scenarios **increase priority**:
- Indicates valuable/easy-to-exploit vulnerability
- Wider threat landscape
- Higher likelihood of customer exposure

---

## Attribution Quality Indicators

High-quality attribution includes:

✅ **Good Attribution:**
- Specific group name (APT28, not "Russian hackers")
- Country attribution for nation-states
- Named campaign if available
- Exploitation timeline (first observed date)
- Target sectors/geographies
- Multiple source citations (Tier 1 + Tier 2)

❌ **Poor Attribution:**
- Vague ("hackers", "bad actors")
- No source citations
- Speculation without evidence
- Outdated information (>6 months old for active threats)
- Single low-tier source

---

## Special Cases

### Zero-Day Attribution

If CVE was a zero-day:

```markdown
**Attribution:** APT41 (China)
**Exploitation Type:** Zero-day (exploited before public disclosure)
**Timeline:**
  - First exploitation: Dec 2024 (estimated from forensics)
  - Public disclosure: Jan 15, 2025
  - KEV addition: Jan 20, 2025
**Implication:** Sophisticated actor with vulnerability research capability
```

### Supply Chain Attacks

If CVE used in supply chain compromise:

```markdown
**Attribution:** APT29 (Russia)
**Attack Vector:** Supply chain - compromised software update
**Downstream Impact:** 18,000+ organizations affected
**Notable:** SolarWinds-style campaign, high sophistication
```

### Ransomware-as-a-Service

If ransomware affiliate model:

```markdown
**Attribution:** LockBit 3.0 (RaaS)
**Operator Model:** Multiple affiliates using same tools/infrastructure
**Implication:** Attribution to "LockBit" represents multiple independent threat actors
```

---

## Time Efficiency

Expected time per CVE:
- **WebSearch (3 queries):** 1-2 minutes
- **Parse results:** 2-3 minutes
- **Document attribution:** 1-2 minutes
- **Total per CVE:** 4-7 minutes

For 5 CVEs: 20-35 minutes total attribution research

**Optimization:** Run searches in parallel if processing multiple CVEs.

---

## Common Pitfalls

| Pitfall | Why It's Wrong | Solution |
|---------|----------------|----------|
| Using old attribution | Actors change TTPs over time | Filter results to past 90 days |
| Trusting Tier 3 only | Low confidence, may be speculation | Require Tier 2 confirmation |
| Skipping citations | Cannot verify, low trust | Always cite primary sources |
| Generic attribution | "Hackers" not actionable | Find specific group names |
| No confidence level | All attribution treated equally | Apply confidence scoring |

---

## Output Format

For each CVE, produce attribution card:

```markdown
### CVE-{ID} Attribution

**Threat Actor:** {Primary Actor Name} ({Country if nation-state})
**Actor Type:** {Nation-state/Ransomware/Opportunistic}
**Confidence:** {HIGH/MEDIUM/LOW}
**Campaign:** {Name if known, else "Unnamed"}
**First Observed:** {Date}
**Target Sectors:** {Comma-separated list}
**Target Geographies:** {Countries/regions}

**Evidence:**
1. [{Source 1 Name}]({URL}) - {Date} - "{Relevant Quote}"
2. [{Source 2 Name}]({URL}) - {Date} - "{Relevant Quote}"

**Implication:** {1-2 sentences on why this matters for customers}
```

---

## Related References

- [Threat Actor Attribution](threat-actor-attribution.md) - APT/ransomware group tracking
- [Prioritization Algorithm](prioritization-algorithm.md) - How attribution impacts priority scoring
- [Report Format Specifications](report-format-specifications.md) - How to present attribution in final report

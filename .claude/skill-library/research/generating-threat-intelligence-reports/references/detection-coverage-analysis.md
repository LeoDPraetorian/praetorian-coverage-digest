# Detection Coverage Analysis

**Methodology for determining Chariot's detection capabilities via nuclei template correlation.**

**Research Source**: Based on ProjectDiscovery nuclei-templates ecosystem analysis (2026 research findings).

---

## Nuclei Ecosystem Overview

### Template Repository Statistics (2026)

**Official Repository**: `https://github.com/projectdiscovery/nuclei-templates`

| Metric                     | Count     | Notes                                                 |
| -------------------------- | --------- | ----------------------------------------------------- |
| **Total CVE Templates**    | 2,456+    | Covering vulnerabilities from 1999-2026               |
| **Template Categories**    | 50+       | CVEs, exposed panels, misconfigurations, technologies |
| **Community Contributors** | 1,000+    | Global security researchers                           |
| **Template Growth Rate**   | ~500/year | Accelerating with AI assistance                       |
| **Detection Efficacy**     | 100%      | In controlled testing environments                    |

**Praetorian Custom Repository**: `https://github.com/praetorian-inc/nuclei-templates`

| Metric               | Count                                   | Notes                         |
| -------------------- | --------------------------------------- | ----------------------------- |
| **Custom Templates** | Proprietary                             | Chariot-specific capabilities |
| **Directory**        | `/modules/nuclei-templates/praetorian/` | Local codebase                |
| **Categories**       | CVEs, panels, misconfigs, tech stack    | Organized by type             |
| **Quality Gates**    | Verified flag, case-reviewed tag        | Production readiness          |

---

## Template Search Methodology

### Phase 1: Repository Location

**Primary location**: `/tmp/nuclei-templates` (if cloned during workflow)
**Fallback**: Clone from GitHub

```bash
if [ ! -d "/tmp/nuclei-templates" ]; then
  git clone https://github.com/praetorian-inc/nuclei-templates.git /tmp/nuclei-templates
fi
```

### Phase 2: CVE Pattern Search

For each CVE-ID from KEV research:

```bash
grep -r "CVE-YYYY-NNNNN" /tmp/nuclei-templates \
  --include="*.yaml" --include="*.yml" \
  -l  # List files only (not match content)
```

**Template locations to check**:

- `/tmp/nuclei-templates/http/cves/YYYY/`
- `/tmp/nuclei-templates/praetorian/cves/YYYY/`
- `/tmp/nuclei-templates/network/cves/`
- `/tmp/nuclei-templates/file/cves/`

**Multiple templates possible**:

- Community template (http/cves/)
- Praetorian custom template (praetorian/cves/)
- Pre-requisite template (CVE-YYYY-NNNNN-pre-req.yaml)

### Phase 3: Template Metadata Extraction

When template found, read first 50 lines for metadata:

```bash
head -n 50 /tmp/nuclei-templates/path/to/CVE-YYYY-NNNNN.yaml
```

**Extract**:

- **id**: CVE identifier
- **info.name**: Vulnerability description
- **info.severity**: critical/high/medium/low
- **info.tags**: cve, cve202X, product-name, vuln-type
- **info.metadata.verified**: true/false (production-ready indicator)
- **info.metadata.praetorian**: Custom Chariot metadata

**Example Metadata**:

```yaml
id: CVE-2025-55182
info:
  name: React Server Components / Next.js - Remote Code Execution
  severity: critical
  metadata:
    verified: true
    max-request: 1
    praetorian:
      attributes:
        technology: React Server Components
        cpe: cpe:2.3:a:react-server-components:react-server-components:*:*:*:*:*:*:*:*
  tags: cve,cve2025,react,nextjs,rce,rsc,server-components,vuln,case-reviewed
```

---

## Coverage Status Classification

### Status: COVERED

**Criteria**: Template exists and meets quality standards

**Quality indicators**:

- ✅ Template found in repository
- ✅ `metadata.verified: true` (production-ready)
- ✅ Tags include `case-reviewed` (human validated)
- ✅ Located in `praetorian/` directory OR verified in community templates

**Customer Impact**: Chariot can detect this vulnerability

**Example**:

```markdown
**CVE-2025-55182: COVERED**

- Template: `/praetorian/cves/2025/CVE-2025-55182.yaml`
- Verified: Yes
- Status: Actively monitored by Chariot
- Detection Method: HTTP request probing with RSC payloads
```

### Status: PARTIAL

**Criteria**: Template exists but has limitations

**Limitation types**:

1. **Scope limitation**: Only detects specific product versions
   - Template targets Apache 2.4.x, but CVE affects 2.2.x-2.4.x
2. **Conditional detection**: Requires specific configuration
   - Only detects if debug mode enabled
3. **Unverified template**: `metadata.verified: false`
   - Community template not yet validated for production
4. **Pre-requisite required**: Needs CVE-YYYY-NNNNN-pre-req.yaml
   - Multi-stage exploitation, template tests final stage only

**Customer Impact**: Chariot can detect some instances, but may miss variants

**Example**:

```markdown
**CVE-2024-12345: PARTIAL**

- Template: `/http/cves/2024/CVE-2024-12345.yaml`
- Limitation: Only detects Apache 2.4.x (CVE affects 2.2.x-2.4.x)
- Verified: No (community template, not case-reviewed)
- Recommendation: Validate against customer environment before relying on detection
```

### Status: GAP

**Criteria**: No template found

**Detection methods checked**:

- ✅ Community templates (projectdiscovery/nuclei-templates)
- ✅ Praetorian custom templates
- ✅ AI-generated templates (nuclei-templates-ai) - **NOT PRODUCTION-READY**

**Customer Impact**: Chariot CANNOT detect this vulnerability

**Example**:

```markdown
**CVE-2025-77777: GAP**

- Template Search: None found in praetorian/ or http/cves/
- AI Template: Available in nuclei-templates-ai (NOT VERIFIED)
- Status: **Blind spot** - Chariot cannot detect exploitation
- Recommendation: High-priority template development (estimated 2-4 hours)
- Business Impact: HIGH if product is present in customer environment
```

---

## AI-Generated Templates (USE WITH CAUTION)

### ProjectDiscoveryAI Repository

**Repository**: `nuclei-templates-ai` (separate from main templates)

**Purpose**: Rapid template generation for newly disclosed CVEs

**Characteristics**:

- **Speed**: Automated CVE → Template conversion (minutes instead of hours/days)
- **Coverage**: Attempts to cover CVEs quickly after disclosure
- **Quality**: ⚠️ **NOT VERIFIED - DO NOT USE IN PRODUCTION**

**Critical Limitation**:
AI templates require human review before production use. False positives could cause:

- Business disruption (blocking legitimate traffic)
- Alert fatigue (SOC drowning in false alarms)
- Customer trust erosion

**Appropriate Use Cases**:

- ✅ Research and testing environments
- ✅ Initial prototype for template development
- ✅ Proof-of-concept demonstrations
- ❌ Production security monitoring
- ❌ Customer-facing detection

**Detection Coverage Status**: AI templates count as **GAP** until human-verified.

---

## Template Quality Indicators

### Verification Levels

| Level             | Indicator                                | Confidence | Use                         |
| ----------------- | ---------------------------------------- | ---------- | --------------------------- |
| **Verified**      | `metadata.verified: true`                | HIGH       | Production deployment       |
| **Case-Reviewed** | Tag includes `case-reviewed`             | HIGH       | Praetorian human validation |
| **Community**     | Community template without verified flag | MEDIUM     | Test before production      |
| **AI-Generated**  | From nuclei-templates-ai repo            | LOW        | Research only               |

### False Positive Risk

**Research Finding**: Continuous improvement efforts reducing false positives in nuclei

**Quality assurance process**:

1. Community pull request reviews
2. Maintainer validation before merging
3. Regular cleanup of reported false positives
4. Testing against nuclei-templates-labs vulnerable environments

**For production deployment**:

- Prefer `verified: true` templates
- Test new templates in staging environment
- Monitor false positive rates in production
- Report issues back to community/maintainer

---

## Detection Method Analysis

### Template Types by Attack Vector

| Detection Method  | Example CVE                    | Template Approach                                    |
| ----------------- | ------------------------------ | ---------------------------------------------------- |
| **HTTP-based**    | CVE-2025-55182 (React RCE)     | HTTP request with malicious payloads, parse response |
| **Network-based** | CVE-2024-XXXXX (SSH vuln)      | Network protocol probing, version detection          |
| **File-based**    | CVE-2024-YYYYY (Local config)  | File system checks, permission analysis              |
| **DNS-based**     | CVE-2024-ZZZZZ (DNS rebinding) | DNS query/response analysis                          |

**Most common**: HTTP-based (80%+ of CVE templates)

### Matcher Types

Templates use various matchers to identify vulnerabilities:

| Matcher    | Purpose                     | Example                                         |
| ---------- | --------------------------- | ----------------------------------------------- |
| **word**   | String presence in response | Match "vulnerable version" in body              |
| **regex**  | Pattern matching            | Match version number format                     |
| **status** | HTTP status code            | 500 error indicates exploitation success        |
| **dsl**    | Complex logic expressions   | `contains(body, 'error') && status_code == 500` |

**Coverage implication**: Complex matchers (DSL) reduce false positives but may increase false negatives if too specific.

---

## Reporting Detection Coverage

### For Customer-Facing Reports

**Format for COVERED status**:

```markdown
✅ **Chariot Can Detect**

- Nuclei template: Verified and production-ready
- Detection method: HTTP request probing
- Confidence: HIGH
```

**Format for PARTIAL status**:

```markdown
⚠️ **Chariot Can Partially Detect**

- Nuclei template: Available but unverified
- Limitation: Only detects specific product versions
- Recommendation: Validate in customer environment
- Confidence: MEDIUM
```

**Format for GAP status**:

```markdown
❌ **Chariot Cannot Detect (Blind Spot)**

- No verified nuclei template available
- Impact: Customers vulnerable without detection
- Recommendation: High-priority template development
- Estimated effort: 2-4 hours for template creation
- Business priority: HIGH (if product present in environment)
```

### Capability Development Prioritization

**When detection gaps identified**:

1. **Assess customer exposure**:
   - Is affected product present in customer environments?
   - How many customers affected?

2. **Evaluate threat severity**:
   - Nation-state attribution? → P0
   - Ransomware campaign? → P1
   - Opportunistic? → P2

3. **Estimate template development effort**:
   - Simple HTTP endpoint test? → 2-4 hours
   - Complex multi-stage exploitation? → 1-2 days
   - Network protocol analysis? → 2-5 days

4. **Prioritize**:
   ```
   Priority = (Customer Exposure × Threat Severity) / Development Effort
   ```

**Output**: Ranked list of detection gaps requiring template development

---

## Integration with Chariot Platform

### Janus Framework Integration

**Template Directory**: `modules/nuclei-templates/praetorian/`

**Orchestration**: Janus chains nuclei with other security tools:

```
Asset Discovery → Port Scanning → Service Detection →
Nuclei Template Execution → Result Storage (Neo4j) →
Customer Notification
```

**Quality Gates** (before production deployment):

1. ✅ Template has `verified: true` flag
2. ✅ Tags include `case-reviewed`
3. ✅ Tested against nuclei-templates-labs
4. ✅ False positive rate < 1%
5. ✅ Severity classification aligns with CVSS

**Development Skill Available**:
`.claude/skill-library/development/capabilities/writing-nuclei-signatures/`

---

## Search Performance

**Benchmark** (2026 research):

- **Repository size**: 12,626 files
- **Search time**: <5 seconds for 5 CVEs (grep across all templates)
- **Bottleneck**: Network clone (one-time, ~30 seconds)

**Optimization**:

```bash
# Cache clone for multiple reports
if [ ! -d "/tmp/nuclei-templates" ]; then
  git clone --depth 1 https://github.com/praetorian-inc/nuclei-templates.git /tmp/nuclei-templates
fi

# Shallow clone saves time: --depth 1 (only latest commit)
```

---

## Common Pitfalls

| Pitfall                           | Why It's Wrong                                      | Solution                                     |
| --------------------------------- | --------------------------------------------------- | -------------------------------------------- |
| **Assume AI template = COVERED**  | AI templates not verified, high false positive risk | Mark as GAP until human-verified             |
| **Only search http/cves/**        | Templates may be in network/, file/, praetorian/    | Search entire repository                     |
| **Ignore `verified: false`**      | Unverified templates may not work in production     | Flag as PARTIAL, test before deploying       |
| **Don't check pre-req templates** | Multi-stage exploits require prerequisite checks    | Look for `-pre-req.yaml` variants            |
| **Skip metadata extraction**      | Miss important context (scope, limitations)         | Read first 50 lines of template for metadata |

---

## Related References

- [Nuclei Template Locations](nuclei-template-locations.md) - Repository structure and search patterns
- [Prioritization Algorithm](prioritization-algorithm.md) - How detection coverage impacts priority scoring
- [Report Format Specifications](report-format-specifications.md) - How to present detection status in reports

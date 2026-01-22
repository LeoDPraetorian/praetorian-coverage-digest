# Nuclei Template Locations

**Repository structure and search patterns for nuclei template discovery.**

## Official Repository

**Primary Source**: `https://github.com/projectdiscovery/nuclei-templates`

**Key Directories**:

- `/http/cves/YYYY/` - HTTP-based CVE templates by year
- `/network/cves/` - Network protocol CVE templates
- `/file/cves/` - File-based CVE templates
- `/dns/cves/` - DNS-based CVE templates

## Praetorian Custom Repository

**Source**: `https://github.com/praetorian-inc/nuclei-templates`

**Key Directories**:

- `/praetorian/cves/YYYY/` - Custom CVE templates
- `/praetorian/exposed-panels/` - Panel detection templates
- `/praetorian/misconfigurations/` - Configuration issue templates
- `/praetorian/technologies/` - Technology stack detection

**Local Path**: `/modules/nuclei-templates/` (within chariot-development-platform)

## Template Naming Conventions

**Standard Format**:

```
CVE-YYYY-NNNNN.yaml
```

**Pre-requisite Templates**:

```
CVE-YYYY-NNNNN-pre-req.yaml
```

**Multi-variant Templates**:

```
CVE-YYYY-NNNNN-v1.yaml
CVE-YYYY-NNNNN-v2.yaml
```

## Search Patterns

### Finding CVE Templates

```bash
# Clone repository (if not already cloned)
git clone https://github.com/praetorian-inc/nuclei-templates.git /tmp/nuclei-templates

# Search for specific CVE
grep -r "CVE-YYYY-NNNNN" /tmp/nuclei-templates --include="*.yaml" --include="*.yml" -l

# Search multiple directories
find /tmp/nuclei-templates/{http,network,file,praetorian}/cves -name "*CVE-YYYY-NNNNN*" -type f
```

### Template Metadata Extraction

```bash
# Read template header for metadata
head -n 50 /tmp/nuclei-templates/path/to/CVE-YYYY-NNNNN.yaml
```

**Extract**:

- `id`: CVE identifier
- `info.name`: Vulnerability description
- `info.severity`: critical/high/medium/low
- `info.metadata.verified`: true/false
- `info.tags`: CVE tags and categories

## Template Quality Indicators

| Indicator                   | Meaning                 | Trust Level |
| --------------------------- | ----------------------- | ----------- |
| **metadata.verified: true** | Production-ready        | HIGH        |
| **tags: case-reviewed**     | Human validated         | HIGH        |
| **praetorian/ directory**   | Custom Chariot template | HIGH        |
| **http/cves/ community**    | Community template      | MEDIUM      |
| **No verified flag**        | Unverified              | LOW         |

## Repository Statistics (2026)

| Repository       | Total Templates | CVE Templates | Update Frequency |
| ---------------- | --------------- | ------------- | ---------------- |
| ProjectDiscovery | 12,626          | 2,456+        | Daily            |
| Praetorian       | Proprietary     | Custom        | As needed        |

## Related References

- [Detection Coverage Analysis](detection-coverage-analysis.md) - How to interpret template search results
- [Prioritization Algorithm](prioritization-algorithm.md) - How detection coverage affects priority scoring

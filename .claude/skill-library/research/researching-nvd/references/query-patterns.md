# NVD API Query Patterns

**NVD API v2.0 query construction and CPE syntax guide.**

## NVD API v2.0 Basics

**Base URL:** `https://services.nvd.nist.gov/rest/json/cves/2.0`

**Response Format:** JSON

**Rate Limits:**

- Without API key: 5 requests per 30 seconds
- With API key: 50 requests per 30 seconds
- **Implementation:** Add 7-second delays between requests if no key

## Core Query Parameters

### keywordSearch

**Purpose:** Full-text search across CVE descriptions

**Format:** `?keywordSearch={URL_ENCODED_QUERY}`

**Examples:**

```
?keywordSearch=apache
?keywordSearch=remote+code+execution
?keywordSearch=tomcat
```

**Use Case:** Vendor/product general search

### cveId

**Purpose:** Lookup specific CVE by ID

**Format:** `?cveId={CVE-YYYY-NNNNN}`

**Examples:**

```
?cveId=CVE-2024-38475
?cveId=CVE-2023-12345
```

**Use Case:** Direct CVE investigation

### cvssV3Severity

**Purpose:** Filter by CVSS v3.x severity level

**Format:** `?cvssV3Severity={LEVEL}`

**Values:** `CRITICAL`, `HIGH`, `MEDIUM`, `LOW`

**Examples:**

```
?keywordSearch=apache&cvssV3Severity=CRITICAL
?keywordSearch=tomcat&cvssV3Severity=HIGH
```

**Use Case:** Severity-based prioritization

### cpeName

**Purpose:** Search by Common Platform Enumeration (affected product)

**Format:** `?cpeName={CPE_2.3_STRING}`

**Examples:**

```
?cpeName=cpe:2.3:a:apache:tomcat:9.0.50:*:*:*:*:*:*:*
?cpeName=cpe:2.3:a:microsoft:windows_10:*:*:*:*:*:*:*:*
```

**Use Case:** Precise product/version matching

### pubStartDate / pubEndDate

**Purpose:** Filter by publication date range

**Format:** `?pubStartDate={YYYY-MM-DDTHH:MM:SS}&pubEndDate={YYYY-MM-DDTHH:MM:SS}`

**Examples:**

```
?pubStartDate=2024-01-01T00:00:00&pubEndDate=2024-12-31T23:59:59
?pubStartDate=2024-06-01T00:00:00  (start date only - to present)
```

**Use Case:** Recent vulnerability research, timeline analysis

### resultsPerPage

**Purpose:** Pagination control

**Format:** `?resultsPerPage={1-2000}`

**Default:** 2000

**Examples:**

```
?keywordSearch=apache&resultsPerPage=50
```

**Use Case:** Limit large result sets

## CPE 2.3 Syntax

### Structure

```
cpe:2.3:part:vendor:product:version:update:edition:language:sw_edition:target_sw:target_hw:other
```

### Components

| Field        | Description                     | Example   |
| ------------ | ------------------------------- | --------- |
| `part`       | a (application), o (OS), h (HW) | `a`       |
| `vendor`     | Vendor name                     | `apache`  |
| `product`    | Product name                    | `tomcat`  |
| `version`    | Version number                  | `9.0.50`  |
| `update`     | Update/patch level              | `*` (any) |
| `edition`    | Edition (enterprise, etc.)      | `*`       |
| `language`   | Language                        | `*`       |
| `sw_edition` | Software edition                | `*`       |
| `target_sw`  | Target software platform        | `*`       |
| `target_hw`  | Target hardware platform        | `*`       |
| `other`      | Other                           | `*`       |

### Wildcards

- `*` = Any value
- `-` = Not Applicable (N/A)

### Example CPE Strings

**Apache Tomcat 9.0.50:**

```
cpe:2.3:a:apache:tomcat:9.0.50:*:*:*:*:*:*:*
```

**Microsoft Windows 10 (any version):**

```
cpe:2.3:o:microsoft:windows_10:*:*:*:*:*:*:*:*
```

**Cisco IOS 15.2(4):**

```
cpe:2.3:o:cisco:ios:15.2\(4\):*:*:*:*:*:*:*
```

**Note:** Special characters must be escaped with `\` in URLs

## Query Patterns by Use Case

### Pattern 1: Vendor Vulnerability Research

**Goal:** Find all CVEs for a vendor

```
https://services.nvd.nist.gov/rest/json/cves/2.0?keywordSearch=microsoft&resultsPerPage=100
```

### Pattern 2: Critical Severity Filter

**Goal:** Only CRITICAL vulnerabilities for a product

```
https://services.nvd.nist.gov/rest/json/cves/2.0?keywordSearch=apache&cvssV3Severity=CRITICAL
```

### Pattern 3: CPE-Based Product Match

**Goal:** Exact product/version vulnerabilities

```
https://services.nvd.nist.gov/rest/json/cves/2.0?cpeName=cpe:2.3:a:apache:tomcat:9.0.50:*:*:*:*:*:*:*
```

### Pattern 4: Recent Vulnerabilities (Last 30 Days)

**Goal:** Newly published CVEs

```
# Calculate date 30 days ago
START_DATE=$(date -v-30d +"%Y-%m-%dT00:00:00")  # macOS
# START_DATE=$(date -d "30 days ago" +"%Y-%m-%dT00:00:00")  # Linux

https://services.nvd.nist.gov/rest/json/cves/2.0?pubStartDate=${START_DATE}
```

### Pattern 5: Specific CVE Lookup

**Goal:** Complete details for known CVE

```
https://services.nvd.nist.gov/rest/json/cves/2.0?cveId=CVE-2024-1234
```

### Pattern 6: Combined Filters

**Goal:** Multiple criteria

```
https://services.nvd.nist.gov/rest/json/cves/2.0?keywordSearch=tomcat&cvssV3Severity=HIGH&pubStartDate=2024-01-01T00:00:00
```

## URL Encoding

Special characters must be URL-encoded:

| Character | Encoded      | Example                 |
| --------- | ------------ | ----------------------- |
| Space     | `+` or `%20` | `remote+code+execution` |
| :         | `%3A`        | `cpe%3A2.3%3A...`       |
| /         | `%2F`        | N/A in NVD              |
| (         | `%28`        | `15.2%284%29`           |
| )         | `%29`        | `15.2%284%29`           |

## Response Structure

**JSON Format:**

```json
{
  "resultsPerPage": 20,
  "startIndex": 0,
  "totalResults": 1234,
  "format": "NVD_CVE",
  "version": "2.0",
  "timestamp": "2024-01-08T12:00:00.000",
  "vulnerabilities": [
    {
      "cve": {
        "id": "CVE-2024-1234",
        "sourceIdentifier": "cve@mitre.org",
        "published": "2024-01-01T00:00:00.000",
        "lastModified": "2024-01-08T00:00:00.000",
        "vulnStatus": "Analyzed",
        "descriptions": [
          {
            "lang": "en",
            "value": "Vulnerability description..."
          }
        ],
        "metrics": {
          "cvssMetricV31": [
            {
              "source": "nvd@nist.gov",
              "type": "Primary",
              "cvssData": {
                "version": "3.1",
                "vectorString": "CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:H/A:H",
                "attackVector": "NETWORK",
                "attackComplexity": "LOW",
                "privilegesRequired": "NONE",
                "userInteraction": "NONE",
                "scope": "UNCHANGED",
                "confidentialityImpact": "HIGH",
                "integrityImpact": "HIGH",
                "availabilityImpact": "HIGH",
                "baseScore": 9.8,
                "baseSeverity": "CRITICAL"
              }
            }
          ]
        },
        "weaknesses": [
          {
            "source": "nvd@nist.gov",
            "type": "Primary",
            "description": [
              {
                "lang": "en",
                "value": "CWE-79"
              }
            ]
          }
        ],
        "configurations": [
          {
            "nodes": [
              {
                "operator": "OR",
                "cpeMatch": [
                  {
                    "vulnerable": true,
                    "criteria": "cpe:2.3:a:apache:tomcat:9.0.50:*:*:*:*:*:*:*",
                    "matchCriteriaId": "..."
                  }
                ]
              }
            ]
          }
        ],
        "references": [
          {
            "url": "https://vendor.com/advisory",
            "source": "cve@mitre.org",
            "tags": ["Vendor Advisory", "Patch"]
          }
        ]
      }
    }
  ]
}
```

## Rate Limiting Best Practices

### Without API Key (5 req/30s)

```bash
# Query 1
WebFetch("https://services.nvd.nist.gov/rest/json/cves/2.0?keywordSearch=apache", ...)

# Wait 7 seconds
sleep 7

# Query 2
WebFetch("https://services.nvd.nist.gov/rest/json/cves/2.0?keywordSearch=tomcat", ...)

# Wait 7 seconds
sleep 7

# Query 3
WebFetch("https://services.nvd.nist.gov/rest/json/cves/2.0?cveId=CVE-2024-1234", ...)
```

### With API Key (50 req/30s)

```bash
# Add header: apiKey: {YOUR_API_KEY}
# Can make 50 requests per 30 seconds
# Still recommended: 1-2 second delays between requests
```

## Error Handling

**Common Errors:**

| HTTP Status | Meaning             | Solution               |
| ----------- | ------------------- | ---------------------- |
| 403         | Rate limit exceeded | Wait 30 seconds, retry |
| 404         | CVE not found       | Verify CVE ID format   |
| 400         | Invalid parameter   | Check query syntax     |
| 503         | Service unavailable | Retry after delay      |

## Related References

- [CVSS Interpretation](cvss-interpretation.md) - Understanding scores and vectors
- [CPE Syntax](cpe-syntax.md) - Detailed CPE 2.3 guide
- [Output Format](output-format.md) - Structured result templates

# Query Patterns for CISA KEV Catalog

**Product/vendor search strategies and query formulation patterns.**

## Query Construction Strategies

### Pattern 1: Vendor-Specific Search

Target vulnerabilities from specific software vendors:

```
Query Format: {vendor-name}
Examples:
- apache
- microsoft
- cisco
- oracle
- vmware
- fortinet
```

**When to use:** Vulnerability research for specific vendors in your environment.

**URL Format:**
```
https://www.cisa.gov/known-exploited-vulnerabilities-catalog?search_api_fulltext=apache&field_date_added_wrapper=all&sort_by=field_date_added&items_per_page=20
```

### Pattern 2: Product Type Search

Search by technology category or product type:

```
Query Format: {product-category}
Examples:
- web server
- VPN
- firewall
- CMS
- authentication
- database
- email server
```

**When to use:** Identifying vulnerabilities across similar technology classes.

**URL Format:**
```
https://www.cisa.gov/known-exploited-vulnerabilities-catalog?search_api_fulltext=web+server&field_date_added_wrapper=all&sort_by=field_date_added&items_per_page=20
```

### Pattern 3: Vulnerability Class Search

Search by attack vector or vulnerability type:

```
Query Format: {vulnerability-type}
Examples:
- remote code execution
- RCE
- authentication bypass
- SQL injection
- privilege escalation
- directory traversal
- cross-site scripting
```

**When to use:** Understanding exploitation patterns for specific attack classes.

**URL Format:**
```
https://www.cisa.gov/known-exploited-vulnerabilities-catalog?search_api_fulltext=remote+code+execution&field_date_added_wrapper=90&items_per_page=50
```

### Pattern 4: Specific CVE Lookup

Direct CVE ID search:

```
Query Format: CVE-YYYY-NNNNN
Examples:
- CVE-2024-1234
- CVE-2023-98765
```

**When to use:** Validating if a known CVE is in the KEV catalog.

**URL Format:**
```
https://www.cisa.gov/known-exploited-vulnerabilities-catalog?field_cve=CVE-2024-1234
```

### Pattern 5: Technology Stack Search

Search by programming language or framework:

```
Query Format: {technology}
Examples:
- java
- php
- python
- .net
- node.js
- ruby
```

**When to use:** Stack-specific vulnerability research.

## Date Filtering Strategies

### Recent Threats (Last 30 Days)

**Use Case:** Emerging exploitation campaigns

```
field_date_added_wrapper=30
```

**Rationale:** Identifies CVEs added to KEV in the last month, indicating active/new exploitation.

### Quarterly Review (Last 90 Days)

**Use Case:** Regular vulnerability intelligence updates

```
field_date_added_wrapper=90
```

**Rationale:** Standard review cycle for threat intelligence teams.

### All-Time Search

**Use Case:** Comprehensive research, historical analysis

```
field_date_added_wrapper=all
```

**Rationale:** Full KEV catalog search (2021-present).

## Query Combination Patterns

### Multi-Word Searches

Use `+` for space-separated terms:

```
remote+code+execution
authentication+bypass
SQL+injection
```

### Compound Searches

Combine vendor + product:

```
apache+tomcat
microsoft+exchange
cisco+vpn
```

### Vulnerability Type + Vendor

```
RCE+apache
authentication+bypass+fortinet
privilege+escalation+windows
```

## Pagination Strategy

### Standard Results (20 per page)

```
items_per_page=20
```

**Use Case:** Initial research, manageable result sets.

### Medium Results (50 per page)

```
items_per_page=50
```

**Use Case:** Vendor-specific research with expected moderate results.

### Large Results (100 per page)

```
items_per_page=100
```

**Use Case:** Comprehensive searches, broad vulnerability classes.

## Query Refinement

### If Too Many Results (>50)

1. Add date filter: `field_date_added_wrapper=30|60|90`
2. Make query more specific: `web server` → `apache web server`
3. Reduce items per page: `items_per_page=20`

### If Too Few Results (<5)

1. Remove date filter: Use `field_date_added_wrapper=all`
2. Broaden query: `apache tomcat` → `apache`
3. Try synonyms: `RCE` vs `remote code execution`
4. Increase items per page: `items_per_page=50`

## Common Query Templates by Use Case

### Capability Development

**Goal:** Find exploitation patterns for detection rules

```
Query 1: {vulnerability-class} + {field_date_added_wrapper=90}
Query 2: {vendor} + {product}
Query 3: {technology-stack}
```

### Compliance Reporting

**Goal:** Track remediation deadlines

```
Query 1: {vendor} + {field_date_added_wrapper=all}
Query 2: Sort by: field_date_added (newest first)
Query 3: Extract: Due Date field for all results
```

### Threat Intelligence

**Goal:** Identify active campaigns

```
Query 1: {field_date_added_wrapper=30} (recent threats)
Query 2: {vulnerability-class} + recent filter
Query 3: Extract: Notes field for exploitation context
```

### Patch Prioritization

**Goal:** Prioritize based on KEV inclusion

```
Query 1: {vendor} + {products-in-environment}
Query 2: Sort by: Due Date (most urgent first)
Query 3: Cross-reference with asset inventory
```

## URL Encoding

Special characters must be URL-encoded:

| Character | Encoded |
| --------- | ------- |
| Space     | `+` or `%20` |
| /         | `%2F`   |
| ?         | `%3F`   |
| &         | `%26`   |
| =         | `%3D`   |

**Examples:**
- `SQL injection` → `SQL+injection`
- `Cross-site scripting (XSS)` → `Cross-site+scripting+%28XSS%29`

## Related References

- [Remediation Analysis](remediation-analysis.md) - Interpreting federal deadlines
- [Output Format](output-format.md) - Structured result templates

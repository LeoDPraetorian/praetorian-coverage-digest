# CPE 2.3 Syntax Guide

**Common Platform Enumeration for precise product/version identification.**

## CPE Overview

**CPE (Common Platform Enumeration)** provides standardized naming for IT products.

**Current Version:** CPE 2.3 (2011-present)

**Purpose:**
- Identify affected products/versions in CVEs
- Enable automated vulnerability scanning
- Provide precise product matching

## CPE 2.3 Structure

```
cpe:2.3:part:vendor:product:version:update:edition:language:sw_edition:target_sw:target_hw:other
```

### Components Breakdown

| Position | Field        | Description                    | Example        |
| -------- | ------------ | ------------------------------ | -------------- |
| 1        | (prefix)     | Always `cpe:2.3`               | `cpe:2.3`      |
| 2        | part         | a=app, o=OS, h=hardware        | `a`            |
| 3        | vendor       | Vendor name                    | `apache`       |
| 4        | product      | Product name                   | `tomcat`       |
| 5        | version      | Version number                 | `9.0.50`       |
| 6        | update       | Update/patch level             | `*` or `-`     |
| 7        | edition      | Edition (enterprise/standard)  | `*` or `-`     |
| 8        | language     | Language (en/fr/de)            | `*` or `-`     |
| 9        | sw_edition   | Software edition               | `*` or `-`     |
| 10       | target_sw    | Target software platform       | `*` or `-`     |
| 11       | target_hw    | Target hardware platform       | `*` or `-`     |
| 12       | other        | Other                          | `*` or `-`     |

### Wildcards

- `*` = Any value (match any)
- `-` = Not Applicable (N/A, logically undefined)

**Usage:**
- `*` when field could have various values
- `-` when field is not relevant for this product

## Part Values

| Value | Meaning     | Use For                               |
| ----- | ----------- | ------------------------------------- |
| `a`   | Application | Software applications, libraries, tools |
| `o`   | OS          | Operating systems                     |
| `h`   | Hardware    | Physical devices, firmware            |

## Common Examples

### Apache Tomcat 9.0.50

```
cpe:2.3:a:apache:tomcat:9.0.50:*:*:*:*:*:*:*
```

**Breakdown:**
- `a` = Application
- `apache` = Vendor
- `tomcat` = Product
- `9.0.50` = Specific version
- All other fields = `*` (any)

### Microsoft Windows 10 (any version)

```
cpe:2.3:o:microsoft:windows_10:*:*:*:*:*:*:*:*
```

**Breakdown:**
- `o` = Operating System
- `microsoft` = Vendor
- `windows_10` = Product
- `*` = Any version

### Cisco IOS 15.2(4)

```
cpe:2.3:o:cisco:ios:15.2\(4\):*:*:*:*:*:*:*
```

**Breakdown:**
- Special characters `()` escaped with `\`
- Version includes minor/patch in parentheses

### Python 3.9.7

```
cpe:2.3:a:python:python:3.9.7:*:*:*:*:*:*:*
```

**Breakdown:**
- `a` = Application (interpreter/runtime)
- `python` = Vendor (Python Software Foundation)
- `python` = Product
- `3.9.7` = Version

### Ubuntu 20.04 LTS

```
cpe:2.3:o:canonical:ubuntu_linux:20.04:*:*:*:lts:*:*:*
```

**Breakdown:**
- Edition field = `lts` (Long Term Support)
- Shows optional field usage

## Naming Conventions

### Vendor Names

**Format:** Lowercase, underscores for spaces

- `apache` (Apache Software Foundation)
- `microsoft` (Microsoft Corporation)
- `cisco` (Cisco Systems)
- `google` (Google LLC)

### Product Names

**Format:** Lowercase, underscores for spaces

- `windows_10` (Windows 10)
- `internet_explorer` (Internet Explorer)
- `visual_studio` (Visual Studio)

### Version Numbers

**Format:** As released by vendor

- `9.0.50` (dot-separated)
- `15.2(4)` (parentheses for sub-versions)
- `v1.2.3` (with 'v' prefix if vendor uses it)

**Note:** Escape special characters with `\`

## CPE Matching

### Exact Match

```
cpe:2.3:a:apache:tomcat:9.0.50:*:*:*:*:*:*:*
```

**Matches:** Only Apache Tomcat 9.0.50 exactly

### Version Wildcard

```
cpe:2.3:a:apache:tomcat:9.0.*:*:*:*:*:*:*:*
```

**Matches:** Apache Tomcat 9.0.x (any minor version)

### Any Version

```
cpe:2.3:a:apache:tomcat:*:*:*:*:*:*:*:*
```

**Matches:** Any version of Apache Tomcat

## CPE in NVD API

### Querying by CPE

```
https://services.nvd.nist.gov/rest/json/cves/2.0?cpeName=cpe:2.3:a:apache:tomcat:9.0.50:*:*:*:*:*:*:*
```

**Returns:** All CVEs affecting Apache Tomcat 9.0.50

### CPE in JSON Response

```json
{
  "configurations": [
    {
      "nodes": [
        {
          "operator": "OR",
          "cpeMatch": [
            {
              "vulnerable": true,
              "criteria": "cpe:2.3:a:apache:tomcat:9.0.50:*:*:*:*:*:*:*",
              "matchCriteriaId": "...",
              "versionStartIncluding": "9.0.0",
              "versionEndExcluding": "9.0.51"
            }
          ]
        }
      ]
    }
  ]
}
```

**Fields:**
- `vulnerable: true` = This CPE is affected
- `versionStartIncluding` = Range start (inclusive)
- `versionEndExcluding` = Range end (exclusive)

## Version Ranges

### Inclusive Start, Exclusive End

```json
{
  "criteria": "cpe:2.3:a:apache:tomcat:*:*:*:*:*:*:*:*",
  "versionStartIncluding": "9.0.0",
  "versionEndExcluding": "9.0.51"
}
```

**Matches:** 9.0.0 ≤ version < 9.0.51

### Exclusive Start, Inclusive End

```json
{
  "criteria": "cpe:2.3:a:apache:tomcat:*:*:*:*:*:*:*:*",
  "versionStartExcluding": "8.5.0",
  "versionEndIncluding": "8.5.99"
}
```

**Matches:** 8.5.0 < version ≤ 8.5.99

## Special Characters

### Escaping

| Character | Escaped | Example Context       |
| --------- | ------- | --------------------- |
| `(`       | `\(`    | Version 15.2(4)       |
| `)`       | `\)`    | Version 15.2(4)       |
| `.`       | `.`     | Version numbers (OK)  |
| `_`       | `_`     | Product names (OK)    |

**Example:**
```
cpe:2.3:o:cisco:ios:15.2\(4\):*:*:*:*:*:*:*
```

## CPE Dictionary

**Official CPE Dictionary:** https://nvd.nist.gov/products/cpe

**Purpose:**
- Browse all CPE names
- Find correct vendor/product names
- Verify CPE format

**Example Lookup:**
1. Search for "Apache Tomcat"
2. Find official CPE: `cpe:2.3:a:apache:tomcat:...`
3. Use in NVD API queries

## Common Pitfalls

### Wrong Vendor Name

❌ `cpe:2.3:a:apache_foundation:tomcat:...`
✅ `cpe:2.3:a:apache:tomcat:...`

**Fix:** Use official vendor name from CPE Dictionary

### Wrong Product Name

❌ `cpe:2.3:a:microsoft:windows:10:...`
✅ `cpe:2.3:o:microsoft:windows_10:...`

**Fix:** Use underscore for spaces, check CPE Dictionary

### Missing Wildcards

❌ `cpe:2.3:a:apache:tomcat:9.0.50`
✅ `cpe:2.3:a:apache:tomcat:9.0.50:*:*:*:*:*:*:*`

**Fix:** Include all 12 components (use `*` for any)

### Unescaped Special Characters

❌ `cpe:2.3:o:cisco:ios:15.2(4):*:*:*:*:*:*:*`
✅ `cpe:2.3:o:cisco:ios:15.2\(4\):*:*:*:*:*:*:*`

**Fix:** Escape `()` with backslash

## Practical Usage

### Vulnerability Scanning

**Tool:** Use CPE to identify if your software is affected

```python
your_software_cpe = "cpe:2.3:a:apache:tomcat:9.0.50:*:*:*:*:*:*:*"

# Query NVD for this CPE
nvd_api_query = f"?cpeName={your_software_cpe}"

# Get CVEs affecting this version
```

### Version Comparison

**Check if version is in range:**

```python
def is_version_affected(your_version, start_including, end_excluding):
    return start_including <= your_version < end_excluding
```

## Related References

- [Query Patterns](query-patterns.md) - Using CPE in NVD API queries
- [CVSS Interpretation](cvss-interpretation.md) - Severity scoring
- [Output Format](output-format.md) - Structured CPE reporting

# CVSS Calculator Tool

**Deterministic CVSS score calculation using the RedHat cvss library.**

## Why This Tool Exists

CVSS scoring is deterministic mathematics based on the CVSS specification. LLM estimation of scores consistently produces errors:
- Incorrect vector-to-score mappings
- Off-by-one severity ratings
- Doesn't account for complex interaction effects between metrics

**This tool ensures accurate, specification-compliant scoring.**

## Installation

**No installation required!** The tool uses `uv` inline script dependencies:

```python
#!/usr/bin/env -S uv run --quiet --script
# /// script
# dependencies = ["cvss"]
# ///
```

On first run, `uv` automatically installs the `cvss` library in an isolated environment. No virtual environments, no pip install, no system Python package conflicts.

## Usage

### Basic Usage

```bash
# From anywhere in the repo
uv run .claude/skill-library/security/scoring-cvss-findings/scripts/cvss-calc.py "CVSS:4.0/AV:N/AC:L/AT:N/PR:N/UI:N/VC:H/VI:H/VA:H/SC:N/SI:N/SA:N"
```

**Output:**
```
Score: 9.3
Severity: Critical
Vector: CVSS:4.0/AV:N/AC:L/AT:N/PR:N/UI:N/VC:H/VI:H/VA:H/SC:N/SI:N/SA:N

JSON: {"version": "4.0", "vector": "CVSS:4.0/...", "score": 9.3, "severity": "Critical"}
```

### CVSS v3.1

```bash
uv run .claude/skill-library/security/scoring-cvss-findings/scripts/cvss-calc.py "CVSS:3.1/AV:N/AC:L/PR:N/UI:R/S:U/C:H/I:L/A:N"
```

**Output:**
```
Score: 7.1
Severity: High
Vector: CVSS:3.1/AV:N/AC:L/PR:N/UI:R/S:U/C:H/I:L/A:N
```

### CVSS v4.0

```bash
uv run .claude/skill-library/security/scoring-cvss-findings/scripts/cvss-calc.py "CVSS:4.0/AV:N/AC:L/AT:N/PR:L/UI:A/VC:H/VI:H/VA:N/SC:L/SI:L/SA:N"
```

**Output:**
```
Score: 8.4
Severity: High
Vector: CVSS:4.0/AV:N/AC:L/AT:N/PR:L/UI:A/VC:H/VI:H/VA:N/SC:L/SI:L/SA:N
```

## Integration with scoring-cvss-findings Skill

The skill now requires using this tool in Step 4 (Calculate Base Score):

1. **Step 3**: Select vector metrics through decision trees
2. **Step 4**: Run `cvss-calc.py` with the vector string ← **MUST use tool, not LLM estimation**
3. **Step 5**: Validate the calculated score matches expectations

**Critical rule:** Never estimate scores manually. Always use the calculator.

## Library Details

**Library:** [RedHatProductSecurity/cvss](https://github.com/RedHatProductSecurity/cvss)
**PyPI:** [cvss](https://pypi.org/project/cvss/)
**Python Version:** 3.6+ (3.7, 3.8, 3.9, 3.10, 3.11, 3.12, 3.13)

**CVSS Versions Supported:**
- CVSS v2.0
- CVSS v3.0
- CVSS v3.1
- CVSS v4.0

## Error Handling

### Invalid Vector Format

```bash
$ uv run cvss-calc.py "INVALID:VECTOR"
Error: Unsupported CVSS version. Vector must start with CVSS:3.0, CVSS:3.1, or CVSS:4.0
```

### Malformed Vector String

```bash
$ uv run cvss-calc.py "CVSS:4.0/AV:INVALID/AC:L"
Error calculating CVSS score: ...
```

The RedHat library validates vector strings and reports specific errors.

## Examples

### Critical Severity (9.0-10.0)

```bash
uv run cvss-calc.py "CVSS:4.0/AV:N/AC:L/AT:N/PR:N/UI:N/VC:H/VI:H/VA:H/SC:N/SI:N/SA:N"
# Score: 9.3, Severity: Critical
```

### High Severity (7.0-8.9)

```bash
uv run cvss-calc.py "CVSS:4.0/AV:N/AC:L/AT:N/PR:L/UI:A/VC:H/VI:H/VA:N/SC:L/SI:L/SA:N"
# Score: 8.4, Severity: High
```

### Medium Severity (4.0-6.9)

```bash
uv run cvss-calc.py "CVSS:4.0/AV:N/AC:H/AT:N/PR:L/UI:N/VC:H/VI:N/VA:N/SC:N/SI:N/SA:N"
# Score: 6.0, Severity: Medium
```

### Low Severity (0.1-3.9)

```bash
uv run cvss-calc.py "CVSS:4.0/AV:N/AC:H/AT:P/PR:H/UI:N/VC:L/VI:N/VA:N/SC:N/SI:N/SA:N"
# Score: 2.1, Severity: Low
```

## Troubleshooting

### uv Not Found

Install `uv`:
```bash
curl -LsSf https://astral.sh/uv/install.sh | sh
```

### Script Not Executable

```bash
chmod +x .claude/skill-library/security/scoring-cvss-findings/scripts/cvss-calc.py
```

### Dependency Installation Issues

The `cvss` library should install automatically via `uv`. If it fails, check:
- Internet connection (needed to download from PyPI)
- `uv` version (update with `uv self update`)
- Python 3.6+ available on system

## Changelog

**2026-01-13**: Initial creation
- Uses `uv` inline script dependencies (PEP 723)
- Supports CVSS v3.0, v3.1, and v4.0
- Simple CLI interface with JSON output
- No virtual environment or pip install required

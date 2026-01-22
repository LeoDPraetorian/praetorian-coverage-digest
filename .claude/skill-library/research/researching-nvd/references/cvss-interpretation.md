# CVSS v3.1 Interpretation Guide

**How to interpret CVSS scores, vectors, and severity ratings.**

## CVSS v3.1 Overview

**Common Vulnerability Scoring System (CVSS)** provides standardized severity ratings for vulnerabilities.

**Version:** v3.1 (current standard, published 2019)

**Components:**

- Base Score (0.0-10.0)
- Base Severity (NONE, LOW, MEDIUM, HIGH, CRITICAL)
- Vector String (machine-readable metrics)

## Base Score Ranges

| Score Range | Severity | Priority | Typical Action               |
| ----------- | -------- | -------- | ---------------------------- |
| 9.0-10.0    | CRITICAL | P0       | Immediate patching required  |
| 7.0-8.9     | HIGH     | P1       | Urgent patching (days-weeks) |
| 4.0-6.9     | MEDIUM   | P2       | Standard patching (weeks)    |
| 0.1-3.9     | LOW      | P3       | Low priority (planned)       |
| 0.0         | NONE     | N/A      | No vulnerability             |

## Vector String Format

**Structure:**

```
CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:H/A:H
```

### Attack Vector (AV)

**How the vulnerability is exploited**

| Value | Meaning  | Description                       | Impact |
| ----- | -------- | --------------------------------- | ------ |
| N     | Network  | Remotely exploitable over network | Worst  |
| A     | Adjacent | Adjacent network (same subnet)    | High   |
| L     | Local    | Local access required             | Medium |
| P     | Physical | Physical access required          | Low    |

**Example:** `AV:N` = Remote exploitation (most dangerous)

### Attack Complexity (AC)

**Difficulty of exploitation**

| Value | Meaning | Description                                              | Impact |
| ----- | ------- | -------------------------------------------------------- | ------ |
| L     | Low     | No special conditions, reliable exploitation             | Worst  |
| H     | High    | Requires timing, race conditions, or specific conditions | Better |

**Example:** `AC:L` = Easy to exploit reliably

### Privileges Required (PR)

**Authentication level needed**

| Value | Meaning | Description                        | Impact |
| ----- | ------- | ---------------------------------- | ------ |
| N     | None    | No authentication required         | Worst  |
| L     | Low     | Basic user privileges required     | Medium |
| H     | High    | Admin/elevated privileges required | Better |

**Example:** `PR:N` = Unauthenticated exploitation

### User Interaction (UI)

**Victim action required**

| Value | Meaning  | Description                                | Impact |
| ----- | -------- | ------------------------------------------ | ------ |
| N     | None     | No user interaction needed                 | Worst  |
| R     | Required | Victim must take action (click, open file) | Better |

**Example:** `UI:N` = No victim interaction needed

### Scope (S)

**Impact beyond vulnerable component**

| Value | Meaning   | Description                                | Impact |
| ----- | --------- | ------------------------------------------ | ------ |
| U     | Unchanged | Impact limited to vulnerable component     | Better |
| C     | Changed   | Impact extends beyond vulnerable component | Worst  |

**Example:** `S:U` = Impact contained, `S:C` = Broader impact (e.g., container escape)

### Confidentiality Impact (C)

**Information disclosure impact**

| Value | Meaning | Description                    | Impact |
| ----- | ------- | ------------------------------ | ------ |
| H     | High    | Total information disclosure   | Worst  |
| L     | Low     | Partial information disclosure | Medium |
| N     | None    | No confidentiality impact      | None   |

**Example:** `C:H` = Attacker can read all data

### Integrity Impact (I)

**Data modification impact**

| Value | Meaning | Description                      | Impact |
| ----- | ------- | -------------------------------- | ------ |
| H     | High    | Total data modification possible | Worst  |
| L     | Low     | Partial data modification        | Medium |
| N     | None    | No integrity impact              | None   |

**Example:** `I:H` = Attacker can modify all data

### Availability Impact (A)

**Denial of service impact**

| Value | Meaning | Description                   | Impact |
| ----- | ------- | ----------------------------- | ------ |
| H     | High    | Total denial of service       | Worst  |
| L     | Low     | Partial/degraded availability | Medium |
| N     | None    | No availability impact        | None   |

**Example:** `A:H` = Complete system outage possible

## Example Vectors

### Critical RCE (9.8)

```
CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:H/A:H
```

**Breakdown:**

- Network exploitable (AV:N)
- Low complexity (AC:L)
- No authentication (PR:N)
- No user interaction (UI:N)
- Unchanged scope (S:U)
- High impact on all CIA

**Typical:** Remote code execution, unauthenticated

### High SQLi (8.1)

```
CVSS:3.1/AV:N/AC:H/PR:N/UI:N/S:U/C:H/I:H/A:H
```

**Breakdown:**

- Network exploitable (AV:N)
- High complexity (AC:H) - requires specific conditions
- No authentication (PR:N)
- No user interaction (UI:N)
- Unchanged scope (S:U)
- High impact on all CIA

**Typical:** SQL injection with complex exploitation

### Medium XSS (6.1)

```
CVSS:3.1/AV:N/AC:L/PR:N/UI:R/S:C/C:L/I:L/A:N
```

**Breakdown:**

- Network exploitable (AV:N)
- Low complexity (AC:L)
- No authentication (PR:N)
- User interaction required (UI:R) - victim must click
- Changed scope (S:C) - can affect other users
- Low confidentiality/integrity impact
- No availability impact

**Typical:** Cross-site scripting

### Low Local Privilege Escalation (3.3)

```
CVSS:3.1/AV:L/AC:L/PR:L/UI:N/S:U/C:L/I:N/A:N
```

**Breakdown:**

- Local access required (AV:L)
- Low complexity (AC:L)
- Low privileges required (PR:L)
- No user interaction (UI:N)
- Unchanged scope (S:U)
- Low confidentiality impact only

**Typical:** Information disclosure, local user

## Prioritization Guidance

### Score + Exploit Status

| CVSS    | CISA KEV | Priority | Action                        |
| ------- | -------- | -------- | ----------------------------- |
| 9.0-10  | In KEV   | P0       | Emergency patch (immediate)   |
| 7.0-8.9 | In KEV   | P1       | Urgent patch (24-48 hours)    |
| 9.0-10  | Not KEV  | P2       | High priority (1-2 weeks)     |
| 7.0-8.9 | Not KEV  | P3       | Standard timeline (2-4 weeks) |
| <7.0    | Any      | P4       | Low priority (planned)        |

### Environmental Modifiers

**Adjust priority based on:**

1. **Exposure:** Internet-facing vs internal
2. **Data Sensitivity:** Production vs dev/test
3. **Workaround:** Mitigation available?
4. **Exploit Availability:** Public exploit code?

## Common Patterns

### Unauthenticated RCE (Worst Case)

```
AV:N/AC:L/PR:N/UI:N
```

**Characteristics:**

- Remote, easy, no auth, no interaction
- Almost always CRITICAL (9.0-10.0)
- Immediate patching required

### Authenticated RCE

```
AV:N/AC:L/PR:L/UI:N
```

**Characteristics:**

- Still remote and easy, but requires account
- Typically HIGH (7.0-8.9)
- Urgent patching required

### Client-Side Attacks

```
AV:N/AC:L/PR:N/UI:R
```

**Characteristics:**

- Requires victim interaction
- Typically MEDIUM to HIGH (4.0-8.9)
- Standard patching timeline

### Local Attacks

```
AV:L/AC:L/PR:L/UI:N
```

**Characteristics:**

- Requires local access
- Typically LOW to MEDIUM (0.1-6.9)
- Lower priority, planned patching

## Temporal and Environmental Scores

**Base Score:** Intrinsic vulnerability characteristics (what we use)

**Temporal Score:** Changes over time (exploit availability, patch availability)

- Not typically in NVD data
- Used by organizations for internal prioritization

**Environmental Score:** Organization-specific context (exposure, data sensitivity)

- Customized by each organization
- NVD provides Base Score only

## Vector Calculation

**CVSS Base Score is calculated from vector metrics.**

**Online Calculator:** https://www.first.org/cvss/calculator/3.1

**Example Input:**

- AV:N, AC:L, PR:N, UI:N, S:U, C:H, I:H, A:H
- **Output:** 9.8 (CRITICAL)

## Related References

- [Query Patterns](query-patterns.md) - Filtering by CVSS severity
- [CPE Syntax](cpe-syntax.md) - Affected product identification
- [Output Format](output-format.md) - Structured CVSS reporting

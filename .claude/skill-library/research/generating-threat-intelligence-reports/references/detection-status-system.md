# Detection Status System

**Progressive detection status that evolves through threat intel → customer impact → remediation phases.**

## Status Definitions

| Status                 | Color     | Symbol | Meaning                                                  | Priority              |
| ---------------------- | --------- | ------ | -------------------------------------------------------- | --------------------- |
| **COVERED**            | 🟢 Green  | ✅     | Template exists, customer not exposed                    | Low                   |
| **COVERED-EXPOSED**    | 🟡 Yellow | ⚠️     | Template exists, customer IS exposed                     | Medium                |
| **IN DEVELOPMENT**     | 🟠 Orange | 🔶     | Gap identified, research job triggered, customer exposed | High                  |
| **IN DEV-NO EXPOSURE** | 🟢 Green  | 🔶     | Gap identified, research job triggered, customer safe    | Low                   |
| **GAP**                | 🔴 Red    | ❌     | No template, no research triggered                       | Critical (if exposed) |

## Status Progression Through Workflow

### Phase 1: Threat Intelligence Research

**Initial status assignment based on nuclei template search:**

```
Nuclei template search:
  ├─> Template exists → Status: "COVERED" (tentative)
  └─> No template → Status: "GAP" (tentative)
```

**Output in REPORT.md:**

- Detection Status column shows: COVERED or GAP
- Note: "Status will be refined based on customer exposure in Phase 2"

### Phase 2: Customer Impact Analysis

**Status refinement based on customer asset exposure:**

```
For each CVE:
  Current Status: "COVERED"
    ├─> Customer has affected assets → Update to "COVERED-EXPOSED" (🟡)
    └─> No affected assets → Keep "COVERED" (🟢)

  Current Status: "GAP"
    ├─> Customer has affected assets → Keep "GAP" (🔴 CRITICAL)
    └─> No affected assets → Keep "GAP" (🔴 but lower priority)
```

**Output in IMPACT.md:**

- Updated Detection Status with customer context
- Priority adjusted based on exposure

### Phase 3: Detection Gap Remediation

**Status update when CVE Researcher jobs triggered:**

```
For gaps only (where Phase 3 executes):
  Current Status: "GAP" + Customer exposed
    └─> Job created → Update to "IN DEVELOPMENT" (🟠)

  Current Status: "GAP" + No customer exposure
    └─> Job created → Update to "IN DEV-NO EXPOSURE" (🟢)
```

**Output in RESEARCH-JOBS.md:**

- Final status with job tracking
- PR/Linear ticket links when available

## Report Format Examples

### REPORT.md (Phase 1 - Tentative Status)

```markdown
| Priority | CVE            | Product       | Threat Actor     | Detection Status |
| -------- | -------------- | ------------- | ---------------- | ---------------- |
| CRITICAL | CVE-2025-20393 | Cisco AsyncOS | UAT-9686 (China) | ❌ GAP\*         |
| HIGH     | CVE-2025-55182 | React/Next.js | Earth Lamia      | ✅ COVERED\*     |

\*Status tentative - will be refined in Phase 2 based on customer exposure
```

### IMPACT.md (Phase 2 - Refined by Exposure)

```markdown
| CVE            | Affected Assets | Detection Status             | Priority |
| -------------- | --------------- | ---------------------------- | -------- |
| CVE-2025-20393 | 3 assets        | ❌ GAP (🔴 CRITICAL)         | P0       |
| CVE-2025-55182 | 12 assets       | ⚠️ COVERED-EXPOSED (🟡 HIGH) | P1       |
| CVE-2025-14733 | 0 assets        | ✅ COVERED (🟢 LOW)          | P3       |
```

### RESEARCH-JOBS.md (Phase 3 - Final Status with Remediation)

```markdown
| CVE            | Detection Status           | Job Status | PR        | Linear Ticket |
| -------------- | -------------------------- | ---------- | --------- | ------------- |
| CVE-2025-20393 | 🔶 IN DEVELOPMENT (🟠)     | RUNNING    | Pending   | [CHAR-123]    |
| CVE-2025-14733 | 🔶 IN DEV-NO EXPOSURE (🟢) | COMPLETED  | [PR #567] | [CHAR-124]    |
```

## Priority Adjustments by Status

| Status                 | Customer Exposed? | Priority Multiplier                         |
| ---------------------- | ----------------- | ------------------------------------------- |
| **GAP**                | Yes               | 1.5x (CRITICAL)                             |
| **GAP**                | No                | 0.8x (still important for other customers)  |
| **IN DEVELOPMENT**     | Yes               | 1.2x (HIGH - coverage coming soon)          |
| **IN DEV-NO EXPOSURE** | No                | 0.5x (LOW - coverage coming, customer safe) |
| **COVERED-EXPOSED**    | Yes               | 1.0x (MEDIUM - can detect, needs patching)  |
| **COVERED**            | No                | 0.3x (LOW - can detect, customer safe)      |

## Status Update Protocol

**When updating status:**

1. **Start with Phase 1 status** (COVERED or GAP)
2. **Apply Phase 2 refinement** (add exposure context)
3. **Apply Phase 3 remediation** (update gaps to IN DEVELOPMENT)
4. **Document status evolution** in MANIFEST.yaml

**Backwards compatibility:**

- Old reports used binary COVERED/GAP
- New reports use 5-level progressive system
- Both formats valid, new system provides more context

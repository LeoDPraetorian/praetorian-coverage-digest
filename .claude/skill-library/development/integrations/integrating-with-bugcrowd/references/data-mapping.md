# Data Mapping: Bugcrowd Submissions ↔ Chariot Vulnerabilities

**Last Updated:** 2026-01-03
**Source:** Research synthesis (1,220 lines combined from Context7 + Perplexity)

---

## Severity Mapping

### Bugcrowd VRT to Chariot Status Codes

| Bugcrowd Priority | CVSS Range | Chariot Status                | Chariot Priority | Risk Level     |
| ----------------- | ---------- | ----------------------------- | ---------------- | -------------- |
| P1 Critical       | 9.0-10.0   | **TC** (Triage/Critical)      | 0                | Immediate      |
| P2 Severe         | 7.0-8.9    | **TH** (Triage/High)          | 10               | Urgent         |
| P3 Moderate       | 4.0-6.9    | **TM** (Triage/Medium)        | 20               | Important      |
| P4 Low            | 0.1-3.9    | **TL** (Triage/Low)           | 30               | Minor          |
| P5 Informational  | N/A        | **TI** (Triage/Informational) | 40               | Non-actionable |

### Chariot Status Code Format

```
Position 0: State (T=Triage, O=Open, R=Remediated, E=Excluded)
Position 1: Severity (C=Critical, H=High, M=Medium, L=Low, I=Informational)
Position 2: Sub-state (optional)
```

---

## State Mapping

### Bugcrowd State → Chariot State

| Bugcrowd State | Sub-state        | Chariot Status  | Notes                       |
| -------------- | ---------------- | --------------- | --------------------------- |
| Open           | New              | **TC/TH/TM/TL** | Initial triage state        |
| Open           | Triaged          | **OH**          | Acknowledged by program     |
| Accepted       | Unresolved       | **OH**          | Confirmed, work in progress |
| Accepted       | Resolved         | **RM**          | Remediated/fixed            |
| Accepted       | Informational    | **OI**          | Non-critical finding        |
| Rejected       | Out of Scope     | **EM**          | Outside program scope       |
| Rejected       | Not Reproducible | **EL**          | Cannot reproduce            |
| Rejected       | Not Acceptable   | **EM**          | Does not meet criteria      |

---

## Field Mapping

### Direct Field Mappings

| Bugcrowd Field     | Chariot Risk Field | Transformation                      |
| ------------------ | ------------------ | ----------------------------------- |
| `submission_id`    | Key (partial)      | `#risk#{dns}#{submission_id}`       |
| `title`            | Name               | Normalize to lowercase with hyphens |
| `priority` (P1-P5) | Status[1]          | P1→C, P2→H, P3→M, P4→L, P5→I        |
| `state`            | Status[0]          | Map using table above               |
| `created_at`       | Created            | Convert to RFC3339                  |
| `updated_at`       | Updated            | Convert to RFC3339                  |
| `submission_date`  | Visited            | Initial submission timestamp        |

### Custom Attribute Mappings

Store these fields as Chariot Attributes:

| Bugcrowd Field | Attribute Key  | Notes                  |
| -------------- | -------------- | ---------------------- |
| `details`      | `description`  | Markdown content       |
| `bug_url`      | `affected_url` | Vulnerable URL         |
| `cvss_base`    | `cvss_score`   | Float (0.0-10.0)       |
| `cvss_vector`  | `cvss_vector`  | CVSS 3.1 vector string |
| `vrt_category` | `vrt_category` | Bugcrowd taxonomy ID   |

---

## CWE Mapping Strategy

### CWE Lookup Process

```typescript
// Load CWE mapping from Bugcrowd VRT GitHub
const cweMapping = await fetch(
  "https://raw.githubusercontent.com/bugcrowd/vulnerability-rating-taxonomy/master/mappings/cwe/cwe.json"
).then((r) => r.json());

function lookupCWE(vrtCategoryId: string): number[] | null {
  // Recursive search through hierarchical structure
  function search(node: any): number[] | null {
    if (node.id === vrtCategoryId) {
      return node.cwe; // May be null or array of CWE IDs
    }

    if (node.children) {
      for (const child of node.children) {
        const result = search(child);
        if (result !== undefined) {
          return result;
        }
      }
    }

    return undefined;
  }

  for (const category of cweMapping.content) {
    const result = search(category);
    if (result !== undefined) {
      return result;
    }
  }

  return null;
}
```

### Fallback Strategy for Sparse Mappings

```typescript
function getCWEWithFallback(vrtCategoryId: string): {
  cweIds: number[];
  source: "direct" | "parent" | "best-match" | "none";
} {
  // Try direct mapping
  const directCWE = lookupCWE(vrtCategoryId);
  if (directCWE && directCWE.length > 0) {
    return { cweIds: directCWE, source: "direct" };
  }

  // Try parent category
  const parentId = getParentCategory(vrtCategoryId);
  if (parentId) {
    const parentCWE = lookupCWE(parentId);
    if (parentCWE && parentCWE.length > 0) {
      return { cweIds: parentCWE, source: "parent" };
    }
  }

  // Use best-match fallback (common mappings)
  const bestMatch = FALLBACK_CWE_MAPPINGS[vrtCategoryId];
  if (bestMatch) {
    return { cweIds: [bestMatch], source: "best-match" };
  }

  return { cweIds: [], source: "none" };
}

const FALLBACK_CWE_MAPPINGS: Record<string, number> = {
  information_disclosure: 200,
  authentication_bypass: 287,
  access_control: 284,
  injection: 74,
  // ... more fallbacks
};
```

---

## Transformation Example

### Bugcrowd Submission → Chariot Risk

```typescript
interface BugcrowdSubmission {
  submission_id: string;
  title: string;
  details: string;
  priority: "P1" | "P2" | "P3" | "P4" | "P5";
  state: "Open" | "Accepted" | "Rejected";
  sub_state: string;
  target: { name: string; type: string };
  bug_url: string;
  cvss_base: number;
  cvss_vector: string;
  vrt_category: string;
  created_at: string;
  updated_at: string;
}

interface ChariotRisk {
  username: string;
  key: string;
  dns: string;
  name: string;
  source: string;
  status: string;
  priority: number;
  created: string;
  updated: string;
  visited: string;
  comment: string;
  tags: Record<string, string>;
  originationData: OriginationData;
}

function transformSubmissionToRisk(submission: BugcrowdSubmission): ChariotRisk {
  // Extract DNS from target
  const dns = extractDNS(submission.target.name);

  // Map priority to severity code
  const severityCode = {
    P1: "C",
    P2: "H",
    P3: "M",
    P4: "L",
    P5: "I",
  }[submission.priority];

  // Map state to state code
  const stateCode = mapStateCode(submission.state, submission.sub_state);

  // Lookup CWE
  const cweResult = getCWEWithFallback(submission.vrt_category);

  return {
    username: "bugcrowd-sync@chariot.local",
    key: `#risk#${dns}#${submission.submission_id}`,
    dns,
    name: submission.submission_id,
    source: "bugcrowd",
    status: `${stateCode}${severityCode}`,
    priority: { C: 0, H: 10, M: 20, L: 30, I: 40 }[severityCode] || 20,
    created: submission.created_at,
    updated: submission.updated_at,
    visited: submission.updated_at,
    comment: `${submission.title} - ${submission.state}`,
    tags: {
      bugcrowd: submission.submission_id,
      severity: submission.priority,
      vrt_category: submission.vrt_category,
      ...(cweResult.cweIds.length > 0 && { cwe_ids: cweResult.cweIds.join(",") }),
    },
    originationData: {
      source: "bugcrowd",
      sourceId: submission.submission_id,
      sourceUrl: `https://bugcrowd.com/submissions/${submission.submission_id}`,
      sourceTimestamp: submission.created_at,
      syncTimestamp: new Date().toISOString(),
      rawData: JSON.stringify(submission),
    },
  };
}

function mapStateCode(state: string, subState: string): string {
  if (state === "Open") {
    return subState === "Triaged" ? "O" : "T";
  }
  if (state === "Accepted") {
    return subState === "Resolved" ? "R" : "O";
  }
  if (state === "Rejected") {
    return "E";
  }
  return "T"; // Default to Triage
}
```

---

## Bidirectional Sync Strategy

### Ingest Flow (Bugcrowd → Chariot)

```typescript
async function syncBugcrowdSubmissions(): Promise<{
  created: number;
  updated: number;
  errors: number;
}> {
  const lastSyncTimestamp = await getSyncCheckpoint();

  // Fetch updated submissions
  const submissions = await bugcrowdClient.get("/submissions", {
    params: {
      "filter[updated_since]": lastSyncTimestamp,
      "page[limit]": 25,
    },
  });

  const results = { created: 0, updated: 0, errors: 0 };

  for (const submission of submissions.data) {
    try {
      // Check if Risk already exists
      const existingRisk = await chariotClient.findRisk({
        source: "bugcrowd",
        sourceId: submission.submission_id,
      });

      if (existingRisk) {
        // Update existing Risk
        await chariotClient.updateRisk(existingRisk.key, transformSubmissionToRisk(submission));
        results.updated++;
      } else {
        // Create new Risk
        await chariotClient.createRisk(transformSubmissionToRisk(submission));
        results.created++;
      }
    } catch (error) {
      logger.error("Sync error", { submission: submission.submission_id, error });
      results.errors++;
    }
  }

  // Update sync checkpoint
  await updateSyncCheckpoint(new Date().toISOString());

  return results;
}
```

### Conflict Resolution

**Rule:** Bugcrowd is source of truth (external platform)

```typescript
async function resolveConflict(
  bugcrowdData: BugcrowdSubmission,
  chariotData: ChariotRisk
): Promise<ChariotRisk> {
  // Bugcrowd wins for these fields
  const merged: ChariotRisk = {
    ...chariotData,
    status: transformStatus(bugcrowdData.priority, bugcrowdData.state),
    updated: bugcrowdData.updated_at,

    // Preserve Chariot-local changes
    comment: chariotData.comment, // User comments in Chariot
    tags: { ...bugcrowdData.tags, ...chariotData.tags }, // Merge tags

    // Update sync metadata
    originationData: {
      ...chariotData.originationData,
      syncTimestamp: new Date().toISOString(),
      rawData: JSON.stringify(bugcrowdData),
    },
  };

  // Log conflict resolution
  logger.info("Conflict resolved", {
    submission_id: bugcrowdData.submission_id,
    strategy: "bugcrowd_source_of_truth",
  });

  return merged;
}
```

---

## References

- [Bugcrowd Submission Management](https://docs.bugcrowd.com/customers/submission-management/submission-overview/)
- [Bugcrowd VRT Repository](https://github.com/bugcrowd/vulnerability-rating-taxonomy)
- [CWE Mapping Data](https://github.com/bugcrowd/vulnerability-rating-taxonomy/blob/master/mappings/cwe/cwe.json)
- Research: context7-data-mapping.md (734 lines)
- Research: perplexity-data-mapping.md (486 lines)

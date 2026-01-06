# Bidirectional Synchronization Patterns

**Last Updated:** 2026-01-03
**Source:** Research synthesis from data-mapping.md

---

## Synchronization Strategy

### Inbound Sync (Bugcrowd → Chariot)

**Method:** Webhooks (real-time) + Polling (backfill)

**Webhook Flow:**

1. Bugcrowd sends webhook event (submission.submitted, submission.updated, etc.)
2. Validate HMAC signature
3. Check idempotency (event ID already processed?)
4. Transform Bugcrowd submission to Chariot Risk
5. Create or update Risk in Chariot
6. Acknowledge webhook (200 OK within 30s)

**Polling Flow (Hourly Backfill):**

```typescript
async function syncBugcrowdSubmissions(): Promise<SyncResult> {
  const lastSync = await getSyncCheckpoint();

  // Fetch submissions updated since last sync
  const submissions = await bugcrowdClient.get("/submissions", {
    params: {
      "filter[updated_since]": lastSync,
      "page[limit]": 25,
    },
  });

  const results = { created: 0, updated: 0, errors: 0 };

  for (const submission of submissions.data) {
    try {
      const existing = await chariotClient.findRisk({
        source: "bugcrowd",
        sourceId: submission.id,
      });

      if (existing) {
        await chariotClient.updateRisk(existing.key, transform(submission));
        results.updated++;
      } else {
        await chariotClient.createRisk(transform(submission));
        results.created++;
      }
    } catch (error) {
      logger.error("Sync error", { submission: submission.id, error });
      results.errors++;
    }
  }

  await updateSyncCheckpoint(new Date().toISOString());
  return results;
}
```

---

## Conflict Resolution

**Rule:** Bugcrowd is source of truth (external platform)

### Conflict Scenarios

| Scenario                        | Resolution                  | Rationale                         |
| ------------------------------- | --------------------------- | --------------------------------- |
| Bugcrowd priority changed       | Update Chariot status       | Bugcrowd owns severity assessment |
| Bugcrowd state changed          | Update Chariot state        | Bugcrowd owns workflow state      |
| Chariot comment added           | Preserve local comment      | Chariot-local annotations         |
| Both systems updated same field | Bugcrowd wins, log conflict | External platform authority       |
| Chariot custom attributes added | Preserve custom attributes  | Chariot-specific enrichment       |

### Implementation

```typescript
async function resolveConflict(
  bugcrowdData: BugcrowdSubmission,
  chariotData: ChariotRisk
): Promise<ChariotRisk> {
  return {
    ...chariotData,

    // Bugcrowd wins for these fields
    status: transformStatus(bugcrowdData.priority, bugcrowdData.state),
    updated: bugcrowdData.updated_at,

    // Preserve Chariot-local changes
    comment: chariotData.comment,
    tags: { ...bugcrowdData.tags, ...chariotData.tags },

    // Update sync metadata
    originationData: {
      ...chariotData.originationData,
      syncTimestamp: new Date().toISOString(),
      rawData: JSON.stringify(bugcrowdData),
    },
  };
}
```

---

## Deduplication

### Submission ID as Key

```typescript
// Use Bugcrowd submission_id as unique identifier
const riskKey = `#risk#${dns}#${submission.id}`;

// Check for existing risk
const existing = await db.query("SELECT * FROM risks WHERE source = $1 AND source_id = $2", [
  "bugcrowd",
  submission.id,
]);

if (existing.length > 0) {
  // Update existing risk (idempotent)
  await db.update(existing[0].key, transformedRisk);
} else {
  // Create new risk
  await db.insert(transformedRisk);
}
```

---

## Eventual Consistency

**Challenges:**

- Webhook delivery may be delayed or lost
- Polling may be delayed by hours
- Chariot and Bugcrowd may have different timestamps

**Strategies:**

1. **Timestamp Comparison:** Only update if Bugcrowd data is newer
2. **Version Vectors:** Track last sync time per submission
3. **Conflict Logging:** Log all conflicts for manual review
4. **Reconciliation Jobs:** Daily full sync to catch missed events

```typescript
async function shouldUpdate(
  bugcrowdSubmission: BugcrowdSubmission,
  chariotRisk: ChariotRisk
): Promise<boolean> {
  const bugcrowdTime = new Date(bugcrowdSubmission.updated_at).getTime();
  const chariotTime = new Date(chariotRisk.updated).getTime();

  // Only update if Bugcrowd is newer
  return bugcrowdTime > chariotTime;
}
```

---

## Sync State Tracking

```typescript
interface SyncCheckpoint {
  last_sync_timestamp: string;
  submissions_processed: string[];
  submissions_failed: string[];
  next_sync_scheduled: string;
}

async function getSyncCheckpoint(): Promise<string> {
  const checkpoint = await db.get("bugcrowd:sync:checkpoint");
  return checkpoint?.last_sync_timestamp || new Date(0).toISOString();
}

async function updateSyncCheckpoint(timestamp: string): Promise<void> {
  await db.set("bugcrowd:sync:checkpoint", {
    last_sync_timestamp: timestamp,
    updated_at: new Date().toISOString(),
  });
}
```

---

## References

- Research: context7-data-mapping.md (734 lines)
- Research: perplexity-data-mapping.md (486 lines)
- [references/data-mapping.md](./data-mapping.md) - Field transformation details

# BigQuery Integration Patterns

**Source:** Research synthesis (Confidence: 0.91)

## Ingestion Methods Comparison

| Method                | Cost              | Latency | Throughput    | Exactly-Once |
| --------------------- | ----------------- | ------- | ------------- | ------------ |
| **Storage Write API** | Low               | <5s     | 500k rows/sec | Yes          |
| **Batch Load (GCS)**  | Free              | 5-30s   | Unlimited     | Yes          |
| **Streaming Inserts** | High (deprecated) | <1s     | 100k rows/sec | No           |

**Recommendation**: Use Storage Write API for new applications.

---

## Storage Write API (Recommended)

### Streaming Insert

```go
import (
    "cloud.google.com/go/bigquery/storage/managedwriter"
)

func streamToBigQuery(ctx context.Context, projectID, datasetID, tableID string, rows []map[string]interface{}) error {
    client, err := managedwriter.NewClient(ctx, projectID)
    if err != nil {
        return err
    }
    defer client.Close()

    // Create managed stream
    tablePath := fmt.Sprintf("projects/%s/datasets/%s/tables/%s", projectID, datasetID, tableID)
    managedStream, err := client.NewManagedStream(ctx,
        managedwriter.WithDestinationTable(tablePath),
        managedwriter.WithType(managedwriter.DefaultStream),
    )
    if err != nil {
        return err
    }
    defer managedStream.Close()

    // Append rows
    result, err := managedStream.AppendRows(ctx, rows)
    if err != nil {
        return err
    }

    // Wait for result
    _, err = result.GetResult(ctx)
    return err
}
```

---

## Batch Load from Cloud Storage

### Load CSV

```go
import (
    "cloud.google.com/go/bigquery"
)

func loadCSVFromGCS(ctx context.Context, projectID, datasetID, tableID, gcsURI string) error {
    client, err := bigquery.NewClient(ctx, projectID)
    if err != nil {
        return err
    }
    defer client.Close()

    gcsRef := bigquery.NewGCSReference(gcsURI)
    gcsRef.SourceFormat = bigquery.CSV
    gcsRef.SkipLeadingRows = 1  // Skip header

    loader := client.Dataset(datasetID).Table(tableID).LoaderFrom(gcsRef)
    loader.WriteDisposition = bigquery.WriteAppend

    job, err := loader.Run(ctx)
    if err != nil {
        return err
    }

    // Wait for job to complete
    status, err := job.Wait(ctx)
    if err != nil {
        return err
    }

    if status.Err() != nil {
        return status.Err()
    }

    return nil
}
```

---

## Query Patterns

### Simple Query

```go
func queryBigQuery(ctx context.Context, projectID, query string) error {
    client, err := bigquery.NewClient(ctx, projectID)
    if err != nil {
        return err
    }
    defer client.Close()

    q := client.Query(query)
    it, err := q.Read(ctx)
    if err != nil {
        return err
    }

    for {
        var row []bigquery.Value
        err := it.Next(&row)
        if err == iterator.Done {
            break
        }
        if err != nil {
            return err
        }

        fmt.Println(row)
    }

    return nil
}
```

### Parameterized Query (SQL Injection Prevention)

```go
func parameterizedQuery(ctx context.Context, projectID, userID string) error {
    client, err := bigquery.NewClient(ctx, projectID)
    if err != nil {
        return err
    }
    defer client.Close()

    q := client.Query(`
        SELECT name, email
        FROM mydataset.users
        WHERE user_id = @user_id
    `)
    q.Parameters = []bigquery.QueryParameter{
        {
            Name:  "user_id",
            Value: userID,
        },
    }

    it, err := q.Read(ctx)
    if err != nil {
        return err
    }

    // Process results
    return nil
}
```

---

## Cost Optimization

### Table Partitioning (By Date)

```sql
CREATE TABLE mydataset.events
(
  event_id STRING,
  event_time TIMESTAMP,
  user_id STRING,
  event_data JSON
)
PARTITION BY DATE(event_time)
OPTIONS(
  partition_expiration_days=90
);
```

**Cost savings:** Query only relevant partitions (10-100x cost reduction)

### Clustering

```sql
CREATE TABLE mydataset.events
(
  event_id STRING,
  event_time TIMESTAMP,
  user_id STRING,
  event_type STRING
)
PARTITION BY DATE(event_time)
CLUSTER BY user_id, event_type;
```

**Cost savings:** Filter by clustered columns for 2-10x cost reduction

---

## Best Practices

### Performance

- ✅ Use Storage Write API for streaming (not legacy streaming inserts)
- ✅ Batch load for >10GB/day (free, faster)
- ✅ Partition tables by date
- ✅ Cluster by frequently filtered columns

### Cost

- ✅ Use `SELECT column1, column2` instead of `SELECT *`
- ✅ Filter partitions: `WHERE DATE(event_time) = '2026-01-04'`
- ✅ Set partition expiration (auto-delete old data)
- ✅ Use table preview (free) instead of queries for exploration

### Security

- ✅ Use parameterized queries (prevent SQL injection)
- ✅ Grant minimal IAM roles (e.g., `bigquery.dataViewer` not `bigquery.admin`)
- ✅ Enable audit logs for query monitoring

---

## External Resources

- [BigQuery Documentation](https://cloud.google.com/bigquery/docs)
- [Storage Write API](https://cloud.google.com/bigquery/docs/write-api)
- [Partitioning](https://cloud.google.com/bigquery/docs/partitioned-tables)
- [Clustering](https://cloud.google.com/bigquery/docs/clustered-tables)

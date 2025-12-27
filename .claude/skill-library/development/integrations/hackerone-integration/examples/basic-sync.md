# Basic One-Way Sync Example

**Simple HackerOne → Chariot report ingestion without bidirectional updates.**

## Overview

This example shows how to implement a basic one-way sync that:

1. Fetches new HackerOne reports periodically
2. Maps reports to Chariot Risk entities
3. Creates Risks in Chariot database

## Use Case

Perfect for:

- Initial HackerOne integration
- Read-only vulnerability ingestion
- Testing integration before full bidirectional sync

## Implementation

### Step 1: Schedule Sync Job

Create a scheduled Lambda function to run every 15 minutes:

```yaml
# template.yaml (AWS SAM)
SyncHackerOneReportsFunction:
  Type: AWS::Serverless::Function
  Properties:
    Handler: cmd/sync-hackerone/main
    Runtime: go1.x
    Events:
      ScheduledSync:
        Type: Schedule
        Properties:
          Schedule: rate(15 minutes)
    Environment:
      Variables:
        HACKERONE_API_ID: !Sub "{{resolve:secretsmanager:hackerone-credentials:SecretString:api_id}}"
        HACKERONE_API_TOKEN: !Sub "{{resolve:secretsmanager:hackerone-credentials:SecretString:api_token}}"
```

### Step 2: Sync Logic

```go
// cmd/sync-hackerone/main.go
package main

import (
    "context"
    "log"

    "github.com/aws/aws-lambda-go/lambda"
    "modules/chariot/backend/pkg/integration/hackerone"
)

func Handler(ctx context.Context) error {
    // Initialize HackerOne client
    h1Client := hackerone.NewClient(
        os.Getenv("HACKERONE_API_ID"),
        os.Getenv("HACKERONE_API_TOKEN"),
    )

    // Fetch new/triaged reports
    reports, err := h1Client.ListReports(ctx, hackerone.ListOptions{
        State:     []string{"new", "triaged"},
        UpdatedAt: time.Now().Add(-24 * time.Hour), // Last 24 hours
    })
    if err != nil {
        return fmt.Errorf("fetch reports: %w", err)
    }

    log.Printf("Found %d reports to sync", len(reports.Data))

    // Process each report
    for _, report := range reports.Data {
        if err := syncReport(ctx, &report); err != nil {
            log.Printf("Failed to sync report %s: %v", report.ID, err)
            continue // Don't fail entire job on single report
        }
    }

    return nil
}

func syncReport(ctx context.Context, report *hackerone.Report) error {
    // Check if already synced
    existing, err := riskService.GetByExternalID(ctx, "hackerone", report.ID)
    if err == nil {
        // Already exists - update it
        return updateExistingRisk(ctx, existing, report)
    }

    // Map to Chariot Risk
    risk, err := hackerone.MapReportToRisk(report)
    if err != nil {
        return fmt.Errorf("map report: %w", err)
    }

    // Create Risk in Chariot
    if err := riskService.Create(ctx, risk); err != nil {
        return fmt.Errorf("create risk: %w", err)
    }

    log.Printf("Synced report %s as risk %s", report.ID, risk.ID)
    return nil
}

func main() {
    lambda.Start(Handler)
}
```

### Step 3: Track Sync State

Use DynamoDB to track last sync timestamp:

```go
type SyncState struct {
    Service      string    `dynamodbav:"service"`
    LastSyncedAt time.Time `dynamodbav:"last_synced_at"`
}

func getLastSyncTime(ctx context.Context) (time.Time, error) {
    result, err := dynamoClient.GetItem(ctx, &dynamodb.GetItemInput{
        TableName: aws.String("integration-sync-state"),
        Key: map[string]types.AttributeValue{
            "service": &types.AttributeValueMemberS{Value: "hackerone"},
        },
    })

    if err != nil {
        return time.Time{}, err
    }

    var state SyncState
    if err := attributevalue.UnmarshalMap(result.Item, &state); err != nil {
        return time.Time{}, err
    }

    return state.LastSyncedAt, nil
}

func updateLastSyncTime(ctx context.Context, t time.Time) error {
    _, err := dynamoClient.PutItem(ctx, &dynamodb.PutItemInput{
        TableName: aws.String("integration-sync-state"),
        Item: map[string]types.AttributeValue{
            "service":        &types.AttributeValueMemberS{Value: "hackerone"},
            "last_synced_at": &types.AttributeValueMemberS{Value: t.Format(time.RFC3339)},
        },
    })
    return err
}
```

## Deployment

```bash
# Build and deploy
cd modules/chariot/backend
sam build
sam deploy --guided

# Verify deployment
aws lambda invoke \
  --function-name SyncHackerOneReportsFunction \
  --payload '{}' \
  response.json

cat response.json
```

## Monitoring

Track sync metrics in CloudWatch:

```go
import "github.com/aws/aws-sdk-go-v2/service/cloudwatch"

func recordSyncMetrics(ctx context.Context, reportsProcessed, errorCount int) {
    cwClient.PutMetricData(ctx, &cloudwatch.PutMetricDataInput{
        Namespace: aws.String("Chariot/Integrations"),
        MetricData: []types.MetricDatum{
            {
                MetricName: aws.String("HackerOneReportsProcessed"),
                Value:      aws.Float64(float64(reportsProcessed)),
                Unit:       types.StandardUnitCount,
            },
            {
                MetricName: aws.String("HackerOneSyncErrors"),
                Value:      aws.Float64(float64(errorCount)),
                Unit:       types.StandardUnitCount,
            },
        },
    })
}
```

## Limitations

This basic sync has limitations:

- ❌ No real-time updates (15 minute polling delay)
- ❌ No Chariot → HackerOne updates
- ❌ No report activity/comment sync
- ❌ No automatic re-sync on errors

For advanced features, see [bidirectional-sync.md](bidirectional-sync.md).

## Next Steps

1. ✅ Deploy basic sync
2. Monitor for 24 hours
3. Validate data accuracy
4. Add webhook handling (real-time)
5. Implement bidirectional updates

## Related Examples

- [bidirectional-sync.md](bidirectional-sync.md) - Full two-way integration
- [bounty-automation.md](bounty-automation.md) - Automated bounty workflows

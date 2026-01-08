# Pipeline Integration

Patterns for integrating with Azure Pipelines for security monitoring.

---

## List Pipelines

```go
func (c *Client) ListPipelines(ctx context.Context, projectID string) ([]pipelines.Pipeline, error) {
    args := pipelines.ListPipelinesArgs{
        Project: &projectID,
    }

    result, err := c.pipelinesClient.ListPipelines(ctx, args)
    if err != nil {
        return nil, err
    }

    return *result, nil
}
```

---

## Monitor Pipeline Runs

```go
func (c *Client) GetPipelineRuns(ctx context.Context, projectID string, pipelineID int) ([]pipelines.Run, error) {
    args := pipelines.ListRunsArgs{
        Project:    &projectID,
        PipelineId: &pipelineID,
    }

    result, err := c.pipelinesClient.ListRuns(ctx, args)
    if err != nil {
        return nil, err
    }

    return *result.Value, nil
}
```

---

## Analyze Build Logs for Secrets

```go
func (c *Client) ScanBuildLogsForSecrets(ctx context.Context, projectID string, buildID int) ([]SecretMatch, error) {
    // Get build logs
    logs, err := c.buildClient.GetBuildLogs(ctx, build.GetBuildLogsArgs{
        Project: &projectID,
        BuildId: &buildID,
    })
    if err != nil {
        return nil, err
    }

    var secrets []SecretMatch

    for _, log := range *logs {
        // Download log content
        content, err := c.downloadLog(ctx, projectID, buildID, *log.Id)
        if err != nil {
            continue
        }

        // Scan for secrets (API keys, passwords, tokens)
        matches := c.secretScanner.Scan(content)
        secrets = append(secrets, matches...)
    }

    return secrets, nil
}
```

---

## Check Service Connection Security

```go
type ServiceConnectionAudit struct {
    Name               string
    BranchControlled   bool
    ApprovalRequired   bool
    LastUsed           time.Time
    PermissionsScope   string
}

func (c *Client) AuditServiceConnections(ctx context.Context, projectID string) ([]ServiceConnectionAudit, error) {
    // List all service connections
    connections, err := c.serviceEndpointClient.GetServiceEndpoints(ctx, serviceendpoint.GetServiceEndpointsArgs{
        Project: &projectID,
    })
    if err != nil {
        return nil, err
    }

    var audits []ServiceConnectionAudit

    for _, conn := range *connections {
        audit := ServiceConnectionAudit{
            Name:             *conn.Name,
            BranchControlled: c.hasBranchControl(conn),
            ApprovalRequired: c.requiresApproval(conn),
            PermissionsScope: c.getScope(conn),
        }
        audits = append(audits, audit)
    }

    return audits, nil
}
```

---

## Python Pipeline Monitoring

```python
def monitor_pipeline_security(self, project_id: str, pipeline_id: int):
    """Monitor pipeline runs for security issues"""
    # Get recent runs
    runs = self.pipelines_client.list_runs(
        project=project_id,
        pipeline_id=pipeline_id
    )

    for run in runs:
        # Check for failures
        if run.state == 'completed' and run.result == 'failed':
            # Analyze failure logs
            logs = self.build_client.get_build_logs(
                project=project_id,
                build_id=run.id
            )

            # Check for security-related failures
            self.analyze_security_failures(logs)
```

---

## Related Resources

- [API Reference](api-reference.md)
- [Webhook Events](webhook-events.md)

# Work Item Integration

Patterns for integrating work items with security workflows.

---

## Create Work Item from Security Finding

```go
func (c *Client) CreateVulnerabilityWorkItem(ctx context.Context, projectID string, vuln Vulnerability) (*wit.WorkItem, error) {
    // Build JSON Patch document
    document := []webapi.JsonPatchOperation{
        {
            Op:    &webapi.OperationValues.Add,
            Path:  stringPtr("/fields/System.Title"),
            Value: fmt.Sprintf("%s - %s", vuln.CVE, vuln.Title),
        },
        {
            Op:    &webapi.OperationValues.Add,
            Path:  stringPtr("/fields/System.Description"),
            Value: vuln.Description,
        },
        {
            Op:    &webapi.OperationValues.Add,
            Path:  stringPtr("/fields/System.Tags"),
            Value: fmt.Sprintf("security;%s;cvss-%s", vuln.CVE, vuln.CVSSScore),
        },
        {
            Op:    &webapi.OperationValues.Add,
            Path:  stringPtr("/fields/Microsoft.VSTS.Common.Priority"),
            Value: c.cvssScoreToPriority(vuln.CVSSScore),
        },
        {
            Op:    &webapi.OperationValues.Add,
            Path:  stringPtr("/fields/Microsoft.VSTS.Common.Severity"),
            Value: vuln.Severity,
        },
    }

    args := wit.CreateWorkItemArgs{
        Document: &document,
        Project:  &projectID,
        Type:     stringPtr("Bug"),
    }

    workItem, err := c.witClient.CreateWorkItem(ctx, args)
    if err != nil {
        return nil, fmt.Errorf("failed to create work item: %w", err)
    }

    return workItem, nil
}
```

---

## Query Security Work Items (WIQL)

```go
func (c *Client) GetOpenSecurityWorkItems(ctx context.Context, projectID string) ([]wit.WorkItem, error) {
    wiql := `
SELECT [System.Id], [System.Title], [System.State], [System.Priority]
FROM workitems
WHERE
    [System.TeamProject] = @project
    AND [System.Tags] CONTAINS 'security'
    AND [System.State] <> 'Closed'
ORDER BY [Microsoft.VSTS.Common.Priority] ASC, [System.CreatedDate] DESC
`

    query := wit.Wiql{
        Query: &wiql,
    }

    args := wit.QueryByWiqlArgs{
        Wiql:    &query,
        Project: &projectID,
    }

    result, err := c.witClient.QueryByWiql(ctx, args)
    if err != nil {
        return nil, err
    }

    // Extract IDs
    var ids []int
    if result.WorkItems != nil {
        for _, item := range *result.WorkItems {
            ids = append(ids, *item.Id)
        }
    }

    // Batch fetch full work items
    if len(ids) == 0 {
        return []wit.WorkItem{}, nil
    }

    workItems, err := c.witClient.GetWorkItems(ctx, wit.GetWorkItemsArgs{
        Ids: &ids,
    })
    if err != nil {
        return nil, err
    }

    return *workItems, nil
}
```

---

## Update Work Item State

```go
func (c *Client) UpdateWorkItemState(ctx context.Context, workItemID int, newState string) error {
    document := []webapi.JsonPatchOperation{
        {
            Op:    &webapi.OperationValues.Replace,
            Path:  stringPtr("/fields/System.State"),
            Value: newState,
        },
    }

    args := wit.UpdateWorkItemArgs{
        Document: &document,
        Id:       &workItemID,
    }

    _, err := c.witClient.UpdateWorkItem(ctx, args)
    return err
}
```

---

## Link Work Item to PR/Commit

```go
func (c *Client) LinkWorkItemToCommit(ctx context.Context, workItemID int, commitURL string) error {
    document := []webapi.JsonPatchOperation{
        {
            Op:   &webapi.OperationValues.Add,
            Path: stringPtr("/relations/-"),
            Value: map[string]interface{}{
                "rel": "ArtifactLink",
                "url": commitURL,
                "attributes": map[string]string{
                    "name": "Fixed in Commit",
                },
            },
        },
    }

    args := wit.UpdateWorkItemArgs{
        Document: &document,
        Id:       &workItemID,
    }

    _, err := c.witClient.UpdateWorkItem(ctx, args)
    return err
}
```

---

## Python Work Item Automation

```python
def sync_vulnerability_to_work_item(self, project_id: str, vuln: Vulnerability):
    """Create or update work item for vulnerability"""
    # Search for existing work item
    wiql = f"""
    SELECT [System.Id]
    FROM workitems
    WHERE
        [System.TeamProject] = '{project_id}'
        AND [System.Tags] CONTAINS '{vuln.cve}'
        AND [System.State] <> 'Closed'
    """

    result = self.wit_client.query_by_wiql(Wiql(query=wiql), project=project_id)

    if result.work_items:
        # Update existing
        work_item_id = result.work_items[0].id
        self.update_work_item(work_item_id, vuln)
    else:
        # Create new
        self.create_vulnerability_work_item(project_id, vuln)
```

---

## Related Resources

- [API Reference](api-reference.md)
- [Webhook Events](webhook-events.md)

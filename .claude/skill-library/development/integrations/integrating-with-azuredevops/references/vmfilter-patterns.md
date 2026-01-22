# VMFilter Implementation Patterns

Complete examples demonstrating VMFilter integration for multi-tenancy enforcement in Azure DevOps integration.

---

## Complete Azure DevOps Workflow Examples

### Repository Discovery with VMFilter

```go
func (t *AzureDevOpsTask) DiscoverRepositories(ctx context.Context, project string) error {
    // 1. Fetch repositories from Azure DevOps API
    repos, err := t.Client.Git.GetRepositories(ctx, git.GetRepositoriesArgs{
        Project: &project,
    })
    if err != nil {
        return fmt.Errorf("failed to fetch repositories: %w", err)
    }

    // 2. Process each repository
    for _, repo := range *repos {
        // Map Azure DevOps repository to Chariot asset
        asset := MapRepositoryToAsset(repo)

        // REQUIRED: Apply VMFilter for multi-tenancy enforcement
        t.Filter.Asset(&asset)

        // Send filtered asset to job collector
        t.Job.Send(&asset)
    }

    return nil
}
```

### Work Item Risk Processing with VMFilter

```go
func (t *AzureDevOpsTask) ProcessSecurityWorkItems(ctx context.Context, project string) error {
    // 1. Query security-related work items
    wiql := "SELECT [System.Id] FROM WorkItems WHERE [System.WorkItemType] = 'Bug' AND [Microsoft.VSTS.Common.Severity] IN ('1 - Critical', '2 - High')"

    result, err := t.Client.WorkItemTracking.QueryByWiql(ctx, wit.QueryByWiqlArgs{
        Wiql: &wit.Wiql{Query: &wiql},
        Project: &project,
    })
    if err != nil {
        return fmt.Errorf("failed to query work items: %w", err)
    }

    // 2. Process each work item
    for _, ref := range *result.WorkItems {
        workItem, err := t.Client.WorkItemTracking.GetWorkItem(ctx, wit.GetWorkItemArgs{
            Id: ref.Id,
        })
        if err != nil {
            continue
        }

        // Map Azure DevOps work item to Chariot risk
        risk := MapWorkItemToRisk(*workItem)

        // REQUIRED: Apply VMFilter for multi-tenancy enforcement
        t.Filter.Risk(&risk)

        // Send filtered risk to job collector
        t.Job.Send(&risk)
    }

    return nil
}
```

### Pipeline Discovery with VMFilter

```go
func (t *AzureDevOpsTask) DiscoverPipelines(ctx context.Context, project string) error {
    // 1. Fetch pipelines from Azure DevOps API
    pipelines, err := t.Client.Pipelines.ListPipelines(ctx, pipelines.ListPipelinesArgs{
        Project: &project,
    })
    if err != nil {
        return fmt.Errorf("failed to fetch pipelines: %w", err)
    }

    // 2. Process each pipeline
    for _, pipeline := range *pipelines {
        // Map Azure DevOps pipeline to Chariot asset
        asset := MapPipelineToAsset(pipeline, project)

        // REQUIRED: Apply VMFilter for multi-tenancy enforcement
        t.Filter.Asset(&asset)

        // Send filtered asset to job collector
        t.Job.Send(&asset)
    }

    return nil
}
```

---

## Security Implications

**Why This Matters:**

Without VMFilter, a malicious user could:

1. Create a job with their username
2. Receive assets/risks belonging to other users' integrations
3. Access sensitive organizational data from other tenants
4. Violate compliance and data privacy requirements

The VMFilter ensures that each job only processes data visible to the authenticated user who created the job.

### Attack Scenario (Without VMFilter)

```
User A: Creates integration for "CompanyA" Azure DevOps
User B: Creates integration for "CompanyB" Azure DevOps
        WITHOUT VMFilter: User B receives CompanyA's assets
        WITH VMFilter: User B only receives CompanyB's assets
```

### Multi-Tenancy Boundaries

VMFilter enforces tenant isolation by:

- Tagging each asset/risk with the job owner's username
- Preventing cross-tenant data leakage in shared backend infrastructure
- Ensuring compliance with data privacy regulations (GDPR, SOC 2)
- Maintaining audit trails for security reviews

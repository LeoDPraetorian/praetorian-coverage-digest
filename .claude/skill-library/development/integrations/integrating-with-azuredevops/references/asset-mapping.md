# Asset Mapping

Mapping Azure DevOps entities to Chariot platform assets.

---

## Repository to Asset

**Chariot Model Constructor:**

```go
// Use Chariot's tabularium model.NewAsset() constructor
import "github.com/praetorian-inc/chariot/pkg/model"

func MapRepositoryToAsset(repo git.GitRepository) *model.Asset {
    dns := *repo.RemoteUrl // HTTPS clone URL
    ip := "" // Not applicable for repositories

    asset := model.NewAsset(dns, ip)
    asset.Class = "repository"
    asset.Source = "azuredevops"
    asset.Status = "A" // Active
    asset.Metadata = map[string]interface{}{
        "organization": extractOrg(*repo.RemoteUrl),
        "project":      *repo.Project.Name,
        "repository":   *repo.Name,
        "defaultBranch": *repo.DefaultBranch,
        "size":         *repo.Size,
        "isDisabled":   *repo.IsDisabled,
        "lastCommit":   getLastCommitDate(repo),
    }

    return asset
}
```

**Legacy struct (for reference only):**

```go
type Asset struct {
    DNS      string                 `json:"dns"`
    Class    string                 `json:"class"`
    Source   string                 `json:"source"`
    Status   string                 `json:"status"`
    Metadata map[string]interface{} `json:"metadata"`
}
```

---

## Pipeline to Asset

**Chariot Model Constructor:**

```go
// Use Chariot's tabularium model.NewAsset() constructor
func MapPipelineToAsset(pipeline pipelines.Pipeline, project, org string) *model.Asset {
    dns := fmt.Sprintf("pipeline://%s/%s/%d", org, project, *pipeline.Id)
    ip := "" // Not applicable for pipelines

    asset := model.NewAsset(dns, ip)
    asset.Class = "ci-cd-pipeline"
    asset.Source = "azuredevops"
    asset.Status = "A"
    asset.Metadata = map[string]interface{}{
        "pipelineID":   *pipeline.Id,
        "pipelineName": *pipeline.Name,
        "project":      project,
        "folder":       *pipeline.Folder,
    }

    return asset
}
```

---

## Work Item to Risk

**Chariot Model Constructor:**

```go
// Use Chariot's tabularium model.NewRisk() constructor
func MapWorkItemToRisk(workItem wit.WorkItem, targetAsset *model.Asset) *model.Risk {
    fields := workItem.Fields.(map[string]interface{})

    riskName := fields["System.Title"].(string)
    severity := mapSeverity(fields["Microsoft.VSTS.Common.Severity"])

    risk := model.NewRisk(targetAsset, riskName, severity)
    risk.Description = fields["System.Description"].(string)
    risk.Status = mapStatus(fields["System.State"].(string))
    risk.Source = "azuredevops"
    risk.Metadata = map[string]interface{}{
        "workItemID":   *workItem.Id,
        "workItemType": fields["System.WorkItemType"],
        "assignedTo":   fields["System.AssignedTo"],
        "tags":         fields["System.Tags"],
        "createdDate":  fields["System.CreatedDate"],
        "url":          *workItem.Url,
    }

    return risk
}
```

**Legacy struct (for reference only):**

```go
type Risk struct {
    Name        string                 `json:"name"`
    Description string                 `json:"description"`
    Severity    string                 `json:"severity"`
    Status      string                 `json:"status"`
    Source      string                 `json:"source"`
    Metadata    map[string]interface{} `json:"metadata"`
}
```

func mapSeverity(adoSeverity interface{}) string {
if adoSeverity == nil {
return "medium"
}

    switch adoSeverity.(string) {
    case "1 - Critical":
        return "critical"
    case "2 - High":
        return "high"
    case "3 - Medium":
        return "medium"
    case "4 - Low":
        return "low"
    default:
        return "medium"
    }

}

func mapStatus(adoState string) string {
switch adoState {
case "New", "Active":
return "open"
case "Resolved":
return "resolved"
case "Closed":
return "closed"
default:
return "open"
}
}

````

---

## Service Connection to Asset

```go
func MapServiceConnectionToAsset(conn serviceendpoint.ServiceEndpoint, project string) Asset {
    return Asset{
        DNS:    fmt.Sprintf("service-connection://%s/%s/%s", org, project, *conn.Id),
        Class:  "service-credential",
        Source: "azuredevops",
        Status: determineStatus(conn),
        Metadata: map[string]interface{}{
            "connectionID":   *conn.Id,
            "connectionName": *conn.Name,
            "connectionType": *conn.Type,
            "project":        project,
            "isShared":       *conn.IsShared,
            "isReady":        *conn.IsReady,
        },
    }
}
````

---

## Python Asset Mapping

```python
def map_repository_to_asset(repo) -> dict:
    """Map Azure DevOps repository to Chariot asset"""
    return {
        'dns': repo.remote_url,
        'class': 'repository',
        'source': 'azuredevops',
        'status': 'A',
        'metadata': {
            'organization': extract_org(repo.remote_url),
            'project': repo.project.name,
            'repository': repo.name,
            'defaultBranch': repo.default_branch,
            'size': repo.size,
            'isDisabled': repo.is_disabled,
        }
    }
```

---

## VMFilter (Multi-Tenancy Enforcement)

**Purpose**: Filter assets and risks by username to enforce multi-tenancy boundaries and prevent cross-tenant data leakage.

**P0 Requirement**: VMFilter is MANDATORY for all Chariot integrations. Without it, users can see assets/risks from other tenants, violating security boundaries.

### Requirements

1. **Initialize VMFilter in task struct:**

```go
type AzureDevOpsTask struct {
    Job    model.Job
    Filter filter.VMFilter // REQUIRED
    Client *azuredevops.Client
    // ... other fields
}

func (t *AzureDevOpsTask) Init(job model.Job) error {
    t.Job = job
    t.Filter = filter.NewVMFilter(job.Username) // REQUIRED
    // ... initialize client
    return nil
}
```

2. **Call `Filter.Asset(&asset)` BEFORE `Job.Send(&asset)`:**

```go
// ❌ WRONG - sends unfiltered asset
task.Job.Send(&asset)

// ✅ RIGHT - filters then sends
task.Filter.Asset(&asset)
task.Job.Send(&asset)
```

3. **Call `Filter.Risk(&risk)` BEFORE `Job.Send(&risk)`:**

```go
// ❌ WRONG - sends unfiltered risk
task.Job.Send(&risk)

// ✅ RIGHT - filters then sends
task.Filter.Risk(&risk)
task.Job.Send(&risk)
```

### Usage Pattern

```go
// In discovery methods: Always filter before sending
asset := MapRepositoryToAsset(repo)
t.Filter.Asset(&asset)
t.Job.Send(&asset)

// For risks: Same pattern
risk := MapWorkItemToRisk(workItem)
t.Filter.Risk(&risk)
t.Job.Send(&risk)
```

**For complete workflow examples**, see [vmfilter-patterns.md](vmfilter-patterns.md).

---

## CheckAffiliation (Ownership Verification)

**Purpose**: Verify that an asset still exists and is accessible to the authenticated user. Required for determining if previously discovered assets remain under the user's control.

**Pattern**: Azure DevOps uses **Pattern A (Direct Ownership Query)** because it provides single-resource lookup endpoints for repositories, pipelines, and work items.

### Pattern Selection Rationale

Azure DevOps supports single-asset lookup endpoints:

- **Repositories**: `GET /{organization}/{project}/_apis/git/repositories/{repositoryId}?api-version=7.1`
- **Pipelines**: `GET /{organization}/{project}/_apis/pipelines/{pipelineId}?api-version=7.1`
- **Work Items**: `GET /{organization}/_apis/wit/workitems/{id}?api-version=7.1`

This means Pattern A (Direct Ownership Query) is the correct and most efficient approach.

### Implementation

```go
func (task *AzureDevOpsTask) CheckAffiliation(asset model.Asset) (bool, error) {
    // 1. Validate credentials (REQUIRED)
    if err := task.ValidateCredentials(); err != nil {
        return false, fmt.Errorf("failed to authenticate with Azure DevOps: %w", err)
    }

    // 2. Validate required fields
    if asset.CloudId == "" {
        return false, fmt.Errorf("no cloud ID found for asset: %s", asset.Key)
    }

    // 3. Route to asset-type-specific verification
    switch asset.Class {
    case "repository":
        return task.checkRepositoryAffiliation(asset)
    case "ci-cd-pipeline":
        return task.checkPipelineAffiliation(asset)
    default:
        return false, fmt.Errorf("unsupported asset class: %s", asset.Class)
    }
}

func (task *AzureDevOpsTask) checkRepositoryAffiliation(asset model.Asset) (bool, error) {
    projectID, ok := asset.Metadata["project"].(string)
    if !ok {
        return false, fmt.Errorf("missing project metadata")
    }

    args := git.GetRepositoryArgs{
        Project:      &projectID,
        RepositoryId: &asset.CloudId,
    }

    repo, err := task.Client.Git.GetRepository(context.Background(), args)
    if err != nil {
        // Return false (not error) if repository doesn't exist
        if isNotFoundError(err) {
            return false, nil
        }
        return false, fmt.Errorf("querying repository: %w", err)
    }

    // Repository exists and is not disabled
    affiliated := repo.Id != nil && (repo.IsDisabled == nil || !*repo.IsDisabled)
    return affiliated, nil
}

func (task *AzureDevOpsTask) checkPipelineAffiliation(asset model.Asset) (bool, error) {
    projectID, ok := asset.Metadata["project"].(string)
    if !ok {
        return false, fmt.Errorf("missing project metadata")
    }

    pipelineIDStr, ok := asset.Metadata["pipelineID"].(string)
    if !ok {
        return false, fmt.Errorf("missing pipelineID metadata")
    }
    pipelineID, _ := strconv.Atoi(pipelineIDStr)

    args := pipelines.GetPipelineArgs{
        Project:    &projectID,
        PipelineId: &pipelineID,
    }

    pipeline, err := task.Client.Pipelines.GetPipeline(context.Background(), args)
    if err != nil {
        // Return false (not error) if pipeline doesn't exist
        if isNotFoundError(err) {
            return false, nil
        }
        return false, fmt.Errorf("querying pipeline: %w", err)
    }

    // Pipeline exists
    return pipeline.Id != nil, nil
}

// Helper to detect "not found" errors from Azure DevOps SDK
func isNotFoundError(err error) bool {
    if err == nil {
        return false
    }
    errStr := strings.ToLower(err.Error())
    return strings.Contains(errStr, "404") ||
           strings.Contains(errStr, "not found") ||
           strings.Contains(errStr, "does not exist")
}
```

### Error Handling Rules

| Response                | Return Value     | Meaning                             |
| ----------------------- | ---------------- | ----------------------------------- |
| 200 OK + valid resource | `(true, nil)`    | Asset exists and is accessible      |
| 404 Not Found           | `(false, nil)`   | Asset doesn't exist - NOT an error  |
| 403 Forbidden           | `(false, error)` | Authentication issue - return error |
| 5xx Server Error        | `(false, error)` | API failure - return error          |

**Critical**: Return `(false, nil)` for "not found" responses, not an error. Only return errors for API failures or authentication issues.

---

## Related Resources

- [Client Implementation](client-implementation.md)
- [VMFilter Patterns](vmfilter-patterns.md) - Complete workflow examples
- [CheckAffiliation Patterns](../../developing-integrations/references/checkaffiliation-patterns.md)
- [Developing Integrations - Mandatory Requirements](../../developing-integrations/references/mandatory-requirements.md)

---

**For complete Chariot tabularium model reference** (all constructors, field mappings, and type definitions), see:

- [developing-integrations/references/tabularium-mapping.md](../../developing-integrations/references/tabularium-mapping.md)

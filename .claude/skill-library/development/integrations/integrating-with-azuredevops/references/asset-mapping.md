# Asset Mapping

Mapping Azure DevOps entities to Chariot platform assets.

---

## Repository to Asset

```go
type Asset struct {
    DNS      string                 `json:"dns"`
    Class    string                 `json:"class"`
    Source   string                 `json:"source"`
    Status   string                 `json:"status"`
    Metadata map[string]interface{} `json:"metadata"`
}

func MapRepositoryToAsset(repo git.GitRepository) Asset {
    return Asset{
        DNS:    *repo.RemoteUrl, // HTTPS clone URL
        Class:  "repository",
        Source: "azuredevops",
        Status: "A", // Active
        Metadata: map[string]interface{}{
            "organization": extractOrg(*repo.RemoteUrl),
            "project":      *repo.Project.Name,
            "repository":   *repo.Name,
            "defaultBranch": *repo.DefaultBranch,
            "size":         *repo.Size,
            "isDisabled":   *repo.IsDisabled,
            "lastCommit":   getLastCommitDate(repo),
        },
    }
}
```

---

## Pipeline to Asset

```go
func MapPipelineToAsset(pipeline pipelines.Pipeline, project string) Asset {
    return Asset{
        DNS:    fmt.Sprintf("pipeline://%s/%s/%d", org, project, *pipeline.Id),
        Class:  "ci-cd-pipeline",
        Source: "azuredevops",
        Status: "A",
        Metadata: map[string]interface{}{
            "pipelineID":   *pipeline.Id,
            "pipelineName": *pipeline.Name,
            "project":      project,
            "folder":       *pipeline.Folder,
        },
    }
}
```

---

## Work Item to Risk

```go
type Risk struct {
    Name        string                 `json:"name"`
    Description string                 `json:"description"`
    Severity    string                 `json:"severity"`
    Status      string                 `json:"status"`
    Source      string                 `json:"source"`
    Metadata    map[string]interface{} `json:"metadata"`
}

func MapWorkItemToRisk(workItem wit.WorkItem) Risk {
    fields := workItem.Fields.(map[string]interface{})

    return Risk{
        Name:        fields["System.Title"].(string),
        Description: fields["System.Description"].(string),
        Severity:    mapSeverity(fields["Microsoft.VSTS.Common.Severity"]),
        Status:      mapStatus(fields["System.State"].(string)),
        Source:      "azuredevops",
        Metadata: map[string]interface{}{
            "workItemID":   *workItem.Id,
            "workItemType": fields["System.WorkItemType"],
            "assignedTo":   fields["System.AssignedTo"],
            "tags":         fields["System.Tags"],
            "createdDate":  fields["System.CreatedDate"],
            "url":          *workItem.Url,
        },
    }
}

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
```

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
```

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

## Related Resources

- [Client Implementation](client-implementation.md)
- [Integration Patterns](integration-patterns.md)

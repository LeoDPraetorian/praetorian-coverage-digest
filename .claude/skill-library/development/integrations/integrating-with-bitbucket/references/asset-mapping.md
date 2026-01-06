# Chariot Asset Mapping for Bitbucket

**Mapping Bitbucket repositories to Chariot's asset/risk data model.**

---

## Bitbucket Repository → Chariot Asset

### Data Model Mapping

| Bitbucket Field | Chariot Field    | Transformation             |
| --------------- | ---------------- | -------------------------- |
| `full_name`     | `name`           | Direct mapping             |
| HTTPS clone URL | `dns`            | Extract from `links.clone` |
| `is_private`    | Custom metadata  | Boolean flag               |
| `language`      | `class` modifier | Add to metadata            |
| `updated_on`    | `last_seen`      | Parse ISO 8601 timestamp   |
| `description`   | Custom metadata  | Direct mapping             |

### Go Implementation

```go
type ChariotAsset struct {
    DNS      string                 `json:"dns"`
    Name     string                 `json:"name"`
    Class    string                 `json:"class"`
    Source   string                 `json:"source"`
    Status   string                 `json:"status"`
    Metadata map[string]interface{} `json:"metadata"`
}

func (r *BitbucketRepo) ToChariotAsset() *ChariotAsset {
    // Extract HTTPS clone URL
    cloneURL := ""
    for _, link := range r.Links.Clone {
        if link.Name == "https" {
            cloneURL = link.Href
            break
        }
    }

    return &ChariotAsset{
        DNS:    cloneURL,
        Name:   r.FullName,
        Class:  "repository",
        Source: "bitbucket",
        Status: "A",  // Active
        Metadata: map[string]interface{}{
            "full_name":   r.FullName,
            "description": r.Description,
            "private":     r.IsPrivate,
            "language":    r.Language,
            "updated_on":  r.UpdatedOn.Format(time.RFC3339),
            "workspace":   extractWorkspace(r.FullName),
            "repo_slug":   r.Name,
        },
    }
}

func extractWorkspace(fullName string) string {
    parts := strings.Split(fullName, "/")
    if len(parts) > 0 {
        return parts[0]
    }
    return ""
}
```

### Python Implementation

```python
def to_chariot_asset(bitbucket_repo: Dict[str, Any]) -> Dict[str, Any]:
    """Convert Bitbucket repository to Chariot asset."""

    # Extract HTTPS clone URL
    clone_url = ""
    for link in bitbucket_repo.get("links", {}).get("clone", []):
        if link.get("name") == "https":
            clone_url = link.get("href", "")
            break

    # Extract workspace from full_name
    full_name = bitbucket_repo.get("full_name", "")
    workspace = full_name.split("/")[0] if "/" in full_name else ""

    return {
        "dns": clone_url,
        "name": full_name,
        "class": "repository",
        "source": "bitbucket",
        "status": "A",  # Active
        "metadata": {
            "full_name": full_name,
            "description": bitbucket_repo.get("description", ""),
            "private": bitbucket_repo.get("is_private", False),
            "language": bitbucket_repo.get("language", ""),
            "updated_on": bitbucket_repo.get("updated_on", ""),
            "workspace": workspace,
            "repo_slug": bitbucket_repo.get("name", ""),
        }
    }
```

---

## Pull Request → Chariot Risk

### Security Risk Mapping

```go
type ChariotRisk struct {
    AssetDNS    string                 `json:"asset_dns"`
    RiskType    string                 `json:"risk_type"`
    Severity    string                 `json:"severity"`
    Title       string                 `json:"title"`
    Description string                 `json:"description"`
    Status      string                 `json:"status"`
    Metadata    map[string]interface{} `json:"metadata"`
}

func PRToSecurityRisk(pr *PullRequest, scanResults *SecurityScanResults) *ChariotRisk {
    if scanResults.SecretsFound == 0 && scanResults.VulnsFound == 0 {
        return nil  // No risk
    }

    severity := calculateSeverity(scanResults)

    return &ChariotRisk{
        AssetDNS:    pr.Source.Repository.Links.Clone["https"].Href,
        RiskType:    "code-vulnerability",
        Severity:    severity,
        Title:       fmt.Sprintf("Security issues in PR #%d", pr.ID),
        Description: fmt.Sprintf("%d secrets, %d vulnerabilities found",
            scanResults.SecretsFound, scanResults.VulnsFound),
        Status:      pr.State,  // OPEN, MERGED, DECLINED
        Metadata: map[string]interface{}{
            "pr_id":          pr.ID,
            "pr_title":       pr.Title,
            "author":         pr.Author.DisplayName,
            "source_branch":  pr.Source.Branch.Name,
            "secrets_found":  scanResults.SecretsFound,
            "vulns_found":    scanResults.VulnsFound,
            "scan_timestamp": time.Now().Format(time.RFC3339),
        },
    }
}

func calculateSeverity(results *SecurityScanResults) string {
    if results.SecretsFound > 0 {
        return "critical"
    }
    if results.VulnsFound > 5 {
        return "high"
    }
    if results.VulnsFound > 0 {
        return "medium"
    }
    return "low"
}
```

---

## Sync Patterns

### Pattern 1: Webhook-Driven Sync

```go
func (h *WebhookHandler) handleRepoPush(payload map[string]interface{}) {
    repo := payload["repository"].(map[string]interface{})

    // Convert to Chariot asset
    asset := toBitbucketRepo(repo).ToChariotAsset()

    // Upsert in Chariot
    if err := h.chariotClient.UpsertAsset(asset); err != nil {
        log.Printf("Failed to sync asset: %v", err)
        return
    }

    // Trigger security scan
    h.triggerSecurityScan(asset.DNS)
}
```

### Pattern 2: Scheduled Full Sync

```go
func (s *BitbucketSyncService) FullSync(workspace string) error {
    // List all repositories
    repos, err := s.bitbucketClient.ListRepositories(workspace)
    if err != nil {
        return err
    }

    var assets []*ChariotAsset
    for _, repo := range repos {
        assets = append(assets, repo.ToChariotAsset())
    }

    // Bulk upsert in Chariot
    return s.chariotClient.BulkUpsertAssets(assets)
}
```

### Pattern 3: Incremental Sync

```go
func (s *BitbucketSyncService) IncrementalSync(workspace string, since time.Time) error {
    // Fetch repositories updated since last sync
    repos, err := s.bitbucketClient.ListRepositories(workspace)
    if err != nil {
        return err
    }

    var changedAssets []*ChariotAsset
    for _, repo := range repos {
        if repo.UpdatedOn.After(since) {
            changedAssets = append(changedAssets, repo.ToChariotAsset())
        }
    }

    if len(changedAssets) == 0 {
        return nil
    }

    return s.chariotClient.BulkUpsertAssets(changedAssets)
}
```

---

## Chariot API Integration

### Upsert Asset

```go
func (c *ChariotClient) UpsertAsset(asset *ChariotAsset) error {
    payload := map[string]interface{}{
        "dns":      asset.DNS,
        "name":     asset.Name,
        "class":    asset.Class,
        "source":   asset.Source,
        "status":   asset.Status,
        "metadata": asset.Metadata,
    }

    resp, err := c.httpClient.Post(c.BaseURL+"/api/assets", "application/json",
        bytes.NewBuffer(mustMarshalJSON(payload)))
    if err != nil {
        return err
    }
    defer resp.Body.Close()

    if resp.StatusCode != http.StatusOK && resp.StatusCode != http.StatusCreated {
        return fmt.Errorf("upsert failed: status %d", resp.StatusCode)
    }

    return nil
}
```

---

## Related Documentation

- [client-implementation.md](client-implementation.md) - Bitbucket API client
- [webhook-events.md](webhook-events.md) - Webhook-driven sync patterns
- [integration-patterns.md](integration-patterns.md) - Complete sync architectures

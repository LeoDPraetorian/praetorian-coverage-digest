# Integration Patterns

**Complete integration architectures for Bitbucket + Chariot platform.**

---

## Pattern 1: Repository Scanner

**Use Case:** Discover and scan all Bitbucket repositories for security vulnerabilities.

**Architecture:**

1. Scheduled job (every 6 hours) lists all repositories in workspace
2. Filter by criteria (visibility, language, last activity)
3. Map each repository to Chariot asset
4. Trigger security scans (Nuclei templates, secret scanning)
5. Update asset risk scores based on scan results

**Go Implementation:**

```go
func (s *RepositoryScanner) ScanWorkspace(workspace string) error {
    // List repositories
    repos, err := s.bitbucketClient.ListRepositories(workspace)
    if err != nil {
        return err
    }

    for _, repo := range repos {
        // Map to Chariot asset
        asset := repo.ToChariotAsset()
        s.chariotClient.UpsertAsset(asset)

        // Trigger scans
        go s.runSecurityScans(asset)
    }

    return nil
}
```

---

## Pattern 2: PR Security Bot

**Use Case:** Automatically scan PRs for secrets/vulnerabilities and post results.

**Architecture:**

1. Receive `pullrequest:created/updated` webhook
2. Fetch PR diff via API
3. Run security scans (noseyparker, Nuclei)
4. Post scan results as PR comment
5. Update PR approval status based on findings

**See:** [pr-automation.md](pr-automation.md) for complete implementation.

---

## Pattern 3: Asset Sync

**Use Case:** Keep Chariot assets synchronized with Bitbucket repositories.

**Architecture:**

- **Webhook-driven**: Real-time updates on `repo:push`, `repo:updated`
- **Scheduled sync**: Full sync every 24 hours as fallback
- **Incremental sync**: Fetch only changed repositories since last sync

**See:** [asset-mapping.md](asset-mapping.md) for implementation details.

---

## Pattern 4: Compliance Enforcer

**Use Case:** Enforce branch protection, required reviewers, approval policies.

**Architecture:**

1. Receive `pullrequest:created` webhook
2. Check PR meets compliance requirements:
   - Source branch naming convention
   - Required reviewers assigned
   - Minimum approval count
   - All status checks passing
3. Post compliance report as PR comment
4. Block merge if non-compliant

---

## Related Documentation

- [pr-automation.md](pr-automation.md) - PR automation workflows
- [webhook-events.md](webhook-events.md) - Webhook integration
- [asset-mapping.md](asset-mapping.md) - Chariot data model mapping

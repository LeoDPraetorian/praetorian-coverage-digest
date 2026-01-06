# Chariot GitLab Integration Patterns

## Existing Implementations

### Backend Integration

**Location:** `modules/chariot/backend/pkg/tasks/integrations/gitlab/gitlab.go`

**Capabilities:**

- Asset discovery from GitLab repositories
- CI/CD pipeline enumeration
- Webhook integration for real-time updates

### Security Capabilities

**Location:** `modules/chariot-aegis-capabilities/.../gitlab-pat-scanner/`

**Features:**

- Personal Access Token validation
- Credential scanning in repositories
- Token enumeration

### GATO/GLATO Tools

**Location:** `modules/go-gato/glato/`, `modules/go-gato/gato-x/`

**Research:** `modules/go-gato/CICD_ATTACK_TOOLS_RESEARCH_SYNTHESIS.md`

## Recommended Patterns

### Authentication

```go
// Use AWS Secrets Manager for token storage
token, err := secrets.GetGitLabToken(ctx, "gitlab/chariot-prod-api")
if err != nil {
    return fmt.Errorf("failed to get token: %w", err)
}

client, err := gitlab.NewClient(token.Value)
```

### Rate Limiting

```go
// Chariot API client with unified rate limiting
type ChariotGitLabClient struct {
    client      *gitlab.Client
    rateLimiter *RateLimiter
}

func (c *ChariotGitLabClient) Get(path string) (*Response, error) {
    // Check rate limit before request
    if err := c.rateLimiter.Wait(ctx); err != nil {
        return nil, err
    }

    resp, err := c.client.Get(path)

    // Update rate limiter from headers
    c.rateLimiter.UpdateFromHeaders(resp.Header)

    return resp, err
}
```

### Asset Discovery

```go
// Enumerate GitLab projects as Chariot assets
func DiscoverGitLabAssets(ctx context.Context, token string) ([]*Asset, error) {
    client, _ := gitlab.NewClient(token)

    projects, _, err := client.Projects.ListProjects(&gitlab.ListProjectsOptions{
        Membership: gitlab.Bool(true),
    })

    var assets []*Asset
    for _, proj := range projects {
        asset := &Asset{
            Type:        "gitlab_repository",
            Name:        proj.PathWithNamespace,
            URL:         proj.WebURL,
            Visibility:  proj.Visibility,
            LastActivity: proj.LastActivityAt,
        }
        assets = append(assets, asset)
    }

    return assets, nil
}
```

### Runner Security Assessment

```go
// GLATO-inspired runner enumeration for Chariot
func AssessRunnerSecurity(ctx context.Context, token string) ([]*RunnerVulnerability, error) {
    client, _ := gitlab.NewClient(token)

    runners, _, err := client.Runners.ListAllRunners(nil)

    var vulns []*RunnerVulnerability
    for _, runner := range runners {
        // Check for privileged mode (requires config access)
        if runner.RunUntagged && runner.Active {
            vulns = append(vulns, &RunnerVulnerability{
                RunnerID:    runner.ID,
                Severity:    "high",
                Description: "Shared runner accessible to all projects",
                Mitigation:  "Use dedicated runners for sensitive workloads",
            })
        }
    }

    return vulns, nil
}
```

### Webhook Integration

```go
// Chariot webhook handler for GitLab events
func HandleGitLabWebhook(w http.ResponseWriter, r *http.Request) {
    // Validate webhook token
    if !security.VerifyGitLabWebhook(r, webhookSecret) {
        http.Error(w, "Invalid token", http.StatusUnauthorized)
        return
    }

    eventType := r.Header.Get("X-Gitlab-Event")

    switch eventType {
    case "Push Hook":
        handlePushEvent(r.Body)
    case "Pipeline Hook":
        handlePipelineEvent(r.Body)
    case "Merge Request Hook":
        handleMREvent(r.Body)
    }

    w.WriteStatus(200)
}
```

## Integration Roadmap

### Phase 1 (Q1 2026)

- [ ] Runner enumeration via GLATO patterns
- [ ] Token compromise impact assessment
- [ ] Privileged mode detection

### Phase 2 (Q2 2026)

- [ ] Workflow vulnerability scanning
- [ ] Secret exposure detection in artifacts
- [ ] `.gitlab-ci.yml` security analysis

### Phase 3 (Q3 2026)

- [ ] OIDC integration documentation
- [ ] NoseyParker artifact scanning
- [ ] VQL capabilities for GitLab detection

For comprehensive integration patterns, see:
`.claude/.output/research/2026-01-04-205433-gitlab-integration-security/SYNTHESIS.md`

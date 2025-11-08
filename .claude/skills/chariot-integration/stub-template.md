# Backend Integration Stub Template

## servicename.go

```go
package integrations

import (
    "fmt"
    "log/slog"
    "net/http"
    "time"

    "github.com/praetorian-inc/chariot/backend/pkg/compute/registries"
    "github.com/praetorian-inc/chariot/backend/pkg/lib/filter"
    "github.com/praetorian-inc/chariot/backend/pkg/tasks/xyz"
    "github.com/praetorian-inc/tabularium/pkg/model/attacksurface"
    "github.com/praetorian-inc/tabularium/pkg/model/model"
)

func init() {
    registries.RegisterChariotCapability(&ServiceName{}, NewServiceName)
}

type ServiceName struct {
    Job    model.Job
    Asset  model.Integration
    client *http.Client
    Filter model.Filter
    xyz.XYZ
}

func NewServiceName(job model.Job, asset model.Integration,) model.Capability {
    return &ServiceName{
        Job:    job,
        Asset:  asset,
        Filter: filter.NewVMFilter(job.Username),
        client: &http.Client{Timeout: 30 * time.Second},
        XYZ:    xyz.NewXYZ(job.Target.Model, xyz.WithStatic()),
    }
}

func (task *ServiceName) Name() string { return "servicename" }
func (task *ServiceName) Title() string { return "ServiceName" }
func (task *ServiceName) Description() string {
    return "discovers security assets and vulnerabilities from ServiceName platform"
}
func (task *ServiceName) Integration() bool { return true }
func (task *ServiceName) Surface() attacksurface.Surface { return attacksurface.External }
func (task *ServiceName) CredentialType() model.CredentialType { return model.TokenCredential }
func (task *ServiceName) Timeout() int { return 180 }

func (task *ServiceName) Match() error {
    if !task.Asset.IsClass("servicename") {
        return fmt.Errorf("expected integration class 'servicename', got '%s'", task.Asset.Class)
    }
    return nil
}

func (task *ServiceName) ValidateCredentials() error {
    token := task.Job.Secret["token"]
    if token == "" {
        return fmt.Errorf("missing API token")
    }

    // Test authentication
    req, err := http.NewRequest("GET", task.Asset.Value+"/api/user", nil)
    req.Header.Set("Authorization", "Bearer "+token)

    resp, err := task.client.Do(req)
    if err != nil {
        return fmt.Errorf("authentication test failed: %w", err)
    }
    defer resp.Body.Close()

    if resp.StatusCode != http.StatusOK {
        return fmt.Errorf("invalid credentials")
    }

    return nil
}

func (task *ServiceName) Invoke() error {
    if err := task.ValidateCredentials(); err != nil {
        return err
    }

    slog.Warn("ServiceName can only collect credentials currently")
    return nil
}
```

## servicename_test.go

```go
package servicename

import (
	"testing"

	"github.com/praetorian-inc/chariot/backend/pkg/testutils/matching"
	"github.com/praetorian-inc/tabularium/pkg/model/model"
	"github.com/stretchr/testify/require"
)

func TestServiceName_Match(t *testing.T) {
	tests := []struct {
		name        string
		integration model.Integration
		expected    bool
	}{
		{
			name:        "matches servicename integration",
			integration: model.NewIntegration("servicename", "https://servicename.example.com"),
			expected:    true,
		},
		{
			name:        "does not match wrong class",
			integration: model.NewIntegration("nessus", "https://example.com"),
			expected:    false,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			integration := tt.integration
			integration.Status = model.Active

			job := model.NewJob("test", &integration)
			capability := NewServiceName(job, integration)

			err := capability.Match()

			if tt.expected {
				require.NoError(t, err, "expected match to succeed for servicename on integration %s", integration.Key)
			} else {
				require.Error(t, err, "expected match to fail for servicename on integration %s", integration.Key)
			}
		})
	}
}

func TestServiceName_Accept(t *testing.T) {
	matching.AssertAcceptLogic(t, NewServiceName, matching.ExpectedAccept{
		Pending:       false,
		Frozen:        false,
		ActivePassive: true,
		ActiveLow:     true,
		Active:        true,
		ActiveHigh:    true,
	})
}
```

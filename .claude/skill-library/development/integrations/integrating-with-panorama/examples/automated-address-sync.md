# Automated Address Object Synchronization

**Description:** Complete Go implementation for synchronizing Chariot assets to Panorama address objects, enabling automated firewall policy management as new assets are discovered or existing assets change.

**Last Updated:** 2025-01-04

---

## Prerequisites

- Panorama API access with read/write permissions
- Chariot API credentials configured
- Go 1.21+
- Dependencies: `github.com/PaloAltoNetworks/pango`

---

## Complete Implementation

```go
package panorama

import (
	"context"
	"fmt"
	"log"
	"strings"
	"sync"
	"time"

	"github.com/PaloAltoNetworks/pango"
	"github.com/PaloAltoNetworks/pango/objs/addr"
	"github.com/PaloAltoNetworks/pango/objs/addrgrp"
	"github.com/PaloAltoNetworks/pango/commit"
)

// SyncConfig holds configuration for the sync process
type SyncConfig struct {
	PanoramaHost     string
	PanoramaUsername string
	PanoramaPassword string
	PanoramaAPIKey   string
	DeviceGroup      string
	AddressPrefix    string        // Prefix for Chariot-managed objects
	SyncInterval     time.Duration
	BatchSize        int
	DryRun           bool
	AutoCommit       bool
	CommitTimeout    time.Duration
}

// SyncOperation represents a single sync operation
type SyncOperation struct {
	Type      string // "create", "update", "delete"
	AssetKey  string
	OldObject *addr.Entry
	NewObject *addr.Entry
	Error     error
	Timestamp time.Time
}

// SyncResult contains the result of a sync operation
type SyncResult struct {
	Created    int
	Updated    int
	Deleted    int
	Errors     int
	Operations []SyncOperation
	Duration   time.Duration
	CommitJob  string
}

// AddressSyncer handles synchronization between Chariot and Panorama
type AddressSyncer struct {
	config   SyncConfig
	panorama *pango.Panorama
	logger   *log.Logger
	mu       sync.RWMutex
}

// ChariotAsset represents an asset from the Chariot platform
type ChariotAsset struct {
	Key        string            `json:"key"`
	Name       string            `json:"name"`
	DNS        string            `json:"dns"`
	Class      string            `json:"class"`
	Status     string            `json:"status"`
	Tags       []string          `json:"tags"`
	Attributes map[string]string `json:"attributes"`
	UpdatedAt  time.Time         `json:"updated"`
}

// NewAddressSyncer creates a new syncer instance
func NewAddressSyncer(config SyncConfig, logger *log.Logger) (*AddressSyncer, error) {
	pan := &pango.Panorama{
		Client: pango.Client{
			Hostname: config.PanoramaHost,
			Username: config.PanoramaUsername,
			Password: config.PanoramaPassword,
			ApiKey:   config.PanoramaAPIKey,
			Logging:  pango.LogQuiet,
		},
	}

	if err := pan.Initialize(); err != nil {
		return nil, fmt.Errorf("failed to initialize Panorama client: %w", err)
	}

	if config.AddressPrefix == "" {
		config.AddressPrefix = "chariot-"
	}
	if config.BatchSize == 0 {
		config.BatchSize = 50
	}
	if config.CommitTimeout == 0 {
		config.CommitTimeout = 10 * time.Minute
	}

	return &AddressSyncer{
		config:   config,
		panorama: pan,
		logger:   logger,
	}, nil
}

// SyncAssets synchronizes Chariot assets to Panorama address objects
func (s *AddressSyncer) SyncAssets(ctx context.Context, assets []ChariotAsset) (*SyncResult, error) {
	startTime := time.Now()
	result := &SyncResult{
		Operations: make([]SyncOperation, 0),
	}

	// Get current Panorama address objects with Chariot prefix
	existingObjects, err := s.getChariotManagedObjects()
	if err != nil {
		return nil, fmt.Errorf("failed to fetch existing objects: %w", err)
	}

	s.logger.Printf("Found %d existing Chariot-managed address objects", len(existingObjects))

	// Build maps for comparison
	existingMap := make(map[string]addr.Entry)
	for _, obj := range existingObjects {
		existingMap[obj.Name] = obj
	}

	assetMap := make(map[string]ChariotAsset)
	for _, asset := range assets {
		if s.isValidForSync(asset) {
			assetMap[s.generateObjectName(asset)] = asset
		}
	}

	// Determine operations
	var creates, updates, deletes []SyncOperation

	// Find creates and updates
	for name, asset := range assetMap {
		newObj := s.assetToAddressObject(asset)
		if existing, exists := existingMap[name]; exists {
			if s.objectNeedsUpdate(existing, newObj) {
				updates = append(updates, SyncOperation{
					Type:      "update",
					AssetKey:  asset.Key,
					OldObject: &existing,
					NewObject: &newObj,
				})
			}
		} else {
			creates = append(creates, SyncOperation{
				Type:      "create",
				AssetKey:  asset.Key,
				NewObject: &newObj,
			})
		}
	}

	// Find deletes
	for name, existing := range existingMap {
		if _, exists := assetMap[name]; !exists {
			existingCopy := existing
			deletes = append(deletes, SyncOperation{
				Type:      "delete",
				OldObject: &existingCopy,
			})
		}
	}

	s.logger.Printf("Sync plan: %d creates, %d updates, %d deletes",
		len(creates), len(updates), len(deletes))

	// Execute operations in batches
	if !s.config.DryRun {
		s.executeOperations(ctx, creates, result, "create")
		s.executeOperations(ctx, updates, result, "update")
		s.executeOperations(ctx, deletes, result, "delete")
	} else {
		result.Created = len(creates)
		result.Updated = len(updates)
		result.Deleted = len(deletes)
		result.Operations = append(result.Operations, creates...)
		result.Operations = append(result.Operations, updates...)
		result.Operations = append(result.Operations, deletes...)
	}

	// Commit changes if configured
	if s.config.AutoCommit && !s.config.DryRun && (result.Created+result.Updated+result.Deleted > 0) {
		commitResult, err := s.commitChanges(ctx)
		if err != nil {
			s.logger.Printf("Warning: commit failed: %v", err)
		} else {
			result.CommitJob = commitResult
		}
	}

	result.Duration = time.Since(startTime)
	return result, nil
}

// getChariotManagedObjects retrieves address objects with the Chariot prefix
func (s *AddressSyncer) getChariotManagedObjects() ([]addr.Entry, error) {
	allObjects, err := s.panorama.Objects.Address.GetAll(s.config.DeviceGroup)
	if err != nil {
		return nil, err
	}

	var managed []addr.Entry
	for _, obj := range allObjects {
		if strings.HasPrefix(obj.Name, s.config.AddressPrefix) {
			managed = append(managed, obj)
		}
	}
	return managed, nil
}

// isValidForSync determines if an asset should be synced
func (s *AddressSyncer) isValidForSync(asset ChariotAsset) bool {
	// Only sync active assets
	if asset.Status != "A" {
		return false
	}

	// Only sync IP addresses and FQDNs
	validClasses := map[string]bool{
		"ipv4":     true,
		"ipv6":     true,
		"hostname": true,
		"domain":   true,
	}
	return validClasses[asset.Class]
}

// generateObjectName generates a Panorama object name from an asset
func (s *AddressSyncer) generateObjectName(asset ChariotAsset) string {
	// Use asset key to ensure uniqueness, sanitized for Panorama
	safeName := strings.ReplaceAll(asset.Key, "#", "-")
	safeName = strings.ReplaceAll(safeName, "/", "-")
	if len(safeName) > 60 {
		safeName = safeName[:60]
	}
	return s.config.AddressPrefix + safeName
}

// assetToAddressObject converts a Chariot asset to a Panorama address object
func (s *AddressSyncer) assetToAddressObject(asset ChariotAsset) addr.Entry {
	entry := addr.Entry{
		Name:        s.generateObjectName(asset),
		Description: fmt.Sprintf("Chariot asset: %s (updated: %s)", asset.Name, asset.UpdatedAt.Format(time.RFC3339)),
		Tags:        s.convertTags(asset.Tags),
	}

	switch asset.Class {
	case "ipv4":
		entry.Type = addr.IpNetmask
		entry.Value = asset.Name + "/32"
	case "ipv6":
		entry.Type = addr.IpNetmask
		entry.Value = asset.Name + "/128"
	case "hostname", "domain":
		entry.Type = addr.Fqdn
		entry.Value = asset.DNS
		if entry.Value == "" {
			entry.Value = asset.Name
		}
	}

	return entry
}

// convertTags converts Chariot tags to Panorama-compatible tags
func (s *AddressSyncer) convertTags(tags []string) []string {
	var panoramaTags []string
	for _, tag := range tags {
		// Sanitize tag names for Panorama
		safeTag := strings.ReplaceAll(tag, " ", "-")
		safeTag = strings.ReplaceAll(safeTag, ":", "-")
		if len(safeTag) > 127 {
			safeTag = safeTag[:127]
		}
		panoramaTags = append(panoramaTags, safeTag)
	}
	// Add Chariot-managed tag
	panoramaTags = append(panoramaTags, "chariot-managed")
	return panoramaTags
}

// objectNeedsUpdate determines if an existing object needs updating
func (s *AddressSyncer) objectNeedsUpdate(existing, new addr.Entry) bool {
	if existing.Value != new.Value {
		return true
	}
	if existing.Type != new.Type {
		return true
	}
	// Don't compare description as it contains timestamp
	return false
}

// executeOperations executes a batch of sync operations
func (s *AddressSyncer) executeOperations(ctx context.Context, ops []SyncOperation, result *SyncResult, opType string) {
	for i := 0; i < len(ops); i += s.config.BatchSize {
		end := i + s.config.BatchSize
		if end > len(ops) {
			end = len(ops)
		}
		batch := ops[i:end]

		for j := range batch {
			op := &batch[j]
			op.Timestamp = time.Now()

			var err error
			switch opType {
			case "create":
				err = s.panorama.Objects.Address.Set(s.config.DeviceGroup, *op.NewObject)
				if err == nil {
					result.Created++
				}
			case "update":
				err = s.panorama.Objects.Address.Edit(s.config.DeviceGroup, *op.NewObject)
				if err == nil {
					result.Updated++
				}
			case "delete":
				err = s.panorama.Objects.Address.Delete(s.config.DeviceGroup, op.OldObject.Name)
				if err == nil {
					result.Deleted++
				}
			}

			if err != nil {
				op.Error = err
				result.Errors++
				s.logger.Printf("Error %s %s: %v", opType, op.NewObject.Name, err)
			}

			result.Operations = append(result.Operations, *op)
		}

		s.logger.Printf("Processed %d/%d %s operations", end, len(ops), opType)
	}
}

// commitChanges commits pending changes to Panorama
func (s *AddressSyncer) commitChanges(ctx context.Context) (string, error) {
	s.logger.Println("Initiating Panorama commit...")

	cmd := commit.PanoramaCommit{
		Description:  "Chariot asset sync",
		DeviceGroups: []string{s.config.DeviceGroup},
	}

	jobID, _, err := s.panorama.Commit(cmd, "", nil)
	if err != nil {
		return "", fmt.Errorf("commit failed: %w", err)
	}

	s.logger.Printf("Commit job started: %d", jobID)

	// Wait for commit to complete
	err = s.waitForCommit(ctx, jobID)
	if err != nil {
		return fmt.Sprintf("%d", jobID), err
	}

	s.logger.Printf("Commit job %d completed successfully", jobID)
	return fmt.Sprintf("%d", jobID), nil
}

// waitForCommit waits for a commit job to complete
func (s *AddressSyncer) waitForCommit(ctx context.Context, jobID uint) error {
	timeout := time.After(s.config.CommitTimeout)
	ticker := time.NewTicker(5 * time.Second)
	defer ticker.Stop()

	for {
		select {
		case <-ctx.Done():
			return ctx.Err()
		case <-timeout:
			return fmt.Errorf("commit timeout after %v", s.config.CommitTimeout)
		case <-ticker.C:
			status, err := s.panorama.GetJobStatus(jobID)
			if err != nil {
				return fmt.Errorf("failed to check job status: %w", err)
			}

			if status.Status == "FIN" {
				if status.Result == "OK" {
					return nil
				}
				return fmt.Errorf("commit failed: %s", status.Details)
			}
		}
	}
}

// SyncAddressGroups syncs Chariot asset groups to Panorama address groups
func (s *AddressSyncer) SyncAddressGroups(ctx context.Context, groupMapping map[string][]string) error {
	for groupName, assetKeys := range groupMapping {
		members := make([]string, 0, len(assetKeys))
		for _, key := range assetKeys {
			members = append(members, s.config.AddressPrefix+strings.ReplaceAll(key, "#", "-"))
		}

		group := addrgrp.Entry{
			Name:            s.config.AddressPrefix + groupName,
			Description:     "Chariot-managed address group",
			StaticAddresses: members,
			Tags:            []string{"chariot-managed"},
		}

		err := s.panorama.Objects.AddressGroup.Set(s.config.DeviceGroup, group)
		if err != nil {
			s.logger.Printf("Failed to sync group %s: %v", groupName, err)
			continue
		}
		s.logger.Printf("Synced address group: %s (%d members)", groupName, len(members))
	}

	return nil
}
```

---

## Configuration Example

```yaml
# config.yaml
panorama:
  host: "panorama.example.com"
  username: "${PANORAMA_USER}"
  password: "${PANORAMA_PASS}"
  device_group: "Chariot-Production"

sync:
  prefix: "chariot-"
  interval: "15m"
  batch_size: 50
  dry_run: false
  auto_commit: true
  commit_timeout: "10m"

filters:
  asset_classes:
    - ipv4
    - ipv6
    - hostname
  asset_status:
    - A
```

---

## Usage Example

```go
func main() {
	logger := log.New(os.Stdout, "[SYNC] ", log.LstdFlags)

	config := SyncConfig{
		PanoramaHost:     os.Getenv("PANORAMA_HOST"),
		PanoramaUsername: os.Getenv("PANORAMA_USER"),
		PanoramaPassword: os.Getenv("PANORAMA_PASS"),
		DeviceGroup:      "Production-DG",
		AddressPrefix:    "chariot-",
		BatchSize:        50,
		AutoCommit:       true,
		DryRun:           false,
	}

	syncer, err := NewAddressSyncer(config, logger)
	if err != nil {
		log.Fatalf("Failed to create syncer: %v", err)
	}

	// Fetch assets from Chariot (simplified)
	assets := []ChariotAsset{
		{Key: "web-server-1", Name: "10.0.1.50", Class: "ipv4", Status: "A"},
		{Key: "api-endpoint", Name: "api.example.com", DNS: "api.example.com", Class: "hostname", Status: "A"},
	}

	ctx := context.Background()
	result, err := syncer.SyncAssets(ctx, assets)
	if err != nil {
		log.Fatalf("Sync failed: %v", err)
	}

	fmt.Printf("Sync completed in %v\n", result.Duration)
	fmt.Printf("Created: %d, Updated: %d, Deleted: %d, Errors: %d\n",
		result.Created, result.Updated, result.Deleted, result.Errors)
	if result.CommitJob != "" {
		fmt.Printf("Commit job: %s\n", result.CommitJob)
	}
}
```

---

## Expected Output

```
[SYNC] Found 47 existing Chariot-managed address objects
[SYNC] Sync plan: 2 creates, 1 updates, 3 deletes
[SYNC] Processed 2/2 create operations
[SYNC] Processed 1/1 update operations
[SYNC] Processed 3/3 delete operations
[SYNC] Initiating Panorama commit...
[SYNC] Commit job started: 1847
[SYNC] Commit job 1847 completed successfully
Sync completed in 45.23s
Created: 2, Updated: 1, Deleted: 3, Errors: 0
Commit job: 1847
```

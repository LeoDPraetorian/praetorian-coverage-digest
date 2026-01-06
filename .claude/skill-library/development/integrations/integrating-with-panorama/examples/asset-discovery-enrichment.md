# Asset Discovery Enrichment with Panorama

**Description:** Complete Go implementation for enriching Chariot assets with Panorama firewall policy data, enabling security teams to identify unprotected assets and understand their firewall coverage.

**Last Updated:** 2025-01-04

---

## Prerequisites

- Panorama API access with read permissions
- Chariot API credentials configured
- Go 1.21+
- Dependencies: `github.com/PaloAltoNetworks/pango`

---

## Complete Implementation

```go
package panorama

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"net"
	"strings"
	"sync"
	"time"

	"github.com/PaloAltoNetworks/pango"
	"github.com/PaloAltoNetworks/pango/objs/addr"
	"github.com/PaloAltoNetworks/pango/poli/security"
)

// EnrichmentConfig holds configuration for the enrichment process
type EnrichmentConfig struct {
	PanoramaHost     string
	PanoramaUsername string
	PanoramaPassword string
	PanoramaAPIKey   string
	DeviceGroup      string
	ChariotAPIURL    string
	ChariotAPIKey    string
	BatchSize        int
	Workers          int
}

// ChariotAsset represents an asset from the Chariot platform
type ChariotAsset struct {
	Key         string            `json:"key"`
	Name        string            `json:"name"`
	DNS         string            `json:"dns"`
	Class       string            `json:"class"`
	Status      string            `json:"status"`
	Source      string            `json:"source"`
	Attributes  map[string]string `json:"attributes"`
	CreatedAt   time.Time         `json:"created"`
	UpdatedAt   time.Time         `json:"updated"`
}

// EnrichmentResult contains the result of enriching a single asset
type EnrichmentResult struct {
	Asset           ChariotAsset
	AddressObjects  []addr.Entry
	MatchingRules   []security.Entry
	IsProtected     bool
	ProtectionLevel string
	Zones           []string
	Profiles        []string
	Error           error
}

// AssetEnricher handles enrichment of Chariot assets with Panorama data
type AssetEnricher struct {
	config     EnrichmentConfig
	panorama   *pango.Panorama
	logger     *log.Logger
	cache      *PolicyCache
	mu         sync.RWMutex
}

// PolicyCache caches Panorama policy data to reduce API calls
type PolicyCache struct {
	addressObjects map[string]addr.Entry
	securityRules  []security.Entry
	lastRefresh    time.Time
	ttl            time.Duration
	mu             sync.RWMutex
}

// NewAssetEnricher creates a new enricher instance
func NewAssetEnricher(config EnrichmentConfig, logger *log.Logger) (*AssetEnricher, error) {
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

	return &AssetEnricher{
		config:   config,
		panorama: pan,
		logger:   logger,
		cache: &PolicyCache{
			addressObjects: make(map[string]addr.Entry),
			ttl:            5 * time.Minute,
		},
	}, nil
}

// RefreshCache refreshes the policy cache from Panorama
func (e *AssetEnricher) RefreshCache(ctx context.Context) error {
	e.cache.mu.Lock()
	defer e.cache.mu.Unlock()

	// Fetch address objects
	addrList, err := e.panorama.Objects.Address.GetAll(e.config.DeviceGroup)
	if err != nil {
		return fmt.Errorf("failed to fetch address objects: %w", err)
	}

	e.cache.addressObjects = make(map[string]addr.Entry)
	for _, obj := range addrList {
		e.cache.addressObjects[obj.Name] = obj
		if obj.Value != "" {
			e.cache.addressObjects[obj.Value] = obj
		}
	}

	// Fetch security rules
	rulebase := "pre-rulebase"
	rules, err := e.panorama.Policies.Security.GetAll(e.config.DeviceGroup, rulebase)
	if err != nil {
		return fmt.Errorf("failed to fetch security rules: %w", err)
	}
	e.cache.securityRules = rules
	e.cache.lastRefresh = time.Now()

	e.logger.Printf("Cache refreshed: %d address objects, %d security rules",
		len(e.cache.addressObjects), len(e.cache.securityRules))

	return nil
}

// EnrichAssets enriches a batch of Chariot assets with Panorama data
func (e *AssetEnricher) EnrichAssets(ctx context.Context, assets []ChariotAsset) ([]EnrichmentResult, error) {
	// Check if cache needs refresh
	e.cache.mu.RLock()
	needsRefresh := time.Since(e.cache.lastRefresh) > e.cache.ttl
	e.cache.mu.RUnlock()

	if needsRefresh {
		if err := e.RefreshCache(ctx); err != nil {
			e.logger.Printf("Warning: cache refresh failed: %v", err)
		}
	}

	results := make([]EnrichmentResult, len(assets))
	resultChan := make(chan struct {
		index  int
		result EnrichmentResult
	}, len(assets))

	// Create worker pool
	sem := make(chan struct{}, e.config.Workers)
	var wg sync.WaitGroup

	for i, asset := range assets {
		wg.Add(1)
		go func(idx int, a ChariotAsset) {
			defer wg.Done()
			sem <- struct{}{}
			defer func() { <-sem }()

			result := e.enrichSingleAsset(ctx, a)
			resultChan <- struct {
				index  int
				result EnrichmentResult
			}{idx, result}
		}(i, asset)
	}

	go func() {
		wg.Wait()
		close(resultChan)
	}()

	for r := range resultChan {
		results[r.index] = r.result
	}

	return results, nil
}

// enrichSingleAsset enriches a single asset with Panorama data
func (e *AssetEnricher) enrichSingleAsset(ctx context.Context, asset ChariotAsset) EnrichmentResult {
	result := EnrichmentResult{Asset: asset}

	// Find matching address objects
	matchingAddrs := e.findMatchingAddressObjects(asset)
	result.AddressObjects = matchingAddrs

	if len(matchingAddrs) == 0 {
		result.IsProtected = false
		result.ProtectionLevel = "none"
		e.logger.Printf("Asset %s has no matching address objects", asset.Name)
		return result
	}

	// Find security rules that reference these address objects
	addrNames := make([]string, len(matchingAddrs))
	for i, a := range matchingAddrs {
		addrNames[i] = a.Name
	}

	matchingRules := e.findMatchingSecurityRules(addrNames)
	result.MatchingRules = matchingRules

	if len(matchingRules) == 0 {
		result.IsProtected = false
		result.ProtectionLevel = "partial"
		e.logger.Printf("Asset %s has address objects but no matching rules", asset.Name)
		return result
	}

	// Analyze protection level
	result.IsProtected = true
	result.ProtectionLevel = e.analyzeProtectionLevel(matchingRules)
	result.Zones = e.extractZones(matchingRules)
	result.Profiles = e.extractSecurityProfiles(matchingRules)

	return result
}

// findMatchingAddressObjects finds Panorama address objects matching an asset
func (e *AssetEnricher) findMatchingAddressObjects(asset ChariotAsset) []addr.Entry {
	e.cache.mu.RLock()
	defer e.cache.mu.RUnlock()

	var matches []addr.Entry

	// Check by exact IP match
	if asset.Class == "ipv4" || asset.Class == "ipv6" {
		if obj, ok := e.cache.addressObjects[asset.Name]; ok {
			matches = append(matches, obj)
		}
	}

	// Check by DNS/FQDN match
	if asset.DNS != "" {
		for _, obj := range e.cache.addressObjects {
			if obj.Type == addr.Fqdn && obj.Value == asset.DNS {
				matches = append(matches, obj)
			}
		}
	}

	// Check if IP is within any network ranges
	if ip := net.ParseIP(asset.Name); ip != nil {
		for _, obj := range e.cache.addressObjects {
			if obj.Type == addr.IpNetmask {
				_, network, err := net.ParseCIDR(obj.Value)
				if err == nil && network.Contains(ip) {
					matches = append(matches, obj)
				}
			}
		}
	}

	return matches
}

// findMatchingSecurityRules finds rules that reference the given address objects
func (e *AssetEnricher) findMatchingSecurityRules(addrNames []string) []security.Entry {
	e.cache.mu.RLock()
	defer e.cache.mu.RUnlock()

	addrSet := make(map[string]bool)
	for _, name := range addrNames {
		addrSet[name] = true
	}

	var matches []security.Entry
	for _, rule := range e.cache.securityRules {
		if rule.Disabled {
			continue
		}

		// Check source and destination addresses
		for _, src := range rule.SourceAddresses {
			if addrSet[src] {
				matches = append(matches, rule)
				break
			}
		}
		for _, dst := range rule.DestinationAddresses {
			if addrSet[dst] {
				matches = append(matches, rule)
				break
			}
		}
	}

	return matches
}

// analyzeProtectionLevel determines the protection level based on rules
func (e *AssetEnricher) analyzeProtectionLevel(rules []security.Entry) string {
	hasAllowAll := false
	hasDenyAll := false
	hasProfiledAllow := false

	for _, rule := range rules {
		if rule.Action == "allow" {
			if e.hasSecurityProfiles(rule) {
				hasProfiledAllow = true
			}
			if e.isWildcardRule(rule) {
				hasAllowAll = true
			}
		} else if rule.Action == "deny" || rule.Action == "drop" {
			if e.isWildcardRule(rule) {
				hasDenyAll = true
			}
		}
	}

	if hasDenyAll && hasProfiledAllow {
		return "high"
	} else if hasProfiledAllow {
		return "medium"
	} else if hasAllowAll {
		return "low"
	}
	return "basic"
}

func (e *AssetEnricher) hasSecurityProfiles(rule security.Entry) bool {
	return rule.Group != "" ||
		rule.Virus != "" ||
		rule.Spyware != "" ||
		rule.Vulnerability != "" ||
		rule.UrlFiltering != "" ||
		rule.WildFire != ""
}

func (e *AssetEnricher) isWildcardRule(rule security.Entry) bool {
	for _, src := range rule.SourceAddresses {
		if src == "any" {
			return true
		}
	}
	for _, dst := range rule.DestinationAddresses {
		if dst == "any" {
			return true
		}
	}
	return false
}

func (e *AssetEnricher) extractZones(rules []security.Entry) []string {
	zoneSet := make(map[string]bool)
	for _, rule := range rules {
		for _, z := range rule.SourceZones {
			zoneSet[z] = true
		}
		for _, z := range rule.DestinationZones {
			zoneSet[z] = true
		}
	}
	zones := make([]string, 0, len(zoneSet))
	for z := range zoneSet {
		zones = append(zones, z)
	}
	return zones
}

func (e *AssetEnricher) extractSecurityProfiles(rules []security.Entry) []string {
	profileSet := make(map[string]bool)
	for _, rule := range rules {
		if rule.Group != "" {
			profileSet[rule.Group] = true
		}
		if rule.Virus != "" {
			profileSet["av:"+rule.Virus] = true
		}
		if rule.Vulnerability != "" {
			profileSet["vuln:"+rule.Vulnerability] = true
		}
	}
	profiles := make([]string, 0, len(profileSet))
	for p := range profileSet {
		profiles = append(profiles, p)
	}
	return profiles
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
  device_group: "Chariot-Managed"

chariot:
  api_url: "https://api.chariot.praetorian.com"
  api_key: "${CHARIOT_API_KEY}"

enrichment:
  batch_size: 100
  workers: 10
  cache_ttl: "5m"
```

---

## Usage Example

```go
func main() {
	logger := log.New(os.Stdout, "[ENRICHMENT] ", log.LstdFlags)

	config := EnrichmentConfig{
		PanoramaHost:     os.Getenv("PANORAMA_HOST"),
		PanoramaUsername: os.Getenv("PANORAMA_USER"),
		PanoramaPassword: os.Getenv("PANORAMA_PASS"),
		DeviceGroup:      "Production-DG",
		Workers:          10,
	}

	enricher, err := NewAssetEnricher(config, logger)
	if err != nil {
		log.Fatalf("Failed to create enricher: %v", err)
	}

	// Fetch assets from Chariot (simplified)
	assets := []ChariotAsset{
		{Key: "asset-1", Name: "192.168.1.100", Class: "ipv4"},
		{Key: "asset-2", Name: "web.example.com", DNS: "web.example.com", Class: "hostname"},
	}

	ctx := context.Background()
	results, err := enricher.EnrichAssets(ctx, assets)
	if err != nil {
		log.Fatalf("Enrichment failed: %v", err)
	}

	for _, r := range results {
		fmt.Printf("Asset: %s, Protected: %v, Level: %s, Zones: %v\n",
			r.Asset.Name, r.IsProtected, r.ProtectionLevel, r.Zones)
	}
}
```

---

## Expected Output

```
[ENRICHMENT] Cache refreshed: 1523 address objects, 847 security rules
Asset: 192.168.1.100, Protected: true, Level: high, Zones: [internal dmz]
Asset: web.example.com, Protected: true, Level: medium, Zones: [dmz external]
```

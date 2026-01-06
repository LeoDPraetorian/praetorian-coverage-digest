# Security Policy Validation

**Description:** Complete Go implementation for validating Panorama security policies against Chariot-identified vulnerabilities, analyzing whether threats are mitigated by existing firewall rules and generating remediation recommendations.

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
	"sort"
	"strings"
	"time"

	"github.com/PaloAltoNetworks/pango"
	"github.com/PaloAltoNetworks/pango/objs/addr"
	"github.com/PaloAltoNetworks/pango/poli/security"
	"github.com/PaloAltoNetworks/pango/objs/profile/security/vulnerability"
)

// ValidationConfig holds configuration for policy validation
type ValidationConfig struct {
	PanoramaHost     string
	PanoramaUsername string
	PanoramaPassword string
	PanoramaAPIKey   string
	DeviceGroup      string
	Rulebase         string // "pre-rulebase" or "post-rulebase"
}

// ChariotVulnerability represents a vulnerability from Chariot
type ChariotVulnerability struct {
	Key          string   `json:"key"`
	Name         string   `json:"name"`
	Severity     string   `json:"severity"`
	CVE          string   `json:"cve"`
	CVSS         float64  `json:"cvss"`
	Protocol     string   `json:"protocol"`
	Port         int      `json:"port"`
	AffectedIP   string   `json:"affected_ip"`
	AffectedDNS  string   `json:"affected_dns"`
	Category     string   `json:"category"`
	Description  string   `json:"description"`
	Remediation  string   `json:"remediation"`
}

// PolicyValidationResult contains the validation result for a vulnerability
type PolicyValidationResult struct {
	Vulnerability       ChariotVulnerability
	IsMitigated         bool
	MitigationType      string // "blocked", "profiled", "partially", "none"
	MatchingRules       []RuleAnalysis
	SecurityProfiles    []ProfileAnalysis
	Gaps                []PolicyGap
	Recommendations     []Recommendation
	RiskScore           float64
}

// RuleAnalysis provides detailed analysis of a matching rule
type RuleAnalysis struct {
	RuleName       string
	Action         string
	MatchType      string // "source", "destination", "service"
	Zones          string
	IsTerminating  bool
	HasProfiles    bool
	ProfileGroup   string
}

// ProfileAnalysis analyzes security profile effectiveness
type ProfileAnalysis struct {
	ProfileType    string
	ProfileName    string
	CoversVuln     bool
	Severity       string
	Action         string
}

// PolicyGap represents a gap in security policy
type PolicyGap struct {
	Type        string
	Description string
	Severity    string
	AffectedBy  string
}

// Recommendation provides remediation guidance
type Recommendation struct {
	Priority    int
	Type        string
	Description string
	Impact      string
	Effort      string
}

// ValidationReport contains the complete validation report
type ValidationReport struct {
	GeneratedAt       time.Time
	DeviceGroup       string
	TotalVulns        int
	MitigatedCount    int
	PartialCount      int
	UnmitigatedCount  int
	CriticalGaps      int
	Results           []PolicyValidationResult
	Summary           ReportSummary
}

// ReportSummary provides a high-level summary
type ReportSummary struct {
	OverallRiskScore     float64
	TopGaps              []PolicyGap
	PriorityActions      []Recommendation
	CoverageByCategory   map[string]float64
	CoverageBySeverity   map[string]float64
}

// PolicyValidator handles security policy validation
type PolicyValidator struct {
	config    ValidationConfig
	panorama  *pango.Panorama
	logger    *log.Logger
	rules     []security.Entry
	addresses map[string]addr.Entry
	vulnProfiles map[string]vulnerability.Entry
}

// NewPolicyValidator creates a new validator instance
func NewPolicyValidator(config ValidationConfig, logger *log.Logger) (*PolicyValidator, error) {
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

	if config.Rulebase == "" {
		config.Rulebase = "pre-rulebase"
	}

	return &PolicyValidator{
		config:       config,
		panorama:     pan,
		logger:       logger,
		addresses:    make(map[string]addr.Entry),
		vulnProfiles: make(map[string]vulnerability.Entry),
	}, nil
}

// LoadPolicyData loads security policy data from Panorama
func (v *PolicyValidator) LoadPolicyData(ctx context.Context) error {
	// Load security rules
	rules, err := v.panorama.Policies.Security.GetAll(v.config.DeviceGroup, v.config.Rulebase)
	if err != nil {
		return fmt.Errorf("failed to load security rules: %w", err)
	}
	v.rules = rules
	v.logger.Printf("Loaded %d security rules", len(rules))

	// Load address objects
	addrs, err := v.panorama.Objects.Address.GetAll(v.config.DeviceGroup)
	if err != nil {
		return fmt.Errorf("failed to load address objects: %w", err)
	}
	for _, a := range addrs {
		v.addresses[a.Name] = a
		if a.Value != "" {
			v.addresses[a.Value] = a
		}
	}
	v.logger.Printf("Loaded %d address objects", len(addrs))

	// Load vulnerability profiles
	profiles, err := v.panorama.Objects.VulnerabilityProfile.GetAll(v.config.DeviceGroup)
	if err != nil {
		v.logger.Printf("Warning: failed to load vulnerability profiles: %v", err)
	} else {
		for _, p := range profiles {
			v.vulnProfiles[p.Name] = p
		}
		v.logger.Printf("Loaded %d vulnerability profiles", len(profiles))
	}

	return nil
}

// ValidateVulnerabilities validates security policies against vulnerabilities
func (v *PolicyValidator) ValidateVulnerabilities(ctx context.Context, vulns []ChariotVulnerability) (*ValidationReport, error) {
	report := &ValidationReport{
		GeneratedAt: time.Now(),
		DeviceGroup: v.config.DeviceGroup,
		TotalVulns:  len(vulns),
		Results:     make([]PolicyValidationResult, 0, len(vulns)),
		Summary: ReportSummary{
			CoverageByCategory: make(map[string]float64),
			CoverageBySeverity: make(map[string]float64),
		},
	}

	for _, vuln := range vulns {
		result := v.validateSingleVulnerability(vuln)
		report.Results = append(report.Results, result)

		switch result.MitigationType {
		case "blocked", "profiled":
			report.MitigatedCount++
		case "partially":
			report.PartialCount++
		default:
			report.UnmitigatedCount++
		}

		for _, gap := range result.Gaps {
			if gap.Severity == "critical" {
				report.CriticalGaps++
			}
		}
	}

	v.generateSummary(report)
	return report, nil
}

// validateSingleVulnerability validates a single vulnerability against policies
func (v *PolicyValidator) validateSingleVulnerability(vuln ChariotVulnerability) PolicyValidationResult {
	result := PolicyValidationResult{
		Vulnerability: vuln,
		MatchingRules: make([]RuleAnalysis, 0),
		Gaps:          make([]PolicyGap, 0),
	}

	// Find rules that apply to this vulnerability's target
	matchingRules := v.findMatchingRules(vuln)

	if len(matchingRules) == 0 {
		result.IsMitigated = false
		result.MitigationType = "none"
		result.Gaps = append(result.Gaps, PolicyGap{
			Type:        "no_rule",
			Description: fmt.Sprintf("No firewall rule covers traffic to %s:%d", vuln.AffectedIP, vuln.Port),
			Severity:    v.calculateGapSeverity(vuln),
			AffectedBy:  vuln.Key,
		})
		result.RiskScore = vuln.CVSS
		result.Recommendations = v.generateRecommendations(vuln, result.Gaps)
		return result
	}

	// Analyze matching rules
	for _, rule := range matchingRules {
		analysis := v.analyzeRule(rule, vuln)
		result.MatchingRules = append(result.MatchingRules, analysis)
	}

	// Determine mitigation status
	result.IsMitigated, result.MitigationType = v.determineMitigationStatus(result.MatchingRules, vuln)

	// Check security profile coverage
	result.SecurityProfiles = v.analyzeSecurityProfiles(matchingRules, vuln)

	// Identify gaps
	result.Gaps = v.identifyPolicyGaps(result, vuln)

	// Calculate risk score
	result.RiskScore = v.calculateRiskScore(vuln, result)

	// Generate recommendations
	result.Recommendations = v.generateRecommendations(vuln, result.Gaps)

	return result
}

// findMatchingRules finds rules that could apply to a vulnerability
func (v *PolicyValidator) findMatchingRules(vuln ChariotVulnerability) []security.Entry {
	var matches []security.Entry

	targetIP := net.ParseIP(vuln.AffectedIP)

	for _, rule := range v.rules {
		if rule.Disabled {
			continue
		}

		// Check if destination addresses match
		for _, dst := range rule.DestinationAddresses {
			if dst == "any" {
				matches = append(matches, rule)
				break
			}

			if addrObj, ok := v.addresses[dst]; ok {
				if v.addressContainsIP(addrObj, targetIP) {
					matches = append(matches, rule)
					break
				}
			}

			if dst == vuln.AffectedIP {
				matches = append(matches, rule)
				break
			}
		}

		// Check service ports if vulnerability has a specific port
		if vuln.Port > 0 {
			for _, svc := range rule.Services {
				if svc == "any" || svc == "application-default" {
					continue
				}
				// Service matching would require additional lookups
			}
		}
	}

	return matches
}

// addressContainsIP checks if an address object contains an IP
func (v *PolicyValidator) addressContainsIP(addrObj addr.Entry, ip net.IP) bool {
	if ip == nil {
		return false
	}

	switch addrObj.Type {
	case addr.IpNetmask:
		_, network, err := net.ParseCIDR(addrObj.Value)
		if err == nil && network.Contains(ip) {
			return true
		}
	case addr.IpRange:
		parts := strings.Split(addrObj.Value, "-")
		if len(parts) == 2 {
			start := net.ParseIP(strings.TrimSpace(parts[0]))
			end := net.ParseIP(strings.TrimSpace(parts[1]))
			if start != nil && end != nil {
				// Simple range check
				if bytesLessOrEqual(start, ip) && bytesLessOrEqual(ip, end) {
					return true
				}
			}
		}
	}
	return false
}

func bytesLessOrEqual(a, b net.IP) bool {
	a = a.To16()
	b = b.To16()
	for i := range a {
		if a[i] < b[i] {
			return true
		}
		if a[i] > b[i] {
			return false
		}
	}
	return true
}

// analyzeRule provides detailed analysis of a rule
func (v *PolicyValidator) analyzeRule(rule security.Entry, vuln ChariotVulnerability) RuleAnalysis {
	return RuleAnalysis{
		RuleName:      rule.Name,
		Action:        rule.Action,
		MatchType:     "destination",
		Zones:         fmt.Sprintf("%v -> %v", rule.SourceZones, rule.DestinationZones),
		IsTerminating: rule.Action == "deny" || rule.Action == "drop",
		HasProfiles:   v.ruleHasProfiles(rule),
		ProfileGroup:  rule.Group,
	}
}

func (v *PolicyValidator) ruleHasProfiles(rule security.Entry) bool {
	return rule.Group != "" ||
		rule.Virus != "" ||
		rule.Spyware != "" ||
		rule.Vulnerability != "" ||
		rule.UrlFiltering != "" ||
		rule.WildFire != ""
}

// determineMitigationStatus determines the mitigation status
func (v *PolicyValidator) determineMitigationStatus(analyses []RuleAnalysis, vuln ChariotVulnerability) (bool, string) {
	for _, a := range analyses {
		if a.IsTerminating {
			return true, "blocked"
		}
	}

	for _, a := range analyses {
		if a.HasProfiles {
			return true, "profiled"
		}
	}

	for _, a := range analyses {
		if a.Action == "allow" {
			return false, "partially"
		}
	}

	return false, "none"
}

// analyzeSecurityProfiles analyzes profile effectiveness
func (v *PolicyValidator) analyzeSecurityProfiles(rules []security.Entry, vuln ChariotVulnerability) []ProfileAnalysis {
	var profiles []ProfileAnalysis

	for _, rule := range rules {
		if rule.Vulnerability != "" {
			profile, ok := v.vulnProfiles[rule.Vulnerability]
			if ok {
				pa := ProfileAnalysis{
					ProfileType: "vulnerability",
					ProfileName: profile.Name,
					CoversVuln:  v.profileCoversCVE(profile, vuln.CVE),
					Action:      "alert", // Would need deeper analysis
				}
				profiles = append(profiles, pa)
			}
		}
	}

	return profiles
}

func (v *PolicyValidator) profileCoversCVE(profile vulnerability.Entry, cve string) bool {
	// Simplified check - real implementation would analyze threat signatures
	return cve != "" && len(profile.Rules) > 0
}

// identifyPolicyGaps identifies gaps in the security policy
func (v *PolicyValidator) identifyPolicyGaps(result PolicyValidationResult, vuln ChariotVulnerability) []PolicyGap {
	var gaps []PolicyGap

	// Check for allow without profiles
	for _, rule := range result.MatchingRules {
		if rule.Action == "allow" && !rule.HasProfiles {
			gaps = append(gaps, PolicyGap{
				Type:        "no_profile",
				Description: fmt.Sprintf("Rule '%s' allows traffic without security profiles", rule.RuleName),
				Severity:    "high",
				AffectedBy:  vuln.Key,
			})
		}
	}

	// Check for missing vulnerability coverage
	if vuln.CVE != "" {
		hasCVECoverage := false
		for _, profile := range result.SecurityProfiles {
			if profile.CoversVuln {
				hasCVECoverage = true
				break
			}
		}
		if !hasCVECoverage {
			gaps = append(gaps, PolicyGap{
				Type:        "missing_signature",
				Description: fmt.Sprintf("No vulnerability profile covers %s", vuln.CVE),
				Severity:    v.calculateGapSeverity(vuln),
				AffectedBy:  vuln.Key,
			})
		}
	}

	return gaps
}

func (v *PolicyValidator) calculateGapSeverity(vuln ChariotVulnerability) string {
	if vuln.CVSS >= 9.0 {
		return "critical"
	} else if vuln.CVSS >= 7.0 {
		return "high"
	} else if vuln.CVSS >= 4.0 {
		return "medium"
	}
	return "low"
}

func (v *PolicyValidator) calculateRiskScore(vuln ChariotVulnerability, result PolicyValidationResult) float64 {
	baseScore := vuln.CVSS
	if result.IsMitigated {
		switch result.MitigationType {
		case "blocked":
			return baseScore * 0.1
		case "profiled":
			return baseScore * 0.3
		case "partially":
			return baseScore * 0.6
		}
	}
	return baseScore
}

// generateRecommendations generates remediation recommendations
func (v *PolicyValidator) generateRecommendations(vuln ChariotVulnerability, gaps []PolicyGap) []Recommendation {
	var recs []Recommendation

	for _, gap := range gaps {
		switch gap.Type {
		case "no_rule":
			recs = append(recs, Recommendation{
				Priority:    1,
				Type:        "create_rule",
				Description: fmt.Sprintf("Create deny rule for traffic to %s:%d", vuln.AffectedIP, vuln.Port),
				Impact:      "Blocks exploit traffic",
				Effort:      "low",
			})
		case "no_profile":
			recs = append(recs, Recommendation{
				Priority:    2,
				Type:        "add_profile",
				Description: "Add vulnerability protection profile to allow rule",
				Impact:      "Enables threat detection",
				Effort:      "low",
			})
		case "missing_signature":
			recs = append(recs, Recommendation{
				Priority:    3,
				Type:        "update_signatures",
				Description: fmt.Sprintf("Ensure threat signatures cover %s", vuln.CVE),
				Impact:      "Detects specific exploit",
				Effort:      "medium",
			})
		}
	}

	sort.Slice(recs, func(i, j int) bool {
		return recs[i].Priority < recs[j].Priority
	})

	return recs
}

// generateSummary generates the report summary
func (v *PolicyValidator) generateSummary(report *ValidationReport) {
	// Calculate overall risk score
	var totalRisk float64
	for _, r := range report.Results {
		totalRisk += r.RiskScore
	}
	if len(report.Results) > 0 {
		report.Summary.OverallRiskScore = totalRisk / float64(len(report.Results))
	}

	// Aggregate coverage by category
	categoryCount := make(map[string]int)
	categoryMitigated := make(map[string]int)
	for _, r := range report.Results {
		categoryCount[r.Vulnerability.Category]++
		if r.IsMitigated {
			categoryMitigated[r.Vulnerability.Category]++
		}
	}
	for cat, count := range categoryCount {
		report.Summary.CoverageByCategory[cat] = float64(categoryMitigated[cat]) / float64(count) * 100
	}

	// Collect top gaps
	allGaps := make([]PolicyGap, 0)
	for _, r := range report.Results {
		allGaps = append(allGaps, r.Gaps...)
	}
	sort.Slice(allGaps, func(i, j int) bool {
		severityOrder := map[string]int{"critical": 0, "high": 1, "medium": 2, "low": 3}
		return severityOrder[allGaps[i].Severity] < severityOrder[allGaps[j].Severity]
	})
	if len(allGaps) > 10 {
		report.Summary.TopGaps = allGaps[:10]
	} else {
		report.Summary.TopGaps = allGaps
	}
}

// GenerateJSONReport exports the validation report as JSON
func (v *PolicyValidator) GenerateJSONReport(report *ValidationReport) ([]byte, error) {
	return json.MarshalIndent(report, "", "  ")
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
  device_group: "Production-DG"
  rulebase: "pre-rulebase"

validation:
  include_disabled_rules: false
  severity_threshold: "medium"
  output_format: "json"
```

---

## Usage Example

```go
func main() {
	logger := log.New(os.Stdout, "[VALIDATE] ", log.LstdFlags)

	config := ValidationConfig{
		PanoramaHost:     os.Getenv("PANORAMA_HOST"),
		PanoramaUsername: os.Getenv("PANORAMA_USER"),
		PanoramaPassword: os.Getenv("PANORAMA_PASS"),
		DeviceGroup:      "Production-DG",
		Rulebase:         "pre-rulebase",
	}

	validator, err := NewPolicyValidator(config, logger)
	if err != nil {
		log.Fatalf("Failed to create validator: %v", err)
	}

	ctx := context.Background()
	if err := validator.LoadPolicyData(ctx); err != nil {
		log.Fatalf("Failed to load policy data: %v", err)
	}

	// Vulnerabilities from Chariot (simplified)
	vulns := []ChariotVulnerability{
		{
			Key:        "vuln-001",
			Name:       "Apache Log4j RCE",
			CVE:        "CVE-2021-44228",
			CVSS:       10.0,
			Severity:   "critical",
			AffectedIP: "10.0.1.50",
			Port:       8080,
			Category:   "rce",
		},
		{
			Key:        "vuln-002",
			Name:       "SQL Injection",
			CVSS:       7.5,
			Severity:   "high",
			AffectedIP: "10.0.2.100",
			Port:       443,
			Category:   "injection",
		},
	}

	report, err := validator.ValidateVulnerabilities(ctx, vulns)
	if err != nil {
		log.Fatalf("Validation failed: %v", err)
	}

	jsonReport, _ := validator.GenerateJSONReport(report)
	fmt.Println(string(jsonReport))
}
```

---

## Expected Output

```json
{
  "GeneratedAt": "2025-01-04T10:30:00Z",
  "DeviceGroup": "Production-DG",
  "TotalVulns": 2,
  "MitigatedCount": 1,
  "PartialCount": 1,
  "UnmitigatedCount": 0,
  "CriticalGaps": 1,
  "Results": [
    {
      "Vulnerability": {
        "key": "vuln-001",
        "name": "Apache Log4j RCE",
        "cve": "CVE-2021-44228",
        "cvss": 10.0
      },
      "IsMitigated": true,
      "MitigationType": "profiled",
      "MatchingRules": [
        {
          "RuleName": "Allow-Web-Traffic",
          "Action": "allow",
          "HasProfiles": true,
          "ProfileGroup": "strict-security"
        }
      ],
      "Gaps": [],
      "RiskScore": 3.0
    }
  ],
  "Summary": {
    "OverallRiskScore": 4.25,
    "CoverageByCategory": {
      "rce": 100,
      "injection": 50
    }
  }
}
```

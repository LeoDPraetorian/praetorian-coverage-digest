# Quality Standards

Capability-specific quality metrics and acceptance criteria.

## Overview

Each capability type has different quality standards based on its security purpose. These standards guide architecture decisions, implementation validation, and testing requirements.

## VQL Capabilities

### Detection Accuracy

**Target**: ≥ 95% of true positives detected

**Measurement**:

- Test against known positive samples (files with actual credentials/issues)
- Calculate: (True Positives Detected / Total True Positives) × 100%

**Validation**:

- Create test dataset with 20+ known positive samples
- Run VQL capability against dataset
- Verify ≥ 95% detection rate

### False Positive Rate

**Target**: ≤ 5% false alarms

**Measurement**:

- Test against known negative samples (benign files)
- Calculate: (False Positives / Total Negative Samples) × 100%

**Validation**:

- Create test dataset with 50+ benign files
- Run VQL capability against dataset
- Verify ≤ 5% false positive rate

### Performance

**Target**: Query completes in ≤ 60 seconds for typical system

**Measurement**:

- Measure execution time on test system with realistic file counts
- Typical system: 100K files, 500GB storage

**Validation**:

- Run VQL capability on test VM matching typical deployment
- Verify query completes within 60 seconds

### Coverage

**Target**: Supports all target platforms (Windows/Linux/macOS where applicable)

**Measurement**:

- Test on each target platform
- Verify query executes without errors

**Validation**:

- Run capability on Windows, Linux, macOS test systems
- Document platform-specific limitations if any

## Nuclei Templates

### Detection Accuracy

**Target**: ≥ 95% of vulnerable instances detected

**Measurement**:

- Test against known vulnerable versions/configurations
- Calculate: (Vulnerable Instances Detected / Total Vulnerable Instances) × 100%

**Validation**:

- Deploy 10+ vulnerable test instances
- Run Nuclei template against instances
- Verify ≥ 95% detection rate

### False Positive Rate

**Target**: ≤ 2% false alarms (stricter than VQL due to alert fatigue)

**Measurement**:

- Test against patched/secure versions
- Calculate: (False Positives / Total Secure Instances) × 100%

**Validation**:

- Deploy 20+ patched/secure instances
- Run Nuclei template against instances
- Verify ≤ 2% false positive rate

### CVE Coverage

**Target**: Detects all known CVE variants (if CVE-specific)

**Measurement**:

- Test against all CVE proof-of-concept exploits
- Calculate: (CVE Variants Detected / Total CVE Variants) × 100%

**Validation**:

- Deploy test instances for each CVE variant
- Run template against all variants
- Verify 100% variant coverage

### Performance

**Target**: ≤ 3 HTTP requests per target

**Measurement**:

- Count HTTP requests in template YAML
- Lower is better (reduces scan time and WAF alerts)

**Validation**:

- Review template request count
- Optimize to minimize requests while maintaining accuracy

## Janus Tool Chains

### Pipeline Success Rate

**Target**: ≥ 98% of runs complete successfully

**Measurement**:

- Run pipeline 100 times with varied inputs
- Calculate: (Successful Runs / Total Runs) × 100%

**Validation**:

- Execute pipeline against 100 test targets
- Verify ≥ 98% completion rate (excluding known unavailable targets)

### Error Handling

**Target**: 100% of tool failures handled gracefully

**Measurement**:

- Inject tool failures (timeouts, crashes, invalid output)
- Verify pipeline continues or fails gracefully (no crashes)

**Validation**:

- Mock tool failures in test environment
- Verify pipeline error handling for each tool
- Confirm no unhandled exceptions or crashes

### Result Accuracy

**Target**: ≥ 99% of tool outputs correctly aggregated

**Measurement**:

- Compare aggregated results against individual tool outputs
- Calculate: (Correctly Aggregated Results / Total Results) × 100%

**Validation**:

- Run tools individually, collect outputs
- Run Janus pipeline, collect aggregated output
- Verify aggregation correctness

### Performance

**Target**: Pipeline execution time ≤ 2× slowest individual tool

**Measurement**:

- Measure individual tool execution times
- Measure total pipeline execution time
- Calculate: Pipeline Time / Max(Tool Times)

**Validation**:

- Benchmark individual tools
- Benchmark pipeline
- Verify overhead ≤ 2× (allows for sequencing overhead)

## Fingerprintx Modules

### Detection Accuracy

**Target**: ≥ 98% of services correctly identified

**Measurement**:

- Test against 50+ service instances (varied versions/configurations)
- Calculate: (Services Correctly Identified / Total Services) × 100%

**Validation**:

- Deploy test services (Docker containers)
- Run fingerprintx against all services
- Verify ≥ 98% correct identification

### Version Accuracy

**Target**: ≥ 90% of versions correctly extracted

**Measurement**:

- Test against services with known versions
- Calculate: (Versions Correctly Extracted / Total Services) × 100%

**Validation**:

- Deploy services with version markers
- Run fingerprintx, compare extracted versions
- Verify ≥ 90% version accuracy

### False Positive Rate

**Target**: ≤ 1% false service identifications

**Measurement**:

- Test against non-target services (similar protocols)
- Calculate: (False Identifications / Total Non-Target Services) × 100%

**Validation**:

- Deploy similar services (e.g., MySQL vs MariaDB)
- Run fingerprintx against non-target services
- Verify ≤ 1% false positive rate

### Protocol Correctness

**Target**: 100% of protocol interactions valid

**Measurement**:

- Validate probe requests against protocol specifications
- Verify responses parse correctly

**Validation**:

- Review probe implementation against protocol RFCs
- Test probes against reference implementations
- Verify no protocol violations

## Scanner Integrations

### API Integration

**Target**: 100% of required API endpoints successfully called

**Measurement**:

- Identify required API endpoints from scanner documentation
- Test each endpoint call
- Calculate: (Successful Endpoints / Total Required Endpoints) × 100%

**Validation**:

- Create integration test for each API endpoint
- Run tests against live API (or mock)
- Verify all endpoints accessible and functioning

### Result Accuracy

**Target**: ≥ 99% of scan results correctly normalized

**Measurement**:

- Compare scanner raw results against normalized Chariot data
- Calculate: (Correctly Mapped Fields / Total Fields) × 100%

**Validation**:

- Run scanner, collect raw results
- Run integration, collect normalized results
- Verify field mapping accuracy

### Rate Limit Handling

**Target**: 100% of rate limits handled gracefully

**Measurement**:

- Trigger rate limit conditions (burst requests)
- Verify integration handles limit (retry, backoff)

**Validation**:

- Send requests until rate limited
- Verify integration detects rate limit
- Verify retry logic executes correctly

### Data Completeness

**Target**: ≥ 95% of scanner fields mapped to Chariot model

**Measurement**:

- Identify all fields in scanner output
- Calculate: (Mapped Fields / Total Scanner Fields) × 100%

**Validation**:

- Review scanner API documentation
- Review Chariot data model mapping
- Verify ≥ 95% field coverage (exclude irrelevant fields)

## Quality Gate Enforcement

### Phase 3 (Architecture)

Quality standards must be **specified** in architecture.md:

- Target metrics for capability type
- Measurement methodology
- Validation approach

### Phase 5 (Review)

Quality standards must be **evaluated** in review.md:

- Architecture specifies appropriate metrics
- Implementation design supports quality targets

### Phase 6 (Testing)

Quality standards must be **validated** in test-validation.md:

- Tests measure quality metrics
- Actual results meet targets
- Evidence captured (test output, logs)

## Related

- [Capability Types](capability-types.md) - Type-specific implementation guidance
- [Phase 3: Architecture](phase-3-architecture.md) - Specifying quality standards
- [Phase 5: Review](phase-5-review.md) - Evaluating quality design
- [Phase 6: Testing](phase-6-testing.md) - Validating quality metrics

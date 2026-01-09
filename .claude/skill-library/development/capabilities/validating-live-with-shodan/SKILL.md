---
name: validating-live-with-shodan
description: Use when validating fingerprintx plugins against real-world services via Shodan - queries for protocol matches, runs fingerprintx against live targets, analyzes detection/version/CPE rates
allowed-tools: Read, Write, Edit, Bash, Grep, Glob, TodoWrite
---

# Validating Fingerprintx Live

**Live validation of fingerprintx plugins using Shodan API reconnaissance.**

## When to Use

Use this skill when:

- Phase 7 of `orchestrating-fingerprintx-development` reaches live validation step
- You need to validate a plugin against real-world service deployments
- Docker testing passed but you want production-environment validation
- Verifying version extraction works across diverse configurations

**Prerequisite:** go build, go vet, go test, and Docker validation MUST pass first.

## Why Live Validation?

| Docker Testing         | Live Validation        |
| ---------------------- | ---------------------- |
| Controlled environment | Production diversity   |
| Known versions         | Unknown configurations |
| Predictable responses  | Real-world edge cases  |
| Isolated testing       | Network conditions     |

**Both are required.** Docker ensures correctness; Shodan ensures real-world reliability.

## Integration with Orchestrator

This skill is **Phase 7.4** of `orchestrating-fingerprintx-development`:

```
Phase 7: Validation  ████ BLOCKING GATE ████
├── 7.1: go build ✓
├── 7.2: go vet ✓
├── 7.3: go test (80%+ coverage) ✓
├── 7.4: Docker container testing ✓
├── 7.5: LIVE SHODAN VALIDATION ← THIS SKILL
└── 7.6: Generate validation-report.md
```

## Workflow (5 Steps)

### Step 1: Generate Protocol Query

Map protocol name to Shodan search query:

```bash
# Protocol → Query mapping
mysql    → "port:3306"
mongodb  → "port:27017 product:mongodb"
redis    → "port:6379 product:redis"
postgres → "port:5432 product:postgresql"
```

**See:** [references/protocol-query-mapping.md](references/protocol-query-mapping.md) for complete mapping.

### Step 2: Query Shodan

Use `mcp-tools-shodan-api` skill to find targets:

```bash
ROOT="$(git rev-parse --show-superproject-working-tree --show-toplevel | head -1)" && npx tsx -e "(async () => {
  const { hostSearch } = await import('$ROOT/.claude/tools/shodan/index.js');

  const result = await hostSearch.execute({
    query: 'port:27017 product:mongodb',
    page: 1
  });

  console.log('Total available:', result.summary.total);
  result.matches.forEach(m =>
    console.log(\`\${m.ip}:\${m.port}\`)
  );
})();" 2>/dev/null
```

**Sample size:** Up to 10 targets (balances coverage vs. rate limits)

### Step 3: Run Fingerprintx Against Targets

Execute fingerprintx against each target:

```bash
# Build fingerprintx first
cd modules/fingerprintx && go build -o fingerprintx ./cmd/fingerprintx

# Run against each target (rate-limited)
for target in "${TARGETS[@]}"; do
  ./fingerprintx -t "$target" --json --timeout 5s
  sleep 1  # Rate limit: 1 req/sec
done
```

**Rate limiting:** 1 request per second (ethical scanning)
**Timeout:** 5 seconds per target (handles unresponsive hosts)

### Step 4: Analyze Results

Calculate validation metrics:

| Metric              | Formula                                  | Threshold |
| ------------------- | ---------------------------------------- | --------- |
| Detection Rate      | (detected / total) × 100                 | ≥ 80%     |
| Version Extraction  | (with_version / detected) × 100          | ≥ 50%\*   |
| CPE Generation      | (with_cpe / detected) × 100              | ≥ 50%\*   |
| False Negative Rate | (shodan_says_X_we_say_nil / total) × 100 | ≤ 20%     |

\*Only if version research was performed (Phase 4)

**See:** [references/result-analysis-patterns.md](references/result-analysis-patterns.md) for analysis logic.

### Step 5: Generate Live Validation Report

Create `{protocol}-live-validation.md`:

```markdown
## Live Validation Report: {Protocol}

**Date:** {YYYY-MM-DD}
**Sample Size:** {N} targets from Shodan
**Query:** {shodan_query}

### Results Summary

| Metric             | Value | Threshold | Status  |
| ------------------ | ----- | --------- | ------- |
| Detection Rate     | 85%   | ≥ 80%     | ✅ PASS |
| Version Extraction | 62%   | ≥ 50%     | ✅ PASS |
| CPE Generation     | 58%   | ≥ 50%     | ✅ PASS |
| False Negatives    | 15%   | ≤ 20%     | ✅ PASS |

### Sample Results

| Target        | Shodan Product | Fingerprintx | Version | CPE |
| ------------- | -------------- | ------------ | ------- | --- |
| 1.2.3.4:27017 | MongoDB 4.4    | mongodb      | 4.4.0   | ✅  |
| 5.6.7.8:27017 | MongoDB        | mongodb      | -       | -   |

### False Negative Analysis

[Analysis of targets Shodan identified but we didn't detect]

### VERDICT: {PASS/FAIL}
```

**See:** [references/live-validation-report-template.md](references/live-validation-report-template.md) for complete template.

## Pass/Fail Criteria

### PASS Requirements (ALL must be true)

- [ ] Detection rate ≥ 80%
- [ ] False negative rate ≤ 20%
- [ ] Version extraction ≥ 50% (if version research done)
- [ ] CPE generation ≥ 50% (if version research done)
- [ ] No crashes or panics during scanning

### FAIL Triggers (ANY causes failure)

- Detection rate < 80%
- False negative rate > 20%
- Crashes or panics during scanning
- Timeout on > 50% of targets (indicates fundamental issue)

## Ethical Scanning Guidelines

**MANDATORY:** Follow these guidelines for responsible scanning.

1. **Rate Limiting:** Maximum 1 request per second
2. **Sample Size:** Maximum 10 targets per validation run
3. **Timeout Respect:** 5 second timeout, don't retry aggressively
4. **No Exploitation:** Detection only, no authentication attempts
5. **Documentation:** Log all targets scanned for audit trail

## Checklist

Use TodoWrite to track progress:

- [ ] Step 1: Generate protocol query
- [ ] Step 2: Query Shodan for targets (up to 10 sample)
- [ ] Step 3: Run fingerprintx against each target (rate-limited)
- [ ] Step 4: Calculate detection/version/CPE rates
- [ ] Step 5: Generate live-validation.md report
- [ ] Verify PASS/FAIL criteria
- [ ] Add live-validation.md to output directory

## Troubleshooting

| Issue                 | Cause                     | Solution                        |
| --------------------- | ------------------------- | ------------------------------- |
| Low detection rate    | Protocol changed          | Review protocol research        |
| Many timeouts         | Network issues            | Increase timeout, reduce sample |
| No Shodan results     | Query too specific        | Broaden query (port only)       |
| Version extraction 0% | Auth required             | Expected for some protocols     |
| CPE generation 0%     | Version extraction failed | Fix version extraction first    |

## Output Artifacts

This skill produces:

| Artifact                               | Location                                   | Purpose                  |
| -------------------------------------- | ------------------------------------------ | ------------------------ |
| `{protocol}-live-validation.md`        | `.claude/.output/capabilities/{protocol}/` | Live validation report   |
| `{protocol}-shodan-targets.json`       | Same directory                             | Raw Shodan query results |
| `{protocol}-fingerprintx-results.json` | Same directory                             | Raw fingerprintx output  |

## Related Skills

| Skill                                    | Purpose               |
| ---------------------------------------- | --------------------- |
| `mcp-tools-shodan-api`                   | Shodan API wrappers   |
| `orchestrating-fingerprintx-development` | Parent orchestrator   |
| `writing-fingerprintx-tests`             | Unit test patterns    |
| `writing-fingerprintx-modules`           | Plugin implementation |

## Anti-Patterns

| Anti-Pattern                             | Why It's Wrong               |
| ---------------------------------------- | ---------------------------- |
| "Skip live validation, Docker passed"    | Production diversity matters |
| "Detection rate 75% is close enough"     | Thresholds are hard gates    |
| "Scan 500 targets for better data"       | Violates ethical guidelines  |
| "No rate limiting, we're in a hurry"     | Unethical, may get blocked   |
| "Version extraction failed, ship anyway" | If required, it's required   |

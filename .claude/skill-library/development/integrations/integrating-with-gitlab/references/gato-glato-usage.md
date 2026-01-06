# GATO/GLATO Security Assessment Tools

## Overview

**GATO** (GitHub) and **GLATO** (GitLab) - Praetorian offensive security tools for CI/CD attack surface enumeration.

**Dual-Use:**

- **Offensive**: Red team, post-exploitation
- **Defensive**: Security audits, proactive discovery

## GLATO Capabilities

Released at **Black Hat 2025**.

```bash
# Enumerate runners
python glato.py --enumerate-runners --token <gitlab-token>

# Enumerate projects
python glato.py --enumerate-projects --token <gitlab-token>

# Enumerate groups
python glato.py --enumerate-groups --token <gitlab-token>

# Extract secrets (requires permissions)
python glato.py secrets --project-id <id> --token <gitlab-token>
```

## Attack Vectors

### 1. Token Privilege Escalation

- CVE-2024-8114: Token escalation (GitLab 8.12-17.6.1)
- Abuse `manage_group_access_tokens` role

### 2. Runner Exploitation

- Identify privileged mode runners
- Exploit Docker-in-Docker configurations
- Container escape via privileged access

### 3. Pipeline Secret Extraction

**Three Methods:**

1. **API-Based**: Direct `/api/v4/projects/:id/variables` (requires admin)
2. **Workflow Analysis**: Recursive .gitlab-ci.yml analysis
3. **Poisoned Pipeline Execution (PPE)**: Inject malicious code

**GLATO Unique Feature:** RSA-4096/AES encrypted exfiltration

- Encrypts secrets before exfiltration
- Automatic log deletion and cleanup
- Minimal detection footprint

## Real-World Impact

Documented incidents:

- **PyTorch**: AWS keys + GitHub PATs compromised, 93 repos accessed
- **ByteDance Rspack**: Comment-triggered workflow exploitation
- **OMGCICD**: Shared runner cross-contamination

## Chariot Integration (Proposed)

```go
type CICDSecurityScanner struct {
    Platform     string // "gitlab"
    Token        string
    Enumeration  EnumerationModule
    Runner       RunnerAnalysisModule
    Secret       SecretExtractionModule
}
```

**Priority:**

- High: Runner enumeration, token privilege assessment
- Medium: Workflow vulnerability scanning
- Low: Active PPE (ethical/legal concerns)

For comprehensive GATO/GLATO patterns, see:
`.claude/.output/research/2026-01-04-205433-gitlab-integration-security/SYNTHESIS.md` (Section 3)

**Local Resources:**

- `modules/go-gato/glato/` - GLATO repository
- `modules/go-gato/GATO-X-ARCHITECTURE-ANALYSIS.md`
- `modules/go-gato/GLATO-ARCHITECTURE-ANALYSIS.md`

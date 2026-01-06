# GitLab CI/CD Pipeline Patterns

## Secrets Management (GitLab 18.3+)

### Variable Visibility Levels

```yaml
# NEVER use for secrets
Visible: Plain text in logs and UI

# DEFAULT (GitLab 18.3+)
Masked: Masked in logs, visible in UI

# RECOMMENDED for secrets
Masked and hidden: Masked in logs, never revealed after saving
```

### External Secrets Integration

```yaml
job:
  secrets:
    DATABASE_PASSWORD:
      vault: production/db/password@secrets
      token: $VAULT_TOKEN
  script:
    - echo "Using secret from Vault"
```

**Supported providers:**

- HashiCorp Vault
- Azure Key Vault
- Google Cloud Secret Manager
- AWS Secrets Manager (via Infisical)

## Configuration Hardening

```yaml
# Pin Docker images (not 'latest')
image: node:18.19.0

# Use rules (not deprecated only/except)
workflow:
  rules:
    - if: $CI_COMMIT_BRANCH == $CI_DEFAULT_BRANCH

# Protected variables for production
deploy:
  script:
    - deploy.sh $PROD_TOKEN # Protected variable
  rules:
    - if: $CI_COMMIT_REF_PROTECTED == "true"
```

## Security Scanners

```yaml
include:
  - template: Security/SAST.gitlab-ci.yml
  - template: Security/Secret-Detection.gitlab-ci.yml
  - template: Security/Dependency-Scanning.gitlab-ci.yml
```

## Supply Chain Security

**Pin includes to commits:**

```yaml
include:
  - project: "my-group/my-project"
    file: "/templates/ci.yml"
    ref: "abc123def456" # Pin to SHA
```

**Never use versionless includes** - Prevents upstream poisoning.

For comprehensive pipeline patterns, see:
`.claude/.output/research/2026-01-04-205433-gitlab-integration-security/SYNTHESIS.md` (Section 2.5-2.6)

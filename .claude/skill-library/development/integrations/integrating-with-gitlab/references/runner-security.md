# GitLab Runner Security

## Executor Security Models

| Executor            | Isolation | Security Risk | Use Case         |
| ------------------- | --------- | ------------- | ---------------- |
| Shell               | None      | **Critical**  | Never use        |
| Docker (non-priv)   | Container | Low           | General builds   |
| Docker (privileged) | None      | **Critical**  | Avoid or isolate |
| Kubernetes          | Namespace | Low           | Production       |

## Critical: Privileged Mode

⚠️ **Privileged mode grants FULL ROOT access to host system**

**Universally condemned** except on isolated, ephemeral infrastructure.

### Safe Configuration

```toml
# config.toml
[[runners]]
  [runners.docker]
    privileged = false  # SAFE
    # ... other config
```

### Dangerous Configuration

```toml
[[runners]]
  [runners.docker]
    privileged = true   # DANGEROUS - full root access
```

## Runner Authentication Tokens

**Critical Migration:** Legacy registration tokens deprecated, removal in GitLab 20.0

### New Standard (glrt- prefix)

```bash
# Register with authentication token
gitlab-runner register \
  --token glrt-xxxxxxxxxxxxxxxxxxxx \
  --url https://gitlab.com \
  --executor docker
```

**Migrate immediately** - Legacy support ending.

## Hardening Checklist

- [ ] Set `privileged = false` in config.toml
- [ ] Deploy in isolated network segments
- [ ] Use ephemeral infrastructure
- [ ] Restrict privileged runners to protected branches
- [ ] Secure config.toml permissions (0600)
- [ ] Rotate tokens every 90 days
- [ ] Monitor logs for anomalies

## Alternatives to Privileged Mode

**Secure build tools** (no privileged mode needed):

- **Kaniko** - Container image builds
- **Buildah/Podman** - Rootless builds
- **Sysbox** - Secure container runtime

For comprehensive runner security, see:
`.claude/.output/research/2026-01-04-205433-gitlab-integration-security/SYNTHESIS.md` (Section 2.3-2.4)

# GitLab Security Best Practices

## Token Management

1. **Storage**: AWS Secrets Manager, HashiCorp Vault
2. **Scopes**: Minimum required permissions
3. **Rotation**: Every 90 days
4. **Expiration**: Set explicit dates
5. **Monitoring**: Track usage patterns

## API Security

1. **Rate Limiting**: Monitor `RateLimit-Remaining` header
2. **Retry Logic**: Exponential backoff on 429
3. **Circuit Breaker**: Stop on sustained failures
4. **HTTPS Only**: All API calls encrypted
5. **Token Health**: Verify before critical operations

## Webhook Security

1. **Validation**: Always verify `X-Gitlab-Token`
2. **HTTPS**: Mandatory for endpoints
3. **IP Allowlisting**: Restrict to GitLab IPs
4. **Timeout Response**: Prevent auto-disable
5. **Secret Rotation**: Every 90 days

## Runner Security

1. **Privileged Mode**: Set `privileged = false`
2. **Ephemeral Infrastructure**: Fresh VMs per job
3. **Network Isolation**: Dedicated segments
4. **Token Migration**: Use `glrt-` auth tokens
5. **Protected Branches**: Restrict sensitive runners

## CI/CD Secrets

1. **Masked and Hidden**: For all sensitive variables
2. **External Secrets**: Vault, AWS, Azure integration
3. **OIDC**: Short-lived credentials
4. **Protected Variables**: Production deployments only
5. **Artifact Scanning**: NoseyParker integration

## Pipeline Security

1. **Pin Images**: Specific tags/digests (not `latest`)
2. **Pin Includes**: Commit SHAs (not branches)
3. **Security Scanners**: SAST, Secret Detection, Dependency Scanning
4. **Rules**: Use `rules` (not deprecated `only/except`)
5. **Protected Refs**: `$CI_COMMIT_REF_PROTECTED` checks

## Vulnerability Patches

**Apply immediately:**

- CVE-2024-9164 (CVSS 9.6): Update to GitLab 18.6.1+
- CVE-2024-6678 (CVSS 9.9): Update to GitLab 18.6.1+
- CVE-2025-25291/25292: SAML SSO bypass
- CVE-2024-8114: Token escalation fix

## Audit Logging

1. **Track**: All token operations
2. **Monitor**: Unusual API patterns
3. **Alert**: Failed auth attempts
4. **Review**: Quarterly access audits
5. **Retention**: 90 days minimum

## Defense in Depth

**Multiple layers:**

- Token scoping (least privilege)
- Rate limiting (prevent abuse)
- Webhook validation (prevent spoofing)
- Runner isolation (prevent lateral movement)
- Secret encryption (protect at rest)
- Artifact scanning (detect exposure)
- Audit logging (detect anomalies)

For comprehensive security guidance, see:
`.claude/.output/research/2026-01-04-205433-gitlab-integration-security/SYNTHESIS.md`

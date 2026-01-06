# GitLab Integration Reference Files

This directory contains detailed reference documentation for GitLab integration patterns, security, and best practices.

## Comprehensive Research

For exhaustive coverage of all topics, see the comprehensive research synthesis:
**`.claude/.output/research/2026-01-04-205433-gitlab-integration-security/SYNTHESIS.md`**

This synthesis document contains ~200 pages of detailed research across:

- 12 research agent reports (GitHub, Context7, Web, Perplexity)
- 3 interpretations (API Auth, CI/CD Security, GATO/GLATO)
- Complete findings, patterns, conflicts, and recommendations

## Reference Files Overview

| File                           | Topics Covered                                | Use When                           |
| ------------------------------ | --------------------------------------------- | ---------------------------------- |
| **authentication-patterns.md** | PATs, OAuth, Group/Project tokens, Job tokens | Implementing GitLab authentication |
| **token-management.md**        | Lifecycle, rotation, storage, revocation      | Managing token security            |
| **oauth-flow.md**              | OAuth 2.0 implementation, refresh tokens      | Building user-facing apps          |
| **rest-vs-graphql.md**         | API selection, pros/cons, decision matrix     | Choosing API approach              |
| **rate-limiting.md**           | Rate limits, retry strategies, throttling     | Handling API limits                |
| **webhook-events.md**          | Event types, validation, payload structures   | Implementing webhooks              |
| **runner-security.md**         | Executor security, privileged mode, hardening | Securing CI/CD runners             |
| **cicd-pipeline-patterns.md**  | .gitlab-ci.yml best practices, security       | Writing secure pipelines           |
| **gato-glato-usage.md**        | Offensive security assessment tools           | Red team/security audits           |
| **api-reference.md**           | Common endpoints, operations                  | Quick API reference                |
| **security-best-practices.md** | Comprehensive security guidance               | Security reviews                   |
| **chariot-gitlab-patterns.md** | Chariot-specific integration patterns         | Chariot development                |

## How to Use These References

1. **Start with SKILL.md**: Quick overview of all topics
2. **Dive into specific reference files**: Detailed patterns for specific areas
3. **Consult comprehensive synthesis**: Exhaustive research with cross-references

## Related Resources

- **GitLab Official Documentation**: https://docs.gitlab.com/
- **Chariot Backend GitLab Integration**: `modules/chariot/backend/pkg/tasks/integrations/gitlab/`
- **Chariot Aegis GitLab Capabilities**: `modules/chariot-aegis-capabilities/.../gitlab-pat-scanner/`
- **GATO/GLATO Tools**: `modules/go-gato/glato/` and `modules/go-gato/gato-x/`

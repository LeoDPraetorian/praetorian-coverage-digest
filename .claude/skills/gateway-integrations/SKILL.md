---
name: gateway-integrations
description: Routes integration tasks to library skills. Intent detection + progressive loading.
allowed-tools: Read
---

<EXTREMELY-IMPORTANT>
# STOP. READ THIS FIRST. DO NOT SKIP.

## The 1% Rule (NON-NEGOTIABLE)

If there is even a **1% chance** a skill might apply to your task:

- You MUST invoke that skill
- This is not optional
- This is not negotiable
- You cannot rationalize your way out of this

Uncertainty = Invocation. Period.

## Skill Announcement (MANDATORY)

Before using any skill, you MUST announce it in your response:

"I am invoking `{skill-name}` because {reason}."

This announcement must appear BEFORE you begin work.
No announcement = no invocation = PROTOCOL VIOLATION = FAILURE!
</EXTREMELY-IMPORTANT>

# Gateway: Integrations

Routes integration tasks to appropriate library skills. Does NOT contain methodology—skills do.

## Progressive Disclosure

This gateway implements 3-tier loading:

- **Level 1 (now):** Routing tables (~250 tokens)
- **Level 2 (on-demand):** Skill SKILL.md loaded when routed
- **Level 3 (as-needed):** Skill resources loaded during execution

## Intent Detection

**Match your task to a routing pattern:**

| Task Intent                               | Route To                            |
| ----------------------------------------- | ----------------------------------- |
| "create integration" / "new integration"  | → `developing-integrations`         |
| "integration test" / "API test"           | → `writing-integration-tests-first` |
| "AWS" / "Lambda" / "DynamoDB" / "S3"      | → `integrating-with-aws`            |
| "Azure" / "Microsoft Azure" / "Key Vault" | → `integrating-with-azure`          |
| "GCP" / "Google Cloud" / "Cloud Storage"  | → `integrating-with-gcp`            |
| "Bugcrowd" / "bug bounty"                 | → `integrating-with-bugcrowd`       |
| "GitHub" / "GitHub API" / "webhooks"      | → `integrating-with-github`         |
| "GitLab" / "GitLab API" / "CI/CD"         | → `integrating-with-gitlab`         |
| "HackerOne" / "H1"                        | → `integrating-with-hackerone`      |
| "Bitbucket" / "Bitbucket API"             | → `integrating-with-bitbucket`      |
| "Jira" / "JQL" / "Atlassian"              | → `integrating-with-jira`           |
| "OCI" / "Oracle Cloud" / "Oracle"         | → `integrating-with-oracle-cloud`   |
| "Panorama" / "Palo Alto"                  | → `integrating-with-panorama`       |
| "testing" (general)                       | → also invoke `gateway-testing`     |
| "Go patterns"                             | → also invoke `gateway-backend`     |

## Routing Algorithm

```
1. Parse task for trigger keywords from Intent Detection
2. Match triggers → route to skill(s) from Skill Registry
3. Check Cross-Gateway Routing for domain-specific gateways
4. Load skill via Read(path)
5. Follow skill instructions
```

## Skill Registry

### Patterns & Testing

| Skill                   | Path                                                                              | Triggers                            |
| ----------------------- | --------------------------------------------------------------------------------- | ----------------------------------- |
| Developing Integrations | `.claude/skill-library/development/integrations/developing-integrations/SKILL.md` | create integration, new integration |
| Integration Tests       | `.claude/skill-library/testing/writing-integration-tests-first/SKILL.md`          | integration test, API test          |

### Third-Party Integrations

| Skill        | Path                                                                                    | Triggers                                                                                                                                    |
| ------------ | --------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| AWS          | `.claude/skill-library/development/integrations/integrating-with-aws/SKILL.md`          | AWS, Lambda, DynamoDB, S3, CloudFormation, SDK v2                                                                                           |
| Azure        | `.claude/skill-library/development/integrations/integrating-with-azure/SKILL.md`        | Azure, Microsoft Azure, Key Vault, managed identity, DefaultAzureCredential, RBAC, service principal, Terraform Azure, Bicep, ARM templates |
| Bitbucket    | `.claude/skill-library/development/integrations/integrating-with-bitbucket/SKILL.md`    | Bitbucket, Bitbucket API, API tokens                                                                                                        |
| Bugcrowd     | `.claude/skill-library/development/integrations/integrating-with-bugcrowd/SKILL.md`     | Bugcrowd, bug bounty                                                                                                                        |
| GCP          | `.claude/skill-library/development/integrations/integrating-with-gcp/SKILL.md`          | GCP, Google Cloud, Cloud Storage, Cloud Functions, Pub/Sub, BigQuery, Workload Identity, ADC                                                |
| GitHub       | `.claude/skill-library/development/integrations/integrating-with-github/SKILL.md`       | GitHub, webhooks                                                                                                                            |
| GitLab       | `.claude/skill-library/development/integrations/integrating-with-gitlab/SKILL.md`       | GitLab, GitLab API, CI/CD, runners, GATO, GLATO                                                                                             |
| HackerOne    | `.claude/skill-library/development/integrations/integrating-with-hackerone/SKILL.md`    | HackerOne, H1                                                                                                                               |
| Jira         | `.claude/skill-library/development/integrations/integrating-with-jira/SKILL.md`         | Jira, JQL, Atlassian                                                                                                                        |
| Oracle Cloud | `.claude/skill-library/development/integrations/integrating-with-oracle-cloud/SKILL.md` | OCI, Oracle Cloud, Oracle                                                                                                                   |
| Panorama     | `.claude/skill-library/development/integrations/integrating-with-panorama/SKILL.md`     | Panorama, Palo Alto                                                                                                                         |

## Cross-Gateway Routing

| If Task Involves  | Also Invoke         |
| ----------------- | ------------------- |
| Go implementation | `gateway-backend`   |
| Testing patterns  | `gateway-testing`   |
| MCP services      | `gateway-mcp-tools` |

## Loading Skills

**Path convention:** `.claude/skill-library/development/integrations/{skill-name}/SKILL.md`

```
Read(".claude/skill-library/development/integrations/{skill-name}/SKILL.md")
```

Do NOT use `skill: "skill-name"` for library skills—they require Read tool.

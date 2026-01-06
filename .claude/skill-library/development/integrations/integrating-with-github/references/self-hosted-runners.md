# GitHub Actions Self-Hosted Runners API

**Source**: GitHub REST API Official Documentation (Web Research)
**Research Date**: 2026-01-04
**Documentation URL**: https://docs.github.com/en/rest/actions/self-hosted-runners

---

## Overview

The REST API provides comprehensive management of self-hosted runners at repository, organization, and enterprise levels. Self-hosted runners allow you to host your own runners and customize the environment used to run jobs in your GitHub Actions workflows.

---

## API Endpoints

### Organization-Level Endpoints

**Runner Management:**

| Endpoint                                  | Method | Purpose                     |
| ----------------------------------------- | ------ | --------------------------- |
| `/orgs/{org}/actions/runners`             | GET    | List all runners            |
| `/orgs/{org}/actions/runners/{runner_id}` | GET    | Get specific runner details |
| `/orgs/{org}/actions/runners/{runner_id}` | DELETE | Remove runner               |

**Runner Applications & Configuration:**

| Endpoint                                         | Method | Purpose                           |
| ------------------------------------------------ | ------ | --------------------------------- |
| `/orgs/{org}/actions/runners/downloads`          | GET    | List available runner binaries    |
| `/orgs/{org}/actions/runners/generate-jitconfig` | POST   | Create just-in-time configuration |

**Token Management:**

| Endpoint                                         | Method | Purpose                                         |
| ------------------------------------------------ | ------ | ----------------------------------------------- |
| `/orgs/{org}/actions/runners/registration-token` | POST   | Generate registration token (expires in 1 hour) |
| `/orgs/{org}/actions/runners/remove-token`       | POST   | Generate removal token (expires in 1 hour)      |

**Label Management:**

| Endpoint                                                | Method | Purpose                  |
| ------------------------------------------------------- | ------ | ------------------------ |
| `/orgs/{org}/actions/runners/{runner_id}/labels`        | GET    | List runner labels       |
| `/orgs/{org}/actions/runners/{runner_id}/labels`        | POST   | Add custom labels        |
| `/orgs/{org}/actions/runners/{runner_id}/labels`        | PUT    | Replace all labels       |
| `/orgs/{org}/actions/runners/{runner_id}/labels`        | DELETE | Remove all custom labels |
| `/orgs/{org}/actions/runners/{runner_id}/labels/{name}` | DELETE | Remove specific label    |

### Repository-Level Endpoints

The same endpoint patterns exist at `/repos/{owner}/{repo}/actions/runners/` for repository-specific runner management.

---

## Authentication Requirements

### OAuth & Classic PATs

- Organization endpoints require `admin:org` scope
- Repository endpoints require `repo` scope
- If managing private repositories, both scopes may be required

### Fine-Grained Personal Access Tokens

- Organization operations: "Self-hosted runners" organization permissions (read/write)
- Repository operations: "Administration" repository permissions (read/write)

### Supported Token Types

1. GitHub App user access tokens
2. GitHub App installation access tokens
3. Fine-grained personal access tokens

---

## Just-In-Time (JIT) Runners

JIT runners improve security by creating single-use runners without time-limited registration tokens. When a runner registers using the JIT API, it will only be allowed to run a single job before being automatically removed.

### Generate JIT Configuration

**Required Parameters:**

| Parameter         | Type    | Description                                |
| ----------------- | ------- | ------------------------------------------ |
| `name`            | string  | Runner identifier                          |
| `runner_group_id` | integer | Target group assignment                    |
| `labels`          | array   | Custom labels (1-100 items)                |
| `work_folder`     | string  | Job execution directory (default: `_work`) |

**Example Request:**

```bash
curl -L -X POST \
  -H "Accept: application/vnd.github+json" \
  -H "Authorization: Bearer <YOUR-TOKEN>" \
  -H "X-GitHub-Api-Version: 2022-11-28" \
  https://api.github.com/orgs/ORG/actions/runners/generate-jitconfig \
  -d '{"name":"New runner","runner_group_id":1,"labels":["self-hosted","gpu"]}'
```

**Response:**

```json
{
  "runner": {
    "id": 23,
    "name": "New runner",
    "os": "unknown",
    "status": "offline",
    "busy": false,
    "labels": [
      { "id": 1, "name": "self-hosted", "type": "read-only" },
      { "id": 2, "name": "gpu", "type": "custom" }
    ]
  },
  "encoded_jit_config": "abc123..."
}
```

---

## Token Management

### Registration Tokens

Used with the runner configuration script:

```bash
./config.sh --url https://github.com/octo-org --token TOKEN
```

**Generate Token:**

```bash
curl -L -X POST \
  -H "Accept: application/vnd.github+json" \
  -H "Authorization: Bearer <YOUR-TOKEN>" \
  -H "X-GitHub-Api-Version: 2022-11-28" \
  https://api.github.com/orgs/ORG/actions/runners/registration-token
```

**Response:**

```json
{
  "token": "LLBF3JGZDX3P5PMEXLND6TS6FCWO6",
  "expires_at": "2020-01-22T12:13:35.123-08:00"
}
```

### Removal Tokens

Used to remove a runner:

```bash
./config.sh remove --token TOKEN
```

**Critical:** Both token types expire after **one hour**, requiring immediate use.

---

## Runner Labels

### Label Types

| Type      | Description                                      | Examples                                      |
| --------- | ------------------------------------------------ | --------------------------------------------- |
| Read-only | Applied automatically based on OS/architecture   | `self-hosted`, `X64`, `Linux`, `macOS`, `win` |
| Custom    | User-defined for targeting specific capabilities | `gpu`, `no-gpu`, `high-memory`                |

### Add Custom Labels

```bash
curl -L -X POST \
  -H "Accept: application/vnd.github+json" \
  -H "Authorization: Bearer <YOUR-TOKEN>" \
  -H "X-GitHub-Api-Version: 2022-11-28" \
  https://api.github.com/orgs/ORG/actions/runners/RUNNER_ID/labels \
  -d '{"labels":["gpu","accelerated"]}'
```

### Constraints

- Maximum **100 labels** per runner
- Minimum **1 label** for JIT configuration

---

## Runner Properties

Response objects include:

| Property    | Type    | Description                                           |
| ----------- | ------- | ----------------------------------------------------- |
| `id`        | integer | Unique identifier                                     |
| `name`      | string  | Runner display name                                   |
| `os`        | string  | Operating system (`linux`, `macos`, `win`, `unknown`) |
| `status`    | string  | Current state (`online`, `offline`)                   |
| `busy`      | boolean | Indicates active job execution                        |
| `ephemeral` | boolean | Temporary/single-use runner                           |
| `labels`    | array   | Associated tags                                       |

---

## Three-Level Deployment

### Repository Level

Repository owners can add runners for individual projects. Best for project-specific requirements.

### Organization Level

Organization owners can deploy runners usable by multiple repositories. Runners accept jobs across the entire organization.

### Enterprise Level

GitHub Enterprise Cloud users can establish enterprise-wide runners assignable to multiple organizations.

---

## Security Considerations

### Private Repositories Only

**GitHub strongly advises against using self-hosted runners with public repositories:**

> "We recommend that you only use self-hosted runners with private repositories."

**Risk:** Forked repositories could execute malicious code on your runner machine through pull requests.

### Token Security

1. Registration and removal tokens expire after **60 minutes**
2. Use tokens immediately after generation
3. Never log or commit tokens
4. Use minimal required permissions with fine-grained tokens

### JIT Runner Security Benefits

- **Single-use runners** limit exposure of credentials
- Automatically removed after one job
- No long-lived registration tokens required

### Best Practices

1. **Only attach runners to private repositories**
2. **Disable forks** on repositories using self-hosted runners
3. **Use runner groups** to control which repositories can use runners
4. **Implement autoscaling** with ephemeral runners for security
5. **Monitor runner status** and busy state for scheduling decisions

---

## Code Examples

### List Organization Runners

```bash
curl -L \
  -H "Accept: application/vnd.github+json" \
  -H "Authorization: Bearer <YOUR-TOKEN>" \
  -H "X-GitHub-Api-Version: 2022-11-28" \
  https://api.github.com/orgs/ORG/actions/runners
```

### Delete Runner

```bash
curl -L -X DELETE \
  -H "Accept: application/vnd.github+json" \
  -H "Authorization: Bearer <YOUR-TOKEN>" \
  -H "X-GitHub-Api-Version: 2022-11-28" \
  https://api.github.com/orgs/ORG/actions/runners/RUNNER_ID
```

---

## HTTP Status Codes

| Code | Meaning           | Common Endpoints                         |
| ---- | ----------------- | ---------------------------------------- |
| 200  | Success           | GET, POST label operations               |
| 201  | Created           | Token and JIT config generation          |
| 204  | No Content        | DELETE operations                        |
| 404  | Not Found         | Invalid runner/label or missing resource |
| 422  | Validation Failed | Invalid parameters                       |

---

## Pagination

List endpoints support pagination:

| Parameter  | Description           | Default | Maximum |
| ---------- | --------------------- | ------- | ------- |
| `per_page` | Results per page      | 30      | 100     |
| `page`     | Page number           | 1       | -       |
| `name`     | Filter by runner name | -       | -       |

---

## Sources

- [REST API endpoints for self-hosted runners](https://docs.github.com/en/rest/actions/self-hosted-runners)
- [Adding self-hosted runners](https://docs.github.com/en/actions/hosting-your-own-runners/managing-self-hosted-runners/adding-self-hosted-runners)
- [REST API endpoints for self-hosted runner groups](https://docs.github.com/en/rest/actions/self-hosted-runner-groups)
- [GitHub Actions - Just-in-time self-hosted runners](https://github.blog/changelog/2023-06-02-github-actions-just-in-time-self-hosted-runners/)

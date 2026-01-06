# GitHub Actions Workflows API

**Source**: GitHub REST API Official Documentation (Web Research)
**Research Date**: 2026-01-04
**Documentation URL**: https://docs.github.com/en/rest/actions/workflows

---

## Overview

The GitHub REST API provides endpoints for managing GitHub Actions workflows, including listing, enabling, disabling, and triggering workflows programmatically.

---

## API Endpoints

| Endpoint                                                           | Method | Purpose                          |
| ------------------------------------------------------------------ | ------ | -------------------------------- |
| `/repos/{owner}/{repo}/actions/workflows`                          | GET    | List repository workflows        |
| `/repos/{owner}/{repo}/actions/workflows/{workflow_id}`            | GET    | Get a workflow                   |
| `/repos/{owner}/{repo}/actions/workflows/{workflow_id}/disable`    | PUT    | Disable a workflow               |
| `/repos/{owner}/{repo}/actions/workflows/{workflow_id}/dispatches` | POST   | Create a workflow dispatch event |
| `/repos/{owner}/{repo}/actions/workflows/{workflow_id}/enable`     | PUT    | Enable a workflow                |
| `/repos/{owner}/{repo}/actions/workflows/{workflow_id}/timing`     | GET    | Get workflow usage               |

---

## Workflow Dispatch (Manual Triggering)

The dispatch endpoint enables manual triggering of workflows via API. You must configure your workflow to respond when the `workflow_dispatch` webhook event occurs.

### Endpoint

```
POST /repos/{owner}/{repo}/actions/workflows/{workflow_id}/dispatches
```

### Parameters

| Parameter | Type   | Required | Description                            |
| --------- | ------ | -------- | -------------------------------------- |
| `ref`     | string | Yes      | The git reference (branch or tag name) |
| `inputs`  | object | No       | Custom input properties (max 25)       |

### Example Request

```bash
curl -L -X POST \
  -H "Accept: application/vnd.github+json" \
  -H "Authorization: Bearer <YOUR-TOKEN>" \
  -H "X-GitHub-Api-Version: 2022-11-28" \
  https://api.github.com/repos/OWNER/REPO/actions/workflows/WORKFLOW_ID/dispatches \
  -d '{"ref":"main","inputs":{"name":"Mona the Octocat","environment":"production"}}'
```

### Response

Returns `204 No Content` on success.

### Workflow ID

You can use either:

- Workflow file name (e.g., `main.yml`)
- Workflow ID number

---

## Configuring workflow_dispatch in Workflow

To enable manual triggering, configure the `workflow_dispatch` event in your workflow file:

```yaml
name: Manual Workflow

on:
  workflow_dispatch:
    inputs:
      environment:
        description: "Deployment environment"
        required: true
        default: "staging"
        type: choice
        options:
          - staging
          - production
      logLevel:
        description: "Log level"
        required: false
        default: "info"
        type: string

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - name: Deploy to ${{ inputs.environment }}
        run: echo "Deploying with log level ${{ inputs.logLevel }}"
```

### Input Types

| Type          | Description                                        |
| ------------- | -------------------------------------------------- |
| `string`      | Free-form text input                               |
| `choice`      | Single selection from options (resolves to string) |
| `boolean`     | True/false value                                   |
| `environment` | Environment selection                              |

### Input Constraints

- Maximum **25 top-level input properties**
- Maximum **65,535 characters** for entire input payload
- The `inputs` context preserves Boolean values as Booleans
- The `choice` type resolves to a string

---

## Repository Dispatch (External Triggering)

The `repository_dispatch` event allows external systems to trigger workflows through the API.

### Endpoint

```
POST /repos/{owner}/{repo}/dispatches
```

### Parameters

| Parameter        | Type   | Required | Description                               |
| ---------------- | ------ | -------- | ----------------------------------------- |
| `event_type`     | string | Yes      | Activity type (max 100 characters)        |
| `client_payload` | object | No       | Custom data (max 10 top-level properties) |

### Example Request

```bash
curl -L -X POST \
  -H "Accept: application/vnd.github+json" \
  -H "Authorization: Bearer <YOUR-TOKEN>" \
  -H "X-GitHub-Api-Version: 2022-11-28" \
  https://api.github.com/repos/OWNER/REPO/dispatches \
  -d '{"event_type":"webhook","client_payload":{"unit":false,"integration":true}}'
```

### Configuring repository_dispatch in Workflow

```yaml
name: Repository Dispatch Handler

on:
  repository_dispatch:
    types: [webhook, external-trigger]

jobs:
  handle-dispatch:
    runs-on: ubuntu-latest
    steps:
      - name: Process event
        run: |
          echo "Event type: ${{ github.event.action }}"
          echo "Unit tests: ${{ github.event.client_payload.unit }}"
          echo "Integration: ${{ github.event.client_payload.integration }}"
```

---

## Authentication Requirements

### OAuth & Classic PATs

- Require `repo` scope

### Fine-Grained Personal Access Tokens

- Require `"Actions" repository permissions (write)` for dispatch operations

### GitHub Apps

- Support both user access tokens and installation access tokens
- Require `actions:write` permission

---

## Programmatic Triggering Methods

### Using GitHub CLI

```bash
# Trigger workflow with inputs
gh workflow run run-tests.yml -f logLevel=warning -f tags=false

# Trigger on specific branch
gh workflow run deploy.yml --ref feature-branch
```

### Using Octokit.js

```javascript
await octokit.rest.actions.createWorkflowDispatch({
  owner: "OWNER",
  repo: "REPO",
  workflow_id: "deploy.yml",
  ref: "main",
  inputs: {
    environment: "production",
    logLevel: "info",
  },
});
```

### Using GITHUB_TOKEN in Actions

```yaml
- name: Trigger another workflow
  uses: actions/github-script@v7
  with:
    script: |
      await github.rest.actions.createWorkflowDispatch({
        owner: context.repo.owner,
        repo: context.repo.repo,
        workflow_id: 'deploy.yml',
        ref: 'main'
      });
```

---

## List Workflows

### Request

```bash
curl -L \
  -H "Accept: application/vnd.github+json" \
  -H "Authorization: Bearer <YOUR-TOKEN>" \
  -H "X-GitHub-Api-Version: 2022-11-28" \
  https://api.github.com/repos/OWNER/REPO/actions/workflows
```

### Response

```json
{
  "total_count": 2,
  "workflows": [
    {
      "id": 161335,
      "node_id": "MDg6V29ya2Zsb3cxNjEzMzU=",
      "name": "CI",
      "path": ".github/workflows/ci.yml",
      "state": "active",
      "created_at": "2020-01-08T23:48:37.000-08:00",
      "updated_at": "2020-01-08T23:50:21.000-08:00",
      "url": "https://api.github.com/repos/octo-org/octo-repo/actions/workflows/161335",
      "html_url": "https://github.com/octo-org/octo-repo/blob/master/.github/workflows/ci.yml",
      "badge_url": "https://github.com/octo-org/octo-repo/workflows/CI/badge.svg"
    }
  ]
}
```

---

## Enable/Disable Workflows

### Disable Workflow

```bash
curl -L -X PUT \
  -H "Accept: application/vnd.github+json" \
  -H "Authorization: Bearer <YOUR-TOKEN>" \
  -H "X-GitHub-Api-Version: 2022-11-28" \
  https://api.github.com/repos/OWNER/REPO/actions/workflows/WORKFLOW_ID/disable
```

### Enable Workflow

```bash
curl -L -X PUT \
  -H "Accept: application/vnd.github+json" \
  -H "Authorization: Bearer <YOUR-TOKEN>" \
  -H "X-GitHub-Api-Version: 2022-11-28" \
  https://api.github.com/repos/OWNER/REPO/actions/workflows/WORKFLOW_ID/enable
```

Both return `204 No Content` on success.

---

## Workflow Usage

Get billing usage for a workflow:

```bash
curl -L \
  -H "Accept: application/vnd.github+json" \
  -H "Authorization: Bearer <YOUR-TOKEN>" \
  -H "X-GitHub-Api-Version: 2022-11-28" \
  https://api.github.com/repos/OWNER/REPO/actions/workflows/WORKFLOW_ID/timing
```

### Response

```json
{
  "billable": {
    "UBUNTU": {
      "total_ms": 180000,
      "jobs": 1,
      "job_runs": [
        {
          "job_id": 1,
          "duration_ms": 180000
        }
      ]
    }
  }
}
```

---

## Important Constraints

### Default Branch Requirement

Both `workflow_dispatch` and `repository_dispatch` require the workflow file to exist on the **default branch** to execute.

### Context Variables

For `workflow_dispatch`:

- `GITHUB_SHA`: Last commit on the selected branch or tag
- `GITHUB_REF`: The selected branch or tag

### Input Access

| Context                    | Type Preservation                      |
| -------------------------- | -------------------------------------- |
| `inputs.name`              | Preserves type (boolean stays boolean) |
| `github.event.inputs.name` | All values as strings                  |

---

## HTTP Status Codes

| Code | Meaning           | Endpoint                       |
| ---- | ----------------- | ------------------------------ |
| 200  | Success           | GET operations                 |
| 204  | No Content        | Dispatch, enable, disable      |
| 404  | Not Found         | Invalid workflow or repository |
| 422  | Validation Failed | Invalid inputs or parameters   |

---

## Use Cases

### CI/CD Pipeline Triggering

```yaml
on:
  workflow_dispatch:
    inputs:
      deploy_target:
        description: "Deploy target"
        required: true
        type: choice
        options:
          - staging
          - production
```

### Cross-Repository Triggering

Use `repository_dispatch` to trigger workflows in other repositories when events occur.

### Scheduled + Manual

```yaml
on:
  schedule:
    - cron: "0 0 * * *"
  workflow_dispatch:
    inputs:
      force:
        description: "Force rebuild"
        type: boolean
        default: false
```

---

## Sources

- [REST API endpoints for workflows](https://docs.github.com/en/rest/actions/workflows)
- [Events that trigger workflows](https://docs.github.com/actions/learn-github-actions/events-that-trigger-workflows)
- [GitHub Actions: Use the GITHUB_TOKEN with workflow_dispatch](https://github.blog/changelog/2022-09-08-github-actions-use-github_token-with-workflow_dispatch-and-repository_dispatch/)
- [Trigger GitHub Actions with the REST API](https://www.sabbirz.com/blog/trigger-github-actions-with-the-rest-api)

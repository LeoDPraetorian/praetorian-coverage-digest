# Azure DevOps Python Client Implementation

Complete Python implementation guide for Azure DevOps API integration.

**Related files:**

- [Go Implementation](client-implementation-go.md)
- [Common Patterns & Best Practices](client-implementation-common.md)

---

## Official SDK

**Package:** `azure-devops`

### Installation

```bash
pip install azure-devops
```

### Basic Client Setup

```python
from azure.devops.connection import Connection
from msrest.authentication import BasicAuthentication
import os

class AzureDevOpsClient:
    def __init__(self, org_url: str, pat: str):
        # Create authentication
        credentials = BasicAuthentication('', pat)

        # Create connection
        self.connection = Connection(
            base_url=org_url,
            creds=credentials
        )

        # Initialize clients
        self.core_client = self.connection.clients.get_core_client()
        self.git_client = self.connection.clients.get_git_client()
        self.wit_client = self.connection.clients.get_work_item_tracking_client()
        self.build_client = self.connection.clients.get_build_client()

    def close(self):
        """Close connection"""
        self.connection.close()

# Usage
client = AzureDevOpsClient(
    org_url='https://dev.azure.com/myorg',
    pat=os.getenv('AZURE_DEVOPS_PAT')
)
```

### Context Manager Pattern

```python
from contextlib import contextmanager

@contextmanager
def azure_devops_client(org_url: str, pat: str):
    """Context manager for AzureDevOpsClient"""
    client = AzureDevOpsClient(org_url, pat)
    try:
        yield client
    finally:
        client.close()

# Usage
with azure_devops_client(org_url, pat) as client:
    repos = client.git_client.get_repositories(project_id)
```

---

## Repository Operations

```python
def list_repositories(self, project_id: str):
    """List all repositories in a project"""
    repos = self.git_client.get_repositories(project_id)
    return repos

def get_repository(self, project_id: str, repo_id: str):
    """Get a single repository"""
    repo = self.git_client.get_repository(
        project=project_id,
        repository_id=repo_id
    )
    return repo

def get_pull_request(self, project_id: str, repo_id: str, pr_id: int):
    """Get pull request details"""
    pr = self.git_client.get_pull_request(
        project=project_id,
        repository_id=repo_id,
        pull_request_id=pr_id
    )
    return pr
```

---

## Work Item Operations

```python
from azure.devops.v7_1.work_item_tracking.models import JsonPatchOperation

def get_work_item(self, work_item_id: int):
    """Get a single work item"""
    work_item = self.wit_client.get_work_item(work_item_id)
    return work_item

def get_work_items_batch(self, work_item_ids: list[int]):
    """Get multiple work items (up to 200)"""
    work_items = self.wit_client.get_work_items(ids=work_item_ids)
    return work_items

def create_work_item(self, project_id: str, work_item_type: str, fields: dict):
    """Create a work item using JSON Patch"""
    document = []

    for field_path, value in fields.items():
        document.append(
            JsonPatchOperation(
                op='add',
                path=f'/fields/{field_path}',
                value=value
            )
        )

    work_item = self.wit_client.create_work_item(
        document=document,
        project=project_id,
        type=work_item_type
    )

    return work_item

def update_work_item(self, work_item_id: int, fields: dict):
    """Update a work item using JSON Patch"""
    document = []

    for field_path, value in fields.items():
        document.append(
            JsonPatchOperation(
                op='replace',
                path=f'/fields/{field_path}',
                value=value
            )
        )

    work_item = self.wit_client.update_work_item(
        document=document,
        id=work_item_id
    )

    return work_item
```

---

## WIQL Query

```python
from azure.devops.v7_1.work_item_tracking.models import Wiql

def query_work_items(self, project_id: str, wiql_query: str):
    """Execute WIQL query"""
    wiql = Wiql(query=wiql_query)

    result = self.wit_client.query_by_wiql(
        wiql=wiql,
        project=project_id
    )

    # Extract work item IDs
    if result.work_items:
        ids = [item.id for item in result.work_items]

        # Fetch full work items (batch)
        if ids:
            work_items = self.get_work_items_batch(ids)
            return work_items

    return []
```

---

## Error Handling

```python
from azure.devops.exceptions import AzureDevOpsServiceError

def safe_get_work_item(self, work_item_id: int):
    """Get work item with error handling"""
    try:
        return self.wit_client.get_work_item(work_item_id)
    except AzureDevOpsServiceError as e:
        if e.status_code == 404:
            print(f"Work item {work_item_id} not found")
            return None
        elif e.status_code == 401:
            print("Authentication failed - check PAT")
            raise
        elif e.status_code == 429:
            print("Rate limited - backing off")
            raise
        else:
            print(f"Error: {e.message}")
            raise
```

---

## Related Resources

- [azure-devops-python-api GitHub](https://github.com/microsoft/azure-devops-python-api)
- [API Reference](api-reference.md)
- [Authentication Guide](authentication.md)

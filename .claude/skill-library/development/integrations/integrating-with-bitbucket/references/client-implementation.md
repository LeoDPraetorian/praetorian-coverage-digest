# Client Implementation Examples

**Complete Go and Python client implementations for Bitbucket Cloud API 2.0.**

---

## Go Client Implementation

### Complete Client Structure

```go
package bitbucket

import (
    "bytes"
    "encoding/json"
    "fmt"
    "io"
    "net/http"
    "time"
)

// Client represents a Bitbucket API client
type Client struct {
    BaseURL    string
    Email      string
    APIToken   string
    HTTPClient *http.Client
    Cache      *ResponseCache
}

// NewClient creates a new Bitbucket API client
func NewClient(email, apiToken string) *Client {
    return &Client{
        BaseURL:  "https://api.bitbucket.org/2.0",
        Email:    email,
        APIToken: apiToken,
        HTTPClient: &http.Client{
            Timeout: 30 * time.Second,
        },
        Cache: NewResponseCache(5 * time.Minute),
    }
}

// Request makes an HTTP request to the Bitbucket API
func (c *Client) Request(method, path string, body interface{}) (*http.Response, error) {
    var reqBody io.Reader
    if body != nil {
        jsonBody, err := json.Marshal(body)
        if err != nil {
            return nil, fmt.Errorf("marshal request body: %w", err)
        }
        reqBody = bytes.NewBuffer(jsonBody)
    }

    req, err := http.NewRequest(method, c.BaseURL+path, reqBody)
    if err != nil {
        return nil, fmt.Errorf("create request: %w", err)
    }

    // Set authentication
    req.SetBasicAuth(c.Email, c.APIToken)

    // Set headers
    req.Header.Set("Content-Type", "application/json")
    req.Header.Set("Accept", "application/json")

    resp, err := c.HTTPClient.Do(req)
    if err != nil {
        return nil, fmt.Errorf("execute request: %w", err)
    }

    return resp, nil
}
```

### Repository Operations

```go
// Repository represents a Bitbucket repository
type Repository struct {
    FullName    string    `json:"full_name"`
    Name        string    `json:"name"`
    Description string    `json:"description"`
    IsPrivate   bool      `json:"is_private"`
    Language    string    `json:"language"`
    UpdatedOn   time.Time `json:"updated_on"`
    Links       struct {
        Clone []struct {
            Name string `json:"name"`
            Href string `json:"href"`
        } `json:"clone"`
    } `json:"links"`
}

// ListRepositories lists all repositories in a workspace
func (c *Client) ListRepositories(workspace string) ([]Repository, error) {
    var repos []Repository
    nextURL := fmt.Sprintf("/repositories/%s?pagelen=100", workspace)

    for nextURL != "" {
        resp, err := c.Request("GET", nextURL, nil)
        if err != nil {
            return nil, err
        }
        defer resp.Body.Close()

        if resp.StatusCode != http.StatusOK {
            return nil, fmt.Errorf("unexpected status: %d", resp.StatusCode)
        }

        var page struct {
            Values []Repository `json:"values"`
            Next   string       `json:"next"`
        }
        if err := json.NewDecoder(resp.Body).Decode(&page); err != nil {
            return nil, fmt.Errorf("decode response: %w", err)
        }

        repos = append(repos, page.Values...)

        // Extract path from next URL for relative request
        if page.Next != "" {
            nextURL = page.Next[len(c.BaseURL):]
        } else {
            nextURL = ""
        }
    }

    return repos, nil
}

// GetRepository gets a single repository
func (c *Client) GetRepository(workspace, repoSlug string) (*Repository, error) {
    path := fmt.Sprintf("/repositories/%s/%s", workspace, repoSlug)

    resp, err := c.Request("GET", path, nil)
    if err != nil {
        return nil, err
    }
    defer resp.Body.Close()

    if resp.StatusCode != http.StatusOK {
        return nil, fmt.Errorf("unexpected status: %d", resp.StatusCode)
    }

    var repo Repository
    if err := json.NewDecoder(resp.Body).Decode(&repo); err != nil {
        return nil, fmt.Errorf("decode response: %w", err)
    }

    return &repo, nil
}
```

### Pull Request Operations

```go
// PullRequest represents a Bitbucket pull request
type PullRequest struct {
    ID          int       `json:"id"`
    Title       string    `json:"title"`
    Description string    `json:"description"`
    State       string    `json:"state"`
    CreatedOn   time.Time `json:"created_on"`
    UpdatedOn   time.Time `json:"updated_on"`
    Source      struct {
        Branch struct {
            Name string `json:"name"`
        } `json:"branch"`
        Repository Repository `json:"repository"`
    } `json:"source"`
    Destination struct {
        Branch struct {
            Name string `json:"name"`
        } `json:"branch"`
    } `json:"destination"`
    Author struct {
        DisplayName string `json:"display_name"`
        UUID        string `json:"uuid"`
    } `json:"author"`
}

// ListPullRequests lists all pull requests for a repository
func (c *Client) ListPullRequests(workspace, repoSlug string, state string) ([]PullRequest, error) {
    var prs []PullRequest
    nextURL := fmt.Sprintf("/repositories/%s/%s/pullrequests?state=%s&pagelen=100",
        workspace, repoSlug, state)

    for nextURL != "" {
        resp, err := c.Request("GET", nextURL, nil)
        if err != nil {
            return nil, err
        }
        defer resp.Body.Close()

        var page struct {
            Values []PullRequest `json:"values"`
            Next   string        `json:"next"`
        }
        if err := json.NewDecoder(resp.Body).Decode(&page); err != nil {
            return nil, err
        }

        prs = append(prs, page.Values...)

        if page.Next != "" {
            nextURL = page.Next[len(c.BaseURL):]
        } else {
            nextURL = ""
        }
    }

    return prs, nil
}

// GetPullRequest gets a single pull request
func (c *Client) GetPullRequest(workspace, repoSlug string, prID int) (*PullRequest, error) {
    path := fmt.Sprintf("/repositories/%s/%s/pullrequests/%d", workspace, repoSlug, prID)

    resp, err := c.Request("GET", path, nil)
    if err != nil {
        return nil, err
    }
    defer resp.Body.Close()

    var pr PullRequest
    if err := json.NewDecoder(resp.Body).Decode(&pr); err != nil {
        return nil, err
    }

    return &pr, nil
}
```

### Webhook Operations

```go
// Webhook represents a Bitbucket webhook
type Webhook struct {
    UUID        string   `json:"uuid,omitempty"`
    Description string   `json:"description"`
    URL         string   `json:"url"`
    Active      bool     `json:"active"`
    Events      []string `json:"events"`
}

// CreateWebhook creates a new webhook
func (c *Client) CreateWebhook(workspace, repoSlug string, webhook *Webhook) (*Webhook, error) {
    path := fmt.Sprintf("/repositories/%s/%s/hooks", workspace, repoSlug)

    resp, err := c.Request("POST", path, webhook)
    if err != nil {
        return nil, err
    }
    defer resp.Body.Close()

    if resp.StatusCode != http.StatusCreated {
        body, _ := io.ReadAll(resp.Body)
        return nil, fmt.Errorf("unexpected status %d: %s", resp.StatusCode, string(body))
    }

    var created Webhook
    if err := json.NewDecoder(resp.Body).Decode(&created); err != nil {
        return nil, err
    }

    return &created, nil
}

// ListWebhooks lists all webhooks for a repository
func (c *Client) ListWebhooks(workspace, repoSlug string) ([]Webhook, error) {
    path := fmt.Sprintf("/repositories/%s/%s/hooks", workspace, repoSlug)

    resp, err := c.Request("GET", path, nil)
    if err != nil {
        return nil, err
    }
    defer resp.Body.Close()

    var result struct {
        Values []Webhook `json:"values"`
    }
    if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
        return nil, err
    }

    return result.Values, nil
}
```

---

## Python Client Implementation

### Complete Client Structure

```python
import requests
from requests.auth import HTTPBasicAuth
from typing import List, Optional, Dict, Any
import time

class BitbucketClient:
    """Bitbucket Cloud API 2.0 client."""

    def __init__(self, email: str, api_token: str, timeout: int = 30):
        """
        Initialize Bitbucket client.

        Args:
            email: Atlassian account email
            api_token: Bitbucket API token
            timeout: Request timeout in seconds
        """
        self.base_url = "https://api.bitbucket.org/2.0"
        self.auth = HTTPBasicAuth(email, api_token)
        self.session = requests.Session()
        self.session.timeout = timeout
        self.cache = {}

    def _request(
        self,
        method: str,
        path: str,
        json: Optional[Dict] = None,
        params: Optional[Dict] = None
    ) -> requests.Response:
        """Make HTTP request to Bitbucket API."""
        url = self.base_url + path

        response = self.session.request(
            method,
            url,
            auth=self.auth,
            json=json,
            params=params,
            headers={
                "Content-Type": "application/json",
                "Accept": "application/json"
            }
        )

        response.raise_for_status()
        return response
```

### Repository Operations

```python
    def list_repositories(self, workspace: str) -> List[Dict[str, Any]]:
        """
        List all repositories in a workspace.

        Args:
            workspace: Workspace slug

        Returns:
            List of repository dictionaries
        """
        repos = []
        next_url = f"/repositories/{workspace}?pagelen=100"

        while next_url:
            response = self._request("GET", next_url)
            data = response.json()

            repos.extend(data.get("values", []))

            # Extract path from next URL
            next_full = data.get("next", "")
            next_url = next_full.replace(self.base_url, "") if next_full else ""

        return repos

    def get_repository(self, workspace: str, repo_slug: str) -> Dict[str, Any]:
        """
        Get a single repository.

        Args:
            workspace: Workspace slug
            repo_slug: Repository slug

        Returns:
            Repository dictionary
        """
        path = f"/repositories/{workspace}/{repo_slug}"
        response = self._request("GET", path)
        return response.json()
```

### Pull Request Operations

```python
    def list_pull_requests(
        self,
        workspace: str,
        repo_slug: str,
        state: str = "OPEN"
    ) -> List[Dict[str, Any]]:
        """
        List pull requests for a repository.

        Args:
            workspace: Workspace slug
            repo_slug: Repository slug
            state: PR state (OPEN, MERGED, DECLINED, SUPERSEDED)

        Returns:
            List of pull request dictionaries
        """
        prs = []
        next_url = f"/repositories/{workspace}/{repo_slug}/pullrequests?state={state}&pagelen=100"

        while next_url:
            response = self._request("GET", next_url)
            data = response.json()

            prs.extend(data.get("values", []))

            next_full = data.get("next", "")
            next_url = next_full.replace(self.base_url, "") if next_full else ""

        return prs

    def get_pull_request(
        self,
        workspace: str,
        repo_slug: str,
        pr_id: int
    ) -> Dict[str, Any]:
        """
        Get a single pull request.

        Args:
            workspace: Workspace slug
            repo_slug: Repository slug
            pr_id: Pull request ID

        Returns:
            Pull request dictionary
        """
        path = f"/repositories/{workspace}/{repo_slug}/pullrequests/{pr_id}"
        response = self._request("GET", path)
        return response.json()

    def create_pull_request_comment(
        self,
        workspace: str,
        repo_slug: str,
        pr_id: int,
        content: str
    ) -> Dict[str, Any]:
        """
        Create a comment on a pull request.

        Args:
            workspace: Workspace slug
            repo_slug: Repository slug
            pr_id: Pull request ID
            content: Comment text (markdown supported)

        Returns:
            Created comment dictionary
        """
        path = f"/repositories/{workspace}/{repo_slug}/pullrequests/{pr_id}/comments"
        payload = {
            "content": {
                "raw": content
            }
        }
        response = self._request("POST", path, json=payload)
        return response.json()
```

### Webhook Operations

```python
    def create_webhook(
        self,
        workspace: str,
        repo_slug: str,
        url: str,
        events: List[str],
        description: str = "",
        active: bool = True
    ) -> Dict[str, Any]:
        """
        Create a webhook for a repository.

        Args:
            workspace: Workspace slug
            repo_slug: Repository slug
            url: Webhook callback URL
            events: List of event types (e.g., ["repo:push", "pullrequest:created"])
            description: Webhook description
            active: Whether webhook is active

        Returns:
            Created webhook dictionary
        """
        path = f"/repositories/{workspace}/{repo_slug}/hooks"
        payload = {
            "description": description,
            "url": url,
            "active": active,
            "events": events
        }
        response = self._request("POST", path, json=payload)
        return response.json()

    def list_webhooks(self, workspace: str, repo_slug: str) -> List[Dict[str, Any]]:
        """
        List all webhooks for a repository.

        Args:
            workspace: Workspace slug
            repo_slug: Repository slug

        Returns:
            List of webhook dictionaries
        """
        path = f"/repositories/{workspace}/{repo_slug}/hooks"
        response = self._request("GET", path)
        data = response.json()
        return data.get("values", [])
```

---

## Usage Examples

### Go Example: List Repositories and PRs

```go
package main

import (
    "fmt"
    "log"
    "os"
)

func main() {
    client := bitbucket.NewClient(
        os.Getenv("BITBUCKET_EMAIL"),
        os.Getenv("BITBUCKET_API_TOKEN"),
    )

    // List repositories
    repos, err := client.ListRepositories("my-workspace")
    if err != nil {
        log.Fatal(err)
    }

    fmt.Printf("Found %d repositories\n", len(repos))

    // List open PRs for first repo
    if len(repos) > 0 {
        prs, err := client.ListPullRequests("my-workspace", repos[0].Name, "OPEN")
        if err != nil {
            log.Fatal(err)
        }

        fmt.Printf("Repository %s has %d open PRs\n", repos[0].Name, len(prs))

        for _, pr := range prs {
            fmt.Printf("  - PR #%d: %s\n", pr.ID, pr.Title)
        }
    }
}
```

### Python Example: Create Webhook

```python
import os
from bitbucket_client import BitbucketClient

def main():
    client = BitbucketClient(
        email=os.environ["BITBUCKET_EMAIL"],
        api_token=os.environ["BITBUCKET_API_TOKEN"]
    )

    # Create webhook
    webhook = client.create_webhook(
        workspace="my-workspace",
        repo_slug="my-repo",
        url="https://myapp.com/webhooks/bitbucket",
        events=[
            "repo:push",
            "pullrequest:created",
            "pullrequest:updated",
            "pullrequest:fulfilled"
        ],
        description="Chariot security automation webhook"
    )

    print(f"Created webhook: {webhook['uuid']}")
    print(f"Listening for {len(webhook['events'])} event types")

if __name__ == "__main__":
    main()
```

---

## Client Libraries

### Go

**Recommended Libraries:**

- **ktrysmt/go-bitbucket** - Most popular, API 2.0 support
- **DrFaust92/bitbucket-go-client** - Auto-generated from OpenAPI spec
- **emicklei/go-bitbucket** - Simple REST API 2.0 client

**Installation:**

```bash
go get github.com/ktrysmt/go-bitbucket
```

### Python

**Recommended Libraries:**

- **atlassian-python-api** - Official-style, comprehensive
- **pybitbucket** - Pythonic interface
- **requests** + manual implementation (shown above)

**Installation:**

```bash
pip install atlassian-python-api
# OR
pip install requests
```

---

## Related Documentation

- [authentication.md](authentication.md) - Authentication setup
- [rate-limiting.md](rate-limiting.md) - Rate limit handling
- [error-handling.md](error-handling.md) - Error recovery patterns

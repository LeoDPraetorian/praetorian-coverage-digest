# Panorama Commit Operations

**Last Updated:** January 2026
**Source:** Research from `.claude/.output/research/2026-01-03-165242-panorama-api-complete/`

## Overview

Panorama configuration changes require a **mandatory two-step commit workflow**. Unlike the GUI which abstracts this, API integrations must explicitly commit to Panorama first, then push to managed devices. Both operations are asynchronous and return job IDs that must be polled for completion.

## Quick Reference

| Operation          | API Type | Command                                               | Returns |
| ------------------ | -------- | ----------------------------------------------------- | ------- |
| Commit to Panorama | XML API  | `type=commit&cmd=<commit></commit>`                   | Job ID  |
| Push to Devices    | XML API  | `type=commit&action=all&cmd=<commit-all>...`          | Job ID  |
| Check Job Status   | XML API  | `type=op&cmd=<show><jobs><id>{id}</id></jobs></show>` | Status  |

### Job Status Values

| Status | Result | Meaning                         |
| ------ | ------ | ------------------------------- |
| `PEND` | -      | Job pending, not yet started    |
| `ACT`  | -      | Job active, in progress         |
| `FIN`  | `OK`   | Job completed successfully      |
| `FIN`  | `FAIL` | Job failed, check error details |

## Complete Commit Workflow

### Step 1: Commit to Panorama

Validates and saves configuration changes to the Panorama management server.

**Request:**

```bash
curl -k -g "https://<panorama>/api/?key=$API_KEY&type=commit&cmd=<commit></commit>"
```

**Success Response:**

```xml
<response status="success" code="19">
  <result>
    <msg><line>Commit job enqueued with jobid 271</line></msg>
    <job>271</job>
  </result>
</response>
```

### Step 2: Poll Commit Job Status

Monitor the commit job until completion before proceeding to push.

**Request:**

```bash
curl -k -g "https://<panorama>/api/?key=$API_KEY&type=op&cmd=<show><jobs><id>271</id></jobs></show>"
```

**Active Job Response:**

```xml
<response status="success">
  <result>
    <job>
      <id>271</id>
      <type>Commit</type>
      <status>ACT</status>
      <result>PEND</result>
    </job>
  </result>
</response>
```

**Completed Job Response:**

```xml
<response status="success">
  <result>
    <job>
      <id>271</id>
      <type>Commit</type>
      <status>FIN</status>
      <result>OK</result>
      <details>
        <line>Configuration committed successfully</line>
      </details>
    </job>
  </result>
</response>
```

### Step 3: Push to Device Groups

After Panorama commit succeeds, push configuration to managed firewalls.

**Request:**

```bash
curl -k -g "https://<panorama>/api/?key=$API_KEY&type=commit&action=all&cmd=<commit-all><shared-policy><device-group><entry name=\"Production-DG\"/></device-group></shared-policy></commit-all>"
```

### Step 4: Poll Push Job Status

Same polling pattern as commit job.

## Go Implementation

### Complete Commit and Push Workflow

```go
package panorama

import (
    "context"
    "encoding/xml"
    "fmt"
    "net/url"
    "time"
)

// CommitResponse represents the API response for commit operations
type CommitResponse struct {
    Status string `xml:"status,attr"`
    Result struct {
        Job string `xml:"job"`
        Msg struct {
            Line string `xml:"line"`
        } `xml:"msg"`
    } `xml:"result"`
}

// JobStatus represents a job status response
type JobStatus struct {
    Status string `xml:"status,attr"`
    Result struct {
        Job struct {
            ID     string `xml:"id"`
            Type   string `xml:"type"`
            Status string `xml:"status"`
            Result string `xml:"result"`
            Details struct {
                Line []string `xml:"line"`
            } `xml:"details"`
        } `xml:"job"`
    } `xml:"result"`
}

// DeployConfiguration performs full commit and push workflow
func (c *Client) DeployConfiguration(ctx context.Context, deviceGroup string) error {
    // Step 1: Commit to Panorama
    commitJobID, err := c.commit(ctx)
    if err != nil {
        return fmt.Errorf("commit to panorama failed: %w", err)
    }

    // Step 2: Wait for commit completion
    if err := c.waitForJob(ctx, commitJobID, 30*time.Minute); err != nil {
        return fmt.Errorf("commit job failed: %w", err)
    }

    // Step 3: Push to device group (skip if no device group specified)
    if deviceGroup == "" {
        return nil
    }

    pushJobID, err := c.pushToDeviceGroup(ctx, deviceGroup)
    if err != nil {
        return fmt.Errorf("push to devices failed: %w", err)
    }

    // Step 4: Wait for push completion
    if err := c.waitForJob(ctx, pushJobID, 30*time.Minute); err != nil {
        return fmt.Errorf("push job failed: %w", err)
    }

    return nil
}

// commit initiates a Panorama commit and returns the job ID
func (c *Client) commit(ctx context.Context) (string, error) {
    params := url.Values{
        "type": {"commit"},
        "cmd":  {"<commit></commit>"},
        "key":  {c.APIKey},
    }

    resp, err := c.makeRequest(ctx, params)
    if err != nil {
        return "", err
    }

    var commitResp CommitResponse
    if err := xml.Unmarshal(resp, &commitResp); err != nil {
        return "", fmt.Errorf("failed to parse commit response: %w", err)
    }

    if commitResp.Status != "success" {
        return "", fmt.Errorf("commit failed: %s", commitResp.Result.Msg.Line)
    }

    return commitResp.Result.Job, nil
}

// pushToDeviceGroup pushes configuration to a device group
func (c *Client) pushToDeviceGroup(ctx context.Context, deviceGroup string) (string, error) {
    cmd := fmt.Sprintf(`<commit-all>
        <shared-policy>
            <device-group>
                <entry name="%s"/>
            </device-group>
        </shared-policy>
    </commit-all>`, deviceGroup)

    params := url.Values{
        "type":   {"commit"},
        "action": {"all"},
        "cmd":    {cmd},
        "key":    {c.APIKey},
    }

    resp, err := c.makeRequest(ctx, params)
    if err != nil {
        return "", err
    }

    var commitResp CommitResponse
    if err := xml.Unmarshal(resp, &commitResp); err != nil {
        return "", fmt.Errorf("failed to parse push response: %w", err)
    }

    return commitResp.Result.Job, nil
}

// waitForJob polls job status until completion or timeout
func (c *Client) waitForJob(ctx context.Context, jobID string, timeout time.Duration) error {
    ticker := time.NewTicker(5 * time.Second)
    defer ticker.Stop()

    timeoutCh := time.After(timeout)

    for {
        select {
        case <-ctx.Done():
            return ctx.Err()
        case <-timeoutCh:
            return fmt.Errorf("job %s timed out after %v", jobID, timeout)
        case <-ticker.C:
            status, err := c.getJobStatus(ctx, jobID)
            if err != nil {
                return fmt.Errorf("failed to get job status: %w", err)
            }

            switch status.Result.Job.Status {
            case "FIN":
                if status.Result.Job.Result == "OK" {
                    return nil
                }
                return fmt.Errorf("job %s failed: %v", jobID, status.Result.Job.Details.Line)
            case "PEND", "ACT":
                // Continue polling
                continue
            default:
                return fmt.Errorf("unknown job status: %s", status.Result.Job.Status)
            }
        }
    }
}

// getJobStatus retrieves the current status of a job
func (c *Client) getJobStatus(ctx context.Context, jobID string) (*JobStatus, error) {
    cmd := fmt.Sprintf("<show><jobs><id>%s</id></jobs></show>", jobID)

    params := url.Values{
        "type": {"op"},
        "cmd":  {cmd},
        "key":  {c.APIKey},
    }

    resp, err := c.makeRequest(ctx, params)
    if err != nil {
        return nil, err
    }

    var status JobStatus
    if err := xml.Unmarshal(resp, &status); err != nil {
        return nil, fmt.Errorf("failed to parse job status: %w", err)
    }

    return &status, nil
}
```

## Advanced Commit Options

### Partial Commit

Commit only specific administrators' changes:

```xml
<commit>
  <partial>
    <admin><member>admin1</member></admin>
  </partial>
</commit>
```

### Force Commit

Force commit even with warnings:

```xml
<commit>
  <force></force>
</commit>
```

### Commit with Description

Add audit trail description:

```xml
<commit>
  <description>Automated commit from Chariot integration</description>
</commit>
```

### Selective Device Push

Push to specific devices within a device group:

```xml
<commit-all>
  <shared-policy>
    <device-group>
      <entry name="Production-DG">
        <devices>
          <entry name="007951000123456"/>
          <entry name="007951000123457"/>
        </devices>
      </entry>
    </device-group>
  </shared-policy>
</commit-all>
```

## Rollback Procedures

### Load Previous Configuration

Panorama automatically saves `running-config.xml` before each commit:

```go
func (c *Client) Rollback(ctx context.Context) error {
    // Load previous running config
    loadCmd := "<load><config><from>running-config.xml</from></config></load>"

    params := url.Values{
        "type": {"op"},
        "cmd":  {loadCmd},
        "key":  {c.APIKey},
    }

    _, err := c.makeRequest(ctx, params)
    if err != nil {
        return fmt.Errorf("failed to load previous config: %w", err)
    }

    // Commit the rollback
    return c.DeployConfiguration(ctx, "")
}
```

### List Available Configurations

```xml
<show><config><saved></saved></config></show>
```

## Python SDK Example

Using pan-python for synchronous commits:

```python
#!/usr/bin/env python3
import pan.xapi
import sys

HOSTNAME = "<panorama-hostname>"
API_KEY = "<api-key>"

try:
    xapi = pan.xapi.PanXapi(
        api_key=API_KEY,
        hostname=HOSTNAME,
        use_get=True
    )
except pan.xapi.PanXapiError as msg:
    print(f'Connection failed: {msg}', file=sys.stderr)
    sys.exit(1)

try:
    # sync=True handles job polling automatically
    xapi.commit(cmd='<commit></commit>', sync=True)
    print("Commit successful")
    print(xapi.xml_root())
except pan.xapi.PanXapiError as msg:
    print(f'Commit failed: {msg}', file=sys.stderr)
    sys.exit(1)
```

## Best Practices

1. **Always poll job status** - Never assume commit completed instantly
2. **Set reasonable timeouts** - Large configurations can take 10-30 minutes
3. **Implement rollback** - Have automated rollback on failure
4. **Add commit descriptions** - Enable audit trail
5. **Validate before commit** - Use `<validate>` command first
6. **Handle partial failures** - Device push can succeed on some devices, fail on others
7. **Log all operations** - Track job IDs for troubleshooting

## Common Issues

| Issue                      | Cause                       | Solution                              |
| -------------------------- | --------------------------- | ------------------------------------- |
| Commit hangs               | Large config or slow device | Increase timeout, check device health |
| Push fails to some devices | Device unreachable          | Check device connectivity, retry      |
| Validation errors          | Invalid configuration       | Review error details, fix config      |
| Lock conflicts             | Another admin has lock      | Wait or force unlock (admin only)     |

## Related References

- [Error Handling](error-handling.md) - Commit error codes
- [Authentication](authentication.md) - API key setup
- [Rate Limiting](rate-limiting.md) - Commit rate limits

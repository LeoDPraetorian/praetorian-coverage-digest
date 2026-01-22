# ExtraHop Detections API

## Overview

The Detections API provides access to security detections identified by ExtraHop's machine learning and threat intelligence. Detections include threat actors, suspicious behaviors, anomalies, and policy violations.

## Endpoints

### List Detections

```
GET /api/v1/detections
```

**Query Parameters:**

| Parameter  | Type   | Description                                           |
| ---------- | ------ | ----------------------------------------------------- |
| `limit`    | int    | Maximum detections to return (default: 200, max: 200) |
| `offset`   | int    | Number of detections to skip for pagination           |
| `from`     | int    | Start time (Unix timestamp in milliseconds)           |
| `until`    | int    | End time (Unix timestamp in milliseconds)             |
| `filter`   | string | JSON filter object                                    |
| `sort`     | string | Sort field and direction                              |
| `mod_time` | int    | Return detections modified after this time            |

**Example:**

```bash
curl -X GET "https://extrahop/api/v1/detections?limit=200&offset=0&from=1609459200000" \
  -H "Authorization: ExtraHop apikey=YOUR_KEY"
```

### Get Detection

```
GET /api/v1/detections/{id}
```

**Response:**

```json
{
  "id": 12345,
  "title": "Suspicious DNS Query",
  "description": "Device made DNS queries to known malicious domain",
  "risk_score": 85,
  "type": "dns_tunneling",
  "categories": ["attack", "command_and_control"],
  "status": "open",
  "resolution": null,
  "ticket_id": null,
  "assignee": null,
  "participants": [
    {
      "object_type": "device",
      "object_id": 67890,
      "role": "offender",
      "object_value": "192.168.1.100"
    },
    {
      "object_type": "ipaddr",
      "object_id": null,
      "role": "victim",
      "object_value": "10.0.0.50"
    }
  ],
  "properties": {
    "domain": "malicious-domain.com",
    "query_count": 150,
    "bytes_transferred": 102400
  },
  "mitre_techniques": [
    {
      "id": "T1071.004",
      "name": "Application Layer Protocol: DNS"
    }
  ],
  "start_time": 1640995200000,
  "end_time": 1641081600000,
  "update_time": 1641081600000,
  "mod_time": 1641081600000,
  "appliance_id": 1
}
```

### Update Detection

```
PATCH /api/v1/detections/{id}
```

**Request Body:**

```json
{
  "ticket_id": "JIRA-123",
  "status": "acknowledged",
  "assignee": "analyst@company.com",
  "resolution": "investigating"
}
```

### Get Detection Notes

```
GET /api/v1/detections/{id}/notes
```

### Add Detection Note

```
POST /api/v1/detections/{id}/notes
```

**Request Body:**

```json
{
  "note": "Investigation ongoing, escalated to senior analyst"
}
```

## Detection Categories

| Category               | Description                            |
| ---------------------- | -------------------------------------- |
| `attack`               | Active attack or compromise            |
| `command_and_control`  | C2 communication detected              |
| `data_exfiltration`    | Data leaving the network               |
| `lateral_movement`     | Attacker moving within network         |
| `reconnaissance`       | Network or host discovery activity     |
| `privilege_escalation` | Attempt to gain elevated access        |
| `credential_access`    | Credential theft or abuse              |
| `defense_evasion`      | Attempts to avoid detection            |
| `persistence`          | Establishing persistent access         |
| `collection`           | Data gathering activity                |
| `caution`              | Suspicious but not confirmed malicious |
| `hardening`            | Security hygiene issues                |
| `performance`          | Performance-related detections         |

## Detection Statuses

| Status         | Description                                   |
| -------------- | --------------------------------------------- |
| `open`         | New detection, not yet reviewed               |
| `acknowledged` | Detection reviewed, investigation in progress |
| `in_progress`  | Active investigation ongoing                  |
| `closed`       | Detection resolved                            |

## Risk Scores

Risk scores range from 0-100:

| Score Range | Severity | Description                            |
| ----------- | -------- | -------------------------------------- |
| 0-29        | Low      | Low-priority, informational            |
| 30-59       | Medium   | Moderate risk, review recommended      |
| 60-79       | High     | Significant risk, prompt action needed |
| 80-100      | Critical | Immediate action required              |

## Go Implementation

```go
package extrahop

import (
    "context"
    "encoding/json"
    "fmt"
    "net/http"
    "net/url"
    "strconv"
    "time"
)

type Detection struct {
    ID              int64                `json:"id"`
    Title           string               `json:"title"`
    Description     string               `json:"description"`
    RiskScore       int                  `json:"risk_score"`
    Type            string               `json:"type"`
    Categories      []string             `json:"categories"`
    Status          string               `json:"status"`
    Resolution      string               `json:"resolution"`
    TicketID        string               `json:"ticket_id"`
    Assignee        string               `json:"assignee"`
    Participants    []Participant        `json:"participants"`
    Properties      map[string]interface{}`json:"properties"`
    MitreTechniques []MitreTechnique     `json:"mitre_techniques"`
    StartTime       int64                `json:"start_time"`
    EndTime         int64                `json:"end_time"`
    UpdateTime      int64                `json:"update_time"`
    ModTime         int64                `json:"mod_time"`
    ApplianceID     int64                `json:"appliance_id"`
}

type Participant struct {
    ObjectType  string `json:"object_type"`
    ObjectID    int64  `json:"object_id"`
    Role        string `json:"role"`
    ObjectValue string `json:"object_value"`
}

type MitreTechnique struct {
    ID   string `json:"id"`
    Name string `json:"name"`
}

type DetectionFilter struct {
    From       int64    `json:"from,omitempty"`
    Until      int64    `json:"until,omitempty"`
    Limit      int      `json:"limit,omitempty"`
    Offset     int      `json:"offset,omitempty"`
    ModTime    int64    `json:"mod_time,omitempty"`
    Categories []string `json:"categories,omitempty"`
    Status     string   `json:"status,omitempty"`
    MinScore   int      `json:"min_score,omitempty"`
}

func (c *Client) ListDetections(ctx context.Context, filter *DetectionFilter) ([]Detection, error) {
    params := url.Values{}
    if filter.Limit > 0 {
        params.Set("limit", strconv.Itoa(filter.Limit))
    }
    if filter.Offset > 0 {
        params.Set("offset", strconv.Itoa(filter.Offset))
    }
    if filter.From > 0 {
        params.Set("from", strconv.FormatInt(filter.From, 10))
    }
    if filter.Until > 0 {
        params.Set("until", strconv.FormatInt(filter.Until, 10))
    }
    if filter.ModTime > 0 {
        params.Set("mod_time", strconv.FormatInt(filter.ModTime, 10))
    }

    resp, err := c.doRequest(ctx, http.MethodGet, "/api/v1/detections?"+params.Encode(), nil)
    if err != nil {
        return nil, err
    }
    defer resp.Body.Close()

    var detections []Detection
    if err := json.NewDecoder(resp.Body).Decode(&detections); err != nil {
        return nil, fmt.Errorf("decode detections: %w", err)
    }

    return detections, nil
}

func (c *Client) GetDetection(ctx context.Context, id int64) (*Detection, error) {
    path := fmt.Sprintf("/api/v1/detections/%d", id)
    resp, err := c.doRequest(ctx, http.MethodGet, path, nil)
    if err != nil {
        return nil, err
    }
    defer resp.Body.Close()

    var detection Detection
    if err := json.NewDecoder(resp.Body).Decode(&detection); err != nil {
        return nil, fmt.Errorf("decode detection: %w", err)
    }

    return &detection, nil
}

func (c *Client) UpdateDetection(ctx context.Context, id int64, status, ticketID string) error {
    update := map[string]string{
        "status": status,
    }
    if ticketID != "" {
        update["ticket_id"] = ticketID
    }

    body, _ := json.Marshal(update)
    path := fmt.Sprintf("/api/v1/detections/%d", id)
    resp, err := c.doRequest(ctx, http.MethodPatch, path, bytes.NewReader(body))
    if err != nil {
        return err
    }
    defer resp.Body.Close()

    if resp.StatusCode != http.StatusOK {
        return fmt.Errorf("update detection failed: status %d", resp.StatusCode)
    }

    return nil
}

// FetchAllDetections retrieves all detections with pagination
func (c *Client) FetchAllDetections(ctx context.Context, since time.Time) ([]Detection, error) {
    var allDetections []Detection
    offset := 0
    limit := 200

    filter := &DetectionFilter{
        Limit:  limit,
        Offset: offset,
        From:   since.UnixMilli(),
    }

    for {
        filter.Offset = offset
        detections, err := c.ListDetections(ctx, filter)
        if err != nil {
            return nil, fmt.Errorf("fetch page offset=%d: %w", offset, err)
        }

        allDetections = append(allDetections, detections...)

        if len(detections) < limit {
            break
        }
        offset += limit
    }

    return allDetections, nil
}

// FetchDetectionsSince retrieves detections modified since a timestamp (incremental sync)
func (c *Client) FetchDetectionsSince(ctx context.Context, modTime time.Time) ([]Detection, error) {
    var allDetections []Detection
    offset := 0
    limit := 200

    for {
        filter := &DetectionFilter{
            Limit:   limit,
            Offset:  offset,
            ModTime: modTime.UnixMilli(),
        }

        detections, err := c.ListDetections(ctx, filter)
        if err != nil {
            return nil, fmt.Errorf("fetch page offset=%d: %w", offset, err)
        }

        allDetections = append(allDetections, detections...)

        if len(detections) < limit {
            break
        }
        offset += limit
    }

    return allDetections, nil
}
```

## Converting to Chariot Risks

```go
func convertDetectionToRisk(detection Detection) model.Risk {
    // Map risk score to severity
    severity := "low"
    switch {
    case detection.RiskScore >= 80:
        severity = "critical"
    case detection.RiskScore >= 60:
        severity = "high"
    case detection.RiskScore >= 30:
        severity = "medium"
    }

    risk := model.NewRisk(detection.Title, severity)
    risk.Source = "extrahop"
    risk.ExternalID = strconv.FormatInt(detection.ID, 10)
    risk.Description = detection.Description

    // Add MITRE ATT&CK mapping
    for _, technique := range detection.MitreTechniques {
        risk.AddAttribute("mitre_technique", technique.ID)
    }

    // Add categories
    for _, cat := range detection.Categories {
        risk.AddAttribute("category", cat)
    }

    // Add participant information
    for _, p := range detection.Participants {
        if p.Role == "offender" {
            risk.AddAttribute("offender", p.ObjectValue)
        } else if p.Role == "victim" {
            risk.AddAttribute("victim", p.ObjectValue)
        }
    }

    return risk
}
```

## Pagination Best Practices

1. **Maximum 200 per request** - API enforces this limit
2. **Use mod_time for incremental sync** - Avoid re-fetching unchanged detections
3. **One-minute intervals recommended** - For high-volume environments
4. **Handle empty pages gracefully** - Detection counts can fluctuate

```go
// Recommended: Use mod_time for incremental sync
func (i *Integration) SyncDetections(ctx context.Context) error {
    lastSync := i.getLastSyncTime()

    detections, err := i.client.FetchDetectionsSince(ctx, lastSync)
    if err != nil {
        return err
    }

    for _, d := range detections {
        risk := convertDetectionToRisk(d)
        i.Job.Send(&risk)
    }

    i.setLastSyncTime(time.Now())
    return nil
}
```

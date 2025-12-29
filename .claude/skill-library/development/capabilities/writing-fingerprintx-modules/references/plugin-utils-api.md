# Plugin Utils API

**Network I/O helpers for fingerprintx plugins.**

**Location:** `pkg/plugins/pluginutils/`

## Core Functions

### SendRecv

Combined send and receive operation:

```go
func SendRecv(conn net.Conn, data []byte, timeout time.Duration) ([]byte, error)
```

**Usage:**

```go
response, err := utils.SendRecv(conn, request, timeout)
if err != nil {
    return nil, err
}
```

**Behavior:**

1. Sets write deadline
2. Sends data
3. Sets read deadline
4. Receives response (4KB buffer)
5. Returns response bytes

### Send

Send-only operation:

```go
func Send(conn net.Conn, data []byte, timeout time.Duration) error
```

**Usage:**

```go
err := utils.Send(conn, request, timeout)
if err != nil {
    return nil, err
}
```

### Recv

Receive-only operation:

```go
func Recv(conn net.Conn, timeout time.Duration) ([]byte, error)
```

**Usage:**

```go
response, err := utils.Recv(conn, timeout)
if err != nil {
    return nil, err
}
```

**Note:** Uses 4KB buffer. For larger responses, implement custom receive logic.

## Error Types

### InvalidResponseError

Generic invalid response:

```go
type InvalidResponseError struct {
    Service string
}

func (e *InvalidResponseError) Error() string {
    return fmt.Sprintf("invalid response from %s", e.Service)
}
```

**Usage:**

```go
return nil, &utils.InvalidResponseError{Service: PROTOCOL_NAME}
```

### InvalidResponseErrorInfo

Invalid response with details:

```go
type InvalidResponseErrorInfo struct {
    Service string
    Info    string
}

func (e *InvalidResponseErrorInfo) Error() string {
    return fmt.Sprintf("invalid response from %s: %s", e.Service, e.Info)
}
```

**Usage:**

```go
return false, &utils.InvalidResponseErrorInfo{
    Service: PROTOCOL_NAME,
    Info:    "response too short for valid header",
}
```

### ServerNotEnable

Server doesn't support the protocol:

```go
type ServerNotEnable struct{}

func (e *ServerNotEnable) Error() string {
    return "server does not enable this service"
}
```

**Usage:**

```go
if len(response) == 0 {
    return "", true, &utils.ServerNotEnable{}
}
```

### ReadTimeoutError

Read operation timed out:

```go
type ReadTimeoutError struct{}

func (e *ReadTimeoutError) Error() string {
    return "read timeout"
}
```

### WriteError

Write operation failed:

```go
type WriteError struct {
    Err error
}

func (e *WriteError) Error() string {
    return fmt.Sprintf("write error: %v", e.Err)
}
```

## Service Creation

### CreateServiceFrom

Create a Service result from detection:

```go
func CreateServiceFrom(
    target Target,
    metadata Metadata,
    tls bool,
    version string,
    transport Protocol,
) *Service
```

**Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `target` | `Target` | Original scan target |
| `metadata` | `Metadata` | Protocol-specific metadata struct |
| `tls` | `bool` | Whether TLS is used |
| `version` | `string` | Extracted version (empty if unknown) |
| `transport` | `Protocol` | TCP, TCPTLS, or UDP |

**Usage:**

```go
payload := plugins.ServiceMongoDB{
    CPEs: []string{buildCPE(version)},
}
return plugins.CreateServiceFrom(target, payload, false, version, plugins.TCP), nil
```

## Target Structure

```go
type Target struct {
    Address netip.AddrPort
    Host    string
}
```

**Fields:**

- `Address` - IP address and port
- `Host` - Original hostname (may differ from IP)

**Accessing:**

```go
ip := target.Address.Addr()
port := target.Address.Port()
host := target.Host
```

## Best Practices

### Always Use Timeouts

```go
// Good
response, err := utils.SendRecv(conn, data, timeout)

// Bad - never do this
conn.SetReadDeadline(time.Time{}) // Disables timeout!
```

### Handle Empty Responses

```go
response, err := utils.SendRecv(conn, probe, timeout)
if err != nil {
    return nil, err
}
if len(response) == 0 {
    // Service exists but didn't respond to probe
    return nil, &utils.ServerNotEnable{}
}
```

### Return nil for Non-Matches

```go
func (p *Plugin) Run(conn net.Conn, timeout time.Duration, target plugins.Target) (*plugins.Service, error) {
    // If detection fails, return nil (not error) to allow other plugins to try
    if !isValidResponse(response) {
        return nil, nil
    }

    // Only return Service on successful detection
    return plugins.CreateServiceFrom(target, payload, false, version, plugins.TCP), nil
}
```

### Graceful Degradation

```go
// Detection succeeds, but enrichment fails (auth required)
version := tryGetVersion(conn, timeout) // May return ""
payload := plugins.ServiceMyProtocol{
    Version: version, // OK to be empty
}
return plugins.CreateServiceFrom(target, payload, false, version, plugins.TCP), nil
```

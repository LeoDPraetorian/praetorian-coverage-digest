# Execution Layer

[<- Back to Overview](../OVERVIEW.md)

> **Implementation Status**: :white_check_mark: MOSTLY COMPLETE (80%)
>
> - Janus Service: :white_check_mark: Complete - mature framework with 87 security capabilities, production-ready
> - Aegis Service: :white_check_mark: Complete - full Velociraptor/VQL integration
> - Task API: :warning: Uses REST API (not gRPC) - pragmatic architectural choice for Lambda compatibility
> - Go Capabilities: :white_check_mark: Complete - extensive cloud, web, network scanning
> - External Tools: :white_check_mark: Complete - Nmap, NoseyParker, Docker integration
> - Constraint Policy: :warning: Partial - uses intensity-based constraints (not explicit OPA policies)
> - Auth Engine (Access Broker): :white_check_mark: Complete - 20+ credential types supported
>
> **Alternative Approaches**:
>
> - REST over gRPC: Better Lambda compatibility, easier debugging
> - Intensity-based constraints vs OPA: Simpler, meets current needs

The Execution Layer is the "hands" of the Chariot platform, responsible for all direct interaction with target environments. It abstracts the complexities of tool execution, providing a stable and secure interface for the rest of the platform to request actions.

## Table of Contents

- [Overview](#overview)
- [Capability Interface Patterns](#capability-interface-patterns)
  - [Match() Pre-Execution Gate](#match-pre-execution-gate)
  - [Job.Send() Result Streaming](#jobsend-result-streaming)
- [Janus Service (External Targets)](#janus-service-external-targets)
- [Aegis Service (Internal Targets)](#aegis-service-internal-targets)
- [Task API](#task-api)
- [Constraint Policy Engine](#constraint-policy-engine)
- [Automated Authentication Engine](#automated-authentication-engine)

---

## Overview

The Execution Layer provides the actual offensive security execution capabilities, separated into services based on target type (external vs. internal networks).

```

                    Execution Layer



                      Task API
                (gRPC Interface)



           v                           v

     Janus Service           Aegis Service
     (External)              (Internal)

   - Native Go             - Velociraptor
   - Wrapped Tools         - VQL Artifacts
   - External Targets      - Agent Fleet



              Constraint Policy Engine
           (Safety & Scope Enforcement)



```

---

## Capability Interface Patterns

> :white_check_mark: **Production Ready** - These patterns are fundamental to Chariot's event-driven orchestration.

Every capability in Chariot implements a standard interface that enables automatic workflow chaining. The two key methods are `Match()` and `Job.Send()`.

### Match() Pre-Execution Gate

The `Match()` function is a **pre-execution gate** that validates whether a capability is applicable to a target asset. This enables type-based routing and automatic capability chaining.

```go
// Capability interface - all capabilities must implement this
type Capability interface {
    // Match validates if this capability can process the given asset
    // Returns nil if applicable, error if should be skipped
    Match(asset *Asset) error

    // Invoke executes the capability against the asset
    Invoke(ctx context.Context, job *Job, asset *Asset) error
}
```

#### Match() Examples

```go
// PortScan only works on IP addresses and CIDR ranges
func (c *PortScanCapability) Match(asset *Asset) error {
    if asset.Class != "ipv4" && asset.Class != "cidr" {
        return fmt.Errorf("PortScan requires ipv4 or cidr, got %s", asset.Class)
    }
    return nil // Can proceed
}

// Fingerprint only works on discovered ports/services
func (c *FingerprintCapability) Match(asset *Asset) error {
    if asset.Class != "port" && asset.Class != "service" {
        return fmt.Errorf("Fingerprint requires port or service, got %s", asset.Class)
    }
    return nil
}

// Nuclei works on multiple target types
func (c *NucleiCapability) Match(asset *Asset) error {
    validClasses := map[string]bool{
        "url":    true,
        "domain": true,
        "ipv4":   true,
    }
    if !validClasses[asset.Class] {
        return fmt.Errorf("Nuclei requires url/domain/ipv4, got %s", asset.Class)
    }
    return nil
}
```

#### Match() Flow

```
Job Received from SQS

        v

 capability.Match()




   nil         error
  (run)       (skip)

     v           v

 Invoke()    Log &
(Execute)    Return

```

#### Why Match() Matters

| Purpose                  | Description                                               |
| ------------------------ | --------------------------------------------------------- |
| **Pre-execution Filter** | Prevents wasted compute on incompatible assets            |
| **Type Safety**          | Ensures capabilities receive appropriate inputs           |
| **Self-Documentation**   | Each capability declares its applicability                |
| **Automatic Routing**    | Combined with GetTargetTasks(), enables workflow chaining |

### Job.Send() Result Streaming

Capabilities emit discovered assets via `Job.Send()`, which streams results to Kinesis for processing and automatic chaining.

```go
// Job provides methods for streaming results
type Job struct {
    // ... other fields
    stream *kinesis.Client
}

// Send streams a discovered asset to Kinesis
func (j *Job) Send(ctx context.Context, asset *Asset) error {
    // Serialize and send to Kinesis stream
    data, err := json.Marshal(asset)
    if err != nil {
        return fmt.Errorf("failed to serialize asset: %w", err)
    }

    _, err = j.stream.PutRecord(ctx, &kinesis.PutRecordInput{
        StreamName:   aws.String(j.outputStream),
        Data:         data,
        PartitionKey: aws.String(asset.Key),
    })
    return err
}
```

#### Job.Send() Usage Example

```go
func (c *PortScanCapability) Invoke(ctx context.Context, job *Job, asset *Asset) error {
    // Perform port scanning
    openPorts, err := c.scanner.Scan(asset.Value)
    if err != nil {
        return err
    }

    // Stream each discovered port as a new asset
    for _, port := range openPorts {
        newAsset := &Asset{
            Class:  "port",
            Value:  fmt.Sprintf("%s:%d", asset.Value, port.Number),
            Parent: asset.Key,
            Metadata: map[string]string{
                "protocol": port.Protocol,
                "state":    port.State,
            },
        }

        // Non-blocking send to Kinesis
        if err := job.Send(ctx, newAsset); err != nil {
            log.Warn("failed to send asset", "error", err)
            // Continue - don't fail entire job for send errors
        }
    }

    return nil
}
```

#### Streaming Characteristics

| Characteristic         | Description                                                         |
| ---------------------- | ------------------------------------------------------------------- |
| **Asynchronous**       | Results stream immediately, don't wait for capability completion    |
| **Decoupled**          | Producer (capability) and consumer (LocalProcessor) are independent |
| **Fault Tolerant**     | Send failures don't terminate the capability execution              |
| **High Throughput**    | Kinesis handles massive parallel result streams                     |
| **Automatic Chaining** | LocalProcessor receives assets and triggers spawnAll()              |

#### Result Processing Flow

```
Capability.Invoke()

         Job.Send(asset)
        v

   Kinesis Stream

            Event trigger
           v

  Results Lambda


           v

LocalProcessor
  .Process()



     v           v

 Neo4j      spawnAll()
 Insert     (Chain)

```

For complete documentation of the orchestration flow, see [orchestration-pattern.md](orchestration-pattern.md).

---

## Janus Service (External Targets)

The primary engine for executing offensive tasks against external, internet-facing targets.

### Key Responsibilities

| Responsibility          | Description                                                 |
| ----------------------- | ----------------------------------------------------------- |
| **Task API**            | Expose stable gRPC interface for execution requests         |
| **Task Execution**      | Interpret requests and orchestrate capability sequences     |
| **Native Capabilities** | Execute custom, high-performance Go tooling                 |
| **External Tools**      | Manage secure execution of wrapped tools (Nmap, Metasploit) |
| **Policy Enforcement**  | Apply constraints via the Constraint Policy Engine          |

### Architecture

```

                     Janus Service



    Task API        < gRPC requests from Prometheus
    (gRPC)


          v

   Task Executor    Orchestrates capability sequences



     v         v            v

  Native Wrapped    Constraint
   Go    Tools      Engine



```

### Capability Types

| Type                 | Description                          | Examples                      |
| -------------------- | ------------------------------------ | ----------------------------- |
| **Native Go**        | High-performance custom capabilities | Custom scanners, parsers      |
| **Wrapped External** | Orchestrated third-party tools       | Nmap, Nuclei, Metasploit      |
| **Composite**        | Multi-tool capability chains         | Recon workflow, exploit chain |

---

## Aegis Service (Internal Targets)

The complementary engine for executing tasks and gathering data from within a client's internal network.

### Key Responsibilities

| Responsibility             | Description                                     |
| -------------------------- | ----------------------------------------------- |
| **Agent Fleet Management** | Deploy and manage Aegis endpoint agents         |
| **VQL Execution**          | Run security tests written as VQL artifacts     |
| **AegisCLI Integration**   | Strongly-typed wrapper around Velociraptor gRPC |
| **Tunneling**              | Secure connections for manual validation        |

### Architecture

```

                     Aegis Service



     AegisCLI               Aegis Agents
     (Go Library)   <>   (Velociraptor)


          v                          v

   VQL Artifacts           Agent Fleet
   (Capabilities)          (Endpoints)



                Aegis Tunneling
     (Secure connection for manual validation)



```

### Aegis Capabilities

| Capability                | Description                              |
| ------------------------- | ---------------------------------------- |
| **Asset Discovery**       | Internal network enumeration             |
| **Credential Harvesting** | Memory and disk credential extraction    |
| **Lateral Movement**      | Internal network traversal               |
| **Data Collection**       | System and application data gathering    |
| **Tunneling**             | Manual validation through secure tunnels |

---

## Task API

> **[Implementation Differs]**: Uses REST API over API Gateway instead of gRPC. This is a pragmatic choice for AWS Lambda compatibility and easier debugging.

The stable gRPC interface for receiving execution requests from the Agent Orchestration Layer.

### API Structure

```protobuf
service JanusTaskService {
  // Execute a high-level task
  rpc ExecuteTask(TaskRequest) returns (TaskResponse);

  // Check task status
  rpc GetTaskStatus(TaskStatusRequest) returns (TaskStatusResponse);

  // Cancel a running task
  rpc CancelTask(CancelTaskRequest) returns (CancelTaskResponse);

  // Stream task progress
  rpc StreamTaskProgress(TaskProgressRequest) returns (stream TaskProgress);
}

message TaskRequest {
  string task_id = 1;
  string task_type = 2;
  string execution_trace_id = 3;
  map<string, Value> parameters = 4;
  Constraints constraints = 5;
}
```

### Task Lifecycle

```

 PENDING  >  RUNNING  >  SUCCESS       FAILED

                                                    ^

                            (on error)
```

### Request Flow

1. Agent submits `TaskRequest` via gRPC
2. Task API validates request against Agora registry
3. Constraint Policy Engine applies safety checks
4. Task Executor orchestrates capability sequence
5. Results returned via `TaskResponse` or streamed via `TaskProgress`

---

## Constraint Policy Engine

> **[Implementation Differs]**: Uses intensity-based constraints on assets rather than explicit OPA policy engine. Simpler and sufficient for current needs.

Enforces safety and scope limitations during task execution.

### Constraint Types

| Constraint        | Description                            | Example                    |
| ----------------- | -------------------------------------- | -------------------------- |
| **Scope**         | Target must be within authorized scope | Only attack \*.example.com |
| **Rate Limiting** | Maximum requests per time period       | 100 req/min                |
| **Recursion**     | Prevent infinite loops                 | Max depth 5                |
| **Resource**      | Limit computational resources          | Max 1GB memory             |
| **Time**          | Maximum execution duration             | 30 minute timeout          |
| **Action**        | Restrict certain actions               | No destructive operations  |

### Policy Enforcement Flow

```
Task Request

     v

 Scope Validation    Verify target in authorized scope


         v

 Rate Limiting       Apply request throttling


         v

 Resource Limits     Check resource constraints


         v

 Action Policy       Validate allowed actions


         v
     Execute Task
```

### Safety Controls

| Control                   | Purpose                                       |
| ------------------------- | --------------------------------------------- |
| **Scope Validation**      | Prevent actions outside authorized boundaries |
| **Task Constraints**      | Prevent recursive/runaway processes           |
| **Workflow Cancellation** | Graceful termination of long-running tasks    |
| **Audit Logging**         | Complete record of all actions                |

---

## Automated Authentication Engine

A specialized service responsible for executing and maintaining authenticated sessions with web applications.

### Key Responsibilities

| Responsibility         | Description                                |
| ---------------------- | ------------------------------------------ |
| **Auth Flow Replay**   | Programmatically log in via HTTP requests  |
| **Token Management**   | Extract, store, and refresh session tokens |
| **Access Broker**      | Provide valid sessions to other components |
| **Challenge Handling** | Hooks for MFA and CAPTCHA resolution       |

### Architecture

```

             Automated Authentication Engine



   Traffic           >   Auth Flow
   Analyzer                Mapper


                                    v

                            Auth Replay
                            Engine


                                   v

                            Access Broker   > API
                            (Token Store)



```

### Supported Auth Patterns

- Form-based authentication
- OAuth 2.0 flows
- SAML authentication
- JWT-based sessions
- Custom authentication schemes

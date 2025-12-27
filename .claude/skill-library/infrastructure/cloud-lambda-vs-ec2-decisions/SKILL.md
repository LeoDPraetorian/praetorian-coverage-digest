---
name: cloud-lambda-vs-ec2-decisions
description: Use when adding new backend features to Chariot and deciding between Lambda functions and EC2 compute - includes Chariot-specific patterns, actual code examples with file paths, CloudFormation templates, and architectural decisions from the Chariot codebase
allowed-tools: "Read, Write, Bash"
---

# Chariot Backend: Lambda vs EC2 Decision Guide

This skill documents **how we make compute decisions in the Chariot backend**. It provides real code examples, file paths, and CloudFormation configurations from our actual codebase.

**Foundation:** For universal serverless patterns, see the general `serverless-compute-decision-architecture` skill. This skill shows our specific implementation.

## When to Use This Skill

- Adding new API endpoints to Chariot backend
- Creating new security scanning capabilities
- Adding scheduled maintenance tasks
- Integrating third-party security tools
- Code reviewing backend compute decisions
- Onboarding new developers to Chariot architecture

## Chariot's Hybrid Architecture

```
┌──────────────────────────────────────────────────────────┐
│             Chariot Backend Compute                       │
├──────────────────────────────────────────────────────────┤
│                                                            │
│  ┌────────────────┐           ┌──────────────────────┐  │
│  │ Lambda (30+)   │           │ EC2 Auto Scaling     │  │
│  ├────────────────┤           ├──────────────────────┤  │
│  │ • API          │──SQS─────▶│ • Security Scanners  │  │
│  │ • Events       │           │ • Docker Workloads   │  │
│  │ • Cron         │           │ • Long-running Tasks │  │
│  │ • Credentials  │           │ • Scale 0→N          │  │
│  └────────────────┘           └──────────────────────┘  │
│         │                               │                 │
│         └───────────────┬───────────────┘                 │
│                         ▼                                 │
│  ┌──────────────────────────────────────────────┐        │
│  │ DynamoDB • Neo4j • Redis • S3 • SQS • Kinesis│        │
│  └──────────────────────────────────────────────┘        │
└──────────────────────────────────────────────────────────┘
```

## Chariot Decision Tree

```
New Backend Feature
    │
    ├─▶ API endpoint?
    │   └─▶ YES → Lambda (GenericAPIFunction)
    │            File: cmd/api/generic/main.go
    │
    ├─▶ Event-driven (S3, SNS, SQS, Kinesis)?
    │   └─▶ YES → Lambda (Listener Functions)
    │            Files: cmd/listeners/*/main.go
    │
    ├─▶ Scheduled/cron task?
    │   └─▶ YES → Lambda (Cron Functions)
    │            Files: cmd/cron/*/main.go
    │
    ├─▶ Credential retrieval?
    │   └─▶ YES → Lambda (AccessBrokerFunction)
    │            File: cmd/async/access_broker/main.go
    │
    ├─▶ Security scanning capability?
    │   │
    │   ├─▶ Execution time < 30s AND lightweight?
    │   │   └─▶ YES → Lambda (simple capability)
    │   │
    │   ├─▶ Requires Docker?
    │   │   └─▶ YES → EC2
    │   │            File: cmd/listeners/compute/worker/worker.go
    │   │
    │   ├─▶ Needs network tools (nmap, nuclei, burp)?
    │   │   └─▶ YES → EC2
    │   │
    │   ├─▶ Execution time > 30s?
    │   │   └─▶ YES → EC2
    │   │
    │   └─▶ Memory > 10GB?
    │       └─▶ YES → EC2
    │
    └─▶ When in doubt → Lambda first, move to EC2 if needed
```

## Chariot Lambda Patterns

### Pattern 1: API Endpoint Handler

**When:** All REST API operations
**File:** `modules/chariot/backend/cmd/api/generic/main.go:1-35`
**Template:** `modules/chariot/backend/template.yml:1115-1208`

```go
// Single Lambda function routes all API requests
package main

import (
	"context"
	"github.com/aws/aws-lambda-go/events"
	"github.com/aws/aws-lambda-go/lambda"
	"github.com/praetorian-inc/chariot/backend/pkg/handler"
	"github.com/praetorian-inc/chariot/backend/pkg/handler/handlers"
)

var r *handler.Router

func init() {
	// Initialize router once per container
	r = handler.NewRouter()
	handlers.MustRegisterDefaultHandlers(r)
}

func router(ctx context.Context, req events.APIGatewayProxyRequest) (events.APIGatewayProxyResponse, error) {
	// Route to appropriate handler
	fn, ok := r.GetHandler(req.Path)
	if !ok {
		return response.Error(404, "not found"), nil
	}
	return fn(ctx, req)
}

func main() {
	lambda.Start(router)
}
```

**CloudFormation:**

```yaml
GenericAPIFunction:
  Type: AWS::Serverless::Function
  Properties:
    CodeUri: cmd/api/generic
    Handler: bootstrap
    MemorySize: 2048
    Timeout: 30 # Inherited from Globals
```

**Why Lambda:**

- Fast execution (< 5 seconds for most endpoints)
- Stateless operations
- Auto-scaling for concurrent requests
- VPC integration for DynamoDB/Neo4j

---

### Pattern 2: Event Listener (Kinesis Results)

**When:** Processing security scan results from streams
**File:** `modules/chariot/backend/cmd/listeners/results/main.go`
**Template:** `modules/chariot/backend/template.yml:1808-1868`

```go
package main

import (
	"context"
	"github.com/aws/aws-lambda-go/events"
	"github.com/aws/aws-lambda-go/lambda"
)

func handler(ctx context.Context, event events.KinesisEvent) error {
	for _, record := range event.Records {
		// Process security scan results
		data := record.Kinesis.Data

		// Parse result and store in DynamoDB/Neo4j
		if err := processResult(data); err != nil {
			return err // Lambda will retry
		}
	}
	return nil
}

func main() {
	lambda.Start(handler)
}
```

**CloudFormation:**

```yaml
ResultsListenerFunction:
  Type: AWS::Serverless::Function
  Properties:
    CodeUri: cmd/listeners/results
    Handler: bootstrap
    Events:
      KinesisStream:
        Type: Kinesis
        Properties:
          Stream: !GetAtt ChariotKinesisResults.Arn
          StartingPosition: LATEST
```

**Why Lambda:**

- Native Kinesis integration
- Automatic batching and scaling
- Parallel shard processing
- Built-in retry and DLQ

---

### Pattern 3: Scheduled Maintenance (Cron)

**When:** Periodic cleanup, monitoring, requeuing
**File:** `modules/chariot/backend/cmd/cron/jobs/job.go:1-77`
**Template:** `modules/chariot/backend/template.yml:1779-1808`

```go
package main

import (
	"context"
	"time"
	"github.com/aws/aws-lambda-go/lambda"
	"golang.org/x/sync/errgroup"
)

func handler(ctx context.Context, payload cron.Payload) error {
	g := errgroup.Group{}

	// Find crashed jobs (exceeded timeout)
	g.Go(func() error {
		jobs := findCrashedJobs()
		for _, job := range jobs {
			job.Comment = "Job timed out"
			failJob(job)
		}
		return nil
	})

	// Requeue delayed jobs that are ready
	g.Go(func() error {
		jobs := findDelayedJobsReadyToRun()
		for _, job := range jobs {
			job.Queue = model.Standard
			requeueJob(job)
		}
		return nil
	})

	return g.Wait()
}

func main() {
	lambda.Start(handler)
}
```

**CloudFormation:**

```yaml
JobsCronFunction:
  Type: AWS::Serverless::Function
  Properties:
    CodeUri: cmd/cron/jobs
    Handler: bootstrap
    Timeout: 90 # Job cleanup completes quickly
    Events:
      Hourly:
        Type: Schedule
        Properties:
          Schedule: rate(1 hour)
```

**Why Lambda:**

- Scheduled execution via CloudWatch Events
- Predictable short duration (< 90s)
- Only runs when scheduled (cost-effective)
- No persistent state needed

---

### Pattern 4: Secure Credential Broker

**When:** Retrieving credentials for security scans
**File:** `modules/chariot/backend/cmd/async/access_broker/main.go:1-100`
**Template:** `modules/chariot/backend/template.yml:1436-1474`

```go
package main

import (
	"context"
	"github.com/aws/aws-lambda-go/lambda"
	"github.com/praetorian-inc/tabularium/pkg/model/model"
)

var CredentialHandlers = map[model.CredentialType]CredentialHandler{
	model.AWSCredential:    &AWSCredentialHandler{},
	model.GCloudCredential: &GCloudCredentialHandler{},
	model.AzureCredential:  &AzureCredentialHandler{},
	model.GithubCredential: &GithubCredentialHandler{},
	model.ShodanCredential: &GlobalSSMCredentialHandler{},
}

func handler(ctx context.Context, request model.CredentialRequest) (*model.CredentialResponse, error) {
	// Route to appropriate credential handler
	handler := CredentialHandlers[request.Type]

	// Retrieve from SSM/Secrets Manager
	response := &model.CredentialResponse{}
	err := handler.HandleCredentialRetrieval(ctx, &request, response)

	return response, err
}

func main() {
	lambda.Start(handler)
}
```

**CloudFormation:**

```yaml
AccessBrokerFunction:
  Type: AWS::Serverless::Function
  Properties:
    CodeUri: cmd/async/access_broker
    Handler: bootstrap
    Timeout: 60 # AWS STS operations
    Policies:
      - AWSSecretsManagerGetSecretValuePolicy
```

**Why Lambda:**

- Security isolation (credentials never on EC2)
- Synchronous invocation from workers
- Fast execution (< 5 seconds)
- CloudWatch audit trail
- Fine-grained IAM permissions

---

### Pattern 5: High-Memory Scheduled Tasks

**When:** Large dataset processing within Lambda limits
**File:** `modules/chariot/backend/cmd/cron/threats/main.go`
**Template:** `modules/chariot/backend/template.yml:1562-1592`

```go
func handler(ctx context.Context, payload cron.Payload) error {
	// Load large vulnerability database (fits in 4GB RAM)
	vulnDB := loadVulnerabilityDatabase()

	// Process all assets and match threats
	assets := getAllAssets()
	for _, asset := range assets {
		threats := matchThreats(asset, vulnDB)
		updateAssetThreats(asset, threats)
	}

	return nil
}
```

**CloudFormation:**

```yaml
ThreatCronFunction:
  Type: AWS::Serverless::Function
  Properties:
    CodeUri: cmd/cron/threats
    Handler: bootstrap
    Timeout: 900 # 15 minutes
    MemorySize: 4096 # 4GB RAM
    EphemeralStorage:
      Size: 10240 # 10GB storage
    Events:
      Daily:
        Type: Schedule
        Properties:
          Schedule: cron(27 0 * * ? *) # Daily at 12:27 AM UTC
```

**Why Lambda:**

- Runs once daily (cost-effective)
- Dataset fits in memory
- Completes within 15 minutes
- No need for continuous EC2 instance

---

## Chariot EC2 Patterns

### Pattern 6: Security Scanning Workers

**When:** Long-running Docker-based security scans
**File:** `modules/chariot/backend/cmd/listeners/compute/worker/worker.go:1-495`
**Template:** `modules/chariot/backend/template.yml:2240-2390`

```go
package worker

import (
	"context"
	"os"
	"time"
	"github.com/aws/aws-sdk-go-v2/service/sqs"
)

func Run() {
	service := sqs.NewFromConfig(awsConfig)

	// Poll 3 queues with priority order
	priority, standard, synchronous := queues()

	for {
		// 1. Process synchronous first (highest priority)
		processed, healthy := process(ctx, service, synchronous)
		if !healthy {
			os.Exit(1)
		}
		if processed != 0 {
			continue
		}

		// 2. Then priority queue
		processed, healthy = process(ctx, service, priority)
		if processed != 0 {
			continue
		}

		// 3. Finally standard queue
		processed, healthy = process(ctx, service, standard)

		// 4. If all queues empty, shutdown (triggers ASG termination)
		if processed == 0 {
			slog.Info("no messages, shutting down")
			return  // systemd triggers instance shutdown
		}
	}
}

func process(ctx context.Context, service *sqs.Client, queue string) (int, bool) {
	result, err := service.ReceiveMessage(ctx, &sqs.ReceiveMessageInput{
		QueueUrl:            &queue,
		MaxNumberOfMessages: 1,
	})

	for _, record := range result.Messages {
		var job model.Job
		json.Unmarshal([]byte(*record.Body), &job)

		// Get capability from registry
		task := registries.New().GetTargetTasks(job.Target.Model)[job.Source]

		// Execute in Docker container
		executor, _ := compute.NewExecutor(job)
		executor.Execute(signal)

		// Delete message from queue
		service.DeleteMessage(ctx, &sqs.DeleteMessageInput{
			QueueUrl:      &queue,
			ReceiptHandle: record.ReceiptHandle,
		})
	}

	return len(result.Messages), true
}
```

**CloudFormation:**

```yaml
ComputeAutoScalingGroup:
  Type: AWS::AutoScaling::AutoScalingGroup
  Properties:
    MinSize: 0 # ✅ Scale to zero when idle
    MaxSize: 50
    MixedInstancesPolicy:
      InstancesDistribution:
        OnDemandPercentageAboveBaseCapacity: 0 # 100% spot instances
        SpotAllocationStrategy: price-capacity-optimized
    LaunchTemplate:
      LaunchTemplateData:
        InstanceRequirements:
          MemoryMiB:
            Min: 2000
            Max: 8000
          VCpuCount:
            Min: 2
            Max: 6
        UserData:
          Fn::Base64: !Sub |
            #!/bin/bash -xe
            # Pull worker image from ECR
            aws ecr get-login-password | docker login --username AWS --password-stdin ${ECRRegistry}

            # Run worker (auto-terminates when queues empty)
            docker run --rm ${ECRRegistry}/${ECRRepository} && shutdown -h now

ComputeScaleUpPolicy:
  Type: AWS::AutoScaling::ScalingPolicy
  Properties:
    StepAdjustments:
      - MetricIntervalUpperBound: 10 # < 10 messages: scale down
        ScalingAdjustment: -1
      - MetricIntervalLowerBound: 10
        MetricIntervalUpperBound: 50 # 10-50 messages: scale up moderately
        ScalingAdjustment: 2
      - MetricIntervalLowerBound: 50 # > 50 messages: scale up aggressively
        ScalingAdjustment: 5
```

**Why EC2:**

- Long execution times (hours for some scans)
- Docker workloads (nmap, nuclei, burp)
- Network tools requiring raw sockets
- 90% cost savings with spot instances
- Auto-scaling based on queue depth
- Self-termination when idle

**Key Chariot Patterns:**

- 3-queue priority system (synchronous > priority > standard)
- Spot interruption detection and job re-queuing
- Scale 0→N based on SQS metrics
- Docker logging to CloudWatch
- IMDSv2 for security

---

## Chariot Queue Architecture

### Three-Tier Queue System

```
┌─────────────────────┐
│ Synchronous Queue   │  ← Real-time requests (highest priority)
└──────────┬──────────┘
           │
┌──────────▼──────────┐
│ Priority Queue      │  ← Important jobs (medium priority)
└──────────┬──────────┘
           │
┌──────────▼──────────┐
│ Standard Queue      │  ← Bulk operations (lowest priority)
└─────────────────────┘

Workers poll in order: Synchronous → Priority → Standard
```

**Environment Variables:**

```bash
# Standard pool
CHARIOT_QUEUE_SYNCHRONOUS=chariot-queue-sync
CHARIOT_QUEUE_PRIORITY=chariot-queue-priority
CHARIOT_QUEUE_STANDARD=chariot-queue-standard

# Static IP pool
CHARIOT_STATIC=true
CHARIOT_QUEUE_STATIC_SYNCHRONOUS=chariot-queue-static-sync
CHARIOT_QUEUE_STATIC_PRIORITY=chariot-queue-static-priority
CHARIOT_QUEUE_STATIC_STANDARD=chariot-queue-static-standard
```

**File:** `modules/chariot/backend/cmd/listeners/compute/worker/worker.go:109-114`

---

## Chariot-Specific Anti-Patterns

### ❌ Anti-Pattern 1: Over-Provisioning GenericAPIFunction

**Issue:** `template.yml:1203` sets `MemorySize: 2048` without justification.

**Current:**

```yaml
GenericAPIFunction:
  Properties:
    MemorySize: 2048 # 16x the global default
```

**Recommendation:**

- Profile actual memory usage with CloudWatch
- Most API operations use < 512MB
- Consider reducing to 512MB or 1024MB
- Document if 2048MB is truly needed

---

### ❌ Anti-Pattern 2: Hardcoded Timeout Values

**Issue:** Timeout values vary without documented rationale.

**Current State:**

- GenericAPIFunction: 30s (global default)
- AccessBrokerFunction: 60s (AWS STS)
- JobsCronFunction: 90s (job cleanup)
- ThreatCronFunction: 900s (large dataset)

**Recommendation:**
Add comments in `template.yml` explaining timeout decisions:

```yaml
AccessBrokerFunction:
  Properties:
    Timeout: 60 # AWS STS assume-role operations can take 30-45s
```

---

### ❌ Anti-Pattern 3: Missing Static IP ASG Spot Strategy

**Issue:** `template.yml:2412-2494` doesn't specify spot/on-demand mix for static IP pool.

**Current:**

```yaml
StaticIPAutoScalingGroup:
  Properties:
    # ❌ Missing InstancesDistribution - defaults to on-demand?
    MixedInstancesPolicy:
      LaunchTemplate: ...
```

**Recommendation:**
Explicitly configure spot strategy or document why on-demand is required:

```yaml
StaticIPAutoScalingGroup:
  Properties:
    MixedInstancesPolicy:
      InstancesDistribution:
        OnDemandPercentageAboveBaseCapacity: 20 # Some on-demand for reliability
        SpotAllocationStrategy: price-capacity-optimized
```

---

## Quick Reference: Chariot Compute Decisions

| Use Case              | Compute | Example                | File Path                         |
| --------------------- | ------- | ---------------------- | --------------------------------- |
| **API Endpoint**      | Lambda  | All REST operations    | `cmd/api/generic/main.go`         |
| **Event Listener**    | Lambda  | Kinesis results        | `cmd/listeners/results/main.go`   |
| **Scheduled Task**    | Lambda  | Job cleanup, threats   | `cmd/cron/jobs/job.go`            |
| **Credential Broker** | Lambda  | AWS/GCP/Azure creds    | `cmd/async/access_broker/main.go` |
| **Security Scanner**  | EC2     | nmap, nuclei, burp     | `cmd/listeners/compute/worker/`   |
| **Long-Running Scan** | EC2     | Multi-hour assessments | (same worker)                     |
| **Docker Workload**   | EC2     | Custom containers      | (same worker)                     |

---

## Adding New Features

### Adding a New API Endpoint

1. **Create handler** in `pkg/handler/handlers/`
2. **Register handler** in `handlers.MustRegisterDefaultHandlers()`
3. **Deploy** - uses existing `GenericAPIFunction`
4. **No CloudFormation changes needed**

**Reference:** All handlers use single Lambda function.

---

### Adding a New Security Capability

1. **Decide compute type** using decision tree above
2. **If Lambda:**
   - Create function in `cmd/capabilities/{name}/`
   - Add CloudFormation in `template.yml`
   - Timeout must be < 15 minutes
3. **If EC2 (most security scans):**
   - Create capability in `pkg/compute/capabilities/`
   - Register in `pkg/compute/registries/`
   - Docker image in `pkg/compute/docker/`
   - Workers execute automatically from queue
   - **No new CloudFormation needed** - uses existing ASG

**Reference:** `pkg/compute/registries/` for capability registration patterns.

---

### Adding a New Scheduled Task

1. **Create function** in `cmd/cron/{name}/`
2. **Add to CloudFormation:**

```yaml
MyNewCronFunction:
  Type: AWS::Serverless::Function
  Properties:
    CodeUri: cmd/cron/my-task
    Handler: bootstrap
    Timeout: 90 # Based on expected execution time
    Events:
      Schedule:
        Type: Schedule
        Properties:
          Schedule: rate(1 hour) # or cron expression
```

**Reference:** `cmd/cron/jobs/job.go` for cron handler patterns.

---

## Chariot Architecture Principles

1. **Lambda orchestrates, EC2 executes** - Functions handle API/events, containers run scans
2. **Queue-based decoupling** - SQS buffers between Lambda and EC2
3. **Scale to zero** - EC2 workers shutdown when queues empty
4. **Spot instances** - 90% cost savings for fault-tolerant workloads
5. **Security isolation** - Credentials in Lambda, never in EC2
6. **Priority queuing** - 3-tier system for SLA management
7. **Auto-scaling** - Based on SQS queue depth metrics
8. **Self-termination** - Workers detect idle state and shutdown

---

## Related Chariot Documentation

- **General serverless patterns:** `~/.claude/skills/serverless-compute-decision-architecture/`
- **Capability development:** `pkg/compute/capabilities/README.md`
- **Queue system:** `pkg/queue/README.md`
- **CloudFormation template:** `template.yml`
- **Architecture overview:** `ARCHITECTURE.md`

---

## Common Questions

**Q: Should my new API endpoint be a separate Lambda function?**
A: No. All API endpoints share `GenericAPIFunction`. Just add a handler.

**Q: When should I use the static IP ASG vs standard ASG?**
A: Only when the capability requires IP whitelisting. Most scans use standard ASG.

**Q: How do I test a new capability locally?**
A: See `pkg/compute/executor_test.go` for testing patterns.

**Q: Can Lambda run Docker containers?**
A: Yes (container images up to 10GB), but complex Docker or privileged operations require EC2.

**Q: Should I use provisioned concurrency for Lambda?**
A: Only if cold start impact is proven. Monitor first, optimize later.

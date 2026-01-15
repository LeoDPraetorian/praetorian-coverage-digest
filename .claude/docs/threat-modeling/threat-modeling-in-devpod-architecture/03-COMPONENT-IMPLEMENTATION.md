# Threat Modeling DevPod: Component Implementation Specifications

**Document**: 3 of 6 - Component Implementation **Purpose**: Detailed
implementation specifications for all 4 core components and DevPod image **Last
Synchronized**: 2026-01-10 **Status**: Ready for Implementation

---

## Document Metadata

| Property           | Value                                            |
| ------------------ | ------------------------------------------------ |
| **Document ID**    | 03-COMPONENT-IMPLEMENTATION                      |
| **Token Count**    | ~18,000 tokens (estimated)                       |
| **Read Time**      | 40-50 minutes                                    |
| **Prerequisites**  | 01-ARCHITECTURE-OVERVIEW, 02-SCM-CREDENTIAL-FLOW |
| **Next Documents** | 04-SECURITY-HARDENING, 05-DEPLOYMENT-OPERATIONS  |

---

## Related Documents

This document is part of the Threat Modeling DevPod architecture series:

- **[01-ARCHITECTURE-OVERVIEW.md](01-ARCHITECTURE-OVERVIEW.md)** - System design
  and architecture context
- **[02-SCM-CREDENTIAL-FLOW.md](02-SCM-CREDENTIAL-FLOW.md)** - Secure credential
  handling patterns
- **[04-SECURITY-HARDENING.md](04-SECURITY-HARDENING.md)** - All P0/P1 security
  fixes to apply during implementation
- **[05-DEPLOYMENT-OPERATIONS.md](05-DEPLOYMENT-OPERATIONS.md)** - Testing and
  operations procedures
- **[06-THREAT-MODELING-DATA-CAPTURE.md](06-THREAT-MODELING-DATA-CAPTURE.md)** -
  Training data capture and telemetry pipeline

---

## Entry and Exit Criteria

### Entry Criteria

- Understanding of overall architecture from Document 1
- Knowledge of credential security patterns from Document 2
- Familiarity with multi-cloud infrastructure (AWS/GCP/Azure)
- Experience with Go, TypeScript/React, and Terraform

### Exit Criteria

After reading this document, you should be able to implement:

- Lambda handler for workspace provisioning API
- Multi-cloud orchestrator with DevPod CLI
- React frontend components with SSE support
- Terraform modules for AWS/GCP/Azure infrastructure
- DevPod Docker image with security hardening

---

## Table of Contents

- [Component 1: Backend API (Lambda)](#component-1-backend-api-lambda)
- [Component 2: DevPod Orchestrator (Multi-Cloud)](#component-2-devpod-orchestrator-multi-cloud)
- [Component 3: Frontend Components](#component-3-frontend-components)
- [Component 4: Infrastructure (Terraform Multi-Cloud)](#component-4-infrastructure-terraform-multi-cloud)
- [Component 5: DevPod Image Specification](#component-5-devpod-image-specification)
- [Multi-Cloud Service Mapping](#multi-cloud-service-mapping)

---

## Component 1: Backend API (Lambda)

### Overview

**Endpoint**: `POST /engagements/{id}/threat-model/launch`

**Behavior**:

- Returns 202 Accepted immediately (<500ms response time)
- Accepts cloud provider selection (aws, gcp, azure)
- Delegates long-running provisioning to message queue → orchestrator
- Provides SSE endpoint for real-time status updates

### Implementation

**File**: `modules/chariot/backend/lambda/engagement/threat_model_launch.go`

```go
package engagement

import (
    "context"
    "encoding/json"
    "fmt"
    "time"

    "github.com/aws/aws-lambda-go/events"
)

// CloudProvider represents supported cloud platforms
type CloudProvider string

const (
    CloudAWS   CloudProvider = "aws"
    CloudGCP   CloudProvider = "gcp"
    CloudAzure CloudProvider = "azure"
)

// LaunchThreatModelEnvironment queues a DevPod workspace for provisioning
func LaunchThreatModelEnvironment(ctx context.Context, req events.APIGatewayProxyRequest) (events.APIGatewayProxyResponse, error) {
    // 1. Authentication & Authorization
    user, err := cloud.Whoami(req)
    if err != nil {
        return cloud.Response(401, nil), nil
    }

    if !user.HasRole("security_engineer", "admin") {
        return cloud.Response(403, map[string]string{
            "error": "Requires security_engineer role",
        }), nil
    }

    // 2. Check workspace limit (max 1 active per engineer)
    activeWorkspaces, err := countActiveWorkspaces(ctx, user.Email)
    if err != nil {
        return cloud.Response(500, map[string]string{"error": "Failed to check workspace limit"}), nil
    }
    if activeWorkspaces >= 1 {
        return cloud.Response(409, map[string]string{
            "error": "Maximum 1 active workspace per engineer. Terminate existing workspace first.",
        }), nil
    }

    // 3. Get engagement details
    engagementID := req.PathParameters["id"]
    eng, err := engagement.Get(ctx, user.Username, engagementID)
    if err != nil {
        return cloud.Response(404, map[string]string{"error": "Engagement not found"}), nil
    }

    if !eng.HasService("code_review") && !eng.HasService("threat_model") {
        return cloud.Response(400, map[string]string{
            "error": "Engagement must include code review or threat modeling service",
        }), nil
    }

    // 4. Parse request with cloud provider selection
    var reqBody LaunchRequest
    if err := json.Unmarshal([]byte(req.Body), &reqBody); err != nil {
        return cloud.Response(400, map[string]string{"error": "Invalid request body"}), nil
    }

    // Validate and set defaults
    if reqBody.Branch == "" {
        reqBody.Branch = "main"
    }
    if reqBody.CloudProvider == "" {
        reqBody.CloudProvider = CloudAWS // Default to AWS
    }
    if !isValidCloudProvider(reqBody.CloudProvider) {
        return cloud.Response(400, map[string]string{
            "error": "Invalid cloud_provider. Must be: aws, gcp, or azure",
        }), nil
    }
    if reqBody.Region == "" {
        reqBody.Region = getDefaultRegion(reqBody.CloudProvider)
    }

    // 5. Get SCM integration (validate it exists, don't fetch token yet)
    // See Document 2 for getCustomerSCMIntegration implementation
    scmIntegration, err := getCustomerSCMIntegration(ctx, eng.CustomerID)
    if err != nil {
        return cloud.Response(400, map[string]string{
            "error": "Customer has no integrated SCM (GitHub, GitLab, or Bitbucket)",
        }), nil
    }

    // 6. Create workspace record (status: queued)
    workspaceID := fmt.Sprintf("tm-%s-%d", engagementID[:8], time.Now().Unix())
    workspace := Workspace{
        WorkspaceID:    workspaceID,
        EngagementID:   engagementID,
        CustomerID:     eng.CustomerID,
        CustomerName:   eng.CustomerName,
        UserEmail:      user.Email,
        CloudProvider:  reqBody.CloudProvider,
        Region:         reqBody.Region,
        RepositoryURL:  reqBody.RepositoryURL,
        Branch:         reqBody.Branch,
        Scope:          reqBody.Scope,
        SCMType:        scmIntegration.Type,
        SCMSecretARN:   scmIntegration.SecretARN, // Reference, not value
        SSHPublicKey:   reqBody.SSHPublicKey,     // User's ephemeral public key (P1-6)
        Status:         "queued",
        CreatedAt:      time.Now(),
        ExpiresAt:      eng.EndDate.Add(7 * 24 * time.Hour),
    }

    if err := saveWorkspace(ctx, workspace); err != nil {
        return cloud.Response(500, map[string]string{"error": "Failed to create workspace record"}), nil
    }

    // 7. Publish to message queue for async provisioning
    provisionMsg := ProvisionMessage{
        WorkspaceID:   workspaceID,
        CloudProvider: reqBody.CloudProvider,
        Region:        reqBody.Region,
        InstanceSize:  selectInstanceSize(reqBody.EstimatedLOC), // Cloud-agnostic size
        SSHPublicKey:  reqBody.SSHPublicKey,                     // Pass to orchestrator
    }

    if err := publishProvisionMessage(ctx, provisionMsg); err != nil {
        deleteWorkspace(ctx, workspaceID)
        return cloud.Response(500, map[string]string{"error": "Failed to queue provisioning"}), nil
    }

    // 8. Audit log
    auditLog(ctx, AuditEvent{
        Type:     "threat_model_environment_queued",
        Actor:    user.Email,
        Resource: workspaceID,
        Details: map[string]interface{}{
            "engagement_id":  engagementID,
            "customer":       eng.CustomerName,
            "repo":           reqBody.RepositoryURL,
            "cloud_provider": reqBody.CloudProvider,
            "region":         reqBody.Region,
        },
    })

    // 9. Return 202 Accepted with polling/SSE endpoints
    return cloud.Response(202, map[string]interface{}{
        "workspace_id":   workspaceID,
        "status":         "queued",
        "cloud_provider": reqBody.CloudProvider,
        "region":         reqBody.Region,
        "status_url":     fmt.Sprintf("/engagements/%s/threat-model/%s/status", engagementID, workspaceID),
        "sse_url":        fmt.Sprintf("/engagements/%s/threat-model/%s/events", engagementID, workspaceID),
        "estimated_time": "2-3 minutes",
    }), nil
}

type LaunchRequest struct {
    CloudProvider CloudProvider `json:"cloud_provider"` // aws|gcp|azure
    Region        string        `json:"region"`         // Cloud-specific region
    RepositoryURL string        `json:"repository_url"`
    Branch        string        `json:"branch"`
    Scope         string        `json:"scope"`          // full|component|incremental
    EstimatedLOC  int           `json:"estimated_loc,omitempty"`
    // NEW: Client-generated ephemeral SSH public key (see P1-6: Client-Generated SSH Keys)
    // Private key NEVER leaves the browser - only public key sent here
    SSHPublicKey  string        `json:"ssh_public_key" validate:"required"`
}

type ProvisionMessage struct {
    WorkspaceID   string        `json:"workspace_id"`
    CloudProvider CloudProvider `json:"cloud_provider"`
    Region        string        `json:"region"`
    InstanceSize  InstanceSize  `json:"instance_size"` // Cloud-agnostic size
    SSHPublicKey  string        `json:"ssh_public_key"` // User's public key for DevPod injection
}

// InstanceSize is cloud-agnostic, mapped to specific instance types per cloud
type InstanceSize string

const (
    SizeSmall  InstanceSize = "small"  // 8 vCPU, 32GB
    SizeMedium InstanceSize = "medium" // 16 vCPU, 64GB
    SizeLarge  InstanceSize = "large"  // 32 vCPU, 128GB
)

func selectInstanceSize(estimatedLOC int) InstanceSize {
    switch {
    case estimatedLOC > 1000000:
        return SizeLarge
    case estimatedLOC > 500000:
        return SizeMedium
    default:
        return SizeSmall
    }
}

func isValidCloudProvider(cp CloudProvider) bool {
    return cp == CloudAWS || cp == CloudGCP || cp == CloudAzure
}

func getDefaultRegion(cp CloudProvider) string {
    switch cp {
    case CloudAWS:
        return "us-east-1"
    case CloudGCP:
        return "us-central1"
    case CloudAzure:
        return "eastus"
    default:
        return "us-east-1"
    }
}
```

### Security Controls Applied

- **P0-1**: Input validation with `InputValidator` (see Document 4)
- **P1-6**: Client-generated SSH keys (public key only transmitted)
- **No secrets in Lambda**: Only ARN references stored, JIT fetch in
  orchestrator

**See**: [02-SCM-CREDENTIAL-FLOW.md](02-SCM-CREDENTIAL-FLOW.md) for SCM
integration details **See**:
[04-SECURITY-HARDENING.md](04-SECURITY-HARDENING.md) for P0-1 and P1-6
implementations

---

## Component 2: DevPod Orchestrator (Multi-Cloud)

### Overview

**Component**: Orchestrator service that provisions DevPod workspaces across
AWS, GCP, and Azure

**Capabilities**:

- Runs DevPod CLI with all cloud providers configured (aws, gcp, azure)
- Maps cloud-agnostic instance sizes to provider-specific types
- Handles long-running operations (2-3 min provisioning)
- Maintains persistent DevPod state in `~/.devpod/`
- Polls message queue for provision requests

### Instance Type Mapping

**File**:
`modules/threat-model-infrastructure/orchestrator/pkg/cloud/instance_mapping.go`

```go
package cloud

// InstanceTypeMapping maps cloud-agnostic sizes to provider-specific instance types
var InstanceTypeMapping = map[CloudProvider]map[InstanceSize]string{
    CloudAWS: {
        SizeSmall:  "t3.2xlarge",   // 8 vCPU, 32GB
        SizeMedium: "m5.4xlarge",   // 16 vCPU, 64GB
        SizeLarge:  "m5.8xlarge",   // 32 vCPU, 128GB
    },
    CloudGCP: {
        SizeSmall:  "n2-standard-8",  // 8 vCPU, 32GB
        SizeMedium: "n2-standard-16", // 16 vCPU, 64GB
        SizeLarge:  "n2-standard-32", // 32 vCPU, 128GB
    },
    CloudAzure: {
        SizeSmall:  "Standard_D8s_v3",  // 8 vCPU, 32GB
        SizeMedium: "Standard_D16s_v3", // 16 vCPU, 64GB
        SizeLarge:  "Standard_D32s_v3", // 32 vCPU, 128GB
    },
}

// DevPodProviderMapping maps cloud providers to DevPod provider names
var DevPodProviderMapping = map[CloudProvider]string{
    CloudAWS:   "aws",
    CloudGCP:   "gcp",
    CloudAzure: "azure",
}

// InstanceTypeOptionKey maps cloud providers to their instance type option key
var InstanceTypeOptionKey = map[CloudProvider]string{
    CloudAWS:   "INSTANCE_TYPE",
    CloudGCP:   "MACHINE_TYPE",
    CloudAzure: "VM_SIZE",
}
```

### Orchestrator Implementation

**File**:
`modules/threat-model-infrastructure/orchestrator/pkg/orchestrator/orchestrator.go`

```go
package orchestrator

import (
    "context"
    "encoding/json"
    "fmt"
    "os"
    "os/exec"
    "time"
)

type Orchestrator struct {
    queueConsumer QueueConsumer  // Abstracted queue (SQS, Pub/Sub, Service Bus)
    dataStore     DataStore      // Abstracted storage (DynamoDB, Firestore, CosmosDB)
    secretsStore  SecretsStore   // Abstracted secrets (Secrets Manager, Secret Manager, Key Vault)
}

func (o *Orchestrator) Run(ctx context.Context) error {
    for {
        select {
        case <-ctx.Done():
            return ctx.Err()
        default:
            if err := o.pollAndProcess(ctx); err != nil {
                log.Error("Poll error", "error", err)
                time.Sleep(5 * time.Second)
            }
        }
    }
}

func (o *Orchestrator) pollAndProcess(ctx context.Context) error {
    // Long poll queue (20 seconds)
    msg, err := o.queueConsumer.ReceiveMessage(ctx, 20*time.Second)
    if err != nil {
        return err
    }
    if msg == nil {
        return nil // No message
    }

    if err := o.processMessage(ctx, msg); err != nil {
        log.Error("Process error", "error", err, "message_id", msg.ID)
        return nil // Don't delete - will retry
    }

    return o.queueConsumer.DeleteMessage(ctx, msg)
}

func (o *Orchestrator) processMessage(ctx context.Context, msg *QueueMessage) error {
    var req ProvisionMessage
    if err := json.Unmarshal(msg.Body, &req); err != nil {
        return fmt.Errorf("invalid message: %w", err)
    }

    // Get workspace details from data store
    workspace, err := o.dataStore.GetWorkspace(ctx, req.WorkspaceID)
    if err != nil {
        return fmt.Errorf("workspace not found: %w", err)
    }

    // Track cleanup resources
    var cleanup []func()
    defer func() {
        for i := len(cleanup) - 1; i >= 0; i-- {
            cleanup[i]()
        }
    }()

    // Update status: provisioning
    cloudName := getCloudDisplayName(req.CloudProvider)
    o.dataStore.UpdateStatus(ctx, workspace.WorkspaceID, "provisioning",
        fmt.Sprintf("Starting %s instance in %s...", cloudName, req.Region))

    // Provision DevPod workspace (multi-cloud)
    devpodResult, err := o.provisionDevPod(ctx, workspace, req)
    if err != nil {
        o.dataStore.UpdateStatus(ctx, workspace.WorkspaceID, "failed", err.Error())
        return fmt.Errorf("devpod provision failed: %w", err)
    }
    cleanup = append(cleanup, func() {
        o.terminateDevPod(ctx, workspace.WorkspaceID)
    })

    // Update status: initializing
    o.dataStore.UpdateStatus(ctx, workspace.WorkspaceID, "initializing", "Cloning repository...")

    // Clone repository with JIT credentials (see Document 2)
    if err := o.cloneRepository(ctx, workspace); err != nil {
        o.dataStore.UpdateStatus(ctx, workspace.WorkspaceID, "failed", err.Error())
        return fmt.Errorf("clone failed: %w", err)
    }

    // Inject user SSH key (P1-6)
    if err := o.injectUserSSHKey(ctx, workspace); err != nil {
        o.dataStore.UpdateStatus(ctx, workspace.WorkspaceID, "failed", err.Error())
        return fmt.Errorf("SSH key injection failed: %w", err)
    }

    // Update status: ready
    o.dataStore.UpdateStatus(ctx, workspace.WorkspaceID, "ready", "Environment ready")
    o.dataStore.UpdateSSHConfig(ctx, workspace.WorkspaceID, devpodResult.SSHConfig)

    // Success - don't cleanup
    cleanup = nil

    // Send notification
    o.sendReadyNotification(ctx, workspace)

    return nil
}

func (o *Orchestrator) provisionDevPod(ctx context.Context, ws *Workspace, req ProvisionMessage) (*DevPodResult, error) {
    // Get provider-specific configuration
    provider := DevPodProviderMapping[req.CloudProvider]
    instanceType := InstanceTypeMapping[req.CloudProvider][req.InstanceSize]
    instanceTypeKey := InstanceTypeOptionKey[req.CloudProvider]

    args := []string{
        "up",
        "--provider", provider,
        "--ide", "none",
        "--source", "docker-image:ghcr.io/praetorian-inc/threat-modeling-devpod:latest",
        "--option", fmt.Sprintf("%s=%s", instanceTypeKey, instanceType),
        "--option", fmt.Sprintf("REGION=%s", req.Region),
        // Environment variables (no secrets here)
        "--env", fmt.Sprintf("ENGAGEMENT_ID=%s", ws.EngagementID),
        "--env", fmt.Sprintf("CUSTOMER_NAME=%s", ws.CustomerName),
        "--env", fmt.Sprintf("REPO_URL=%s", ws.RepositoryURL),
        "--env", fmt.Sprintf("REPO_BRANCH=%s", ws.Branch),
        "--env", fmt.Sprintf("SCM_TYPE=%s", ws.SCMType),
        "--env", fmt.Sprintf("CLOUD_PROVIDER=%s", req.CloudProvider),
        "--env", fmt.Sprintf("SECURITY_ENGINEER=%s", ws.UserEmail),
        ws.WorkspaceID,
    }

    // Add cloud-specific options
    switch req.CloudProvider {
    case CloudGCP:
        args = append(args, "--option", fmt.Sprintf("PROJECT=%s", os.Getenv("GCP_PROJECT_ID")))
    case CloudAzure:
        args = append(args, "--option", fmt.Sprintf("RESOURCE_GROUP=%s", os.Getenv("AZURE_RESOURCE_GROUP")))
    }

    cmd := exec.CommandContext(ctx, "devpod", args...)
    cmd.Env = append(os.Environ(), "DEVPOD_DEBUG=true")

    output, err := cmd.CombinedOutput()
    if err != nil {
        return nil, fmt.Errorf("devpod up failed: %w, output: %s", err, output)
    }

    // Get SSH config
    sshConfig, err := o.getDevPodSSHConfig(ctx, ws.WorkspaceID)
    if err != nil {
        return nil, fmt.Errorf("failed to get SSH config: %w", err)
    }

    return &DevPodResult{
        SSHConfig:     sshConfig,
        CloudProvider: req.CloudProvider,
        Region:        req.Region,
        InstanceType:  instanceType,
    }, nil
}

func (o *Orchestrator) cloneRepository(ctx context.Context, ws *Workspace) error {
    // JIT: Fetch token from secrets store using GIT_ASKPASS pattern (P1-15)
    // See Document 2 for full implementation
    tokenBytes, err := o.secretsStore.GetSecretBytes(ctx, ws.SCMSecretARN)
    if err != nil {
        return fmt.Errorf("failed to get SCM token: %w", err)
    }
    defer secrets.ZeroBytes(tokenBytes) // Clear from memory (P1-4)

    // Use GIT_ASKPASS pattern to avoid token in .git/config
    cloner := git.NewAskPassCloner("/workspace/customer-code")
    if err := cloner.Clone(ctx, ws.RepositoryURL, ws.Branch, tokenBytes); err != nil {
        return fmt.Errorf("clone failed: %w", err)
    }

    return nil
}

func (o *Orchestrator) injectUserSSHKey(ctx context.Context, ws *Workspace) error {
    // Inject user's ephemeral SSH public key (P1-6)
    // Private key stays in browser, never transmitted
    if ws.SSHPublicKey == "" {
        return fmt.Errorf("missing SSH public key")
    }

    injectScript := fmt.Sprintf(`
        mkdir -p /home/devpod/.ssh
        echo "%s" >> /home/devpod/.ssh/authorized_keys
        chmod 600 /home/devpod/.ssh/authorized_keys
        chown devpod:devpod /home/devpod/.ssh/authorized_keys
    `, ws.SSHPublicKey)

    cmd := exec.CommandContext(ctx, "devpod", "ssh",
        "--command", injectScript,
        ws.WorkspaceID,
    )

    if output, err := cmd.CombinedOutput(); err != nil {
        return fmt.Errorf("SSH key injection failed: %w, output: %s", err, output)
    }

    return nil
}

func getCloudDisplayName(cp CloudProvider) string {
    switch cp {
    case CloudAWS:
        return "AWS EC2"
    case CloudGCP:
        return "GCP Compute Engine"
    case CloudAzure:
        return "Azure VM"
    default:
        return string(cp)
    }
}

type DevPodResult struct {
    SSHConfig     SSHConfig
    CloudProvider CloudProvider
    Region        string
    InstanceType  string
}
```

### Instance Type Reference

| Size       | vCPU | RAM   | AWS        | GCP            | Azure            |
| ---------- | ---- | ----- | ---------- | -------------- | ---------------- |
| **small**  | 8    | 32GB  | t3.2xlarge | n2-standard-8  | Standard_D8s_v3  |
| **medium** | 16   | 64GB  | m5.4xlarge | n2-standard-16 | Standard_D16s_v3 |
| **large**  | 32   | 128GB | m5.8xlarge | n2-standard-32 | Standard_D32s_v3 |

### Cost Comparison

| Size   | AWS ($/hr) | GCP ($/hr) | Azure ($/hr) |
| ------ | ---------- | ---------- | ------------ |
| small  | $0.33      | $0.31      | $0.38        |
| medium | $0.77      | $0.62      | $0.77        |
| large  | $1.54      | $1.24      | $1.54        |

_Prices are approximate on-demand rates as of 2024. Actual costs vary by
region._

**See**: [02-SCM-CREDENTIAL-FLOW.md](02-SCM-CREDENTIAL-FLOW.md) for complete
credential handling implementation **See**:
[04-SECURITY-HARDENING.md](04-SECURITY-HARDENING.md) for P1-6 (SSH key
generation) details

---

## Component 3: Frontend Components

### Overview

**Stack**:

- TanStack Query for server state management
- Server-Sent Events for real-time status updates
- Deep link with manual SSH fallback
- Full workspace lifecycle management UI
- Cloud provider selection (AWS, GCP, Azure)

### React Hooks

**File**:
`modules/chariot/ui/src/features/threat-model/hooks/useThreatModelWorkspace.ts`

```typescript
// hooks/useThreatModelWorkspace.ts
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEventSource } from "./useEventSource";

type CloudProvider = "aws" | "gcp" | "azure";

interface Workspace {
  workspace_id: string;
  cloud_provider: CloudProvider;
  region: string;
  status:
    | "queued"
    | "provisioning"
    | "initializing"
    | "ready"
    | "active"
    | "failed";
  status_message?: string;
  ssh_config?: SSHConfig;
  cursor_link?: string;
  created_at: string;
  expires_at: string;
}

interface SSHConfig {
  host: string;
  port: number;
  user: string;
}

// Cloud provider configuration
const CLOUD_PROVIDERS: Record<
  CloudProvider,
  {
    name: string;
    regions: { value: string; label: string }[];
    icon: string;
  }
> = {
  aws: {
    name: "Amazon Web Services",
    icon: "aws",
    regions: [
      { value: "us-east-1", label: "US East (N. Virginia)" },
      { value: "us-west-2", label: "US West (Oregon)" },
      { value: "eu-west-1", label: "Europe (Ireland)" },
      { value: "ap-southeast-1", label: "Asia Pacific (Singapore)" },
    ],
  },
  gcp: {
    name: "Google Cloud Platform",
    icon: "gcp",
    regions: [
      { value: "us-central1", label: "US Central (Iowa)" },
      { value: "us-east1", label: "US East (South Carolina)" },
      { value: "europe-west1", label: "Europe West (Belgium)" },
      { value: "asia-southeast1", label: "Asia Southeast (Singapore)" },
    ],
  },
  azure: {
    name: "Microsoft Azure",
    icon: "azure",
    regions: [
      { value: "eastus", label: "East US" },
      { value: "westus2", label: "West US 2" },
      { value: "westeurope", label: "West Europe" },
      { value: "southeastasia", label: "Southeast Asia" },
    ],
  },
};

export function useLaunchWorkspace(engagementId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: {
      cloud_provider: CloudProvider;
      region: string;
      repository_url: string;
      branch: string;
      scope: string;
      estimated_loc?: number;
      ssh_public_key: string; // Client-generated ephemeral key (P1-6)
    }) => {
      const response = await axios.post(
        `/engagements/${engagementId}/threat-model/launch`,
        params
      );
      return response.data;
    },
    onSuccess: (data) => {
      // Invalidate workspaces list to show new workspace
      queryClient.invalidateQueries({
        queryKey: ["workspaces", engagementId],
      });
    },
  });
}

export function useWorkspaceStatus(
  engagementId: string,
  workspaceId: string | null,
  enabled: boolean
) {
  // SSE for real-time updates
  const { data: sseData, error: sseError } = useEventSource(
    enabled && workspaceId
      ? `/engagements/${engagementId}/threat-model/${workspaceId}/events`
      : null
  );

  // Fallback polling if SSE fails
  const { data: pollData } = useQuery({
    queryKey: ["workspace-status", workspaceId],
    queryFn: async () => {
      const response = await axios.get(
        `/engagements/${engagementId}/threat-model/${workspaceId}/status`
      );
      return response.data;
    },
    enabled: enabled && !!workspaceId && !!sseError,
    refetchInterval: 5000,
  });

  return sseData || pollData;
}

export function useWorkspaces(engagementId: string) {
  return useQuery({
    queryKey: ["workspaces", engagementId],
    queryFn: async () => {
      const response = await axios.get(
        `/engagements/${engagementId}/threat-model/workspaces`
      );
      return response.data as Workspace[];
    },
  });
}

// SSH key generation (P1-6: Client-Generated SSH Keys)
export function useSSHKeyPair() {
  const [keyPair, setKeyPair] = useState<{
    publicKey: string;
    privateKey: string;
  } | null>(null);

  const generate = async () => {
    const { publicKey, privateKey } = await generateSSHKeyPair();
    setKeyPair({ publicKey, privateKey });

    // Store private key in sessionStorage (ephemeral - cleared on tab close)
    sessionStorage.setItem("devpod_ssh_private_key", privateKey);

    return publicKey; // Only public key transmitted to backend
  };

  const clear = () => {
    setKeyPair(null);
    sessionStorage.removeItem("devpod_ssh_private_key");
  };

  return { keyPair, generate, clear };
}
```

### Launcher Component

**File**:
`modules/chariot/ui/src/features/threat-model/components/ThreatModelLauncher.tsx`

```typescript
// components/ThreatModelLauncher.tsx
import { useState } from "react";
import { Button } from "src/components/Button";
import { Modal } from "src/components/Modal";
import { ProgressBar } from "src/components/ProgressBar";
import { toast } from "sonner";
import {
  useLaunchWorkspace,
  useWorkspaceStatus,
  useWorkspaces,
  useSSHKeyPair,
} from "../hooks/useThreatModelWorkspace";

interface ThreatModelLauncherProps {
  engagementId: string;
  customerName: string;
  scmIntegrations: SCMIntegration[];
}

const STATUS_PROGRESS: Record<string, number> = {
  queued: 10,
  provisioning: 40,
  initializing: 70,
  ready: 100,
  failed: 0,
};

export function ThreatModelLauncher({
  engagementId,
  customerName,
  scmIntegrations,
}: ThreatModelLauncherProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [cloudProvider, setCloudProvider] = useState<CloudProvider>("aws");
  const [region, setRegion] = useState("");
  const [repositoryURL, setRepositoryURL] = useState("");
  const [branch, setBranch] = useState("main");
  const [estimatedLOC, setEstimatedLOC] = useState<number>(0);
  const [activeWorkspaceId, setActiveWorkspaceId] = useState<string | null>(null);

  const { keyPair, generate: generateSSHKey, clear: clearSSHKey } = useSSHKeyPair();
  const launchMutation = useLaunchWorkspace(engagementId);
  const workspaceStatus = useWorkspaceStatus(engagementId, activeWorkspaceId, !!activeWorkspaceId);

  const handleLaunch = async () => {
    // Generate ephemeral SSH key pair (P1-6)
    const publicKey = await generateSSHKey();

    try {
      const result = await launchMutation.mutateAsync({
        cloud_provider: cloudProvider,
        region: region,
        repository_url: repositoryURL,
        branch: branch,
        scope: "full",
        estimated_loc: estimatedLOC,
        ssh_public_key: publicKey, // Only public key sent
      });

      setActiveWorkspaceId(result.workspace_id);
      toast.success("Threat modeling environment queued");
    } catch (error) {
      toast.error("Failed to launch environment");
      clearSSHKey(); // Clear keys on failure
    }
  };

  const progress = STATUS_PROGRESS[workspaceStatus?.status || "queued"];
  const cloudName = CLOUD_PROVIDERS[cloudProvider].name;

  return (
    <>
      <Button onClick={() => setIsModalOpen(true)}>
        Launch Threat Model Environment
      </Button>

      <Modal open={isModalOpen} onClose={() => setIsModalOpen(false)}>
        <h2>Launch Threat Modeling Environment</h2>

        <div className="space-y-4">
          {/* Cloud Provider Selection */}
          <div>
            <label>Cloud Provider</label>
            <select
              value={cloudProvider}
              onChange={(e) => {
                setCloudProvider(e.target.value as CloudProvider);
                setRegion(CLOUD_PROVIDERS[e.target.value as CloudProvider].regions[0].value);
              }}
            >
              <option value="aws">AWS</option>
              <option value="gcp">GCP</option>
              <option value="azure">Azure</option>
            </select>
          </div>

          {/* Region Selection */}
          <div>
            <label>Region</label>
            <select value={region} onChange={(e) => setRegion(e.target.value)}>
              {CLOUD_PROVIDERS[cloudProvider].regions.map((r) => (
                <option key={r.value} value={r.value}>
                  {r.label}
                </option>
              ))}
            </select>
          </div>

          {/* Repository Selection */}
          <div>
            <label>Repository</label>
            <select
              value={repositoryURL}
              onChange={(e) => setRepositoryURL(e.target.value)}
            >
              {scmIntegrations.flatMap((integration) =>
                integration.repositories.map((repo) => (
                  <option key={repo} value={repo}>
                    {repo}
                  </option>
                ))
              )}
            </select>
          </div>

          {/* Branch */}
          <div>
            <label>Branch</label>
            <input
              type="text"
              value={branch}
              onChange={(e) => setBranch(e.target.value)}
              placeholder="main"
            />
          </div>

          {/* Progress */}
          {activeWorkspaceId && (
            <div>
              <ProgressBar value={progress} max={100} />
              <p className="text-sm text-gray-600 mt-2">
                {workspaceStatus?.status_message || `Provisioning ${cloudName} instance...`}
              </p>
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-end space-x-2">
            <Button variant="secondary" onClick={() => setIsModalOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleLaunch}
              disabled={!repositoryURL || launchMutation.isPending}
            >
              {launchMutation.isPending ? "Launching..." : "Launch"}
            </Button>
          </div>
        </div>
      </Modal>
    </>
  );
}
```

### Security Controls Applied

- **P1-6**: SSH key generation in browser using Web Crypto API
- **Ephemeral storage**: Private key stored in sessionStorage (cleared on tab
  close)
- **Input sanitization**: All user inputs validated and sanitized (see Document
  4, P0-1)

**See**: [04-SECURITY-HARDENING.md](04-SECURITY-HARDENING.md) → Section "P1-6:
Client-Generated SSH Keys" for Web Crypto implementation details

---

## Component 4: Infrastructure (Terraform Multi-Cloud)

### Overview

Cloud-agnostic Terraform modules for deploying orchestrator infrastructure
across AWS, GCP, and Azure.

### Repository Structure

```
modules/threat-model-infrastructure/
├── main.tf                    # Provider selection & module composition
├── variables.tf               # Cloud-agnostic variables
├── outputs.tf                 # Unified outputs
├── versions.tf                # Provider version constraints
│
├── aws/                       # AWS-specific resources
│   ├── main.tf
│   ├── vpc.tf                 # VPC, subnets, NAT
│   ├── sqs.tf                 # Job queue
│   ├── secrets.tf             # Secrets Manager
│   ├── s3.tf                  # Output storage
│   ├── iam.tf                 # IAM roles
│   └── orchestrator.tf        # EC2 orchestrator instance
│
├── gcp/                       # GCP-specific resources
│   ├── main.tf
│   ├── vpc.tf                 # VPC, subnets, Cloud NAT
│   ├── pubsub.tf              # Job queue (Pub/Sub)
│   ├── secrets.tf             # Secret Manager
│   ├── gcs.tf                 # Output storage
│   ├── iam.tf                 # Service accounts
│   └── orchestrator.tf        # GCE orchestrator instance
│
└── azure/                     # Azure-specific resources
    ├── main.tf
    ├── vnet.tf                # Virtual Network, subnets
    ├── servicebus.tf          # Job queue (Service Bus)
    ├── keyvault.tf            # Key Vault
    ├── storage.tf             # Blob storage
    ├── identity.tf            # Managed Identity
    └── orchestrator.tf        # VM orchestrator instance
```

### Main Configuration (main.tf) - Cloud-Agnostic Entry Point

The main entry point provides cloud-agnostic configuration that conditionally
loads the appropriate cloud module based on the selected provider.

**File**: `modules/threat-model-infrastructure/main.tf`

```hcl
# main.tf - Cloud-agnostic entry point

variable "cloud_provider" {
  description = "Cloud provider for orchestration infrastructure"
  type        = string
  default     = "aws"
  validation {
    condition     = contains(["aws", "gcp", "azure"], var.cloud_provider)
    error_message = "cloud_provider must be aws, gcp, or azure"
  }
}

variable "environment" {
  description = "Deployment environment"
  type        = string
  default     = "production"
}

variable "region" {
  description = "Cloud region for deployment"
  type        = string
}

# AWS Provider
provider "aws" {
  region = var.cloud_provider == "aws" ? var.region : "us-east-1"
  default_tags {
    tags = {
      Project     = "threat-modeling-devpod"
      Environment = var.environment
      ManagedBy   = "terraform"
    }
  }
}

# GCP Provider
provider "google" {
  project = var.gcp_project_id
  region  = var.cloud_provider == "gcp" ? var.region : "us-central1"
}

# Azure Provider
provider "azurerm" {
  features {}
  subscription_id = var.azure_subscription_id
}

# Conditional module loading based on cloud_provider
module "aws" {
  source = "./aws"
  count  = var.cloud_provider == "aws" ? 1 : 0

  environment           = var.environment
  region                = var.region
  devpod_image          = var.devpod_image
  allowed_ssh_cidrs     = var.allowed_ssh_cidrs
}

module "gcp" {
  source = "./gcp"
  count  = var.cloud_provider == "gcp" ? 1 : 0

  environment           = var.environment
  region                = var.region
  project_id            = var.gcp_project_id
  devpod_image          = var.devpod_image
}

module "azure" {
  source = "./azure"
  count  = var.cloud_provider == "azure" ? 1 : 0

  environment           = var.environment
  region                = var.region
  resource_group_name   = var.azure_resource_group
  devpod_image          = var.devpod_image
}

# Unified outputs
output "queue_url" {
  description = "Job queue URL/subscription"
  value = coalesce(
    try(module.aws[0].queue_url, null),
    try(module.gcp[0].subscription_name, null),
    try(module.azure[0].servicebus_queue_name, null)
  )
}

output "storage_bucket" {
  description = "Output storage bucket/container"
  value = coalesce(
    try(module.aws[0].s3_bucket, null),
    try(module.gcp[0].gcs_bucket, null),
    try(module.azure[0].storage_container, null)
  )
}

output "orchestrator_ip" {
  description = "Orchestrator instance IP"
  value = coalesce(
    try(module.aws[0].orchestrator_private_ip, null),
    try(module.gcp[0].orchestrator_private_ip, null),
    try(module.azure[0].orchestrator_private_ip, null)
  )
}
```

This entry point demonstrates the cloud-agnostic architecture:

- **Provider validation**: Ensures only supported cloud providers are used
- **Conditional loading**: Uses Terraform `count` to load only the selected cloud module
- **Unified outputs**: Normalizes outputs across all three providers using `coalesce()` and `try()`

### AWS Terraform Module

**File**: `modules/threat-model-infrastructure/terraform/aws/main.tf`

```hcl
terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

# VPC and Networking
resource "aws_vpc" "devpod" {
  cidr_block           = var.vpc_cidr
  enable_dns_hostnames = true
  enable_dns_support   = true

  tags = {
    Name        = "devpod-vpc"
    Environment = var.environment
  }
}

resource "aws_subnet" "private" {
  count             = length(var.availability_zones)
  vpc_id            = aws_vpc.devpod.id
  cidr_block        = cidrsubnet(var.vpc_cidr, 4, count.index)
  availability_zone = var.availability_zones[count.index]

  tags = {
    Name = "devpod-private-${count.index}"
  }
}

# NAT Gateway
resource "aws_eip" "nat" {
  domain = "vpc"
}

resource "aws_nat_gateway" "main" {
  allocation_id = aws_eip.nat.id
  subnet_id     = aws_subnet.public[0].id

  tags = {
    Name = "devpod-nat"
  }
}

# EC2 Orchestrator Instance
resource "aws_instance" "orchestrator" {
  ami                    = data.aws_ami.ubuntu.id
  instance_type          = var.orchestrator_instance_type
  subnet_id              = aws_subnet.private[0].id
  iam_instance_profile   = aws_iam_instance_profile.orchestrator.name
  vpc_security_group_ids = [aws_security_group.orchestrator.id]

  # IMDSv2 enforcement (P1-5)
  metadata_options {
    http_endpoint               = "enabled"
    http_tokens                 = "required"  # IMDSv2 only
    http_put_response_hop_limit = 1           # Prevent container access
  }

  user_data = templatefile("${path.module}/user_data.sh", {
    devpod_version = var.devpod_version
    queue_url      = aws_sqs_queue.provisioning.url
    region         = var.region
  })

  tags = {
    Name = "devpod-orchestrator"
  }
}

# IAM Role for Orchestrator (P1-3: Scoped Permissions)
resource "aws_iam_role" "orchestrator" {
  name = "devpod-orchestrator-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "ec2.amazonaws.com"
        }
      }
    ]
  })
}

resource "aws_iam_role_policy" "orchestrator" {
  name = "devpod-orchestrator-policy"
  role = aws_iam_role.orchestrator.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      # EC2 - DevPod instance management only
      {
        Effect = "Allow"
        Action = [
          "ec2:RunInstances",
          "ec2:TerminateInstances",
          "ec2:DescribeInstances",
          "ec2:CreateTags"
        ]
        Resource = "*"
        Condition = {
          StringEquals = {
            "aws:RequestedRegion" = var.region
          }
        }
      },
      # Secrets Manager - Read-only, specific secrets
      {
        Effect = "Allow"
        Action = [
          "secretsmanager:GetSecretValue"
        ]
        Resource = [
          "arn:aws:secretsmanager:${var.region}:${data.aws_caller_identity.current.account_id}:secret:chariot/scm/*",
          "arn:aws:secretsmanager:${var.region}:${data.aws_caller_identity.current.account_id}:secret:chariot/anthropic-api-key"
        ]
      },
      # DynamoDB - Workspace table only
      {
        Effect = "Allow"
        Action = [
          "dynamodb:GetItem",
          "dynamodb:PutItem",
          "dynamodb:UpdateItem"
        ]
        Resource = aws_dynamodb_table.workspaces.arn
      },
      # SQS - Provisioning queue only
      {
        Effect = "Allow"
        Action = [
          "sqs:ReceiveMessage",
          "sqs:DeleteMessage"
        ]
        Resource = aws_sqs_queue.provisioning.arn
      }
    ]
  })
}

# SQS Queue for Provisioning
resource "aws_sqs_queue" "provisioning" {
  name                       = "devpod-provisioning"
  visibility_timeout_seconds = 300  # 5 minutes (2-3 min provision + buffer)
  message_retention_seconds  = 86400 # 24 hours

  tags = {
    Name = "devpod-provisioning-queue"
  }
}

# DynamoDB Table for Workspace State
resource "aws_dynamodb_table" "workspaces" {
  name         = "DevPodWorkspaces"
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "workspace_id"

  attribute {
    name = "workspace_id"
    type = "S"
  }

  ttl {
    attribute_name = "expires_at"
    enabled        = true
  }

  tags = {
    Name = "devpod-workspaces"
  }
}

# VPC Endpoints (P1-14: Service Endpoint Restriction)
resource "aws_vpc_endpoint" "secretsmanager" {
  vpc_id             = aws_vpc.devpod.id
  service_name       = "com.amazonaws.${var.region}.secretsmanager"
  vpc_endpoint_type  = "Interface"
  subnet_ids         = aws_subnet.private[*].id
  security_group_ids = [aws_security_group.vpc_endpoints.id]

  private_dns_enabled = true

  tags = {
    Name = "devpod-secretsmanager-endpoint"
  }
}

resource "aws_vpc_endpoint" "dynamodb" {
  vpc_id            = aws_vpc.devpod.id
  service_name      = "com.amazonaws.${var.region}.dynamodb"
  vpc_endpoint_type = "Gateway"
  route_table_ids   = aws_route_table.private[*].id

  tags = {
    Name = "devpod-dynamodb-endpoint"
  }
}

# AWS Network Firewall (P1-2: Egress Filtering)
resource "aws_networkfirewall_firewall" "devpod" {
  name                = "devpod-egress-firewall"
  firewall_policy_arn = aws_networkfirewall_firewall_policy.devpod.arn
  vpc_id              = aws_vpc.devpod.id

  subnet_mapping {
    subnet_id = aws_subnet.firewall[0].id
  }

  tags = {
    Name = "devpod-network-firewall"
  }
}

resource "aws_networkfirewall_firewall_policy" "devpod" {
  name = "devpod-egress-policy"

  firewall_policy {
    stateless_default_actions          = ["aws:forward_to_sfe"]
    stateless_fragment_default_actions = ["aws:forward_to_sfe"]

    stateful_rule_group_reference {
      resource_arn = aws_networkfirewall_rule_group.allowed_domains.arn
    }

    # TLS Inspection (P1-2)
    tls_inspection_configuration_arn = aws_networkfirewall_tls_inspection_configuration.devpod.arn
  }
}

resource "aws_networkfirewall_rule_group" "allowed_domains" {
  capacity = 100
  name     = "devpod-allowed-domains"
  type     = "STATEFUL"

  rule_group {
    rules_source {
      rules_source_list {
        generated_rules_type = "ALLOWLIST"
        target_types         = ["TLS_SNI", "HTTP_HOST"]

        targets = [
          # Essential services only
          ".amazonaws.com",
          ".anthropic.com",
          ".github.com",
          ".npmjs.org",
          ".pypi.org",
          ".docker.io",
          ".ghcr.io"
        ]
      }
    }
  }

  tags = {
    Name = "devpod-allowed-domains"
  }
}

# TLS Inspection Configuration (P1-2: Prevents SNI Spoofing)
resource "aws_networkfirewall_tls_inspection_configuration" "devpod" {
  name = "devpod-tls-inspection"

  tls_inspection_configuration {
    server_certificate_configuration {
      certificate_authority_arn = aws_acmpca_certificate_authority.firewall.arn

      scope {
        destination_ports {
          from_port = 443
          to_port   = 443
        }
        protocols = [6] # TCP
      }
    }
  }

  tags = {
    Name = "devpod-tls-inspection"
  }
}

# ACM Private CA for TLS Inspection (P1-2)
resource "aws_acmpca_certificate_authority" "firewall" {
  type = "ROOT"

  certificate_authority_configuration {
    key_algorithm     = "RSA_4096"
    signing_algorithm = "SHA512WITHRSA"

    subject {
      common_name = "DevPod Network Firewall CA"
    }
  }

  permanent_deletion_time_in_days = 7

  tags = {
    Name = "devpod-firewall-ca"
  }
}

# Output for other modules
output "orchestrator_instance_id" {
  value = aws_instance.orchestrator.id
}

output "queue_url" {
  value = aws_sqs_queue.provisioning.url
}

output "dynamodb_table_name" {
  value = aws_dynamodb_table.workspaces.name
}
```

### GCP Terraform Module

**File**: `modules/threat-model-infrastructure/terraform/gcp/main.tf`

```hcl
terraform {
  required_providers {
    google = {
      source  = "hashicorp/google"
      version = "~> 5.0"
    }
  }
}

# VPC Network
resource "google_compute_network" "devpod" {
  name                    = "devpod-network"
  auto_create_subnetworks = false
}

resource "google_compute_subnetwork" "private" {
  name          = "devpod-private-subnet"
  ip_cidr_range = var.subnet_cidr
  region        = var.region
  network       = google_compute_network.devpod.id

  private_ip_google_access = true
}

# Cloud NAT
resource "google_compute_router" "devpod" {
  name    = "devpod-router"
  region  = var.region
  network = google_compute_network.devpod.id
}

resource "google_compute_router_nat" "devpod" {
  name                               = "devpod-nat"
  router                             = google_compute_router.devpod.name
  region                             = var.region
  nat_ip_allocate_option             = "AUTO_ONLY"
  source_subnetwork_ip_ranges_to_nat = "ALL_SUBNETWORKS_ALL_IP_RANGES"
}

# Orchestrator Instance
resource "google_compute_instance" "orchestrator" {
  name         = "devpod-orchestrator"
  machine_type = var.orchestrator_machine_type
  zone         = "${var.region}-a"

  boot_disk {
    initialize_params {
      image = "ubuntu-os-cloud/ubuntu-2204-lts"
    }
  }

  network_interface {
    subnetwork = google_compute_subnetwork.private.id
  }

  service_account {
    email  = google_service_account.orchestrator.email
    scopes = ["cloud-platform"]
  }

  metadata_startup_script = templatefile("${path.module}/startup_script.sh", {
    project_id = var.project_id
    region     = var.region
  })

  tags = ["devpod-orchestrator"]
}

# Service Account (Scoped Permissions - P1-3 equivalent)
resource "google_service_account" "orchestrator" {
  account_id   = "devpod-orchestrator"
  display_name = "DevPod Orchestrator"
}

resource "google_project_iam_member" "orchestrator_compute" {
  project = var.project_id
  role    = "roles/compute.instanceAdmin.v1"
  member  = "serviceAccount:${google_service_account.orchestrator.email}"
}

resource "google_project_iam_member" "orchestrator_secrets" {
  project = var.project_id
  role    = "roles/secretmanager.secretAccessor"
  member  = "serviceAccount:${google_service_account.orchestrator.email}"
}

# Pub/Sub for Provisioning Queue
resource "google_pubsub_topic" "provisioning" {
  name = "devpod-provisioning"
}

resource "google_pubsub_subscription" "provisioning" {
  name  = "devpod-provisioning-sub"
  topic = google_pubsub_topic.provisioning.name

  ack_deadline_seconds = 300 # 5 minutes
}

# Firestore for Workspace State
resource "google_firestore_database" "devpod" {
  name        = "(default)"
  location_id = var.region
  type        = "FIRESTORE_NATIVE"
}

# Cloud Firewall (Egress Filtering - P1-2 equivalent)
resource "google_compute_firewall" "egress_deny_all" {
  name    = "devpod-egress-deny-all"
  network = google_compute_network.devpod.name

  deny {
    protocol = "all"
  }

  direction          = "EGRESS"
  destination_ranges = ["0.0.0.0/0"]
  priority           = 1000

  target_tags = ["devpod-orchestrator", "devpod-workspace"]
}

resource "google_compute_firewall" "egress_allow_approved" {
  name    = "devpod-egress-allow-approved"
  network = google_compute_network.devpod.name

  allow {
    protocol = "tcp"
    ports    = ["443"]
  }

  direction          = "EGRESS"
  destination_ranges = ["0.0.0.0/0"]
  priority           = 900  # Higher priority than deny rule

  target_tags = ["devpod-orchestrator", "devpod-workspace"]

  # Domain filtering via Cloud Armor (separate resource)
  log_config {
    metadata = "INCLUDE_ALL_METADATA"
  }
}

output "orchestrator_instance_name" {
  value = google_compute_instance.orchestrator.name
}

output "topic_id" {
  value = google_pubsub_topic.provisioning.id
}
```

### Azure Terraform Module

**File**: `modules/threat-model-infrastructure/terraform/azure/main.tf`

```hcl
# azure/main.tf

resource "azurerm_virtual_network" "devpod" {
  name                = "devpod-threat-modeling-${var.environment}"
  location            = var.region
  resource_group_name = var.resource_group_name
  address_space       = ["10.200.0.0/16"]
}

resource "azurerm_subnet" "private" {
  name                 = "devpod-private"
  resource_group_name  = var.resource_group_name
  virtual_network_name = azurerm_virtual_network.devpod.name
  address_prefixes     = ["10.200.1.0/24"]
}

# NAT Gateway
resource "azurerm_public_ip" "nat" {
  name                = "devpod-nat-ip"
  location            = var.region
  resource_group_name = var.resource_group_name
  allocation_method   = "Static"
  sku                 = "Standard"
}

resource "azurerm_nat_gateway" "main" {
  name                = "devpod-nat"
  location            = var.region
  resource_group_name = var.resource_group_name
  sku_name            = "Standard"
}

# Service Bus for job queue
resource "azurerm_servicebus_namespace" "main" {
  name                = "devpod-${var.environment}"
  location            = var.region
  resource_group_name = var.resource_group_name
  sku                 = "Standard"
}

resource "azurerm_servicebus_queue" "provisioning" {
  name         = "devpod-provisioning"
  namespace_id = azurerm_servicebus_namespace.main.id

  lock_duration                       = "PT5M"
  max_delivery_count                  = 3
  dead_lettering_on_message_expiration = true
}

# Storage Account
resource "azurerm_storage_account" "outputs" {
  name                     = "chariottmloutputs${var.environment}"
  resource_group_name      = var.resource_group_name
  location                 = var.region
  account_tier             = "Standard"
  account_replication_type = "LRS"

  blob_properties {
    delete_retention_policy { days = 365 }
  }
}

resource "azurerm_storage_container" "outputs" {
  name                  = "threat-model-outputs"
  storage_account_name  = azurerm_storage_account.outputs.name
  container_access_type = "private"
}

# Key Vault
resource "azurerm_key_vault" "main" {
  name                = "devpod-${var.environment}"
  location            = var.region
  resource_group_name = var.resource_group_name
  tenant_id           = data.azurerm_client_config.current.tenant_id
  sku_name            = "standard"
}

# Managed Identity for Orchestrator
resource "azurerm_user_assigned_identity" "orchestrator" {
  name                = "devpod-orchestrator"
  location            = var.region
  resource_group_name = var.resource_group_name
}

output "servicebus_queue_name" {
  value = azurerm_servicebus_queue.provisioning.name
}

output "storage_container" {
  value = azurerm_storage_container.outputs.name
}
```

**See**: [04-SECURITY-HARDENING.md](04-SECURITY-HARDENING.md) for complete
security control implementations:

- P1-2: Network Firewall + TLS Inspection
- P1-3: Scoped IAM Permissions
- P1-5: IMDS Protection
- P1-14: VPC Endpoints

---

## Component 5: DevPod Image Specification

### Overview

Hardened Docker image with pre-configured Claude Code skills, security tools,
and runtime monitoring.

### Dockerfile

**File**: `modules/threat-model-infrastructure/devpod-image/Dockerfile`

```dockerfile
# P1-1: Hardened Dockerfile with pinned base image
FROM ubuntu:24.04@sha256:b359f1067efa76f37863778f7b6d0e8d911e3ee8efa807ad01fbf5dc1ef9006b

# Metadata
LABEL maintainer="security@praetorian.com"
LABEL description="Threat Modeling DevPod with Claude Code"
LABEL version="1.0.0"

# Non-interactive installation
ENV DEBIAN_FRONTEND=noninteractive

# Create devpod user (non-root)
RUN groupadd -g 1000 devpod && \
    useradd -u 1000 -g 1000 -m -s /bin/zsh devpod

# Install base dependencies (pinned versions)
RUN apt-get update && apt-get install -y \
    git=1:2.34.1-1ubuntu1.10 \
    curl=7.81.0-1ubuntu1.15 \
    zsh=5.8.1-1 \
    vim=2:8.2.3995-1ubuntu2.12 \
    build-essential=12.9ubuntu3 \
    python3=3.10.6-1~22.04 \
    python3-pip=22.0.2+dfsg-1ubuntu0.4 \
    nodejs=12.22.9~dfsg-1ubuntu3.4 \
    npm=8.5.1~ds-1 \
    && rm -rf /var/lib/apt/lists/*

# Install Claude CLI (pinned version)
RUN curl -fsSL https://claude.ai/install.sh | bash -s -- --version=2.1.0

# Create workspace directory
RUN mkdir -p /workspace/customer-code && \
    chown -R devpod:devpod /workspace

# Copy pre-configured Claude skills and agents
COPY --chown=devpod:devpod .claude/ /workspace/.claude/

# Install Falco for runtime security monitoring (P1-7)
RUN curl -fsSL https://falco.org/repo/falcosecurity-packages.asc | \
    gpg --dearmor -o /usr/share/keyrings/falco-archive-keyring.gpg && \
    echo "deb [signed-by=/usr/share/keyrings/falco-archive-keyring.gpg] https://download.falco.org/packages/deb stable main" | \
    tee /etc/apt/sources.list.d/falcosecurity.list && \
    apt-get update && \
    apt-get install -y falco=0.36.2 && \
    rm -rf /var/lib/apt/lists/*

# Copy Falco rules for threat modeling (P1-7)
COPY falco-rules.yaml /etc/falco/falco_rules.local.yaml

# Install asciinema for session recording (P1-9)
RUN pip3 install asciinema==2.4.0

# Copy entrypoint script
COPY --chown=root:root entrypoint.sh /entrypoint.sh
RUN chmod 755 /entrypoint.sh

# IMDS protection via iptables (P1-5)
RUN apt-get update && apt-get install -y iptables && \
    rm -rf /var/lib/apt/lists/*

# Switch to non-root user
USER devpod
WORKDIR /workspace

# Set up zsh with oh-my-zsh
RUN sh -c "$(curl -fsSL https://raw.githubusercontent.com/ohmyzsh/ohmyzsh/master/tools/install.sh)" "" --unattended

# Entrypoint
USER root
ENTRYPOINT ["/entrypoint.sh"]
CMD ["/bin/zsh"]
```

### Entrypoint Script

**File**: `modules/threat-model-infrastructure/devpod-image/entrypoint.sh`

```bash
#!/bin/bash
set -euo pipefail

# P1-5: Block IMDS via iptables (defense-in-depth)
iptables -A OUTPUT -d 169.254.169.254 -j REJECT
iptables -A OUTPUT -d fd00:ec2::254 -j REJECT

# Start Falco runtime monitoring (P1-7)
falco --daemon \
    --cri /run/containerd/containerd.sock \
    -r /etc/falco/falco_rules.yaml \
    -r /etc/falco/falco_rules.local.yaml \
    --pidfile /var/run/falco.pid

# Start session recording (P1-9)
RECORDING_FILE="/tmp/session-$(date +%s).cast"
asciinema rec "$RECORDING_FILE" --command "/bin/zsh" &
ASCIINEMA_PID=$!

# Trap exit to upload session recording
trap "upload_session_recording '$RECORDING_FILE'" EXIT

upload_session_recording() {
    local file=$1
    # Upload to S3 with integrity hash
    aws s3 cp "$file" "s3://${S3_SESSION_BUCKET}/sessions/$(basename $file)" \
        --metadata sha256sum="$(sha256sum $file | awk '{print $1}')"
}

# Create engagement context file
cat > /workspace/engagement-context.json <<EOF
{
  "engagement_id": "${ENGAGEMENT_ID}",
  "customer_name": "${CUSTOMER_NAME}",
  "repository_url": "${REPO_URL}",
  "branch": "${REPO_BRANCH}",
  "scm_type": "${SCM_TYPE}",
  "cloud_provider": "${CLOUD_PROVIDER}",
  "security_engineer": "${SECURITY_ENGINEER}",
  "workspace_id": "${HOSTNAME}"
}
EOF

chown devpod:devpod /workspace/engagement-context.json

# Drop to devpod user
exec su - devpod -c "$*"
```

### Pre-configured Claude Skills

**Directory**:
`modules/threat-model-infrastructure/devpod-image/.claude/skills/`

```
.claude/
├── skills/
│   ├── threat-modeling.md        # Primary threat modeling skill
│   ├── code-analysis.md          # Security code review patterns
│   ├── attack-surface.md         # Attack surface enumeration
│   └── security-testing.md       # Security test generation
├── agents/
│   ├── architecture-analyst.md   # System design security review
│   ├── vulnerability-scanner.md  # Automated vuln detection
│   └── compliance-auditor.md     # SOC2/HIPAA/GDPR checks
└── config.json
```

### Build and Publish Pipeline

**File**: `.github/workflows/build-devpod-image.yml`

```yaml
name: Build and Publish DevPod Image

on:
  push:
    branches: [main]
    paths:
      - "modules/threat-model-infrastructure/devpod-image/**"

jobs:
  build:
    runs-on: ubuntu-latest
    permissions:
      contents: read
      packages: write

    steps:
      - uses: actions/checkout@v4

      - name: Set up Docker Buildx
        uses: docker/setup-buildx-action@v3

      - name: Log in to GitHub Container Registry
        uses: docker/login-action@v3
        with:
          registry: ghcr.io
          username: ${{ github.actor }}
          password: ${{ secrets.GITHUB_TOKEN }}

      - name: Extract metadata
        id: meta
        uses: docker/metadata-action@v5
        with:
          images: ghcr.io/praetorian-inc/threat-modeling-devpod
          tags: |
            type=sha,prefix={{branch}}-
            type=ref,event=branch
            type=semver,pattern={{version}}

      - name: Build and push
        uses: docker/build-push-action@v5
        with:
          context: modules/threat-model-infrastructure/devpod-image
          push: true
          tags: ${{ steps.meta.outputs.tags }}
          labels: ${{ steps.meta.outputs.labels }}
          cache-from: type=gha
          cache-to: type=gha,mode=max

      # P1-1: Container scanning
      - name: Run Trivy vulnerability scanner
        uses: aquasecurity/trivy-action@master
        with:
          image-ref: ghcr.io/praetorian-inc/threat-modeling-devpod:latest
          format: "sarif"
          output: "trivy-results.sarif"

      - name: Upload Trivy results to GitHub Security
        uses: github/codeql-action/upload-sarif@v2
        with:
          sarif_file: "trivy-results.sarif"

      # Cosign signing (supply chain security)
      - name: Sign image with Cosign
        run: |
          cosign sign --key env://COSIGN_KEY \
            ghcr.io/praetorian-inc/threat-modeling-devpod@${{ steps.meta.outputs.digest }}
        env:
          COSIGN_KEY: ${{ secrets.COSIGN_PRIVATE_KEY }}
```

**See**: [04-SECURITY-HARDENING.md](04-SECURITY-HARDENING.md) for security
controls:

- P1-1: Hardened Dockerfile patterns
- P1-5: IMDS Protection implementation
- P1-7: Falco runtime monitoring rules
- P1-9: Session recording details

### Skills and Agents Included

The image includes the following pre-loaded from
`chariot-development-platform/.claude/`:

**Core Skills:**

- `threat-modeling-orchestrator` - Multi-phase threat analysis coordination
- `security-controls-mapping` - Security control identification
- `scoring-cvss-threats` - Vulnerability severity scoring
- `security-test-planning` - Test plan generation

**Agents:**

- `security-architect` - Security platform design
- `codebase-mapper` - Architecture analysis for threat modeling
- `security-controls-mapper` - Control identification
- `security-test-planner` - Test plan generation

**Library Skills:**

- `threat-modeling/*` - STRIDE framework, output schemas, DFD generation
- `security/*` - Security patterns, authentication, cryptography

### Anthropic API Key Injection

The API key is injected securely at runtime, never baked into the image:

```go
// In orchestrator - inject API key via environment variable
func (o *Orchestrator) provisionDevPod(ctx context.Context, ws *Workspace, req ProvisionMessage) (*DevPodResult, error) {
    // Fetch API key from secrets store
    apiKey, err := o.secretsStore.GetSecret(ctx, "chariot/anthropic-api-key")
    if err != nil {
        return nil, fmt.Errorf("failed to get Anthropic API key: %w", err)
    }

    args := []string{
        "up",
        "--provider", provider,
        // ... other args ...
        // API key injected as environment variable
        "--env", fmt.Sprintf("ANTHROPIC_API_KEY=%s", apiKey),
        // ... rest of args ...
    }
    // ...
}
```

### Workspace Directory Structure

When provisioned, the DevPod workspace looks like:

```
/home/devpod/
├── workspace/
│   ├── customer-code/           # Cloned repository (populated after clone)
│   │   └── ...
│   ├── threat-model-outputs/    # Generated artifacts
│   │   ├── threat-model-report.md
│   │   ├── threat-model-report.json
│   │   └── sarif/
│   ├── engagement-context.json  # Engagement metadata
│   └── CLAUDE.md                # Project instructions for Claude
│
├── .claude/
│   ├── settings.json            # Claude Code configuration
│   ├── skills/                  # Core skills
│   │   ├── threat-modeling-orchestrator/
│   │   ├── security-controls-mapping/
│   │   └── ...
│   ├── skill-library/           # Extended skill library
│   │   └── security/
│   │       ├── threat-modeling/
│   │       ├── scoring-cvss-threats/
│   │       └── ...
│   └── agents/                  # Specialized agents
│       ├── security-architect/
│       ├── codebase-mapper/
│       └── ...
│
└── .zshrc                       # Shell configuration
```

---

## Multi-Cloud Service Mapping

| Service Category      | AWS              | GCP                     | Azure            |
| --------------------- | ---------------- | ----------------------- | ---------------- |
| **Compute**           | EC2              | Compute Engine          | Virtual Machines |
| **Networking**        | VPC              | VPC Network             | Virtual Network  |
| **Message Queue**     | SQS              | Pub/Sub                 | Service Bus      |
| **NoSQL Database**    | DynamoDB         | Firestore               | CosmosDB         |
| **Secret Management** | Secrets Manager  | Secret Manager          | Key Vault        |
| **Blob Storage**      | S3               | Cloud Storage           | Blob Storage     |
| **Identity**          | IAM Roles        | Service Accounts        | Managed Identity |
| **Egress Filtering**  | Network Firewall | Cloud Firewall          | Azure Firewall   |
| **Private Endpoints** | VPC Endpoints    | Private Service Connect | Private Link     |
| **Monitoring**        | CloudWatch       | Cloud Logging           | Azure Monitor    |

---

## Summary: What You've Implemented

After completing all components in this document, you have:

### Backend Infrastructure

- Lambda API handler with multi-cloud support
- Async provisioning via message queues
- Real-time status updates via SSE

### Orchestrator

- Multi-cloud DevPod CLI integration
- Cloud-agnostic instance size mapping
- JIT credential fetching and injection
- Automated workspace lifecycle management

### Frontend

- Cloud provider selection UI
- Real-time provisioning progress
- Ephemeral SSH key generation (P1-6)
- Deep linking to IDE

### Infrastructure (IaC)

- Terraform modules for AWS/GCP/Azure
- Network isolation and egress filtering (P1-2)
- Scoped IAM permissions (P1-3)
- VPC endpoints (P1-14)

### DevPod Image

- Hardened Docker image (P1-1)
- Pre-configured Claude Code skills
- Runtime security monitoring (P1-7)
- Session recording (P1-9)
- IMDS protection (P1-5)

---

## Next Steps

After implementing all components, proceed to:

- **[04-SECURITY-HARDENING.md](04-SECURITY-HARDENING.md)** - Review and
  implement all remaining P0/P1 security fixes
- **[05-DEPLOYMENT-OPERATIONS.md](05-DEPLOYMENT-OPERATIONS.md)** - Execute
  deployment checklist and adversarial testing

---

**End of Document 3 of 6**

**Continue to**: [04-SECURITY-HARDENING.md](04-SECURITY-HARDENING.md) for
security hardening implementation

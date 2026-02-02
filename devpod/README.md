# DevPod Remote Development

> **Cloud-based development environments on AWS infrastructure you control**

## What is DevPod?

DevPod is an open-source tool that creates cloud-based development environments using the [devcontainer](https://containers.dev/) specification. Think of it as your own personal GitHub Codespaces running on AWS.

**Key Benefits:**
- 🚀 **Fast startup** - Prebuilt containers ready in seconds
- 🌍 **Multi-region** - 6 AWS regions with automatic latency-based selection
- 🔒 **Secure** - SSH tunneling, no ports exposed
- 💰 **Cost-effective** - Stop instances when not in use
- 🛠️ **Consistent** - Same environment for entire team

---

## Available Environments

| Environment | Purpose | Directory |
|-------------|---------|-----------|
| **Chariot** | Full Chariot platform development (Go, React, AWS) | [`chariot/`](./chariot/) |
| **OpenClaw** | Personal AI assistant with local models | [`openclaw/`](./openclaw/) |

---

## Prerequisites

- **macOS** (arm64 or amd64)
- **AWS credentials** configured (`~/.aws/credentials`)
- **DevPod CLI** installed

### Install DevPod

```bash
# Option 1: Homebrew
brew install devpod

# Option 2: From super-repo root
make devpod-install
```

---

## AWS Provider Setup

DevPod needs AWS providers configured to create EC2 instances.

```bash
# From super-repo root - configures all 6 regions
make devpod-setup-provider
```

This configures:

| Region | Location |
|--------|----------|
| us-east-1 | Virginia |
| us-east-2 | Ohio |
| us-west-1 | California |
| us-west-2 | Oregon |
| eu-south-2 | Spain |
| ap-southeast-1 | Singapore |

**Switch regions anytime:**
```bash
make devpod-select-region
```

---

## Common Commands

```bash
# List all workspaces
devpod list

# SSH into a workspace
devpod ssh <workspace-name>

# Stop a workspace (saves costs, preserves state)
devpod stop <workspace-name>

# Start a stopped workspace
devpod up <workspace-name>

# Delete a workspace
devpod delete <workspace-name>

# View logs
devpod logs <workspace-name>
```

---

## Environment-Specific Instructions

### Chariot Development

For full Chariot platform development with Go, React, Chrome, and AWS tools:

```bash
cd devpod/chariot
# See chariot/README.md for details
```

### OpenClaw Personal Assistant

For running OpenClaw with local AI models (DeepSeek, Qwen, Llama):

```bash
cd devpod/openclaw
make help          # See all options
make up-gpu        # Create GPU instance for local models
make up            # Create CPU instance for cloud APIs
```

See [`openclaw/README.md`](./openclaw/README.md) for full documentation.

---

## Cost Management

**Workspaces cost money while running.** Always stop when not in use:

```bash
devpod stop <workspace-name>
```

| Instance Type | Cost/hr | Cost/day (24/7) | Use Case |
|---------------|---------|-----------------|----------|
| t3.large | ~$0.08 | ~$2 | Cloud APIs only |
| c7i.4xlarge | ~$0.85 | ~$20 | Chariot development |
| g4dn.xlarge | ~$0.53 | ~$13 | Local AI models |

**Stopped instances:** ~$0.10/day (EBS storage only)

---

## Additional Resources

- [DevPod Official Docs](https://devpod.sh/docs)
- [Devcontainer Specification](https://containers.dev/)
- [AWS Provider Docs](https://github.com/loft-sh/devpod-provider-aws)

# OpenClaw DevPod Environment

Run OpenClaw on AWS using DevPod for easy management.

## Directory Structure

```
openclaw/
├── Makefile              # LOCAL ONLY - devpod management commands
├── README.md             # LOCAL ONLY - this file
└── workspace/            # SYNCED TO INSTANCE
    ├── .devcontainer/
    │   ├── devcontainer.json
    │   └── Dockerfile    # Includes Ollama pre-installed
    ├── install-openclaw.sh
    └── setup-local-models.sh  # Pull DeepSeek, Qwen, Llama, etc.
```

## Prerequisites

- DevPod CLI installed (`brew install devpod`)
- AWS provider configured (from chariot-development-platform setup)
- API key (Anthropic, OpenRouter, or AWS Bedrock)

## GPU Support

GPU instances require the **AWS Deep Learning AMI** which includes:
- NVIDIA drivers pre-installed
- NVIDIA Container Toolkit (enables Docker GPU passthrough)
- CUDA libraries

The Makefile automatically uses the correct AMI (`ami-0e352d4aa794f5377`) for GPU targets.

**Why not vanilla Ubuntu?** Standard Ubuntu AMIs don't include NVIDIA Container Toolkit. Without it, Docker containers can't access the GPU even though the EC2 host has one. The Deep Learning AMI solves this at no extra cost.

The devcontainer is configured with:
- `--gpus all` for GPU passthrough to containers
- Port 18789 forwarded for OpenClaw Dashboard

## Quick Start

```bash
cd devpod/openclaw

# Create workspace (pick one):
make devpod-up-cpu-t3-large         # CPU only ($0.08/hr) - for cloud APIs
make devpod-up-gpu-g4dn-xlarge      # NVIDIA T4 GPU ($0.53/hr) - for local models

# SSH in
devpod ssh $USER-openclaw

# Inside the instance, run setup:
./setup.sh
```

## Instance Options

| Target | Instance | AMI | Use Case | Cost/hr |
|--------|----------|-----|----------|---------|
| `make devpod-up-cpu-t3-large` | t3.large | Ubuntu 24.04 | Cloud APIs (Anthropic, Bedrock) | ~$0.08 |
| `make devpod-up-gpu-g4dn-xlarge` | g4dn.xlarge | Deep Learning AMI | Local models with GPU | ~$0.53 |
| `make devpod-up-inferentia-inf2-xlarge` | inf2.xlarge | Ubuntu 24.04 | AWS Inferentia (Neuron SDK) | ~$0.76 |

## Management Commands

```bash
# Create workspaces
make devpod-up-cpu-t3-large              # CPU workspace
make devpod-up-gpu-g4dn-xlarge           # GPU workspace (Deep Learning AMI)
make devpod-up-inferentia-inf2-xlarge    # Inferentia workspace

# Recreate (delete + create)
make devpod-recreate-gpu-g4dn-xlarge     # Rebuild GPU workspace

# Native devpod commands
devpod ssh $USER-openclaw                # SSH into workspace
devpod stop $USER-openclaw               # Stop (saves $$$, preserves state)
devpod up $USER-openclaw                 # Start existing workspace
devpod delete $USER-openclaw             # Delete completely
devpod list                              # List all workspaces
make help                                # Show all commands
```

## Multi-User Support

Workspaces auto-name to `$USER-openclaw`:
- nathan → nathan-openclaw
- alice → alice-openclaw

## Pre-installed Local Models

The container includes **Ollama** pre-installed. Run `setup-local-models.sh` to pull models:

| Model | Size | VRAM Needed | Best For |
|-------|------|-------------|----------|
| deepseek-r1:8b | ~5GB | 8GB | Reasoning, math, logic |
| deepseek-r1:14b | ~9GB | 12GB | Better reasoning |
| qwen2.5:7b | ~4GB | 6GB | General purpose |
| qwen2.5:14b | ~9GB | 12GB | Better general |
| qwen2.5-coder:7b | ~4GB | 6GB | Code generation |
| llama3.2:8b | ~5GB | 8GB | General purpose |
| mistral:7b | ~4GB | 6GB | Fast inference |
| codellama:13b | ~7GB | 10GB | Code specialist |

**Note:** Kimi 2.5 is cloud-only (Moonshot AI). Access via OpenRouter.

### GPU Instance Setup

```bash
# Create GPU workspace (uses Deep Learning AMI with NVIDIA Container Toolkit)
make devpod-up-gpu-g4dn-xlarge

# SSH in
devpod ssh $USER-openclaw

# Run setup (installs OpenClaw, optionally pulls local models)
./setup.sh

# Access OpenClaw Dashboard
# Port 18789 is auto-forwarded to localhost:18789
```

**Dashboard Access:**
The devcontainer forwards port 18789 automatically. After setup, access the OpenClaw Dashboard at `http://localhost:18789/`

## OpenClaw Model Routing

OpenClaw supports multiple models with task-based routing:

```yaml
# Example config (~/.openclaw/config.yaml)
models:
  primary: anthropic/claude-3.5-sonnet
  fallbacks:
    - openrouter/llama-3.1-70b
    - local/mistral-7b

agents:
  coding:
    model: anthropic/claude-3.5-sonnet  # Best for code
  chat:
    model: local/llama-3.2-8b           # Cheaper for casual chat
  research:
    model: openrouter/perplexity        # Best for web search
```

Features:
- **Model fallbacks** - Auto-failover if primary unavailable
- **Per-agent models** - Different models for different tasks
- **OpenRouter integration** - Access 100+ models with one API key
- **Local model support** - Run Llama, Mistral, etc. on GPU instances

## Cost Optimization

| Usage Pattern | Recommended Setup | Est. Cost |
|---------------|-------------------|-----------|
| Light (<100k tokens/day) | t3.large + Anthropic API | ~$3/day |
| Medium (1M tokens/day) | t3.large + Bedrock Llama 8B | ~$4/day |
| Heavy (5M+ tokens/day) | g4dn.xlarge spot + local model | ~$4/day |
| 24/7 Production | g4dn.xlarge reserved | ~$8/day |

## Sources

- [OpenClaw Models Documentation](https://docs.openclaw.ai/concepts/models)
- [OpenRouter Integration](https://openrouter.ai/docs/guides/guides/openclaw-integration)
- [OpenClaw Complete Guide 2026](https://www.nxcode.io/resources/news/openclaw-complete-guide-2026)

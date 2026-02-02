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

## Quick Start

```bash
cd devpod/openclaw

# Create workspace (pick one):
make up                 # CPU only ($0.08/hr) - for cloud APIs
make up-gpu-spot        # GPU spot ($0.16/hr) - for local models, 70% cheaper
make up-gpu-ondemand    # GPU on-demand ($0.53/hr) - for local models, stable

# SSH in
make ssh

# Inside the instance, run:
./install-openclaw.sh
```

## Instance Options

| Target | Instance | Use Case | Cost/hr |
|--------|----------|----------|---------|
| `make up` | t3.large | Cloud APIs (Anthropic, Bedrock) | ~$0.08 |
| `make up-gpu-spot` | g4dn.xlarge | Local models (can be interrupted) | ~$0.16 |
| `make up-gpu-ondemand` | g4dn.xlarge | Local models (stable) | ~$0.53 |

## Management Commands

```bash
make up                # Create CPU workspace
make up-gpu-spot       # Create GPU spot workspace
make up-gpu-ondemand   # Create GPU on-demand workspace
make ssh               # SSH into workspace
make stop              # Stop (saves $$$, preserves state)
make start             # Start existing workspace
make delete            # Delete completely
make list              # List all workspaces
make logs              # View logs
make status            # Show workspace status
make help              # Show all commands
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
# Create GPU workspace
make up-gpu-spot    # or make up-gpu-ondemand

# SSH in
make ssh

# Pull models (interactive menu)
./setup-local-models.sh

# Install openclaw
./install-openclaw.sh
```

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

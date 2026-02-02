# Chariot DevPod Environment

> **Full Chariot platform development environment with Go, React, Chrome, and AWS tools**

## Overview

This DevPod configuration creates a c7i.4xlarge instance (16 vCPU, 32GB RAM) pre-configured for Chariot development.

## Container Image

**Image:** `ghcr.io/praetorian-inc/chariot-devpod:latest`

### Included Tools

| Tool | Version | Purpose |
|------|---------|---------|
| Go | 1.25.3 | Backend development |
| Node.js | 24.x LTS | Frontend development |
| Python | 3.10+ | Scripts and tooling |
| Google Chrome | Latest | E2E testing, DevTools |
| Claude Code | Latest | AI-assisted development |
| GitHub CLI | Latest | GitHub operations |

## Quick Start

From the **super-repo root** (not this directory):

```bash
# 1. Install DevPod (if not already)
make devpod-install

# 2. Configure AWS providers
make devpod-setup-provider

# 3. Create your workspace
make devpod-create WORKSPACE=my-feature IDE=cursor
```

## Workspace Management

```bash
# Create workspace
make devpod-create WORKSPACE=feature-auth IDE=cursor

# Start/stop
make devpod-start WORKSPACE=feature-auth
make devpod-stop WORKSPACE=feature-auth

# SSH access
make devpod-ssh WORKSPACE=feature-auth

# List all workspaces
make devpod-list

# Delete workspace
make devpod-delete WORKSPACE=feature-auth
```

## Initial Setup (Inside Workspace)

After creating a workspace, run the setup:

```bash
make devpod-setup-remote
```

This initializes:
- Git submodules
- Go, npm, Python dependencies
- AWS CLI configuration
- GitHub authentication
- Claude Code setup

## Deploy Chariot Stack

```bash
make chariot
```

Access the UI at `https://localhost:3000` (auto-forwarded).

## Port Forwarding

| Port | Service | Auto-Forward |
|------|---------|--------------|
| 3000 | Chariot UI | ✅ Yes |
| 8080 | Backend API | ✅ Yes |
| 9222 | Chrome DevTools | ✅ Yes |

## Building the Container Image

This directory contains the Dockerfile for building the Chariot devpod image.

```bash
# Build image
make images

# Build and publish to ghcr.io
make publish
```

## Instance Specifications

| Resource | Value |
|----------|-------|
| Instance Type | c7i.4xlarge |
| vCPUs | 16 (Intel) |
| RAM | 32 GB |
| Disk | 100 GB |
| Cost | ~$0.85/hr |

**Auto-stop:** 1 hour inactivity timeout

## More Information

See the [main DevPod README](../README.md) for:
- AWS provider setup
- Region configuration
- Common commands
- Cost management

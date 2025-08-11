# Chariot Development Platform

## Overview

This super-repository unifies all Chariot repositories and provides shared workflows for building security tools with AI assistance.

## Repository Structure

### Core Platform
- **[chariot/](modules/chariot/)** - Main Chariot application (backend API + React UI)
- **[chariot-ui-components/](modules/chariot-ui-components/)** - Shared React component library with Storybook
- **[tabularium/](modules/tabularium/)** - Universal data schema and models for Chariot systems

### Security Frameworks
- **[janus-framework/](modules/janus-framework/)** - Go framework for chaining security tools into workflows
- **[janus/](modules/janus/)** - Tool orchestration system built on janus-framework
- **[nebula/](modules/nebula/)** - Multi-cloud security scanning toolkit (AWS/Azure/GCP)

### Templates & Tools
- **[nuclei-templates/](modules/nuclei-templates/)** - Custom security scanning templates (synced from ProjectDiscovery)
- **[praetorian-cli/](modules/praetorian-cli/)** - Python CLI and SDK for Chariot API access
- **[praetorian-agent-workflows/](modules/praetorian-agent-workflows/)** - AI agent workflow orchestration

## Quick Start

```bash
# Initialize all submodules
make update

# Create branch across all submodules
make create branch=<branch-name>

# develop your feature with claude
claude

# Create PRs across all submodules
make create-prs
```
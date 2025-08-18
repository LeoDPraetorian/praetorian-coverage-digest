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

### Development Workflow

```bash
# set up the repository
make setup

# Create branch across all submodules
make create branch=<branch-name>

# develop your feature with claude-flow 
make feature description="update the portscan capability to support ipv6"

# Create PRs across all submodules
make create-prs
```

### Setting Up A Chariot Stack

```bash
# set up the repository
make setup

# Deploy complete Chariot stack (CloudFormation + React UI)
make chariot

# Generate test user with UUID credentials
make user

# Credentials are automatically stored in .env:
# PRAETORIAN_CLI_USERNAME={uuid}@praetorian.com
# PRAETORIAN_CLI_PASSWORD={uuid-no-dashes}Aa1!
```

The UI will be available at https://localhost:3000 with the generated credentials.

### Common Operations

```bash
# pull all submodule branches
make submodule-pull
```
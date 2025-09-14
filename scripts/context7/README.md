# Context7 MCP Integration Scripts

This directory contains automation scripts for managing Context7 MCP (Model Context Protocol) integration across the Chariot Development Platform.

## 🚀 Quick Start

```bash
# Initial setup for new team members
./setup-context7.sh

# Quick validation
./validate-context7.sh

# Run comprehensive tests
./test-context7-integration.sh
```

## 📁 Available Scripts

### setup-context7.sh
**Purpose**: Automated Context7 setup for team members

```bash
# Interactive setup (recommended)
./setup-context7.sh

# Non-interactive with API key
./setup-context7.sh --api-key YOUR_KEY --no-interactive
```

**Features**:
- Verifies Node.js requirements
- Configures MCP settings globally and per-module
- Sets up environment variables
- Tests connectivity
- Updates IDE configurations

### test-context7-integration.sh
**Purpose**: Comprehensive integration testing

```bash
# Basic test run
./test-context7-integration.sh

# Verbose output
./test-context7-integration.sh --verbose

# Test with specific API key
./test-context7-integration.sh --api-key YOUR_KEY
```

**Tests**:
- Node.js version compatibility
- NPX availability
- Context7 server accessibility
- MCP configuration validity
- Environment variables
- HTTP endpoint connectivity
- Performance benchmarks
- IDE compatibility

### monitor-context7.sh
**Purpose**: Real-time monitoring and metrics

```bash
# Continuous monitoring (default 10s interval)
./monitor-context7.sh

# Custom interval (5 seconds)
./monitor-context7.sh --interval 5

# Monitor for specific duration (30 minutes)
./monitor-context7.sh --duration 30

# Custom log file
./monitor-context7.sh --log-file custom.log
```

**Metrics**:
- Response time tracking
- Success/failure rates
- Rate limit status
- HTTP endpoint health
- Performance recommendations

### validate-context7.sh
**Purpose**: Quick validation for team members

```bash
./validate-context7.sh
```

**Checks**:
- Node.js installation
- NPX availability
- Context7 accessibility
- Configuration presence
- API key setup

### apply-context7-template.sh
**Purpose**: Apply pre-configured templates for different scenarios

```bash
# Show available templates
./apply-context7-template.sh

# Apply frontend development template
./apply-context7-template.sh frontend

# Apply backend development template
./apply-context7-template.sh backend

# Apply DevOps template
./apply-context7-template.sh devops

# Apply full-stack template
./apply-context7-template.sh full-stack
```

**Templates**:
- **frontend**: React/TypeScript UI development
- **backend**: Go/Python API development
- **devops**: Infrastructure and CI/CD
- **full-stack**: Complete development environment

## 📂 Configuration Templates

The `context7-templates/` directory contains pre-configured JSON templates:

- `frontend-dev.json`: Optimized for React/TypeScript/Tailwind
- `backend-dev.json`: Optimized for Go/Python/AWS
- `devops.json`: Optimized for Terraform/Kubernetes/Docker
- `full-stack.json`: Comprehensive configuration for all scenarios

## 📊 Logs and Metrics

Scripts generate logs and metrics in the `logs/` directory:

- `logs/context7-monitor.log`: Monitoring session logs
- `logs/context7-metrics.json`: Performance metrics in JSON format

## 🎯 Usage Examples

### New Team Member Onboarding

```bash
# 1. Initial setup
./setup-context7.sh

# 2. Apply appropriate template
./apply-context7-template.sh full-stack

# 3. Validate setup
./validate-context7.sh

# 4. Run comprehensive tests
./test-context7-integration.sh --verbose
```

### Daily Development Workflow

```bash
# Quick validation at start of day
./validate-context7.sh

# Monitor performance during development
./monitor-context7.sh --interval 30
```

### Troubleshooting

```bash
# Run comprehensive tests
./test-context7-integration.sh --verbose

# Check real-time metrics
./monitor-context7.sh --interval 2

# Re-run setup if needed
./setup-context7.sh --api-key YOUR_KEY
```

## 🔐 Environment Variables

Context7 scripts use the following environment variables:

- `CONTEXT7_API_KEY`: API key for enhanced rate limits (optional)
- `CONTEXT7_ENDPOINT`: Custom endpoint URL (optional)

## 📝 Documentation

For detailed documentation, see:
- [Context7 Setup Guide](../docs/context7-setup-guide.md)
- [Context7 Integration Plan](../context7.md)

## 🤝 Support

- **Internal**: Check team documentation and run test scripts
- **External**: context7@upstash.com or [GitHub Issues](https://github.com/upstash/context7)

---

*These scripts are part of the Context7 MCP integration for the Chariot Development Platform.*
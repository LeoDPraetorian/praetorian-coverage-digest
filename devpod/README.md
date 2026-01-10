# DevPod Remote Development

> **Modern cloud-based development environments for the Chariot platform**
> Automatic setup • Multi-region support • Prebuilt containers • No VNC complexity

## What is DevPod?

DevPod is an open-source tool that creates cloud-based development environments using the industry-standard [devcontainer](https://containers.dev/) specification. Think of it as your own personal GitHub Codespaces that runs on AWS infrastructure you control.

**Key Benefits:**
- 🚀 **Fast startup** - Prebuilt containers ready in seconds
- 🌍 **Multi-region** - 6 AWS regions with automatic latency-based selection
- 🔒 **Secure** - SSH tunneling, no VNC ports exposed
- 💰 **Cost-effective** - Auto-stop after 1 hour of inactivity
- 🛠️ **Consistent** - Same environment for entire team

---

## Quick Start

Get up and running in 3 commands (<3 minutes):

```bash
# 1. Install DevPod
make devpod-install

# 2. Configure AWS providers (all 6 regions)
make devpod-setup-provider

# 3. Create your workspace
make devpod-create WORKSPACE=my-name
```

**Access Chariot UI:**
Open your local browser to `https://localhost:3000` (auto-forwarded by DevPod)

---

## Installation

### Prerequisites

- **macOS** (arm64 or amd64)
- **AWS credentials** configured (`~/.aws/credentials`)
- **Git** and **GitHub** access
- **Docker Desktop** (optional, for local testing)

### Install DevPod

**Option 1: Automated (Recommended)**
```bash
make devpod-install
```
Installs DevPod CLI and opens Desktop App download page.

**Option 2: Homebrew (CLI-only)**
```bash
brew install devpod
```
Perfect for automation and scripting workflows.

**Option 3: Manual Download**
- CLI: https://github.com/loft-sh/devpod/releases
- Desktop: https://devpod.sh/

---

## Configuration

### AWS Provider Setup

DevPod needs to know where to create your cloud development environments.

**Automated Setup (Recommended):**
```bash
make devpod-setup-provider
```

This configures all 6 AWS regions, tests latency, and selects the fastest:

| Region | Location | Use Case |
|--------|----------|----------|
| us-east-1 | Virginia | US East Coast developers |
| us-east-2 | Ohio | US Central developers |
| us-west-1 | California | US West Coast developers |
| us-west-2 | Oregon | US Pacific Northwest developers |
| eu-south-2 | Spain | European developers |
| ap-southeast-1 | Singapore | Asia Pacific developers |

**Switch Regions Anytime:**
```bash
make devpod-select-region
```
Re-tests latency and lets you choose the best region.

---

## Workspace Management

### Create a Workspace

```bash
make devpod-create WORKSPACE=feature-auth IDE=cursor
```

**Parameters:**
- `WORKSPACE` (required) - Give your workspace a meaningful name
- `IDE` (optional) - Default: `cursor`, also supports `goland`

**What Happens:**
1. DevPod creates c7i.4xlarge EC2 instance in your default region
2. Downloads prebuild container (seconds, not minutes)
3. Runs initial setup and cycle-devpod persistence workaround
4. Opens your IDE connected via SSH tunnel
5. Forwards ports 3000 (UI), 8080, 9222 (Chrome DevTools) automatically

### Start/Stop Workspaces

```bash
# Start existing workspace
make devpod-start WORKSPACE=feature-auth

# Stop workspace (preserves state, stops EC2 billing)
make devpod-stop WORKSPACE=feature-auth

# List all your workspaces
make devpod-list

# SSH into workspace
make devpod-ssh WORKSPACE=feature-auth

# Delete workspace (asks for confirmation)
make devpod-delete WORKSPACE=feature-auth
```

**💡 Tip:** Workspaces auto-stop after 1 hour of inactivity to save costs.

---

## Development Workflow

### Initial Workspace Setup

After creating your workspace, set up the development environment:

```bash
# Inside the DevPod workspace terminal
make devpod-setup-remote
```

This runs complete initialization:
- ✅ Initializes all git submodules
- ✅ Installs Go, npm, Python dependencies
- ✅ Configures AWS CLI
- ✅ Authenticates with GitHub
- ✅ Sets up Claude Code

**You'll be prompted for:**
- AWS region (use `us-east-2`)
- GitHub SSH key setup (no passphrase recommended)
- UI certificate acceptance (answer "Y")

### Deploy Chariot Stack

```bash
# Deploy backend API + start frontend UI
make chariot
```

This deploys the full Chariot platform to AWS and starts the React UI locally.

### Access the Application

**Three ways to access Chariot:**

**1. Local Browser (Recommended - Simplest)**
```
https://localhost:3000
```
Port 3000 forwards automatically. Use your normal browser with all your extensions.

**2. Headless Chrome (For Automated Testing)**
```bash
make devpod-chrome MODE=headless
```
Perfect for Playwright/Puppeteer tests. Chrome DevTools Protocol available on port 9222.

**3. Chrome with GUI (For Manual Debugging)**
```bash
# One-time setup on your Mac:
brew install --cask xquartz
# In XQuartz → Preferences → Security → Enable "Allow connections from network clients"

# Then in DevPod workspace:
make devpod-chrome MODE=x11
```
Chrome GUI appears on your local Mac screen via X11 forwarding.

### Authentication

**Option A: Auto-Generated Login URL**
```bash
# Generate test user with login URL
make user

# Copy CHARIOT_LOGIN_URL from .env
cat .env | grep CHARIOT_LOGIN_URL

# Paste URL in your local browser
```

**Option B: Keychain File**
```bash
# Copy your keychain to the workspace
scp ~/prod-myname.ini my-workspace.devpod:/home/vscode/

# Use with praetorian CLI
praetorian --keychain ~/prod-myname.ini account list
```

---

## Advanced Features

### Workspace from Specific Branch

```bash
make devpod-create WORKSPACE=test-feature IDE=cursor

# Manually specify branch:
devpod up --provider aws-provider \
  github.com/praetorian-inc/chariot-development-platform@feature-branch \
  --id workspace-name
```

### Region Switching

```bash
# Interactive region selection with latency testing
make devpod-select-region

# Or use the CLI directly:
./scripts/devpod/select-region.sh --fastest     # Auto-switch to fastest
./scripts/devpod/select-region.sh --current     # Show current region
./scripts/devpod/select-region.sh us-west-2     # Switch to specific region
```

### Prebuilds

Prebuilds dramatically speed up workspace creation:

**Automatic:** GitHub Actions builds new prebuild whenever `.devcontainer/` changes
**Manual:** `devpod build . --repository ghcr.io/praetorian-inc/chariot-devpod-prebuild --push`

The prebuild is automatically used when creating new workspaces.

### Chrome Modes

```bash
# Auto-detect best mode (checks for DISPLAY variable)
make devpod-chrome

# Force specific mode
make devpod-chrome MODE=headless
make devpod-chrome MODE=x11

# Specify URL
make devpod-chrome URL=https://chariot.praetorian.com MODE=headless
```

---

## IDE Integration

### Cursor

When you create a workspace with `IDE=cursor`, DevPod automatically:
1. Opens new Cursor window connected via SSH
2. Displays workspace name in window title
3. Shows repository file tree
4. Forwards ports automatically

**Install Extensions:**
- Go to Extensions view
- Click "Install in SSH: workspace-name" for each extension

### GoLand

When you create a workspace with `IDE=goland`, DevPod:
1. Opens "Connect to SSH" dialog
2. Pre-fills connection details
3. Click "Check Connection and Continue"
4. Initializes GoLand project

**Install Plugins:**
- Settings → Plugins → Host (install on remote)

### Claude Code (AI-Assisted Development)

Claude Code is pre-installed in all DevPod workspaces for AI-powered coding assistance.

**Connect via SSH and use Claude Code:**
```bash
# SSH into your DevPod workspace
devpod ssh feature-auth

# Navigate to workspace
cd /workspace

# Start Claude Code interactive session
claude

# Or run specific commands
claude "help me implement user authentication"
claude "review this code for security issues"
claude "write tests for the asset API"
```

**Configure Claude Code on First Use:**
```bash
# Set your Anthropic API key (inside DevPod)
export ANTHROPIC_API_KEY="your-api-key-here"

# Or add to your shell profile
echo 'export ANTHROPIC_API_KEY="your-key"' >> ~/.bashrc
```

**Claude Code is automatically available** - no installation needed! The Dockerfile includes Claude Code CLI in every workspace prebuild.

---

## Troubleshooting

### Workspace Won't Start

```bash
# Check workspace status
devpod list

# View logs
devpod logs my-workspace

# Try recreating
devpod up my-workspace --recreate
```

### AWS Credentials Issues

```bash
# Verify credentials work
aws sts get-caller-identity

# Reconfigure if needed
aws configure
```

### Port Not Forwarding

Ports 3000, 8080, and 9222 forward automatically. If you need additional ports:

**Cursor:**
1. Press `CMD+SHIFT+P`
2. Type "ports view"
3. Click "Forward a Port"
4. Enter port number

**GoLand:**
1. Open "Backend Control Center" (click workspace name)
2. Click "Ports" tab
3. Add port forwarding

### Chrome DevTools Not Working

```bash
# Restart Chrome to reclaim port 9222
ps aux | grep chrome | awk '{print $2}' | xargs kill

# Relaunch
make devpod-chrome
```

If chrome-devtools MCP server stops responding, restart Claude Code.

### Cycle-DevPod Workaround

The first time a workspace is created, run the cycle-devpod workaround:

```bash
# On your laptop (not in workspace)
./scripts/cycle-devpod.sh my-workspace
```

This addresses a DevPod state preservation issue. Subsequent restarts work normally.

**Note:** `make devpod-create` runs this automatically.

### Performance Issues

**Go Language Server (gopls) using too much CPU/RAM:**

Limit gopls indexing in Cursor settings (`~/Library/Application Support/Cursor/User/settings.json`):
```json
{
  "gopls": {
    "directoryFilters": [
      "-/",
      "+modules/chariot",
      "+modules/tabularium",
      "+modules/janus-framework"
    ]
  }
}
```

---

## Reference

### Quick Commands

```bash
# Setup
make devpod-install
make devpod-setup-provider
make devpod-create WORKSPACE=name

# Daily workflow
make devpod-start WORKSPACE=name
make devpod-ssh WORKSPACE=name
make devpod-stop WORKSPACE=name

# Inside workspace
make devpod-setup-remote    # First time only
make chariot                # Deploy stack
make devpod-chrome          # Launch Chrome

# Utilities
make devpod-list            # Show all workspaces
make devpod-select-region   # Switch regions
make devpod-help            # Comprehensive reference
```

### Automatic Features

DevPod automatically handles:
- ✅ **Port forwarding** (3000, 8080, 9222)
- ✅ **Git credentials** (SSH and HTTPS)
- ✅ **Docker credentials** (for pulling images)
- ✅ **AWS credentials** (via ~/.aws/credentials)
- ✅ **SSH configuration** (workspace-name.devpod hostname)

### Resource Specifications

**Instance Type:** c7i.4xlarge
- 16 vCPUs (Intel)
- 32 GB RAM
- 100 GB disk
- Network-optimized

**Why Intel (not ARM):**
- Google Chrome x86_64 Linux packages only
- Better compatibility with browser testing tools

### Cost Management

**Auto-Stop:** 1 hour inactivity timeout (configurable)
**Manual Stop:** `make devpod-stop WORKSPACE=name`
**Billing:** Only charged when workspace is running
**Instance Cost:** ~$0.85/hour (c7i.4xlarge on-demand)

---

## Technical Details

### Container Image

**Base Image:** `ghcr.io/praetorian-inc/chariot-devpod:latest`
- Ubuntu 24.04 (Noble)
- Go 1.25.3
- Node.js 24.x LTS
- Python 3.10+
- Google Chrome (x86_64)
- Claude Code, Praetorian CLI

**Prebuild:** `ghcr.io/praetorian-inc/chariot-devpod-prebuild`
- Auto-builds on `.devcontainer/` changes
- Includes all dependencies pre-installed
- Dramatically speeds up workspace creation

### Port Forwarding

| Port | Service | Auto-Forward |
|------|---------|--------------|
| 3000 | Chariot UI | ✅ Yes |
| 8080 | Backend API | ✅ Yes |
| 9222 | Chrome DevTools | ✅ Yes |

### Chrome Integration

**Headless Mode:**
- No GUI rendering
- DevTools Protocol on port 9222
- Perfect for Playwright, Puppeteer, Selenium
- Lower resource usage

**X11 Mode:**
- GUI forwarded to your Mac via X11
- Requires XQuartz installed locally
- Native clipboard integration
- Visual debugging capabilities

**Automatic Detection:**
- Script checks for `DISPLAY` environment variable
- Falls back to headless if no X11 available
- Override with `--headless` or `--x11` flags

### Network Architecture

```
Your Mac
   ↕ SSH Tunnel (DevPod agent)
AWS EC2 (c7i.4xlarge)
   ↕ Docker
Development Container
   ├── Chariot Backend (port 8080)
   ├── Chariot UI (port 3000)
   └── Chrome (port 9222)
```

All communication secured via SSH. No public ports exposed.

---

## Scripts Reference

Located in `scripts/devpod/`:

**setup-devpod.sh**
- Installs DevPod CLI (if needed)
- Configures all 6 AWS providers
- Tests latency to each region
- Sets fastest as default
- Idempotent (safe to re-run)

**select-region.sh**
- Test latency to all regions
- Interactive or automatic region switching
- Show current provider status
- Usage: `./select-region.sh --fastest`

**copy-ami-singapore.sh**
- Copies custom Ubuntu AMI to Singapore
- Ensures consistency across regions
- Waits for AMI availability
- Auto-updates configuration

**find-region-resources.sh**
- Helper tool for adding new regions
- Finds AMI and VPC IDs
- Searches for custom or canonical AMIs
- Usage: `./find-region-resources.sh eu-west-1`

---

## Best Practices

### Workspace Naming

Use descriptive names that identify the work:
- ✅ `feature-auth-refactor`
- ✅ `bugfix-asset-list`
- ✅ `spike-neo4j-schema`
- ❌ `workspace1`, `test`, `temp`

### Resource Management

**Stop workspaces when not in use:**
```bash
make devpod-stop WORKSPACE=old-feature
```

**Delete completed work:**
```bash
make devpod-delete WORKSPACE=merged-feature
```

**Check running workspaces:**
```bash
make devpod-list
```

### Development Tips

**Use local browser for UI testing:**
- Faster than container Chrome
- Your familiar dev tools
- Better extension support

**Use headless Chrome for E2E tests:**
- Faster test execution
- Lower resource usage
- Better for CI/CD

**Use X11 Chrome only when needed:**
- Visual debugging specific issues
- Manual testing workflows
- Screenshot/video capture

### Team Collaboration

**Shared Configuration:**
All team members use same:
- AMIs (region-specific)
- VPCs (pre-configured)
- Instance type (c7i.4xlarge)
- Timeout (1 hour)

**Region Selection:**
Each developer chooses optimal region based on their location.

**Workspace Isolation:**
Workspaces are fully isolated - one per developer per feature.

---

## FAQ

### Do I need the Desktop App?

**No.** The CLI is sufficient for all operations. The Desktop App provides a GUI for visual preference but isn't required.

### Can I use multiple workspaces?

**Yes!** Create as many as you need:
```bash
make devpod-create WORKSPACE=feature-a
make devpod-create WORKSPACE=feature-b
make devpod-create WORKSPACE=spike-c
```

Each workspace is independent with its own EC2 instance.

### How do I save costs?

**Auto-stop:** Workspaces automatically stop after 1 hour of inactivity.
**Manual stop:** `make devpod-stop WORKSPACE=name` when done for the day.
**Delete unused:** `make devpod-delete WORKSPACE=name` when work is merged.

### What if my region is slow?

```bash
# Test and switch to fastest region
make devpod-select-region

# New workspaces use the new region
# Existing workspaces stay in current region
```

### Can I use my local browser?

**Yes! This is recommended.** Port 3000 auto-forwards, so just open `https://localhost:3000` in your local browser.

### Do I need VNC?

**No.** Modern DevPod uses:
- Headless Chrome for automated testing
- X11 forwarding for visual debugging (requires XQuartz)
- Direct port forwarding for web UIs

VNC is legacy technology and no longer needed.

### How do prebuilds work?

**Automatic:** When `.devcontainer/` changes are merged to main, GitHub Actions builds a new prebuild.
**Manual:** Run `devpod build . --repository ghcr.io/praetorian-inc/chariot-devpod-prebuild --push`
**Usage:** Automatic when creating workspaces - no configuration needed.

### What about cycle-devpod.sh?

This workaround addresses a DevPod state preservation issue on first workspace creation.

**`make devpod-create` runs it automatically** - you don't need to think about it.

For manual workspace creation, run `./scripts/cycle-devpod.sh workspace-name` after first creation.

### How do I update my workspace?

**Apply devcontainer.json changes:**
```bash
devpod up my-workspace --recreate
```

**Update dependencies:**
```bash
# Inside workspace
git pull
make setup
```

---

## Additional Resources

### Documentation
- [DevPod Official Docs](https://devpod.sh/docs)
- [Devcontainer Specification](https://containers.dev/)
- [AWS Provider Docs](https://github.com/loft-sh/devpod-provider-aws)

### Internal Resources
- Dockerfile: `devpod/Dockerfile`
- Devcontainer config: `.devcontainer/devcontainer.json`
- Prebuild workflow: `.github/workflows/devpod-prebuild.yml`
- Setup scripts: `scripts/devpod/`

### Quick Reference

```bash
make devpod-help    # Comprehensive command reference
make help           # All Makefile targets
```

---

## TODO: Container Image Updates

The devcontainer image needs to be rebuilt to fully remove VNC dependencies:

### Tasks

**1. Update `devpod/Dockerfile`**
- ❌ Remove desktop-lite feature dependencies
- ❌ Remove TigerVNC packages
- ❌ Remove Fluxbox desktop environment
- ❌ Remove noVNC web interface
- ✅ Keep Google Chrome (for headless/X11 modes)
- ✅ Keep X11 client libraries (for X11 forwarding)

**2. Update `.devcontainer/devcontainer.json`**
- ✅ Already done - desktop-lite feature removed
- ✅ Already done - X11 forwarding configured
- ✅ Already done - Automatic port forwarding added

**3. Rebuild and Publish Container**
```bash
cd devpod/
make publish
```

This will:
- Build new container without VNC
- Push to `ghcr.io/praetorian-inc/chariot-devpod:latest`
- Reduce image size by ~500MB
- Lower RAM usage by ~300MB

**4. Update Prebuild**
```bash
# Trigger GitHub Actions workflow
gh workflow run devpod-prebuild.yml

# Or build manually
devpod build . --repository ghcr.io/praetorian-inc/chariot-devpod-prebuild --push
```

**Benefits of Cleanup:**
- 📉 Smaller container image (~500MB reduction)
- 💾 Lower memory footprint (~300MB less RAM)
- ⚡ Faster startup (less to download/extract)
- 🔒 Reduced attack surface (fewer packages)
- 🧹 Cleaner, simpler codebase

---

## Summary

DevPod provides cloud-based development environments that are:
- **Fast** - Prebuilds start in seconds
- **Consistent** - Same setup for entire team
- **Flexible** - 6 AWS regions, multiple IDEs
- **Modern** - No VNC complexity, automatic port forwarding
- **Cost-effective** - Auto-stop, pay-per-use

**Get started:** `make devpod-install && make devpod-setup-provider && make devpod-create WORKSPACE=my-name`

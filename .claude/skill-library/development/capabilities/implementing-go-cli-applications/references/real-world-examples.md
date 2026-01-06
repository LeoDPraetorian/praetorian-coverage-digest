# Real-World CLI Examples

Analysis of production CLIs from kubectl, docker, gh, hugo, and terraform.

## kubectl (Kubernetes CLI)

**Framework**: Cobra
**Repository**: [kubernetes/kubectl](https://github.com/kubernetes/kubectl)

### Architecture Highlights

**Command Structure**: Verb-Noun-Flag

```bash
kubectl get pods --namespace=default
kubectl create deployment nginx --image=nginx
kubectl delete service myservice
```

**Key Patterns**:

- Resource-oriented commands (get, create, delete, update)
- Global flags (--namespace, --context, --kubeconfig)
- Output formats (--output=json|yaml|wide|name)
- Dry-run mode (--dry-run=client|server)
- Shell completion for resource names (dynamic)

**Configuration**:

```go
// Uses client-go config loading
config, err := clientcmd.BuildConfigFromFlags("", kubeconfigPath)

// Respects precedence:
// 1. --kubeconfig flag
// 2. KUBECONFIG env var
// 3. ~/.kube/config
```

**Error Messages**:

```
Error from server (NotFound): pods "nginx" not found
│
└─ Check namespace: kubectl get pods --all-namespaces
   Or create pod: kubectl run nginx --image=nginx
```

### Code Organization

```
cmd/kubectl/
├── kubectl.go              # Entry point
├── app/
│   └── kubectl.go          # Root command setup
└── pkg/cmd/
    ├── get/                # kubectl get
    ├── create/             # kubectl create
    ├── delete/             # kubectl delete
    └── ...
```

**Learnings**:

- Separate package per command group
- Shared utilities in pkg/
- Resource types are plugin-based
- Heavy use of factory pattern

## docker (Docker CLI)

**Framework**: Cobra
**Repository**: [docker/cli](https://github.com/docker/cli)

### Architecture Highlights

**Command Structure**: Management Commands

```bash
docker container ls
docker image build .
docker network create mynet
docker volume rm myvolume
```

**Key Patterns**:

- Management command grouping (container, image, network, volume)
- Persistent flags (--config, --context, --log-level)
- Credential helpers for authentication
- Plugin system for extensibility

**Configuration Precedence**:

```
1. CLI flags (--host, --tls)
2. Environment variables (DOCKER_HOST, DOCKER_TLS_VERIFY)
3. Config file (~/.docker/config.json)
4. Defaults
```

**Configuration File**:

```json
{
  "auths": {
    "registry.example.com": {
      "auth": "base64-encoded-credentials"
    }
  },
  "credStore": "osxkeychain",
  "plugins": {
    "buildx": {
      "version": "0.12.0"
    }
  }
}
```

### Code Organization

```
cli/
├── cmd/docker/           # Main entry
└── cli/command/
    ├── container/        # Container commands
    ├── image/            # Image commands
    └── network/          # Network commands
```

**Learnings**:

- Management commands improve discoverability
- Plugin system allows third-party extensions
- Context switching for multiple Docker hosts
- Extensive use of middleware pattern

## gh (GitHub CLI)

**Framework**: Cobra
**Repository**: [cli/cli](https://github.com/cli/cli)

### Architecture Highlights

**Command Structure**: Verb-Noun-Flag

```bash
gh issue create --title "Bug report" --body "Description"
gh pr list --state open --author @me
gh repo clone owner/repo
```

**Key Patterns**:

- Interactive prompts when flags missing
- Scriptable mode (all flags provided)
- Output formats (--json, --jq for filtering)
- Browser integration (gh repo view --web)
- Extension system

**Interactive Prompts**:

```bash
# Without flags - prompts interactively
$ gh issue create
? Title Bug report
? Body <opens editor>
? Add labels? (y/N) y
? Labels bug, urgent

# With flags - non-interactive
$ gh issue create --title "Bug" --body "Description" --label bug
```

**Configuration**:

```yaml
# ~/.config/gh/config.yml
git_protocol: ssh
editor: vim
prompt: enabled
pager: less

aliases:
  co: pr checkout
  pv: pr view
```

### Code Organization

```
pkg/cmd/
├── issue/
│   ├── create.go
│   ├── list.go
│   └── view.go
├── pr/
└── repo/
```

**Learnings**:

- Interactive vs scriptable modes
- JSON output + jq for filtering
- Extension system (gh extension install)
- Browser integration for web actions

## hugo (Static Site Generator)

**Framework**: Cobra
**Repository**: [gohugoio/hugo](https://github.com/gohugoio/hugo)

### Architecture Highlights

**Command Structure**: Simple Verbs

```bash
hugo new site mysite
hugo new content/posts/article.md
hugo server --buildDrafts
hugo --minify
```

**Key Patterns**:

- Fast build times (milliseconds)
- Watch mode with live reload
- Configuration via config.toml/yaml/json
- Theme system
- Minimal required flags

**Configuration**:

```toml
# config.toml
baseURL = "https://example.com"
languageCode = "en-us"
title = "My Site"
theme = "mytheme"

[params]
  description = "My awesome site"
  author = "Your Name"
```

**Learnings**:

- Sensible defaults (rarely need flags)
- Fast feedback loops (watch mode)
- Config file is primary interface
- Minimal CLI surface, rich config options

## terraform (Infrastructure as Code)

**Framework**: Custom (mitchellh/cli, predecessor to Cobra)
**Repository**: [hashicorp/terraform](https://github.com/hashicorp/terraform)

### Architecture Highlights

**Command Structure**: Verbs

```bash
terraform init
terraform plan -out=tfplan
terraform apply tfplan
terraform destroy -auto-approve
```

**Key Patterns**:

- Plan-apply workflow (preview before execution)
- State management (local/remote backends)
- Workspaces for multi-environment
- Approval gates for safety
- Lock files for consistency

**Workflow**:

```bash
# 1. Initialize (download providers)
terraform init

# 2. Plan (preview changes)
terraform plan -out=tfplan

# 3. Review plan
cat tfplan  # Or terraform show tfplan

# 4. Apply (user must approve)
terraform apply tfplan

# Or skip plan
terraform apply  # Prompts: "Do you want to perform these actions?"
```

**Configuration**:

```hcl
# terraform.tf
terraform {
  backend "s3" {
    bucket = "terraform-state"
    key    = "prod/terraform.tfstate"
    region = "us-east-1"
  }
}

# Variables
variable "environment" {
  type    = string
  default = "dev"
}

# Overrides
# CLI: terraform apply -var="environment=prod"
# File: terraform.tfvars
# Env: TF_VAR_environment=prod
```

**Learnings**:

- Plan-apply pattern prevents accidents
- Explicit approval gates for destructive actions
- State as first-class concept
- Variable precedence (CLI > File > Env > Default)

## Common Patterns Across All Five

| Pattern         | kubectl         | docker          | gh          | hugo      | terraform      |
| --------------- | --------------- | --------------- | ----------- | --------- | -------------- |
| **Cobra**       | ✅              | ✅              | ✅          | ✅        | ❌ (custom)    |
| **Viper**       | ✅              | ❌ (JSON)       | ✅ (YAML)   | ✅ (TOML) | ❌ (HCL)       |
| **Subcommands** | ✅              | ✅              | ✅          | ✅        | ✅             |
| **POSIX flags** | ✅              | ✅              | ✅          | ✅        | ✅             |
| **JSON output** | ✅ (-o json)    | ✅ (--format)   | ✅ (--json) | ❌        | ✅ (json)      |
| **Completion**  | ✅              | ✅              | ✅          | ✅        | ✅             |
| **Config file** | ✅              | ✅              | ✅          | ✅        | ✅ (HCL)       |
| **Env vars**    | ✅ (KUBECONFIG) | ✅ (DOCKER\_\*) | ✅ (GH\_\*) | ❌        | ✅ (TF*VAR*\*) |

## Key Takeaways

### 1. Command Organization Matters

| Style      | Example               | When to Use         |
| ---------- | --------------------- | ------------------- |
| Verb-Noun  | `kubectl get pods`    | Resource-oriented   |
| Noun-Verb  | `git commit -m`       | Entity-centric      |
| Management | `docker container ls` | Multi-service tools |

### 2. Plan-Apply Pattern

For destructive operations:

```bash
# Preview
terraform plan
# Apply
terraform apply

# Or
kubectl delete pod nginx --dry-run=client
kubectl delete pod nginx  # Actual deletion
```

### 3. Progressive Disclosure

| Verbosity | kubectl   | docker             | gh           |
| --------- | --------- | ------------------ | ------------ |
| Default   | Table     | Table              | Table        |
| Verbose   | `--v=6`   | `--debug`          | `--verbose`  |
| JSON      | `-o json` | `--format json`    | `--json`     |
| Raw       | `-o yaml` | `--format {{.ID}}` | `--jq '.id'` |

### 4. Configuration Layers

All five tools use layered config:

1. Defaults in code
2. System config (/etc/)
3. User config (~/.config/)
4. Local config (./config)
5. Environment variables
6. CLI flags

## Recommended Reading

| Tool          | Best Features to Study                            |
| ------------- | ------------------------------------------------- |
| **kubectl**   | Resource-oriented commands, plugin system         |
| **docker**    | Management commands, context switching            |
| **gh**        | Interactive vs scriptable modes, extension system |
| **hugo**      | Fast build times, sensible defaults               |
| **terraform** | Plan-apply workflow, approval gates               |

## Sources

- [kubernetes/kubectl](https://github.com/kubernetes/kubectl)
- [docker/cli](https://github.com/docker/cli)
- [cli/cli](https://github.com/cli/cli)
- [gohugoio/hugo](https://github.com/gohugoio/hugo)
- [hashicorp/terraform](https://github.com/hashicorp/terraform)
- Research: `.claude/.output/research/2026-01-05-213532-go-cli-best-practices/`

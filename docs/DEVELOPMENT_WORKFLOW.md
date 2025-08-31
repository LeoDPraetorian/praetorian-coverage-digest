# Development Workflow - Git Submodules

## Repository Structure

This project uses a multi-repository architecture with git submodules:

- **Main Repository**: `chariot-development-platform` (this repo)
- **Submodules**: Individual repositories in `modules/` directory
  - `modules/chariot/`
  - `modules/aegiscli/`
  - `modules/chariot-ui-components/`
  - `modules/nebula/`
  - etc.

## Development Workflow

### 1. Initial Setup

```bash
# Clone the main repository with all submodules
git clone --recursive https://github.com/your-org/chariot-development-platform.git

# Or if already cloned, initialize submodules
git submodule update --init --recursive
```

### 2. Staying Up-to-Date

**Always pull updates from the main repository first:**

```bash
# Pull main repo and all submodule updates
git submodules-pull
```

This command updates both the main repository and all submodules to their latest versions.

### 3. Branching Strategy

#### For Main Repository Changes

**Create branches from `chariot-development-platform`** when making changes to:
- Root-level configuration files
- Documentation (this file, CLAUDE.md, etc.)
- GitHub Actions workflows
- Submodule references/updates
- Project-wide tooling

```bash
# Create branch for main repo changes
git checkout -b feature/update-ci-pipeline
# Make changes to root-level files
git add .
git commit -m "Update CI pipeline configuration"
git push origin feature/update-ci-pipeline
# Create PR to chariot-development-platform
```

#### For Module-Specific Changes

**Create branches from the individual submodule repositories** when making changes to:
- Code within any `modules/` directory
- Module-specific tests, documentation, or configuration

```bash
# Navigate to the specific module
cd modules/chariot

# Create branch in the submodule
git checkout -b feature/add-new-scanner
# Make changes within this module
git add .
git commit -m "Add new vulnerability scanner"
git push origin feature/add-new-scanner
# Create PR to the individual module repository (e.g., chariot repo)
```

### 4. Pull Request Guidelines

| Change Type | Branch Location | PR Target | Example |
|-------------|----------------|-----------|---------|
| Main repo config/docs | `chariot-development-platform` | `chariot-development-platform` | CI/CD updates, root docs |
| Chariot platform code | `modules/chariot` | `chariot` repository | Backend API, frontend UI |
| UI components | `modules/chariot-ui-components` | `chariot-ui-components` repository | React components |
| Aegis CLI | `modules/aegiscli` | `aegiscli` repository | CLI tool updates |
| Nebula scanner | `modules/nebula` | `nebula` repository | Scanner logic |

### 5. Updating Submodule References

After a PR is merged in a submodule repository, update the main repository to point to the new commit:

```bash
# In main repository root
cd modules/chariot
git pull origin main  # Pull latest changes from submodule
cd ../..

# Commit the submodule reference update
git add modules/chariot
git commit -m "Update chariot submodule to latest version"
git push origin main
```

### 6. Common Workflows

#### Working on Chariot Platform Features
```bash
cd modules/chariot
git checkout -b feature/new-asset-discovery
# Make changes...
git commit -m "Implement new asset discovery engine"
git push origin feature/new-asset-discovery
# Create PR to chariot repository
```

#### Updating Project Documentation
```bash
# From main repository root
git checkout -b docs/update-setup-guide
# Edit files in root or docs/
git commit -m "Update development setup documentation"
git push origin docs/update-setup-guide
# Create PR to chariot-development-platform
```

#### Adding New Dependencies to Multiple Modules
```bash
# Update each module individually
cd modules/chariot
git checkout -b deps/add-security-lib
# Update package.json, go.mod, etc.
git commit -m "Add security library dependency"
git push origin deps/add-security-lib
# Create PR to chariot repository

# Then update main repo if needed
cd ../..
git checkout -b deps/update-submodule-refs
git add modules/chariot
git commit -m "Update chariot submodule reference"
git push origin deps/update-submodule-refs
# Create PR to chariot-development-platform
```

## Best Practices

1. **Always run `git submodules-pull` before starting work**
2. **Create feature branches in the appropriate repository**
3. **Keep main repo PRs focused on project-wide concerns**
4. **Keep module PRs focused on that specific module's functionality**
5. **Update submodule references promptly after module PRs are merged**
6. **Test changes thoroughly in the context of the full platform**

## Troubleshooting

### Submodule Out of Sync
```bash
git submodule update --remote --merge
```

### Submodule Conflicts
```bash
cd modules/problematic-module
git status
# Resolve conflicts manually
git add .
git commit -m "Resolve submodule conflicts"
```

### Reset Submodule to Main Repo's Expected Version
```bash
git submodule update --init --recursive
```
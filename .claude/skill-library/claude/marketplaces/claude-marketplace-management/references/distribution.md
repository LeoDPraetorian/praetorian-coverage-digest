# Marketplace Distribution Methods

Complete guide to distributing plugin marketplaces to teams.

## Overview

Claude Code supports three distribution methods:
1. **GitHub** (recommended for teams)
2. **Other Git Services** (GitLab, Bitbucket, etc.)
3. **Local Paths** (for testing)

## GitHub Distribution (Recommended)

### Setup

**Step 1: Create GitHub Repository**
```bash
# Create new repository on GitHub
# Public or private (team needs access)

# Clone locally
git clone https://github.com/owner/marketplace-name.git
cd marketplace-name
```

**Step 2: Add marketplace.json**
```bash
# Create marketplace.json in repository root
cat > marketplace.json << 'EOF'
{
  "name": "my-marketplace",
  "owner": {
    "name": "Your Team",
    "email": "team@company.com"
  },
  "plugins": []
}
EOF
```

**Step 3: Add Plugins**

For bundled plugins:
```bash
mkdir -p plugins/plugin-name
# Add plugin content
git add plugins/
```

For external plugins:
```json
{
  "plugins": [
    {
      "name": "external-tool",
      "source": {
        "source": "github",
        "repo": "other-owner/tool-repo"
      }
    }
  ]
}
```

**Step 4: Commit and Push**
```bash
git add marketplace.json
git commit -m "Initial marketplace setup"
git push origin main
```

### User Installation

**Add marketplace:**
```bash
/plugin marketplace add owner/marketplace-name
```

**Install plugin from marketplace:**
```bash
/plugin install plugin-name@marketplace-name
```

**Or use GitHub URL:**
```bash
/plugin marketplace add https://github.com/owner/marketplace-name
```

### Benefits

✅ **Easy discovery** - Standard GitHub URLs
✅ **Version control** - Full git history
✅ **Team collaboration** - Pull requests, issues
✅ **Access control** - GitHub permissions
✅ **CI/CD integration** - Automated testing

### GitHub Access

**Public repositories:**
- No authentication required
- Anyone can install
- Good for open source tools

**Private repositories:**
- Team members need repository access
- GitHub authentication required
- Good for internal tools

### Updating Marketplace

**Users update:**
```bash
/plugin marketplace update marketplace-name
```

**Force refresh:**
```bash
/plugin marketplace remove marketplace-name
/plugin marketplace add owner/marketplace-name
```

## Git Service Distribution

Works with GitLab, Bitbucket, self-hosted git, etc.

### Setup

**Step 1: Create Git Repository**

Follow your git service's standard process.

**Step 2: Add marketplace.json**

Same as GitHub method.

**Step 3: Commit and Push**
```bash
git add marketplace.json
git commit -m "Initial marketplace"
git push origin main
```

### User Installation

**Full git URL required:**
```bash
/plugin marketplace add https://gitlab.com/owner/repo.git
/plugin marketplace add https://bitbucket.org/owner/repo.git
/plugin marketplace add https://git.company.com/team/marketplace.git
```

### Authentication

**HTTPS with credentials:**
- Git credential helper
- SSH keys
- Personal access tokens

**SSH URLs:**
```bash
/plugin marketplace add git@gitlab.com:owner/repo.git
```

### Benefits

✅ **Use existing git service** - No GitHub required
✅ **Self-hosted option** - Full control
✅ **Enterprise integration** - Existing workflows

## Local Path Distribution

For testing before publishing.

### Setup

**Create local marketplace:**
```bash
mkdir ~/my-test-marketplace
cd ~/my-test-marketplace
# Add marketplace.json and plugins
```

### User Installation

**Absolute path:**
```bash
/plugin marketplace add /absolute/path/to/marketplace
```

**Relative path (from working directory):**
```bash
/plugin marketplace add ./relative/path/marketplace
```

### Use Cases

**Testing:**
- Validate marketplace.json syntax
- Test plugin installation
- Verify plugin functionality
- Debug issues before publishing

**Development:**
- Active plugin development
- Quick iteration
- Local changes without commits

**Workshops:**
- Share local marketplace
- Offline demonstrations
- Training sessions

### Benefits

✅ **Fast iteration** - No git push required
✅ **Offline capable** - No network needed
✅ **Safe testing** - Won't affect published version

### Limitations

❌ **Not persistent** - Path must remain valid
❌ **Not shareable** - Each user needs local copy
❌ **No version control** - Manual backup required

## Team Configuration Methods

### Method 1: Manual Installation

Each team member runs commands:
```bash
/plugin marketplace add owner/marketplace
/plugin install plugin-name@marketplace
```

**Pros:**
- Simple for small teams
- User control

**Cons:**
- Manual process
- Inconsistent across team
- Easy to forget

### Method 2: Documented Setup

Create SETUP.md in repository:
```markdown
# Plugin Setup

1. Add marketplace:
   /plugin marketplace add company/tools

2. Install plugins:
   /plugin install dev-tools@tools
   /plugin install quality@tools
```

**Pros:**
- Clear instructions
- Self-service

**Cons:**
- Still manual
- Can become outdated

### Method 3: Automatic Configuration (Recommended)

Use `.claude/settings.json` in project repository:

```json
{
  "extraKnownMarketplaces": {
    "company-tools": {
      "source": {
        "source": "github",
        "repo": "company/tools"
      }
    }
  },
  "enabledPlugins": {
    "dev-tools@company-tools": true,
    "quality@company-tools": true
  }
}
```

**Commit to git:**
```bash
git add .claude/settings.json
git commit -m "Add automatic plugin configuration"
git push
```

**Team members:**
```bash
git pull
# Claude Code automatically installs marketplace and plugins
```

**Pros:**
- Zero manual configuration
- Consistent across team
- Version controlled
- Single source of truth

**Cons:**
- Requires project settings

## Distribution Best Practices

### Versioning

**Tag releases:**
```bash
git tag -a v1.0.0 -m "Release version 1.0.0"
git push origin v1.0.0
```

**Semantic versioning:**
- `1.0.0` - Initial release
- `1.1.0` - New features
- `1.0.1` - Bug fixes
- `2.0.0` - Breaking changes

### Documentation

**README.md:**
```markdown
# Company Tools Marketplace

## Installation

/plugin marketplace add company/tools
/plugin install dev-tools@tools

## Available Plugins

- dev-tools: Development workflow automation
- quality: Code quality checking
- security: Security scanning

## Updates

/plugin marketplace update tools
```

**CHANGELOG.md:**
```markdown
# Changelog

## [1.1.0] - 2024-01-15
### Added
- New security-scanner plugin

## [1.0.0] - 2024-01-01
### Added
- Initial release with dev-tools
```

### Communication

**Announce updates:**
- Slack/Teams message
- Email to team
- Pull request description
- Release notes

**Breaking changes:**
- Warn team in advance
- Provide migration guide
- Update documentation
- Bump major version

### Testing

**Before distributing:**
1. Test locally first
2. Verify all plugin sources accessible
3. Check JSON syntax
4. Install on clean machine
5. Validate all plugins load

**CI/CD validation:**
```yaml
# .github/workflows/validate.yml
name: Validate Marketplace
on: [push, pull_request]
jobs:
  validate:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - name: Validate JSON
        run: |
          jq empty marketplace.json
      - name: Check plugin sources
        run: |
          # Validate all source paths/URLs exist
```

### Security

**Repository access:**
- Use private repos for internal tools
- Control GitHub access carefully
- Audit team membership regularly

**Plugin vetting:**
- Review plugin code before adding
- Verify author identity
- Check for malicious code
- Document security requirements

**HTTPS only:**
```json
{
  "source": {
    "source": "git",
    "url": "https://gitlab.com/owner/repo.git"
  }
}
```
Never use `http://` URLs.

## Troubleshooting Distribution

**Users can't add marketplace:**
- Verify repository exists
- Check access permissions
- Confirm URL format correct
- Try full URL instead of shorthand

**Plugins don't install:**
- Validate marketplace.json syntax
- Check plugin sources accessible
- Verify plugin.json exists
- Review error messages

**Updates don't work:**
- Check git repository has updates
- Verify user ran update command
- Try remove/re-add marketplace
- Clear Claude Code cache

**Different team members see different plugins:**
- Ensure all pulled latest git changes
- Verify marketplace update ran
- Check settings.json consistent
- Restart Claude Code

## Migration Between Distribution Methods

### Local → GitHub

1. Create GitHub repository
2. Copy marketplace content
3. Push to GitHub
4. Update settings.json source
5. Team removes local, adds GitHub

### GitHub → Self-Hosted Git

1. Mirror repository to self-hosted git
2. Update settings.json URL
3. Team updates marketplace source
4. Verify all plugins still accessible

### Multiple Marketplaces → Single

1. Merge marketplace.json files
2. Consolidate plugins
3. Update settings.json
4. Remove old marketplaces
5. Install consolidated marketplace

## Summary

**Choose GitHub for:**
- Team distribution
- Version control
- Easy discovery
- Standard workflow

**Choose Git Services for:**
- Existing infrastructure
- Self-hosted requirements
- Enterprise integration

**Choose Local Paths for:**
- Testing
- Development
- Offline work
- Quick iteration

**Recommended flow:**
1. Develop locally
2. Test thoroughly
3. Publish to GitHub
4. Configure auto-install
5. Communicate to team

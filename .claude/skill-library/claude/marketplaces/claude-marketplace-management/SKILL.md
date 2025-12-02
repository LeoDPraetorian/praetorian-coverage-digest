---
name: claude-marketplace-management
description: Create and manage Claude Code plugin marketplaces. Use when creating marketplace.json, adding plugins to marketplaces, distributing plugins to teams via GitHub, configuring extraKnownMarketplaces in settings.json, or migrating plugins between marketplaces. Covers marketplace structure, plugin entries, team auto-install configuration, and version management.
allowed-tools: Read, Write, Bash, Grep, Glob
---

# Claude Code Marketplace Management

Master creating, configuring, and distributing Claude Code plugin marketplaces for team collaboration.

## When to Use This Skill

- Creating a new plugin marketplace
- Adding plugins to an existing marketplace
- Distributing plugins to your team via GitHub
- Configuring automatic marketplace installation
- Migrating plugins between marketplaces
- Setting up team plugin auto-install
- Understanding marketplace.json structure
- Managing marketplace versions and updates

## Core Concepts

**Marketplace**: A catalog of available plugins that provides centralized discovery, version management, and team distribution.

**marketplace.json**: The manifest file defining marketplace metadata and available plugins.

**Plugin Entry**: A JSON object in the plugins array specifying a plugin's name, source, and optional metadata.

**Distribution Methods**: GitHub (recommended), other git services, or local paths for testing.

## Creating a Marketplace

### Step 1: Understand Marketplace Structure

See [references/marketplace-schema.md](references/marketplace-schema.md) for complete schema.

**Minimum marketplace.json:**
```json
{
  "name": "my-marketplace",
  "owner": {
    "name": "Your Name",
    "email": "you@example.com"
  },
  "plugins": []
}
```

**Required fields:**
- `name`: kebab-case identifier
- `owner`: Maintainer information
- `plugins`: Array of plugin entries

### Step 2: Create marketplace.json

Use the template in [templates/marketplace.json](templates/marketplace.json).

**Workflow:**
1. Create marketplace.json in repository root
2. Define name, owner, and description
3. Add plugins array (start empty)
4. Commit to git repository
5. Distribute to team (see Distribution section)

### Step 3: Add Plugins to Marketplace

See [references/plugin-entry-format.md](references/plugin-entry-format.md) for complete reference.

**Basic plugin entry:**
```json
{
  "name": "plugin-name",
  "source": {
    "source": "directory",
    "path": "./path/to/plugin"
  }
}
```

**Source types:**
- `directory`: Relative path in same repo
- `github`: GitHub repository (owner/repo)
- `git`: Full git URL

**Optional metadata:**
- `description`: Brief plugin description
- `version`: Semantic version
- `author`: Author information
- `license`: License type

**Add plugin workflow:**
1. Open marketplace.json
2. Add entry to plugins array
3. Verify source path/repo is correct
4. Commit changes
5. Users update marketplace to see new plugin

## Distribution Methods

See [references/distribution.md](references/distribution.md) for detailed guide.

### GitHub (Recommended)

**Setup:**
1. Create GitHub repository
2. Add marketplace.json to root
3. Add plugins (as subdirectories or references)
4. Push to GitHub

**Users install:**
```bash
/plugin marketplace add owner/repo
```

**Benefits:**
- Easy discovery
- Version control
- Team collaboration
- Standard git workflow

### Other Git Services

**GitLab, Bitbucket, etc:**
```bash
/plugin marketplace add https://gitlab.com/owner/repo.git
```

### Local Testing

**Test before distributing:**
```bash
/plugin marketplace add /absolute/path/to/marketplace
```

## Team Configuration

See [references/team-config.md](references/team-config.md) for complete guide.

### Automatic Marketplace Installation

**In .claude/settings.json:**
```json
{
  "extraKnownMarketplaces": {
    "marketplace-name": {
      "source": {
        "source": "github",
        "repo": "owner/repo"
      }
    }
  },
  "enabledPlugins": {
    "plugin-name@marketplace-name": true
  }
}
```

**Workflow:**
1. Team member commits settings.json to repo
2. Others pull changes
3. Claude Code auto-installs marketplace and plugins
4. No manual configuration needed

**Benefits:**
- Zero-config for team members
- Consistent plugin setup across team
- Single source of truth in git

## Version Management

**Updating marketplace:**
```bash
/plugin marketplace update marketplace-name
```

**Updating specific plugin:**
```bash
/plugin uninstall plugin-name
/plugin install plugin-name@marketplace-name
```

**Best practices:**
- Use semantic versioning for plugins
- Document breaking changes
- Test updates before distributing
- Communicate updates to team

## Migrating Plugins Between Marketplaces

See [examples/migration-example.md](examples/migration-example.md) for real-world case study.

**Workflow:**
1. Copy plugin content to new location
2. Add plugin entry to target marketplace.json
3. Update .claude/settings.json to point to new marketplace
4. Test plugin loads correctly
5. Remove old marketplace reference
6. Commit and distribute changes

**Common scenarios:**
- Moving from external to private marketplace (what Chariot did)
- Consolidating multiple marketplaces
- Creating team-specific marketplace from public sources

## Best Practices

**Marketplace naming:**
- Use kebab-case
- Be descriptive (company-plugins, team-tools)
- Avoid generic names (plugins, marketplace)

**Plugin organization:**
- Group related plugins
- Use consistent naming conventions
- Document plugin dependencies
- Include version numbers

**Distribution:**
- Prefer GitHub for team distribution
- Use semantic versioning
- Document breaking changes
- Test before publishing

**Team coordination:**
- Use extraKnownMarketplaces in settings.json
- Communicate marketplace updates
- Document required setup steps
- Maintain changelog

## Common Tasks

### Create New Marketplace
1. Use [templates/marketplace.json](templates/marketplace.json)
2. Add to GitHub repository
3. Configure in settings.json
4. Distribute to team

### Add Plugin to Existing Marketplace
1. Use [templates/plugin-entry.json](templates/plugin-entry.json)
2. Add to plugins array in marketplace.json
3. Commit changes
4. Team updates marketplace

### Switch Marketplace Sources
1. Update source in settings.json
2. Remove old marketplace reference
3. Test plugins load
4. Commit changes

### Troubleshoot Installation
1. Verify marketplace.json syntax
2. Check plugin source paths/URLs
3. Confirm git repository access
4. Review .claude/settings.json configuration

## Reference Files

- [marketplace-schema.md](references/marketplace-schema.md) - Complete JSON schema
- [plugin-entry-format.md](references/plugin-entry-format.md) - Plugin entry reference
- [distribution.md](references/distribution.md) - Distribution methods guide
- [team-config.md](references/team-config.md) - Team auto-install configuration

## Examples

- [chariot-marketplace.md](examples/chariot-marketplace.md) - Real Chariot marketplace
- [migration-example.md](examples/migration-example.md) - Superpowers migration case study

## Templates

- [marketplace.json](templates/marketplace.json) - Starter marketplace template
- [plugin-entry.json](templates/plugin-entry.json) - Plugin entry template

---

**Remember**: Marketplaces enable team collaboration through centralized plugin distribution. Use GitHub for easy sharing, configure extraKnownMarketplaces for automatic setup, and follow semantic versioning for smooth updates.

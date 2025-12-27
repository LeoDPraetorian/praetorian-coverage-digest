# Plugin Entry Format Reference

Detailed guide for adding plugins to marketplace.json.

## Basic Plugin Entry

Minimum required fields:

```json
{
  "name": "plugin-name",
  "source": {
    "source": "directory",
    "path": "./path/to/plugin"
  }
}
```

## Source Types Explained

### Directory Source (Same Repository)

Use when plugin is in the same repository as marketplace.

```json
{
  "name": "my-plugin",
  "source": {
    "source": "directory",
    "path": "./"
  }
}
```

**When to use:**

- Plugin bundled with marketplace
- Team wants single repository
- Simplifies distribution

**Path format:**

- Relative to marketplace.json location
- Unix-style forward slashes
- Examples: `"./"`, `"./plugins/my-plugin"`, `"../shared-plugin"`

**Example structure:**

```
my-marketplace/
├── marketplace.json
├── plugin-a/
│   ├── plugin.json
│   └── skills/
└── plugin-b/
    ├── plugin.json
    └── commands/
```

**marketplace.json:**

```json
{
  "plugins": [
    {
      "name": "plugin-a",
      "source": {
        "source": "directory",
        "path": "./plugin-a"
      }
    },
    {
      "name": "plugin-b",
      "source": {
        "source": "directory",
        "path": "./plugin-b"
      }
    }
  ]
}
```

### GitHub Source (Separate Repository)

Use when plugin is in its own GitHub repository.

```json
{
  "name": "external-plugin",
  "source": {
    "source": "github",
    "repo": "owner/repo-name"
  }
}
```

**When to use:**

- Plugin maintained separately
- Different release cadence
- Third-party plugins
- Public plugins

**Format:**

- `owner/repo-name` (standard GitHub format)
- No `.git` extension
- No protocol prefix

**Examples:**

- `"obra/superpowers"`
- `"anthropic/claude-code-examples"`
- `"mycompany/internal-tools"`

### Git Source (Any Git Repository)

Use for GitLab, Bitbucket, or custom git servers.

```json
{
  "name": "gitlab-plugin",
  "source": {
    "source": "git",
    "url": "https://gitlab.com/owner/repo.git"
  }
}
```

**When to use:**

- Non-GitHub git repositories
- Self-hosted git servers
- Custom deployment workflows

**Format:**

- Full git URL required
- Must include protocol (https://)
- Include `.git` extension
- Must be accessible to users

**Examples:**

- `"https://gitlab.com/myteam/plugin.git"`
- `"https://bitbucket.org/company/tools.git"`
- `"https://git.internal.company.com/plugins/auth.git"`

## Optional Metadata

### Description

Brief explanation of plugin functionality.

```json
{
  "name": "eslint-tools",
  "description": "Automated ESLint checking and fixing for TypeScript projects",
  "source": {
    "source": "directory",
    "path": "./eslint-tools"
  }
}
```

**Best practices:**

- Keep concise (1-2 sentences)
- Explain what plugin does
- Mention key features
- Avoid marketing language

### Version

Semantic version for tracking updates.

```json
{
  "name": "db-tools",
  "version": "2.1.0",
  "source": {
    "source": "github",
    "repo": "mycompany/db-tools"
  }
}
```

**Format:**

- Semantic versioning: `major.minor.patch`
- Optional prerelease: `1.0.0-alpha`, `2.0.0-beta.1`
- Optional build metadata: `1.0.0+20231115`

**When to increment:**

- **Major**: Breaking changes
- **Minor**: New features (backward compatible)
- **Patch**: Bug fixes

### Author

Plugin author information.

```json
{
  "name": "ui-components",
  "author": {
    "name": "Frontend Team",
    "email": "frontend@company.com"
  },
  "source": {
    "source": "directory",
    "path": "./ui-components"
  }
}
```

**Use cases:**

- Different authors per plugin
- Contact information for support
- Credit contributors

### License

License for plugin code.

```json
{
  "name": "api-helpers",
  "license": "MIT",
  "source": {
    "source": "github",
    "repo": "company/api-helpers"
  }
}
```

**Common licenses:**

- `"MIT"` - Permissive open source
- `"Apache-2.0"` - Permissive with patent grant
- `"GPL-3.0"` - Copyleft open source
- `"Proprietary"` - Closed source
- `"UNLICENSED"` - No license granted

## Complete Plugin Entry Example

```json
{
  "name": "security-scanner",
  "description": "Automated security scanning and vulnerability detection for Node.js projects",
  "version": "1.5.2",
  "author": {
    "name": "Security Team",
    "email": "security@company.com"
  },
  "license": "Proprietary",
  "source": {
    "source": "directory",
    "path": "./plugins/security-scanner"
  }
}
```

## Multiple Plugin Patterns

### Monorepo Pattern (All in One)

All plugins in same repository as marketplace.

```json
{
  "plugins": [
    {
      "name": "frontend-tools",
      "source": {
        "source": "directory",
        "path": "./plugins/frontend"
      }
    },
    {
      "name": "backend-tools",
      "source": {
        "source": "directory",
        "path": "./plugins/backend"
      }
    },
    {
      "name": "devops-tools",
      "source": {
        "source": "directory",
        "path": "./plugins/devops"
      }
    }
  ]
}
```

**Benefits:**

- Single repository to clone
- Synchronized versions
- Unified documentation
- Simple CI/CD

**Structure:**

```
marketplace-repo/
├── marketplace.json
├── README.md
└── plugins/
    ├── frontend/
    │   └── plugin.json
    ├── backend/
    │   └── plugin.json
    └── devops/
        └── plugin.json
```

### Distributed Pattern (Separate Repos)

Each plugin in its own repository.

```json
{
  "plugins": [
    {
      "name": "core-tools",
      "source": {
        "source": "github",
        "repo": "company/core-tools"
      }
    },
    {
      "name": "ai-assistant",
      "source": {
        "source": "github",
        "repo": "company/ai-assistant"
      }
    },
    {
      "name": "code-quality",
      "source": {
        "source": "github",
        "repo": "company/code-quality"
      }
    }
  ]
}
```

**Benefits:**

- Independent development
- Separate release cycles
- Team ownership per plugin
- Granular access control

### Hybrid Pattern (Mix of Both)

Common plugins bundled, specialized plugins external.

```json
{
  "plugins": [
    {
      "name": "shared-utilities",
      "source": {
        "source": "directory",
        "path": "./shared"
      }
    },
    {
      "name": "specialized-tool",
      "source": {
        "source": "github",
        "repo": "team/specialized-tool"
      }
    }
  ]
}
```

**When to use:**

- Core plugins need stability
- Specialized plugins evolve rapidly
- Balance simplicity and flexibility

## Adding Plugins: Workflow

1. **Decide source type** (directory, github, git)
2. **Prepare plugin** (ensure plugin.json exists)
3. **Test locally** (use local marketplace path)
4. **Add entry** to marketplace.json plugins array
5. **Commit changes** to repository
6. **Notify team** to update marketplace

## Removing Plugins

Simply remove entry from plugins array:

```json
{
  "plugins": [
    {
      "name": "plugin-to-keep",
      "source": {...}
    }
    // Removed plugin entry deleted here
  ]
}
```

**Note**: Users must manually uninstall removed plugins:

```bash
/plugin uninstall plugin-name
```

## Troubleshooting

**Plugin not found:**

- Verify source path/URL is correct
- Check plugin.json exists in source location
- Ensure git repository is accessible

**Installation fails:**

- Validate JSON syntax
- Check for duplicate names
- Verify source type matches configuration

**Plugin doesn't work:**

- Ensure plugin.json is properly formatted
- Check component paths in plugin
- Verify dependencies are documented

## Best Practices

**Naming:**

- Use descriptive plugin names
- Follow kebab-case convention
- Prefix with team/domain (optional)
- Examples: `eslint-tools`, `frontend-helpers`, `security-scanner`

**Versioning:**

- Use semantic versioning
- Document breaking changes
- Increment appropriately
- Communicate updates

**Documentation:**

- Include descriptions for all plugins
- Document required setup
- List dependencies
- Provide usage examples

**Organization:**

- Group related functionality
- Keep plugins focused
- Avoid duplication
- Maintain consistency

# Team Auto-Install Configuration

Complete guide to configuring automatic marketplace and plugin installation for teams.

## Overview

Use `.claude/settings.json` to automatically install marketplaces and plugins when team members clone your project repository.

**Benefits:**

- Zero manual configuration for team members
- Consistent plugin setup across team
- Version controlled in git
- Single source of truth

## Configuration File Location

**Project settings:**

```
project-root/
└── .claude/
    └── settings.json
```

**Personal settings** (don't use for team config):

```
~/.claude/settings.json
```

**Important:** Use project settings (`.claude/settings.json`) so configuration is shared via git.

## Basic Configuration

### Minimal Example

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
    "dev-tools@company-tools": true
  }
}
```

### Complete Example

```json
{
  "extraKnownMarketplaces": {
    "company-tools": {
      "source": {
        "source": "github",
        "repo": "company/tools-marketplace"
      }
    },
    "team-private": {
      "source": {
        "source": "git",
        "url": "https://gitlab.internal.company.com/team/plugins.git"
      }
    }
  },
  "enabledPlugins": {
    "eslint-tools@company-tools": true,
    "security-scanner@company-tools": true,
    "db-helpers@team-private": true,
    "local-plugin@local-marketplace": true
  }
}
```

## Configuration Sections

### extraKnownMarketplaces

Defines marketplaces to automatically install.

**Structure:**

```json
{
  "extraKnownMarketplaces": {
    "marketplace-identifier": {
      "source": {
        "source": "github|git|directory"
        // source-specific fields
      }
    }
  }
}
```

**Marketplace identifier:**

- Used in `enabledPlugins` to reference marketplace
- Can be different from marketplace name in marketplace.json
- Arbitrary string chosen by you
- Examples: `"company-tools"`, `"internal"`, `"shared"`

### Source Types

**GitHub source:**

```json
{
  "marketplace-name": {
    "source": {
      "source": "github",
      "repo": "owner/repo-name"
    }
  }
}
```

**Git source:**

```json
{
  "marketplace-name": {
    "source": {
      "source": "git",
      "url": "https://gitlab.com/owner/repo.git"
    }
  }
}
```

**Directory source (local):**

```json
{
  "marketplace-name": {
    "source": {
      "source": "directory",
      "path": "./"
    }
  }
}
```

### enabledPlugins

Specifies which plugins to automatically install.

**Structure:**

```json
{
  "enabledPlugins": {
    "plugin-name@marketplace-identifier": true
  }
}
```

**Format:**

- `plugin-name`: Name from plugin entry in marketplace.json
- `@marketplace-identifier`: Marketplace identifier from extraKnownMarketplaces
- Value is always `true`

**Examples:**

```json
{
  "enabledPlugins": {
    "eslint-tools@company": true,
    "typescript-helpers@company": true,
    "security-scanner@internal": true
  }
}
```

## Complete settings.json Structure

### With All Common Fields

```json
{
  "model": "sonnet",
  "env": {
    "CUSTOM_VAR": "value"
  },
  "permissions": {
    "allow": ["Bash(git status)"],
    "deny": ["Bash(rm -rf /)"]
  },
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
    "quality-tools@company-tools": true
  },
  "enableAllProjectMcpServers": false,
  "enabledMcpjsonServers": ["server-name"]
}
```

## Setup Workflow

### Step 1: Create Configuration

Create `.claude/settings.json` in project root:

```bash
mkdir -p .claude
cat > .claude/settings.json << 'EOF'
{
  "extraKnownMarketplaces": {
    "team-tools": {
      "source": {
        "source": "github",
        "repo": "mycompany/team-tools"
      }
    }
  },
  "enabledPlugins": {
    "dev-workflow@team-tools": true
  }
}
EOF
```

### Step 2: Commit to Git

```bash
git add .claude/settings.json
git commit -m "Add automatic plugin configuration"
git push
```

### Step 3: Team Members Pull

```bash
git pull
# Claude Code automatically installs marketplace and plugins
```

### Step 4: Verify Installation

Team members check:

```bash
/plugin list
# Should see configured plugins
```

## Multiple Marketplaces

### Pattern 1: Company + Project Marketplaces

```json
{
  "extraKnownMarketplaces": {
    "company-wide": {
      "source": {
        "source": "github",
        "repo": "company/shared-tools"
      }
    },
    "project-specific": {
      "source": {
        "source": "directory",
        "path": "./"
      }
    }
  },
  "enabledPlugins": {
    "eslint-config@company-wide": true,
    "typescript-config@company-wide": true,
    "project-helpers@project-specific": true
  }
}
```

**Use case:**

- Company-wide standards
- Project-specific tools
- Mix of shared and local

### Pattern 2: Internal + External Marketplaces

```json
{
  "extraKnownMarketplaces": {
    "internal": {
      "source": {
        "source": "git",
        "url": "https://gitlab.company.com/tools/internal.git"
      }
    },
    "open-source": {
      "source": {
        "source": "github",
        "repo": "community/awesome-plugins"
      }
    }
  },
  "enabledPlugins": {
    "company-auth@internal": true,
    "generic-helpers@open-source": true
  }
}
```

**Use case:**

- Internal proprietary tools
- Public open source tools
- Mix of private and public

## Migration Scenarios

### From Manual Installation

**Before:**
Team members manually run:

```bash
/plugin marketplace add company/tools
/plugin install dev-tools@tools
```

**After:**
Add to `.claude/settings.json`:

```json
{
  "extraKnownMarketplaces": {
    "tools": {
      "source": {
        "source": "github",
        "repo": "company/tools"
      }
    }
  },
  "enabledPlugins": {
    "dev-tools@tools": true
  }
}
```

Team members:

```bash
git pull
# Automatic installation
```

### From External to Internal Marketplace

**Scenario:** Migrated superpowers to Chariot (like you just did)

**Before settings.json:**

```json
{
  "extraKnownMarketplaces": {
    "superpowers": {
      "source": {
        "source": "github",
        "repo": "obra/superpowers"
      }
    },
    "chariot": {
      "source": {
        "source": "directory",
        "path": "./"
      }
    }
  },
  "enabledPlugins": {
    "superpowers@superpowers": true,
    "chariot-development-platform@chariot": true
  }
}
```

**After settings.json:**

```json
{
  "extraKnownMarketplaces": {
    "chariot": {
      "source": {
        "source": "directory",
        "path": "./"
      }
    }
  },
  "enabledPlugins": {
    "chariot-development-platform@chariot": true
  }
}
```

All superpowers content now in Chariot plugin.

## Troubleshooting

### Plugins Not Auto-Installing

**Check settings.json location:**

```bash
ls .claude/settings.json
# Must be in project root .claude/ directory
```

**Verify JSON syntax:**

```bash
jq empty .claude/settings.json
# Should output nothing if valid
```

**Check working directory:**

```bash
pwd
# Must be in project root when starting Claude Code
```

**Verify marketplace access:**

- Private repos: Check GitHub access
- Git URLs: Verify credentials configured
- Directory paths: Confirm path is correct

### Wrong Plugins Installing

**Check plugin names:**

- Must match exactly in marketplace.json
- Case-sensitive
- Use `@marketplace-identifier` suffix

**Verify marketplace identifier:**

- Must match key in extraKnownMarketplaces
- Not the marketplace name from marketplace.json

**Example:**

```json
{
  "extraKnownMarketplaces": {
    "my-tools": {
      // ← This is the identifier
      "source": {
        "source": "github",
        "repo": "company/tools"
      }
    }
  },
  "enabledPlugins": {
    "plugin-name@my-tools": true // ← Use identifier, not marketplace name
  }
}
```

### Conflicts with Personal Settings

**User has different personal settings:**

Personal (`~/.claude/settings.json`):

```json
{
  "enabledPlugins": {
    "different-plugin@other-marketplace": true
  }
}
```

**Resolution:**

- Project settings take precedence for marketplaces
- Personal settings can add additional plugins
- Team configuration ensures minimum consistency

### Updates Not Applying

**Force update:**

```bash
/plugin marketplace update marketplace-name
/plugin uninstall plugin-name
/plugin install plugin-name@marketplace
```

**Clear cache:**

```bash
# Restart Claude Code
# Pull latest git changes
```

## Best Practices

### Version Control

**Always commit settings.json:**

```bash
git add .claude/settings.json
git commit -m "Update plugin configuration"
```

**Document changes:**

```markdown
# CHANGELOG.md

## 2024-01-15

- Added security-scanner plugin
- Updated dev-tools to v2.0.0
```

### Communication

**Notify team of changes:**

- Slack/Teams message when updating
- Pull request description
- Include migration steps if needed

**Breaking changes:**

```markdown
# Breaking Change: Plugin Update

## Action Required

1. Pull latest changes
2. Run: /plugin marketplace update team-tools
3. Restart Claude Code

## What Changed

- Removed deprecated helper-plugin
- Added new typescript-tools plugin
```

### Organization

**Group related plugins:**

```json
{
  "enabledPlugins": {
    "eslint-tools@company": true,
    "prettier-config@company": true,
    "typescript-helpers@company": true,

    "project-specific-tool@local": true
  }
}
```

**Document required plugins:**

```markdown
# Required Plugins

All team members must have:

- eslint-tools: Code linting
- security-scanner: Security checks
- typescript-helpers: TypeScript utilities

Configuration in `.claude/settings.json`
```

### Security

**Review before committing:**

- No hardcoded credentials
- No sensitive paths
- Public repos only for open source
- Verify marketplace sources

**Access control:**

- Use private repos for internal tools
- Document access requirements
- Regular security audits

## Advanced Patterns

### Conditional Configuration

**Different configs per branch:**

```json
{
  "extraKnownMarketplaces": {
    "dev-tools": {
      "source": {
        "source": "github",
        "repo": "company/dev-tools"
      }
    },
    "prod-tools": {
      "source": {
        "source": "github",
        "repo": "company/prod-tools"
      }
    }
  },
  "enabledPlugins": {
    "dev-helpers@dev-tools": true,
    "prod-validators@prod-tools": true
  }
}
```

Use different settings.json per branch.

### Monorepo Configuration

**Root settings.json:**

```json
{
  "extraKnownMarketplaces": {
    "shared": {
      "source": {
        "source": "directory",
        "path": "./shared-tools"
      }
    }
  },
  "enabledPlugins": {
    "shared-utilities@shared": true
  }
}
```

**Workspace-specific:**

```
monorepo/
├── .claude/settings.json (shared config)
├── shared-tools/
├── project-a/
│   └── .claude/settings.json (project-a specific)
└── project-b/
    └── .claude/settings.json (project-b specific)
```

## Summary

**Auto-install provides:**
✅ Zero manual configuration
✅ Consistent team setup
✅ Version controlled
✅ Single source of truth

**Setup steps:**

1. Create `.claude/settings.json` in project root
2. Define extraKnownMarketplaces
3. List enabledPlugins
4. Commit to git
5. Team pulls and Claude Code auto-installs

**Remember:**

- Use project settings (`.claude/`), not personal (`~/.claude/`)
- Marketplace identifier ≠ marketplace name
- Format: `plugin-name@marketplace-identifier`
- Commit settings.json to git
- Communicate changes to team

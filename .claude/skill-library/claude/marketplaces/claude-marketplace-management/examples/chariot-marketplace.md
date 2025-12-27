# Chariot Marketplace Example

Real-world example of the Chariot Development Platform marketplace configuration.

## Marketplace Structure

```
chariot-development-platform/
├── marketplace.json (implied, not in repo)
├── .claude/
│   ├── skills/ (87 skills total: 67 Chariot + 20 migrated from superpowers)
│   ├── commands/ (16 commands)
│   ├── agents/ (50+ agents)
│   ├── hooks/ (SessionStart hook)
│   └── lib/ (utility scripts)
├── plugin.json (in .claude-plugin/)
└── modules/ (submodules for platform components)
```

## Marketplace Configuration (implied)

If Chariot were distributed as a marketplace, marketplace.json would be:

```json
{
  "name": "chariot-development-platform",
  "owner": {
    "name": "Chariot Development Team",
    "email": "dev@praetorian.com"
  },
  "description": "Comprehensive development platform for Chariot security tools with 87 skills, 16 commands, 50+ agents, and automated workflows",
  "version": "1.0.0",
  "homepage": "https://github.com/praetorian-inc/chariot-development-platform",
  "repository": "https://github.com/praetorian-inc/chariot-development-platform",
  "license": "Proprietary",
  "plugins": [
    {
      "name": "chariot",
      "source": {
        "source": "directory",
        "path": "./"
      },
      "description": "Complete Chariot development platform with foundation skills, platform-specific patterns, agents, and workflows",
      "version": "1.0.0",
      "author": {
        "name": "Chariot Development Team",
        "email": "dev@praetorian.com"
      },
      "license": "Proprietary"
    }
  ]
}
```

## Team Configuration

Actual `.claude/settings.json` in Chariot repository:

```json
{
  "model": "sonnet[1m]",
  "env": {
    "BASH_DEFAULT_TIMEOUT_MS": "1800000",
    "BASH_MAX_TIMEOUT_MS": "1800000"
  },
  "permissions": {
    "allow": [
      "Bash(npm run test:*)",
      "Bash(git status)",
      "Bash(git diff :*)",
      "Bash(git add :*)",
      "Bash(pwd)",
      "Bash(ls :*)"
    ],
    "deny": ["Bash(rm -rf /)", "Bash(make deploy:*)", "Bash(make purge)"]
  },
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
  },
  "enableAllProjectMcpServers": false,
  "enabledMcpjsonServers": ["chariot", "chrome-devtools", "context7", "praetorian-cli"]
}
```

## Plugin Components

### Skills (87 total)

**Foundation Skills (20 - migrated from superpowers):**

- brainstorming
- debugging-systematically
- developing-with-tdd
- verifying-before-completion
- using-superpowers
- claude-skill-write
- writing-plans
- executing-plans
- (and 12 more)

**Platform-Specific Skills (67 - Chariot):**

- claude-agent-write
- claude-plugin-settings
- claude-marketplace-management
- chariot-brand-guidelines
- enforcing-information-architecture
- react-modernization
- tanstack-query
- (and 60 more)

### Commands (16)

- `/write-agent` - Create/update agents with TDD
- `/write-skill` - Create skills
- `/write-plugin` - Create plugins
- `/write-code` - Implement tasks with TDD
- `/design-code` - Multi-architect design
- `/test-code` - Validate changes
- `/security-review` - Security validation
- `/brainstorm` - Interactive design
- (and 8 more)

### Agents (50+)

**Quality Agents:**

- implementation-acceptance-validator
- test-quality-assessor
- test-coverage-auditor
- pattern-compliance-validator

**Development Agents:**

- react-developer
- go-developer
- python-developer
- integration-developer

**Architectural Agents:**

- react-architect
- go-architect
- database-neo4j-architect
- security-architect
- aws-architect

(and 35+ more specialized agents)

### Hooks

**SessionStart Hook:**

- Injects `using-superpowers` skill
- Provides MANDATORY FIRST RESPONSE PROTOCOL
- Enforces skill checking at session start

## Distribution Method

**Local marketplace:**

- Source: `directory` with path `./`
- Plugin in same repository as marketplace
- Team clones repository and gets everything

**Installation (for team members):**

```bash
git clone https://github.com/praetorian-inc/chariot-development-platform.git
cd chariot-development-platform
# Claude Code automatically loads plugin from .claude/settings.json
```

## Key Design Decisions

### Monorepo Pattern

**Everything in one repository:**

- All 87 skills
- All 16 commands
- All 50+ agents
- Hooks and utilities
- Platform documentation

**Benefits:**

- Single git clone
- Synchronized versions
- Unified documentation
- Simple CI/CD

### Directory Source

**Why local marketplace:**

- Development platform lives in project
- No external dependencies
- Fast iteration
- Complete control

### Skill Organization

**Flat structure in .claude/skills/:**

```
.claude/skills/
├── brainstorming/
├── debugging-systematically/
├── claude-agent-write/
├── enforcing-information-architecture/
└── (84 more skill directories)
```

**Not nested by category:**

- Easier discovery
- Simpler references
- No arbitrary categorization
- Standard across all skills

### Migration Strategy

**Internalized superpowers:**

- Copied all 20 foundation skills
- Removed external marketplace dependency
- Updated SessionStart hook
- Full ownership of all content

**Result:**

- 87 total skills (20 + 67)
- Zero external dependencies
- Complete customization capability
- Simplified team setup

## Team Workflow

### New Team Member Setup

```bash
# 1. Clone repository
git clone https://github.com/praetorian-inc/chariot-development-platform.git
cd chariot-development-platform

# 2. Open in Claude Code
# Settings automatically load from .claude/settings.json

# 3. Verify installation
# Should see all 87 skills, 16 commands, 50+ agents
```

**That's it!** No manual plugin installation needed.

### Skill Updates

**Developer updates skill:**

```bash
cd chariot-development-platform
# Edit .claude/skills/skill-name/SKILL.md
git add .claude/skills/skill-name/
git commit -m "Update skill-name skill"
git push
```

**Team members get updates:**

```bash
git pull
# Restart Claude Code to reload skills
```

### Adding New Skills

**Create skill:**

```bash
mkdir -p .claude/skills/new-skill
# Create SKILL.md and references
git add .claude/skills/new-skill/
git commit -m "Add new-skill"
git push
```

**Team automatically gets it:**

- Pull changes
- Restart Claude Code
- Skill available immediately

## Lessons Learned

### What Worked Well

✅ **Monorepo approach** - Single clone gets everything
✅ **Directory source** - No external dependencies
✅ **Flat skill structure** - Easy to find and reference
✅ **Auto-install via settings** - Zero manual config
✅ **Comprehensive documentation** - CLAUDE.md guides everything

### What We Changed

🔄 **Migrated superpowers** - Moved from external to internal
🔄 **Updated commands** - Added proper frontmatter
🔄 **SessionStart hook** - Customized for Chariot branding

### Best Practices Applied

✅ **Progressive disclosure** - Lean SKILL.md, detailed references/
✅ **Clear descriptions** - Specific trigger phrases for skill activation
✅ **Tool permissions** - Allowed-tools specified where needed
✅ **Version control** - Everything in git
✅ **Team coordination** - Settings.json for auto-install

## Metrics

**Before migration:**

- 67 Chariot skills
- Dependency on external superpowers marketplace
- 2 marketplaces to manage
- Manual configuration possible

**After migration:**

- 87 total skills (67 + 20)
- Zero external dependencies
- 1 marketplace (self-contained)
- Automatic configuration via settings.json

**Team experience:**

- Same functionality
- Simplified setup
- Faster onboarding
- More control

## Scalability

**Current state:**

- 87 skills, 16 commands, 50+ agents
- Repository size: manageable
- Clone time: reasonable
- Skill discovery: fast

**Future growth:**

- Can add unlimited skills/commands/agents
- Monorepo handles hundreds of components
- Git scales well for this use case
- No technical limitation reached

## Security

**Internal distribution:**

- Private GitHub repository
- Team has access via organization membership
- No public marketplace exposure
- Full code review before merging

**Content vetting:**

- All skills reviewed before commit
- Superpowers code reviewed during migration
- Hooks audited for security
- No external code execution without review

## Conclusion

The Chariot marketplace demonstrates:

- Successful monorepo marketplace pattern
- Effective skill organization
- Zero-config team setup
- Complete platform ownership
- Scalable architecture for growth

This is the real-world example this skill was built from!

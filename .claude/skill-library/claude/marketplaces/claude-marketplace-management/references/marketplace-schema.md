# Marketplace JSON Schema Reference

Complete specification for marketplace.json structure.

## Schema Overview

```json
{
  "name": "string (required)",
  "owner": {
    "name": "string (required)",
    "email": "string (required)"
  },
  "description": "string (optional)",
  "version": "string (optional)",
  "homepage": "string (optional)",
  "repository": "string (optional)",
  "license": "string (optional)",
  "plugins": [
    {
      "name": "string (required)",
      "source": {
        "source": "directory|github|git (required)",
        "path": "string (for directory)",
        "repo": "string (for github)",
        "url": "string (for git)"
      },
      "description": "string (optional)",
      "version": "string (optional)",
      "author": {
        "name": "string (optional)",
        "email": "string (optional)"
      },
      "license": "string (optional)"
    }
  ]
}
```

## Required Fields

### Marketplace Level

**name** (string)
- Kebab-case identifier for the marketplace
- Used in commands: `/plugin install plugin-name@marketplace-name`
- Must be unique across marketplaces user has installed
- Examples: `chariot`, `my-company-tools`, `team-plugins`

**owner.name** (string)
- Name of marketplace maintainer
- Can be individual or organization
- Examples: `"Chariot Team"`, `"Praetorian Inc"`, `"Jane Doe"`

**owner.email** (string)
- Contact email for marketplace maintainer
- Used for support and inquiries
- Examples: `"team@example.com"`, `"maintainer@company.com"`

**plugins** (array)
- Array of plugin entry objects
- Can be empty array for new marketplace
- Each entry must have `name` and `source`

## Optional Marketplace Fields

**description** (string)
- Brief description of marketplace purpose
- Displayed in marketplace listings
- Example: `"Chariot platform development tools and workflows"`

**version** (string)
- Semantic version of marketplace
- Format: `"1.0.0"`, `"2.3.1-beta"`
- Not enforced by system, but useful for tracking

**homepage** (string)
- URL to marketplace documentation or homepage
- Example: `"https://github.com/owner/marketplace"`

**repository** (string)
- URL to source repository
- Example: `"https://github.com/owner/marketplace"`

**license** (string)
- License for marketplace content
- Examples: `"MIT"`, `"Apache-2.0"`, `"Proprietary"`

## Plugin Entry Required Fields

**name** (string)
- Kebab-case plugin identifier
- Must be unique within marketplace
- Examples: `"eslint-checker"`, `"db-tools"`, `"ui-components"`

**source** (object)
- Defines where plugin content is located
- Must specify `source` type and corresponding location field

### Source Types

**directory** - Plugin in same repository
```json
{
  "source": "directory",
  "path": "./relative/path/to/plugin"
}
```
- Use for plugins bundled with marketplace
- Path is relative to marketplace.json location
- Most common for team marketplaces

**github** - Plugin in GitHub repository
```json
{
  "source": "github",
  "repo": "owner/repo-name"
}
```
- Use for plugins in separate GitHub repos
- Standard GitHub owner/repo format
- Claude Code handles authentication

**git** - Plugin in any git repository
```json
{
  "source": "git",
  "url": "https://gitlab.com/owner/repo.git"
}
```
- Use for GitLab, Bitbucket, custom git servers
- Full git URL required
- Must be accessible to users

## Plugin Entry Optional Fields

**description** (string)
- Brief description of plugin functionality
- Displayed in plugin listings
- Example: `"Automated ESLint checking and fixing for TypeScript projects"`

**version** (string)
- Semantic version of plugin
- Useful for tracking updates
- Example: `"1.2.0"`, `"0.5.0-alpha"`

**author.name** (string)
- Plugin author name
- Can differ from marketplace owner
- Example: `"Development Team"`, `"John Smith"`

**author.email** (string)
- Plugin author contact
- Example: `"dev@company.com"`

**license** (string)
- License for plugin code
- Examples: `"MIT"`, `"BSD-3-Clause"`

## Complete Example

```json
{
  "name": "chariot-development-platform",
  "owner": {
    "name": "Chariot Team",
    "email": "dev@praetorian.com"
  },
  "description": "Chariot platform development tools, skills, agents, and workflows",
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
      "description": "Complete Chariot development platform with 87 skills, commands, agents, and hooks",
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

## Validation

**Common errors:**
- Missing required fields (`name`, `owner`, `plugins`)
- Invalid JSON syntax (trailing commas, missing quotes)
- Incorrect source type (typo in `source` field)
- Invalid path/URL in source
- Duplicate plugin names in plugins array

**Validation checklist:**
1. ✅ Valid JSON syntax
2. ✅ All required fields present
3. ✅ Kebab-case names
4. ✅ Valid email formats
5. ✅ Source paths/URLs accessible
6. ✅ No duplicate plugin names
7. ✅ Semantic versioning format (if used)

## Best Practices

**Naming:**
- Use descriptive marketplace names
- Follow kebab-case convention
- Include company/team identifier
- Example: `acme-engineering-tools`, not just `tools`

**Documentation:**
- Include description for marketplace
- Add descriptions to all plugins
- Document version changes
- Link to homepage/repository

**Organization:**
- Group related plugins in one marketplace
- Use semantic versioning
- Maintain changelog
- Test changes before publishing

**Security:**
- Only reference trusted repositories
- Review plugin code before adding
- Use HTTPS for git URLs
- Document access requirements

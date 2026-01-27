# Salesforce MCP Server Setup Guide

**Purpose**: Configure Salesforce MCP server to use SF CLI authentication for seamless access to Salesforce data.

**Last Updated**: 2026-01-16

---

## Quick Start (5 minutes)

```bash
# 1. Authenticate with Salesforce
sf org login web --alias my-org

# 2. Verify connection
sf org display

# 3. Test MCP server
npx -y @salesforce/mcp@latest --version

# 4. Done! The wrappers will automatically use your SF CLI session
```

---

## Prerequisites

### Required Tools

| Tool | Purpose | Installation |
|------|---------|--------------|
| **Salesforce CLI (sf)** | Authenticate with Salesforce | `npm install -g @salesforce/cli` |
| **Node.js 18+** | Run MCP server | [nodejs.org](https://nodejs.org) |
| **Salesforce Account** | Access to a Salesforce org | Free developer edition at [developer.salesforce.com](https://developer.salesforce.com) |

---

## Step 1: Install Salesforce CLI

```bash
# Install globally
npm install -g @salesforce/cli

# Verify installation
sf --version
```

**Expected output**:
```
@salesforce/cli/2.x.x darwin-arm64 node-v20.x.x
```

---

## Step 2: Authenticate with Salesforce

### Option A: Web Browser Authentication (Recommended)

```bash
# Login with default browser (creates oauth session)
sf org login web --alias my-org

# Or specify a custom login URL for sandboxes
sf org login web --alias my-sandbox --instance-url https://test.salesforce.com
```

**What happens**:
1. Browser opens to Salesforce login page
2. Enter your Salesforce username and password
3. Approve OAuth access
4. CLI stores session in `~/.sf/`

### Option B: JWT Bearer Flow (CI/CD)

```bash
# For automated environments
sf org login jwt \
  --client-id YOUR_CONNECTED_APP_CLIENT_ID \
  --jwt-key-file path/to/server.key \
  --username your.username@domain.com \
  --alias ci-org
```

---

## Step 3: Verify Authentication

```bash
# List all authenticated orgs
sf org list --all

# Display current default org details
sf org display

# Test a SOQL query
sf data query --query "SELECT Id, Name FROM Account LIMIT 5"
```

**Expected output**:
```
┌────┬────────┬───────────┬────────────────────────┬──────────────────┬───────────┐
│    │ Type   │ Alias     │ Username               │ Org Id           │ Status    │
├────┼────────┼───────────┼────────────────────────┼──────────────────┼───────────┤
│ 🍁 │ DevHub │ my-org    │ your.email@domain.com  │ 00D...           │ Connected │
└────┴────────┴───────────┴────────────────────────┴──────────────────┴───────────┘
```

---

## Step 4: Configure MCP Server

The MCP server is already configured in `.mcp.json`:

```json
{
  "mcpServers": {
    "salesforce": {
      "command": "npx",
      "args": [
        "-y",
        "@salesforce/mcp@latest",
        "--orgs",
        "DEFAULT_TARGET_ORG",
        "--toolsets",
        "all"
      ],
      "env": {}
    }
  }
}
```

**How it works**:
- `DEFAULT_TARGET_ORG` dynamically uses your SF CLI's default org (no hardcoded usernames)
- MCP server uses SF CLI's stored credentials from `~/.sf/`
- No tokens, passwords, or usernames in config files
- Works for any developer - automatically adapts to their local SF CLI configuration
- Automatically uses your default org (or specify with `targetOrg` in wrapper calls)

---

## Step 5: Test the MCP Server

### Test 1: Check MCP Server Version

```bash
npx -y @salesforce/mcp@latest --version
```

### Test 2: Run a Query via Wrapper

```typescript
import { runSoqlQuery } from '.claude/tools/salesforce/run-soql-query.js';

const result = await runSoqlQuery.execute({
  query: "SELECT Id, Name FROM Account LIMIT 10"
});

console.log(result);
```

### Test 3: Use Natural Language

Ask Claude:
> "What opportunities do we have open that are expected to close this week?"

Claude will translate this to SOQL and use the wrapper.

---

## Multiple Org Management

### Scenario: Work with Sandbox and Production

```bash
# Login to production
sf org login web --alias prod --set-default

# Login to sandbox
sf org login web --alias sandbox --instance-url https://test.salesforce.com

# Switch default org
sf config set target-org sandbox

# Or specify org per query
sf data query --query "SELECT Id FROM Account" --target-org prod
```

### In Wrapper Calls

```typescript
// Use default org
runSoqlQuery.execute({ query: "SELECT Id FROM Account" });

// Specify non-default org
runSoqlQuery.execute({
  query: "SELECT Id FROM Account",
  targetOrg: "sandbox"  // Uses org alias
});
```

---

## Credential Management

### Where Credentials Are Stored

```
~/.sf/
├── config.json           # Default org, API version
├── alias.json            # Org aliases (prod, sandbox, etc.)
└── <username>@<domain>.json  # OAuth tokens per org
```

### Security Best Practices

✅ **DO**:
- Use OAuth web flow (most secure)
- Set org aliases for easy switching
- Rotate credentials regularly
- Use separate orgs for dev/test/prod

❌ **DON'T**:
- Commit `.sf/` directory to git (already in `.gitignore`)
- Share `~/.sf/` files (contain access tokens)
- Use production credentials for testing

---

## Troubleshooting

### Issue: "No default dev hub found"

**Solution**: Set a default org
```bash
sf config set target-org my-org
```

### Issue: "Session expired"

**Solution**: Re-authenticate
```bash
sf org login web --alias my-org
```

### Issue: "INVALID_SESSION_ID"

**Solution**: Org auth expired, login again
```bash
sf org logout --target-org my-org
sf org login web --alias my-org
```

### Issue: MCP server not found

**Solution**: Install the package
```bash
npm install -g @salesforce/mcp
# Or let npx auto-install: npx -y @salesforce/mcp@latest
```

### Issue: Query returns "No results"

**Solution**: Verify org has data
```bash
sf data query --query "SELECT COUNT() FROM Account"
```

---

## CI/CD Setup

For automated environments (GitHub Actions, Jenkins, etc.):

### Option 1: JWT Bearer Flow

```yaml
# .github/workflows/test.yml
- name: Authenticate Salesforce
  run: |
    sf org login jwt \
      --client-id ${{ secrets.SF_CLIENT_ID }} \
      --jwt-key-file ${{ secrets.SF_JWT_KEY }} \
      --username ${{ secrets.SF_USERNAME }} \
      --alias ci-org \
      --set-default
```

### Option 2: SFDX Auth URL

```yaml
- name: Authenticate Salesforce
  run: |
    echo ${{ secrets.SFDX_AUTH_URL }} > auth.txt
    sf org login sfdx-url --sfdx-url-file auth.txt --alias ci-org
```

**Generate SFDX Auth URL**:
```bash
sf org display --target-org my-org --verbose --json | jq -r .result.sfdxAuthUrl
```

---

## Updating Credentials

### Scenario: User Changes Password

```bash
# Logout old session
sf org logout --target-org my-org

# Login with new password
sf org login web --alias my-org
```

### Scenario: Switch to Different Org

```bash
# Add new org
sf org login web --alias new-org --set-default

# List all orgs
sf org list

# Remove old org (optional)
sf org logout --target-org old-org
```

---

## Environment Variables (Optional)

You can override the default org per MCP server instance:

```json
{
  "mcpServers": {
    "salesforce-prod": {
      "command": "npx",
      "args": ["-y", "@salesforce/mcp@latest"],
      "env": {
        "SF_TARGET_ORG": "prod"
      }
    },
    "salesforce-sandbox": {
      "command": "npx",
      "args": ["-y", "@salesforce/mcp@latest"],
      "env": {
        "SF_TARGET_ORG": "sandbox"
      }
    }
  }
}
```

**Supported Environment Variables**:
| Variable | Purpose | Example |
|----------|---------|---------|
| `SF_TARGET_ORG` | Override default org | `"prod"` |
| `SF_API_VERSION` | Override API version | `"65.0"` |
| `SF_LOG_LEVEL` | Logging verbosity | `"debug"` |

---

## Testing Your Setup

Run this checklist to verify everything works:

```bash
# ✅ SF CLI installed
sf --version

# ✅ Authenticated to Salesforce
sf org display

# ✅ Can query data
sf data query --query "SELECT Id FROM Account LIMIT 1"

# ✅ MCP server available
npx -y @salesforce/mcp@latest --version

# ✅ Wrapper test passes
cd .claude && npm run test:run tools/salesforce/run-soql-query.unit.test.ts
```

**All checks passed?** You're ready to use the Salesforce MCP wrappers!

---

## Next Steps

1. **Read the Test Plan**: `.claude/tools/salesforce/TEST-PLAN.md`
2. **Try Example Queries**: See `TEST-PLAN.md` for 7 user scenarios
3. **Review Security**: Wrappers block SOQL injection automatically
4. **Explore Wrappers**: 9 wrappers available (run-soql-query, list-orgs, deploy-metadata, etc.)

---

## Support

- **Salesforce CLI Docs**: https://developer.salesforce.com/docs/atlas.en-us.sfdx_cli_reference.meta/
- **MCP Server Issues**: https://github.com/salesforce/mcp/issues
- **Wrapper Issues**: Open issue in this repository

---

## Changelog

- **2026-01-16**: Initial setup guide with SF CLI authentication

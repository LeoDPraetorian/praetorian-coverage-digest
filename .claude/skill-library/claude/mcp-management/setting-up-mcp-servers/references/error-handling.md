# Error Handling

**Comprehensive error handling patterns for MCP server setup.**

## Search Failures

### WebSearch Returns No Results

**Scenario:** WebSearch doesn't find the MCP package.

**Handling:**

1. Ask user to provide GitHub URL directly via AskUserQuestion
2. If user doesn't know URL, ask them to describe the MCP:
   - What does it do?
   - Who makes it?
   - Where did they hear about it?
3. Use additional searches with broader terms

**Example:**

```typescript
AskUserQuestion({
  questions: [
    {
      header: "GitHub URL",
      question: "Search did not find the MCP. Do you have a GitHub URL or more details?",
      multiSelect: false,
      options: [
        { label: "Provide GitHub URL", description: "I know the repository URL" },
        { label: "Provide more context", description: "Let me describe the MCP in more detail" },
        { label: "Skip setup", description: "I will configure it manually" },
      ],
    },
  ],
});
```

### WebFetch Fails to Access GitHub

**Scenario:** GitHub repository is private or doesn't exist.

**Handling:**

1. Confirm URL is correct with user
2. Check if repository requires authentication
3. Ask if they have the MCP locally already

**Example:**

```
Error: Cannot access https://github.com/org/repo - 404 Not Found

Options:
- Verify URL spelling
- Check if repo is private (requires git clone)
- Point to local directory if already downloaded
```

## Package Detection Failures

### Cannot Determine Package Type

**Scenario:** Repository has no `package.json`, `pyproject.toml`, or `go.mod`.

**Handling:**

1. Ask user directly what type of MCP it is
2. Provide language clues from file extensions
3. Default to npm if unclear

**Example:**

```typescript
AskUserQuestion({
  questions: [
    {
      header: "Package Type",
      question: "Cannot determine MCP package type. What language is it written in?",
      multiSelect: false,
      options: [
        { label: "Node.js/TypeScript (npm)", description: "JavaScript/TypeScript MCP" },
        { label: "Python (uvx)", description: "Python MCP" },
        { label: "Go", description: "Go MCP" },
        { label: "Other", description: "Different language or unsure" },
      ],
    },
  ],
});
```

### Ambiguous Package Type

**Scenario:** Repository has both `package.json` and `pyproject.toml`.

**Handling:**

1. Check which has MCP-related scripts/dependencies
2. Look for `start-mcp-server` command
3. Ask user which one to use

## Verification Failures

### MCP Command Fails

**Scenario:** Test command exits with error.

**Error output:**

```bash
$ npx -y @package/name --help
Error: MODULE_NOT_FOUND
```

**Handling:**

1. **Do not fail** - save config anyway with warning
2. Note in output: `verificationPassed: false`
3. Include error details in `notes` field
4. Suggest user verify manually

**Example output:**

```json
{
  "status": "configured",
  "mcpName": "example",
  "verificationPassed": false,
  "notes": "Config saved but verification failed with: MODULE_NOT_FOUND. Please verify manually: npx -y @package/name --help"
}
```

### Timeout During Verification

**Scenario:** MCP command hangs and times out.

**Handling:**

1. Save config with warning
2. Note timeout in output
3. Suggest increasing timeout or checking network

**Example:**

```json
{
  "status": "configured",
  "verificationPassed": false,
  "notes": "Command timed out after 10s. MCP may still work but requires network access or longer startup time."
}
```

## Configuration Failures

### Cannot Edit mcp-client.ts

**Scenario:** Edit tool fails (file locked, syntax error, etc.).

**Handling:**

1. Provide the exact config block for manual addition
2. Include line-by-line instructions
3. Don't fail the entire operation

**Example output:**

```
Could not automatically edit mcp-client.ts.

Please add this config manually:

1. Open: .claude/tools/config/lib/mcp-client.ts
2. Find the 'configs' object (around line 15)
3. Add before the closing brace:

  'example-mcp': {
    command: 'npx',
    args: ['-y', '@example/mcp'],
    envVars: {}
  },

4. Save the file
```

### Invalid JSON in credentials.json

**Scenario:** credentials.json is malformed or missing.

**Handling:**

1. Create credentials.json if missing
2. If malformed, show current content and ask user to fix
3. Provide valid JSON structure

**Example:**

```json
// Current credentials.json is invalid JSON
// Expected structure:

{
  "apiKey": "your-key-here",
  "anotherKey": "another-value"
}

// Please fix manually, then re-run skill
```

## 1Password Credential Errors

### Error: 'not_configured' from SecretsProvider

**Cause:** Service not found in 1Password serviceItems or item doesn't exist in vault.

**Fix:**

1. Verify service is in `.claude/tools/1password/lib/config.ts` serviceItems
2. Verify item exists in 1Password vault 'Claude Code Tools'
3. Verify item name matches exactly

**Example:**

```
Error: Service 'new-service' not configured in 1Password

Steps to fix:
1. Check .claude/tools/1password/lib/config.ts contains:
   serviceItems: {
     'new-service': 'New Service API Key'
   }
2. Open 1Password and verify item 'New Service API Key' exists in vault 'Claude Code Tools'
3. Verify the item has a 'password' field with the API key
```

### Error: 'auth_required' from 1Password

**Cause:** 1Password CLI requires biometric authentication.

**Fix:** User will be prompted for biometric auth. This is expected on first access.

**Example:**

```
Error: 1Password requires authentication

This is normal behavior. 1Password will prompt for biometric authentication (Touch ID/Face ID).
Authenticate when prompted, then retry the operation.
```

## User Interruptions

### User Selects "Skip Setup"

**Scenario:** User chooses to configure manually.

**Handling:**

1. Return status: `'skipped'`
2. Provide documentation on manual setup
3. Exit gracefully

**Example output:**

```json
{
  "status": "skipped",
  "mcpName": "example",
  "notes": "User chose to configure manually. See .claude/tools/config/lib/mcp-client.ts for config format."
}
```

### User Provides Invalid Input

**Scenario:** User enters malformed URL or path.

**Handling:**

1. Validate input format
2. Show clear error message
3. Re-prompt with examples

**Example:**

```
Invalid GitHub URL format: "github/org/repo"

Expected format: https://github.com/org/repo

Please try again with a valid URL.
```

## Recovery Strategies

### Partial Configuration

If some steps succeed but others fail:

1. **Save what worked** - don't roll back successful edits
2. **Document what failed** - clear notes in output
3. **Provide next steps** - tell user what to do manually

### Rollback Not Supported

**This skill does not rollback changes.** If configuration is added to `mcp-client.ts`, it stays there even if verification fails.

**Rationale:** Config might work in production even if verification fails (network issues, timeout, etc.).

**User can manually remove** if needed.

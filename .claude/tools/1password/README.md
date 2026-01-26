# 1Password CLI Wrapper

Secure credential access for Claude Code via biometric-authenticated 1Password CLI.

## Features

- **No secrets on disk** - Biometric required for each session
- **User approval** - Touch ID/YubiKey confirmation for access
- **Vault scoping** - Dedicated vault limits what Claude can access
- **Audit trail** - 1Password logs all access

## Setup

### 1. Install 1Password CLI

```bash
brew install --cask 1password-cli
```

### 2. Enable CLI Integration

1. Open 1Password desktop app
2. Go to Settings > Developer
3. Enable "Connect with 1Password CLI"

### 3. Create Vault

Create a vault named "Claude Code Tools" in 1Password for secrets Claude should access.

### 4. Add Secrets

Add items to the vault (e.g., "GitHub Token", "Database Credentials").

## Tools

### read-secret

Retrieve a single secret value.

```typescript
import { readSecret } from './.claude/tools/1password';

const result = await readSecret.execute({
  item: 'GitHub Token',
  field: 'token'  // defaults to 'password'
});
// → { value: 'ghp_xxx...', item: 'GitHub Token', field: 'token' }
```

### list-items

List all items in the vault.

```typescript
import { listItems } from './.claude/tools/1password';

const items = await listItems.execute({});
// → [{ id: 'abc', name: 'GitHub Token', category: 'API_CREDENTIAL', fields: ['token'] }]
```

### get-item

Get full details of an item.

```typescript
import { getItem } from './.claude/tools/1password';

const item = await getItem.execute({ item: 'Database' });
// → { id: 'abc', name: 'Database', category: 'DATABASE', fields: { host: '...', password: '...' } }
```

### run-with-secrets

Run command with secrets injected.

```typescript
import { runWithSecrets } from './.claude/tools/1password';

const result = await runWithSecrets.execute({
  command: 'npm',
  args: ['run', 'deploy'],
  envFile: '.claude/tools/1password/secrets.env'  // default
});
// → { stdout: '...', stderr: '', exitCode: 0 }
```

## Configuration

### Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `OP_ACCOUNT` | (none) | Account URL (required if multiple accounts configured). Example: `praetorianlabs.1password.com` |
| `OP_VAULT_NAME` | "Claude Code Tools" | Vault to use for all operations |

### Multi-Account Setup

If you have multiple 1Password accounts configured, you must specify which account to use:

```bash
# Add to your shell profile (~/.zshrc or ~/.bashrc)
export OP_ACCOUNT=praetorianlabs.1password.com
```

To find your account URL:

```bash
op account list
```

## Security Model

1. **Biometric Authentication**: Every `op` command triggers Touch ID/YubiKey prompt
2. **10-minute Session**: Authentication session auto-refreshes on activity
3. **Vault Scoping**: Only secrets in configured vault are accessible
4. **No Disk Storage**: No tokens or secrets stored on disk

## Error Handling

| Error Code | Description |
|------------|-------------|
| `AUTH_REQUIRED` | Biometric authentication needed |
| `NOT_SIGNED_IN` | CLI not connected to desktop app |
| `ITEM_NOT_FOUND` | Item doesn't exist in vault |
| `VAULT_NOT_FOUND` | Vault doesn't exist or not accessible |
| `TIMEOUT` | Operation timed out |

## References

- [1Password CLI Documentation](https://developer.1password.com/docs/cli/)
- [Biometric Unlock](https://developer.1password.com/docs/cli/about-biometric-unlock/)
- [Secret Reference Syntax](https://developer.1password.com/docs/cli/secret-reference-syntax/)

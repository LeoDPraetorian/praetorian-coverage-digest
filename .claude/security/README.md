# Security Sandbox Configurations

Lightweight sandbox configurations for secure MCP code execution.

## Platform Support

- **Linux**: `bubblewrap.conf` (bubblewrap)
- **macOS**: `seatbelt.sb` (sandbox-exec)

## Usage

### Linux (bubblewrap)

```bash
# Install bubblewrap (if not already installed)
# Ubuntu/Debian: sudo apt-get install bubblewrap
# Fedora: sudo dnf install bubblewrap
# Arch: sudo pacman -S bubblewrap

# Run script in sandbox
bash .claude/security/bubblewrap.conf node script.js

# Or make executable and use directly
chmod +x .claude/security/bubblewrap.conf
./.claude/security/bubblewrap.conf node script.js
```

### macOS (seatbelt)

```bash
# Run script in sandbox
sandbox-exec \
  -D WORKSPACE="$(pwd)/.claude/tools" \
  -f .claude/security/seatbelt.sb \
  node script.js
```

## Security Features

Both configurations provide:

✅ **Filesystem isolation**

- Read-only access to system files
- Blocked: `~/.ssh`, `~/.aws`, `~/.config`, `/etc/passwd`
- Allowed: `.claude/tools/` (read-only)
- Allowed: `/tmp/` (read-write)

✅ **Network isolation**

- Complete network blocking (`--unshare-net` / `deny network*`)
- Prevents metadata service access
- Prevents private network access

✅ **Process isolation**

- Sandboxed processes only
- Die with parent process
- No privilege escalation

✅ **Resource limits**

- Combine with `timeout` for execution limits
- Combine with `ulimit` for memory limits

## Testing Security

### Test Blocked Paths

```bash
# Should fail: accessing .ssh
bash .claude/security/bubblewrap.conf node -e \
  "require('fs').readFileSync(process.env.HOME + '/.ssh/id_rsa')"

# Should succeed: accessing workspace
bash .claude/security/bubblewrap.conf node -e \
  "require('fs').readFileSync('.claude/tools/context7/README.md')"
```

### Test Network Isolation

```bash
# Should fail: network access blocked
bash .claude/security/bubblewrap.conf node -e \
  "require('https').get('https://example.com')"
```

## Adding Resource Limits

### Linux (with timeout and cgroups)

```bash
# 30 second timeout
timeout 30 bash .claude/security/bubblewrap.conf node script.js

# Memory limit (requires cgroups)
cgexec -g memory:sandbox bash .claude/security/bubblewrap.conf node script.js
```

### macOS (with ulimit)

```bash
# Set limits before sandbox-exec
ulimit -t 30      # CPU time: 30 seconds
ulimit -v 524288  # Virtual memory: 512MB
ulimit -n 100     # File descriptors: 100

sandbox-exec -D WORKSPACE="$(pwd)/.claude/tools" \
  -f .claude/security/seatbelt.sb \
  node script.js
```

## Customization

### Allow Additional Paths

**Linux (bubblewrap.conf):**

```bash
--ro-bind /path/to/allow /path/to/allow
```

**macOS (seatbelt.sb):**

```scheme
(allow file-read*
  (subpath "/path/to/allow"))
```

### Allow Network (Not Recommended)

**Linux:** Remove `--unshare-net` line
**macOS:** Remove `(deny network*)` line

## Troubleshooting

**Issue: "Permission denied"**

- Check file ownership matches sandbox user
- Verify directory exists and is readable
- macOS: Ensure `$WORKSPACE` parameter is set

**Issue: "Command not found: node"**

- Verify Node.js is installed
- Check Node.js path matches config
- macOS: Update path in `(allow process-exec)` section

**Issue: Sandbox blocking legitimate files**

- Add path to allowlist in config
- Check symbolic links (may be blocked)

## Security Best Practices

1. **Test thoroughly** - Verify sandbox blocks work before trusting it
2. **Deny by default** - Only allow what's explicitly needed
3. **Monitor execution** - Log all sandbox usage for audit
4. **Update regularly** - Keep bubblewrap/seatbelt configs current
5. **Layer defenses** - Combine with input validation and monitoring

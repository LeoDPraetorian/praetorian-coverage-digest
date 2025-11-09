# Security and Sandboxing for MCP Code Execution

Complete security requirements and sandboxing configuration for safe code execution environments.

## Security Threat Model

### Attack Vectors

**Malicious Code Injection:**
- Agent writes malicious code intentionally or via prompt injection
- Code attempts to access filesystem beyond allowed paths
- Code tries to exfiltrate data or open reverse shells

**Resource Exhaustion:**
- Infinite loops consuming CPU
- Memory allocation attacks
- Disk space filling attacks
- Network flooding

**Privilege Escalation:**
- Attempts to break out of sandbox
- Container escape vulnerabilities
- Kernel exploits

**Data Leakage:**
- Sensitive data exposed through logs
- Environment variables containing secrets
- Unintended network connections

## Required Security Layers

### Layer 1: Execution Isolation

**Container-Based Isolation (Recommended):**

```yaml
# Docker container configuration
services:
  mcp-executor:
    image: mcp-execution-env:latest
    security_opt:
      - no-new-privileges:true
      - seccomp:unconfined
    read_only: true  # Read-only root filesystem
    tmpfs:
      - /tmp:rw,noexec,nosuid,size=1g
      - /workspace:rw,noexec,nosuid,size=5g
    cap_drop:
      - ALL  # Drop all capabilities
    cap_add:
      - NET_BIND_SERVICE  # Only if needed
    user: "1000:1000"  # Non-root user
    network_mode: bridge  # Restricted network
```

**Virtual Machine Isolation (Maximum Security):**
- Separate VM per execution
- Snapshot and restore for quick resets
- Full OS-level isolation
- Higher overhead but strongest security

### Layer 2: Resource Limits

**CPU Limits:**
```yaml
resources:
  limits:
    cpus: '0.5'      # 50% of one CPU core
    cpu_shares: 512  # Relative CPU priority
```

**Memory Limits:**
```yaml
resources:
  limits:
    memory: 512M      # Hard memory limit
    memory_swap: 0    # Disable swap
```

**Disk Limits:**
```bash
# Use disk quotas
setquota -u executor 5G 5G 0 0 /workspace
```

**Network Limits:**
```bash
# Rate limiting with iptables
iptables -A OUTPUT -m owner --uid-owner executor -m limit --limit 100/sec -j ACCEPT
iptables -A OUTPUT -m owner --uid-owner executor -j DROP
```

**Execution Timeout:**
```typescript
// Kill execution after timeout
const timeout = setTimeout(() => {
  process.kill(executionPid, 'SIGKILL');
}, 30000); // 30 second timeout
```

### Layer 3: Filesystem Restrictions

**Read-Only Root:**
```bash
# Mount root filesystem as read-only
docker run --read-only ...
```

**Restricted Workspace:**
```bash
# Only allow writes to specific directories
/workspace/          # Agent working directory (RW)
/workspace/data/     # Downloaded files (RW)
/workspace/results/  # Outputs (RW)
/servers/            # MCP tool definitions (RO)
/skills/             # Skill libraries (RO)
```

**Path Validation:**
```typescript
function validatePath(requestedPath: string): boolean {
  const normalized = path.normalize(requestedPath);
  const allowed = ['/workspace/', '/servers/', '/skills/'];

  return allowed.some(prefix => normalized.startsWith(prefix));
}
```

### Layer 4: Network Restrictions

**Whitelist Approach:**
```bash
# Default deny all
iptables -P OUTPUT DROP

# Allow only specific MCP server endpoints
iptables -A OUTPUT -d <mcp-server-ip> -j ACCEPT

# Allow DNS
iptables -A OUTPUT -p udp --dport 53 -j ACCEPT

# Block all other connections
iptables -A OUTPUT -j DROP
```

**Proxy Configuration:**
```typescript
// Route through monitoring proxy
const agent = new https.Agent({
  proxy: 'http://monitor-proxy:3128',
  rejectUnauthorized: true
});
```

### Layer 5: Monitoring and Auditing

**Execution Logging:**
```typescript
interface ExecutionLog {
  executionId: string;
  timestamp: Date;
  code: string;              // Code being executed
  filesAccessed: string[];   // All file operations
  networkCalls: NetworkCall[]; // All network requests
  resourceUsage: {
    cpuTime: number;
    memoryPeak: number;
    diskWrites: number;
  };
  exitCode: number;
  errors?: string[];
}
```

**Real-time Monitoring:**
```typescript
// Monitor for suspicious patterns
const suspiciousPatterns = [
  /eval\(/,                    // Dynamic code evaluation
  /child_process/,             // Process spawning
  /require\(['"]fs['"]\)/,     // Filesystem access
  /\$\{.*\}/,                  // Template injection
  /fetch\(['"]http:/,          // Non-HTTPS requests
];

function scanCode(code: string): SecurityAlert[] {
  const alerts: SecurityAlert[] = [];

  for (const pattern of suspiciousPatterns) {
    if (pattern.test(code)) {
      alerts.push({
        severity: 'high',
        pattern: pattern.source,
        message: 'Suspicious pattern detected'
      });
    }
  }

  return alerts;
}
```

## Security Best Practices

### Code Scanning Before Execution

**Static Analysis:**
```typescript
// Scan before execution
const scanResult = await scanCode(agentCode);

if (scanResult.some(alert => alert.severity === 'high')) {
  throw new SecurityError('High-severity security alert');
}
```

**Allowed Operations:**
- Read from `/servers/`, `/skills/`
- Write to `/workspace/`
- Network requests to whitelisted domains
- File operations within quota

**Blocked Operations:**
- `eval()`, `Function()` constructors
- `child_process` spawning
- Access to parent filesystem
- Arbitrary network connections

### Secrets Management

**Never expose secrets directly:**
```typescript
// ❌ BAD - Secret in environment
process.env.API_KEY = "secret-key-12345";

// ✅ GOOD - Secret broker pattern
const secret = await secretBroker.getSecret('mcp-server-api-key');
// Secret broker validates execution context before returning
```

**Tokenization for Privacy:**
```typescript
// Tokenize sensitive data before processing
const sensitiveData = extractEmails(document);
const tokenMap = tokenizer.tokenize(sensitiveData);

// Pass tokens instead of actual data
await processWithTokens(tokenMap.tokens);

// Detokenize only when needed with proper authorization
const original = tokenizer.detokenize(token, {
  requestingUser: executionContext.user,
  purpose: 'salesforce-integration'
});
```

### Session Cleanup

**Post-Execution Cleanup:**
```typescript
async function cleanup(executionId: string) {
  // Kill any remaining processes
  await killProcessGroup(executionId);

  // Clear workspace
  await fs.rm(`/workspace/${executionId}`, { recursive: true });

  // Reset container to pristine state
  await container.reset();

  // Archive logs
  await archiveLogs(executionId);
}
```

## Security Checklist

**Before Deployment:**
- [ ] Container runs as non-root user
- [ ] Root filesystem is read-only
- [ ] Resource limits configured (CPU, memory, disk)
- [ ] Network whitelist enforced
- [ ] Execution timeout implemented
- [ ] Code scanning enabled
- [ ] Suspicious pattern detection active
- [ ] All file operations logged
- [ ] All network requests logged
- [ ] Secrets accessed through broker only
- [ ] Post-execution cleanup automated

**Monitoring:**
- [ ] Real-time alert system for suspicious activity
- [ ] Log aggregation to SIEM
- [ ] Resource usage dashboards
- [ ] Failed execution analysis
- [ ] Security incident playbooks ready

## Common Security Issues

### Issue 1: Container Escape

**Problem:** Agent attempts to break out of container

**Prevention:**
- Use latest Docker version with security patches
- Drop all capabilities (`cap_drop: ALL`)
- Enable seccomp and AppArmor profiles
- Run as non-root user
- Read-only root filesystem

### Issue 2: Resource Exhaustion

**Problem:** Code consumes all CPU/memory/disk

**Prevention:**
- Hard resource limits (not soft)
- Execution timeout enforcement
- Disk quotas
- Monitor and kill runaway processes

### Issue 3: Data Exfiltration

**Problem:** Sensitive data leaked through network

**Prevention:**
- Network whitelist (default deny)
- Monitor all network connections
- Tokenize sensitive data
- Encrypt data at rest and in transit

### Issue 4: Prompt Injection Attack

**Problem:** Malicious user tricks agent into executing dangerous code

**Prevention:**
- Code scanning before execution
- Pattern-based detection
- Rate limiting per user
- Human review for high-risk operations

## Production Security Recommendations

**Minimum Security Tier (Development Only):**
- Docker container with resource limits
- Basic network restrictions
- Code scanning
- Execution logging

**Recommended Security Tier (Production):**
- Docker container with seccomp/AppArmor
- Network whitelist with monitoring proxy
- Real-time suspicious pattern detection
- Comprehensive logging to SIEM
- Automated security alerts
- Regular security audits

**Maximum Security Tier (High-Risk Environments):**
- Separate VM per execution
- Full OS-level isolation
- Hardware-based security (TPM)
- Air-gapped execution environment
- Human review before execution
- Formal security verification

## Security Incident Response

**Incident Detection:**
1. Automated alerts for suspicious patterns
2. Failed execution analysis
3. Resource usage anomalies
4. Network connection violations

**Response Workflow:**
1. **Immediate:** Kill execution, isolate container
2. **Investigation:** Collect logs, analyze code
3. **Remediation:** Patch vulnerability, update rules
4. **Documentation:** Record incident, update playbooks
5. **Prevention:** Improve detection, add safeguards

## Compliance Considerations

**GDPR/Privacy:**
- Tokenize PII before processing
- Audit trail for data access
- Right to erasure (delete execution logs)
- Consent for data processing

**SOC 2:**
- Access controls and authentication
- Encryption at rest and in transit
- Incident response procedures
- Regular security audits
- Vendor security assessments

**HIPAA (if handling health data):**
- Enhanced encryption
- Audit logs for PHI access
- Business associate agreements
- Risk assessments

# Troubleshooting MCP Code Execution

Common issues and solutions for MCP code execution environments.

## Execution Issues

### Issue: Code Execution Timeouts

**Symptoms:**
- Executions killed after 30 seconds
- Long-running operations fail
- Partial results returned

**Common Causes:**

1. **Slow external API calls:**
```typescript
// Problem: Sequential API calls take too long
for (const item of items) {
  await externalAPI.process(item); // 1 second each
}
// 1000 items × 1 second = 1000 seconds (timeout!)

// Solution: Parallel processing with concurrency limit
import pLimit from 'p-limit';
const limit = pLimit(10);

await Promise.all(
  items.map(item =>
    limit(() => externalAPI.process(item))
  )
);
// 1000 items / 10 concurrent × 1 second = 100 seconds
```

2. **Large dataset processing:**
```typescript
// Problem: Loading entire dataset into memory
const allData = await database.fetchAll(); // 10 GB of data
const result = processData(allData); // Slow!

// Solution: Stream processing
const stream = database.createStream();
let result = initialValue;

for await (const batch of stream) {
  result = processBatch(batch, result);
}
```

3. **Network latency:**
```typescript
// Problem: Multiple round-trips to same service
const user = await api.getUser(id);
const posts = await api.getUserPosts(id);
const comments = await api.getUserComments(id);

// Solution: Batch requests
const [user, posts, comments] = await Promise.all([
  api.getUser(id),
  api.getUserPosts(id),
  api.getUserComments(id)
]);
```

**Solutions:**

**Increase timeout:**
```yaml
# docker-compose.yml
environment:
  - MAX_EXECUTION_TIME=60000  # 60 seconds
```

**Implement checkpointing:**
```typescript
// Save progress periodically
async function processWithCheckpoints(items: any[]) {
  const BATCH_SIZE = 100;
  const checkpoint = loadCheckpoint();

  for (let i = checkpoint.lastIndex; i < items.length; i += BATCH_SIZE) {
    const batch = items.slice(i, i + BATCH_SIZE);
    await processBatch(batch);

    saveCheckpoint({ lastIndex: i + BATCH_SIZE });
  }
}
```

**Use streaming:**
```typescript
// Process data incrementally
async function* streamProcess(source: AsyncIterable<any>) {
  for await (const item of source) {
    yield processItem(item);
  }
}
```

---

### Issue: Out of Memory Errors

**Symptoms:**
- Process killed with OOMKilled status
- "JavaScript heap out of memory" errors
- Execution fails partway through

**Common Causes:**

1. **Loading large files entirely:**
```typescript
// Problem: Load 5 GB file into memory
const content = await fs.readFile('/data/huge.log', 'utf-8');
const lines = content.split('\n'); // OOM!

// Solution: Stream line by line
import { createReadStream } from 'fs';
import { createInterface } from 'readline';

const stream = createReadStream('/data/huge.log');
const rl = createInterface({ input: stream });

for await (const line of rl) {
  processLine(line); // Memory efficient
}
```

2. **Accumulating results:**
```typescript
// Problem: Accumulate all results in memory
const results = [];
for (const item of items) {
  results.push(await process(item)); // Growing array
}

// Solution: Write to disk incrementally
const output = fs.createWriteStream('/workspace/results.json');
output.write('[');
let first = true;

for (const item of items) {
  const result = await process(item);
  if (!first) output.write(',');
  output.write(JSON.stringify(result));
  first = false;
}

output.write(']');
output.end();
```

3. **Memory leaks:**
```typescript
// Problem: Not releasing resources
const cache = new Map();
for (const item of items) {
  cache.set(item.id, expensiveOperation(item)); // Never cleared
}

// Solution: Implement LRU cache with size limit
import { LRUCache } from 'lru-cache';
const cache = new LRUCache({ max: 1000 }); // Max 1000 entries
```

**Solutions:**

**Increase memory limit:**
```yaml
# docker-compose.yml
deploy:
  resources:
    limits:
      memory: 1024M  # Increase to 1 GB
```

**Monitor memory usage:**
```typescript
// Log memory usage periodically
setInterval(() => {
  const used = process.memoryUsage();
  console.log('Memory usage:', {
    rss: Math.round(used.rss / 1024 / 1024) + 'MB',
    heapUsed: Math.round(used.heapUsed / 1024 / 1024) + 'MB'
  });
}, 5000);
```

**Force garbage collection:**
```typescript
// Run node with --expose-gc flag
if (global.gc) {
  global.gc(); // Force GC
}
```

---

### Issue: Filesystem Permission Errors

**Symptoms:**
- EACCES: permission denied
- EROFS: read-only file system
- Unable to write files

**Common Causes:**

1. **Writing to read-only locations:**
```typescript
// Problem: Trying to write to read-only /servers
await fs.writeFile('/servers/cache.json', data); // EROFS!

// Solution: Write to workspace
await fs.writeFile('/workspace/cache.json', data); // Success
```

2. **Wrong file ownership:**
```bash
# Problem: Files owned by root
ls -la /workspace/data
# -rw-r--r-- 1 root root 1024 Jan 1 12:00 data.json

# Solution: Fix ownership
docker exec -u root mcp-executor chown -R executor:executor /workspace
```

3. **Directory doesn't exist:**
```typescript
// Problem: Parent directory missing
await fs.writeFile('/workspace/subdir/file.txt', data); // ENOENT!

// Solution: Create directory first
await fs.mkdir('/workspace/subdir', { recursive: true });
await fs.writeFile('/workspace/subdir/file.txt', data);
```

**Solutions:**

**Check allowed paths:**
```typescript
const ALLOWED_PATHS = ['/workspace', '/skills'];

function isAllowedPath(path: string): boolean {
  const normalized = path.normalize(path);
  return ALLOWED_PATHS.some(prefix => normalized.startsWith(prefix));
}

// Validate before operations
if (!isAllowedPath(targetPath)) {
  throw new Error('Access denied: path outside allowed directories');
}
```

**Fix permissions in Dockerfile:**
```dockerfile
# Create directories with correct ownership
RUN mkdir -p /workspace /skills && \
    chown -R executor:executor /workspace /skills && \
    chmod 755 /workspace /skills
```

---

## Network Issues

### Issue: Cannot Connect to MCP Servers

**Symptoms:**
- Connection timeout
- ECONNREFUSED errors
- DNS resolution failures

**Common Causes:**

1. **Network isolation:**
```bash
# Problem: Container can't reach host services
curl http://localhost:8080  # Connection refused

# Solution: Use host.docker.internal (Mac/Windows)
curl http://host.docker.internal:8080

# Or use host network mode (Linux)
docker run --network=host ...
```

2. **Firewall blocking:**
```bash
# Check if port is accessible
docker exec mcp-executor nc -zv api.example.com 443

# If blocked, add to whitelist
iptables -A OUTPUT -d api.example.com -j ACCEPT
```

3. **DNS issues:**
```typescript
// Problem: DNS resolution fails
const response = await fetch('https://api.example.com'); // ENOTFOUND

// Solution: Use IP directly or configure DNS
// Add to docker-compose.yml:
dns:
  - 8.8.8.8
  - 8.8.4.4
```

**Solutions:**

**Test network connectivity:**
```bash
# From inside container
docker exec mcp-executor sh -c '
  # Test DNS
  nslookup api.example.com

  # Test connectivity
  curl -I https://api.example.com

  # Test specific port
  nc -zv api.example.com 443
'
```

**Configure proxy:**
```typescript
// Add proxy to API calls
import { HttpsProxyAgent } from 'https-proxy-agent';

const agent = new HttpsProxyAgent('http://proxy.example.com:3128');

const response = await fetch('https://api.example.com', {
  agent
});
```

**Add to network whitelist:**
```yaml
# docker-compose.yml
networks:
  mcp-network:
    driver: bridge
    ipam:
      config:
        - subnet: 172.28.0.0/16
          gateway: 172.28.0.1
```

---

### Issue: Rate Limiting Errors

**Symptoms:**
- 429 Too Many Requests
- Temporary API bans
- Degraded performance

**Common Causes:**

1. **Too many parallel requests:**
```typescript
// Problem: Exceeding API rate limits
await Promise.all(
  items.map(item => api.process(item)) // 1000 concurrent!
);

// Solution: Limit concurrency
import pLimit from 'p-limit';
const limit = pLimit(10); // Max 10 concurrent

await Promise.all(
  items.map(item => limit(() => api.process(item)))
);
```

2. **No retry logic:**
```typescript
// Problem: Fail immediately on rate limit
const result = await api.call(); // Throws on 429

// Solution: Exponential backoff
async function callWithRetry(fn: () => Promise<any>, maxRetries = 3) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (err) {
      if (err.status === 429 && i < maxRetries - 1) {
        const delay = Math.pow(2, i) * 1000; // 1s, 2s, 4s
        await sleep(delay);
        continue;
      }
      throw err;
    }
  }
}
```

3. **Not respecting rate limit headers:**
```typescript
// Solution: Track rate limits
class RateLimitedAPI {
  private remaining: number = Infinity;
  private resetTime: number = 0;

  async call(endpoint: string) {
    // Wait if needed
    if (this.remaining === 0) {
      const now = Date.now();
      if (now < this.resetTime) {
        await sleep(this.resetTime - now);
      }
    }

    const response = await fetch(endpoint);

    // Update rate limit info
    this.remaining = parseInt(response.headers.get('X-RateLimit-Remaining') || '0');
    this.resetTime = parseInt(response.headers.get('X-RateLimit-Reset') || '0') * 1000;

    return response;
  }
}
```

**Solutions:**

**Implement token bucket:**
```typescript
class TokenBucket {
  private tokens: number;
  private lastRefill: number;

  constructor(
    private capacity: number,
    private refillRate: number // tokens per second
  ) {
    this.tokens = capacity;
    this.lastRefill = Date.now();
  }

  async take(count: number = 1): Promise<void> {
    // Refill tokens based on time passed
    const now = Date.now();
    const elapsed = (now - this.lastRefill) / 1000;
    this.tokens = Math.min(
      this.capacity,
      this.tokens + elapsed * this.refillRate
    );
    this.lastRefill = now;

    // Wait if not enough tokens
    if (this.tokens < count) {
      const waitTime = ((count - this.tokens) / this.refillRate) * 1000;
      await sleep(waitTime);
      this.tokens = 0;
    } else {
      this.tokens -= count;
    }
  }
}

// Usage
const bucket = new TokenBucket(10, 2); // 10 tokens, refill 2/sec

for (const item of items) {
  await bucket.take(); // Wait for token
  await api.process(item);
}
```

---

## Security Issues

### Issue: Code Injection Detected

**Symptoms:**
- Execution blocked by security scanner
- Suspicious pattern alerts
- Security monitoring triggers

**Common Causes:**

1. **Using eval():**
```typescript
// Problem: eval() is flagged as dangerous
const result = eval(userInput); // BLOCKED!

// Solution: Use safer alternatives
const func = new Function('return ' + safeExpression);
const result = func();
```

2. **Dynamic imports from user input:**
```typescript
// Problem: Arbitrary file access
const module = await import(userProvidedPath); // BLOCKED!

// Solution: Whitelist allowed modules
const ALLOWED_MODULES = ['/servers/google-drive', '/servers/salesforce'];

if (!ALLOWED_MODULES.some(m => path.startsWith(m))) {
  throw new SecurityError('Module not allowed');
}
```

3. **Command injection:**
```typescript
// Problem: Shell command with user input
exec(`grep "${userQuery}" file.txt`); // BLOCKED!

// Solution: Use libraries instead of shell
import { readFileSync } from 'fs';
const content = readFileSync('file.txt', 'utf-8');
const lines = content.split('\n').filter(line => line.includes(userQuery));
```

**Solutions:**

**Use content security policy:**
```typescript
// Block dangerous operations
const BLOCKED_PATTERNS = [
  /eval\(/,
  /Function\(/,
  /child_process/,
  /require\(['"]fs['"]\)/
];

function scanCode(code: string): boolean {
  return BLOCKED_PATTERNS.some(pattern => pattern.test(code));
}
```

**Sanitize inputs:**
```typescript
function sanitizeInput(input: string): string {
  // Remove dangerous characters
  return input
    .replace(/[;&|`$()]/g, '')
    .substring(0, 1000); // Limit length
}
```

---

## Performance Issues

### Issue: Slow Execution

**Symptoms:**
- Executions take longer than expected
- High CPU usage
- Poor throughput

**Diagnosis:**

```typescript
// Add profiling
console.time('total');

console.time('step1');
await step1();
console.timeEnd('step1');

console.time('step2');
await step2();
console.timeEnd('step2');

console.timeEnd('total');
```

**Common Causes:**

1. **Inefficient algorithms:**
```typescript
// Problem: O(n²) algorithm
for (const item1 of items) {
  for (const item2 of items) {
    if (item1.id === item2.relatedId) {
      process(item1, item2);
    }
  }
}

// Solution: Use index/hash map
const index = new Map(items.map(item => [item.id, item]));
for (const item of items) {
  const related = index.get(item.relatedId);
  if (related) {
    process(item, related);
  }
}
```

2. **Blocking operations:**
```typescript
// Problem: Synchronous file operations
const data = fs.readFileSync('huge.json'); // Blocks!

// Solution: Use async
const data = await fs.promises.readFile('huge.json');
```

3. **No caching:**
```typescript
// Problem: Repeated expensive operations
for (const item of items) {
  const config = await loadConfig(); // Loaded every iteration!
  process(item, config);
}

// Solution: Cache outside loop
const config = await loadConfig();
for (const item of items) {
  process(item, config);
}
```

---

## Debugging Tips

### Enable Debug Logging

```typescript
// Set DEBUG environment variable
process.env.DEBUG = 'mcp:*';

// Or use debug library
import debug from 'debug';
const log = debug('mcp:execution');

log('Starting execution', { id: executionId });
```

### Inspect Container State

```bash
# View running processes
docker exec mcp-executor ps aux

# Check disk usage
docker exec mcp-executor df -h

# View network connections
docker exec mcp-executor netstat -an

# Inspect logs
docker logs mcp-executor --tail 100 --follow
```

### Use Interactive Debugging

```typescript
// Add breakpoints (requires inspector)
debugger;

// Or log state
console.log('State:', JSON.stringify(state, null, 2));
```

### Test Locally First

```bash
# Run code locally before container
node test-code.js

# Then in container
docker exec mcp-executor node /workspace/test-code.js
```

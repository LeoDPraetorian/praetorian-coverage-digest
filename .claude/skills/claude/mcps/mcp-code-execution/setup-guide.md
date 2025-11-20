# MCP Code Execution Setup Guide

Complete step-by-step setup instructions for code execution environments.

## Setup Options

### Option 1: Docker Container (Recommended)

**Pros:**
- Fast setup and teardown
- Good isolation
- Lower overhead than VMs
- Easy to version and distribute

**Cons:**
- Shares kernel with host
- Slightly lower security than VMs

### Option 2: Virtual Machine

**Pros:**
- Complete OS-level isolation
- Maximum security
- True hardware separation

**Cons:**
- Higher resource overhead
- Slower startup/teardown
- More complex management

### Option 3: Cloud Sandbox Service

**Pros:**
- Managed security
- No infrastructure management
- Scalable

**Cons:**
- Vendor lock-in
- Ongoing costs
- Network latency

## Docker Setup (Recommended)

### Prerequisites

```bash
# Install Docker
curl -fsSL https://get.docker.com | sh

# Verify installation
docker --version
```

### Step 1: Create Dockerfile

```dockerfile
# Dockerfile for MCP execution environment
FROM node:20-slim

# Install Python for polyglot support
RUN apt-get update && apt-get install -y \
    python3 \
    python3-pip \
    && rm -rf /var/lib/apt/lists/*

# Create non-root user
RUN useradd -m -u 1000 executor

# Set up directory structure
RUN mkdir -p /servers /workspace /skills && \
    chown -R executor:executor /workspace /skills

# Install MCP SDK and common libraries
WORKDIR /home/executor
RUN npm install --global \
    @modelcontextprotocol/sdk \
    axios \
    date-fns

RUN pip3 install --no-cache-dir \
    requests \
    pandas \
    pydantic

# Switch to non-root user
USER executor

# Working directory
WORKDIR /workspace

# Keep container running (for stdio transport)
CMD ["tail", "-f", "/dev/null"]
```

### Step 2: Build Image

```bash
# Build the execution environment image
docker build -t mcp-executor:latest .

# Verify image
docker images | grep mcp-executor
```

### Step 3: Create Docker Compose Configuration

```yaml
# docker-compose.yml
version: '3.8'

services:
  mcp-executor:
    image: mcp-executor:latest
    container_name: mcp-executor

    # Security options
    security_opt:
      - no-new-privileges:true
      - apparmor:docker-default
    read_only: true

    # Resource limits
    deploy:
      resources:
        limits:
          cpus: '0.5'
          memory: 512M
        reservations:
          cpus: '0.1'
          memory: 128M

    # Volumes
    volumes:
      - ./servers:/servers:ro        # MCP tool definitions (read-only)
      - ./skills:/skills:ro          # Skill libraries (read-only)
      - workspace:/workspace:rw      # Agent working directory
      - /tmp                         # Temporary files

    # Network configuration
    networks:
      - mcp-network

    # Environment variables
    environment:
      - NODE_ENV=production
      - MAX_EXECUTION_TIME=30000
      - MAX_MEMORY_MB=512

    # Keep container running
    stdin_open: true
    tty: true

networks:
  mcp-network:
    driver: bridge
    ipam:
      config:
        - subnet: 172.28.0.0/16

volumes:
  workspace:
    driver: local
```

### Step 4: Start Container

```bash
# Start the execution environment
docker-compose up -d

# Verify container is running
docker ps | grep mcp-executor

# Check logs
docker logs mcp-executor
```

### Step 5: Configure MCP Server Definitions

**Create filesystem structure:**

```bash
# Create server directories
mkdir -p servers/{google-drive,salesforce,slack}

# Example: Google Drive tool definition
cat > servers/google-drive/getDocument.ts << 'EOF'
import { MCPServer } from '@modelcontextprotocol/sdk';

export const getDocument = {
  name: 'getDocument',
  description: 'Download a document from Google Drive',
  parameters: {
    type: 'object',
    properties: {
      documentId: {
        type: 'string',
        description: 'The Google Drive document ID'
      },
      format: {
        type: 'string',
        enum: ['text', 'json', 'markdown'],
        description: 'Output format for the document'
      }
    },
    required: ['documentId']
  },
  async handler(params: { documentId: string; format?: string }) {
    // Implementation would call actual Google Drive API
    // This is a placeholder showing the structure
    return {
      content: 'Document content here',
      metadata: {
        title: 'Example Document',
        size: 1024
      }
    };
  }
};
EOF
```

### Step 6: Test Execution

```bash
# Execute code in container
docker exec -it mcp-executor node -e "
const fs = require('fs');

// List available servers
console.log('Available servers:', fs.readdirSync('/servers'));

// Test file operations
fs.writeFileSync('/workspace/test.txt', 'Hello MCP');
console.log('File created:', fs.existsSync('/workspace/test.txt'));
"

# Expected output:
# Available servers: [ 'google-drive', 'salesforce', 'slack' ]
# File created: true
```

## Agent Configuration

### Configure Agent to Use Execution Environment

**Example configuration (framework-specific):**

```typescript
// agent-config.ts
export const agentConfig = {
  executionMode: 'code-execution',

  environment: {
    type: 'docker',
    containerId: 'mcp-executor',
    filesystemRoot: '/workspace',
  },

  security: {
    maxExecutionTime: 30000,  // 30 seconds
    maxMemory: 512 * 1024 * 1024,  // 512 MB
    allowedPaths: ['/workspace', '/servers', '/skills'],
    networkWhitelist: [
      'api.google.com',
      'login.salesforce.com',
      'slack.com'
    ]
  },

  monitoring: {
    logExecutions: true,
    logPath: '/var/log/mcp-executions/',
    alertOnSuspiciousPatterns: true
  }
};
```

### Test Agent Integration

```typescript
// test-agent.ts
import { Agent } from './agent';
import { agentConfig } from './agent-config';

const agent = new Agent(agentConfig);

// Test 1: Progressive tool discovery
await agent.execute(`
  // List available servers
  const servers = await listDirectory('/servers');
  console.log('Available servers:', servers);

  // Load specific tool definition
  const getDoc = await import('/servers/google-drive/getDocument.ts');
  console.log('Loaded tool:', getDoc.getDocument.name);
`);

// Test 2: Data filtering
await agent.execute(`
  // Simulate large dataset
  const data = Array(10000).fill(0).map((_, i) => ({
    id: i,
    value: Math.random()
  }));

  // Filter in execution environment
  const filtered = data
    .filter(row => row.value > 0.9)
    .slice(0, 5);

  console.log('Filtered results:', filtered);
  // Only 5 rows returned to agent, not 10,000
`);
```

## VM Setup (Alternative)

### Using Vagrant

```ruby
# Vagrantfile
Vagrant.configure("2") do |config|
  config.vm.box = "ubuntu/jammy64"

  config.vm.provider "virtualbox" do |vb|
    vb.memory = "2048"
    vb.cpus = 2
  end

  config.vm.provision "shell", inline: <<-SHELL
    # Install Node.js
    curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
    sudo apt-get install -y nodejs

    # Install Python
    sudo apt-get install -y python3 python3-pip

    # Create execution environment
    sudo mkdir -p /servers /workspace /skills
    sudo chown vagrant:vagrant /workspace /skills
  SHELL
end
```

```bash
# Start VM
vagrant up

# SSH into VM
vagrant ssh

# Run executions in VM
vagrant ssh -c "node /workspace/agent-code.js"
```

## Cloud Setup

### AWS Lambda (Lightweight Option)

```typescript
// lambda-executor.ts
import { Handler } from 'aws-lambda';

export const handler: Handler = async (event) => {
  const { code, environment } = event;

  // Execute code in Lambda environment
  const result = await executeCode(code, {
    timeout: 30000,
    memory: 512,
    environment
  });

  return {
    statusCode: 200,
    body: JSON.stringify(result)
  };
};
```

### AWS Fargate (Container Option)

```yaml
# ecs-task-definition.json
{
  "family": "mcp-executor",
  "containerDefinitions": [{
    "name": "executor",
    "image": "mcp-executor:latest",
    "memory": 512,
    "cpu": 256,
    "essential": true,
    "environment": [
      {"name": "NODE_ENV", "value": "production"}
    ],
    "logConfiguration": {
      "logDriver": "awslogs",
      "options": {
        "awslogs-group": "/ecs/mcp-executor",
        "awslogs-region": "us-east-1",
        "awslogs-stream-prefix": "execution"
      }
    }
  }]
}
```

## Monitoring Setup

### CloudWatch Integration

```typescript
// monitoring.ts
import { CloudWatch } from '@aws-sdk/client-cloudwatch';

const cloudwatch = new CloudWatch({});

export async function logExecution(execution: ExecutionLog) {
  await cloudwatch.putMetricData({
    Namespace: 'MCP/Executions',
    MetricData: [{
      MetricName: 'ExecutionTime',
      Value: execution.duration,
      Unit: 'Milliseconds',
      Dimensions: [{
        Name: 'ExecutionId',
        Value: execution.id
      }]
    }]
  });
}
```

### Prometheus Metrics

```typescript
// prometheus-metrics.ts
import { Counter, Histogram } from 'prom-client';

export const executionCounter = new Counter({
  name: 'mcp_executions_total',
  help: 'Total number of code executions',
  labelNames: ['status', 'agent_id']
});

export const executionDuration = new Histogram({
  name: 'mcp_execution_duration_seconds',
  help: 'Code execution duration',
  buckets: [0.1, 0.5, 1, 5, 10, 30]
});

export const resourceUsage = new Histogram({
  name: 'mcp_execution_memory_bytes',
  help: 'Peak memory usage during execution',
  buckets: [1e6, 10e6, 100e6, 500e6, 1e9]
});
```

## Troubleshooting Setup

### Issue: Container Won't Start

**Check Docker logs:**
```bash
docker logs mcp-executor
```

**Common causes:**
- Port conflicts
- Volume mount permissions
- Resource limits too restrictive

**Solutions:**
```bash
# Fix volume permissions
sudo chown -R 1000:1000 ./workspace

# Increase resource limits in docker-compose.yml
limits:
  cpus: '1.0'
  memory: 1024M
```

### Issue: Code Execution Timeouts

**Check execution logs:**
```bash
docker exec mcp-executor tail -f /var/log/executions.log
```

**Common causes:**
- Network latency to MCP servers
- Large dataset processing
- Infinite loops

**Solutions:**
- Increase timeout in configuration
- Add progress logging
- Implement execution checkpoints

### Issue: Network Connectivity Problems

**Test network from container:**
```bash
docker exec mcp-executor curl -I https://api.google.com
```

**Common causes:**
- Firewall blocking outbound connections
- DNS resolution failures
- Network whitelist too restrictive

**Solutions:**
```bash
# Add DNS servers to docker-compose.yml
services:
  mcp-executor:
    dns:
      - 8.8.8.8
      - 8.8.4.4
```

## Production Checklist

**Before Production:**
- [ ] Security hardening completed (see @security-sandboxing.md)
- [ ] Resource limits appropriate for workload
- [ ] Monitoring and alerting configured
- [ ] Backup and disaster recovery tested
- [ ] Load testing completed
- [ ] Documentation updated
- [ ] Team trained on incident response

**Production Configuration:**
- [ ] High availability setup (multiple containers)
- [ ] Automatic failover enabled
- [ ] Log aggregation configured
- [ ] Metrics dashboard created
- [ ] Alerting rules defined
- [ ] Scaling policies set
- [ ] Cost monitoring enabled

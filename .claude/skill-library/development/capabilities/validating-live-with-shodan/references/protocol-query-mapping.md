# Protocol Query Mapping

**Shodan search queries for common protocols tested with fingerprintx.**

## Default Port Queries

Use these queries when validating a new fingerprintx plugin:

| Protocol      | Default Port | Shodan Query                      | Notes                                  |
| ------------- | ------------ | --------------------------------- | -------------------------------------- |
| MySQL         | 3306         | `port:3306`                       | May include MariaDB                    |
| PostgreSQL    | 5432         | `port:5432`                       | Includes Postgres-compatible DBs       |
| MongoDB       | 27017        | `port:27017 product:mongodb`      | Product filter reduces false positives |
| Redis         | 6379         | `port:6379 product:redis`         | Many auth-protected                    |
| Memcached     | 11211        | `port:11211`                      | Often unprotected                      |
| Elasticsearch | 9200         | `port:9200 product:elasticsearch` | REST API port                          |
| Cassandra     | 9042         | `port:9042`                       | CQL native protocol                    |
| CouchDB       | 5984         | `port:5984 product:couchdb`       | REST API                               |
| Neo4j         | 7687         | `port:7687`                       | Bolt protocol                          |
| RabbitMQ      | 5672         | `port:5672 product:rabbitmq`      | AMQP port                              |
| Kafka         | 9092         | `port:9092`                       | Broker port                            |
| etcd          | 2379         | `port:2379`                       | Client API                             |
| Consul        | 8500         | `port:8500 product:consul`        | HTTP API                               |
| Vault         | 8200         | `port:8200 product:vault`         | HTTP API                               |
| InfluxDB      | 8086         | `port:8086 product:influxdb`      | HTTP API                               |
| Prometheus    | 9090         | `port:9090 product:prometheus`    | Metrics endpoint                       |

## Extended Queries

For more specific targeting:

### By Version Family

```bash
# MySQL 8.x only
port:3306 product:mysql version:8

# MongoDB 4.x or later
port:27017 product:mongodb version:4

# Redis 6.x or 7.x
port:6379 product:redis version:6,7
```

### By Organization Type

```bash
# Cloud providers (diverse configurations)
port:27017 product:mongodb cloud:true

# Specific country (for latency)
port:3306 country:US

# Exclude honeypots (org filter)
port:3306 -org:honeypot
```

### By Response Characteristics

```bash
# With version banner
port:3306 has_version:true

# With specific capability
port:27017 "ismaster"
```

## Query Construction Pattern

For new protocols, build query incrementally:

```bash
# Step 1: Port only (broadest)
port:{default_port}

# Step 2: Add product filter (reduces false positives)
port:{default_port} product:{protocol_name}

# Step 3: Add version if needed (narrows further)
port:{default_port} product:{protocol_name} version:{major}
```

## Sample Size Guidelines

| Total Results | Recommended Sample | Rationale             |
| ------------- | ------------------ | --------------------- |
| < 100         | All (up to 10)     | Small population      |
| 100-1000      | 10                 | Good diversity        |
| 1000-10000    | 10                 | Sufficient sample     |
| > 10000       | 10                 | Rate limit constraint |

## Pagination for Sampling

To get diverse samples, query multiple pages:

```typescript
// Get 10 targets from first page
const result = await hostSearch.execute({ query, page: 1 });

const targets = result.matches.slice(0, 10);
```

## Protocol-Specific Notes

### MySQL/MariaDB

```bash
# MySQL specifically (not MariaDB)
port:3306 product:mysql -product:mariadb

# MariaDB specifically
port:3306 product:mariadb
```

### MongoDB

```bash
# Exclude MongoDB Atlas (managed service, restricted)
port:27017 product:mongodb -org:mongodb

# Include auth-disabled instances (better for testing)
port:27017 product:mongodb authentication:disabled
```

### Redis

```bash
# Unauthenticated Redis (responds to PING)
port:6379 product:redis "PONG"

# Note: Many Redis instances require auth
# Expect lower detection rate for auth-protected
```

### Elasticsearch

```bash
# Elasticsearch with cluster info exposed
port:9200 product:elasticsearch "cluster_name"

# Kibana (different detection)
port:5601 product:kibana
```

## Execution Example

```bash
ROOT="$(git rev-parse --show-superproject-working-tree --show-toplevel | head -1)" && npx tsx -e "(async () => {
  const { hostSearch } = await import('$ROOT/.claude/tools/shodan/index.js');

  // Query for MongoDB targets
  const result = await hostSearch.execute({
    query: 'port:27017 product:mongodb',
    page: 1
  });

  console.log('Total available:', result.summary.total);
  console.log('\\nTargets for validation:');
  result.matches.slice(0, 10).forEach(m =>
    console.log(\`  \${m.ip}:\${m.port} - \${m.product || 'unknown'} \${m.version || ''}\`)
  );
})();" 2>/dev/null
```

## Query Validation

Before running live validation, verify query returns expected results:

1. **Check total count**: Should be > 100 for good sampling
2. **Verify product field**: Most matches should have expected product
3. **Check port accuracy**: All matches should have target port
4. **Sample banner review**: Banners should match protocol

```bash
# Quick validation
ROOT="$(git rev-parse --show-superproject-working-tree --show-toplevel | head -1)" && npx tsx -e "(async () => {
  const { hostSearch } = await import('$ROOT/.claude/tools/shodan/index.js');
  const result = await hostSearch.execute({ query: 'port:27017 product:mongodb', page: 1 });

  console.log('Query validation:');
  console.log('  Total results:', result.summary.total);
  console.log('  Products:', [...new Set(result.matches.map(m => m.product))].join(', '));
  console.log('  Ports:', [...new Set(result.matches.map(m => m.port))].join(', '));
})();" 2>/dev/null
```

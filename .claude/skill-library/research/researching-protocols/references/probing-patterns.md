# Probing Patterns

Common endpoint patterns organized by service type.

## HTTP-Based Services

### REST APIs

```bash
# Standard REST patterns
GET /                          # Root/banner
GET /health                    # Health check
GET /healthz                   # Kubernetes-style health
GET /ready                     # Readiness probe
GET /live                      # Liveness probe
GET /version                   # Version info
GET /api/version               # Namespaced version
GET /v1/info                   # API info
GET /v1/models                 # OpenAI-compatible
GET /api/info                  # Service info
```

### LLM Inference Servers

| Service   | Primary Probe    | Secondary Probe    | Tertiary         |
| --------- | ---------------- | ------------------ | ---------------- |
| Ollama    | `GET /api/tags`  | `GET /api/version` | `GET /` (banner) |
| vLLM      | `GET /version`   | `GET /v1/models`   | `GET /health`    |
| LocalAI   | `GET /v1/models` | `GET /`            | `GET /readyz`    |
| TGI       | `GET /info`      | `GET /health`      | Headers          |
| LM Studio | `GET /v1/models` | Model patterns     | Port 1234        |

### Databases

| Service    | Probe Type    | Command/Endpoint | Response Marker     |
| ---------- | ------------- | ---------------- | ------------------- |
| Redis      | TCP           | `PING`           | `+PONG`             |
| MongoDB    | Wire Protocol | `hello` command  | `isWritablePrimary` |
| PostgreSQL | Wire Protocol | Startup message  | Authentication req  |
| MySQL      | Wire Protocol | Handshake packet | Protocol version    |

### Message Queues

| Service  | Default Port | Probe            | Marker          |
| -------- | ------------ | ---------------- | --------------- |
| RabbitMQ | 5672         | AMQP handshake   | `AMQP` header   |
| Kafka    | 9092         | Metadata request | Broker response |
| Redis    | 6379         | `INFO` command   | `redis_version` |

## Binary Protocols

### Handshake Patterns

```
1. Connect to port
2. Send protocol-specific handshake
3. Validate response magic bytes
4. Extract version from response
```

### Magic Bytes

| Protocol | Magic Bytes (hex)        | Description           |
| -------- | ------------------------ | --------------------- |
| MongoDB  | Message length (4 bytes) | Little-endian int32   |
| MySQL    | Protocol version byte    | Usually 0x0a (10)     |
| SSH      | `SSH-`                   | ASCII banner          |
| TLS      | `0x16 0x03`              | Record type + version |

## Response Capture Template

```bash
# Capture full response with headers
curl -sI http://localhost:{PORT}/{endpoint} > headers.txt
curl -s http://localhost:{PORT}/{endpoint} > body.json

# Pretty print JSON
cat body.json | jq .

# Extract specific fields
cat body.json | jq '.version'
cat body.json | jq '.models[].name'
```

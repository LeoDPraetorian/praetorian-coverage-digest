# Lab Setup Templates

Docker commands and setup instructions for common services.

## LLM Inference Servers

### Ollama

```bash
# Start Ollama
docker run -d -p 11434:11434 --name ollama ollama/ollama

# Pull a model (required for /api/tags to return data)
docker exec ollama ollama pull llama2

# Verify
curl http://localhost:11434/api/tags
```

### vLLM

```bash
# CPU-only (slow but works without GPU)
docker run -d -p 8000:8000 --name vllm \
  vllm/vllm-openai:latest \
  --model facebook/opt-125m

# With GPU
docker run -d --gpus all -p 8000:8000 --name vllm \
  vllm/vllm-openai:latest \
  --model mistralai/Mistral-7B-v0.1

# Verify
curl http://localhost:8000/version
```

### LocalAI

```bash
# Start LocalAI
docker run -d -p 8080:8080 --name localai localai/localai

# Verify
curl http://localhost:8080/v1/models
```

### Text Generation Inference (TGI)

```bash
# Start TGI
docker run -d -p 8080:80 --name tgi \
  ghcr.io/huggingface/text-generation-inference:latest \
  --model-id facebook/opt-125m

# Verify
curl http://localhost:8080/info
```

## Databases

### Redis

```bash
# Start Redis
docker run -d -p 6379:6379 --name redis redis:latest

# Verify
redis-cli PING
# Expected: PONG

# Get version
redis-cli INFO | grep redis_version
```

### MongoDB

```bash
# Start MongoDB
docker run -d -p 27017:27017 --name mongodb mongo:latest

# Verify (using mongosh or netcat)
echo '{"hello": 1}' | nc localhost 27017
```

### PostgreSQL

```bash
# Start PostgreSQL
docker run -d -p 5432:5432 \
  -e POSTGRES_PASSWORD=password \
  --name postgres postgres:latest

# Verify
psql -h localhost -U postgres -c "SELECT version();"
```

### MySQL

```bash
# Start MySQL
docker run -d -p 3306:3306 \
  -e MYSQL_ROOT_PASSWORD=password \
  --name mysql mysql:latest

# Verify
mysql -h 127.0.0.1 -u root -ppassword -e "SELECT VERSION();"
```

## Message Queues

### RabbitMQ

```bash
# Start RabbitMQ with management UI
docker run -d -p 5672:5672 -p 15672:15672 \
  --name rabbitmq rabbitmq:management

# Verify (management API)
curl -u guest:guest http://localhost:15672/api/overview
```

### Kafka

```bash
# Using docker-compose (Kafka needs Zookeeper)
# See: https://github.com/confluentinc/cp-docker-images

# Quick start with KRaft (no Zookeeper)
docker run -d -p 9092:9092 --name kafka \
  -e KAFKA_NODE_ID=1 \
  -e KAFKA_PROCESS_ROLES=broker,controller \
  -e KAFKA_LISTENERS=PLAINTEXT://0.0.0.0:9092,CONTROLLER://0.0.0.0:9093 \
  -e KAFKA_ADVERTISED_LISTENERS=PLAINTEXT://localhost:9092 \
  -e KAFKA_CONTROLLER_LISTENER_NAMES=CONTROLLER \
  -e KAFKA_CONTROLLER_QUORUM_VOTERS=1@localhost:9093 \
  confluentinc/cp-kafka:latest
```

## Web Servers

### Nginx

```bash
docker run -d -p 80:80 --name nginx nginx:latest
curl -I http://localhost/
# Look for: Server: nginx/x.x.x
```

### Apache

```bash
docker run -d -p 80:80 --name apache httpd:latest
curl -I http://localhost/
# Look for: Server: Apache/x.x.x
```

## Multi-Version Testing

For version detection research, run multiple versions:

```bash
# Ollama versions
docker run -d -p 11434:11434 --name ollama-latest ollama/ollama:latest
docker run -d -p 11435:11434 --name ollama-old ollama/ollama:0.1.0

# Compare responses
curl http://localhost:11434/api/version
curl http://localhost:11435/api/version
```

## Cleanup

```bash
# Stop and remove all test containers
docker stop $(docker ps -q --filter "name=ollama|vllm|localai|tgi|redis|mongo|postgres|mysql")
docker rm $(docker ps -aq --filter "name=ollama|vllm|localai|tgi|redis|mongo|postgres|mysql")
```

## Troubleshooting

### Container Won't Start

```bash
# Check logs
docker logs {container-name}

# Check if port is in use
lsof -i :{PORT}
```

### Connection Refused

```bash
# Verify container is running
docker ps | grep {container-name}

# Check container IP (for non-localhost access)
docker inspect {container-name} | jq '.[0].NetworkSettings.IPAddress'
```

### Resource Issues

```bash
# LLMs need significant memory
docker run -d -p 8000:8000 --memory=8g --name vllm vllm/vllm-openai
```

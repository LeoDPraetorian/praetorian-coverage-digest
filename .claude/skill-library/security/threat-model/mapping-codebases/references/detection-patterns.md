# Detection Patterns

**Extended detection patterns by language and framework.**

---

## Language Detection

### Go

**Indicator Files**: `go.mod`, `go.sum`, `go.work`

**Framework Detection**:

```bash
# AWS Lambda
grep -l "aws-lambda-go" go.mod

# Web frameworks
grep -E "gin-gonic/gin|labstack/echo|gofiber/fiber|gorilla/mux" go.mod

# Database drivers
grep -E "go-sql-driver/mysql|lib/pq|neo4j-go-driver|aws-sdk-go-v2.*dynamodb" go.mod
```

**Entry Point Patterns**:

```bash
# HTTP handlers
grep -rn "func.*\(w http.ResponseWriter, r \*http.Request\)" {scope}
grep -rn "\.HandleFunc\|\.Handle\(" {scope}

# Lambda handlers
grep -rn "func.*events\.APIGatewayProxyRequest.*APIGatewayProxyResponse" {scope}

# CLI main functions
grep -rn "func main\(\)" {scope}/cmd/
```

**Data Access Patterns**:

```bash
# SQL queries
grep -rn "\.Query\|\.Exec\|\.QueryRow" {scope}

# DynamoDB operations
grep -rn "\.PutItem\|\.GetItem\|\.Query\|\.Scan\|\.DeleteItem" {scope}

# Neo4j operations
grep -rn "session\.Run\|\.ExecuteQuery" {scope}
```

---

### TypeScript / JavaScript

**Indicator Files**: `package.json`, `tsconfig.json`, `package-lock.json`, `yarn.lock`, `pnpm-lock.yaml`

**Framework Detection**:

```bash
# React
jq -r '.dependencies.react // .devDependencies.react // empty' package.json

# Express
jq -r '.dependencies.express // empty' package.json

# Next.js
jq -r '.dependencies.next // empty' package.json

# Fastify
jq -r '.dependencies.fastify // empty' package.json
```

**Entry Point Patterns**:

```bash
# Express routes
grep -rn "app\.\(get\|post\|put\|delete\|patch\|all\)\(" {scope}
grep -rn "router\.\(get\|post\|put\|delete\|patch\)\(" {scope}

# Next.js API routes (file-based)
find {scope}/pages/api -name "*.ts" -o -name "*.js"
find {scope}/app/api -name "route.ts" -o -name "route.js"

# React entry points
grep -rn "createRoot\|ReactDOM.render" {scope}
```

**Data Access Patterns**:

```bash
# Fetch/Axios calls
grep -rn "fetch\(\|axios\.\(get\|post\|put\|delete\)" {scope}

# Database clients
grep -rn "prisma\.\|mongoose\.\|knex\.\|sequelize\." {scope}

# AWS SDK
grep -rn "DynamoDBClient\|S3Client\|@aws-sdk" {scope}
```

---

### Python

**Indicator Files**: `requirements.txt`, `pyproject.toml`, `setup.py`, `Pipfile`

**Framework Detection**:

```bash
# Flask
grep -E "^flask" requirements.txt

# Django
grep -E "^django" requirements.txt

# FastAPI
grep -E "^fastapi" requirements.txt

# Click CLI
grep -E "^click" requirements.txt
```

**Entry Point Patterns**:

```bash
# Flask routes
grep -rn "@app\.route\|@blueprint\.route" {scope}

# FastAPI routes
grep -rn "@app\.\(get\|post\|put\|delete\|patch\)\|@router\." {scope}

# Django URLs
grep -rn "path\(\|re_path\(" {scope}/urls.py

# CLI commands (Click)
grep -rn "@click\.command\|@click\.group" {scope}
```

**Data Access Patterns**:

```bash
# SQLAlchemy
grep -rn "session\.query\|session\.execute\|\.filter\(" {scope}

# Django ORM
grep -rn "\.objects\.\(all\|filter\|get\|create\)" {scope}

# Raw SQL
grep -rn "cursor\.execute\|\.raw\(" {scope}

# boto3 (AWS)
grep -rn "boto3\.client\|boto3\.resource" {scope}
```

---

### Rust

**Indicator Files**: `Cargo.toml`, `Cargo.lock`

**Framework Detection**:

```bash
# Actix-web
grep -E "actix-web" Cargo.toml

# Rocket
grep -E "rocket" Cargo.toml

# Axum
grep -E "axum" Cargo.toml
```

**Entry Point Patterns**:

```bash
# Actix handlers
grep -rn "#\[get\|#\[post\|#\[put\|#\[delete\|web::\(get\|post\)" {scope}

# Rocket routes
grep -rn "#\[rocket::\(get\|post\|put\|delete\)\]" {scope}

# Main function
grep -rn "fn main\(\)" {scope}/src/main.rs
```

---

### Java

**Indicator Files**: `pom.xml`, `build.gradle`, `build.gradle.kts`

**Framework Detection**:

```bash
# Spring Boot
grep -E "spring-boot" pom.xml build.gradle 2>/dev/null

# Quarkus
grep -E "quarkus" pom.xml build.gradle 2>/dev/null
```

**Entry Point Patterns**:

```bash
# Spring controllers
grep -rn "@RestController\|@Controller\|@RequestMapping\|@GetMapping\|@PostMapping" {scope}

# Servlet
grep -rn "extends HttpServlet\|doGet\|doPost" {scope}
```

---

## Infrastructure Detection

### Container

**Indicator Files**: `Dockerfile`, `docker-compose.yml`, `docker-compose.yaml`

**Patterns**:

```bash
# Base images (security relevant)
grep -E "^FROM" Dockerfile

# Exposed ports
grep -E "^EXPOSE" Dockerfile

# Environment variables
grep -E "^ENV\|^ARG" Dockerfile
```

### Kubernetes

**Indicator Files**: `*.yaml` in `k8s/`, `kubernetes/`, `manifests/`

**Patterns**:

```bash
# Service definitions
grep -rn "kind: Service" {scope}

# Ingress rules
grep -rn "kind: Ingress" {scope}

# Secrets
grep -rn "kind: Secret" {scope}
```

### Terraform

**Indicator Files**: `*.tf`, `terraform.tfstate`

**Patterns**:

```bash
# AWS resources
grep -rn "aws_\(lambda\|api_gateway\|dynamodb\|s3\|iam\)" {scope}

# Security groups
grep -rn "aws_security_group\|ingress\|egress" {scope}

# IAM policies
grep -rn "aws_iam_policy\|aws_iam_role" {scope}
```

### AWS SAM / CloudFormation

**Indicator Files**: `template.yaml`, `template.yml`, `samconfig.toml`

**Patterns**:

```bash
# Lambda functions
grep -rn "Type: AWS::Serverless::Function\|Type: AWS::Lambda::Function" {scope}

# API Gateway
grep -rn "Type: AWS::Serverless::Api\|Type: AWS::ApiGateway" {scope}

# IAM roles
grep -rn "Type: AWS::IAM::Role" {scope}
```

---

## Authentication Detection

### JWT

```bash
grep -rn "jwt\|jsonwebtoken\|jose\|JWT\|Bearer" {scope}
```

### OAuth/OIDC

```bash
grep -rn "oauth\|oidc\|openid\|authorization_code\|client_credentials" {scope}
```

### Session-based

```bash
grep -rn "session\|cookie\|express-session\|gorilla/sessions" {scope}
```

### API Keys

```bash
grep -rn "api.key\|apikey\|x-api-key\|Authorization.*Key" {scope}
```

---

## Sensitive Data Detection

### Secrets in Code (Anti-patterns)

```bash
# Hardcoded secrets (should flag for review)
grep -rn "password\s*=\s*['\"].\+['\"]\|secret\s*=\s*['\"].\+['\"]\|api_key\s*=\s*['\"].\+['\"]" {scope}

# AWS credentials
grep -rn "AKIA[A-Z0-9]{16}\|aws_secret_access_key" {scope}

# Private keys
grep -rn "BEGIN RSA PRIVATE KEY\|BEGIN PRIVATE KEY" {scope}
```

### Sensitive Endpoints

```bash
# Admin paths
grep -rn "/admin\|/management\|/internal\|/debug" {scope}

# Health/metrics (can leak info)
grep -rn "/health\|/metrics\|/status\|/info" {scope}

# User data
grep -rn "/users\|/profile\|/account\|/settings" {scope}
```

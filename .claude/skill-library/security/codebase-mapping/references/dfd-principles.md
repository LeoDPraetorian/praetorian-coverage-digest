# Data Flow Diagram Principles

**DFD methodology for security-focused codebase analysis.**

---

## Overview

Data Flow Diagrams (DFDs) are a foundational technique for threat modeling. They visualize how data moves through a system, making it easier to identify where security controls are needed.

**Key insight**: Security vulnerabilities often exist at the boundaries where data transitions between components or trust levels.

---

## DFD Elements

### 1. External Entities

**Definition**: Actors outside the system boundary that interact with the system.

**Examples**:
- Users (authenticated, anonymous, admin)
- External APIs (payment gateways, OAuth providers)
- Third-party services (email, SMS, analytics)
- Other internal systems

**Security Relevance**:
- All input from external entities is **untrusted by default**
- Authentication required before trust can be established
- Input validation must happen at system boundary

**Detection in Code**:
```bash
# Look for request handlers, API clients, webhook receivers
grep -rn "http\.Request\|req\.body\|request\.json\|ctx\.Request" {scope}
```

### 2. Processes

**Definition**: Components that transform, process, or route data.

**Examples**:
- API handlers
- Business logic services
- Data transformation functions
- Authentication/authorization middleware

**Security Relevance**:
- Processes should validate all inputs
- Processes should sanitize outputs
- Errors should be handled securely (no stack traces to users)
- Logging should not contain sensitive data

**Detection in Code**:
```bash
# Functions that transform data
grep -rn "func.*\(.*\).*error\|async function\|def .*\(.*\):" {scope}
```

### 3. Data Stores

**Definition**: Persistent storage where data is kept at rest.

**Examples**:
- Databases (SQL, NoSQL)
- File systems
- Object storage (S3)
- Caches (Redis, Memcached)
- Message queues

**Security Relevance**:
- Encryption at rest
- Access control (IAM, connection strings)
- Query parameterization (prevent injection)
- Backup and recovery security

**Detection in Code**:
```bash
# Database connections and operations
grep -rn "sql\.Open\|mongoose\.connect\|DynamoDBClient\|RedisClient" {scope}
```

### 4. Data Flows

**Definition**: Movement of data between elements.

**Types**:
| Flow Type | Security Concern |
|-----------|------------------|
| User → System | Input validation, authentication |
| System → Database | Query injection, access control |
| System → External | SSRF, credential exposure |
| System → User | Data leakage, XSS |

**Security Relevance**:
- Encryption in transit (TLS)
- Data minimization (only send what's needed)
- Sensitive data masking in logs

**Detection in Code**:
```bash
# Data movement patterns
grep -rn "\.send\|\.write\|\.emit\|return.*json\|res\.json" {scope}
```

### 5. Trust Boundaries

**Definition**: Lines across which trust level changes.

**Common Boundaries**:

| Boundary | Trust Change |
|----------|--------------|
| Internet → DMZ | Untrusted → Semi-trusted |
| DMZ → Internal | Semi-trusted → Trusted |
| User → Admin | Limited → Elevated |
| Service → Service | Cross-service trust |
| Application → Database | Code → Data |

**Security Relevance**:
- Security controls MUST exist at trust boundaries
- Data crossing boundaries must be validated
- Authentication/authorization at each boundary

---

## DFD Levels

### Level 0 (Context Diagram)

**Purpose**: High-level system view with external entities only.

```
┌─────────────┐     ┌─────────────────┐     ┌─────────────┐
│    Users    │────▶│     System      │────▶│  External   │
│             │◀────│                 │◀────│   APIs      │
└─────────────┘     └─────────────────┘     └─────────────┘
```

**What to capture**:
- All external actors
- High-level data flows
- System boundary

### Level 1 (Component Diagram)

**Purpose**: Break system into major components.

```
┌─────────────┐     ┌─────────────────┐     ┌─────────────┐
│    Users    │────▶│   Frontend      │────▶│   Backend   │
│             │◀────│   (React)       │◀────│   (Go)      │
└─────────────┘     └─────────────────┘     └──────┬──────┘
                                                   │
                           ┌───────────────────────┼───────────────────────┐
                           ▼                       ▼                       ▼
                    ┌─────────────┐         ┌─────────────┐         ┌─────────────┐
                    │  DynamoDB   │         │   Neo4j     │         │    S3       │
                    └─────────────┘         └─────────────┘         └─────────────┘
```

**What to capture**:
- Major components (frontend, backend, databases)
- Data flows between components
- Trust boundaries between components

### Level 2 (Process Diagram)

**Purpose**: Detail within a specific component.

```
Backend Component:
┌────────────────────────────────────────────────────────────────┐
│                                                                │
│  ┌─────────────┐     ┌─────────────┐     ┌─────────────┐      │
│  │    Auth     │────▶│  Business   │────▶│    Data     │      │
│  │  Middleware │     │   Logic     │     │   Access    │      │
│  └─────────────┘     └─────────────┘     └─────────────┘      │
│        │                   │                   │               │
│        ▼                   ▼                   ▼               │
│  ┌─────────────┐     ┌─────────────┐     ┌─────────────┐      │
│  │   Session   │     │   Logging   │     │  Database   │      │
│  │   Store     │     │   Service   │     │   Pool      │      │
│  └─────────────┘     └─────────────┘     └─────────────┘      │
│                                                                │
└────────────────────────────────────────────────────────────────┘
```

**What to capture**:
- Internal processes within component
- Data transformations
- Internal trust boundaries

---

## Security Analysis Questions

For each DFD element, ask:

### External Entities
- [ ] Is authentication required?
- [ ] What trust level does this entity have?
- [ ] Can this entity be spoofed?

### Processes
- [ ] Does it validate all inputs?
- [ ] Does it sanitize outputs?
- [ ] Does it handle errors securely?
- [ ] Does it log appropriately (not too much, not too little)?

### Data Stores
- [ ] Is data encrypted at rest?
- [ ] Are connections authenticated?
- [ ] Are queries parameterized?
- [ ] Is access logged?

### Data Flows
- [ ] Is data encrypted in transit?
- [ ] Is data minimized (only necessary fields)?
- [ ] Are sensitive fields masked in logs?
- [ ] Is the connection authenticated?

### Trust Boundaries
- [ ] Is there authentication at this boundary?
- [ ] Is there authorization at this boundary?
- [ ] Is input validation performed?
- [ ] Is output encoding performed?

---

## DFD to Threat Model

DFD elements map to STRIDE threats:

| DFD Element | Primary STRIDE Threats |
|-------------|----------------------|
| External Entity | **S**poofing |
| Process | **T**ampering, **I**nformation Disclosure, **D**oS |
| Data Store | **T**ampering, **I**nformation Disclosure, **R**epudiation |
| Data Flow | **T**ampering, **I**nformation Disclosure, **D**oS |
| Trust Boundary | **E**levation of Privilege |

---

## Practical Application

### Step 1: Draw Level 0

Identify all external entities and the system boundary.

```bash
# Find external integrations
grep -rn "http\.Client\|axios\|fetch\|requests\." {scope}
grep -rn "oauth\|webhook\|callback\|external" {scope}
```

### Step 2: Draw Level 1

Break into components based on directory structure.

```bash
# Identify component boundaries
ls -d {scope}/*/ | head -20
```

### Step 3: Identify Data Stores

Find all persistence mechanisms.

```bash
# Database connections
grep -rn "sql\.Open\|mongo\|dynamodb\|redis\|s3" {scope}
```

### Step 4: Trace Data Flows

Follow data from entry to storage to exit.

```bash
# Entry points
grep -rn "req\.Body\|request\.json\|ctx\.Bind" {scope}

# Storage operations
grep -rn "\.Insert\|\.Create\|\.Put\|\.Write" {scope}

# Exit points
grep -rn "json\.Marshal\|res\.json\|response\.write" {scope}
```

### Step 5: Mark Trust Boundaries

Identify where trust level changes.

```bash
# Authentication boundaries
grep -rn "middleware\|guard\|auth\|jwt\.Parse" {scope}

# Network boundaries
grep -rn "vpc\|subnet\|firewall\|security.group" {scope}
```

---

## Output Format

DFD findings should be captured in `data-flows.json` and `trust-boundaries.json` using the schemas defined in [output-schemas.md](output-schemas.md).

Visual diagrams can be generated in `architecture.md` using ASCII art or Mermaid notation for human review.

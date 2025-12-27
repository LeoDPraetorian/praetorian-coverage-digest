# Output Schemas

**JSON schemas for all codebase mapping artifacts.**

---

## manifest.json

Technology stack detection results.

```json
{
  "$schema": "manifest-v1",
  "scope": "/path/to/analyzed/directory",
  "analyzedAt": "2024-12-17T10:00:00Z",
  "technologies": {
    "primaryLanguage": "go",
    "languages": [
      { "name": "go", "fileCount": 150, "percentage": 65 },
      { "name": "typescript", "fileCount": 80, "percentage": 35 }
    ],
    "frameworks": [
      { "name": "aws-lambda-go", "detected": "go.mod dependency" },
      { "name": "react", "detected": "package.json dependency" }
    ],
    "infrastructure": {
      "type": "serverless",
      "provider": "aws",
      "indicators": ["template.yaml", "serverless.yml"]
    },
    "databases": [
      { "type": "dynamodb", "detected": "aws-sdk-go-v2/service/dynamodb" },
      { "type": "neo4j", "detected": "neo4j-go-driver" }
    ]
  },
  "metrics": {
    "totalFiles": 230,
    "totalDirectories": 45,
    "estimatedLOC": 25000
  }
}
```

---

## components/{name}.json

Per-component analysis results.

```json
{
  "$schema": "component-v1",
  "name": "backend-api",
  "path": "./backend",
  "type": "backend",
  "description": "REST API handling user requests",
  "technologies": {
    "language": "go",
    "framework": "aws-lambda-go",
    "runtime": "go1.21"
  },
  "responsibilities": [
    "Handle HTTP requests via API Gateway",
    "Process business logic",
    "Interact with DynamoDB and Neo4j"
  ],
  "dependencies": {
    "internal": ["pkg/models", "pkg/utils"],
    "external": ["aws-sdk-go-v2", "neo4j-go-driver"]
  },
  "entryPoints": [
    {
      "type": "http",
      "path": "/api/assets",
      "methods": ["GET", "POST", "PUT", "DELETE"],
      "handler": "pkg/handler/handlers/asset/handler.go:45"
    }
  ],
  "dataStores": [
    {
      "type": "dynamodb",
      "table": "chariot-assets",
      "operations": ["read", "write", "delete"]
    }
  ],
  "securityRelevant": {
    "authenticationRequired": true,
    "authorizationModel": "RBAC",
    "inputValidation": "partial",
    "logging": "structured"
  }
}
```

---

## entry-points.json

Complete attack surface inventory.

```json
{
  "$schema": "entry-points-v1",
  "scope": "/path/to/analyzed/directory",
  "summary": {
    "total": 45,
    "byType": {
      "http": 30,
      "graphql": 5,
      "websocket": 2,
      "cli": 3,
      "messageQueue": 5
    },
    "byRiskLevel": {
      "high": 15,
      "medium": 20,
      "low": 10
    }
  },
  "entryPoints": [
    {
      "id": "ep-001",
      "type": "http",
      "method": "POST",
      "path": "/api/auth/login",
      "handler": {
        "file": "pkg/handler/handlers/auth/login.go",
        "line": 25,
        "function": "HandleLogin"
      },
      "riskLevel": "high",
      "riskFactors": ["Accepts credentials", "No rate limiting detected", "Creates session tokens"],
      "inputParameters": [
        { "name": "email", "type": "string", "source": "body" },
        { "name": "password", "type": "string", "source": "body" }
      ],
      "authentication": "none",
      "authorization": "none",
      "component": "backend-api"
    },
    {
      "id": "ep-002",
      "type": "http",
      "method": "GET",
      "path": "/api/assets",
      "handler": {
        "file": "pkg/handler/handlers/asset/list.go",
        "line": 15,
        "function": "HandleList"
      },
      "riskLevel": "medium",
      "riskFactors": ["Returns sensitive data", "Query parameters for filtering"],
      "inputParameters": [
        { "name": "filter", "type": "string", "source": "query" },
        { "name": "limit", "type": "integer", "source": "query" }
      ],
      "authentication": "jwt",
      "authorization": "role-based",
      "component": "backend-api"
    }
  ]
}
```

---

## data-flows.json

Data movement through the system.

```json
{
  "$schema": "data-flows-v1",
  "scope": "/path/to/analyzed/directory",
  "flows": [
    {
      "id": "df-001",
      "name": "User Authentication Flow",
      "description": "User credentials through auth system",
      "sensitivity": "high",
      "steps": [
        {
          "order": 1,
          "type": "source",
          "name": "User Input",
          "location": "HTTP POST /api/auth/login",
          "dataTypes": ["credentials"]
        },
        {
          "order": 2,
          "type": "process",
          "name": "Credential Validation",
          "location": "pkg/auth/validate.go",
          "operations": ["hash comparison", "rate limiting"]
        },
        {
          "order": 3,
          "type": "store",
          "name": "Session Creation",
          "location": "DynamoDB:sessions",
          "operations": ["write"]
        },
        {
          "order": 4,
          "type": "sink",
          "name": "Token Response",
          "location": "HTTP Response",
          "dataTypes": ["jwt-token"]
        }
      ],
      "securityControls": {
        "encryption": {
          "inTransit": true,
          "atRest": true
        },
        "validation": "schema-based",
        "logging": "audit-trail"
      }
    },
    {
      "id": "df-002",
      "name": "Asset Data Flow",
      "description": "Asset CRUD operations",
      "sensitivity": "medium",
      "steps": [
        {
          "order": 1,
          "type": "source",
          "name": "API Request",
          "location": "HTTP /api/assets/*",
          "dataTypes": ["asset-data"]
        },
        {
          "order": 2,
          "type": "process",
          "name": "Business Logic",
          "location": "pkg/handler/handlers/asset/",
          "operations": ["validation", "transformation"]
        },
        {
          "order": 3,
          "type": "store",
          "name": "Primary Storage",
          "location": "DynamoDB:assets",
          "operations": ["read", "write", "delete"]
        },
        {
          "order": 4,
          "type": "store",
          "name": "Graph Storage",
          "location": "Neo4j:assets",
          "operations": ["read", "write"]
        }
      ]
    }
  ],
  "externalIntegrations": [
    {
      "name": "GitHub API",
      "type": "outbound",
      "dataExchanged": ["repository metadata", "commit history"],
      "authentication": "oauth-token",
      "location": "pkg/integrations/github/"
    }
  ]
}
```

---

## trust-boundaries.json

Security boundary definitions.

```json
{
  "$schema": "trust-boundaries-v1",
  "scope": "/path/to/analyzed/directory",
  "boundaries": [
    {
      "id": "tb-001",
      "name": "Internet to Application",
      "type": "network",
      "from": {
        "trustLevel": "untrusted",
        "description": "Public internet"
      },
      "to": {
        "trustLevel": "dmz",
        "description": "API Gateway / Load Balancer"
      },
      "location": "infrastructure/api-gateway.tf",
      "controls": {
        "required": ["TLS", "WAF", "Rate Limiting", "DDoS Protection"],
        "detected": ["TLS", "Rate Limiting"],
        "missing": ["WAF", "DDoS Protection"]
      }
    },
    {
      "id": "tb-002",
      "name": "Unauthenticated to Authenticated",
      "type": "authentication",
      "from": {
        "trustLevel": "anonymous",
        "description": "Unauthenticated requests"
      },
      "to": {
        "trustLevel": "authenticated",
        "description": "Verified user identity"
      },
      "location": "pkg/middleware/auth.go",
      "controls": {
        "required": ["JWT Validation", "Session Management", "Token Expiry"],
        "detected": ["JWT Validation", "Token Expiry"],
        "missing": ["Session Management"]
      }
    },
    {
      "id": "tb-003",
      "name": "Application to Database",
      "type": "data",
      "from": {
        "trustLevel": "application",
        "description": "Backend services"
      },
      "to": {
        "trustLevel": "data",
        "description": "DynamoDB / Neo4j"
      },
      "location": "pkg/database/",
      "controls": {
        "required": ["IAM Roles", "Encryption at Rest", "Query Parameterization"],
        "detected": ["IAM Roles", "Encryption at Rest", "Query Parameterization"],
        "missing": []
      }
    },
    {
      "id": "tb-004",
      "name": "User Role Boundary",
      "type": "authorization",
      "from": {
        "trustLevel": "user",
        "description": "Standard authenticated users"
      },
      "to": {
        "trustLevel": "admin",
        "description": "Administrative functions"
      },
      "location": "pkg/middleware/rbac.go",
      "controls": {
        "required": ["RBAC", "Audit Logging", "Privilege Separation"],
        "detected": ["RBAC"],
        "missing": ["Audit Logging", "Privilege Separation"]
      }
    }
  ],
  "summary": {
    "totalBoundaries": 4,
    "controlCoverage": {
      "fullyProtected": 1,
      "partiallyProtected": 3,
      "unprotected": 0
    }
  }
}
```

---

## summary.md

Compressed findings for handoff. **Must be <2000 tokens.**

```markdown
# Codebase Analysis Summary

**Scope**: /path/to/analyzed/directory
**Analyzed**: 2024-12-17T10:00:00Z

## Technology Stack

- **Primary**: Go 1.21 (65%) + TypeScript (35%)
- **Backend**: AWS Lambda + API Gateway + DynamoDB + Neo4j
- **Frontend**: React 19 + Vite + TailwindCSS
- **Infrastructure**: AWS (Serverless), Terraform

## Components (4)

| Component      | Type     | Files | Entry Points      |
| -------------- | -------- | ----- | ----------------- |
| backend-api    | Backend  | 150   | 30 HTTP endpoints |
| frontend-ui    | Frontend | 80    | React SPA         |
| infrastructure | IaC      | 25    | N/A               |
| cli-tools      | CLI      | 15    | 3 commands        |

## Attack Surface

- **Total Entry Points**: 45
- **High Risk**: 15 (auth endpoints, file uploads, admin functions)
- **Medium Risk**: 20 (data queries, mutations)
- **External Integrations**: 5 (GitHub, Okta, AWS services)

## Key Trust Boundaries

1. **Internet → API Gateway**: TLS ✅, Rate Limiting ✅, WAF ❌
2. **Anonymous → Authenticated**: JWT ✅, Session Mgmt ❌
3. **Application → Database**: IAM ✅, Encryption ✅, Parameterization ✅
4. **User → Admin**: RBAC ✅, Audit Logging ❌

## Security-Relevant Findings

- [ ] WAF not configured on API Gateway
- [ ] Session management relies solely on JWT (no server-side sessions)
- [ ] Admin audit logging incomplete
- [ ] 3 endpoints accept file uploads without content validation

## Recommended Focus Areas

1. Authentication flow (login, token refresh, logout)
2. File upload handling (3 endpoints)
3. Admin privilege escalation paths
4. External integration security (GitHub OAuth, Okta SAML)

---

_Token count: ~450 tokens_
```

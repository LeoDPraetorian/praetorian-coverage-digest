# Chariot Production Architecture Patterns

**Backend module structure and service patterns for the Chariot attack surface management platform.**

---

## Backend Module Structure

```
modules/chariot/backend/
├── pkg/
│   ├── cloud/service/
│   │   └── services/
│   │       ├── dynamodb/
│   │       │   └── dynamodb.go  (Tenant-scoped table)
│   │       ├── s3/
│   │       │   └── files.go     (Hierarchical keys)
│   │       ├── sqs/
│   │       │   └── queue.go     (Message tagging)
│   │       └── ssm/
│   │           └── secrets.go   (Tenant secrets)
│   ├── api/handlers/
│   │   └── {endpoint}/main.go   (Lambda handlers)
│   └── repository/
│       └── {entity}/repo.go      (Domain models)
├── template.yml                   (SAM template)
└── Makefile                       (Deployment)
```

---

## Common Services Used

| Service         | Chariot Usage        | Multi-Tenant Pattern              |
| --------------- | -------------------- | --------------------------------- |
| **DynamoDB**    | Primary data store   | Partition key = tenant            |
| **S3**          | Scan results, files  | Key prefix = tenant               |
| **SQS**         | Job queue            | Message attribute: tenant         |
| **Neo4j**       | Attack surface graph | Cypher WHERE tenant = ...         |
| **Lambda**      | All backend logic    | IAM role + tenant context         |
| **API Gateway** | HTTP endpoints       | Cognito claims → tenant           |
| **CloudWatch**  | Logging              | Structured logs with tenant field |

---

## Related Patterns

- [chariot-patterns.md](chariot-patterns.md) - Multi-tenant patterns overview
- [client-creation.md](client-creation.md) - Singleton client patterns
- [infrastructure-as-code.md](infrastructure-as-code.md) - SAM/CloudFormation templates

---

**Source:** `modules/chariot/backend/` - Production code serving enterprise customers

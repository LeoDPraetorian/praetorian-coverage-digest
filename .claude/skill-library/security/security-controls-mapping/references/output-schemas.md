# Output Schemas

**JSON schemas for Phase 2 security controls mapping artifacts.**

---

## Authentication Controls Schema

**File**: `authentication.json`

```json
{
  "phase": "Phase 2: Security Controls Mapping",
  "category": "authentication",
  "stride_defense": "Spoofing",
  "analysis_date": "YYYY-MM-DD",
  "scope": "{analyzed scope}",

  "mechanisms": [
    {
      "id": "AUTH-001",
      "name": "{mechanism name}",
      "type": "jwt|session|api_key|oauth|saml|custom",
      "provider": "{Cognito|Auth0|Okta|custom}",
      "implementation": {
        "location": "{file path or service}",
        "entry_points": ["{endpoints using this auth}"],
        "token_storage": "cookie|localStorage|header",
        "expiration": "{duration}"
      },
      "mfa": {
        "enabled": true|false,
        "type": "totp|sms|email|none",
        "enforcement": "required|optional|admin_only"
      },
      "password_policy": {
        "min_length": 8,
        "complexity": "required|optional",
        "rotation": "{policy}"
      },
      "threats_mitigated": ["Spoofing", "Credential Theft"],
      "limitations": ["{known limitations}"],
      "verification_status": "verified|unverified|partial"
    }
  ],

  "session_management": {
    "type": "stateless|stateful",
    "storage": "{Redis|DynamoDB|memory}",
    "timeout": "{duration}",
    "revocation": "supported|not_supported"
  },

  "coverage": {
    "endpoints_protected": "{percentage}",
    "unprotected_endpoints": ["{list}"]
  }
}
```

---

## Authorization Controls Schema

**File**: `authorization.json`

```json
{
  "phase": "Phase 2: Security Controls Mapping",
  "category": "authorization",
  "stride_defense": "Elevation of Privilege",
  "analysis_date": "YYYY-MM-DD",

  "model": "RBAC|ABAC|custom",

  "roles": [
    {
      "name": "{role name}",
      "permissions": ["{permission list}"],
      "assignment": "static|dynamic"
    }
  ],

  "policies": [
    {
      "id": "AUTHZ-001",
      "name": "{policy name}",
      "type": "allow|deny",
      "resources": ["{protected resources}"],
      "conditions": ["{conditions}"],
      "enforcement_point": "{location}"
    }
  ],

  "tenant_isolation": {
    "enabled": true|false,
    "mechanism": "{partition keys|query filters|row-level}",
    "enforcement_points": ["{locations}"],
    "verification_status": "verified|unverified"
  },

  "privilege_separation": {
    "admin_user_separation": true|false,
    "service_accounts": ["{list}"],
    "least_privilege": "enforced|partial|not_enforced"
  }
}
```

---

## Input Validation Schema

**File**: `input-validation.json`

```json
{
  "phase": "Phase 2: Security Controls Mapping",
  "category": "input_validation",
  "stride_defense": "Tampering",
  "analysis_date": "YYYY-MM-DD",

  "validation_framework": "{Zod|Joi|custom|none}",

  "validation_points": [
    {
      "id": "VAL-001",
      "location": "{file:line}",
      "input_type": "body|query|path|header",
      "validation_type": "schema|type|length|format|custom",
      "schema_definition": "{reference to schema}",
      "sanitization": true|false,
      "error_handling": "reject|sanitize|log"
    }
  ],

  "injection_prevention": {
    "sql": {
      "parameterized_queries": true|false,
      "orm_usage": "{ORM name}",
      "raw_query_locations": ["{locations}"]
    },
    "nosql": {
      "safe_operations": true|false,
      "raw_query_locations": ["{locations}"]
    },
    "command": {
      "shell_execution": ["{locations}"],
      "safe_execution": true|false
    }
  },

  "coverage": {
    "endpoints_validated": "{percentage}",
    "unvalidated_inputs": ["{list}"]
  }
}
```

---

## Cryptography Schema

**File**: `cryptography.json`

```json
{
  "phase": "Phase 2: Security Controls Mapping",
  "category": "cryptography",
  "stride_defense": "Information Disclosure",
  "analysis_date": "YYYY-MM-DD",

  "encryption_at_rest": [
    {
      "id": "CRYPT-001",
      "data_type": "{what is encrypted}",
      "algorithm": "AES-256|AES-128|custom",
      "key_management": "KMS|Vault|local",
      "key_rotation": "automatic|manual|none",
      "location": "{storage location}"
    }
  ],

  "encryption_in_transit": {
    "tls_version": "1.2|1.3",
    "certificate_management": "{how managed}",
    "internal_traffic": "encrypted|unencrypted"
  },

  "hashing": [
    {
      "purpose": "password|integrity|tokens",
      "algorithm": "bcrypt|argon2|sha256",
      "salt": true|false,
      "location": "{where used}"
    }
  ],

  "key_management": {
    "storage": "KMS|Vault|HSM|environment",
    "access_control": "{who can access}",
    "rotation_policy": "{policy}",
    "audit_logging": true|false
  }
}
```

---

## Secrets Management Schema

**File**: `secrets-management.json`

```json
{
  "phase": "Phase 2: Security Controls Mapping",
  "category": "secrets_management",
  "stride_defense": "Information Disclosure",
  "analysis_date": "YYYY-MM-DD",

  "storage_mechanisms": [
    {
      "id": "SECRET-001",
      "type": "SSM|Vault|env_var|config_file",
      "encryption": true|false,
      "access_control": "{IAM|RBAC|none}",
      "secrets_stored": ["{types of secrets}"]
    }
  ],

  "rotation": {
    "automatic": true|false,
    "frequency": "{duration}",
    "secrets_rotated": ["{which secrets}"],
    "secrets_not_rotated": ["{which secrets}"]
  },

  "exposure_risks": [
    {
      "risk": "{description}",
      "location": "{where}",
      "severity": "Critical|High|Medium|Low"
    }
  ],

  "hardcoded_secrets": {
    "detected": true|false,
    "locations": ["{file:line}"],
    "types": ["{types found}"]
  }
}
```

---

## Control Gaps Schema

**File**: `control-gaps.json`

```json
{
  "phase": "Phase 2: Security Controls Mapping",
  "category": "control_gaps",
  "analysis_date": "YYYY-MM-DD",
  "total_gaps": 0,

  "gaps": [
    {
      "id": "GAP-001",
      "category": "authentication|authorization|input_validation|...",
      "name": "{gap name}",
      "description": "{detailed description}",
      "gap_type": "missing|partial|unverified",
      "severity": "Critical|High|Medium|Low",
      "stride_impact": ["Spoofing", "Tampering", "..."],
      "affected_components": ["{components}"],
      "affected_trust_boundaries": ["{boundaries}"],
      "current_state": "{what exists now}",
      "required_state": "{what should exist}",
      "recommendation": "{how to fix}",
      "priority": "immediate|short_term|medium_term|long_term",
      "effort_estimate": "low|medium|high",
      "verification_method": "{how to verify fix}"
    }
  ],

  "summary": {
    "by_severity": {
      "Critical": 0,
      "High": 0,
      "Medium": 0,
      "Low": 0
    },
    "by_category": {
      "authentication": 0,
      "authorization": 0,
      "input_validation": 0
    },
    "by_type": {
      "missing": 0,
      "partial": 0,
      "unverified": 0
    }
  }
}
```

---

## Additional Schemas

### Logging & Audit (`logging-audit.json`)
- Security event types logged
- Log storage and retention
- Audit trail completeness
- Alert mechanisms

### Rate Limiting (`rate-limiting.json`)
- Rate limit configurations
- Throttling mechanisms
- Circuit breakers
- DDoS protection

### CORS/CSP (`cors-csp.json`)
- CORS configuration
- CSP headers
- Allowed origins
- Unsafe patterns

### Dependency Security (`dependency-security.json`)
- Dependency scanning tools
- Lockfile usage
- Known vulnerability tracking
- Update policies

---

## Validation Rules

All JSON files MUST:
1. Have `phase`, `category`, `analysis_date` fields
2. Use consistent ID prefixes (AUTH-, AUTHZ-, VAL-, etc.)
3. Include `verification_status` for each control
4. Reference affected components from Phase 1

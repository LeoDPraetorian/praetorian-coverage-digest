# Detection Patterns

**Extended detection patterns for security controls by language and framework.**

---

## Authentication Detection

### Go

```bash
# AWS Cognito
grep -rn "cognitoidentityprovider\|cognito\|UserPoolId" {scope}

# JWT handling
grep -rn "jwt\|golang-jwt\|ParseWithClaims\|SignedString" {scope}

# Session management
grep -rn "session\|gorilla/sessions\|SetCookie" {scope}

# OAuth
grep -rn "oauth2\|OAuth\|AuthCodeURL\|Exchange" {scope}
```

### TypeScript/JavaScript

```bash
# AWS Amplify/Cognito
grep -rn "aws-amplify\|Amplify\.Auth\|Auth\.signIn" {scope}

# JWT
grep -rn "jsonwebtoken\|jwt\.verify\|jwt\.sign" {scope}

# Passport.js
grep -rn "passport\|authenticate\|serializeUser" {scope}

# NextAuth/Auth.js
grep -rn "next-auth\|NextAuth\|getServerSession" {scope}
```

### Python

```bash
# Flask-Login
grep -rn "flask_login\|login_required\|current_user" {scope}

# Django Auth
grep -rn "django\.contrib\.auth\|authenticate\|login" {scope}

# JWT
grep -rn "PyJWT\|jwt\.decode\|jwt\.encode" {scope}

# OAuth
grep -rn "authlib\|oauthlib\|OAuth2Session" {scope}
```

---

## Authorization Detection

### Go

```bash
# RBAC patterns
grep -rn "HasRole\|IsAdmin\|CheckPermission\|Authorize" {scope}

# Casbin (popular Go RBAC)
grep -rn "casbin\|Enforce\|AddPolicy" {scope}

# Middleware patterns
grep -rn "middleware\|RequireAuth\|RequireRole" {scope}
```

### TypeScript/JavaScript

```bash
# CASL
grep -rn "@casl\|ability\|can\|cannot" {scope}

# Custom RBAC
grep -rn "hasPermission\|checkRole\|isAuthorized" {scope}

# Express middleware
grep -rn "requireAuth\|isAdmin\|authorize" {scope}
```

### Infrastructure (IaC)

```bash
# IAM policies
grep -rn "AWS::IAM\|iam\.\|PolicyDocument\|Statement" {scope}

# Resource policies
grep -rn "Principal\|Action\|Resource\|Effect" {scope}

# Least privilege indicators
grep -rn "\*:\*\|Allow.*\*" {scope}  # Over-permissive policies
```

---

## Input Validation Detection

### Go

```bash
# Standard validation
grep -rn "validator\|validate\|Validate" {scope}

# go-playground/validator
grep -rn "binding:\|validate:\|required" {scope}

# SQL parameterization
grep -rn "Prepare\|QueryRow\|Exec.*\?" {scope}
grep -rn "fmt\.Sprintf.*SELECT\|fmt\.Sprintf.*INSERT" {scope}  # Dangerous
```

### TypeScript/JavaScript

```bash
# Zod
grep -rn "z\.\|zod\|\.parse\|\.safeParse" {scope}

# Joi
grep -rn "Joi\.\|\.validate\|\.required" {scope}

# Yup
grep -rn "yup\|\.string\(\)\|\.required\(\)" {scope}

# Express-validator
grep -rn "express-validator\|check\|validationResult" {scope}
```

### SQL Injection Indicators

```bash
# String concatenation in queries (DANGEROUS)
grep -rn "SELECT.*\+.*request\|INSERT.*\+.*body" {scope}
grep -rn "\$\{.*\}.*SELECT\|\$\{.*\}.*WHERE" {scope}
grep -rn "format.*SELECT\|format.*INSERT" {scope}

# Safe patterns (parameterized)
grep -rn "\?.*\?\|:param\|\$[0-9]" {scope}
```

---

## Cryptography Detection

### Encryption

```bash
# AWS KMS
grep -rn "KMS\|kms\|Encrypt\|Decrypt\|GenerateDataKey" {scope}

# AES
grep -rn "aes\|AES\|cipher\|GCM\|CBC" {scope}

# TLS/SSL
grep -rn "tls\|TLS\|ssl\|SSL\|https\|HTTPS" {scope}
grep -rn "InsecureSkipVerify\|SkipVerify" {scope}  # Dangerous
```

### Hashing

```bash
# Password hashing
grep -rn "bcrypt\|argon2\|scrypt\|PBKDF2" {scope}

# Weak hashing (audit these)
grep -rn "md5\|MD5\|sha1\|SHA1" {scope}

# Strong hashing
grep -rn "sha256\|SHA256\|sha512\|SHA512" {scope}
```

---

## Secrets Detection

```bash
# Environment variables
grep -rn "process\.env\|os\.Getenv\|environ\[" {scope}

# AWS SSM
grep -rn "SSM\|GetParameter\|Parameter.Store" {scope}

# HashiCorp Vault
grep -rn "vault\|Vault\|Secret.*Read" {scope}

# Hardcoded secrets (DANGEROUS - audit these)
grep -rn "password.*=.*['\"]" {scope}
grep -rn "api.key.*=.*['\"]" {scope}
grep -rn "secret.*=.*['\"]" {scope}
grep -rn "-----BEGIN.*KEY-----" {scope}
```

---

## Logging Detection

```bash
# Go logging
grep -rn "log\.\|logrus\|zap\|zerolog" {scope}

# TypeScript/Node logging
grep -rn "console\.log\|winston\|pino\|bunyan" {scope}

# CloudWatch
grep -rn "CloudWatch\|PutLogEvents\|LogGroup" {scope}

# Sensitive data in logs (audit these)
grep -rn "log.*password\|log.*secret\|log.*token" {scope}
```

---

## Rate Limiting Detection

```bash
# Go rate limiters
grep -rn "rate\.Limiter\|golang\.org/x/time/rate\|throttle" {scope}

# Express rate limiting
grep -rn "express-rate-limit\|rateLimit\|windowMs" {scope}

# AWS API Gateway
grep -rn "ThrottlingBurstLimit\|ThrottlingRateLimit" {scope}

# Redis-based
grep -rn "redis.*rate\|incr.*expire\|MULTI.*INCR" {scope}
```

---

## Browser Security Detection

```bash
# CORS
grep -rn "Access-Control\|cors\|CORS\|AllowOrigin" {scope}

# CSP
grep -rn "Content-Security-Policy\|helmet\|csp" {scope}

# Security headers
grep -rn "X-Frame-Options\|X-XSS-Protection\|Strict-Transport" {scope}

# Cookie security
grep -rn "HttpOnly\|Secure\|SameSite" {scope}
```

---

## Dependency Security Detection

```bash
# Dependency scanning config
ls {scope}/.github/dependabot.yml 2>/dev/null
ls {scope}/renovate.json 2>/dev/null
ls {scope}/.snyk 2>/dev/null

# Lockfiles (should exist)
ls {scope}/package-lock.json {scope}/yarn.lock {scope}/go.sum 2>/dev/null

# Audit commands in CI
grep -rn "npm audit\|yarn audit\|go mod verify\|snyk test" {scope}/.github
```

---

## Red Flags to Audit

These patterns indicate potential security issues:

```bash
# Disabled security
grep -rn "InsecureSkipVerify\|NoAuth\|disable.*security" {scope}

# Debug/development settings in production
grep -rn "DEBUG.*true\|development\|localhost" {scope}

# Hardcoded credentials
grep -rn "password.*=.*['\"]admin\|password.*=.*['\"]123" {scope}

# SQL string concatenation
grep -rn "SELECT.*\+.*input\|WHERE.*\+.*param" {scope}

# eval/exec with user input
grep -rn "eval\(.*req\|exec\(.*body" {scope}

# Overly permissive IAM
grep -rn "\"Action\".*:\s*\"\*\"\|\"Resource\".*:\s*\"\*\"" {scope}
```

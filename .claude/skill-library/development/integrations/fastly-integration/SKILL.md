---
name: fastly-integration
description: Use when integrating with Fastly CDN, edge compute, and API services - service creation, domain management, DDoS protection
allowed-tools: Read, Bash, Grep, Glob, WebFetch
---

# Fastly Integration

Integrate with Fastly's CDN, edge compute (Compute@Edge), and API services using the fastly-js JavaScript client library.

## Quick Reference

| Operation | API | Key Method |
|-----------|-----|------------|
| Create Service | ServiceApi | `createService()` |
| Add Domain | DomainApi | `createDomain()` |
| Validate DNS | DomainApi | `checkDomain()` |
| Upload Package | PackageApi | `putPackage()` |
| Manage Tokens | TokensApi | `createToken()`, `revokeToken()` |
| ACL Management | AclsInComputeApi | `POST /resources/acls` |
| DDoS Events | DdosProtectionApi | `ddosProtectionEventList()` |

## Installation

```bash
npm install fastly
```

## Authentication

```javascript
const Fastly = require('fastly');

// Set API token globally
Fastly.ApiClient.instance.authenticate(process.env.FASTLY_API_TOKEN);
```

## Core Operations

### Create a CDN Service

```javascript
const serviceApi = new Fastly.ServiceApi();

const options = {
  name: "my-cdn-service",
  comment: "Production CDN for example.com",
  type: "vcl"  // or "wasm" for Compute services
};

serviceApi.createService(options)
  .then((serviceResponse) => {
    const serviceId = serviceResponse.id;
    console.log(`Service created with ID: ${serviceId}`);
    console.log(`Service version: ${serviceResponse.version}`);
    return serviceId;
  })
  .catch((error) => {
    console.error("Failed to create service:", error);
  });
```

### Add Domain to Service

```javascript
const domainApi = new Fastly.DomainApi();

const options = {
  service_id: "SU1Z0isxPaozGVKXdv0eY",
  version_id: 1,
  name: "www.example.com",
  comment: "Primary production domain"
};

domainApi.createDomain(options)
  .then((domainResponse) => {
    console.log(`Domain added: ${domainResponse.name}`);
    console.log(`Domain created at: ${domainResponse.created_at}`);
  })
  .catch((error) => {
    console.error("Failed to add domain:", error);
  });
```

### Validate Domain DNS

```javascript
const domainApi = new Fastly.DomainApi();

const options = {
  service_id: "SU1Z0isxPaozGVKXdv0eY",
  version_id: 1,
  domain_name: "www.example.com"
};

domainApi.checkDomain(options)
  .then((checkResult) => {
    const [domainDetails, currentCname, isConfigured] = checkResult;
    console.log(`Domain: ${domainDetails.name}`);
    console.log(`Current CNAME: ${currentCname}`);
    console.log(`Properly configured: ${isConfigured}`);
    if (!isConfigured) {
      console.log("Please update DNS to point to Fastly");
    }
  })
  .catch((error) => {
    console.error("Failed to check domain:", error);
  });
```

### Upload Compute Package

```javascript
const options = {
  service_id: "service_id_example",
  version_id: 56,
  expect: "100-continue",
  _package: "/path/to/package.wasm",
};

apiInstance.putPackage(options)
  .then((data) => {
    console.log(data, "API called successfully.");
  })
  .catch((error) => {
    console.error(error);
  });
```

## Security APIs

### DDoS Protection Events

```javascript
const options = {
  cursor: "cursor_example",
  limit: 20,
  service_id: "service_id_example",
  from: "2023-01-01T02:30Z",
  to: "2023-01-01T02:30Z",
  name: "name_example",
};

apiInstance.ddosProtectionEventList(options)
  .then((data) => {
    console.log(data, "API called successfully.");
  })
  .catch((error) => {
    console.error(error);
  });
```

### Token Management

```javascript
// Create token
apiInstance.createToken()
  .then((data) => console.log("Token created:", data))
  .catch((error) => console.error(error));

// Revoke tokens
const revokeOptions = {
  request_body: {
    data: [
      { id: "3krg2uUGZzb2W9Euo4moOY", type: "token" },
      { id: "71ZA6hv2FO6tGEQIE203Xj", type: "token" }
    ]
  }
};

apiInstance.bulkRevokeTokens(revokeOptions)
  .then(() => console.log("Tokens revoked"))
  .catch((error) => console.error(error));
```

## Fastly Products

| Product | Description | Use Case |
|---------|-------------|----------|
| **CDN** | Content Delivery Network | Static asset delivery, caching |
| **Compute@Edge** | Serverless edge compute | Custom logic at edge |
| **WAF** | Web Application Firewall | Security protection |
| **Image Optimizer** | Image processing | Image resizing, format conversion |
| **Video** | Video streaming | Live and VOD delivery |
| **Observability** | Real-time logging | Analytics, monitoring |

## Related Resources

- [Fastly API Reference](https://developer.fastly.com/reference/api/)
- [fastly-js GitHub](https://github.com/fastly/fastly-js)
- [Compute@Edge Documentation](https://developer.fastly.com/learning/compute/)
- [VCL Reference](https://developer.fastly.com/reference/vcl/)

# Chariot Platform: satisfies Operator Examples

**Real-world examples from the Chariot security platform codebase.**

## Example 1: Tabularium Status Codes

**Location:** Data schema definitions in `modules/tabularium/`

Chariot uses single-character status codes across all entities:

- `"A"` = Active
- `"D"` = Deleted
- `"U"` = Updating

**Problem:** Type annotations widen `"A" | "D" | "U"` to `string`, losing discriminated union capability.

**Solution with satisfies:**

```typescript
interface StatusCodeMap {
  active: string;
  deleted: string;
  updating: string;
}

// ✅ Validate structure + preserve exact status codes
const AssetStatusCodes = {
  active: "A",
  deleted: "D",
  updating: "U",
} satisfies StatusCodeMap;

// Extract literal type for discriminated unions
type AssetStatus = (typeof AssetStatusCodes)[keyof typeof AssetStatusCodes];
// Type: "A" | "D" | "U" (exact literals!)

// Use in API responses
interface Asset {
  id: string;
  status: AssetStatus; // Only "A" | "D" | "U" allowed
}

// Type-safe status checks
function isActive(asset: Asset): boolean {
  return asset.status === AssetStatusCodes.active; // Type: "A"
}
```

**Why satisfies wins here:**

- Validates all values are strings (schema compliance)
- Preserves exact `"A"`, `"D"`, `"U"` literals for runtime checks
- Enables discriminated unions for filtering logic
- Autocomplete works in IDE for status values

## Example 2: Asset Class Registry

**Location:** Asset classification in `modules/chariot/backend/`

Chariot manages diverse asset types: IPv4 addresses, domains, certificates, S3 buckets, etc.

**Problem:** Need to validate class definitions while preserving literal class names for API filters.

**Solution with satisfies:**

```typescript
interface AssetClassDefinition {
  class: string;
  category: "network" | "dns" | "crypto" | "cloud";
  scannable: boolean;
  riskScore?: number;
}

// ✅ Validate all definitions + preserve class name literals
const AssetClasses = {
  ipv4: {
    class: "ipv4",
    category: "network",
    scannable: true,
    riskScore: 5,
  },
  domain: {
    class: "domain",
    category: "dns",
    scannable: true,
    riskScore: 3,
  },
  certificate: {
    class: "certificate",
    category: "crypto",
    scannable: false,
    riskScore: 2,
  },
  s3_bucket: {
    class: "s3_bucket",
    category: "cloud",
    scannable: true,
    riskScore: 8,
  },
} satisfies Record<string, AssetClassDefinition>;

// Extract exact class names for type-safe filters
type AssetClassName = keyof typeof AssetClasses;
// Type: "ipv4" | "domain" | "certificate" | "s3_bucket"

// Type-safe graph query filters
interface GraphFilter {
  class?: AssetClassName; // Only valid class names!
}

const filter: GraphFilter = {
  class: "ipv4", // ✅ Autocomplete + validation
};

// Wrong class name caught at compile time
const badFilter: GraphFilter = {
  class: "ip_v4", // ❌ Error: not in AssetClassName union
};
```

**Why satisfies wins here:**

- 40+ asset classes in production - typos are common without validation
- Class names used in Neo4j graph queries (must match schema exactly)
- Preserves literals for API autocomplete
- Category validation prevents invalid combinations

## Example 3: React Router Configuration

**Location:** Frontend routes in `modules/chariot/ui/src/routes/`

Chariot UI has 20+ routes with authentication requirements, feature flags, and breadcrumb configs.

**Problem:** Need to validate route structure while preserving exact path strings for navigation.

**Solution with satisfies:**

```typescript
interface RouteConfig {
  path: string;
  component: string;
  requiresAuth: boolean;
  featureFlag?: string;
  breadcrumb?: string;
}

// ✅ Validate route configs + preserve literal paths
const ChariotRoutes = {
  dashboard: {
    path: "/dashboard",
    component: "Dashboard",
    requiresAuth: true,
    breadcrumb: "Dashboard",
  },
  assetList: {
    path: "/assets",
    component: "AssetList",
    requiresAuth: true,
    breadcrumb: "Assets",
  },
  assetDetail: {
    path: "/assets/:id",
    component: "AssetDetail",
    requiresAuth: true,
    breadcrumb: "Asset Details",
  },
  riskDashboard: {
    path: "/risks",
    component: "RiskDashboard",
    requiresAuth: true,
    featureFlag: "risk_management",
    breadcrumb: "Risks",
  },
  login: {
    path: "/login",
    component: "Login",
    requiresAuth: false,
  },
} satisfies Record<string, RouteConfig>;

// Extract literal paths for type-safe navigation
type ChariotPath = (typeof ChariotRoutes)[keyof typeof ChariotRoutes]["path"];
// Type: "/dashboard" | "/assets" | "/assets/:id" | "/risks" | "/login"

// Type-safe navigation function
function navigate(path: ChariotPath) {
  history.push(path); // Only valid paths allowed!
}

// Compile-time error on invalid paths
navigate("/dasboard"); // ❌ Error: typo caught!
navigate(ChariotRoutes.dashboard.path); // ✅ Type: "/dashboard"
```

**Why satisfies wins here:**

- 20+ routes = high typo risk in path strings
- Feature flags require validation (must be boolean or string)
- Path literals enable type-safe navigation helpers
- Breadcrumb validation prevents runtime errors

## Example 4: Backend API Endpoint Registry

**Location:** Lambda handlers in `modules/chariot/backend/handlers/`

Chariot backend has 50+ Lambda functions mapped to API Gateway endpoints.

**Problem:** Need to validate endpoint definitions while preserving literal HTTP methods and paths.

**Solution with satisfies:**

```typescript
interface APIEndpoint {
  method: "GET" | "POST" | "PUT" | "DELETE" | "PATCH";
  path: string;
  handler: string;
  auth: "required" | "optional" | "none";
  rateLimit?: number;
}

// ✅ Validate endpoint structure + preserve literal methods/paths
const ChariotEndpoints = {
  // Asset endpoints
  listAssets: {
    method: "GET",
    path: "/api/assets",
    handler: "ListAssetsHandler",
    auth: "required",
    rateLimit: 100,
  },
  getAsset: {
    method: "GET",
    path: "/api/assets/:id",
    handler: "GetAssetHandler",
    auth: "required",
  },
  createAsset: {
    method: "POST",
    path: "/api/assets",
    handler: "CreateAssetHandler",
    auth: "required",
    rateLimit: 10,
  },
  deleteAsset: {
    method: "DELETE",
    path: "/api/assets/:id",
    handler: "DeleteAssetHandler",
    auth: "required",
  },

  // Risk endpoints
  listRisks: {
    method: "GET",
    path: "/api/risks",
    handler: "ListRisksHandler",
    auth: "required",
    rateLimit: 100,
  },

  // Graph query endpoint
  graphQuery: {
    method: "POST",
    path: "/api/graph/query",
    handler: "GraphQueryHandler",
    auth: "required",
    rateLimit: 50,
  },
} satisfies Record<string, APIEndpoint>;

// Extract exact HTTP methods used in Chariot
type ChariotMethod = (typeof ChariotEndpoints)[keyof typeof ChariotEndpoints]["method"];
// Type: "GET" | "POST" | "DELETE" (only methods actually used!)
// Note: "PUT" | "PATCH" excluded because not used in Chariot

// Type-safe middleware registration
function registerEndpoint(method: ChariotMethod, path: string, handler: Function) {
  // TypeScript ensures only valid methods
}

// Extract endpoints by method (type-safe filtering)
type GETEndpoints = {
  [K in keyof typeof ChariotEndpoints]: (typeof ChariotEndpoints)[K]["method"] extends "GET"
    ? (typeof ChariotEndpoints)[K]
    : never;
}[keyof typeof ChariotEndpoints];
```

**Why satisfies wins here:**

- 50+ endpoints = validation critical for consistency
- HTTP method literals enable type-safe middleware
- Path literals prevent routing conflicts
- Rate limit validation (must be number if present)

## Example 5: Nebula Scanner Configuration

**Location:** Cloud scanner config in `modules/nebula/`

Nebula scans AWS, Azure, and GCP for security misconfigurations.

**Problem:** Need to validate scanner configs while preserving literal cloud provider names and service identifiers.

**Solution with satisfies:**

```typescript
interface ScannerConfig {
  provider: string;
  service: string;
  enabled: boolean;
  severity: "critical" | "high" | "medium" | "low";
  tags: string[];
}

// ✅ Validate scanner structure + preserve provider/service literals
const NebulaScanners = {
  awsS3PublicAccess: {
    provider: "aws",
    service: "s3",
    enabled: true,
    severity: "critical",
    tags: ["storage", "public-access"],
  },
  awsEC2OpenPorts: {
    provider: "aws",
    service: "ec2",
    enabled: true,
    severity: "high",
    tags: ["compute", "network"],
  },
  azureStoragePublicAccess: {
    provider: "azure",
    service: "storage",
    enabled: true,
    severity: "critical",
    tags: ["storage", "public-access"],
  },
  gcpStorageIAM: {
    provider: "gcp",
    service: "storage",
    enabled: true,
    severity: "high",
    tags: ["storage", "iam"],
  },
} satisfies Record<string, ScannerConfig>;

// Extract literal cloud providers
type CloudProvider = (typeof NebulaScanners)[keyof typeof NebulaScanners]["provider"];
// Type: "aws" | "azure" | "gcp"

// Type-safe scanner filtering
function enableScannersForProvider(provider: CloudProvider) {
  // Only valid providers allowed!
}

// Extract AWS-specific services
type AWSService = {
  [K in keyof typeof NebulaScanners]: (typeof NebulaScanners)[K]["provider"] extends "aws"
    ? (typeof NebulaScanners)[K]["service"]
    : never;
}[keyof typeof NebulaScanners];
// Type: "s3" | "ec2"
```

**Why satisfies wins here:**

- Multi-cloud = provider name typos common ("aws" vs "AWS")
- Severity validation prevents invalid risk scores
- Service literals enable provider-specific type filtering
- Tags validation (must be string array)

## Example 6: VQL Capability Registry

**Location:** Security capabilities in `modules/chariot-aegis-capabilities/`

Chariot uses VQL (Velociraptor Query Language) for security scanning capabilities.

**Problem:** Need to validate capability metadata while preserving literal capability names and categories.

**Solution with satisfies:**

```typescript
interface CapabilityDefinition {
  name: string;
  category: "recon" | "vuln" | "compliance" | "threat";
  vqlFile: string;
  enabled: boolean;
  riskScore: number;
}

// ✅ Validate capability structure + preserve name literals
const ChariotCapabilities = {
  exposedS3Buckets: {
    name: "exposed_s3_buckets",
    category: "vuln",
    vqlFile: "exposed_s3.vql",
    enabled: true,
    riskScore: 9,
  },
  sslCertificateExpiry: {
    name: "ssl_certificate_expiry",
    category: "compliance",
    vqlFile: "ssl_expiry.vql",
    enabled: true,
    riskScore: 6,
  },
  dnsRecon: {
    name: "dns_recon",
    category: "recon",
    vqlFile: "dns_enum.vql",
    enabled: true,
    riskScore: 3,
  },
  unauthorizedPorts: {
    name: "unauthorized_ports",
    category: "threat",
    vqlFile: "port_scan.vql",
    enabled: true,
    riskScore: 8,
  },
} satisfies Record<string, CapabilityDefinition>;

// Extract literal capability names for job scheduling
type CapabilityName = (typeof ChariotCapabilities)[keyof typeof ChariotCapabilities]["name"];
// Type: "exposed_s3_buckets" | "ssl_certificate_expiry" | "dns_recon" | "unauthorized_ports"

// Type-safe capability execution
function scheduleCapability(name: CapabilityName) {
  // Only valid capability names allowed!
}

// Filter capabilities by category
type VulnCapabilities = {
  [K in keyof typeof ChariotCapabilities]: (typeof ChariotCapabilities)[K]["category"] extends "vuln"
    ? (typeof ChariotCapabilities)[K]
    : never;
}[keyof typeof ChariotCapabilities];
```

**Why satisfies wins here:**

- 100+ capabilities in production = naming consistency critical
- Category validation prevents invalid capability types
- Risk score validation (1-10 range enforced at type level)
- VQL file path validation (must end in .vql)

## Pattern: Combining with `as const`

For **complete immutability**, combine `satisfies` with `as const`:

```typescript
const AssetStatusCodes = {
  active: "A",
  deleted: "D",
  updating: "U",
} as const satisfies StatusCodeMap;

// Now the entire object is deeply readonly
AssetStatusCodes.active = "X"; // ❌ Error: cannot assign to readonly property

// Benefit: prevents accidental mutations in shared config objects
```

**When to use `as const satisfies`:**

- Shared configuration objects
- Const enums
- Lookup tables
- API endpoint registries
- Any object that should never change at runtime

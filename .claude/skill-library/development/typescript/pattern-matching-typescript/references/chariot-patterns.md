# Chariot Integration Patterns

**Real-world pattern matching examples from the Chariot codebase.**

## TanStack Query State Handling

### Loading/Error/Success Pattern

**Common use case:** Rendering different UI based on TanStack Query state.

**Before (verbose conditionals):**

```typescript
import { useQuery } from '@tanstack/react-query';

function AssetList() {
  const query = useQuery({
    queryKey: ['assets'],
    queryFn: fetchAssets,
  });

  if (query.isLoading) {
    return <LoadingSpinner />;
  }

  if (query.isError) {
    return <ErrorMessage error={query.error} />;
  }

  if (query.isSuccess) {
    return <AssetTable data={query.data} />;
  }

  // Easy to forget this case!
  return null;
}
```

**After (exhaustive pattern matching):**

```typescript
import { useQuery } from '@tanstack/react-query';
import { match } from 'ts-pattern';

function AssetList() {
  const query = useQuery({
    queryKey: ['assets'],
    queryFn: fetchAssets,
  });

  return match(query)
    .with({ status: 'pending' }, () => <LoadingSpinner />)
    .with({ status: 'error' }, ({ error }) => <ErrorMessage error={error} />)
    .with({ status: 'success' }, ({ data }) => <AssetTable data={data} />)
    .exhaustive(); // ✅ Compile error if case missing
}
```

### Mutation State Handling

```typescript
import { useMutation } from '@tanstack/react-query';
import { match } from 'ts-pattern';

function DeleteAssetButton({ assetId }: { assetId: string }) {
  const mutation = useMutation({
    mutationFn: (id: string) => deleteAsset(id),
  });

  const buttonState = match(mutation)
    .with({ status: 'idle' }, () => ({ label: 'Delete', disabled: false }))
    .with({ status: 'pending' }, () => ({ label: 'Deleting...', disabled: true }))
    .with({ status: 'success' }, () => ({ label: 'Deleted', disabled: true }))
    .with({ status: 'error' }, () => ({ label: 'Retry', disabled: false }))
    .exhaustive();

  return (
    <button onClick={() => mutation.mutate(assetId)} disabled={buttonState.disabled}>
      {buttonState.label}
    </button>
  );
}
```

### Refetch State with Data

```typescript
function AssetListWithRefresh() {
  const query = useQuery({
    queryKey: ['assets'],
    queryFn: fetchAssets,
    refetchInterval: 30000,
  });

  return match(query)
    .with({ status: 'pending' }, () => <FullPageSpinner />)
    .with(
      { status: 'success', isFetching: true },
      ({ data }) => (
        <>
          <RefreshingIndicator />
          <AssetTable data={data} />
        </>
      )
    )
    .with({ status: 'success' }, ({ data }) => <AssetTable data={data} />)
    .with({ status: 'error', error: P.select() }, (error) => (
      <ErrorMessage error={error} onRetry={query.refetch} />
    ))
    .exhaustive();
}
```

## Job Execution State Handling

### Job Status with Nested Results

**Before (nested switch statements):**

```typescript
type Job = {
  id: string;
  status: "pending" | "running" | "completed" | "failed" | "cancelled";
  result?: {
    type: "success" | "partial" | "failure";
    findings?: Finding[];
    errors?: string[];
  };
};

function getJobSummary(job: Job): string {
  switch (job.status) {
    case "pending":
      return "Waiting to start...";
    case "running":
      return "Scan in progress...";
    case "completed":
      if (!job.result) return "Completed (no result)";
      switch (job.result.type) {
        case "success":
          return `Found ${job.result.findings?.length || 0} vulnerabilities`;
        case "partial":
          return `Partial scan: ${job.result.findings?.length || 0} found, ${
            job.result.errors?.length || 0
          } errors`;
        case "failure":
          return `Failed: ${job.result.errors?.join(", ")}`;
      }
    case "failed":
      return "Job failed to execute";
    case "cancelled":
      return "Job cancelled by user";
  }
}
```

**After (flat pattern matching):**

```typescript
import { match, P } from "ts-pattern";

const getJobSummary = (job: Job): string =>
  match(job)
    .with({ status: "pending" }, () => "Waiting to start...")
    .with({ status: "running" }, () => "Scan in progress...")
    .with(
      { status: "completed", result: { type: "success", findings: P.select() } },
      (findings) => `Found ${findings.length} vulnerabilities`
    )
    .with(
      {
        status: "completed",
        result: { type: "partial", findings: P.select("findings"), errors: P.select("errors") },
      },
      ({ findings, errors }) => `Partial scan: ${findings.length} found, ${errors.length} errors`
    )
    .with(
      { status: "completed", result: { type: "failure", errors: P.select() } },
      (errors) => `Failed: ${errors.join(", ")}`
    )
    .with({ status: "failed" }, () => "Job failed to execute")
    .with({ status: "cancelled" }, () => "Job cancelled by user")
    .exhaustive();
```

### Job Priority and Status Combined

```typescript
type JobPriority = "low" | "normal" | "high" | "critical";

const getJobColor = (job: Job, priority: JobPriority) =>
  match([job.status, priority] as const)
    .with(["running", "critical"], () => "red")
    .with(["running", "high"], () => "orange")
    .with(["running", P._], () => "blue")
    .with(["completed", P._], () => "green")
    .with(["failed", P._], () => "red")
    .with([P._, P._], () => "gray")
    .exhaustive();
```

## Integration Response Parsing

### Jira Integration

**Before (verbose type guards):**

```typescript
type JiraResponse =
  | { error: { code: number; message: string } }
  | { data: { issues: JiraIssue[] } };

function parseJiraResponse(response: JiraResponse) {
  if ("error" in response) {
    if (response.error.code === 401) {
      return { type: "auth_error" as const };
    }
    if (response.error.code === 403) {
      return { type: "permission_error" as const };
    }
    return { type: "api_error" as const, message: response.error.message };
  }
  if ("data" in response && response.data.issues) {
    return { type: "success" as const, issues: response.data.issues };
  }
  return { type: "unknown" as const };
}
```

**After (pattern matching):**

```typescript
import { match, P } from "ts-pattern";

const parseJiraResponse = (response: JiraResponse) =>
  match(response)
    .with({ error: { code: 401 } }, () => ({ type: "auth_error" as const }))
    .with({ error: { code: 403 } }, () => ({ type: "permission_error" as const }))
    .with({ error: { message: P.select() } }, (message) => ({
      type: "api_error" as const,
      message,
    }))
    .with({ data: { issues: P.select() } }, (issues) => ({
      type: "success" as const,
      issues,
    }))
    .otherwise(() => ({ type: "unknown" as const }));
```

### Microsoft Defender Integration

```typescript
type DefenderResponse =
  | { status: "success"; alerts: Alert[] }
  | { status: "error"; code: "unauthorized" | "rate_limited" | "internal_error" }
  | { status: "partial"; alerts: Alert[]; warnings: string[] };

const handleDefenderResponse = (response: DefenderResponse) =>
  match(response)
    .with({ status: "success", alerts: P.select() }, (alerts) => ({
      type: "success" as const,
      data: alerts,
    }))
    .with({ status: "error", code: "unauthorized" }, () => ({
      type: "auth_error" as const,
    }))
    .with({ status: "error", code: "rate_limited" }, () => ({
      type: "rate_limit" as const,
      retryAfter: 60,
    }))
    .with({ status: "error", code: "internal_error" }, () => ({
      type: "server_error" as const,
    }))
    .with(
      { status: "partial", alerts: P.select("alerts"), warnings: P.select("warnings") },
      ({ alerts, warnings }) => ({
        type: "partial_success" as const,
        data: alerts,
        warnings,
      })
    )
    .exhaustive();
```

### HackerOne Integration

```typescript
type HackerOneWebhook =
  | { action: "report_created"; report: Report }
  | { action: "report_updated"; report: Report; changes: Change[] }
  | { action: "report_closed"; report: Report; reason: string }
  | { action: "bounty_awarded"; report: Report; amount: number };

const processWebhook = (webhook: HackerOneWebhook) =>
  match(webhook)
    .with({ action: "report_created", report: P.select() }, (report) => createAsset(report))
    .with(
      { action: "report_updated", report: P.select("report"), changes: P.select("changes") },
      ({ report, changes }) => updateAsset(report, changes)
    )
    .with(
      { action: "report_closed", report: P.select("report"), reason: P.select("reason") },
      ({ report, reason }) => closeAsset(report, reason)
    )
    .with(
      { action: "bounty_awarded", report: P.select("report"), amount: P.select("amount") },
      ({ report, amount }) => recordBounty(report, amount)
    )
    .exhaustive();
```

## Asset Type-Specific Rendering

### Asset Class Branching

**Before (switch statement):**

```typescript
type AssetClass = 'domain' | 'ipv4' | 'ipv6' | 'cert' | 'webapp' | 'bucket';

function renderAssetIcon(asset: Asset): JSX.Element {
  switch (asset.class) {
    case 'domain':
      return <GlobeIcon />;
    case 'ipv4':
    case 'ipv6':
      return <ServerIcon />;
    case 'cert':
      return <LockIcon />;
    case 'webapp':
      return <WindowIcon />;
    case 'bucket':
      return <DatabaseIcon />;
    default:
      return <QuestionIcon />;
  }
}
```

**After (pattern matching with grouping):**

```typescript
import { match } from 'ts-pattern';

const renderAssetIcon = (asset: Asset): JSX.Element =>
  match(asset.class)
    .with('domain', () => <GlobeIcon />)
    .with('ipv4', 'ipv6', () => <ServerIcon />)
    .with('cert', () => <LockIcon />)
    .with('webapp', () => <WindowIcon />)
    .with('bucket', () => <DatabaseIcon />)
    .exhaustive(); // No default needed - exhaustive!
```

### Asset with Risk Score

```typescript
type Asset = {
  class: AssetClass;
  risk_score?: number;
  status: "active" | "inactive";
};

const getAssetBadge = (asset: Asset) =>
  match(asset)
    .with({ status: "active", risk_score: P.when((s) => s !== undefined && s >= 8) }, () => ({
      color: "red",
      label: "Critical",
    }))
    .with({ status: "active", risk_score: P.when((s) => s !== undefined && s >= 5) }, () => ({
      color: "orange",
      label: "High",
    }))
    .with({ status: "active" }, () => ({ color: "green", label: "Active" }))
    .with({ status: "inactive" }, () => ({ color: "gray", label: "Inactive" }))
    .exhaustive();
```

### Asset Details Rendering

```typescript
const AssetDetails = ({ asset }: { asset: Asset }) => {
  const details = match(asset)
    .with({ class: 'domain', dns: P.select() }, (dns) => ({
      title: 'Domain Information',
      content: <DnsRecords records={dns} />,
    }))
    .with({ class: 'webapp', http: P.select() }, (http) => ({
      title: 'Web Application',
      content: <HttpDetails details={http} />,
    }))
    .with({ class: 'bucket', storage: P.select() }, (storage) => ({
      title: 'Cloud Storage',
      content: <StorageDetails details={storage} />,
    }))
    .with({ class: 'cert', certificate: P.select() }, (cert) => ({
      title: 'SSL Certificate',
      content: <CertDetails certificate={cert} />,
    }))
    .otherwise(() => ({
      title: 'Asset Information',
      content: <GenericAssetView asset={asset} />,
    }));

  return (
    <div>
      <h2>{details.title}</h2>
      {details.content}
    </div>
  );
};
```

## Error Handling Patterns

### GraphQL Error Responses

```typescript
type GraphQLResponse<T> =
  | { data: T; errors: undefined }
  | { data: undefined; errors: Array<{ message: string; extensions?: any }> };

const handleGraphQLResponse = <T>(response: GraphQLResponse<T>) =>
  match(response)
    .with({ data: P.select(), errors: undefined }, (data) => ({
      type: "success" as const,
      data,
    }))
    .with(
      { errors: P.array({ message: P.select(), extensions: { code: "UNAUTHENTICATED" } }) },
      () => ({ type: "auth_error" as const })
    )
    .with({ errors: P.select() }, (errors) => ({
      type: "graphql_errors" as const,
      messages: errors.map((e) => e.message),
    }))
    .exhaustive();
```

### Form Validation Results

```typescript
type ValidationResult =
  | { valid: true; data: FormData }
  | { valid: false; errors: Record<string, string[]> };

const handleValidation = (result: ValidationResult) =>
  match(result)
    .with({ valid: true, data: P.select() }, (data) => submitForm(data))
    .with({ valid: false, errors: P.select() }, (errors) => displayErrors(errors))
    .exhaustive();
```

## Performance Optimization Patterns

### Memoized Pattern Matching

```typescript
import { useMemo } from 'react';
import { match } from 'ts-pattern';

function AssetCard({ asset }: { asset: Asset }) {
  // Memoize complex pattern matching
  const badge = useMemo(
    () =>
      match(asset)
        .with({ risk_score: P.when((s) => s >= 8) }, () => 'critical')
        .with({ risk_score: P.when((s) => s >= 5) }, () => 'high')
        .otherwise(() => 'normal'),
    [asset.risk_score]
  );

  return <div className={badge}>{asset.name}</div>;
}
```

### Conditional Pattern Matching

```typescript
// Only pattern match when needed
function AssetStatus({ asset }: { asset: Asset }) {
  // Simple case: no pattern matching needed
  if (!asset.risk_score) {
    return <span>No risk data</span>;
  }

  // Complex case: use pattern matching
  return match(asset)
    .with({ risk_score: P.when((s) => s >= 8), status: 'active' }, () => (
      <Badge color="red">Critical Active</Badge>
    ))
    .with({ risk_score: P.when((s) => s >= 8) }, () => (
      <Badge color="orange">Critical Inactive</Badge>
    ))
    .otherwise(() => <Badge color="green">Normal</Badge>);
}
```

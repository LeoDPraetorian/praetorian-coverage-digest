# Common Code Execution Patterns for MCP

Practical patterns and examples for efficient MCP code execution.

## Pattern 1: Large Dataset Filtering

### Problem

Spreadsheet with 10,000 rows would consume 500,000+ tokens if passed through model context.

### Solution

Filter in execution environment, return only relevant rows.

### Example: Sales Data Analysis

```typescript
// Agent writes this code:
import { excel } from '/servers/excel/index.ts';

// Load entire spreadsheet (happens in execution environment)
const data = await excel.read('/data/sales_report_2024.xlsx');

// Filter in code (not in model context)
const topPerformers = data
  .filter(row => row.revenue > 100000)
  .sort((a, b) => b.revenue - a.revenue)
  .slice(0, 10);

// Calculate summary statistics
const summary = {
  totalRevenue: data.reduce((sum, row) => sum + row.revenue, 0),
  averageRevenue: data.reduce((sum, row) => sum + row.revenue, 0) / data.length,
  topPerformers: topPerformers.map(row => ({
    name: row.salesPerson,
    revenue: row.revenue
  }))
};

// Only summary returned to model (< 1000 tokens vs 500,000)
return summary;
```

**Token Savings:**
- Without filtering: 10,000 rows × 50 tokens = 500,000 tokens
- With filtering: 10 rows + summary = < 1,000 tokens
- **Reduction: 99.8%**

## Pattern 2: Log File Analysis

### Problem

Application logs with 50,000 entries overwhelming context window.

### Solution

Parse and extract only errors and warnings with context.

### Example: Error Pattern Detection

```typescript
// Agent writes this code:
import { fs } from 'fs/promises';

// Read entire log file (in execution environment)
const logContent = await fs.readFile('/data/application.log', 'utf-8');
const lines = logContent.split('\n');

// Parse and filter for errors
const errors = lines
  .map((line, index) => {
    const match = line.match(/\[(ERROR|WARN)\] (.+)/);
    if (!match) return null;

    return {
      level: match[1],
      message: match[2],
      lineNumber: index + 1,
      // Include 2 lines of context
      context: lines.slice(Math.max(0, index - 2), index + 3)
    };
  })
  .filter(Boolean);

// Group by error pattern
const errorPatterns = errors.reduce((acc, error) => {
  const pattern = error.message.replace(/\d+/g, 'N'); // Normalize numbers
  if (!acc[pattern]) {
    acc[pattern] = {
      pattern,
      count: 0,
      examples: []
    };
  }
  acc[pattern].count++;
  if (acc[pattern].examples.length < 3) {
    acc[pattern].examples.push(error);
  }
  return acc;
}, {});

// Return only patterns and examples
return {
  totalErrors: errors.length,
  uniquePatterns: Object.keys(errorPatterns).length,
  topPatterns: Object.values(errorPatterns)
    .sort((a, b) => b.count - a.count)
    .slice(0, 5)
};
```

**Token Savings:**
- Without filtering: 50,000 lines × 20 tokens = 1,000,000 tokens
- With pattern analysis: 5 patterns × 200 tokens = 1,000 tokens
- **Reduction: 99.9%**

## Pattern 3: Multi-Step Data Transformation

### Problem

Need to download document, process it, and upload results across multiple services.

### Solution

Chain operations in code, only expose final result to model.

### Example: Document Processing Pipeline

```typescript
// Agent writes this code:
import { googleDrive } from '/servers/google-drive/index.ts';
import { openai } from '/servers/openai/index.ts';
import { salesforce } from '/servers/salesforce/index.ts';

// Step 1: Download meeting transcript (25,000 tokens)
const transcript = await googleDrive.getDocument({
  documentId: 'abc123',
  format: 'text'
});

// Step 2: Summarize with AI (happens in execution environment)
const summary = await openai.complete({
  prompt: `Summarize this meeting in 3 bullet points:\n\n${transcript.content}`,
  maxTokens: 200
});

// Step 3: Extract action items
const actionItems = extractActionItems(summary.completion);

// Step 4: Create Salesforce tasks
const tasks = await Promise.all(
  actionItems.map(item =>
    salesforce.createTask({
      subject: item.title,
      description: item.description,
      dueDate: item.dueDate
    })
  )
);

// Return only task IDs and summary (< 500 tokens total)
return {
  summary: summary.completion,
  tasksCreated: tasks.map(t => ({
    id: t.id,
    subject: t.subject
  }))
};

function extractActionItems(text: string) {
  // Parse action items from summary
  const lines = text.split('\n');
  return lines
    .filter(line => line.includes('TODO') || line.includes('ACTION'))
    .map(line => ({
      title: line.replace(/^[•\-*]\s*/, ''),
      description: line,
      dueDate: inferDueDate(line)
    }));
}

function inferDueDate(text: string): string {
  // Simple due date inference
  if (text.toLowerCase().includes('tomorrow')) {
    return new Date(Date.now() + 86400000).toISOString();
  }
  return new Date(Date.now() + 7 * 86400000).toISOString(); // Default 1 week
}
```

**Token Savings:**
- Without code execution:
  - Transcript: 25,000 tokens
  - Summary call: 25,000 tokens input
  - Task creation: 500 tokens × 5 tasks = 2,500 tokens
  - **Total: 52,500 tokens**

- With code execution:
  - Only final result: 500 tokens
  - **Reduction: 99.0%**

## Pattern 4: Progressive Tool Discovery

### Problem

Agent doesn't know which MCP servers are available or what tools they offer.

### Solution

Explore filesystem to discover available tools, load only needed definitions.

### Example: Dynamic Tool Discovery

```typescript
// Agent writes this code:
import { fs } from 'fs/promises';
import { path } from 'path';

// Step 1: List available MCP servers
const servers = await fs.readdir('/servers');
console.log('Available servers:', servers);
// Output: ['google-drive', 'salesforce', 'slack', 'excel']

// Step 2: Explore specific server to find tools
const salesforceTools = await fs.readdir('/servers/salesforce');
console.log('Salesforce tools:', salesforceTools);
// Output: ['createLead.ts', 'updateContact.ts', 'searchAccounts.ts']

// Step 3: Load only the tool definition we need
const { createLead } = await import('/servers/salesforce/createLead.ts');

// Step 4: Use the tool
const result = await createLead({
  firstName: 'John',
  lastName: 'Doe',
  email: 'john@example.com',
  company: 'Example Corp'
});

return result;
```

**Token Savings:**
- Without progressive disclosure:
  - Load all 50 tools upfront: 50 × 150 = 7,500 tokens
  - **Total: 7,500 tokens**

- With progressive discovery:
  - List servers: 50 tokens
  - List tools: 100 tokens
  - Load 1 tool: 150 tokens
  - **Total: 300 tokens**
  - **Reduction: 96.0%**

## Pattern 5: Privacy-Preserving Data Flow

### Problem

Processing sensitive PII (emails, phone numbers) that shouldn't enter model context.

### Solution

Tokenize sensitive data, process with tokens, detokenize only when needed.

### Example: Email Campaign Management

```typescript
// Agent writes this code:
import { salesforce } from '/servers/salesforce/index.ts';
import { sendgrid } from '/servers/sendgrid/index.ts';
import { tokenizer } from '/skills/privacy/tokenizer.ts';

// Step 1: Get contacts from Salesforce (contains PII)
const contacts = await salesforce.query({
  query: 'SELECT Email, FirstName, LastName FROM Contact WHERE Status = "Active"',
  limit: 1000
});

// Step 2: Tokenize emails (PII never enters model context)
const tokenMap = tokenizer.tokenize(
  contacts.map(c => c.Email),
  { type: 'email', ttl: 3600 }
);

// Step 3: Process with tokens
const emailCampaign = {
  subject: 'Monthly Newsletter',
  template: 'newsletter_template',
  recipients: tokenMap.tokens // Only tokens, not actual emails
};

// Step 4: Send via SendGrid (detokenizes inside execution environment)
const results = await sendgrid.sendBulkEmail({
  campaign: emailCampaign,
  tokenMap: tokenMap // Provider detokenizes with proper auth
});

// Return only statistics (no PII)
return {
  sent: results.sent,
  failed: results.failed,
  // Tokens, not actual emails
  failedRecipients: results.failures.map(f => f.recipientToken)
};
```

**Privacy Benefits:**
- ✅ Actual emails never enter model context
- ✅ Tokens are ephemeral (1 hour TTL)
- ✅ Detokenization requires proper authorization
- ✅ Audit trail for compliance (who accessed what)

## Pattern 6: Incremental Processing with Checkpoints

### Problem

Long-running job processing 100,000 records might timeout or fail partway.

### Solution

Process in batches with checkpoints, resume from last checkpoint on failure.

### Example: Bulk Data Migration

```typescript
// Agent writes this code:
import { fs } from 'fs/promises';
import { source } from '/servers/source-db/index.ts';
import { destination } from '/servers/destination-db/index.ts';

const BATCH_SIZE = 1000;
const CHECKPOINT_FILE = '/workspace/migration_checkpoint.json';

// Load checkpoint if exists
let checkpoint = { lastProcessedId: 0, totalProcessed: 0 };
try {
  const data = await fs.readFile(CHECKPOINT_FILE, 'utf-8');
  checkpoint = JSON.parse(data);
  console.log('Resuming from checkpoint:', checkpoint);
} catch (err) {
  console.log('Starting fresh migration');
}

let hasMore = true;
let errors = [];

while (hasMore) {
  // Fetch batch
  const records = await source.query({
    query: 'SELECT * FROM users WHERE id > ?',
    params: [checkpoint.lastProcessedId],
    limit: BATCH_SIZE
  });

  if (records.length === 0) {
    hasMore = false;
    break;
  }

  // Process batch
  try {
    await destination.bulkInsert(records);

    checkpoint.lastProcessedId = records[records.length - 1].id;
    checkpoint.totalProcessed += records.length;

    // Save checkpoint
    await fs.writeFile(
      CHECKPOINT_FILE,
      JSON.stringify(checkpoint),
      'utf-8'
    );

    console.log(`Processed ${checkpoint.totalProcessed} records`);
  } catch (err) {
    errors.push({
      batchStart: records[0].id,
      batchEnd: records[records.length - 1].id,
      error: err.message
    });

    // Continue with next batch (or implement retry logic)
  }

  hasMore = records.length === BATCH_SIZE;
}

// Return summary
return {
  totalProcessed: checkpoint.totalProcessed,
  errors: errors,
  checkpoint: checkpoint // Include for potential resume
};
```

**Benefits:**
- ✅ Resilient to timeouts and failures
- ✅ Can resume from last checkpoint
- ✅ Progress visible throughout
- ✅ Errors don't stop entire job

## Pattern 7: Caching Expensive Operations

### Problem

Repeatedly calling expensive API operations (e.g., ML inference) wastes time and tokens.

### Solution

Cache results in execution environment filesystem.

### Example: Document Classification with Caching

```typescript
// Agent writes this code:
import { fs } from 'fs/promises';
import { crypto } from 'crypto';
import { openai } from '/servers/openai/index.ts';

const CACHE_DIR = '/workspace/cache/classifications';

async function classifyDocument(documentText: string): Promise<string> {
  // Generate cache key
  const hash = crypto
    .createHash('sha256')
    .update(documentText)
    .digest('hex');

  const cacheFile = `${CACHE_DIR}/${hash}.json`;

  // Check cache first
  try {
    const cached = await fs.readFile(cacheFile, 'utf-8');
    console.log('Cache hit for document');
    return JSON.parse(cached).classification;
  } catch (err) {
    // Cache miss, proceed with classification
  }

  // Call expensive LLM classification
  const result = await openai.complete({
    prompt: `Classify this document into one category: Legal, Financial, Technical, or Marketing\n\n${documentText}`,
    maxTokens: 10
  });

  // Cache the result
  await fs.mkdir(CACHE_DIR, { recursive: true });
  await fs.writeFile(
    cacheFile,
    JSON.stringify({
      classification: result.completion,
      timestamp: Date.now()
    }),
    'utf-8'
  );

  return result.completion;
}

// Process multiple documents
const documents = await loadDocuments();
const classifications = await Promise.all(
  documents.map(doc => classifyDocument(doc.content))
);

return classifications;
```

**Benefits:**
- ✅ Repeated classifications are instant
- ✅ Saves API costs for duplicate content
- ✅ Reduces execution time
- ✅ Cache persists across executions

## Pattern 8: Parallel Processing

### Problem

Sequential processing of 100 API calls takes 100× longer than parallel.

### Solution

Use Promise.all for concurrent operations (within rate limits).

### Example: Parallel Data Enrichment

```typescript
// Agent writes this code:
import { clearbit } from '/servers/clearbit/index.ts';
import { pLimit } from 'p-limit';

// Limit concurrency to respect rate limits
const limit = pLimit(10); // Max 10 concurrent requests

const companies = [
  'example.com',
  'acme.com',
  // ... 100 companies
];

// Process in parallel with concurrency limit
const enrichedData = await Promise.all(
  companies.map(domain =>
    limit(async () => {
      try {
        const data = await clearbit.companyLookup({ domain });
        return {
          domain,
          name: data.name,
          industry: data.industry,
          employees: data.metrics.employees
        };
      } catch (err) {
        return {
          domain,
          error: err.message
        };
      }
    })
  )
);

// Filter successful lookups
const successful = enrichedData.filter(d => !d.error);

return {
  total: companies.length,
  successful: successful.length,
  failed: companies.length - successful.length,
  data: successful
};
```

**Performance:**
- Sequential: 100 calls × 200ms = 20 seconds
- Parallel (10 concurrent): 100 calls / 10 × 200ms = 2 seconds
- **10× faster**

## Best Practices Summary

1. **Always filter before returning** - Process large datasets in execution environment
2. **Use progressive discovery** - Load tool definitions on-demand
3. **Tokenize sensitive data** - Keep PII out of model context
4. **Implement checkpoints** - Make long-running jobs resumable
5. **Cache expensive operations** - Avoid redundant API calls
6. **Process in parallel** - Respect rate limits but maximize concurrency
7. **Log execution progress** - Make debugging easier
8. **Handle errors gracefully** - Don't let one failure stop entire job

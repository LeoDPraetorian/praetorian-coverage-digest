# Frontend Developer Enhanced - Example Workflows

## Quick Start

### Basic Usage
```bash
# Spawn the enhanced frontend developer agent
npx claude-flow@alpha agent spawn --type frontend-developer-enhanced

# Or use in a swarm for complex tasks
npx claude-flow@alpha swarm init --topology mesh
npx claude-flow@alpha agent spawn --type frontend-developer-enhanced --name "ui-lead"
npx claude-flow@alpha agent spawn --type test-engineer --name "test-support"
npx claude-flow@alpha task orchestrate --task "Create analytics dashboard with auto-generated tests"
```

## Workflow Examples

### 1. New Page Creation with Auto-Testing

**Scenario**: Create a new analytics dashboard page

```typescript
// Command
npx claude-flow@alpha task orchestrate \
  --task "Create analytics dashboard with charts, filters, and data table" \
  --agent frontend-developer-enhanced

// What happens automatically:
1. Creates page component at modules/chariot/ui/src/pages/analytics.tsx
2. Implements chart components using chariot-ui-components
3. Adds filtering and table functionality
4. AUTOMATICALLY generates E2E tests at modules/chariot/e2e/src/tests/analytics.spec.ts
5. Runs performance analysis and optimizes if needed
6. Validates accessibility compliance
```

**Generated Test Example**:
```typescript
// Automatically generated: modules/chariot/e2e/src/tests/analytics.spec.ts
import { expect } from '@playwright/test';
import { user_tests } from 'src/fixtures';
import { waitForAllLoader } from 'src/helpers/loader';
import { AnalyticsPage } from 'src/pages/analytics.page';
import { Table } from 'src/pages/components/table';
import { Filters } from 'src/pages/components/filters';
import { data } from 'src/data';

user_tests.TEST_USER_1.describe('Analytics Dashboard Tests', () => {
  user_tests.TEST_USER_1('should display analytics data correctly', async ({ page }) => {
    const analyticsPage = new AnalyticsPage(page);
    const table = new Table(page);
    const filters = new Filters(page);
    
    // Navigation
    await analyticsPage.goto();
    await waitForAllLoader(page);
    
    // Verify initial state
    await expect(page.getByTestId('analytics-header')).toBeVisible();
    await table.verifyRowsMinCount(1);
    
    // Test filters
    await filters.clickClear();
    await filters.selectDateRange('last-7-days');
    await waitForAllLoader(page);
    
    // Verify chart rendering
    await expect(page.getByTestId('chart-container')).toBeVisible();
    
    // Test data interaction
    await table.clickRow(0);
    await expect(page.getByTestId('detail-drawer')).toBeVisible();
  });
  
  // Additional auto-generated test scenarios...
});
```

### 2. Component Modification with Test Updates

**Scenario**: Update user table with sorting and filtering

```bash
# User request
"Update the user table to include sorting, filtering, and bulk actions"

# Agent workflow
1. Analyzes existing UserTable component
2. Implements sorting functionality
3. Adds filter controls
4. Implements bulk action checkboxes
5. AUTOMATICALLY updates existing tests
6. AUTOMATICALLY generates new test cases for added features
7. Optimizes performance for large datasets
```

**Auto-updated Tests**:
```typescript
// Automatically updated test coverage
user_tests.TEST_USER_1('should handle sorting correctly', async ({ page }) => {
  const userPage = new UserPage(page);
  const table = new Table(page);
  
  await userPage.goto();
  await waitForAllLoader(page);
  
  // Test ascending sort
  await table.clickColumnHeader('name');
  await table.verifyColumnSorted('name', 'asc');
  
  // Test descending sort
  await table.clickColumnHeader('name');
  await table.verifyColumnSorted('name', 'desc');
});

user_tests.TEST_USER_1('should handle bulk actions', async ({ page }) => {
  const userPage = new UserPage(page);
  const table = new Table(page);
  
  await userPage.goto();
  await waitForAllLoader(page);
  
  // Select multiple items
  await table.selectRows([0, 1, 2]);
  await page.getByTestId('bulk-action-delete').click();
  
  // Verify confirmation modal
  await expect(page.getByTestId('confirm-modal')).toBeVisible();
});
```

### 3. Performance Optimization Workflow

**Scenario**: Optimize slow-loading product page

```javascript
// Automatic performance analysis and optimization
const performanceWorkflow = {
  trigger: "Product page loading slowly with 500+ items",
  
  automatedActions: [
    {
      step: 1,
      action: "Analyze current performance",
      result: {
        bundleSize: "450KB",
        renderTime: "3.2s",
        reRenders: 47
      }
    },
    {
      step: 2,
      action: "Implement optimizations",
      changes: [
        "Add virtualization to product list",
        "Implement React.memo for ProductCard",
        "Add lazy loading for images",
        "Split bundle with dynamic imports"
      ]
    },
    {
      step: 3,
      action: "Generate performance tests",
      tests: [
        "Verify virtual scrolling",
        "Test lazy loading triggers",
        "Validate bundle splitting"
      ]
    },
    {
      step: 4,
      action: "Validate improvements",
      result: {
        bundleSize: "180KB",  // 60% reduction
        renderTime: "1.1s",    // 66% faster
        reRenders: 8           // 83% fewer
      }
    }
  ]
};
```

### 4. Figma to Code Conversion

**Scenario**: Convert Figma design to React components

```bash
# Command with Figma URL
npx claude-flow@alpha task orchestrate \
  --task "Convert Figma design to React: https://figma.com/file/abc123" \
  --agent frontend-developer-enhanced

# Automated workflow:
1. Extracts design tokens from Figma
2. Generates React components matching design
3. Applies Tailwind CSS classes
4. Ensures responsive behavior
5. AUTOMATICALLY generates visual regression tests
6. Creates Storybook stories for components
```

### 5. Multi-Agent Collaboration

**Scenario**: Complete frontend feature with multiple specialists

```javascript
// Swarm configuration for complex UI task
const uiSwarmConfig = {
  task: "Build complete user management interface",
  
  agents: [
    {
      name: "frontend-developer-enhanced",
      role: "lead",
      responsibilities: [
        "Component architecture",
        "State management",
        "Auto test generation"
      ]
    },
    {
      name: "tailwind-expert",
      role: "styling",
      responsibilities: [
        "Design system consistency",
        "Responsive layouts",
        "Theme implementation"
      ]
    },
    {
      name: "playwright-screenshot-code",
      role: "visual-testing",
      responsibilities: [
        "Screenshot documentation",
        "Visual regression tests",
        "UI state capture"
      ]
    },
    {
      name: "backend-go-developer",
      role: "api-integration",
      responsibilities: [
        "API endpoint creation",
        "Data contracts",
        "Integration testing"
      ]
    }
  ],
  
  workflow: {
    phases: [
      "design-analysis",
      "component-creation",
      "styling-implementation",
      "api-integration",
      "test-generation",
      "visual-documentation",
      "performance-optimization"
    ],
    
    coordination: "parallel-with-sync-points"
  }
};
```

### 6. Accessibility Compliance Workflow

**Scenario**: Ensure WCAG AA compliance

```typescript
// Automatic accessibility audit and fixes
async function accessibilityWorkflow() {
  // Step 1: Audit current state
  const audit = await runAccessibilityAudit();
  
  // Step 2: Auto-fix common issues
  const fixes = {
    missingAltText: "Add descriptive alt attributes",
    lowContrast: "Adjust color values in Tailwind config",
    missingLabels: "Add aria-labels to form controls",
    keyboardNav: "Implement focus management"
  };
  
  // Step 3: Generate accessibility tests
  const tests = `
    test('should be keyboard navigable', async ({ page }) => {
      await page.keyboard.press('Tab');
      await expect(page.locator(':focus')).toHaveAttribute('data-testid', 'first-focusable');
      
      await page.keyboard.press('Tab');
      await expect(page.locator(':focus')).toHaveAttribute('data-testid', 'second-focusable');
    });
    
    test('should have proper ARIA attributes', async ({ page }) => {
      await expect(page.getByRole('navigation')).toHaveAttribute('aria-label');
      await expect(page.getByRole('main')).toBeVisible();
      await expect(page.getByRole('button')).toHaveAccessibleName();
    });
  `;
  
  // Step 4: Validate compliance
  const score = await validateWCAG();
  return score >= 95; // Target score
}
```

### 7. Rapid Prototyping Workflow

**Scenario**: 6-day sprint feature development

```yaml
Day 1-2: Design & Architecture
  agent: frontend-developer-enhanced
  tasks:
    - Analyze requirements
    - Create component architecture
    - Setup page structure
    - Auto-generate initial tests
    
Day 2-3: Implementation
  agent: frontend-developer-enhanced
  collaboration: [tailwind-expert, backend-go-developer]
  tasks:
    - Implement UI components
    - Integrate with backend APIs
    - Apply styling and themes
    - Auto-generate feature tests
    
Day 4: Testing & Optimization
  agent: frontend-developer-enhanced
  collaboration: [test-engineer]
  tasks:
    - Run comprehensive test suite
    - Performance optimization
    - Accessibility compliance
    - Visual regression testing
    
Day 5: Polish & Documentation
  agent: frontend-developer-enhanced
  tasks:
    - Bug fixes from testing
    - Component documentation
    - Update Storybook
    - Final test coverage
    
Day 6: Deployment Preparation
  agent: frontend-developer-enhanced
  collaboration: [devops-automator]
  tasks:
    - Production build optimization
    - Environment configuration
    - Deployment validation
    - Smoke test generation
```

## Command Reference

### Single Agent Commands
```bash
# Basic frontend development
npx claude-flow@alpha agent spawn --type frontend-developer-enhanced

# With specific task
npx claude-flow@alpha task orchestrate \
  --agent frontend-developer-enhanced \
  --task "Create user profile page with tests"

# With performance focus
npx claude-flow@alpha task orchestrate \
  --agent frontend-developer-enhanced \
  --task "Optimize dashboard performance" \
  --priority performance
```

### Swarm Commands
```bash
# Initialize UI development swarm
npx claude-flow@alpha swarm init --topology mesh --max-agents 5

# Spawn specialized agents
npx claude-flow@alpha agent spawn --type frontend-developer-enhanced --name "ui-lead"
npx claude-flow@alpha agent spawn --type tailwind-expert --name "stylist"
npx claude-flow@alpha agent spawn --type test-engineer --name "tester"

# Orchestrate complex task
npx claude-flow@alpha task orchestrate \
  --strategy parallel \
  --task "Build complete admin dashboard with charts, tables, and filters"
```

### Monitoring Commands
```bash
# Check agent status
npx claude-flow@alpha agent metrics --agent frontend-developer-enhanced

# Monitor test coverage
npx claude-flow@alpha hooks monitor --metrics test-coverage

# Performance tracking
npx claude-flow@alpha hooks monitor --metrics bundle-size,performance
```

## Best Practices

1. **Always let auto-testing run**: Never skip or disable automatic test generation
2. **Use repository patterns**: Follow established Chariot patterns for consistency
3. **Leverage swarms for complex tasks**: Use multi-agent coordination for large features
4. **Monitor performance continuously**: Keep bundle sizes and load times in check
5. **Maintain accessibility**: Ensure WCAG compliance on every change
6. **Document visual changes**: Use screenshot documentation for design reviews

## Troubleshooting

### Common Issues and Solutions

**Issue**: Tests not auto-generating
```bash
# Verify triggers are active
npx claude-flow@alpha agent status --agent frontend-developer-enhanced

# Manually trigger test generation
npx claude-flow@alpha hooks trigger --event test-generation --file "*.tsx"
```

**Issue**: Performance regression
```bash
# Run performance audit
npx claude-flow@alpha benchmark run --type bundle

# Apply automatic optimizations
npx claude-flow@alpha task orchestrate \
  --agent frontend-developer-enhanced \
  --task "Optimize bundle size and performance"
```

**Issue**: Accessibility violations
```bash
# Run accessibility audit
npx claude-flow@alpha hooks audit --type accessibility

# Auto-fix common issues
npx claude-flow@alpha task orchestrate \
  --agent frontend-developer-enhanced \
  --task "Fix accessibility violations and ensure WCAG AA compliance"
```

## Integration Examples

### With GitHub Workflows
```yaml
on:
  pull_request:
    paths:
      - 'modules/chariot/ui/**'

jobs:
  frontend-validation:
    steps:
      - name: Spawn Enhanced Frontend Agent
        run: npx claude-flow@alpha agent spawn --type frontend-developer-enhanced
      
      - name: Validate Changes
        run: |
          npx claude-flow@alpha task orchestrate \
            --task "Review UI changes and ensure test coverage"
      
      - name: Performance Check
        run: npx claude-flow@alpha benchmark run --type performance
```

### With CI/CD Pipeline
```bash
# Pre-deployment validation
npx claude-flow@alpha task orchestrate \
  --agent frontend-developer-enhanced \
  --task "Validate production build" \
  --checks "bundle-size,performance,accessibility,test-coverage"

# Generate deployment tests
npx claude-flow@alpha task orchestrate \
  --agent frontend-developer-enhanced \
  --task "Generate smoke tests for production deployment"
```

## Metrics and Reporting

### Success Metrics Dashboard
```javascript
const metricsReport = {
  development: {
    featuresCompleted: 12,
    averageTimePerFeature: "1.8 hours",
    testsAutoGenerated: 145,
    testCoverage: "87%"
  },
  
  performance: {
    averageBundleSize: "175KB",
    averageLoadTime: "1.4s",
    lighthouseScore: 94
  },
  
  quality: {
    accessibilityScore: 98,
    bugsFoundInProduction: 2,
    codeReusability: "78%"
  },
  
  efficiency: {
    timeReduction: "62%",
    automationRate: "85%",
    developerSatisfaction: "9.2/10"
  }
};
```

This enhanced frontend developer agent transforms how you build user interfaces, ensuring every line of code comes with tests, meets performance standards, and provides an exceptional user experience.
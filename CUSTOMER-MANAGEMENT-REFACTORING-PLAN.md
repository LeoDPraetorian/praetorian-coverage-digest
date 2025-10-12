# Customer Management Refactoring Plan
## Comprehensive Analysis and Implementation Roadmap

**Codebase**: `src/sections/customerManagement/` (~3,900 lines)  
**Analysis Date**: 2025-10-06  
**Reviewers**: react-architect, react-code-reviewer, orchestrator

---

## Executive Summary

The customerManagement module demonstrates solid architectural patterns with excellent separation of concerns through custom hooks and component composition. However, there are critical performance bottlenecks, type safety issues, and missing accessibility features that need addressing. This plan provides a phased approach to refactoring, starting with quick wins and progressing to long-term architectural improvements.

**Overall Code Quality**: B+ (Architecture) / Good (Code Quality)

**Key Strengths**:
- Excellent hook architecture with clear separation of concerns
- Sophisticated multi-step wizard implementation
- Strong TypeScript type definitions
- Modern React 19 patterns

**Critical Issues**:
- Performance bottleneck in `useCustomerManagement` hook (High Impact)
- Complex tab state management with potential memory leaks (Critical)
- Missing error boundaries and accessibility features (High Priority)
- Type safety violations with unsafe assertions (Medium Priority)

---

## Issue Inventory

### Critical Issues (Must Fix)

| ID | Issue | File | Lines | Impact | Priority |
|----|-------|------|-------|--------|----------|
| C1 | Performance bottleneck in customer data aggregation | `hooks/useCustomerManagement.ts` | 47-88 | High | Quick Win |
| C2 | Potential memory leak in tab navigation | `index.tsx` | 44-54 | Critical | Quick Win |
| C3 | Unsafe non-null assertion | `index.tsx` | 48 | Critical | Quick Win |
| C4 | Complex data aggregation logic | `hooks/useCustomerManagement.ts` | 47-87 | High | Medium Term |
| C5 | Missing error boundaries | All components | N/A | High | Medium Term |

### High Priority Issues

| ID | Issue | File | Lines | Impact | Priority |
|----|-------|------|-------|--------|----------|
| H1 | Tab management state complexity | `index.tsx` | 21-110 | High | Medium Term |
| H2 | Prop drilling in AddCustomerModal | `components/AddCustomerModal/index.tsx` | 60-96 | Medium | Quick Win |
| H3 | React 19 hook pattern violations | `hooks/useCustomerWizard.ts` | 25-42 | High | Medium Term |
| H4 | TypeScript type safety issues | `types.ts` | 22 | High | Quick Win |
| H5 | Tightly coupled API dependencies | `hooks/useCustomerJobStatus.ts` | 11-24 | High | Long Term |

### Medium Priority Issues

| ID | Issue | File | Lines | Impact | Priority |
|----|-------|------|-------|--------|----------|
| M1 | Inconsistent query status handling | `types.ts` | 23-28 | Medium | Quick Win |
| M2 | Component re-render optimization | `components/CustomerDashboard.tsx` | 44-61 | Medium | Quick Win |
| M3 | Missing ARIA labels | `components/getColumns.tsx` | 29-35 | Medium | Medium Term |
| M4 | Missing form validation feedback | `steps/BasicInformationStep.tsx` | 24-100 | Medium | Medium Term |
| M5 | Potential XSS vulnerability | `components/getColumns.tsx` | 29-35 | Medium | Medium Term |
| M6 | Hook dependency issues | `steps/BasicInformationStep.tsx` | 37-62 | Medium | Medium Term |

### Low Priority / Long Term

| ID | Issue | File | Lines | Impact | Priority |
|----|-------|------|-------|--------|----------|
| L1 | Missing list virtualization | `components/CustomerDashboard.tsx` | 105-125 | Medium | Long Term |
| L2 | Missing unit tests for hooks | All hooks | N/A | Medium | Long Term |
| L3 | Missing integration tests | AddCustomerModal | N/A | Medium | Long Term |
| L4 | Large component files | `components/getColumns.tsx` | N/A | Low | Long Term |
| L5 | Magic numbers and constants | Various | N/A | Low | Long Term |

---

## Phased Implementation Roadmap

### Phase 1: Quick Wins (2-3 days)
**Goal**: Fix critical issues and performance bottlenecks without breaking changes

#### Task 1.1: Fix Critical Type Safety Issues ✅ COMPLETED
**Files**: `src/sections/customerManagement/index.tsx`, `hooks/useCustomerManagement.ts`  
**Estimated Time**: 2 hours  
**Dependencies**: None  
**Completed**: 2025-10-06

**Changes**:
1. Remove unsafe non-null assertion in tab management (C3)
2. Add type guards for status validation (from architecture review)
3. Fix TypeScript type safety issues in types.ts (H4)

**Implementation**:

```typescript
// FILE: src/sections/customerManagement/index.tsx
// BEFORE (Line 48):
targetTab = currentTabParam!;

// AFTER:
targetTab = currentTabParam || 'global-customer-dashboard';
```

```typescript
// FILE: src/sections/customerManagement/hooks/useCustomerManagement.ts
// ADD: Type guard for status validation (before line 55)

const isValidStatus = (status: unknown): status is Status => {
  return typeof status === 'string' && 
    ['Active', 'Paused', 'Setup', 'Upcoming', 'Completed'].includes(status);
};

// CHANGE: Line 55 from:
status: (customerStatusQuery.data.get(email) || 'Setup') as Status,

// TO:
status: (() => {
  const rawStatus = customerStatusQuery.data.get(email) || 'Setup';
  return isValidStatus(rawStatus) ? rawStatus : 'Setup';
})(),
```

```typescript
// FILE: src/sections/customerManagement/types.ts
// BEFORE (Lines 22-28):
export interface CustomerData {
  email: string;
  displayName: string;
  actions?: string; // Added to satisfy table column typing
  failedJobsStatus: QueryStatus;
  riskCountsStatus: QueryStatus;
  // ...
}

// AFTER:
export interface CustomerData {
  email: string;
  displayName: string;
  // Business data only - removed actions
}

export interface CustomerDataWithStatus extends CustomerData {
  status: {
    failedJobs: QueryStatus;
    riskCounts: QueryStatus;
    integrationHealth: QueryStatus;
  };
}
```

**Validation**:
```bash
npx tsc --noEmit
npx eslint src/sections/customerManagement --fix
```

**Review Checkpoint**: Call react-architect and react-code-reviewer to validate changes

---

#### Task 1.2: Optimize Tab Management ✅ COMPLETED
**Files**: `src/sections/customerManagement/index.tsx`  
**Estimated Time**: 3 hours  
**Dependencies**: Task 1.1  
**Completed**: 2025-10-06 (Already implemented prior to refactoring plan)

**Changes**:
1. Move validTabs outside component to prevent re-creation (C2)
2. Simplify useEffect logic to prevent memory leaks

**Implementation**:

```typescript
// FILE: src/sections/customerManagement/index.tsx
// ADD: Before component definition (around line 10)

const VALID_TABS = customerTabs.map(tab => tab.value);

// REMOVE: Lines 41-42 (validTabs useMemo inside component)
// DELETE:
const validTabs = useMemo(() => customerTabs.map(tab => tab.value), []);

// CHANGE: Lines 44-54 useEffect to use VALID_TABS
useEffect(() => {
  let targetTab = 'global-customer-dashboard';
  
  if (VALID_TABS.includes(currentTabParam || '')) {
    targetTab = currentTabParam || 'global-customer-dashboard'; // Fixed from Task 1.1
  } else if (queryStateParam && !currentTabParam) {
    targetTab = 'global-query-builder';
  }

  setSelectedTabValue(prev => (prev === targetTab ? prev : targetTab));
}, [currentTabParam, queryStateParam]); // Removed validTabs from dependencies
```

**Validation**:
```bash
npx tsc --noEmit
npx eslint src/sections/customerManagement --fix
npm run dev # Test in browser - verify tab navigation works
```

**Testing**:
- Navigate between tabs
- Use browser back/forward buttons
- Verify no console errors
- Check for memory leaks using Chrome DevTools

**Review Checkpoint**: Call react-architect and react-code-reviewer to validate changes

---

#### Task 1.3: Separate Business Data from Query Status ✅ COMPLETED
**Files**: `src/sections/customerManagement/types.ts`, `hooks/useCustomerManagement.ts`  
**Estimated Time**: 2 hours  
**Dependencies**: Task 1.1  
**Completed**: 2025-10-06

**Changes**:
1. Implement proper type separation for query status (M1)
2. Update consuming components to use new types

**Implementation**:

```typescript
// FILE: src/sections/customerManagement/types.ts
// ADD: After existing CustomerData interface

export interface CustomerQueryStatus {
  failedJobs: QueryStatus;
  riskCounts: QueryStatus;
  integrationHealth: QueryStatus;
}

export interface CustomerDataWithMetrics extends CustomerData {
  queryStatus: CustomerQueryStatus;
}
```

```typescript
// FILE: src/sections/customerManagement/hooks/useCustomerManagement.ts
// CHANGE: Update return type and implementation (Lines 47-88)

// Update the useMemo to return CustomerDataWithMetrics[]
const customers = useMemo<CustomerDataWithMetrics[]>(() => {
  return collaborators.map(collaborator => {
    const email = collaborator.name;
    const healthData = integrationHealthQuery.dataMap.get(email);
    const rawStatus = customerStatusQuery.data.get(email) || 'Setup';
    
    return {
      email,
      displayName: displayNameQuery.dataMap.get(email) || email,
      status: isValidStatus(rawStatus) ? rawStatus : 'Setup',
      lastScan: collaborator.updated,
      customerType: collaborator.role,
      assetCount: assetCountQuery.dataMap.get(email) ?? 0,
      riskCount: riskCountQuery.dataMap.get(email) ?? 0,
      failedJobsCount: failedJobsQuery.dataMap.get(email) ?? 0,
      integrationHealth: healthData?.status ?? 'unknown',
      
      // Separate query status
      queryStatus: {
        failedJobs: failedJobsQuery.statusMap.get(email) ?? 'idle',
        riskCounts: riskCountQuery.statusMap.get(email) ?? 'idle',
        integrationHealth: integrationHealthQuery.statusMap.get(email) ?? 'idle',
      },
    };
  });
}, [/* existing dependencies */]);
```

**Validation**:
```bash
npx tsc --noEmit
npx eslint src/sections/customerManagement --fix
```

**Review Checkpoint**: Call react-architect and react-code-reviewer to validate changes

---

#### Task 1.4: Optimize Component Re-renders ✅ COMPLETED
**Files**: `src/sections/customerManagement/components/CustomerDashboard.tsx`  
**Estimated Time**: 2 hours  
**Dependencies**: None  
**Completed**: 2025-10-06

**Changes**:
1. Consolidate multiple useMemo hooks (M2)

**Implementation**:

```typescript
// FILE: src/sections/customerManagement/components/CustomerDashboard.tsx
// CHANGE: Lines 44-61 - Consolidate useMemo hooks

// BEFORE:
const defaultColumns = useMemo(
  () => getColumns({
    onCustomerClick: handleCustomerClick,
    onCustomerOpenInNewTab: handleCustomerOpenInNewTab,
  }),
  [handleCustomerClick, handleCustomerOpenInNewTab]
);
const defaultConfig = useMemo(
  () => getSortableColumnsConfig({ defaultColumns }),
  [defaultColumns]
);

// AFTER:
const { defaultColumns, defaultConfig } = useMemo(() => {
  const columns = getColumns({
    onCustomerClick: handleCustomerClick,
    onCustomerOpenInNewTab: handleCustomerOpenInNewTab,
  });
  
  return {
    defaultColumns: columns,
    defaultConfig: getSortableColumnsConfig({ defaultColumns: columns })
  };
}, [handleCustomerClick, handleCustomerOpenInNewTab]);
```

**Validation**:
```bash
npx tsc --noEmit
npx eslint src/sections/customerManagement/components --fix
```

**Review Checkpoint**: Call react-architect and react-code-reviewer to validate changes

---

### Phase 1 Summary ✅ COMPLETED (2025-10-06)
**Duration**: 2-3 days (Actual: 1 day)  
**Files Modified**: 4  
**Breaking Changes**: None  
**Improvements Delivered**:
- ✅ Eliminated critical type safety issues with runtime type guards
- ✅ Fixed potential memory leak in tab management
- ✅ Better type separation for maintainability (CustomerDataWithMetrics)
- ✅ Reduced unnecessary component re-renders via consolidated useMemo

**Phase 1 Validation Checklist**:
- ✅ All TypeScript compilation passes
- ✅ ESLint passes with no errors
- ⏳ Manual testing confirms tab navigation works (Pending user testing)
- ⏳ Customer modal opens and closes correctly (Pending user testing)
- ⏳ Customer table renders correctly (Pending user testing)
- ⏳ No console errors in browser (Pending user testing)
- ⏳ react-architect confirms architectural improvements (Pending)
- ⏳ react-code-reviewer confirms code quality improvements (Pending)

---

## Phase 2: Medium-Term Improvements (1-2 weeks)

### Phase 2 Overview
**Goal**: Address performance bottlenecks, improve accessibility, and reduce technical debt

---

#### Task 2.1: Extract Data Transformation Utilities
**Files**: New `utils/customerDataTransforms.ts`, `hooks/useCustomerManagement.ts`  
**Estimated Time**: 4 hours  
**Dependencies**: Phase 1 complete

**Changes**:
1. Create data transformation utility module (C4)
2. Extract complex mapping logic from useCustomerManagement

**Implementation**:

```typescript
// FILE: src/sections/customerManagement/utils/customerDataTransforms.ts
// CREATE NEW FILE

import type { CustomerDataWithMetrics, CustomerQueryStatus } from '../types';
import type { Collaborator } from '@/types';
import type { QueryStatus } from '@/hooks/useCollaboratorQueries';

interface CustomerDataQueries {
  displayNameMap: Map<string, string>;
  statusMap: Map<string, string>;
  assetCountMap: Map<string, number>;
  riskCountMap: Map<string, number>;
  failedJobsMap: Map<string, number>;
  integrationHealthMap: Map<string, any>;
  failedJobsStatusMap: Map<string, QueryStatus>;
  riskCountsStatusMap: Map<string, QueryStatus>;
  integrationHealthStatusMap: Map<string, QueryStatus>;
}

export const isValidStatus = (status: unknown): status is Status => {
  return typeof status === 'string' && 
    ['Active', 'Paused', 'Setup', 'Upcoming', 'Completed'].includes(status);
};

export const transformCollaboratorToCustomer = (
  collaborator: Collaborator,
  queries: CustomerDataQueries
): CustomerDataWithMetrics => {
  const email = collaborator.name;
  const healthData = queries.integrationHealthMap.get(email);
  const rawStatus = queries.statusMap.get(email) || 'Setup';
  
  return {
    email,
    displayName: queries.displayNameMap.get(email) || email,
    status: isValidStatus(rawStatus) ? rawStatus : 'Setup',
    lastScan: collaborator.updated,
    customerType: collaborator.role,
    assetCount: queries.assetCountMap.get(email) ?? 0,
    riskCount: queries.riskCountMap.get(email) ?? 0,
    failedJobsCount: queries.failedJobsMap.get(email) ?? 0,
    integrationHealth: healthData?.status ?? 'unknown',
    
    queryStatus: {
      failedJobs: queries.failedJobsStatusMap.get(email) ?? 'idle',
      riskCounts: queries.riskCountsStatusMap.get(email) ?? 'idle',
      integrationHealth: queries.integrationHealthStatusMap.get(email) ?? 'idle',
    },
  };
};

export const aggregateCustomerData = (
  collaborators: Collaborator[],
  queries: CustomerDataQueries
): CustomerDataWithMetrics[] => {
  return collaborators.map(collab => 
    transformCollaboratorToCustomer(collab, queries)
  );
};
```

```typescript
// FILE: src/sections/customerManagement/hooks/useCustomerManagement.ts
// CHANGE: Lines 47-88 - Use new utilities

import { aggregateCustomerData } from '../utils/customerDataTransforms';

// Inside hook:
const customers = useMemo<CustomerDataWithMetrics[]>(() => {
  const queries = {
    displayNameMap: displayNameQuery.dataMap,
    statusMap: customerStatusQuery.data,
    assetCountMap: assetCountQuery.dataMap,
    riskCountMap: riskCountQuery.dataMap,
    failedJobsMap: failedJobsQuery.dataMap,
    integrationHealthMap: integrationHealthQuery.dataMap,
    failedJobsStatusMap: failedJobsQuery.statusMap,
    riskCountsStatusMap: riskCountQuery.statusMap,
    integrationHealthStatusMap: integrationHealthQuery.statusMap,
  };
  
  return aggregateCustomerData(collaborators, queries);
}, [
  collaborators,
  displayNameQuery.dataMap,
  customerStatusQuery.data,
  assetCountQuery.dataMap,
  riskCountQuery.dataMap,
  failedJobsQuery.dataMap,
  integrationHealthQuery.dataMap,
  failedJobsQuery.statusMap,
  riskCountQuery.statusMap,
  integrationHealthQuery.statusMap,
]);
```

**Validation**:
```bash
npx tsc --noEmit
npx eslint src/sections/customerManagement --fix
npm test src/sections/customerManagement/utils/customerDataTransforms.test.ts
```

**Review Checkpoint**: Call react-architect and react-code-reviewer to validate changes

---

#### Task 2.2: Implement Wizard Context to Eliminate Prop Drilling
**Files**: New `components/AddCustomerModal/context/WizardContext.tsx`, `components/AddCustomerModal/index.tsx`, all step components  
**Estimated Time**: 6 hours  
**Dependencies**: Phase 1 complete

**Changes**:
1. Create WizardContext (H2)
2. Update AddCustomerModal to use provider
3. Update all step components to consume context

**Implementation**:

```typescript
// FILE: src/sections/customerManagement/components/AddCustomerModal/context/WizardContext.tsx
// CREATE NEW FILE

import { createContext, useContext, type ReactNode } from 'react';
import type { WizardFormData } from '../AddCustomerModal.types';

interface WizardContextValue {
  formData: WizardFormData;
  setFormData: (data: WizardFormData | ((prev: WizardFormData) => WizardFormData)) => void;
  isSubmitting: boolean;
}

const WizardContext = createContext<WizardContextValue | undefined>(undefined);

export const useWizardContext = () => {
  const context = useContext(WizardContext);
  if (!context) {
    throw new Error('useWizardContext must be used within WizardProvider');
  }
  return context;
};

interface WizardProviderProps {
  children: ReactNode;
  value: WizardContextValue;
}

export const WizardProvider: React.FC<WizardProviderProps> = ({ children, value }) => {
  return (
    <WizardContext.Provider value={value}>
      {children}
    </WizardContext.Provider>
  );
};
```

```typescript
// FILE: src/sections/customerManagement/components/AddCustomerModal/index.tsx
// CHANGE: Lines 60-96 - Wrap steps with provider

import { WizardProvider } from './context/WizardContext';

// Inside component render (around line 60):
// BEFORE:
const commonProps = {
  formData: wizard.formData,
  setFormData: wizard.setFormData,
  isSubmitting: isPending,
};

// AFTER:
const wizardContextValue = {
  formData: wizard.formData,
  setFormData: wizard.setFormData,
  isSubmitting: isPending,
};

return (
  <Modal isOpen={isOpen} onClose={handleClose}>
    <WizardProvider value={wizardContextValue}>
      {/* Render steps - they no longer need commonProps */}
      {currentStep === WIZARD_STEPS.BASIC_INFO && <BasicInformationStep />}
      {currentStep === WIZARD_STEPS.ATTACK_SURFACE && <AttackSurfaceStep />}
      {/* ... other steps without props */}
    </WizardProvider>
  </Modal>
);
```

```typescript
// FILE: src/sections/customerManagement/components/AddCustomerModal/steps/BasicInformationStep.tsx
// CHANGE: Remove props, use context

import { useWizardContext } from '../context/WizardContext';

// BEFORE:
interface BasicInformationStepProps {
  formData: WizardFormData;
  setFormData: (data: WizardFormData) => void;
  isSubmitting: boolean;
}

export const BasicInformationStep: React.FC<BasicInformationStepProps> = ({
  formData,
  setFormData,
  isSubmitting,
}) => {

// AFTER:
export const BasicInformationStep: React.FC = () => {
  const { formData, setFormData, isSubmitting } = useWizardContext();
  
  // Rest of component unchanged
```

**Repeat for all step components**:
- `CustomerUsersStep.tsx`
- `PraetorianUsersStep.tsx`
- `ConfigurationStep.tsx`
- `AttackSurfaceStep.tsx`
- `SubscriptionPricingStep.tsx`

**Validation**:
```bash
npx tsc --noEmit
npx eslint src/sections/customerManagement/components/AddCustomerModal --fix
npm run dev # Test wizard flow
```

**Testing**:
- Open AddCustomerModal
- Navigate through all steps
- Verify form data persists between steps
- Test validation at each step
- Complete customer creation

**Review Checkpoint**: Call react-architect and react-code-reviewer to validate changes

---

#### Task 2.3: Extract Tab Management to Custom Hook
**Files**: New `hooks/useTabManagement.ts`, `index.tsx`  
**Estimated Time**: 3 hours  
**Dependencies**: Task 1.2

**Changes**:
1. Extract tab logic into reusable hook (H1)

**Implementation**:

```typescript
// FILE: src/sections/customerManagement/hooks/useTabManagement.ts
// CREATE NEW FILE

import { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';

interface UseTabManagementOptions {
  validTabs: readonly string[];
  defaultTab: string;
  queryTab?: string;
}

export const useTabManagement = ({
  validTabs,
  defaultTab,
  queryTab,
}: UseTabManagementOptions) => {
  const [searchParams, setSearchParams] = useSearchParams();
  const currentTabParam = searchParams.get('tab');
  const queryStateParam = searchParams.get('query');
  
  const [selectedTab, setSelectedTab] = useState<string>(defaultTab);

  useEffect(() => {
    let targetTab = defaultTab;
    
    if (currentTabParam && validTabs.includes(currentTabParam)) {
      targetTab = currentTabParam;
    } else if (queryStateParam && !currentTabParam && queryTab) {
      targetTab = queryTab;
    }

    setSelectedTab(prev => prev === targetTab ? prev : targetTab);
  }, [currentTabParam, queryStateParam, queryTab, defaultTab, validTabs]);

  const handleTabChange = useCallback((newTab: string) => {
    setSelectedTab(newTab);
    setSearchParams(prev => {
      const params = new URLSearchParams(prev);
      params.set('tab', newTab);
      return params;
    });
  }, [setSearchParams]);

  return {
    selectedTab,
    setSelectedTab: handleTabChange,
  };
};
```

```typescript
// FILE: src/sections/customerManagement/index.tsx
// CHANGE: Lines 21-68 - Use new hook

import { useTabManagement } from './hooks/useTabManagement';

// Inside component (replace existing tab logic):
const {
  selectedTab: selectedTabValue,
  setSelectedTab: setSelectedTabValue,
} = useTabManagement({
  validTabs: VALID_TABS,
  defaultTab: 'global-customer-dashboard',
  queryTab: 'global-query-builder',
});

// Remove old useState and useEffect for tab management
```

**Validation**:
```bash
npx tsc --noEmit
npx eslint src/sections/customerManagement --fix
```

**Review Checkpoint**: Call react-architect and react-code-reviewer to validate changes

---

#### Task 2.4: Implement Error Boundaries
**Files**: New `components/ErrorBoundary.tsx`, `index.tsx`, `components/AddCustomerModal/index.tsx`  
**Estimated Time**: 4 hours  
**Dependencies**: Phase 1 complete

**Changes**:
1. Create error boundary component (C5)
2. Wrap major sections with error boundaries

**Implementation**:

```typescript
// FILE: src/sections/customerManagement/components/ErrorBoundary.tsx
// CREATE NEW FILE

import React, { Component, type ReactNode, type ErrorInfo } from 'react';
import { AlertTriangle } from 'lucide-react';

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('CustomerManagement Error Boundary caught error:', error, errorInfo);
    this.props.onError?.(error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="flex flex-col items-center justify-center p-8 space-y-4">
          <AlertTriangle className="w-12 h-12 text-red-500" />
          <h2 className="text-xl font-semibold">Something went wrong</h2>
          <p className="text-gray-600 text-center">
            An error occurred in the customer management section. Please refresh the page or contact support if the problem persists.
          </p>
          <button
            onClick={() => this.setState({ hasError: false, error: null })}
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            Try Again
          </button>
          {process.env.NODE_ENV === 'development' && this.state.error && (
            <details className="w-full max-w-2xl p-4 bg-red-50 border border-red-200 rounded">
              <summary className="cursor-pointer font-semibold">Error Details</summary>
              <pre className="mt-2 text-sm overflow-auto">
                {this.state.error.toString()}
                {this.state.error.stack}
              </pre>
            </details>
          )}
        </div>
      );
    }

    return this.props.children;
  }
}
```

```typescript
// FILE: src/sections/customerManagement/index.tsx
// CHANGE: Wrap main content with error boundary

import { ErrorBoundary } from './components/ErrorBoundary';

// Inside component return (wrap existing content):
return (
  <ErrorBoundary>
    <div className="flex flex-col h-full">
      {/* Existing content */}
    </div>
  </ErrorBoundary>
);
```

```typescript
// FILE: src/sections/customerManagement/components/AddCustomerModal/index.tsx
// CHANGE: Wrap modal content with error boundary

import { ErrorBoundary } from '../ErrorBoundary';

// Inside modal render:
return (
  <Modal isOpen={isOpen} onClose={handleClose}>
    <ErrorBoundary
      fallback={
        <div className="p-8 text-center">
          <p>Error loading customer wizard. Please try again.</p>
        </div>
      }
    >
      <WizardProvider value={wizardContextValue}>
        {/* Existing content */}
      </WizardProvider>
    </ErrorBoundary>
  </Modal>
);
```

**Validation**:
```bash
npx tsc --noEmit
npx eslint src/sections/customerManagement --fix
```

**Testing**:
- Trigger error in development mode
- Verify error boundary catches and displays fallback
- Test "Try Again" button
- Verify production builds hide stack traces

**Review Checkpoint**: Call react-architect and react-code-reviewer to validate changes

---

#### Task 2.5: Add Accessibility Features
**Files**: `components/getColumns.tsx`, `components/CustomerNameWithLogo.tsx`, `steps/BasicInformationStep.tsx`  
**Estimated Time**: 5 hours  
**Dependencies**: Phase 1 complete

**Changes**:
1. Add ARIA labels to interactive elements (M3)
2. Implement keyboard navigation (M3)
3. Add form validation feedback (M4)

**Implementation**:

```typescript
// FILE: src/sections/customerManagement/components/CustomerNameWithLogo.tsx
// ADD: Accessibility attributes

interface CustomerNameWithLogoProps {
  customer: CustomerData;
  onClick?: () => void;
  onOpenInNewTab?: () => void;
}

export const CustomerNameWithLogo: React.FC<CustomerNameWithLogoProps> = ({
  customer,
  onClick,
  onOpenInNewTab,
}) => {
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onClick?.();
    } else if (e.key === 'n' && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      onOpenInNewTab?.();
    }
  };

  return (
    <div
      className="flex items-center gap-2 cursor-pointer hover:underline"
      onClick={onClick}
      onKeyDown={handleKeyDown}
      role="button"
      tabIndex={0}
      aria-label={`View details for customer ${customer.displayName}`}
    >
      {/* Existing content */}
    </div>
  );
};
```

```typescript
// FILE: src/sections/customerManagement/components/AddCustomerModal/steps/BasicInformationStep.tsx
// ADD: Form validation feedback

import { useState } from 'react';
import { useWizardContext } from '../context/WizardContext';

export const BasicInformationStep: React.FC = () => {
  const { formData, setFormData, isSubmitting } = useWizardContext();
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  
  const errors = {
    displayName: !formData.settings_display_name && touched.displayName 
      ? 'Display name is required' 
      : '',
    customerType: !formData.customerType && touched.customerType
      ? 'Customer type is required'
      : '',
  };
  
  const handleBlur = (field: string) => {
    setTouched(prev => ({ ...prev, [field]: true }));
  };

  return (
    <div className="space-y-4">
      <div>
        <label htmlFor="display-name" className="block text-sm font-medium mb-1">
          Display Name *
        </label>
        <Input
          id="display-name"
          value={formData.settings_display_name}
          onChange={(value) => setFormData({...formData, settings_display_name: value})}
          onBlur={() => handleBlur('displayName')}
          aria-invalid={!!errors.displayName}
          aria-describedby={errors.displayName ? "display-name-error" : undefined}
          aria-required="true"
        />
        {errors.displayName && (
          <div 
            id="display-name-error" 
            role="alert" 
            className="text-red-500 text-sm mt-1"
          >
            {errors.displayName}
          </div>
        )}
      </div>
      
      {/* Repeat pattern for other fields */}
    </div>
  );
};
```

**Validation**:
```bash
npx tsc --noEmit
npx eslint src/sections/customerManagement --fix
```

**Testing**:
- Test keyboard navigation (Tab, Enter, Space)
- Use screen reader to verify ARIA labels
- Test form validation feedback
- Verify error messages are announced by screen readers

**Review Checkpoint**: Call react-architect and react-code-reviewer to validate changes

---

#### Task 2.6: Optimize Hook Patterns for React 19
**Files**: `hooks/useCustomerWizard.ts`, `steps/BasicInformationStep.tsx`  
**Estimated Time**: 4 hours  
**Dependencies**: Task 2.2

**Changes**:
1. Update hook patterns for React 19 best practices (H3)
2. Fix hook dependency issues (M6)

**Implementation**:

```typescript
// FILE: src/sections/customerManagement/components/AddCustomerModal/hooks/useCustomerWizard.ts
// CHANGE: Lines 25-42 - Optimize canProceed with useMemo

import { useMemo } from 'react';

// BEFORE:
const canProceed = useCallback(() => {
  switch (currentStep) {
    case WIZARD_STEPS.BASIC_INFO:
      return validation.isStep1Valid();
    case WIZARD_STEPS.ATTACK_SURFACE:
      return validation.isStep2Valid();
    // ... more cases
  }
}, [currentStep, validation]);

// AFTER:
const canProceed = useMemo(() => {
  const validationMap: Record<string, () => boolean> = {
    [WIZARD_STEPS.BASIC_INFO]: () => validation.isStep1Valid(),
    [WIZARD_STEPS.ATTACK_SURFACE]: () => validation.isStep2Valid(),
    [WIZARD_STEPS.CUSTOMER_USERS]: () => validation.isStep3Valid(),
    [WIZARD_STEPS.PRAETORIAN_USERS]: () => validation.isStep4Valid(),
    [WIZARD_STEPS.CONFIGURATION]: () => validation.isStep5Valid(),
    [WIZARD_STEPS.SUBSCRIPTION_PRICING]: () => validation.isStep6Valid(),
  };
  
  return validationMap[currentStep]?.() ?? false;
}, [currentStep, validation]);
```

```typescript
// FILE: src/sections/customerManagement/components/AddCustomerModal/steps/BasicInformationStep.tsx
// ADD: Custom hook for form state comparison (Lines 37-62)

import { useMemo } from 'react';

// ADD: New custom hook
const useFormStateComparison = (
  formData: WizardFormData, 
  defaultFormData: WizardFormData
) => {
  return useMemo(() => {
    const formDataStr = JSON.stringify({
      settings_display_name: formData.settings_display_name,
      customerType: formData.customerType,
      // ... other relevant fields
    });
    const defaultStr = JSON.stringify({
      settings_display_name: defaultFormData.settings_display_name,
      customerType: defaultFormData.customerType,
      // ... other relevant fields
    });
    
    return formDataStr !== defaultStr;
  }, [formData, defaultFormData]);
};

// In component:
const hasUserSetValues = useFormStateComparison(formData, DEFAULT_FORM_DATA);
```

**Validation**:
```bash
npx tsc --noEmit
npx eslint src/sections/customerManagement --fix
```

**Review Checkpoint**: Call react-architect and react-code-reviewer to validate changes

---

### Phase 2 Summary
**Duration**: 1-2 weeks  
**Files Created**: 4 new files  
**Files Modified**: 12 files  
**Breaking Changes**: None (internal refactoring)  
**Expected Improvements**:
- Cleaner data transformation logic
- Eliminated prop drilling in wizard
- Reusable tab management hook
- Comprehensive error handling
- Improved accessibility (WCAG 2.1 AA compliance)
- Optimized React 19 hook patterns

**Phase 2 Validation Checklist**:
- [ ] All TypeScript compilation passes
- [ ] ESLint passes with no errors
- [ ] All existing functionality works
- [ ] Error boundaries catch and display errors gracefully
- [ ] Keyboard navigation works throughout
- [ ] Screen reader announces all interactive elements
- [ ] Form validation provides accessible feedback
- [ ] Performance profiling shows improved render times
- [ ] react-architect confirms architectural improvements
- [ ] react-code-reviewer confirms code quality improvements

---

## Phase 3: Long-Term Architectural Improvements (1+ month)

### Phase 3 Overview
**Goal**: Implement service layer abstraction, comprehensive testing, and advanced optimizations

---

#### Task 3.1: Implement Service Layer Abstraction
**Files**: New `services/customerService.ts`, update all hooks  
**Estimated Time**: 8 hours  
**Dependencies**: Phase 2 complete

**Changes**:
1. Create service layer for API calls (H5)
2. Decouple hooks from direct axios usage

**Implementation**:

```typescript
// FILE: src/sections/customerManagement/services/customerService.ts
// CREATE NEW FILE

import { apiClient } from '@/services/api';

export interface JobStatsResponse {
  active: number;
  failed: number;
  succeeded: number;
}

export interface CustomerStatus {
  status: string;
  lastUpdated: Date;
}

class CustomerService {
  async getJobStats(email: string): Promise<JobStatsResponse> {
    const response = await apiClient.get<JobStatsResponse>('/my/count', {
      params: { key: '#job' },
      headers: { account: email },
    });
    return response.data;
  }

  async getCustomerStatus(email: string): Promise<CustomerStatus> {
    const response = await apiClient.get<CustomerStatus>('/my/status', {
      headers: { account: email },
    });
    return response.data;
  }

  async getRiskCounts(email: string): Promise<number> {
    const response = await apiClient.get<{ count: number }>('/my/risks/count', {
      headers: { account: email },
    });
    return response.data.count;
  }

  async getAssetCount(email: string): Promise<number> {
    const response = await apiClient.get<{ count: number }>('/my/assets/count', {
      headers: { account: email },
    });
    return response.data.count;
  }

  async getIntegrationHealth(email: string): Promise<any> {
    const response = await apiClient.get('/my/integrations/health', {
      headers: { account: email },
    });
    return response.data;
  }
}

export const customerService = new CustomerService();
```

```typescript
// FILE: src/sections/customerManagement/hooks/useCustomerJobStatus.ts
// CHANGE: Lines 11-24 - Use service layer

import { customerService } from '../services/customerService';

// BEFORE:
const response = await axios({
  method: 'get',
  url: '/my/count',
  params: { key: '#job' },
  headers: {
    Authorization: `Bearer ${token}`,
    account: email,
  },
});

// AFTER:
const response = await customerService.getJobStats(email);
const failedJobsCount = response.failed;
```

**Repeat for all hooks that make direct API calls**:
- `useCustomerStatus.ts`
- `useCustomerRiskCounts.ts`
- `useCustomerIntegrationHealth.ts`

**Benefits**:
- Centralized API logic
- Easier to mock for testing
- Type-safe API responses
- Better error handling
- Easier to add caching/retry logic

**Validation**:
```bash
npx tsc --noEmit
npx eslint src/sections/customerManagement --fix
npm run dev # Test all API interactions
```

**Review Checkpoint**: Call react-architect and react-code-reviewer to validate changes

---

#### Task 3.2: Add Input Sanitization
**Files**: New `utils/sanitization.ts`, `components/getColumns.tsx`  
**Estimated Time**: 3 hours  
**Dependencies**: Phase 1 complete

**Changes**:
1. Implement HTML sanitization utility (M5)
2. Apply to all user-generated content

**Implementation**:

```typescript
// FILE: src/sections/customerManagement/utils/sanitization.ts
// CREATE NEW FILE

import DOMPurify from 'dompurify';

export const sanitizeHtml = (dirty: string): string => {
  return DOMPurify.sanitize(dirty, {
    ALLOWED_TAGS: [], // No HTML tags allowed
    ALLOWED_ATTR: [],
    KEEP_CONTENT: true, // Keep text content
  });
};

export const sanitizeForDisplay = (input: string): string => {
  return sanitizeHtml(input)
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;');
};
```

```typescript
// FILE: src/sections/customerManagement/components/getColumns.tsx
// CHANGE: Sanitize display names

import { sanitizeForDisplay } from '../utils/sanitization';

// In column definition:
cell: (customer: CustomerData) => (
  <CustomerNameWithLogo
    customer={{
      ...customer,
      displayName: sanitizeForDisplay(customer.displayName),
      email: sanitizeForDisplay(customer.email),
    }}
    onClick={() => onCustomerClick?.(customer)}
    onOpenInNewTab={() => onCustomerOpenInNewTab?.(customer)}
  />
)
```

**Note**: Install DOMPurify:
```bash
npm install dompurify
npm install --save-dev @types/dompurify
```

**Validation**:
```bash
npx tsc --noEmit
npx eslint src/sections/customerManagement --fix
```

**Testing**:
- Test with customer names containing HTML tags
- Test with special characters
- Verify XSS attempts are blocked

**Review Checkpoint**: Call react-architect and react-code-reviewer to validate changes

---

#### Task 3.3: Implement List Virtualization
**Files**: `components/CustomerDashboard.tsx`  
**Estimated Time**: 6 hours  
**Dependencies**: Phase 2 complete

**Changes**:
1. Add virtualization for large customer lists (L1)

**Implementation**:

```typescript
// FILE: src/sections/customerManagement/components/CustomerDashboard.tsx
// CHANGE: Add virtualization support

import { useVirtualizer } from '@tanstack/react-virtual';

export const CustomerDashboard: React.FC<Props> = ({ customers, ...props }) => {
  const parentRef = useRef<HTMLDivElement>(null);
  
  const virtualizer = useVirtualizer({
    count: customers.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 64, // Estimated row height
    overscan: 5, // Render 5 extra rows above/below viewport
  });

  return (
    <div ref={parentRef} className="h-full overflow-auto">
      <div
        style={{
          height: `${virtualizer.getTotalSize()}px`,
          width: '100%',
          position: 'relative',
        }}
      >
        {virtualizer.getVirtualItems().map((virtualItem) => {
          const customer = customers[virtualItem.index];
          
          return (
            <div
              key={virtualItem.key}
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: `${virtualItem.size}px`,
                transform: `translateY(${virtualItem.start}px)`,
              }}
            >
              {/* Render customer row */}
            </div>
          );
        })}
      </div>
    </div>
  );
};
```

**Note**: Virtualization is only needed if customer lists exceed 100+ rows. May need to integrate with existing Table component.

**Validation**:
```bash
npx tsc --noEmit
npx eslint src/sections/customerManagement --fix
```

**Testing**:
- Test with 1000+ customer records
- Verify smooth scrolling
- Test filtering performance
- Verify keyboard navigation still works

**Review Checkpoint**: Call react-architect and react-code-reviewer to validate changes

---

#### Task 3.4: Add Comprehensive Unit Tests
**Files**: New test files for all hooks  
**Estimated Time**: 12 hours  
**Dependencies**: Task 3.1 complete

**Changes**:
1. Unit tests for all custom hooks (L2)
2. Unit tests for utility functions

**Implementation**:

```typescript
// FILE: src/sections/customerManagement/hooks/useCustomerManagement.test.ts
// CREATE NEW FILE

import { renderHook, waitFor } from '@testing-library/react';
import { act } from 'react';
import { useCustomerManagement } from './useCustomerManagement';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
    },
  });
  
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
};

describe('useCustomerManagement', () => {
  it('should return initial state', () => {
    const { result } = renderHook(() => useCustomerManagement(), {
      wrapper: createWrapper(),
    });
    
    expect(result.current.customers).toEqual([]);
    expect(result.current.isLoading).toBe(true);
  });

  it('should filter customers by search term', async () => {
    const { result } = renderHook(() => useCustomerManagement(), {
      wrapper: createWrapper(),
    });
    
    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });
    
    act(() => {
      result.current.setFilters({ search: 'test' });
    });
    
    expect(result.current.filteredCustomers).toHaveLength(/* expected */);
  });

  it('should handle query errors gracefully', async () => {
    // Mock API error
    const { result } = renderHook(() => useCustomerManagement(), {
      wrapper: createWrapper(),
    });
    
    await waitFor(() => {
      expect(result.current.error).toBeDefined();
    });
  });
});
```

```typescript
// FILE: src/sections/customerManagement/utils/customerDataTransforms.test.ts
// CREATE NEW FILE

import { transformCollaboratorToCustomer, isValidStatus } from './customerDataTransforms';

describe('customerDataTransforms', () => {
  describe('isValidStatus', () => {
    it('should return true for valid statuses', () => {
      expect(isValidStatus('Active')).toBe(true);
      expect(isValidStatus('Paused')).toBe(true);
      expect(isValidStatus('Setup')).toBe(true);
    });

    it('should return false for invalid statuses', () => {
      expect(isValidStatus('Invalid')).toBe(false);
      expect(isValidStatus(123)).toBe(false);
      expect(isValidStatus(null)).toBe(false);
    });
  });

  describe('transformCollaboratorToCustomer', () => {
    it('should transform collaborator to customer data', () => {
      const collaborator = {
        name: 'test@example.com',
        role: 'managed',
        updated: '2025-01-01',
      };
      
      const queries = {
        displayNameMap: new Map([['test@example.com', 'Test Customer']]),
        statusMap: new Map([['test@example.com', 'Active']]),
        // ... other maps
      };
      
      const result = transformCollaboratorToCustomer(collaborator, queries);
      
      expect(result.email).toBe('test@example.com');
      expect(result.displayName).toBe('Test Customer');
      expect(result.status).toBe('Active');
    });
  });
});
```

**Create tests for**:
- All hooks in `hooks/`
- All utilities in `utils/`
- All validation logic in `AddCustomerModal/hooks/`

**Validation**:
```bash
npm test src/sections/customerManagement
npx tsc --noEmit
npx eslint src/sections/customerManagement --fix
```

**Coverage Target**: 80%+ for business logic

**Review Checkpoint**: Call react-architect and react-code-reviewer to validate changes

---

#### Task 3.5: Add Integration Tests for Wizard Flow
**Files**: New E2E test file  
**Estimated Time**: 8 hours  
**Dependencies**: Phase 2 complete

**Changes**:
1. E2E tests for complete customer creation flow (L3)

**Implementation**:

```typescript
// FILE: src/sections/customerManagement/e2e/customerWizard.spec.ts
// CREATE NEW FILE

import { test, expect } from '@playwright/test';

test.describe('Customer Creation Wizard', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/customer-management');
    await page.click('[data-testid="add-customer-button"]');
  });

  test('should complete full wizard flow', async ({ page }) => {
    // Step 1: Basic Information
    await expect(page.locator('text=Basic Information')).toBeVisible();
    await page.fill('[id="display-name"]', 'Test Customer');
    await page.selectOption('[id="customer-type"]', 'managed');
    await page.click('button:has-text("Next")');

    // Step 2: Attack Surface
    await expect(page.locator('text=Attack Surface')).toBeVisible();
    await page.fill('[id="domain-input"]', 'example.com');
    await page.click('button:has-text("Add")');
    await page.click('button:has-text("Next")');

    // Step 3: Customer Users
    await expect(page.locator('text=Customer Users')).toBeVisible();
    await page.fill('[id="user-email"]', 'user@example.com');
    await page.click('button:has-text("Add User")');
    await page.click('button:has-text("Next")');

    // Continue for remaining steps...

    // Final step: Submit
    await page.click('button:has-text("Create Customer")');
    
    // Verify success
    await expect(page.locator('text=Customer created successfully')).toBeVisible();
  });

  test('should validate required fields', async ({ page }) => {
    // Try to proceed without filling required fields
    await page.click('button:has-text("Next")');
    
    // Verify validation errors
    await expect(page.locator('text=Display name is required')).toBeVisible();
  });

  test('should allow navigation back and preserve data', async ({ page }) => {
    // Fill first step
    await page.fill('[id="display-name"]', 'Test Customer');
    await page.click('button:has-text("Next")');
    
    // Go back
    await page.click('button:has-text("Back")');
    
    // Verify data is preserved
    await expect(page.locator('[id="display-name"]')).toHaveValue('Test Customer');
  });

  test('should handle API errors gracefully', async ({ page }) => {
    // Mock API error
    await page.route('/api/customers', route => {
      route.fulfill({
        status: 500,
        body: JSON.stringify({ error: 'Internal Server Error' }),
      });
    });
    
    // Complete wizard
    // ... fill steps ...
    await page.click('button:has-text("Create Customer")');
    
    // Verify error handling
    await expect(page.locator('text=Failed to create customer')).toBeVisible();
  });
});
```

**Validation**:
```bash
npx playwright test src/sections/customerManagement/e2e
```

**Review Checkpoint**: Call react-architect and react-code-reviewer to validate changes

---

#### Task 3.6: Refactor Large Component Files
**Files**: Split `components/getColumns.tsx` into smaller modules  
**Estimated Time**: 4 hours  
**Dependencies**: Phase 2 complete

**Changes**:
1. Split column definitions into focused files (L4)

**Implementation**:

```
// NEW STRUCTURE:
src/sections/customerManagement/components/columns/
├── index.ts                 # Main export
├── CustomerColumn.tsx       # Customer name/logo column
├── StatusColumn.tsx         # Status badge column
├── HealthColumn.tsx         # Integration health column
├── MetricsColumn.tsx        # Asset/risk counts column
└── ActionsColumn.tsx        # Action buttons column
```

```typescript
// FILE: src/sections/customerManagement/components/columns/CustomerColumn.tsx
// CREATE NEW FILE

import type { ColumnDef } from '@tanstack/react-table';
import type { CustomerData } from '../../types';
import { CustomerNameWithLogo } from '../CustomerNameWithLogo';
import { sanitizeForDisplay } from '../../utils/sanitization';

export const createCustomerColumn = (
  onCustomerClick?: (customer: CustomerData) => void,
  onCustomerOpenInNewTab?: (customer: CustomerData) => void
): ColumnDef<CustomerData> => ({
  id: 'customer',
  header: 'Customer',
  cell: ({ row }) => {
    const customer = row.original;
    return (
      <CustomerNameWithLogo
        customer={{
          ...customer,
          displayName: sanitizeForDisplay(customer.displayName),
          email: sanitizeForDisplay(customer.email),
        }}
        onClick={() => onCustomerClick?.(customer)}
        onOpenInNewTab={() => onCustomerOpenInNewTab?.(customer)}
      />
    );
  },
  sortingFn: 'alphanumeric',
});
```

```typescript
// FILE: src/sections/customerManagement/components/columns/index.ts
// CREATE NEW FILE

import type { ColumnDef } from '@tanstack/react-table';
import type { CustomerData } from '../../types';
import { createCustomerColumn } from './CustomerColumn';
import { createStatusColumn } from './StatusColumn';
import { createHealthColumn } from './HealthColumn';
import { createMetricsColumn } from './MetricsColumn';
import { createActionsColumn } from './ActionsColumn';

interface GetColumnsOptions {
  onCustomerClick?: (customer: CustomerData) => void;
  onCustomerOpenInNewTab?: (customer: CustomerData) => void;
}

export const getColumns = (options: GetColumnsOptions): ColumnDef<CustomerData>[] => {
  return [
    createCustomerColumn(options.onCustomerClick, options.onCustomerOpenInNewTab),
    createStatusColumn(),
    createHealthColumn(),
    createMetricsColumn(),
    createActionsColumn(),
  ];
};
```

**Validation**:
```bash
npx tsc --noEmit
npx eslint src/sections/customerManagement --fix
```

**Review Checkpoint**: Call react-architect and react-code-reviewer to validate changes

---

#### Task 3.7: Centralize Constants
**Files**: New `constants/index.ts`, update all components  
**Estimated Time**: 3 hours  
**Dependencies**: Phase 1 complete

**Changes**:
1. Extract magic numbers and strings to constants (L5)

**Implementation**:

```typescript
// FILE: src/sections/customerManagement/constants/index.ts
// CREATE NEW FILE

export const CUSTOMER_MANAGEMENT_CONSTANTS = {
  // Password generation
  DEFAULT_PASSWORD_LENGTH: 16,
  MAX_PASSWORD_LENGTH: 128,
  MIN_PASSWORD_LENGTH: 8,
  
  // Table configuration
  TABLE_ROW_HEIGHT: 64,
  TABLE_OVERSCAN: 5,
  TABLE_PAGE_SIZE: 20,
  
  // Performance
  SEARCH_DEBOUNCE_MS: 300,
  FILTER_DEBOUNCE_MS: 500,
  
  // Wizard steps
  WIZARD_STEP_COUNT: 6,
  
  // API
  MAX_RETRY_ATTEMPTS: 3,
  REQUEST_TIMEOUT_MS: 30000,
  
  // Status values
  VALID_STATUSES: ['Active', 'Paused', 'Setup', 'Upcoming', 'Completed'] as const,
  DEFAULT_STATUS: 'Setup' as const,
  
  // Tab names
  DEFAULT_TAB: 'global-customer-dashboard' as const,
  QUERY_BUILDER_TAB: 'global-query-builder' as const,
} as const;

export type CustomerStatus = typeof CUSTOMER_MANAGEMENT_CONSTANTS.VALID_STATUSES[number];
```

**Update all files to use these constants** instead of magic numbers/strings.

**Validation**:
```bash
npx tsc --noEmit
npx eslint src/sections/customerManagement --fix
```

**Review Checkpoint**: Call react-architect and react-code-reviewer to validate changes

---

### Phase 3 Summary
**Duration**: 1+ month  
**Files Created**: 15+ new files  
**Files Modified**: 20+ files  
**Breaking Changes**: None  
**Expected Improvements**:
- Fully decoupled API layer
- Comprehensive test coverage (80%+)
- Production-ready security measures
- Optimized performance for large datasets
- Better maintainability and code organization

**Phase 3 Validation Checklist**:
- [ ] All TypeScript compilation passes
- [ ] ESLint passes with no errors
- [ ] Unit test coverage > 80%
- [ ] E2E tests pass for complete workflows
- [ ] API calls go through service layer
- [ ] No direct axios usage in hooks
- [ ] Input sanitization prevents XSS
- [ ] Virtualization handles 1000+ rows smoothly
- [ ] All constants centralized
- [ ] Column definitions properly modularized
- [ ] react-architect confirms architectural excellence
- [ ] react-code-reviewer confirms production-ready quality

---

## Implementation Guidelines for Developer Agent

### Standard Workflow for Each Task

1. **Pre-Implementation**:
   ```bash
   git checkout -b task-[phase]-[task-number]
   git pull origin main
   ```

2. **Implementation**:
   - Read the task description carefully
   - Review referenced files and line numbers
   - Implement changes exactly as specified
   - Add comments for complex logic

3. **Validation**:
   ```bash
   npx tsc --noEmit              # TypeScript check
   npx eslint src/sections/customerManagement --fix  # Linting
   npm run dev                    # Manual testing
   ```

4. **Testing**:
   - Test in browser (for UI changes)
   - Run unit tests (if applicable)
   - Verify no console errors
   - Test edge cases

5. **Review Checkpoint**:
   ```bash
   # Call for architectural review
   @react-architect "Review changes in task [X.Y]"
   
   # Call for code quality review
   @react-code-reviewer "Review changes in task [X.Y]"
   ```

6. **Commit**:
   ```bash
   git add .
   git commit -m "feat(customer-mgmt): [task description]"
   git push origin task-[phase]-[task-number]
   ```

7. **Post-Task Validation**:
   - Verify all functionality still works
   - Check performance in Chrome DevTools
   - Test keyboard navigation
   - Verify no regression in other features

### Error Handling

If a task fails:
1. Do NOT proceed to next task
2. Document the error
3. Call react-architect or react-code-reviewer for guidance
4. Fix the issue before moving forward

### Code Quality Standards

- **TypeScript**: No `any` types, proper type definitions
- **React**: Follow hooks rules, proper dependency arrays
- **Accessibility**: WCAG 2.1 AA compliance
- **Performance**: No unnecessary re-renders
- **Security**: Sanitize all user inputs
- **Testing**: Write tests for new code

### Communication with Orchestrator

After each phase completion:
```
Phase [X] completed successfully.

Summary:
- Tasks completed: [X/X]
- Files modified: [count]
- Files created: [count]
- Tests passing: [count]
- Coverage: [percentage]

Ready for Phase [X+1].
```

---

## Appendix

### File Structure After Refactoring

```
src/sections/customerManagement/
├── index.tsx                           # Main component (with ErrorBoundary)
├── types.ts                            # Type definitions (refactored)
├── constants/
│   └── index.ts                        # Centralized constants
├── settings/
│   └── user.tsx
├── services/
│   └── customerService.ts              # API service layer
├── utils/
│   ├── customerDataTransforms.ts       # Data transformation utilities
│   └── sanitization.ts                 # Input sanitization
├── components/
│   ├── ErrorBoundary.tsx               # Error boundary component
│   ├── PeriodOfPerformance.tsx
│   ├── GlobalActions.tsx
│   ├── StatusBadge.tsx
│   ├── UpdateCustomerTypeModal.tsx
│   ├── CustomerManagementSearchFilters.tsx
│   ├── CustomerNameWithLogo.tsx        # Enhanced with a11y
│   ├── CustomerDashboard.tsx           # Optimized re-renders
│   ├── columns/                        # Split column definitions
│   │   ├── index.ts
│   │   ├── CustomerColumn.tsx
│   │   ├── StatusColumn.tsx
│   │   ├── HealthColumn.tsx
│   │   ├── MetricsColumn.tsx
│   │   └── ActionsColumn.tsx
│   └── AddCustomerModal/
│       ├── index.tsx                   # With WizardProvider
│       ├── AddCustomerModal.constants.ts
│       ├── AddCustomerModal.types.ts
│       ├── context/
│       │   └── WizardContext.tsx       # Wizard state context
│       ├── utils/
│       │   ├── usernameGenerator.ts
│       │   ├── passwordGenerator.ts    # Optimized
│       │   ├── subscriptionCreator.ts
│       │   ├── dateCalculations.ts
│       │   └── index.ts
│       ├── components/
│       │   ├── CustomerTypeChangeConfirmationDialog.tsx
│       │   ├── ProgressBar.tsx
│       │   └── index.ts
│       ├── steps/
│       │   ├── CustomerUsersStep.tsx   # Using context
│       │   ├── PraetorianUsersStep.tsx # Using context
│       │   ├── ConfigurationStep.tsx   # Using context
│       │   ├── AttackSurfaceStep.tsx   # Using context
│       │   ├── BasicInformationStep.tsx # Using context + a11y
│       │   ├── SubscriptionPricingStep.tsx # Using context
│       │   └── index.ts
│       └── hooks/
│           ├── useWizardFooter.tsx
│           ├── useCustomerSubmit.ts
│           ├── useCustomerValidation.ts
│           ├── useDateCalculation.ts
│           ├── useCustomerWizard.ts    # Optimized
│           └── index.ts
├── hooks/
│   ├── useTabManagement.ts             # Extracted hook
│   ├── useCustomerDisplayName.ts
│   ├── useCustomerJobStatus.ts         # Using service layer
│   ├── useCustomerRiskCounts.ts        # Using service layer
│   ├── useCustomerStatus.ts            # Using service layer
│   ├── useCustomerIntegrationHealth.ts # Using service layer
│   ├── useCustomerManagement.ts        # Refactored
│   └── useCalculatedCustomerStatus.ts
└── __tests__/                          # New test directory
    ├── hooks/
    │   ├── useCustomerManagement.test.ts
    │   ├── useTabManagement.test.ts
    │   └── ...
    ├── utils/
    │   ├── customerDataTransforms.test.ts
    │   ├── sanitization.test.ts
    │   └── ...
    └── e2e/
        └── customerWizard.spec.ts
```

### Estimated Total Effort

| Phase | Duration | Developer Days |
|-------|----------|----------------|
| Phase 1: Quick Wins | 2-3 days | 2-3 days |
| Phase 2: Medium-Term | 1-2 weeks | 5-10 days |
| Phase 3: Long-Term | 1+ month | 20-30 days |
| **Total** | **1.5-2 months** | **27-43 days** |

### Success Metrics

**Phase 1**:
- Zero TypeScript errors
- Zero ESLint errors
- No critical bugs

**Phase 2**:
- Lighthouse accessibility score > 90
- React DevTools shows <50% unnecessary re-renders
- Error boundaries catch all errors

**Phase 3**:
- Unit test coverage > 80%
- E2E test coverage for critical flows
- Performance: <100ms render time for 100 customers
- Security: Zero XSS vulnerabilities

### Risk Mitigation

**Risks**:
1. Breaking existing functionality during refactoring
2. Performance regression
3. Accessibility degradation
4. Scope creep

**Mitigation**:
1. Incremental changes with validation at each step
2. Performance profiling before/after each phase
3. Accessibility testing with screen readers
4. Strict adherence to this plan

---

## Conclusion

This refactoring plan provides a comprehensive roadmap for transforming the customerManagement module from its current good state to production-ready excellence. By following the phased approach and validating at each step, we can ensure continuous functionality while making significant improvements to code quality, performance, accessibility, and maintainability.

The plan prioritizes quick wins in Phase 1 to demonstrate immediate value, addresses architectural improvements in Phase 2, and completes the transformation with comprehensive testing and optimization in Phase 3.

**Next Steps**: Begin with Phase 1, Task 1.1 after approval from stakeholders and technical leads.

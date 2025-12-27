/**
 * Complete Feature Flags Context Example
 *
 * Features:
 * - Runtime feature flag management
 * - API fetching with caching
 * - Local overrides for development
 * - TypeScript type safety
 * - Conditional rendering helpers
 */

import {
  createContext,
  useContext,
  useState,
  useCallback,
  useMemo,
  useEffect,
  ReactNode,
} from 'react';

// Types
type FeatureFlags = Record<string, boolean>;

type FeatureFlagsContextType = {
  flags: FeatureFlags;
  loading: boolean;
  error: Error | null;
  isEnabled: (flag: string) => boolean;
  setOverride: (flag: string, value: boolean) => void;
  clearOverrides: () => void;
  refresh: () => Promise<void>;
};

// Context
const FeatureFlagsContext = createContext<FeatureFlagsContextType | undefined>(
  undefined
);

// Mock API (replace with real API)
const featureFlagsAPI = {
  async fetch(): Promise<FeatureFlags> {
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1000));

    return {
      'new-dashboard': true,
      'beta-features': false,
      'dark-mode': true,
      'ai-assistant': false,
      'advanced-analytics': true,
    };
  },
};

// Provider Component
export function FeatureFlagsProvider({
  children,
  initialFlags = {},
}: {
  children: ReactNode;
  initialFlags?: FeatureFlags;
}) {
  const [flags, setFlags] = useState<FeatureFlags>(initialFlags);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  // Local overrides for development (stored in localStorage)
  const [overrides, setOverrides] = useState<FeatureFlags>(() => {
    if (typeof window === 'undefined') return {};

    const stored = localStorage.getItem('feature-flag-overrides');
    return stored ? JSON.parse(stored) : {};
  });

  // Fetch flags on mount
  useEffect(() => {
    fetchFlags();
  }, []);

  // Save overrides to localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('feature-flag-overrides', JSON.stringify(overrides));
    }
  }, [overrides]);

  const fetchFlags = async () => {
    setLoading(true);
    setError(null);

    try {
      const fetchedFlags = await featureFlagsAPI.fetch();
      setFlags(fetchedFlags);
    } catch (err) {
      setError(err as Error);
    } finally {
      setLoading(false);
    }
  };

  const isEnabled = useCallback(
    (flag: string): boolean => {
      // Check overrides first (for development)
      if (flag in overrides) {
        return overrides[flag];
      }

      // Fall back to API flags
      return flags[flag] ?? false;
    },
    [flags, overrides]
  );

  const setOverride = useCallback((flag: string, value: boolean) => {
    setOverrides(prev => ({ ...prev, [flag]: value }));
  }, []);

  const clearOverrides = useCallback(() => {
    setOverrides({});
  }, []);

  const refresh = useCallback(async () => {
    await fetchFlags();
  }, []);

  const value = useMemo(
    () => ({
      flags,
      loading,
      error,
      isEnabled,
      setOverride,
      clearOverrides,
      refresh,
    }),
    [flags, loading, error, isEnabled, setOverride, clearOverrides, refresh]
  );

  return (
    <FeatureFlagsContext.Provider value={value}>
      {children}
    </FeatureFlagsContext.Provider>
  );
}

// Custom Hook
export function useFeatureFlags() {
  const context = useContext(FeatureFlagsContext);

  if (context === undefined) {
    throw new Error('useFeatureFlags must be used within FeatureFlagsProvider');
  }

  return context;
}

// Custom Hook: Single Flag
export function useFeatureFlag(flag: string): boolean {
  const { isEnabled } = useFeatureFlags();
  return isEnabled(flag);
}

// Helper Components

// Conditional rendering based on feature flag
export function FeatureGate({
  flag,
  children,
  fallback = null,
}: {
  flag: string;
  children: ReactNode;
  fallback?: ReactNode;
}) {
  const { isEnabled, loading } = useFeatureFlags();

  if (loading) {
    return <>{fallback}</>;
  }

  return <>{isEnabled(flag) ? children : fallback}</>;
}

// Show content when flag is enabled
export function WhenEnabled({
  flag,
  children,
}: {
  flag: string;
  children: ReactNode;
}) {
  const enabled = useFeatureFlag(flag);

  if (!enabled) return null;

  return <>{children}</>;
}

// Show content when flag is disabled
export function WhenDisabled({
  flag,
  children,
}: {
  flag: string;
  children: ReactNode;
}) {
  const enabled = useFeatureFlag(flag);

  if (enabled) return null;

  return <>{children}</>;
}

// Usage Examples

// Example 1: Simple feature gate
function Dashboard() {
  return (
    <div>
      <h1>Dashboard</h1>

      <FeatureGate flag="new-dashboard" fallback={<OldDashboard />}>
        <NewDashboard />
      </FeatureGate>
    </div>
  );
}

function OldDashboard() {
  return <div>Old Dashboard (Stable)</div>;
}

function NewDashboard() {
  return <div>New Dashboard (Beta)</div>;
}

// Example 2: Conditional UI elements
function Toolbar() {
  const aiEnabled = useFeatureFlag('ai-assistant');
  const analyticsEnabled = useFeatureFlag('advanced-analytics');

  return (
    <div className="toolbar">
      <button>Home</button>
      <button>Settings</button>

      {aiEnabled && <button>AI Assistant</button>}

      {analyticsEnabled && <button>Analytics</button>}

      <WhenEnabled flag="beta-features">
        <button className="beta-badge">Beta Features</button>
      </WhenEnabled>
    </div>
  );
}

// Example 3: Feature flag admin panel (dev only)
function FeatureFlagsAdmin() {
  const { flags, isEnabled, setOverride, clearOverrides, refresh } =
    useFeatureFlags();

  return (
    <div style={{ padding: '1rem', border: '1px solid red', margin: '1rem' }}>
      <h3>Feature Flags (Development Only)</h3>
      <button onClick={refresh}>Refresh from API</button>
      <button onClick={clearOverrides}>Clear Overrides</button>

      <table>
        <thead>
          <tr>
            <th>Flag</th>
            <th>API Value</th>
            <th>Current Value</th>
            <th>Override</th>
          </tr>
        </thead>
        <tbody>
          {Object.entries(flags).map(([flag, apiValue]) => (
            <tr key={flag}>
              <td>{flag}</td>
              <td>{apiValue ? '✅' : '❌'}</td>
              <td>{isEnabled(flag) ? '✅' : '❌'}</td>
              <td>
                <button onClick={() => setOverride(flag, true)}>ON</button>
                <button onClick={() => setOverride(flag, false)}>OFF</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// Example 4: A/B testing component
function ABTest({
  flag,
  variantA,
  variantB,
}: {
  flag: string;
  variantA: ReactNode;
  variantB: ReactNode;
}) {
  const enabled = useFeatureFlag(flag);

  return <>{enabled ? variantB : variantA}</>;
}

function PricingPage() {
  return (
    <div>
      <h1>Pricing</h1>

      <ABTest
        flag="new-pricing-layout"
        variantA={<OldPricingLayout />}
        variantB={<NewPricingLayout />}
      />
    </div>
  );
}

function OldPricingLayout() {
  return <div>Original Pricing (Control)</div>;
}

function NewPricingLayout() {
  return <div>New Pricing (Experiment)</div>;
}

// Example 5: Feature flag with analytics
function FeatureButton({ flag, children }: { flag: string; children: ReactNode }) {
  const enabled = useFeatureFlag(flag);

  useEffect(() => {
    if (enabled) {
      // Track feature exposure
      console.log(`Feature "${flag}" shown to user`);
      // analytics.track('feature_exposure', { flag, enabled: true });
    }
  }, [flag, enabled]);

  if (!enabled) return null;

  return (
    <button
      onClick={() => {
        // Track feature interaction
        console.log(`Feature "${flag}" clicked`);
        // analytics.track('feature_interaction', { flag });
      }}
    >
      {children}
    </button>
  );
}

// Example 6: Complete app
export function App() {
  return (
    <FeatureFlagsProvider>
      <div>
        <h1>App with Feature Flags</h1>

        {/* Show admin panel in development only */}
        {process.env.NODE_ENV === 'development' && <FeatureFlagsAdmin />}

        <Dashboard />
        <Toolbar />
        <PricingPage />

        <FeatureButton flag="ai-assistant">Try AI Assistant</FeatureButton>
      </div>
    </FeatureFlagsProvider>
  );
}

// Advanced: Feature flag hooks with default values
export function useFeatureFlagWithDefault(
  flag: string,
  defaultValue: boolean
): boolean {
  const { flags, loading } = useFeatureFlags();

  if (loading) {
    return defaultValue;
  }

  return flags[flag] ?? defaultValue;
}

// Advanced: Multiple flags check
export function useFeatureFlags MultipleFlags(
  flags: string[]
): Record<string, boolean> {
  const { isEnabled } = useFeatureFlags();

  return useMemo(
    () =>
      flags.reduce(
        (acc, flag) => {
          acc[flag] = isEnabled(flag);
          return acc;
        },
        {} as Record<string, boolean>
      ),
    [flags, isEnabled]
  );
}

/**
 * Complete Theme Context Example
 *
 * Features:
 * - Light/dark theme toggle
 * - LocalStorage persistence
 * - System theme detection
 * - CSS custom properties
 * - TypeScript type safety
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
type Theme = 'light' | 'dark' | 'system';

type ThemeContextType = {
  theme: Theme;
  resolvedTheme: 'light' | 'dark'; // Actual theme (resolves 'system')
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
};

// Context
const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

// Helper: Get system theme
function getSystemTheme(): 'light' | 'dark' {
  if (typeof window === 'undefined') return 'light';

  return window.matchMedia('(prefers-color-scheme: dark)').matches
    ? 'dark'
    : 'light';
}

// Helper: Resolve theme
function resolveTheme(theme: Theme): 'light' | 'dark' {
  if (theme === 'system') {
    return getSystemTheme();
  }
  return theme;
}

// Provider Component
export function ThemeProvider({
  children,
  defaultTheme = 'system',
  storageKey = 'theme',
}: {
  children: ReactNode;
  defaultTheme?: Theme;
  storageKey?: string;
}) {
  // Initialize from localStorage or default
  const [theme, setThemeState] = useState<Theme>(() => {
    if (typeof window === 'undefined') return defaultTheme;

    const stored = localStorage.getItem(storageKey);
    if (stored && ['light', 'dark', 'system'].includes(stored)) {
      return stored as Theme;
    }

    return defaultTheme;
  });

  // Resolved theme (handles 'system')
  const [resolvedTheme, setResolvedTheme] = useState<'light' | 'dark'>(() =>
    resolveTheme(theme)
  );

  // Listen for system theme changes
  useEffect(() => {
    if (theme !== 'system') return;

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');

    const handleChange = () => {
      setResolvedTheme(getSystemTheme());
    };

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, [theme]);

  // Update resolved theme when theme changes
  useEffect(() => {
    setResolvedTheme(resolveTheme(theme));
  }, [theme]);

  // Apply theme to document
  useEffect(() => {
    const root = window.document.documentElement;

    // Remove previous theme classes
    root.classList.remove('light', 'dark');

    // Add new theme class
    root.classList.add(resolvedTheme);

    // Update meta theme-color
    const metaThemeColor = document.querySelector('meta[name="theme-color"]');
    if (metaThemeColor) {
      metaThemeColor.setAttribute(
        'content',
        resolvedTheme === 'dark' ? '#1a1a1a' : '#ffffff'
      );
    }

    // Set CSS custom property
    root.style.setProperty('--theme', resolvedTheme);
  }, [resolvedTheme]);

  const setTheme = useCallback(
    (newTheme: Theme) => {
      localStorage.setItem(storageKey, newTheme);
      setThemeState(newTheme);
    },
    [storageKey]
  );

  const toggleTheme = useCallback(() => {
    setTheme(resolvedTheme === 'light' ? 'dark' : 'light');
  }, [resolvedTheme, setTheme]);

  const value = useMemo(
    () => ({
      theme,
      resolvedTheme,
      setTheme,
      toggleTheme,
    }),
    [theme, resolvedTheme, setTheme, toggleTheme]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

// Custom Hook
export function useTheme() {
  const context = useContext(ThemeContext);

  if (context === undefined) {
    throw new Error('useTheme must be used within ThemeProvider');
  }

  return context;
}

// Usage Examples

// Example 1: Simple theme toggle button
function ThemeToggle() {
  const { resolvedTheme, toggleTheme } = useTheme();

  return (
    <button onClick={toggleTheme} aria-label="Toggle theme">
      {resolvedTheme === 'light' ? '🌙' : '☀️'}
    </button>
  );
}

// Example 2: Theme selector with system option
function ThemeSelector() {
  const { theme, setTheme } = useTheme();

  return (
    <div>
      <h3>Theme</h3>
      <select value={theme} onChange={e => setTheme(e.target.value as Theme)}>
        <option value="light">Light</option>
        <option value="dark">Dark</option>
        <option value="system">System</option>
      </select>
    </div>
  );
}

// Example 3: Themed component
function ThemedCard({ title, content }: { title: string; content: string }) {
  const { resolvedTheme } = useTheme();

  const cardStyle = {
    backgroundColor: resolvedTheme === 'light' ? '#ffffff' : '#1a1a1a',
    color: resolvedTheme === 'light' ? '#000000' : '#ffffff',
    border: `1px solid ${resolvedTheme === 'light' ? '#e5e5e5' : '#333333'}`,
    padding: '1rem',
    borderRadius: '8px',
  };

  return (
    <div style={cardStyle}>
      <h2>{title}</h2>
      <p>{content}</p>
    </div>
  );
}

// Example 4: Theme-aware image
function ThemedLogo() {
  const { resolvedTheme } = useTheme();

  return (
    <img
      src={`/logo-${resolvedTheme}.svg`}
      alt="Logo"
      width={200}
      height={60}
    />
  );
}

// Example 5: Complete app with theme
export function App() {
  return (
    <ThemeProvider defaultTheme="system">
      <div style={{ minHeight: '100vh', padding: '2rem' }}>
        <header style={{ marginBottom: '2rem' }}>
          <ThemedLogo />
          <ThemeToggle />
          <ThemeSelector />
        </header>

        <main>
          <ThemedCard
            title="Welcome"
            content="This card automatically adapts to your theme preference."
          />
        </main>
      </div>
    </ThemeProvider>
  );
}

// CSS Custom Properties (add to your global CSS)
/*
:root {
  --background: #ffffff;
  --foreground: #000000;
  --border: #e5e5e5;
}

.dark {
  --background: #1a1a1a;
  --foreground: #ffffff;
  --border: #333333;
}

body {
  background-color: var(--background);
  color: var(--foreground);
}
*/

// Tailwind CSS Integration
/*
// tailwind.config.js
module.exports = {
  darkMode: 'class', // Use class strategy
  // ... rest of config
}

// Then use: className="bg-white dark:bg-gray-900"
*/

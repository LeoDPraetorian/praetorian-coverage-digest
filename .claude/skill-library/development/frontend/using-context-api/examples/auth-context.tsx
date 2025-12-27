/**
 * Complete Authentication Context Example
 *
 * Features:
 * - Login/logout with async API calls
 * - Loading and error states
 * - Token management
 * - Protected route helper
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
type User = {
  id: string;
  email: string;
  name: string;
  role: 'admin' | 'user';
};

type Credentials = {
  email: string;
  password: string;
};

type AsyncState<T> = {
  data: T | null;
  loading: boolean;
  error: Error | null;
};

type AuthContextType = {
  user: AsyncState<User>;
  isAuthenticated: boolean;
  login: (credentials: Credentials) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
};

// Context
const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Mock API (replace with real API calls)
const authAPI = {
  async login(credentials: Credentials): Promise<{ user: User; token: string }> {
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1000));

    if (credentials.email === 'test@example.com' && credentials.password === 'password') {
      return {
        user: {
          id: '1',
          email: credentials.email,
          name: 'Test User',
          role: 'user',
        },
        token: 'fake-jwt-token',
      };
    }

    throw new Error('Invalid credentials');
  },

  async logout(): Promise<void> {
    await new Promise(resolve => setTimeout(resolve, 500));
  },

  async getCurrentUser(): Promise<User> {
    await new Promise(resolve => setTimeout(resolve, 500));
    const token = localStorage.getItem('auth_token');

    if (!token) {
      throw new Error('Not authenticated');
    }

    return {
      id: '1',
      email: 'test@example.com',
      name: 'Test User',
      role: 'user',
    };
  },
};

// Provider Component
export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AsyncState<User>>({
    data: null,
    loading: true, // Start with loading to check for existing session
    error: null,
  });

  // Check for existing session on mount
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const currentUser = await authAPI.getCurrentUser();
        setUser({ data: currentUser, loading: false, error: null });
      } catch (error) {
        setUser({ data: null, loading: false, error: null });
      }
    };

    checkAuth();
  }, []);

  const login = useCallback(async (credentials: Credentials) => {
    setUser(prev => ({ ...prev, loading: true, error: null }));

    try {
      const { user, token } = await authAPI.login(credentials);

      // Store token
      localStorage.setItem('auth_token', token);

      setUser({ data: user, loading: false, error: null });
    } catch (error) {
      setUser({
        data: null,
        loading: false,
        error: error as Error,
      });
      throw error; // Re-throw so caller can handle
    }
  }, []);

  const logout = useCallback(async () => {
    setUser(prev => ({ ...prev, loading: true }));

    try {
      await authAPI.logout();

      // Clear token
      localStorage.removeItem('auth_token');

      setUser({ data: null, loading: false, error: null });
    } catch (error) {
      setUser(prev => ({
        ...prev,
        loading: false,
        error: error as Error,
      }));
    }
  }, []);

  const refreshUser = useCallback(async () => {
    setUser(prev => ({ ...prev, loading: true }));

    try {
      const currentUser = await authAPI.getCurrentUser();
      setUser({ data: currentUser, loading: false, error: null });
    } catch (error) {
      setUser({
        data: null,
        loading: false,
        error: error as Error,
      });
    }
  }, []);

  const value = useMemo(
    () => ({
      user,
      isAuthenticated: user.data !== null,
      login,
      logout,
      refreshUser,
    }),
    [user, login, logout, refreshUser]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// Custom Hook
export function useAuth() {
  const context = useContext(AuthContext);

  if (context === undefined) {
    throw new Error('useAuth must be used within AuthProvider');
  }

  return context;
}

// Helper: Require Authentication
export function RequireAuth({ children }: { children: ReactNode }) {
  const { isAuthenticated, user } = useAuth();

  if (user.loading) {
    return <div>Loading...</div>;
  }

  if (!isAuthenticated) {
    return <div>Please log in to access this page.</div>;
  }

  return <>{children}</>;
}

// Helper: Require Role
export function RequireRole({
  role,
  children,
}: {
  role: User['role'];
  children: ReactNode;
}) {
  const { user } = useAuth();

  if (user.data?.role !== role) {
    return <div>You do not have permission to access this page.</div>;
  }

  return <>{children}</>;
}

// Usage Example
function LoginForm() {
  const { login, user } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      await login({ email, password });
    } catch (error) {
      // Error is already set in context
      console.error('Login failed');
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <input
        type="email"
        value={email}
        onChange={e => setEmail(e.target.value)}
        placeholder="Email"
      />
      <input
        type="password"
        value={password}
        onChange={e => setPassword(e.target.value)}
        placeholder="Password"
      />
      <button type="submit" disabled={user.loading}>
        {user.loading ? 'Logging in...' : 'Login'}
      </button>
      {user.error && <div className="error">{user.error.message}</div>}
    </form>
  );
}

function UserProfile() {
  const { user, logout } = useAuth();

  if (!user.data) return null;

  return (
    <div>
      <h2>Welcome, {user.data.name}</h2>
      <p>Email: {user.data.email}</p>
      <p>Role: {user.data.role}</p>
      <button onClick={logout}>Logout</button>
    </div>
  );
}

function ProtectedPage() {
  return (
    <RequireAuth>
      <RequireRole role="admin">
        <div>
          <h1>Admin Dashboard</h1>
          <p>Only admins can see this.</p>
        </div>
      </RequireRole>
    </RequireAuth>
  );
}

export function App() {
  return (
    <AuthProvider>
      <div>
        <h1>Auth Context Example</h1>
        <LoginForm />
        <UserProfile />
        <ProtectedPage />
      </div>
    </AuthProvider>
  );
}

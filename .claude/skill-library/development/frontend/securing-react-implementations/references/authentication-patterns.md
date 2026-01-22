# Authentication Patterns in React

**Secure authentication implementation patterns for React applications.**

---

## Token Storage Strategy

### The Gold Standard: Hybrid Approach

| Token Type | Storage | Why |
|------------|---------|-----|
| Access Token | Memory (React state/context) | Short-lived, XSS can't persist it |
| Refresh Token | httpOnly cookie | Protected from JavaScript access |

```typescript
// AuthContext with memory-stored access token
import { createContext, useContext, useState, useCallback } from 'react';

interface AuthContextType {
  accessToken: string | null;
  setAccessToken: (token: string | null) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }) {
  // Access token in memory only (not localStorage)
  const [accessToken, setAccessToken] = useState<string | null>(null);

  const logout = useCallback(() => {
    setAccessToken(null);
    // Call logout endpoint to clear httpOnly refresh cookie
    fetch('/api/auth/logout', { method: 'POST', credentials: 'include' });
  }, []);

  return (
    <AuthContext.Provider value={{ accessToken, setAccessToken, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
}
```

### Why NOT localStorage

**92% of JWT leaks originate from frontend storage mistakes.**

| Storage | XSS Risk | CSRF Risk | Persistence |
|---------|----------|-----------|-------------|
| localStorage | ❌ High (accessible) | ✅ None | ❌ Persists |
| sessionStorage | ❌ High (accessible) | ✅ None | ⚠️ Tab only |
| Memory | ✅ Low (no persistence) | ✅ None | ✅ Session only |
| httpOnly cookie | ✅ None (not accessible) | ❌ Requires CSRF | ✅ Configurable |

---

## Token Refresh Pattern

### Axios Interceptor Implementation

```typescript
import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';

const api = axios.create({
  baseURL: '/api',
  withCredentials: true,
});

let isRefreshing = false;
let failedQueue: Array<{
  resolve: (token: string) => void;
  reject: (error: Error) => void;
}> = [];

const processQueue = (error: Error | null, token: string | null) => {
  failedQueue.forEach((promise) => {
    if (error) {
      promise.reject(error);
    } else {
      promise.resolve(token!);
    }
  });
  failedQueue = [];
};

api.interceptors.request.use((config) => {
  const token = getAccessToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & {
      _retry?: boolean;
    };

    if (error.response?.status === 401 && !originalRequest._retry) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({
            resolve: (token) => {
              originalRequest.headers.Authorization = `Bearer ${token}`;
              resolve(api(originalRequest));
            },
            reject,
          });
        });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        const response = await axios.post('/api/auth/refresh', {}, { withCredentials: true });
        const newToken = response.data.accessToken;
        setAccessToken(newToken);
        processQueue(null, newToken);
        originalRequest.headers.Authorization = `Bearer ${newToken}`;
        return api(originalRequest);
      } catch (refreshError) {
        processQueue(refreshError as Error, null);
        logout();
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }
    return Promise.reject(error);
  }
);

export default api;
```

---

## OAuth 2.0 PKCE Flow

**PKCE is mandatory for SPAs** - implicit flow is deprecated.

```typescript
async function generatePKCE() {
  const verifier = generateRandomString(128);
  const encoder = new TextEncoder();
  const data = encoder.encode(verifier);
  const hash = await crypto.subtle.digest('SHA-256', data);
  const challenge = base64UrlEncode(hash);
  return { verifier, challenge };
}

function generateRandomString(length: number): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~';
  const array = new Uint8Array(length);
  crypto.getRandomValues(array);
  return Array.from(array, (x) => chars[x % chars.length]).join('');
}

function base64UrlEncode(buffer: ArrayBuffer): string {
  return btoa(String.fromCharCode(...new Uint8Array(buffer)))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');
}

async function startOAuthLogin() {
  const { verifier, challenge } = await generatePKCE();
  sessionStorage.setItem('pkce_verifier', verifier);

  const params = new URLSearchParams({
    client_id: OAUTH_CLIENT_ID,
    redirect_uri: REDIRECT_URI,
    response_type: 'code',
    scope: 'openid profile email',
    code_challenge: challenge,
    code_challenge_method: 'S256',
    state: generateRandomString(32),
  });

  window.location.href = `${OAUTH_AUTHORIZE_URL}?${params}`;
}
```

---

## Protected Routes

```typescript
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from './AuthContext';

export function ProtectedRoute({ children, requiredRoles }) {
  const { accessToken, user, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) return <LoadingSpinner />;

  if (!accessToken) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (requiredRoles && !requiredRoles.some((role) => user?.roles.includes(role))) {
    return <Navigate to="/unauthorized" replace />;
  }

  return <>{children}</>;
}
```

---

## Recommended Auth Libraries

| Library | Best For | Free Tier |
|---------|----------|-----------|
| **Clerk** | Next.js teams | 10k MAU |
| **Auth0** | Enterprise | 25k MAU |
| **Firebase** | Mobile-first | 50k MAU |
| **SuperTokens** | Self-hosted | Unlimited |
| **NextAuth** | Next.js OSS | Unlimited |

---

## Security Checklist

- [ ] Access tokens in memory, refresh tokens in httpOnly cookies
- [ ] PKCE implemented for OAuth flows
- [ ] Token refresh with request queuing
- [ ] Protected routes with loading states
- [ ] Logout clears both tokens and server session
- [ ] HTTPS only in production

---

## Related Resources

- [OAuth 2.0 for Browser-Based Apps](https://datatracker.ietf.org/doc/html/draft-ietf-oauth-browser-based-apps)
- [Auth0 React SDK](https://auth0.com/docs/libraries/auth0-react)

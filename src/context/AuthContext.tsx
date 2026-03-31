import React, { createContext, useContext, useState, useEffect } from 'react';
import { jwtDecode } from 'jwt-decode';
import axios from 'axios';

// JWT payload shape
export interface JwtPayload {
  sub: string;
  role: string;
  roles: string[];
  tenant: string | {
    _id: string;
    slug: string;
    name: string;
    logo?: string;
    contactEmail?: string;
    contactPhone?: string;
    subscriptionStatus?: string;
    [key: string]: any
  };
  availableTenants?: Array<{ slug: string; name: string }>; // Added field

  iat: number;
  exp: number;
  // Custom fields added by the backend token payload
  _id?: string;
  id?: string;
  isActive?: boolean;
  department?: string;
  name?: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  profileImage?: string;
  avatar?: string;
  subscriptionStatus?: string;
  tenantName?: string;
  tenantLogo?: string;
  savedAddresses?: Array<{
    label?: string;
    street?: string;
    city?: string;
    state?: string;
    zipCode?: string;
    landmark?: string;
    isDefault?: boolean;
    _id?: string;
  }>;
}

type LoginResponse = {
  success: boolean;
  error?: string;
  slug?: string;
  user?: any;
  availableTenants?: Array<{ slug: string; name: string }>; // Added field
};

// Context interface
interface AuthContextProps {
  token: string | null;
  user: JwtPayload | null;
  activeRole: string | null;
  availableTenants: Array<{ slug: string; name: string }>;
  login: (credentials: { email: string; password: string; tenantSlug?: string }) => Promise<LoginResponse>;
  logout: () => void;
  isLoading: boolean;
  hasPermission: (module: string, action: string) => boolean;
  hasRole: (roles: string[]) => boolean;
  switchRole: (role: string) => void;
  switchTenant: (slug: string) => Promise<void>;
  tenantSlug: string | null;
  getUserFullName: () => string;
  isAuthenticated: boolean;
  updateUserData: (data: Partial<JwtPayload>) => void;
}

const AuthContext = createContext<AuthContextProps | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode; initialUser?: any }> = ({ children, initialUser }) => {
  const [token, setToken] = useState<string | null>(initialUser ? 'test-token' : null);
  const [user, setUser] = useState<JwtPayload | null>(initialUser || null);
  const [activeRole, setActiveRole] = useState<string | null>(initialUser?.role || null);
  const [isLoading, setIsLoading] = useState(true);
  const [tenantSlug, setTenantSlug] = useState<string | null>(null);
  const [availableTenants, setAvailableTenants] = useState<Array<{ slug: string; name: string }>>([]);

  const login = async (credentials: { email: string; password: string; tenantSlug?: string }): Promise<LoginResponse> => {
    try {
      console.log('AuthContext: Attempting login with', credentials.email, credentials.tenantSlug);
      const API_BASE = `${import.meta.env.VITE_API_URL || 'http://localhost:5006'}/api`;
      const response = await axios.post(`${API_BASE}/auth/login`, credentials);
      console.log('AuthContext: Login response received', response.data);

      if (response.data && response.data.token) {
        const jwt = response.data.token;
        setToken(jwt);
        console.log('AuthContext: Token set');

        const decoded = jwtDecode<JwtPayload>(jwt);
        console.log('AuthContext: Token decoded', decoded);

        // Merge response data (which has full objects) with decoded token
        // IMPORTANT: decoded token has 'tenant' as string ID, but we want the full tenant object from response.
        // So we spread decoded FIRST, then response user data (or manually fix tenant)
        // Actually, backend returns flattened response at root in some cases, or under .user
        const responseUser = response.data.user || response.data;

        const userObj = { ...decoded, ...responseUser };

        // Ensure tenant object is preserved (derived from response)
        if (response.data.tenant) {
          userObj.tenant = response.data.tenant;
        }

        // Ensure roles array exists
        if (!userObj.roles && userObj.role) {
          userObj.roles = [userObj.role];
        } else if (!userObj.roles) {
          userObj.roles = ['cashier'];
        }

        setUser(userObj);
        setActiveRole(userObj.roles[0] || userObj.role || 'cashier');

        // Handle available tenants
        const tenants = response.data.availableTenants || [];
        setAvailableTenants(tenants);

        localStorage.setItem('jwt', jwt);
        localStorage.setItem('user', JSON.stringify(userObj));
        localStorage.setItem('activeRole', userObj.roles[0] || userObj.role || 'cashier');
        localStorage.setItem('availableTenants', JSON.stringify(tenants));

        if (response.data.tenant?.slug) {
          console.log('AuthContext: Tenant slug found', response.data.tenant.slug);
          setTenantSlug(response.data.tenant.slug);
          localStorage.setItem('tenantSlug', response.data.tenant.slug);
        } else {
          console.warn('AuthContext: No tenant slug in response (likely superadmin)');
        }

        return { success: true, slug: response.data.tenant?.slug, user: userObj };
      }
      console.error('AuthContext: Invalid response structure', response.data);
      return { success: false, error: 'Invalid response from server' };
    } catch (error: any) {
      console.error('Login error:', error);
      return { success: false, error: error.response?.data?.message || 'Login failed. Please check your credentials.' };
    }
  };

  const logout = () => {
    setToken(null);
    setUser(null);
    setActiveRole(null);
    setTenantSlug(null);
    setAvailableTenants([]);
    localStorage.removeItem('jwt');
    localStorage.removeItem('tenantSlug');
    localStorage.removeItem('user');
    localStorage.removeItem('activeRole');
    localStorage.removeItem('availableTenants');
  };

  const hasPermission = (_module: string, _action: string): boolean => {
    if (activeRole === 'admin') return true;
    return true; // placeholder – extend as needed
  };

  const hasRole = (roles: string[]): boolean => {
    if (!activeRole) return false;
    // SuperAdmin bypass
    if (user?.roles?.includes('superadmin')) return true;
    return roles.includes(activeRole);
  };

  const switchRole = (role: string) => {
    if (user?.roles?.includes(role)) {
      setActiveRole(role);
      localStorage.setItem('activeRole', role);
      // Optional: Redirect to dashboard of that role?
    }
  };

  const switchTenant = async (slug: string) => {
    if (slug === tenantSlug) return;

    try {
      setIsLoading(true);
      const API_BASE = `${import.meta.env.VITE_API_URL || 'http://localhost:5006'}/api`;
      // Use the current token to authorize the switch
      const response = await axios.post(
        `${API_BASE}/auth/switch-tenant`,
        { targetTenantSlug: slug },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (response.data && response.data.token) {
        const newToken = response.data.token;
        const newUser = response.data.user || response.data; // adjust based on response structure
        // Ensure roles
        // Ensure roles
        const decoded = jwtDecode<JwtPayload>(newToken);
        // Spread decoded first so objects from newUser (like tenant) override the string IDs in token
        const userObj = { ...decoded, ...newUser };

        // Explicitly re-attach tenant object if present in response
        if (newUser.tenant && typeof newUser.tenant === 'object') {
          userObj.tenant = newUser.tenant;
        }

        if (!userObj.roles && userObj.role) {
          userObj.roles = [userObj.role];
        } else if (!userObj.roles) {
          userObj.roles = ['cashier'];
        }

        // Update State
        setToken(newToken);
        setUser(userObj);
        setTenantSlug(slug);

        // Update LocalStorage
        localStorage.setItem('jwt', newToken);
        localStorage.setItem('user', JSON.stringify(userObj));
        localStorage.setItem('tenantSlug', slug);
        localStorage.setItem('activeRole', userObj.roles[0] || 'cashier');

        // Update Available Tenants if provided
        if (response.data.availableTenants) {
          setAvailableTenants(response.data.availableTenants);
          localStorage.setItem('availableTenants', JSON.stringify(response.data.availableTenants));
        }

        // Reload to ensure fresh start in new context
        window.location.href = `/${slug}/dashboard`;
      }
    } catch (error) {
      console.error('Failed to switch tenant', error);
      alert('Failed to switch restaurant. Please try again.');
      setIsLoading(false);
    }
  };

  const getUserFullName = () => {
    if (!user) return '';
    if (user.name) return user.name;
    if (user.firstName && user.lastName) return `${user.firstName} ${user.lastName}`;
    return user.sub?.slice(0, 8) || '';
  };

  const updateUserData = (data: Partial<JwtPayload>) => {
    if (!user) return;
    const updatedUser = { ...user, ...data };
    setUser(updatedUser);
    localStorage.setItem('user', JSON.stringify(updatedUser));
  };

  // Load persisted token on mount if not using initialUser
  useEffect(() => {
    if (initialUser) {
      setIsLoading(false);
      return;
    }
    const stored = localStorage.getItem('jwt');
    const storedSlug = localStorage.getItem('tenantSlug');
    const storedUser = localStorage.getItem('user');
    const storedActiveRole = localStorage.getItem('activeRole');
    const storedAvailableTenants = localStorage.getItem('availableTenants');

    if (stored) {
      try {
        setToken(stored);

        let u: any = null;
        if (storedUser) {
          u = JSON.parse(storedUser);
        } else {
          u = jwtDecode<JwtPayload>(stored);
        }

        if (u) {
          setUser(u);
          // Construct roles
          const roles = u.roles || (u.role ? [u.role] : ['cashier']);
          if (storedActiveRole && roles.includes(storedActiveRole)) {
            setActiveRole(storedActiveRole);
          } else {
            setActiveRole(roles[0]);
          }

          // Rehydrate tenant slug
          if (storedSlug) {
            setTenantSlug(storedSlug);
          } else if (u.tenantSlug) {
            setTenantSlug(u.tenantSlug);
            localStorage.setItem('tenantSlug', u.tenantSlug);
          } else if (typeof u.tenant === 'string') {
            // Try to use ID as slug if nothing else (fallback, likely wrong but better than null)
            // But backend usually sends object or ID. 
          }
        }

        if (storedAvailableTenants) {
          try {
            setAvailableTenants(JSON.parse(storedAvailableTenants));
          } catch (e) { console.error('Error parsing available tenants', e); }
        }
      } catch (err) {
        console.error('Failed to decode stored JWT:', err);
        localStorage.removeItem('jwt');
        localStorage.removeItem('tenantSlug');
        localStorage.removeItem('user');
      }
    }
    setIsLoading(false);
  }, [initialUser]);

  return (
    <AuthContext.Provider
      value={{
        token, user, activeRole, availableTenants,
        login, logout, isLoading, hasPermission, hasRole,
        switchRole, switchTenant, tenantSlug, getUserFullName,
        isAuthenticated: !!token, updateUserData
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
};

import React, { createContext, useContext, useState, useEffect } from 'react';
import { jwtDecode } from 'jwt-decode';
import api from '../services/api';
import { getTenantUrl } from '../utils/tenant.utils';
import { toast } from 'react-hot-toast';

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

  permissions?: Array<{ module: string; actions: string[] }>;
  isRootAdmin?: boolean;

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
  fullName?: string;
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
  token?: string;
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
  refreshProfile: () => Promise<void>;
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
      const response = await api.post('/auth/login', credentials);
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

        return { success: true, slug: response.data.tenant?.slug, user: userObj, token: jwt };
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

  // Mirrors TenantPermissionsGuard on the backend so the UI can disable actions the
  // server would reject. The guard stays the source of truth; this only avoids
  // offering a control that is guaranteed to 403.
  const hasPermission = (module: string, action: string): boolean => {
    if (!activeRole) return false;
    if (user?.isRootAdmin) return true;
    if (activeRole === 'superadmin' || user?.roles?.includes('superadmin')) return true;

    const perm = user?.permissions?.find(p => p.module === module);

    // An admin with no explicit permissions keeps full access, matching the guard's
    // opt-in model; one with a permissions array is restricted by it.
    if (activeRole === 'admin' && !user?.permissions?.length) return true;

    if (!perm) return false;
    return perm.actions.includes(action) || perm.actions.includes('full');
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
      const response = await api.post(
        '/auth/switch-tenant',
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

        // Reload to ensure fresh start in new context with correct subdomain and token handover
        window.location.href = getTenantUrl(slug, '/dashboard', newToken);
      }
    } catch (error: any) {
      console.error('Failed to switch tenant', error);
      const message = error.response?.data?.message || 'Failed to switch restaurant. Please try again.';
      toast.error(message);
      setIsLoading(false);
    }
  };

  const getUserFullName = () => {
    if (!user) return '';
    if (user.fullName) return user.fullName;
    if (user.name) return user.name;
    if (user.firstName) return `${user.firstName} ${user.lastName || ''}`.trim();
    if (user.email) return user.email.split('@')[0];
    if (user.sub) {
      return String(user.sub).slice(0, 8);
    }
    return 'User';
  };

  const updateUserData = (data: Partial<JwtPayload>) => {
    if (!user) return;
    const updatedUser = { ...user, ...data };
    setUser(updatedUser);
    localStorage.setItem('user', JSON.stringify(updatedUser));
  };

  const refreshProfile = async () => {
    try {
      const { authAPI } = await import('../services/api');
      const response = await authAPI.getProfile();
      const userData = response.data;
      
      setUser(userData);
      localStorage.setItem('user', JSON.stringify(userData));
      console.log('AuthContext: Profile refreshed');
    } catch (err) {
      console.error('AuthContext: refreshProfile failed', err);
    }
  };

  // Load persisted token on mount if not using initialUser
  useEffect(() => {
    if (initialUser) {
      setIsLoading(false);
      return;
    }
    // Check for token in URL (for cross-subdomain session handover).
    // Excluded here: routes that use their own `?token=` for an unrelated
    // purpose (e.g. /reset-password's password-reset token is not a JWT).
    const params = new URLSearchParams(window.location.search);
    const isForeignTokenRoute = window.location.pathname.startsWith('/reset-password');
    const urlToken = isForeignTokenRoute ? null : params.get('token');

    if (urlToken) {
      console.log('AuthContext: Found token in URL, initiating handover...');
      localStorage.setItem('jwt', urlToken);
      // Clean up URL instantly
      params.delete('token');
      const cleanUrl = window.location.pathname + (params.toString() ? `?${params.toString()}` : '') + window.location.hash;
      window.history.replaceState({}, '', cleanUrl);
    }

    const stored = urlToken || localStorage.getItem('jwt');
    const storedSlug = localStorage.getItem('tenantSlug');
    const storedUser = localStorage.getItem('user');
    const storedActiveRole = localStorage.getItem('activeRole');
    const storedAvailableTenants = localStorage.getItem('availableTenants');

    if (stored) {
      try {
        setToken(stored);

        let u: any = null;
        if (urlToken) {
          u = jwtDecode<JwtPayload>(stored);
          console.log('AuthContext: Decoded fresh user from urlToken during handover', u.email);
        } else if (storedUser) {
          u = JSON.parse(storedUser);
        } else {
          u = jwtDecode<JwtPayload>(stored);
        }

        if (u) {
          console.log('AuthContext: Successfully rehydrated user:', u.email, 'Tenant:', u.tenantSlug);
          setUser(u);
          
          // Save back to localStorage if it was missing (e.g. during subdomain handover)
          if (!storedUser || urlToken) {
            localStorage.setItem('user', JSON.stringify(u));
          }

          // Construct roles
          const roles = u.roles || (u.role ? [u.role] : ['cashier']);
          const targetRole = (storedActiveRole && roles.includes(storedActiveRole)) ? storedActiveRole : roles[0];
          setActiveRole(targetRole);
          if (!storedActiveRole || urlToken) {
            localStorage.setItem('activeRole', targetRole);
          }

          // Rehydrate tenant slug
          if (storedSlug) {
            setTenantSlug(storedSlug);
          } else if (u.tenantSlug) {
            setTenantSlug(u.tenantSlug);
            localStorage.setItem('tenantSlug', u.tenantSlug);
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
      
      // Attempt to refresh profile to get full user data (savedAddresses, etc.)
      refreshProfile();
    }
    setIsLoading(false);
  }, [initialUser]);

  return (
    <AuthContext.Provider
      value={{
        token, user, activeRole, availableTenants,
        login, logout, isLoading, hasPermission, hasRole,
        switchRole, switchTenant, tenantSlug, getUserFullName,
        isAuthenticated: !!token, updateUserData, refreshProfile
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

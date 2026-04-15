import { useParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getTenantSlugFromHostname } from '../utils/tenant.utils';

/**
 * Hook to retrieve the active tenant slug from various sources.
 * Priority: 
 * 1. Subdomain (e.g., mythri.localhost)
 * 2. URL Path Parameter (e.g., /mythri/dashboard)
 * 3. Auth Context (logged in user's tenant)
 */
export const useActiveTenant = () => {
  const { slug: pathSlug } = useParams<{ slug: string }>();
  const { tenantSlug: authSlug } = useAuth();
  const hostnameSlug = getTenantSlugFromHostname();

  const slug = hostnameSlug || pathSlug || authSlug || null;
  const isSubdomain = !!hostnameSlug;

  /**
   * Generates a relative path for navigation.
   * If accessing via subdomain, it returns the path as-is (e.g., /menu).
   * If accessing via path, it prepends the slug (e.g., /mythri/menu).
   */
  const getRelativePath = (path: string) => {
    const cleanPath = path.startsWith('/') ? path : `/${path}`;
    if (isSubdomain || !slug) {
      return cleanPath;
    }
    return `/${slug}${cleanPath}`;
  };

  return {
    slug,
    isSubdomain,
    getRelativePath
  };
};

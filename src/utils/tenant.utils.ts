/**
 * Extracts the tenant slug from the current window hostname.
 * Supports:
 * - slug.domain.com
 * - slug.localhost:port
 * - domain.com (returns null)
 */
export const getTenantSlugFromHostname = (): string | null => {
  const hostname = window.location.hostname;
  
  // Ignore IP addresses
  if (/^(?:\d{1,3}\.){3}\d{1,3}$/.test(hostname)) {
    return null;
  }

  // Handle localhost (e.g., tenant1.localhost)
  if (hostname.includes('localhost')) {
    const parts = hostname.split('.');
    if (parts.length > 1 && parts[parts.length - 1] === 'localhost') {
        // tenant.localhost
        return parts[0];
    }
    return null;
  }

  const parts = hostname.split('.');
  
  // Basic logic: if we have more than 2 parts, the first one is the subdomain
  // e.g., burger-king.nexzenpos.com -> burger-king
  const ignoredSubdomains = ['www', 'app', 'dev', 'staging', 'admin'];
  
  if (parts.length >= 3) {
    const subdomain = parts[0];
    if (ignoredSubdomains.includes(subdomain.toLowerCase())) {
        if (parts.length >= 4) {
            return parts[1];
        }
        return null;
    }
    return subdomain;
  }

  return null;
};

/**
 * Returns true if the application is being accessed via a tenant-specific subdomain.
 */
export const isSubdomainAccess = (): boolean => {
  return getTenantSlugFromHostname() !== null;
};

/**
 * Generates the correct URL for a tenant, prioritizing subdomains.
 * e.g. getTenantUrl('mythri', '/dashboard') -> http://mythri.localhost:3000/dashboard
 * @param slug The tenant slug
 * @param path The target path (optional)
 * @param token An authentication token to pass during redirection (optional, for session handover)
 */
export const getTenantUrl = (slug: string, path: string = '', token?: string): string => {
  const { hostname, host, protocol, origin } = window.location;
  
  // Clean path to ensure it starts with /
  let cleanPath = path.startsWith('/') ? path : `/${path}`;

  // Append token if provided for cross-domain session handover
  if (token) {
    const separator = cleanPath.includes('?') ? '&' : '?';
    cleanPath = `${cleanPath}${separator}token=${token}`;
  }

  // If accessed by IP, subdomains won't work - use path-based routing
  if (/^(?:\d{1,3}\.){3}\d{1,3}$/.test(hostname)) {
    return `${origin}/${slug}${cleanPath}`;
  }

  // Handle localhost
  if (hostname.includes('localhost')) {
    const parts = hostname.split('.');
    let baseHost = host;
    if (parts.length > 1 && parts[parts.length - 1] === 'localhost') {
        // Strip existing subdomain (e.g. tenant.localhost:3000 -> localhost:3000)
        baseHost = host.substring(parts[0].length + 1);
    }
    return `${protocol}//${slug}.${baseHost}${cleanPath}`;
  }

  // Handle production domains
  const parts = hostname.split('.');
  const currentSlug = getTenantSlugFromHostname();
  
  let baseParts = parts;
  if (currentSlug && hostname.startsWith(`${currentSlug}.`)) {
    baseParts = parts.slice(1);
  }
  
  // Strip www if present to avoid mythri.www.domain.com
  if (baseParts[0] === 'www') {
    baseParts = baseParts.slice(1);
  }

  const baseHost = baseParts.join('.') + (window.location.port ? `:${window.location.port}` : '');
  return `${protocol}//${slug}.${baseHost}${cleanPath}`;
};

import { Capacitor } from '@capacitor/core';

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
  
  // Basic logic: skip all ignored system subdomains from the start
  // e.g., test.restaurant.nexzenpos.com -> skips test and restaurant
  const ignoredSubdomains = ['www', 'app', 'dev', 'staging', 'admin', 'test', 'restaurant'];
  
  // We need at least the base domain (2 parts e.g. nexzenpos.com) 
  // plus the subdomain we are looking for (total 3+)
  if (parts.length < 3) return null;

  // Search for the first part that is not an ignored system subdomain
  for (let i = 0; i < parts.length - 2; i++) {
    const part = parts[i]?.toLowerCase();
    if (!ignoredSubdomains.includes(part)) {
      return parts[i];
    }
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
 * @param token An authentication token to hand off during redirection (optional).
 *              The token is stored in a parent-domain cookie (never placed in the
 *              URL) so it stays out of the address bar, history, and server logs.
 */
export const getTenantUrl = (slug: string, path: string = '', token?: string): string => {
  const { hostname, host, protocol, origin } = window.location;

  // Clean path to ensure it starts with /
  let cleanPath = path.startsWith('/') ? path : `/${path}`;

  // NOTE: token handoff is handled by redirectToTenant() via a one-time server
  // code (?h=...), so the JWT is never placed in the URL. `token` is accepted
  // here only for backward-compatibility and is intentionally ignored.
  void token;

  // Capacitor / native WebView serves the app from https://localhost (or similar).
  // Subdomains like sample.localhost often fail or change origin — stay on same origin with path routing.
  if (Capacitor.isNativePlatform()) {
    return `${origin}/${slug}${cleanPath}`;
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
  const ignoredSubdomains = ['www', 'app', 'dev', 'staging', 'admin', 'test', 'restaurant'];
  
  let baseParts = parts;
  
  // Find where the slug is in the hostname and remove it to get the base domain
  for (let i = 0; i < parts.length - 2; i++) {
    const part = parts[i]?.toLowerCase();
    if (!ignoredSubdomains.includes(part)) {
      // This part is the tenant slug - remove it to get the system base host
      baseParts = parts.slice(0, i).concat(parts.slice(i + 1));
      break;
    }
  }
  
  // Also strip www if it's the very first part (safety check)
  if (baseParts[0] === 'www') {
    baseParts = baseParts.slice(1);
  }

  const baseHost = baseParts.join('.') + (window.location.port ? `:${window.location.port}` : '');
  return `${protocol}//${slug}.${baseHost}${cleanPath}`;
};

/**
 * Redirects to a tenant subdomain, transferring the session WITHOUT ever putting
 * the JWT in the URL. It asks the backend for a one-time handoff code (authorized
 * by `token`) and navigates with only `?h=<code>`; the destination exchanges the
 * code for the token before rendering (see main.tsx). If code creation fails, it
 * still redirects (the destination may already have a local session).
 */
export const redirectToTenant = async (
  slug: string,
  path: string = '',
  token?: string,
): Promise<void> => {
  let target = getTenantUrl(slug, path);
  if (token) {
    try {
      const { authAPI } = await import('../services/api');
      const res = await authAPI.createHandoff({ headers: { Authorization: `Bearer ${token}` } });
      const code = res?.data?.code;
      if (code) {
        const sep = target.includes('?') ? '&' : '?';
        target = `${target}${sep}h=${encodeURIComponent(code)}`;
      }
    } catch (e) {
      console.error('Failed to create handoff code; redirecting without it', e);
    }
  }
  window.location.href = target;
};

import { Capacitor } from '@capacitor/core';

/**
 * The platform's base domain, e.g. "suthraone.com". Every tenant is served from
 * <slug>.<BASE_DOMAIN>, so this is the single source of truth for splitting a
 * hostname into "tenant" and "platform" — no guessing from part counts and no
 * ignore-list of system subdomain names (a tenant legitimately named "app" or
 * "restaurant" used to be silently unresolvable).
 *
 * Set VITE_BASE_DOMAIN per environment. Falls back to suthraone.com so an
 * unconfigured build still behaves correctly in production.
 */
export const BASE_DOMAIN = (
  ((import.meta as any).env?.VITE_BASE_DOMAIN as string) || 'suthraone.com'
)
  .trim()
  .replace(/^https?:\/\//, '')
  .replace(/:\d+$/, '')
  .replace(/^\.+|\.+$/g, '')
  .toLowerCase();

/**
 * Hosts that serve the platform itself rather than any tenant, beyond the apex
 * and www. Set VITE_RESERVED_SUBDOMAINS to a comma-separated list of labels
 * (e.g. "restaurant,restaurents,help,helpguide") for marketing/relay/support
 * hosts that live on the base domain and must never be read as a tenant slug.
 *
 * Keep this list minimal: every label here is a slug no tenant can ever use.
 */
const RESERVED_SUBDOMAINS = new Set(
  (((import.meta as any).env?.VITE_RESERVED_SUBDOMAINS as string) || '')
    .split(',')
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean),
);

/** Hosts that serve the platform itself rather than any tenant. */
const isPlatformHost = (host: string): boolean =>
  host === BASE_DOMAIN || host === `www.${BASE_DOMAIN}`;

/** Legacy platform domains kept for backward-compatible tenant resolution. */
const LEGACY_BASE_DOMAINS = ['nexzenpos.com'];

/**
 * Extracts the tenant slug from the current window hostname.
 * Supports:
 * - slug.suthraone.com  -> "slug"
 * - slug.localhost:port -> "slug"
 * - suthraone.com       -> null (platform host)
 * - www.suthraone.com   -> null (platform host)
 *
 * Multi-label prefixes (a.b.suthraone.com) return the left-most label, so a
 * staging host like mythri.staging.suthraone.com still resolves to "mythri"
 * when VITE_BASE_DOMAIN is set to staging.suthraone.com.
 */
export const getTenantSlugFromHostname = (): string | null => {
  const hostname = window.location.hostname.toLowerCase();

  // Ignore IP addresses — subdomains are not addressable there.
  if (/^(?:\d{1,3}\.){3}\d{1,3}$/.test(hostname)) {
    return null;
  }

  // Handle localhost (e.g. mythri.localhost)
  if (hostname === 'localhost') return null;
  if (hostname.endsWith('.localhost')) {
    const prefix = hostname.slice(0, -'.localhost'.length);
    return prefix.split('.').filter(Boolean)[0] || null;
  }

  if (isPlatformHost(hostname)) return null;

  if (hostname.endsWith(`.${BASE_DOMAIN}`)) {
    const prefix = hostname.slice(0, -(BASE_DOMAIN.length + 1));
    const labels = prefix.split('.').filter(Boolean);
    // Left-most label is the tenant; ignore a leading www. (www.mythri.…)
    const slug = labels[0] === 'www' ? labels[1] : labels[0];
    if (!slug) return null;
    // A reserved platform host (help, the OAuth relay, marketing) is not a tenant.
    if (RESERVED_SUBDOMAINS.has(slug)) return null;
    return slug;
  }

  for (const legacyDomain of LEGACY_BASE_DOMAINS) {
    if (hostname.endsWith(`.${legacyDomain}`)) {
      const prefix = hostname.slice(0, -(legacyDomain.length + 1));
      const labels = prefix.split('.').filter(Boolean);
      const slug = labels[0] === 'www' ? labels[1] : labels[0];
      if (!slug || RESERVED_SUBDOMAINS.has(slug)) return null;
      return slug;
    }
  }

  // An unrecognised host (custom domain, preview URL) has no resolvable tenant
  // subdomain; callers fall back to path-based routing.
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
  const { hostname, protocol, origin, port } = window.location;

  // Clean path to ensure it starts with /
  const cleanPath = path.startsWith('/') ? path : `/${path}`;

  // NOTE: token handoff is handled by redirectToTenant() via a one-time server
  // code (?h=...), so the JWT is never placed in the URL. `token` is accepted
  // here only for backward-compatibility and is intentionally ignored.
  void token;

  const portSuffix = port ? `:${port}` : '';

  // Capacitor / native WebView serves the app from https://localhost, where a
  // subdomain would change origin and lose localStorage. Path routing is the
  // only thing that works here — not a fallback we can remove.
  if (Capacitor.isNativePlatform()) {
    return `${origin}/${slug}${cleanPath}`;
  }

  // Accessed by raw IP: subdomains are not addressable, so path routing again.
  if (/^(?:\d{1,3}\.){3}\d{1,3}$/.test(hostname)) {
    return `${origin}/${slug}${cleanPath}`;
  }

  // Local dev: always <slug>.localhost, mirroring production's shape.
  if (hostname === 'localhost' || hostname.endsWith('.localhost')) {
    return `${protocol}//${slug}.localhost${portSuffix}${cleanPath}`;
  }

  // Everything else (the platform host, a tenant host, or an unrecognised host)
  // resolves to <slug>.<BASE_DOMAIN>. This is the single intended shape on the
  // web, so it is produced unconditionally rather than being conditional on the
  // host we happen to be standing on.
  return `${protocol}//${slug}.${BASE_DOMAIN}${portSuffix}${cleanPath}`;
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

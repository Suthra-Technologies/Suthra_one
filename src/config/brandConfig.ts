// =====================================================================
// BRAND CONFIG — Auto-updated by renamer.cjs during build time.
// DO NOT edit manually if you are running a brand-specific build.
// For development (npm start), this file reflects the "default" brand.
// =====================================================================
export const BRAND_CONFIG = {
  appName: "Nexzen Restaurant POS",
  appId: "com.nexzen.pos",
  primaryColor: "#4F46E5",
  secondaryColor: "#EC4899",
  accentColor: "#10B981",
  apiBaseUrl: import.meta.env.VITE_API_URL || "http://localhost:5006",
  tenantSlug: import.meta.env.VITE_TENANT_SLUG || "default",
  stripePublicKey: import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY || "",
  fontFamily: "Inter",
  splashBg: "#0f172a",
} as const;

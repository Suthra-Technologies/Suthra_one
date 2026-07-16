// =====================================================================
// BRAND CONFIG — Auto-updated by renamer.cjs during build time.
// DO NOT edit manually if you are running a brand-specific build.
// =====================================================================
export const BRAND_CONFIG = {
  appName: "NexZen POS",
  appId: "com.nexzen.pos",
  primaryColor: "#4F46E5",
  secondaryColor: "#EC4899",
  accentColor: "#10B981",
  apiBaseUrl: import.meta.env.VITE_API_URL || "http://localhost:5006",
  tenantSlug: "nexzen",
  stripePublicKey: "pk_test_andhraspicefeast",
  fontFamily: "Inter",
  splashBg: "#0f172a",
} as const;

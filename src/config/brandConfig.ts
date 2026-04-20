// =====================================================================
// BRAND CONFIG — Auto-updated by renamer.cjs during build time.
// DO NOT edit manually if you are running a brand-specific build.
// =====================================================================
// export const BRAND_CONFIG = {
//   appName: "mythri restaurant POS",
//   appId: "com.mythri.pos",
//   primaryColor: "#9C27B0",
//   secondaryColor: "#E91E63",
//   accentColor: "#FF9800",
//   apiBaseUrl: "https://nexzenpos.com",
//   tenantSlug: "mythri",
//   stripePublicKey: "pk_test_andhraspicefeast",
//   fontFamily: "Inter",
//   splashBg: "#1a0027",
// } as const;


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

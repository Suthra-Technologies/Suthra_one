/**
 * BrandContext.tsx — Runtime White-Label Branding
 * ================================================
 * This context provides dynamic branding for the multi-tenant SaaS model.
 * On startup it fetches branding data from the backend (/tenants/:slug/branding)
 * and applies the colors as CSS variables to :root, so every component that
 * uses --brand-primary etc. updates automatically.
 *
 * For build-time APK branding (one binary per client), see:
 *   - /brands/<clientname>/config.json
 *   - /renamer.cjs
 *   - /src/config/brandConfig.ts
 */
import React, { createContext, useContext, useEffect, useState } from 'react';
import { tenantAPI } from '../services/api';
import { BRAND_CONFIG } from '../config/brandConfig';

// ── Types ──────────────────────────────────────────────────────────────────

export interface BrandingData {
  appName: string;
  primaryColor: string;
  secondaryColor: string;
  accentColor?: string;
  logo?: string;
  splashBg?: string;
  fontFamily?: string;
}

interface BrandContextType {
  branding: BrandingData;
  brandLoaded: boolean;
  applyBranding: (data: Partial<BrandingData>) => void;
}

// ── Default Branding (from build-time brand config) ────────────────────────

const defaultBranding: BrandingData = {
  appName: BRAND_CONFIG.appName,
  primaryColor: BRAND_CONFIG.primaryColor,
  secondaryColor: BRAND_CONFIG.secondaryColor,
  accentColor: BRAND_CONFIG.accentColor,
  splashBg: BRAND_CONFIG.splashBg,
  fontFamily: BRAND_CONFIG.fontFamily,
};

// ── Context ────────────────────────────────────────────────────────────────

const BrandContext = createContext<BrandContextType>({
  branding: defaultBranding,
  brandLoaded: false,
  applyBranding: () => {},
});

export const useBrand = () => useContext(BrandContext);

// ── Helper: Apply brand CSS variables to :root ────────────────────────────

function applyCSSVariables(data: BrandingData) {
  const root = document.documentElement;
  if (data.primaryColor)   root.style.setProperty('--brand-primary', data.primaryColor);
  if (data.secondaryColor) root.style.setProperty('--brand-secondary', data.secondaryColor);
  if (data.accentColor)    root.style.setProperty('--brand-accent', data.accentColor);
  if (data.splashBg)       root.style.setProperty('--brand-splash-bg', data.splashBg);
  if (data.appName)        root.style.setProperty('--brand-name', `"${data.appName}"`);
  if (data.fontFamily)     root.style.setProperty('--brand-font', `"${data.fontFamily}"`);
}

// ── Provider ───────────────────────────────────────────────────────────────

interface BrandProviderProps {
  children: React.ReactNode;
  /** Tenant slug to fetch branding for. If omitted, falls back to build-time BRAND_CONFIG */
  tenantSlug?: string;
}

export const BrandProvider: React.FC<BrandProviderProps> = ({ children, tenantSlug }) => {
  const [branding, setBranding] = useState<BrandingData>(defaultBranding);
  const [brandLoaded, setBrandLoaded] = useState(false);

  // Always apply the build-time brand immediately so there is no Flash Of Unstyled Content
  useEffect(() => {
    applyCSSVariables(defaultBranding);
  }, []);

  // Fetch runtime branding from the backend when a tenant slug is available
  useEffect(() => {
    const slug = tenantSlug || BRAND_CONFIG.tenantSlug;
    if (!slug || slug === 'default') {
      setBrandLoaded(true);
      return;
    }

    const fetchBranding = async () => {
      try {
        const { data } = await tenantAPI.getBranding(slug);

        if (data) {
          // Merge with defaults — server values take precedence
          const merged: BrandingData = {
            ...defaultBranding,
            ...data,
          };
          setBranding(merged);
          applyCSSVariables(merged);
        }
      } catch (error) {
        // Non-fatal: fall back to build-time brand config
        console.warn('[BrandContext] Could not fetch runtime branding, using build-time defaults:', error);
      } finally {
        setBrandLoaded(true);
      }
    };

    fetchBranding();
  }, [tenantSlug]);

  const applyBranding = (data: Partial<BrandingData>) => {
    setBranding(prev => {
      const next = { ...prev, ...data };
      applyCSSVariables(next);
      return next;
    });
  };

  return (
    <BrandContext.Provider value={{ branding, brandLoaded, applyBranding }}>
      {children}
    </BrandContext.Provider>
  );
};

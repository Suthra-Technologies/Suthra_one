/**
 * Where a user should land after login / role switch.
 *
 * Not every role has Dashboard (accountant never did, and a plan may not
 * include the `dashboard` feature at all), so redirecting everyone there sent
 * some users straight to /unauthorized. This resolves the first page the user
 * can actually open, using the same role + plan-feature rules the sidebar uses
 * to decide which links to show.
 *
 * Subscription gating is unchanged: a page the plan does not include is still
 * skipped here exactly as it is hidden in the sidebar.
 */

/**
 * Candidate landing pages in sidebar order — the first one a user can open
 * becomes their home. Mirrors the role lists in Sidebar.tsx; keep in sync when
 * a nav entry's roles or feature change.
 *
 * Detail-only and account pages (profile, settings, subscription) are omitted:
 * they are reachable but make a poor landing page. `/profile` is the final
 * fallback below since every signed-in role has it.
 */
export type LandingCandidate = {
    path: string;
    roles: string[];
    feature?: string;
};

export const LANDING_CANDIDATES: LandingCandidate[] = [
    // MAIN
    { path: '/dashboard', roles: ['admin', 'manager', 'cashier'], feature: 'dashboard' },
    // OPERATIONS
    { path: '/orders', roles: ['admin', 'manager', 'waiter', 'cashier', 'delivery', 'food_runner'], feature: 'orders' },
    { path: '/delivery-history', roles: ['delivery'] },
    { path: '/pos', roles: ['admin', 'manager', 'waiter', 'cashier'], feature: 'pos' },
    { path: '/tables', roles: ['admin', 'manager', 'cashier'], feature: 'tables' },
    { path: '/bookings', roles: ['admin', 'manager', 'waiter'], feature: 'bookings' },
    { path: '/kot', roles: ['admin', 'manager', 'kitchen_staff'], feature: 'kitchen' },
    { path: '/kitchen', roles: ['admin', 'manager', 'kitchen_staff'], feature: 'kitchen' },
    // ANALYTICS — accountant's traditional home, kept ahead of MANAGEMENT.
    { path: '/reports', roles: ['admin', 'manager', 'accountant'], feature: 'reports' },
    // MANAGEMENT
    { path: '/expenses', roles: ['admin', 'manager', 'accountant'], feature: 'expenses' },
    { path: '/payroll', roles: ['admin', 'manager', 'accountant'], feature: 'payroll' },
    { path: '/attendance', roles: ['admin', 'manager', 'accountant'], feature: 'attendance' },
    { path: '/assets', roles: ['admin', 'manager', 'accountant', 'superadmin'], feature: 'assets' },
    { path: '/disputes', roles: ['admin', 'manager', 'accountant'], feature: 'disputes' },
    { path: '/menu', roles: ['admin', 'manager'], feature: 'menu' },
    { path: '/inventory', roles: ['admin', 'manager'], feature: 'inventory' },
    { path: '/users', roles: ['admin', 'manager'], feature: 'users' },
    { path: '/customers', roles: ['admin', 'manager'], feature: 'customers' },
    // CUSTOMER
    { path: '/customer/order', roles: ['customer'] },
];

/**
 * Legacy plans stored a single bundled "core" feature. Mirrors the list in
 * Sidebar.tsx so a legacy plan keeps unlocking the same pages.
 */
const CORE_FEATURES = [
    'dashboard', 'orders', 'pos', 'tables', 'bookings', 'kitchen', 'menu', 'globaladdons',
    'promocoupons', 'disputes', 'purchaseorders', 'vendors', 'materialproviders', 'recipes',
    'users', 'customers', 'assets', 'expenses', 'customisescreens', 'reports', 'serviceusage',
    'customeractivities', 'invoices', 'auditlogs', 'subscription', 'support', 'customersupport',
    'settings', 'managenotifications',
];

/** Every signed-in role can open Profile, so it is the last resort. */
export const FALLBACK_LANDING_PATH = '/profile';

/**
 * Single source of truth for plan gating — RequireFeature (route guard), the
 * Sidebar (which links to show) and the landing resolver must agree, or a user
 * sees a link they cannot open, or lands on a page that bounces them.
 *
 * A plan with an empty feature list predates feature gating entirely (no plan
 * is deliberately created with zero features), so it is treated like the legacy
 * bundled 'core' plan rather than "nothing is allowed".
 */
export const hasPlanFeature = (
    feature: string | undefined,
    planFeatures: string[],
    opts: { isSuperAdmin?: boolean; isCustomer?: boolean } = {},
): boolean => {
    if (!feature) return true;
    if (opts.isSuperAdmin) return true;
    if (opts.isCustomer) return true;
    if (planFeatures.includes(feature)) return true;
    const isLegacyPlan = planFeatures.length === 0;
    return (planFeatures.includes('core') || isLegacyPlan) && CORE_FEATURES.includes(feature);
};

/**
 * First page `role` can open under `planFeatures`. Falls back to /profile so
 * this never returns a path the user would be bounced out of.
 */
export const resolveLandingPath = (
    role: string | null | undefined,
    planFeatures: string[] = [],
): string => {
    if (!role) return FALLBACK_LANDING_PATH;

    const isSuperAdmin = role === 'superadmin';
    const isCustomer = role === 'customer';

    const match = LANDING_CANDIDATES.find((item) => {
        const roleMatch = isSuperAdmin || item.roles.includes(role);
        if (!roleMatch) return false;
        return hasPlanFeature(item.feature, planFeatures, { isSuperAdmin, isCustomer });
    });

    return match?.path || FALLBACK_LANDING_PATH;
};

/** Plan features off the user object, wherever the tenant config is attached. */
export const planFeaturesOf = (user: any): string[] =>
    user?.tenant?.currentPlan?.features || [];

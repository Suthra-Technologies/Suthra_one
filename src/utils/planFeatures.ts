// Shared plan-feature label map and inheritance-split helper, used anywhere a
// subscription plan's `features` array (module keys) needs to be shown to a user —
// keep in sync with MODULES in fe/src/pages/superadmin/PlansPage.tsx.
export const PLAN_FEATURE_LABELS: Record<string, string> = {
    dashboard: 'Dashboard', orders: 'Orders', pos: 'Point of Sale', tables: 'Tables',
    bookings: 'Bookings', kitchen: 'Kitchen (Display & Orders)', menu: 'Menu',
    globaladdons: 'Global Add-ons', promocoupons: 'Promo Code & Coupons', disputes: 'Disputes',
    catering: 'Catering', inventory: 'Inventory', wastemanagement: 'Waste Management',
    purchaseorders: 'Purchase Orders', vendors: 'Vendors', materialproviders: 'Material Providers',
    recipes: 'Recipes', users: 'Users', customers: 'Customers', attendance: 'Attendance',
    assets: 'Asset & Document Management', expenses: 'Expenses', customisescreens: 'Customise Screens',
    reports: 'Reports', serviceusage: 'Service Usage', customeractivities: 'Customer Activities',
    invoices: 'Invoices', auditlogs: 'Audit Logs', subscription: 'Subscription',
    support: 'Super Admin Support', customersupport: 'Customer Tickets', settings: 'Settings',
    managenotifications: 'Manage Notifications', payroll: 'Employees & Payroll', helpguide: 'Help & Guide',
    core: 'Core Restaurant Operations',
};

export const planFeatureLabel = (key: string): string => PLAN_FEATURE_LABELS[key] || key;

export interface PlanWithFeatures {
    _id: string;
    name: string;
    features?: string[];
    baseplanId?: string | null;
}

/**
 * Splits a plan's features into "inherited from its base plan" and "extra on top of
 * that base", for the tiered "Everything in <Base>, plus:" pricing-card presentation.
 * Returns basePlan: null when the plan has no baseplanId or the referenced plan isn't
 * in the given list — callers should fall back to showing the flat feature list.
 * Generic so callers passing richer plan shapes (e.g. with maxUsers/maxTables) get
 * basePlan typed back with those same extra fields instead of narrowed to the minimal shape.
 */
export function splitPlanFeatures<T extends PlanWithFeatures>(plan: T, allPlans: T[]) {
    const basePlan = plan.baseplanId ? allPlans.find(p => p._id === plan.baseplanId) || null : null;
    const baseFeatureSet = new Set(basePlan?.features || []);
    const extra = basePlan
        ? (plan.features || []).filter(f => !baseFeatureSet.has(f))
        : (plan.features || []);
    return { basePlan, extra };
}

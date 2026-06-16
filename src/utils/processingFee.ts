// Platform processing fee + Stripe charge responsibility.
//
// Two cost components can be charged to the customer depending on the store's
// `system.feeResponsibility` setting:
//   - Platform fee: a repeating tier — `processingFee` ($) per `processingFeeOrderValue`
//     ($) slab of the order, rounded up. e.g. $2 per $50 → $0-50 = $2, $50-100 = $4, ...
//   - Stripe commission: 2.9% + $0.30 on the full amount the customer pays (no gross-up),
//     only on card/Stripe payments.
//
// feeResponsibility:
//   'customer' — customer pays platform fee + Stripe commission
//   'admin'    — restaurant pays both (customer charged neither)  [behaviour pending spec]
//   'split'    — customer pays platform fee, restaurant pays Stripe commission (default)
//
// Keep this in sync with the backend rule in orders.service.ts (createOrder).

export type FeeResponsibility = 'customer' | 'admin' | 'split';

export const STRIPE_PERCENT = 0.029;
export const STRIPE_FIXED = 0.3;

type RestaurantFeeSettings = {
    processingFee?: number;
    processingFeeOrderValue?: number;
} | null | undefined;

// Repeating-tier platform fee.
export const calcPlatformFee = (subtotal: number, restaurant?: RestaurantFeeSettings): number => {
    const feePerSlab = Number(restaurant?.processingFee) || 0;
    const slabSize = Number(restaurant?.processingFeeOrderValue) || 0;
    if (feePerSlab > 0 && slabSize > 0 && subtotal > 0) {
        const slabs = Math.ceil(subtotal / slabSize);
        return Number((slabs * feePerSlab).toFixed(2));
    }
    return 0;
};

// Stripe commission on a base amount (2.9% + $0.30), no gross-up.
export const calcStripeCommission = (base: number): number =>
    base > 0 ? Number((base * STRIPE_PERCENT + STRIPE_FIXED).toFixed(2)) : 0;

// Processing-fee amount charged to the customer (platform fee + any Stripe commission)
// for the given fee-responsibility setting.
// `otherCharges` = everything else the customer pays besides the subtotal and this fee
// (tax + delivery + tip + service − discounts). Used as part of the Stripe base.
export const calcCustomerProcessingFee = (params: {
    subtotal: number;
    otherCharges?: number;
    restaurant?: RestaurantFeeSettings;
    feeResponsibility?: FeeResponsibility;
    isStripePayment?: boolean;
}): { platformFee: number; stripeCommission: number; total: number } => {
    const feeResponsibility = params.feeResponsibility ?? 'split';

    // Restaurant pays both — the customer is charged neither fee.
    if (feeResponsibility === 'admin') {
        return { platformFee: 0, stripeCommission: 0, total: 0 };
    }

    const platformFee = calcPlatformFee(params.subtotal, params.restaurant);
    let stripeCommission = 0;
    if (feeResponsibility === 'customer' && params.isStripePayment) {
        const base = params.subtotal + (params.otherCharges ?? 0) + platformFee;
        stripeCommission = calcStripeCommission(base);
    }
    return {
        platformFee,
        stripeCommission,
        total: Number((platformFee + stripeCommission).toFixed(2)),
    };
};

// Back-compat alias: the platform fee only (used where Stripe responsibility isn't relevant).
export const calcProcessingFee = calcPlatformFee;

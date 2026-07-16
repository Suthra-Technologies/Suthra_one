/**
 * Platform processing fee, set per tenant by the superadmin.
 *
 * Slab model: `feePerSlab` ($) is charged per `slabSize` ($) of order subtotal,
 * rounded up — e.g. $1 per $50 → $0–50 = $1, $50.01–100 = $2, $100.01–150 = $3.
 *
 * Legacy percent model: when no slab size is configured (slabSize 0/undefined),
 * `feePerSlab` is interpreted as a percent of the subtotal instead.
 */
export function calcPlatformFee(subtotal: number, feePerSlab?: number, slabSize?: number): number {
    const fee = Number(feePerSlab) || 0;
    const slab = Number(slabSize) || 0;
    const base = Number(subtotal) || 0;
    if (base <= 0 || fee <= 0) return 0;
    if (slab > 0) {
        return Number((Math.ceil(base / slab) * fee).toFixed(2));
    }
    return Number(((base * fee) / 100).toFixed(2));
}

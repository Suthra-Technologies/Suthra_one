import {
    Add as AddIcon,
    ShoppingCart as CartIcon,
    CheckCircle as CheckIcon,
    LocalOffer as CouponIcon,
    Delete as DeleteIcon,
    Remove as RemoveIcon,
} from '@mui/icons-material';
import {
    Alert,
    Box,
    Button,
    Chip,
    CircularProgress,
    Divider,
    IconButton,
    InputAdornment,
    List,
    ListItem,
    ListItemText,
    Stack,
    TextField,
    Tooltip,
    Typography
} from '@mui/material';
import React from 'react';

interface OrderDetailsSectionProps {
    cart: any[];
    updateQuantity: (cartId: string, delta: number) => void;
    removeFromCart: (cartId: string) => void;
    formatSmartPrice: (price: number) => string;
    cartTotal: number;
    taxAmount: number;
    discountAmount: number;
    discountPercent: number;
    couponDiscount: number;
    couponCode: string;
    setCouponCode: (val: string) => void;
    handleValidateCoupon: (silent?: boolean, explicitCode?: string) => void;
    availableCoupons?: any[];
    serviceChargeAmount: number;
    tip: number;
    setTip: (val: number) => void;
    finalTotal: number;
    rewardDiscount?: number;
    placingOrder: boolean;
    isApplyingCoupon?: boolean;
    handlePlaceOrder: () => void;
}

const OrderDetailsSection: React.FC<OrderDetailsSectionProps> = ({
    cart,
    updateQuantity,
    removeFromCart,
    formatSmartPrice,
    cartTotal,
    taxAmount,
    discountAmount,
    discountPercent,
    couponDiscount,
    couponCode,
    setCouponCode,
    handleValidateCoupon,
    availableCoupons = [],
    serviceChargeAmount,
    tip,
    setTip,
    finalTotal,
    rewardDiscount = 0,
    placingOrder,
    isApplyingCoupon = false,
    handlePlaceOrder,
}) => {
    return (
        <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
            <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider' }}>
                <Typography variant="h6">Current Order</Typography>
            </Box>

            <List sx={{
                flexGrow: 1,
                overflowY: 'auto',
                pr: 1,
                '&::-webkit-scrollbar': { width: '4px' },
                '&::-webkit-scrollbar-track': { backgroundColor: 'rgba(0,0,0,0.02)' },
                '&::-webkit-scrollbar-thumb': { backgroundColor: 'rgba(0,0,0,0.1)', borderRadius: '10px' },
            }}>
                {cart.map((item) => (
                    <ListItem key={item.cartId || item._id} divider>
                        <ListItemText
                            primary={item.name}
                            secondary={
                                <>
                                    {formatSmartPrice(item.price)}
                                    {item.modifiers && (item?.modifiers || []).length > 0 && (
                                        <Typography variant="caption" display="block" color="text.secondary">
                                            {(item?.modifiers || []).map((m: any) => m.name).join(', ')}
                                        </Typography>
                                    )}
                                </>
                            }
                        />
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <IconButton size="small" onClick={() => updateQuantity(item.cartId, -1)}>
                                <RemoveIcon fontSize="small" />
                            </IconButton>
                            <Typography>{item.quantity}</Typography>
                            <IconButton size="small" onClick={() => updateQuantity(item.cartId, 1)}>
                                <AddIcon fontSize="small" />
                            </IconButton>
                            <IconButton size="small" color="error" onClick={() => removeFromCart(item.cartId)}>
                                <DeleteIcon fontSize="small" />
                            </IconButton>
                        </Box>
                    </ListItem>
                ))}
                {cart.length === 0 && (
                    <Box sx={{ p: 4, textAlign: 'center', height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                        <Box sx={{ mb: 2, position: 'relative', display: 'inline-block' }}>
                            <CartIcon sx={{ fontSize: 64, color: 'action.disabled', opacity: 0.2 }} />
                            <AddIcon sx={{ position: 'absolute', bottom: 0, right: 0, fontSize: 24, color: 'primary.main' }} />
                        </Box>
                        <Typography variant="h6" color="text.secondary" gutterBottom>
                            Your cart is empty
                        </Typography>
                        <Typography variant="body2" color="text.disabled" sx={{ px: 2 }}>
                            Add some delicious items from the menu to start your order.
                        </Typography>
                    </Box>
                )}
            </List>

            {/* Coupon Input */}
            <Box sx={{ px: 2, pt: 2, pb: 1, borderTop: 1, borderColor: 'divider' }}>
                <Stack direction="row" spacing={1}>
                    <TextField
                        size="small"
                        fullWidth
                        placeholder="Coupon code"
                        value={couponCode}
                        onChange={(e) => setCouponCode(e.target.value?.toUpperCase())}
                        onKeyDown={(e) => { if (e.key === 'Enter') handleValidateCoupon(false); }}
                        InputProps={{
                            startAdornment: (
                                <InputAdornment position="start">
                                    <CouponIcon fontSize="small" color={couponDiscount > 0 ? 'success' : 'action'} />
                                </InputAdornment>
                            ),
                        }}
                        sx={{
                            '& .MuiOutlinedInput-root': {
                                bgcolor: couponDiscount > 0 ? 'rgba(46,125,50,0.05)' : undefined,
                                '& fieldset': { borderColor: couponDiscount > 0 ? 'success.main' : undefined },
                            }
                        }}
                    />
                    <Button
                        variant={couponDiscount > 0 ? 'outlined' : 'contained'}
                        color={couponDiscount > 0 ? 'error' : 'primary'}
                        size="small"
                        disableElevation
                        sx={{ whiteSpace: 'nowrap', minWidth: 64 }}
                        onClick={() => {
                            if (couponDiscount > 0) {
                                setCouponCode('');
                                handleValidateCoupon(false, '');
                            } else {
                                handleValidateCoupon(false);
                            }
                        }}
                    >
                        {isApplyingCoupon ? 'Wait...' : (couponDiscount > 0 ? 'Remove' : 'Apply')}
                    </Button>
                </Stack>
                {isApplyingCoupon && <CircularProgress size={14} sx={{ mt: 1, ml: 1 }} />}

                {/* Quick-pick available coupons */}
                {availableCoupons.length > 0 && couponDiscount === 0 && (
                    <Box sx={{ mt: 1, display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                        {availableCoupons.slice(0, 5).map((c: any) => (
                            <Tooltip key={c._id} title={`${c.discountType === 'percentage' ? c.discountValue + '% off' : '$' + Number(c.discountValue || 0).toFixed(2) + ' off'}${c.minBillAmount ? ` (min $${Number(c.minBillAmount || 0).toFixed(2)})` : ''}`}>
                                <Chip
                                    label={c.code}
                                    size="small"
                                    variant="outlined"
                                    color="primary"
                                    icon={<CouponIcon />}
                                    onClick={() => {
                                        setCouponCode(c.code);
                                    }}
                                    sx={{ cursor: 'pointer', fontSize: '0.65rem' }}
                                />
                            </Tooltip>
                        ))}
                    </Box>
                )}
            </Box>

            <Box sx={{ p: 2, borderTop: 1, borderColor: 'divider', bgcolor: 'background.default' }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                    <Typography variant="body2">Subtotal</Typography>
                    <Typography variant="body2">{formatSmartPrice(cartTotal)}</Typography>
                </Box>
                {discountAmount > 0 && (
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                        <Typography variant="body2">Discount ({discountPercent}%)</Typography>
                        <Typography variant="body2">-{formatSmartPrice(discountAmount)}</Typography>
                    </Box>
                )}
                {couponDiscount > 0 && (
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1, color: 'success.main' }}>
                        <Typography variant="body2">Coupon</Typography>
                        <Typography variant="body2">-{formatSmartPrice(couponDiscount)}</Typography>
                    </Box>
                )}
                {rewardDiscount > 0 && (
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1, color: 'primary.main' }}>
                        <Typography variant="body2">Reward Points</Typography>
                        <Typography variant="body2">-{formatSmartPrice(rewardDiscount)}</Typography>
                    </Box>
                )}
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                    <Typography variant="body2">Tax</Typography>
                    <Typography variant="body2">{formatSmartPrice(taxAmount)}</Typography>
                </Box>
                {serviceChargeAmount > 0 && (
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                        <Typography variant="body2">Service Charge</Typography>
                        <Typography variant="body2">{formatSmartPrice(serviceChargeAmount)}</Typography>
                    </Box>
                )}

                <Divider sx={{ my: 1 }} />
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
                    <Typography variant="h6">Total</Typography>
                    <Typography variant="h6" color="primary.main">
                        {formatSmartPrice(finalTotal)}
                    </Typography>
                </Box>
                <Box sx={{ mb: 2 }}>
                    <Typography variant="caption" color="text.secondary" sx={{ fontStyle: 'italic', display: 'block', mb: 1 }}>
                        ℹ️ Coupon is applied first, then rewards are used for the remaining balance.
                    </Typography>
                    {finalTotal === 0 && cart.length > 0 && (
                        <Alert severity="success" icon={false} sx={{ py: 0, px: 1, '& .MuiAlert-message': { fontSize: '0.75rem' } }}>
                            ✨ Fully paid using rewards!
                        </Alert>
                    )}
                </Box>
                <Button
                    variant="contained"
                    fullWidth
                    size="large"
                    disabled={cart.length === 0 || placingOrder}
                    color={finalTotal === 0 && cart.length > 0 ? 'success' : 'primary'}
                    startIcon={finalTotal === 0 && cart.length > 0 ? <CheckIcon /> : <CartIcon />}
                    onClick={handlePlaceOrder}
                >
                    {placingOrder ? 'Placing...' : (finalTotal === 0 && cart.length > 0 ? 'Complete Order' : 'Place Order')}
                </Button>
            </Box>
        </Box>
    );
};

export default React.memo(OrderDetailsSection);

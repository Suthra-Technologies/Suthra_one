import React from 'react';
import {
    Box,
    Typography,
    List,
    ListItem,
    ListItemText,
    IconButton,
    Divider,
    TextField,
    Button,
} from '@mui/material';
import {
    Delete as DeleteIcon,
    Remove as RemoveIcon,
    Add as AddIcon,
    ShoppingCart as CartIcon,
} from '@mui/icons-material';

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
    serviceChargeAmount: number;
    tip: number;
    setTip: (val: number) => void;
    finalTotal: number;
    rewardDiscount?: number;
    placingOrder: boolean;
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
    serviceChargeAmount,
    tip,
    setTip,
    finalTotal,
    rewardDiscount = 0,
    placingOrder,
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
                                    {item.modifiers && item.modifiers.length > 0 && (
                                        <Typography variant="caption" display="block" color="text.secondary">
                                            {item.modifiers.map((m: any) => m.name).join(', ')}
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
                    <Box sx={{ p: 3, textAlign: 'center' }}>
                        <CartIcon sx={{ fontSize: 40, color: 'text.disabled', mb: 1 }} />
                        <Typography color="text.secondary">Cart is empty</Typography>
                    </Box>
                )}
            </List>

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
                <Button
                    variant="contained"
                    fullWidth
                    size="large"
                    disabled={cart.length === 0 || placingOrder}
                    startIcon={<CartIcon />}
                    onClick={handlePlaceOrder}
                >
                    {placingOrder ? 'Placing...' : 'Place Order'}
                </Button>
            </Box>
        </Box>
    );
};

export default React.memo(OrderDetailsSection);

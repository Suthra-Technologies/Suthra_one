import React from 'react';
import {
    Box,
    Button,
    Grid,
    TextField,
    Typography,
    FormControl,
    RadioGroup,
    FormControlLabel,
    Radio,
    Select,
    MenuItem,
    InputLabel,
    CircularProgress,
    Tooltip,
    IconButton,
    Chip,
    Stack
} from '@mui/material';
import {
    Link as LinkIcon,
    LinkOff as LinkOffIcon,
    TableRestaurant as GroupIcon
} from '@mui/icons-material';
import PhoneInput from '../../../components/PhoneInput';
import AddressAutocomplete from '../../../components/AddressAutocomplete';

interface CustomerInfoSectionProps {
    customerName: string;
    setCustomerName: (val: string) => void;
    customerPhone: string;
    setCustomerPhone: (val: string) => void;
    customerEmail: string;
    setCustomerEmail: (val: string) => void;
    customerDialCode: string;
    setCustomerDialCode: (val: string) => void;
    orderType: 'dine_in' | 'takeaway' | 'delivery' | 'online';
    setOrderType: (val: any) => void;
    paymentMethod: string;
    setPaymentMethod: (val: any) => void;
    guestCount: number;
    setGuestCount: (val: number) => void;
    tableNumber: string;
    setTableNumber: (val: string) => void;
    waiterName: string;
    setWaiterName: (val: string) => void;
    deliveryAddress: any;
    setDeliveryAddress: (val: any) => void;
    customerNameTouched: boolean;
    setCustomerNameTouched: (val: boolean) => void;
    customerNameError: string;
    setCustomerNameError: (val: string) => void;
    customerPhoneTouched: boolean;
    setCustomerPhoneTouched: (val: boolean) => void;
    customerPhoneError: string;
    setCustomerPhoneError: (val: string) => void;
    customerEmailTouched: boolean;
    setCustomerEmailTouched: (val: boolean) => void;
    customerEmailError: string;
    setCustomerEmailError: (val: string) => void;
    tableError: string;
    setTableError: (val: string) => void;
    selectedTable: any;
    setSelectedTable: (val: any) => void;
    tables: any[];
    waiters: any[];
    settings: any;
    user: any;
    checkingDistance: boolean;
    onOpenMerge: () => void;
    onUnmerge: (table: any) => void;
    // Discount & Coupon
    discountPercent: number;
    setDiscountPercent: (val: number) => void;
    couponCode: string;
    setCouponCode: (val: string) => void;
    onValidateCoupon: () => void;
    availableCoupons: any[];
    cartTotal: number;
}

const CustomerInfoSection: React.FC<CustomerInfoSectionProps> = ({
    customerName,
    setCustomerName,
    customerPhone,
    setCustomerPhone,
    customerEmail,
    setCustomerEmail,
    customerDialCode,
    setCustomerDialCode,
    orderType,
    setOrderType,
    paymentMethod,
    setPaymentMethod,
    guestCount,
    setGuestCount,
    tableNumber,
    setTableNumber,
    waiterName,
    setWaiterName,
    deliveryAddress,
    setDeliveryAddress,
    customerNameTouched,
    setCustomerNameTouched,
    customerNameError,
    setCustomerNameError,
    customerPhoneTouched,
    setCustomerPhoneTouched,
    customerPhoneError,
    setCustomerPhoneError,
    customerEmailTouched,
    setCustomerEmailTouched,
    customerEmailError,
    setCustomerEmailError,
    tableError,
    setTableError,
    selectedTable,
    setSelectedTable,
    tables,
    waiters,
    settings,
    user,
    checkingDistance,
    onOpenMerge,
    onUnmerge,
    discountPercent,
    setDiscountPercent,
    couponCode,
    setCouponCode,
    onValidateCoupon,
    availableCoupons,
    cartTotal,
}) => {
    const mergedGroup = React.useMemo(() => {
        if (!selectedTable || (!selectedTable.isPrimary && !selectedTable.mergedWith)) return null;

        const primaryId = selectedTable.isPrimary ? selectedTable._id : selectedTable.mergedWith;
        const primary = tables.find(t => t._id === primaryId);
        const secondaries = tables.filter(t => t.mergedWith === primaryId);

        return {
            primary,
            secondaries
        };
    }, [selectedTable, tables]);

    return (
        <Box sx={{ p: 2, border: '1px solid', borderColor: 'divider', borderRadius: 1, mb: 2 }}>
            <Typography variant="subtitle1" gutterBottom>
                Customer & Order Details
            </Typography>
            <Grid container spacing={2} sx={{ mb: 2 }}>
                <Grid item xs={12} sm={4}>
                    <TextField
                        label="Customer Name"
                        size="small"
                        fullWidth
                        value={customerName}
                        onChange={(e) => {
                            const value = e.target.value.replace(/[^a-zA-Z\s]/g, '');
                            setCustomerName(value);
                            if (customerNameTouched && value.trim()) {
                                setCustomerNameError('');
                            }
                        }}
                        onBlur={() => {
                            setCustomerNameTouched(true);
                            const trimmedName = customerName.trim();
                            if (!trimmedName) {
                                setCustomerNameError('Customer name is required');
                            } else if (trimmedName.length < 3) {
                                setCustomerNameError('Customer name must be at least 3 characters');
                            } else {
                                setCustomerNameError('');
                            }
                        }}
                        error={customerNameTouched && !!customerNameError}
                        helperText={customerNameTouched && customerNameError}
                        disabled={user?.role === 'customer'}
                        required
                        InputLabelProps={{
                            sx: {
                                '& .MuiFormLabel-asterisk': {
                                    color: 'error.main'
                                }
                            }
                        }}
                        autoComplete="off"
                    />
                </Grid>
                <Grid item xs={12} sm={4}>
                    <PhoneInput
                        label="Phone"
                        size="small"
                        fullWidth
                        value={customerPhone}
                        onChange={(value) => {
                            const cleaned = value.replace(/\D/g, '').slice(0, 10);
                            setCustomerPhone(cleaned);
                            if (customerPhoneTouched && cleaned) {
                                setCustomerPhoneError('');
                            }
                        }}
                        onBlur={() => {
                            setCustomerPhoneTouched(true);
                            if (!customerPhone) {
                                setCustomerPhoneError('Phone number is required');
                            } else if (customerPhone.length !== 10) {
                                setCustomerPhoneError('Phone number must be exactly 10 digits');
                            } else {
                                setCustomerPhoneError('');
                            }
                        }}
                        error={customerPhoneTouched && !!customerPhoneError}
                        helperText={customerPhoneTouched && customerPhoneError}
                        disabled={user?.role === 'customer'}
                        required
                        dialCode={customerDialCode}
                        onDialCodeChange={setCustomerDialCode}
                    />
                </Grid>
                <Grid item xs={12} sm={4}>
                    <TextField
                        label="Email"
                        size="small"
                        fullWidth
                        type="email"
                        value={customerEmail}
                        onChange={(e) => {
                            setCustomerEmail(e.target.value);
                            if (customerEmailTouched) {
                                const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
                                if (e.target.value && !emailRegex.test(e.target.value)) {
                                    setCustomerEmailError('Please enter a valid email address');
                                } else {
                                    setCustomerEmailError('');
                                }
                            }
                        }}
                        onBlur={() => {
                            setCustomerEmailTouched(true);
                            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
                            if (customerEmail && !emailRegex.test(customerEmail)) {
                                setCustomerEmailError('Please enter a valid email address');
                            } else {
                                setCustomerEmailError('');
                            }
                        }}
                        error={customerEmailTouched && !!customerEmailError}
                        helperText={customerEmailTouched && customerEmailError}
                        disabled={user?.role === 'customer'}
                        autoComplete="off"
                    />
                </Grid>
            </Grid>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 2, mb: 2 }}>
                <FormControl component="fieldset" sx={{ alignItems: 'center' }}>
                    <Typography variant="body2" gutterBottom fontWeight="bold">
                        Order Type
                    </Typography>
                    <RadioGroup
                        value={orderType}
                        onChange={(e) => setOrderType(e.target.value as any)}
                        sx={{ flexDirection: { xs: 'column', sm: 'row' }, justifyContent: 'center' }}
                    >
                        <FormControlLabel value="dine_in" control={<Radio size="small" />} label="Dine‑In" />
                        <FormControlLabel value="takeaway" control={<Radio size="small" />} label="Takeaway" />
                        {/* <FormControlLabel value="delivery" control={<Radio size="small" />} label="Delivery" /> */}
                    </RadioGroup>
                </FormControl>

                {orderType !== 'dine_in' && (
                    <FormControl component="fieldset" sx={{ alignItems: 'center' }}>
                        <Typography variant="body2" gutterBottom fontWeight="bold">
                            Payment Method
                        </Typography>
                        <RadioGroup
                            value={paymentMethod}
                            onChange={(e) => setPaymentMethod(e.target.value as any)}
                            sx={{ flexDirection: { xs: 'column', sm: 'row' }, justifyContent: 'center' }}
                        >
                            {(settings.system?.posPaymentMethods?.cash ?? true) && (
                                <FormControlLabel value="cash" control={<Radio size="small" />} label="Cash" />
                            )}
                            {(settings.system?.posPaymentMethods?.card ?? true) && (
                                <FormControlLabel value="card" control={<Radio size="small" />} label="Card" />
                            )}
                            {(settings.system?.posPaymentMethods?.zelle ?? true) && (
                                <FormControlLabel value="zelle" control={<Radio size="small" />} label="Zelle" />
                            )}
                            {(settings.system?.posPaymentMethods?.venmo ?? true) && (
                                <FormControlLabel value="venmo" control={<Radio size="small" />} label="Venmo" />
                            )}
                        </RadioGroup>
                    </FormControl>
                )}
            </Box>

            {/* Discount & Coupon — shown after Order Type */}
            <Box sx={{ display: 'flex', gap: 1, mb: 2, alignItems: 'center', flexWrap: 'wrap' }}>
                {user?.role !== 'customer' && (
                    <TextField
                        label="Disc %"
                        type="number"
                        size="small"
                        value={discountPercent}
                        onChange={(e) => setDiscountPercent(Math.max(0, Number(e.target.value)))}
                        sx={{ width: '90px' }}
                        inputProps={{ min: 0 }}
                    />
                )}
                <Box sx={{ display: 'flex', gap: 1, flexGrow: 1 }}>
                    <TextField
                        label="Coupon Code"
                        size="small"
                        value={couponCode}
                        onChange={(e) => setCouponCode(e.target.value)}
                        sx={{ flexGrow: 1 }}
                        onKeyDown={(e) => { if (e.key === 'Enter') onValidateCoupon(); }}
                    />
                    <Button
                        variant="outlined"
                        onClick={onValidateCoupon}
                        size="small"
                        sx={{ whiteSpace: 'nowrap', minWidth: 60 }}
                    >
                        Apply
                    </Button>
                </Box>
            </Box>

            {/* Available coupon hints — only shown when cart total meets minimum */}
            {(() => {
                const qualifiedCoupons = availableCoupons.filter(
                    (c: any) => !c.minBillAmount || cartTotal >= c.minBillAmount
                );
                return qualifiedCoupons.length > 0 && !couponCode ? (
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mb: 1.5, alignItems: 'center' }}>
                        <Typography variant="caption" color="text.secondary" sx={{ mr: 0.5 }}>
                            Available:
                        </Typography>
                        {qualifiedCoupons.slice(0, 4).map((c: any) => (
                            <Chip
                                key={c._id}
                                label={c.code}
                                size="small"
                                variant="outlined"
                                color="primary"
                                onClick={() => setCouponCode(c.code)}
                                sx={{ fontSize: '0.7rem', cursor: 'pointer', fontWeight: 'bold' }}
                            />
                        ))}
                    </Box>
                ) : null;
            })()}

            {/* Dine‑in specific */}
            {orderType === 'dine_in' && (
                <Box sx={{ mb: 2 }}>
                    <Box sx={{ display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, alignItems: { xs: 'flex-start', sm: 'center' }, justifyContent: 'space-between', mb: 2, gap: 2 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, width: { xs: '100%', sm: 'auto' } }}>
                            <Typography variant="body2">Number of Guests:</Typography>
                            <TextField
                                type="number"
                                size="small"
                                value={guestCount}
                                onChange={(e) => setGuestCount(parseInt(e.target.value) || 1)}
                                sx={{ width: '70px' }}
                                inputProps={{ min: 1 }}
                            />
                        </Box>
                        <Box sx={{ display: 'flex', gap: 2, flexGrow: 1, width: { xs: '100%', sm: 'auto' } }}>
                            <FormControl size="small" fullWidth error={!!tableError}>
                                <InputLabel>Table</InputLabel>
                                <Select
                                    value={selectedTable?._id || ''}
                                    label="Table"
                                    onChange={(e) => {
                                        const table = tables.find(t => t._id === e.target.value);
                                        setSelectedTable(table);
                                        setTableNumber(table?.tableNumber || '');
                                        setTableError('');
                                    }}
                                >
                                    {tables.map((t) => (
                                        <MenuItem key={t._id} value={t._id}>
                                            Table {t.tableNumber} (Cap: {t.capacity}) 
                                            {t.status !== 'available' ? ` (${t.status})` : ''}
                                            {(t.isPrimary || t.isMerged) ? ' (Merged)' : ''}
                                        </MenuItem>
                                    ))}
                                </Select>
                                {tableError && <Typography variant="caption" color="error">{tableError}</Typography>}
                            </FormControl>
                            {(selectedTable?.isMerged || selectedTable?.isPrimary) ? (
                                <Tooltip title="Unmerge Tables">
                                    <IconButton
                                        color="error"
                                        onClick={() => onUnmerge && onUnmerge(selectedTable)}
                                        sx={{ bgcolor: 'error.lighter', '&:hover': { bgcolor: 'error.light' } }}
                                    >
                                        <LinkOffIcon />
                                    </IconButton>
                                </Tooltip>
                            ) : (
                                <Tooltip title="Merge Tables">
                                    <IconButton
                                        color="primary"
                                        onClick={onOpenMerge}
                                        sx={{ bgcolor: 'primary.lighter', '&:hover': { bgcolor: 'primary.light' } }}
                                    >
                                        <LinkIcon />
                                    </IconButton>
                                </Tooltip>
                            )}
                            <FormControl size="small" fullWidth>
                                <InputLabel>Waiter</InputLabel>
                                <Select
                                    value={waiterName}
                                    label="Waiter"
                                    onChange={(e) => setWaiterName(e.target.value)}
                                >
                                    {waiters.map((w) => (
                                        <MenuItem key={w._id} value={w.name || w.fullName || w.username}>
                                            {w.name || w.fullName || w.username}
                                        </MenuItem>
                                    ))}
                                </Select>
                            </FormControl>
                        </Box>
                    </Box>

                    {mergedGroup && (
                        <Box sx={{ mt: 1, p: 1, bgcolor: 'action.hover', borderRadius: 1 }}>
                            <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
                                <GroupIcon fontSize="small" color="action" />
                                <Typography variant="caption" fontWeight="bold" sx={{ mr: 1 }}>
                                    Merged Group:
                                </Typography>
                                {mergedGroup.primary && (
                                    <Tooltip title="Primary Table">
                                        <Chip
                                            label={`Table ${mergedGroup.primary.tableNumber}`}
                                            size="small"
                                            color="primary"
                                            variant="filled"
                                        />
                                    </Tooltip>
                                )}
                                {mergedGroup.secondaries.map(st => (
                                    <Chip
                                        key={st._id}
                                        label={`Table ${st.tableNumber}`}
                                        size="small"
                                        variant="outlined"
                                    />
                                ))}
                            </Stack>
                        </Box>
                    )}
                </Box>
            )}

            {/* Delivery address */}
            {orderType === 'delivery' && (
                <Box sx={{ mb: 2 }}>
                    <AddressAutocomplete
                        label="Delivery Address"
                        value={deliveryAddress.fullAddress || ''}
                        onChange={(val) => setDeliveryAddress({ ...deliveryAddress, fullAddress: val })}
                        onSelect={(addr: any) => setDeliveryAddress({
                            ...deliveryAddress,
                            ...addr,
                            pincode: addr.zipCode
                        })}
                        apiKey={(import.meta.env as any).VITE_GOOGLE_MAPS_API_KEY}
                    />
                    {checkingDistance && (
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 1 }}>
                            <CircularProgress size={16} />
                            <Typography variant="caption" color="text.secondary">Checking delivery radius...</Typography>
                        </Box>
                    )}
                </Box>
            )}
        </Box>
    );
};

export default React.memo(CustomerInfoSection);

import {
    TableRestaurant as GroupIcon,
    History as HistoryIcon,
    Link as LinkIcon,
    LinkOff as LinkOffIcon
} from '@mui/icons-material';
import {
    Alert,
    Box,
    Button,
    Chip,
    CircularProgress,
    FormControl,
    FormControlLabel,
    Grid,
    IconButton,
    InputLabel,
    MenuItem,
    Radio,
    RadioGroup,
    Select,
    Stack,
    TextField,
    Tooltip,
    Typography
} from '@mui/material';
import React, { useEffect } from 'react';
import AddressAutocomplete from '../../../components/AddressAutocomplete';
import PhoneInput from '../../../components/PhoneInput';
import { formatPhoneDisplay, validateEmail, validatePhone } from '../../../utils/validation';
import { getActivePaymentMethods } from '../../../utils/orderWorkflows';
import { getMaxGuests, getMergedGroup } from '../utils/tableCapacity';

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
    cardType?: 'credit' | 'debit';
    setCardType?: (val: 'credit' | 'debit') => void;
    guestCount: number;
    setGuestCount: React.Dispatch<React.SetStateAction<number>>;
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
    pendingMergeSecondaryIds?: string[];
    isPreOrder: boolean;
    setIsPreOrder: (val: boolean) => void;
    scheduledDate: string;
    setScheduledDate: (val: string) => void;
    scheduledTime: string;
    setScheduledTime: (val: string) => void;
    rewardPointsInfo: any;
    pointsToRedeem: number;
    setPointsToRedeem: (val: number) => void;
    isFetchingRewards: boolean;
    cartTotal: number;
    finalTotal: number;
    suggestedPhone: string | null;
    customerConflict: boolean;
    maxUsablePoints?: number;
    isApplyingCoupon?: boolean;
    customerCoupons?: any[];
    onApplyCouponCode?: (code: string) => void;
    /** Add-items mode: the order already exists, so only new cart items may change. */
    readOnly?: boolean;
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
    cardType = 'credit',
    setCardType,
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
    pendingMergeSecondaryIds = [],
    isPreOrder,
    setIsPreOrder,
    scheduledDate,
    setScheduledDate,
    scheduledTime,
    setScheduledTime,
    rewardPointsInfo,
    pointsToRedeem,
    setPointsToRedeem,
    isFetchingRewards,
    cartTotal,
    finalTotal,
    suggestedPhone,
    customerConflict,
    maxUsablePoints = 0,
    isApplyingCoupon = false,
    customerCoupons = [],
    onApplyCouponCode,
    readOnly = false,
}) => {
    const isIndia = settings?.restaurant?.country?.toLowerCase() === 'india';

    // Local states for inputs to prevent keypress lag by debouncing parent updates
    const [localName, setLocalName] = React.useState(customerName);
    const [localPhone, setLocalPhone] = React.useState(customerPhone);
    const [localEmail, setLocalEmail] = React.useState(customerEmail);

    useEffect(() => {
        setLocalName(customerName);
    }, [customerName]);

    useEffect(() => {
        setLocalPhone(customerPhone);
    }, [customerPhone]);

    useEffect(() => {
        setLocalEmail(customerEmail);
    }, [customerEmail]);

    const debounceTimers = React.useRef<Record<string, any>>({});

    const debounceUpdate = (key: string, fn: (val: any) => void, val: any, delay = 400) => {
        if (debounceTimers.current[key]) {
            clearTimeout(debounceTimers.current[key]);
        }
        debounceTimers.current[key] = setTimeout(() => {
            fn(val);
        }, delay);
    };

    useEffect(() => {
        return () => {
            Object.values(debounceTimers.current).forEach(clearTimeout);
        };
    }, []);

    // Set default payment method for dine-in orders
    useEffect(() => {
        if (orderType === 'dine_in') {
            // Always set to cash for dine-in orders, regardless of current payment method
            setPaymentMethod('cash');
        }
    }, [orderType, setPaymentMethod]);
    const generateTimeSlots = (dateString: string) => {
        if (!settings?.restaurant?.businessHours) return [];

        const date = new Date(dateString + 'T00:00:00');
        const dayName = date.toLocaleDateString('en-US', { weekday: 'long' });
        const dayConfig = settings.restaurant.businessHours.find((bh: any) => bh.day === dayName);

        if (!dayConfig || !dayConfig.isOpen) return [];

        const openStr = dayConfig.slots?.[0]?.openTime || dayConfig.openTime || '09:00';
        const closeStr = dayConfig.slots?.[0]?.closeTime || dayConfig.closeTime || '22:00';

        const slots: string[] = [];
        let current = new Date(`${dateString}T${openStr}`);
        const end = new Date(`${dateString}T${closeStr}`);

        const now = new Date();
        // buffer
        if (date.toDateString() === now.toDateString()) {
            const earliest = new Date(now.getTime() + 15 * 60 * 1000);
            if (current < earliest) current = earliest;

            const mins = current.getMinutes();
            if (mins > 0 && mins <= 15) current.setMinutes(15);
            else if (mins > 15 && mins <= 30) current.setMinutes(30);
            else if (mins > 30 && mins <= 45) current.setMinutes(45);
            else if (mins > 45) { current.setHours(current.getHours() + 1); current.setMinutes(0); }
        }

        while (current < end) {
            const hours = String(current.getHours()).padStart(2, '0');
            const minutes = String(current.getMinutes()).padStart(2, '0');
            slots.push(`${hours}:${minutes}`);
            current.setMinutes(current.getMinutes() + 15);
        }

        return slots;
    };
    const mergedGroup = React.useMemo(
        () => getMergedGroup(selectedTable, tables, pendingMergeSecondaryIds),
        [selectedTable, tables, pendingMergeSecondaryIds]
    );

    const maxGuests = getMaxGuests(mergedGroup);

    // Clamp when capacity shrinks under the current count — switching to a smaller
    // table, or a guest count arriving from the URL / an existing order.
    useEffect(() => {
        setGuestCount((current: number) => (current > maxGuests ? maxGuests : current));
    }, [maxGuests, setGuestCount]);

    return (
        <Box sx={{ p: 2, border: '1px solid', borderColor: 'divider', borderRadius: 1, mb: 2 }}>
            <Typography variant="subtitle1" gutterBottom>
                Customer & Order Details
            </Typography>

            {customerConflict && (
                <Alert severity="warning" sx={{ mb: 2, borderRadius: 2 }}>
                    ⚠️ This email is linked to another account. Using points from the <strong>Phone</strong> account.
                </Alert>
            )}

            <Grid container spacing={2} sx={{ mb: 2 }}>
                <Grid item xs={12} sm={4}>
                    <TextField
                        label="Customer Name"
                        size="small"
                        fullWidth
                        value={localName}
                        onChange={(e) => {
                            const value = e.target.value.replace(/[^a-zA-Z\s]/g, '').slice(0, 30);
                            setLocalName(value);
                            debounceUpdate('name', setCustomerName, value, 400);
                            if (customerNameTouched && value.trim()) {
                                setCustomerNameError('');
                            }
                        }}
                        onBlur={() => {
                            setCustomerNameTouched(true);
                            if (debounceTimers.current['name']) {
                                clearTimeout(debounceTimers.current['name']);
                            }
                            setCustomerName(localName);
                            const trimmedName = localName.trim();
                            if (!trimmedName) {
                                setCustomerNameError('Customer name is required');
                            } else if (trimmedName.length < 3) {
                                setCustomerNameError('Customer name must be at least 3 characters');
                            } else if (trimmedName.length > 30) {
                                setCustomerNameError('Customer name must not exceed 30 characters');
                            } else {
                                setCustomerNameError('');
                            }
                        }}
                        error={customerNameTouched && !!customerNameError}
                        helperText={customerNameTouched && customerNameError}
                        disabled={readOnly || user?.role === 'customer'}
                        required
                        inputProps={{ maxLength: 30 }}
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
                        value={localPhone}
                        onChange={(value) => {
                            const cleaned = String(value || '').replace(/\D/g, '');
                            const isUS = customerDialCode === '1' || customerDialCode === '+1';
                            const final = (isUS && cleaned.length > 10) ? cleaned.slice(0, 10) : cleaned;
                            setLocalPhone(final);
                            debounceUpdate('phone', setCustomerPhone, final, 400);
                            if (customerPhoneTouched) {
                                if (final && final.trim().length > 0) {
                                    const validation = validatePhone(final, customerDialCode);
                                    setCustomerPhoneError(validation.isValid ? '' : (validation.message || ''));
                                } else {
                                    setCustomerPhoneError('');
                                }
                            }
                        }}
                        onBlur={() => {
                            setCustomerPhoneTouched(true);
                            if (debounceTimers.current['phone']) {
                                clearTimeout(debounceTimers.current['phone']);
                            }
                            setCustomerPhone(localPhone);
                            if (localPhone && localPhone.trim().length > 0) {
                                const validation = validatePhone(localPhone, customerDialCode);
                                setCustomerPhoneError(validation.isValid ? '' : (validation.message || ''));
                            } else {
                                setCustomerPhoneError('');
                            }
                        }}
                        error={customerPhoneTouched && !!customerPhoneError}
                        helperText={customerPhoneTouched && customerPhoneError}
                        disabled={readOnly || user?.role === 'customer'}
                        dialCode={customerDialCode}
                        onDialCodeChange={setCustomerDialCode}
                    />
                    {suggestedPhone && (
                        <Tooltip title="Fill in this customer's previous phone number" arrow>
                            <Chip
                                icon={<HistoryIcon sx={{ fontSize: 14 }} />}
                                label={`Use previous: ${formatPhoneDisplay(suggestedPhone)}`}
                                size="small"
                                color="primary"
                                variant="outlined"
                                clickable
                                onClick={() => {
                                    const clean = suggestedPhone.replace(/\D/g, '').slice(-10);
                                    setLocalPhone(clean);
                                    if (debounceTimers.current['phone']) {
                                        clearTimeout(debounceTimers.current['phone']);
                                    }
                                    setCustomerPhone(clean);
                                }}
                                sx={{
                                    mt: 0.75,
                                    height: 24,
                                    fontSize: '0.72rem',
                                    fontWeight: 600,
                                    maxWidth: '100%',
                                }}
                            />
                        </Tooltip>
                    )}
                </Grid>
                <Grid item xs={12} sm={4}>
                    <TextField
                        label="Email"
                        size="small"
                        fullWidth
                        type="email"
                        value={localEmail}
                        onChange={(e) => {
                            const val = e.target.value?.toLowerCase().slice(0, 50);
                            setLocalEmail(val);
                            debounceUpdate('email', setCustomerEmail, val, 400);
                            if (customerEmailTouched) {
                                // Email is optional on POS orders, so only validate a non-empty value.
                                const validation = validateEmail(val);
                                setCustomerEmailError(val && !validation.isValid ? (validation.message || '') : '');
                            }
                        }}
                        onBlur={() => {
                            setCustomerEmailTouched(true);
                            if (debounceTimers.current['email']) {
                                clearTimeout(debounceTimers.current['email']);
                            }
                            setCustomerEmail(localEmail);
                            const validation = validateEmail(localEmail);
                            setCustomerEmailError(localEmail && !validation.isValid ? (validation.message || '') : '');
                        }}
                        error={customerEmailTouched && !!customerEmailError}
                        helperText={customerEmailTouched && customerEmailError}
                        disabled={readOnly || user?.role === 'customer'}
                        inputProps={{ maxLength: 50 }}
                        autoComplete="off"
                    />
                </Grid>
            </Grid>

            {/* Customer Coupons Section
            {customerCoupons && customerCoupons.length > 0 && (
                <Box sx={{
                    mb: 2,
                    p: 2,
                    bgcolor: 'rgba(76, 175, 80, 0.04)',
                    borderRadius: 1,
                    border: '1px dashed',
                    borderColor: 'success.main',
                    transition: 'all 0.3s ease'
                }}>
                    <Typography variant="subtitle2" color="success.main" fontWeight="bold" sx={{ mb: 1, display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        🎟️ Customer Coupons
                    </Typography>
                    <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap sx={{ gap: 1 }}>
                        {customerCoupons.map((c: any) => (
                            <Tooltip
                                key={c.code}
                                title={`${c.discount}% off${c.minPrice ? ` (min spend $${c.minPrice})` : ''}${c.used ? ' - Already Used' : ''}${c.expiryDate ? ` - Expires ${new Date(c.expiryDate).toLocaleDateString()}` : ''}`}
                            >
                                <span>
                                    <Chip
                                        label={`${c.code} (${c.discount}%)`}
                                        size="small"
                                        color={c.used ? "default" : "success"}
                                        variant={c.used ? "outlined" : "filled"}
                                        onClick={() => {
                                            if (!c.used && onApplyCouponCode) {
                                                onApplyCouponCode(c.code);
                                            }
                                        }}
                                        disabled={c.used}
                                        sx={{ cursor: c.used ? 'default' : 'pointer', fontWeight: 'bold' }}
                                    />
                                </span>
                            </Tooltip>
                        ))}
                    </Stack>
                </Box>
            )} */}

            {/* Rewards Section */}
            {(rewardPointsInfo || isFetchingRewards) && (
                <Box sx={{
                    mb: 2,
                    p: 2,
                    bgcolor: isFetchingRewards ? 'transparent' : 'rgba(25, 118, 210, 0.04)',
                    borderRadius: 1,
                    border: '1px dashed',
                    borderColor: 'primary.main',
                    transition: 'all 0.3s ease'
                }}>
                    {isFetchingRewards ? (
                        <Stack direction="row" spacing={1} alignItems="center" justifyContent="center">
                            <CircularProgress size={16} />
                            <Typography variant="body2" color="text.secondary">Syncing reward points...</Typography>
                        </Stack>
                    ) : (
                        <Grid container spacing={2} alignItems="center">
                            <Grid item xs={12} sm={7}>
                                <Typography variant="subtitle2" color="primary.main" fontWeight="bold">
                                    Customer Rewards
                                </Typography>
                                <Typography variant="body2" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                    Available Balance: <strong>{rewardPointsInfo.points || 0} pts</strong>
                                    <Chip
                                        label={`$${rewardPointsInfo.dollarValue || 0} Value`}
                                        size="small"
                                        color="success"
                                        variant="outlined"
                                        sx={{ height: 20, fontSize: '0.65rem' }}
                                    />
                                </Typography>
                                {rewardPointsInfo.settings?.minPointsToRedeem > 0 && (
                                    <Typography variant="caption" color="text.secondary">
                                        Min. {rewardPointsInfo.settings.minPointsToRedeem} pts required to redeem.
                                    </Typography>
                                )}
                            </Grid>
                            <Grid item xs={12} sm={5}>
                                <Stack direction="row" spacing={1} alignItems="flex-start">
                                    <TextField
                                        label="Redeem Points"
                                        type="number"
                                        size="small"
                                        value={pointsToRedeem || ''}
                                        onChange={(e) => {
                                            const val = parseInt(e.target.value) || 0;
                                            const cappedVal = Math.min(maxUsablePoints, Math.max(0, val));
                                            setPointsToRedeem(cappedVal);
                                        }}
                                        inputProps={{ min: 0, max: maxUsablePoints }}
                                        fullWidth
                                        disabled={readOnly || !rewardPointsInfo.points || rewardPointsInfo.points < (rewardPointsInfo.settings?.minPointsToRedeem || 0) || maxUsablePoints === 0}
                                        helperText={
                                            <span style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                <span>{pointsToRedeem > 0 ? `-$${(pointsToRedeem * (rewardPointsInfo.settings?.pointValue || 0)).toFixed(2)} discount` : `Max usable: ${maxUsablePoints} pts`}</span>
                                                {pointsToRedeem > 0 && (
                                                    <span
                                                        onClick={(e) => { e.preventDefault(); setPointsToRedeem(0); }}
                                                        style={{ color: '#d32f2f', cursor: 'pointer', fontWeight: 'bold' }}
                                                    >
                                                        Clear
                                                    </span>
                                                )}
                                            </span>
                                        }
                                        FormHelperTextProps={{ component: 'div' } as any}
                                    />
                                    <Button
                                        variant="contained"
                                        size="small"
                                        disableElevation
                                        onClick={() => setPointsToRedeem(maxUsablePoints)}
                                        disabled={readOnly || !rewardPointsInfo.points || rewardPointsInfo.points < (rewardPointsInfo.settings?.minPointsToRedeem || 0) || maxUsablePoints === 0 || pointsToRedeem === maxUsablePoints}
                                        sx={{ mt: 0.5 }}
                                    >
                                        MAX
                                    </Button>
                                </Stack>
                                {pointsToRedeem >= maxUsablePoints && maxUsablePoints > 0 && rewardPointsInfo.points > maxUsablePoints && (
                                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5, fontStyle: 'italic' }}>
                                        Note: Remaining reward points will stay in your wallet.
                                    </Typography>
                                )}
                            </Grid>
                        </Grid>
                    )}
                </Box>
            )}
            <Box sx={{ mb: 2 }}>
                {/* Order Type & Payment Method */}
                <Box sx={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 2, mb: 2 }}>
                    <FormControl component="fieldset" disabled={readOnly} sx={{ alignItems: 'center' }}>
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
                            <Typography variant="body2" gutterBottom fontWeight="bold" color={finalTotal === 0 ? 'text.disabled' : 'text.primary'}>
                                Payment Method {finalTotal === 0 && '(N/A)'}
                            </Typography>
                            <RadioGroup
                                value={finalTotal === 0 ? '' : paymentMethod}
                                onChange={(e) => setPaymentMethod(e.target.value as any)}
                                sx={{
                                    display: { xs: 'grid', sm: 'flex' },
                                    gridTemplateColumns: { xs: '1fr 1fr', sm: 'none' },
                                    flexDirection: { sm: 'row' },
                                    justifyContent: 'center',
                                    columnGap: { xs: 2, sm: 0 },
                                    rowGap: { xs: 0, sm: 0 },
                                    width: '100%',
                                    '& .MuiFormControlLabel-root': {
                                        mr: { xs: 0, sm: 2 }
                                    },
                                    opacity: finalTotal === 0 ? 0.5 : 1,
                                    pointerEvents: finalTotal === 0 ? 'none' : 'auto'
                                }}
                            >
                                {getActivePaymentMethods(settings).map(pm => (
                                    <FormControlLabel
                                        key={pm.val}
                                        value={pm.val}
                                        control={<Radio size="small" />}
                                        label={<span>{pm.label}</span>}
                                    />
                                ))}
                            </RadioGroup>
                        </FormControl>
                    )}

                    {/* Card type — Credit / Debit (shown when Card is selected) */}
                    {paymentMethod === 'card' && setCardType &&
                        ((settings.system?.posPaymentMethods?.creditCard ?? true) || (settings.system?.posPaymentMethods?.debitCard ?? true)) && (
                            <Box sx={{ mt: 1, pl: 1 }}>
                                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>Card Type</Typography>
                                <RadioGroup row value={cardType} onChange={(e) => setCardType(e.target.value as 'credit' | 'debit')}>
                                    {(settings.system?.posPaymentMethods?.creditCard ?? true) && (
                                        <FormControlLabel value="credit" control={<Radio size="small" />} label="Credit Card" />
                                    )}
                                    {(settings.system?.posPaymentMethods?.debitCard ?? true) && (
                                        <FormControlLabel value="debit" control={<Radio size="small" />} label="Debit Card" />
                                    )}
                                </RadioGroup>
                            </Box>
                        )}

                    {/* Dine-in Payment Method - Only Card and Cash */}

                </Box>


                {/* Dine-in specific — guests, table, waiter (shown between Order Type and Coupon) */}
                {orderType === 'dine_in' && (
                    <Box sx={{ mb: 2 }}>
                        <Box sx={{ display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, alignItems: { xs: 'flex-start', sm: 'center' }, justifyContent: 'space-between', mb: 2, gap: 2 }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, width: { xs: '100%', sm: 'auto' } }}>
                                <Typography variant="body2">Number of Guests:</Typography>
                                <TextField
                                    type="number"
                                    size="small"
                                    value={guestCount}
                                    onChange={(e) => {
                                        const parsed = parseInt(e.target.value) || 1;
                                        setGuestCount(Math.min(maxGuests, Math.max(1, parsed)));
                                    }}
                                    sx={{ width: '90px' }}
                                    inputProps={{ min: 1, max: maxGuests }}
                                    error={guestCount > maxGuests}
                                    helperText={mergedGroup?.combinedCapacity ? `Max: ${maxGuests}` : ''}
                                    disabled={readOnly}
                                />
                            </Box>
                            <Box sx={{ display: 'flex', gap: 2, flexGrow: 1, width: { xs: '100%', sm: 'auto' } }}>
                                <FormControl size="small" fullWidth error={!!tableError} disabled={readOnly}>
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
                                        {tables.filter((t) => t.status === 'available' || t._id === selectedTable?._id).map((t) => (
                                            <MenuItem key={t._id} value={t._id}>
                                                Table {t.tableNumber} (Cap: {t.capacity})
                                                {(t.isPrimary || t.isMerged) ? ' (Merged)' : ''}
                                            </MenuItem>
                                        ))}
                                    </Select>
                                    {tableError && <Typography variant="caption" color="error">{tableError}</Typography>}
                                </FormControl>
                                {!readOnly && ((selectedTable?.isMerged || selectedTable?.isPrimary) ? (
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
                                ))}
                                <FormControl size="small" fullWidth disabled={readOnly}>
                                    <InputLabel>Waiter</InputLabel>
                                    <Select
                                        value={waiterName}
                                        label="Waiter"
                                        onChange={(e) => setWaiterName(e.target.value)}
                                    >
                                        {waiters.map((w) => (
                                            <MenuItem key={w._id} value={`${w.firstName || ''} ${w.lastName || ''}`.trim() || w.email}>
                                                {`${w.firstName || ''} ${w.lastName || ''}`.trim() || w.email}
                                            </MenuItem>
                                        ))}
                                    </Select>
                                </FormControl>
                            </Box>
                        </Box>

                        {mergedGroup && (
                            <Box sx={{ mt: 1 }}>
                                <Box sx={{ p: 1, bgcolor: 'action.hover', borderRadius: 1 }}>
                                    <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
                                        <GroupIcon fontSize="small" color="action" />
                                        <Typography variant="caption" fontWeight="bold" sx={{ mr: 1 }}>
                                            {mergedGroup.secondaries.length > 0 ? 'Merged Group:' : 'Selected Table:'}
                                        </Typography>
                                        {mergedGroup.primary && (
                                            <Tooltip title={mergedGroup.secondaries.length > 0 ? "Primary Table" : ""}>
                                                <Chip
                                                    label={`Table ${mergedGroup.primary.tableNumber}`}
                                                    size="small"
                                                    color={mergedGroup.isPending ? "warning" : "primary"}
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
                                        <Box sx={{ flexGrow: 1 }} />
                                        <Typography variant="caption" sx={{ fontWeight: 700, color: guestCount > mergedGroup.combinedCapacity ? 'error.main' : 'success.main' }}>
                                            Total Capacity: {mergedGroup.combinedCapacity} Guests {mergedGroup.isPending && '(Pending Merge)'}
                                        </Typography>
                                    </Stack>
                                </Box>
                                {guestCount > mergedGroup.combinedCapacity && (
                                    <Typography variant="caption" color="error" sx={{ mt: 0.5, display: 'block', fontWeight: 'bold' }}>
                                        ⚠️ Guest count exceeds combined table capacity!
                                    </Typography>
                                )}
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
        </Box>
    );
};

export default React.memo(CustomerInfoSection);

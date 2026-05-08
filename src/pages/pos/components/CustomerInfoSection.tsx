import {
    TableRestaurant as GroupIcon,
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
import React from 'react';
import AddressAutocomplete from '../../../components/AddressAutocomplete';
import PhoneInput from '../../../components/PhoneInput';

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
}) => {
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
    const mergedGroup = React.useMemo(() => {
        if (!selectedTable) {
            return null;
        }

        // 1. If we have pending merges from the POS UI
        if (pendingMergeSecondaryIds.length > 0) {
            const secondaries = pendingMergeSecondaryIds.map(id => tables.find(t => t._id === id)).filter(Boolean);
            const combinedCapacity = (selectedTable.capacity || 0) + secondaries.reduce((sum, t) => sum + (t.capacity || 0), 0);
            return {
                primary: selectedTable,
                secondaries,
                combinedCapacity,
                isPending: true
            };
        }

        // 2. If the table is already merged in the DB
        if (selectedTable.isPrimary || selectedTable.mergedWith) {
            const primaryId = selectedTable.isPrimary ? selectedTable._id : selectedTable.mergedWith;
            const primary = tables.find(t => t._id === primaryId);
            const secondaries = tables.filter(t => t.mergedWith === primaryId);
            const combinedCapacity = (primary?.capacity || 0) + secondaries.reduce((sum, t) => sum + (t.capacity || 0), 0);

            return {
                primary,
                secondaries,
                combinedCapacity,
                isPending: false
            };
        }

        // 3. Single table
        return {
            primary: selectedTable,
            secondaries: [],
            combinedCapacity: selectedTable?.capacity || 0,
            isPending: false
        };
    }, [selectedTable, tables, pendingMergeSecondaryIds]);

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
                        helperText={suggestedPhone ? (
                            <Box component="span" sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.5 }}>
                                <Typography variant="caption" color="primary">Previously used: {suggestedPhone}</Typography>
                                <Button
                                    size="small"
                                    variant="outlined"
                                    sx={{ height: 20, px: 1, minWidth: 0, textTransform: 'none', fontSize: '0.65rem' }}
                                    onClick={() => {
                                        const clean = suggestedPhone.replace(/\D/g, '').slice(-10);
                                        setCustomerPhone(clean);
                                    }}
                                >
                                    Use this
                                </Button>
                            </Box>
                        ) : (customerPhoneTouched && customerPhoneError)}
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
                                        disabled={!rewardPointsInfo.points || rewardPointsInfo.points < (rewardPointsInfo.settings?.minPointsToRedeem || 0) || maxUsablePoints === 0}
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
                                        disabled={!rewardPointsInfo.points || rewardPointsInfo.points < (rewardPointsInfo.settings?.minPointsToRedeem || 0) || maxUsablePoints === 0 || pointsToRedeem === maxUsablePoints}
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
                                {(settings.system?.posPaymentMethods?.cash ?? true) && (
                                    <FormControlLabel value="cash" control={<Radio size="small" />} label="Cash" />
                                )}
                                {(settings.system?.posPaymentMethods?.zelle ?? true) && (
                                    <FormControlLabel value="zelle" control={<Radio size="small" />} label="Zelle" />
                                )}
                                {(settings.system?.posPaymentMethods?.card ?? true) && (
                                    <FormControlLabel value="card" control={<Radio size="small" />} label="Card" />
                                )}
                                {(settings.system?.posPaymentMethods?.venmo ?? true) && (
                                    <FormControlLabel value="venmo" control={<Radio size="small" />} label="Venmo" />
                                )}
                            </RadioGroup>
                        </FormControl>
                    )}
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
                                        {tables.filter((t) => t.status === 'available').map((t) => (
                                            <MenuItem key={t._id} value={t._id}>
                                                Table {t.tableNumber} (Cap: {t.capacity})
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

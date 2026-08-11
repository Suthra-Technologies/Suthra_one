import {
    CreditCard as CardIcon,
    AccountBalanceWallet as CashIcon,
    Close as CloseIcon,
    Delete as DeleteIcon,
    Smartphone as SmartphoneIcon,
    ReceiptLong as ChequeIcon,
    Add as AddIcon,
    AddCircleOutline as PlusIcon,
    RemoveCircleOutline as MinusIcon,
    PieChart as ShareIcon,
    Autorenew as ResetIcon,
    Lock as LockIcon,
    LockOpen as LockOpenIcon,
    ExpandMore as ExpandMoreIcon
} from '@mui/icons-material';
import {
    Alert,
    Box,
    Button,
    Chip,
    CircularProgress,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    Divider,
    FormControl,
    FormControlLabel,
    FormLabel,
    IconButton,
    List,
    ListItem,
    ListItemSecondaryAction,
    ListItemText,
    Paper,
    Radio,
    RadioGroup,
    Stack,
    TextField,
    Typography,
    MenuItem,
    Select,
    ToggleButton,
    ToggleButtonGroup,
    InputAdornment,
    Accordion,
    AccordionSummary,
    AccordionDetails
} from '@mui/material';
import React, { useEffect, useMemo, useState, useRef } from 'react';
import { toast } from 'react-hot-toast';
import { useSettings } from '../context/SettingsContext';
import { getActivePaymentMethods } from '../utils/orderWorkflows';
import { ordersAPI, rewardsAPI } from '../services/api';
import { openCashDrawer } from '../utils/cashDrawer';
import PaymentModal from './PaymentModal';

interface PaymentCollectionDialogProps {
    open: boolean;
    order: any | null;
    onClose: () => void;
    onSuccess: () => void;
}

const PaymentCollectionDialog: React.FC<PaymentCollectionDialogProps> = ({
    open,
    order: initialOrder,
    onClose,
    onSuccess,
}) => {
    const { formatCurrency, settings } = useSettings();
    const [order, setOrder] = useState<any>(initialOrder);
    const [paymentMethod, setPaymentMethod] = useState<string>('cash');

    const isIndia = settings?.restaurant?.country?.toLowerCase() === 'india';

    // Available payment methods based on settings
    const availableMethods = useMemo(() => {
        const activeMethods = getActivePaymentMethods(settings);
        
        return activeMethods.map(m => {
            if (m.val === 'cash') return { val: 'cash', icon: <CashIcon color="success" />, title: 'Cash', subtitle: 'Record a cash payment' };
            if (m.val === 'cheque') return { val: 'cheque', icon: <ChequeIcon color="warning" />, title: 'Cheque', subtitle: 'Record a cheque payment' };
            if (m.val === 'card') return { val: 'card', icon: <CardIcon color="info" />, title: 'Card', subtitle: 'Process card via Stripe' };
            
            let iconColor: 'primary' | 'secondary' | 'success' | 'info' | 'warning' | 'error' = 'primary';
            if (m.val === 'zelle' || m.val === 'phonepe') iconColor = 'secondary';
            if (m.val === 'venmo' || m.val === 'gpay') iconColor = 'success';
            
            return {
                val: m.val,
                icon: <SmartphoneIcon color={iconColor} />,
                title: m.label,
                subtitle: `Manual ${m.label} Transfer`
            };
        });
    }, [settings]);

    // Ensure initial payment method is valid when dialog opens
    useEffect(() => {
        if (open && availableMethods.length > 0) {
            const isCurrentlyAvailable = availableMethods.some(m => m.val === paymentMethod);
            if (!isCurrentlyAvailable) {
                setPaymentMethod(availableMethods[0].val as any);
            }
        }
    }, [open, availableMethods, paymentMethod]);
    interface PaymentRow {
        id: string;
        amount: string;     // Read-only in Share/Percent modes, editable in Amount mode
        shares: string;     // Used in Share mode (e.g. '1', '2')
        percent: string;    // Used in Percent mode (e.g. '50', '25')
        method: string;
        transactionId: string;
        isLocked?: boolean;
    }

    const MAX_SPLIT_PAYERS = 12;

    const [loading, setLoading] = useState(false);
    const [stripeModalOpen, setStripeModalOpen] = useState(false);
    const [tipPercent, setTipPercent] = useState<number>(0);
    const [customTipAmount, setCustomTipAmount] = useState<string>('');
    const [isCustomActive, setIsCustomActive] = useState<boolean>(false);
    const [paymentRows, setPaymentRows] = useState<PaymentRow[]>([]);
    const [processingRowId, setProcessingRowId] = useState<string | null>(null);
    const [splitMode, setSplitMode] = useState<'amount' | 'share' | 'percent'>('amount');

    // Rewards state
    const [rewardPointsInfo, setRewardPointsInfo] = useState<any>(null);
    const [pointsToRedeem, setPointsToRedeem] = useState<number>(0);
    const [isFetchingRewards, setIsFetchingRewards] = useState(false);
    const [isApplyingRewards, setIsApplyingRewards] = useState(false);
    const [rewardsExpanded, setRewardsExpanded] = useState(false);
    const hasAppliedRewards = (order?.loyaltyPoints?.pointsUsed || 0) > 0;
    const currentPointsUsed = order?.loyaltyPoints?.pointsUsed || 0;
    const prevPointsUsed = useRef<number>(currentPointsUsed);
    const totalAmount = order?.totalAmount || 0;

    const totalPaid = (order?.payments || [])
        .filter((p: any) => p.status === 'success' || !p.status)
        .reduce((sum: number, p: any) => sum + (p.amount || 0), 0);

    const baseAmount = order ? (order.totalAmount - (order.tip || 0)) : 0;
    const isCustomTip = customTipAmount !== '' && !isNaN(parseFloat(customTipAmount));
    const targetTipAmount = isCustomTip 
        ? Math.max(0, parseFloat(customTipAmount) || 0)
        : (baseAmount * tipPercent) / 100;
    const pendingTipAmount = Math.max(0, targetTipAmount - (order?.tip || 0));
    const adjustedTotal = order ? (baseAmount + Math.max(order.tip || 0, targetTipAmount)) : 0;
    const amountDue = Math.max(0, adjustedTotal - totalPaid);

    const redistributeRows = (
        rows: PaymentRow[],
        activeSplitMode: 'amount' | 'share' | 'percent',
        targetAmountDue: number
    ): PaymentRow[] => {
        const lockedRows = rows.filter(r => r.isLocked);
        const unlockedRows = rows.filter(r => !r.isLocked);
        
        if (activeSplitMode === 'amount') {
            if (unlockedRows.length === 0) return rows;
            
            const sumLocked = lockedRows.reduce((sum, r) => sum + (parseFloat(r.amount) || 0), 0);
            const remainingToDistribute = Math.max(0, targetAmountDue - sumLocked);
            
            const baseShare = Math.floor((remainingToDistribute / unlockedRows.length) * 100) / 100;
            const allocated = baseShare * unlockedRows.length;
            const difference = Math.round((remainingToDistribute - allocated) * 100) / 100;
            
            return rows.map(r => {
                if (r.isLocked) return r;
                
                const idxInUnlocked = unlockedRows.findIndex(ur => ur.id === r.id);
                const extra = idxInUnlocked === unlockedRows.length - 1 ? difference : 0;
                const nextAmt = baseShare + extra;
                return {
                    ...r,
                    amount: nextAmt.toFixed(2)
                };
            });
        } else if (activeSplitMode === 'percent') {
            if (unlockedRows.length === 0) return rows;
            
            const sumLocked = lockedRows.reduce((sum, r) => sum + (parseFloat(r.percent) || 0), 0);
            const remainingToDistribute = Math.max(0, 100 - sumLocked);
            
            const baseShare = Math.floor((remainingToDistribute / unlockedRows.length) * 100) / 100;
            const allocated = baseShare * unlockedRows.length;
            const difference = Math.round((remainingToDistribute - allocated) * 100) / 100;
            
            return rows.map(r => {
                if (r.isLocked) return r;
                
                const idxInUnlocked = unlockedRows.findIndex(ur => ur.id === r.id);
                const extra = idxInUnlocked === unlockedRows.length - 1 ? difference : 0;
                const nextPct = baseShare + extra;
                return {
                    ...r,
                    percent: nextPct.toFixed(2)
                };
            });
        }
        
        return rows;
    };

    const maxUsablePoints = useMemo(() => {
        if (!rewardPointsInfo?.settings) return 0;
        const pointValue = Number(rewardPointsInfo.settings.pointValue) || 0;
        if (pointValue <= 0) return 0;

        const maxPercentage = (rewardPointsInfo.settings.maxRedemptionPercentage ?? 100) / 100;
        const maxDiscountAllowed = (order?.subtotal || 0) * maxPercentage;

        const maxPointsByBill = Math.floor(maxDiscountAllowed / pointValue);
        return Math.min(rewardPointsInfo.points || 0, maxPointsByBill);
    }, [rewardPointsInfo, order]);

    const calculatedRows = useMemo(() => {
        if (splitMode === 'amount') {
            return paymentRows;
        }

        if (splitMode === 'share') {
            const totalShares = paymentRows.reduce((sum, r) => sum + (parseFloat(r.shares) || 0), 0);
            if (totalShares <= 0) {
                return paymentRows.map(r => ({ ...r, amount: '0.00' }));
            }

            const rowsWithAmount = paymentRows.map(r => {
                const shareVal = parseFloat(r.shares) || 0;
                const amt = Math.floor(((shareVal / totalShares) * amountDue) * 100) / 100;
                return {
                    ...r,
                    amount: amt.toFixed(2)
                };
            });

            const calculatedSum = rowsWithAmount.reduce((sum, r) => sum + parseFloat(r.amount), 0);
            const diff = Math.round((amountDue - calculatedSum) * 100) / 100;
            if (diff !== 0 && rowsWithAmount.length > 0) {
                const lastIdx = rowsWithAmount.length - 1;
                const lastAmt = parseFloat(rowsWithAmount[lastIdx].amount) + diff;
                rowsWithAmount[lastIdx].amount = lastAmt.toFixed(2);
            }

            return rowsWithAmount;
        }

        if (splitMode === 'percent') {
            const rowsWithAmount = paymentRows.map(r => {
                const percentVal = parseFloat(r.percent) || 0;
                const amt = Math.floor(((percentVal / 100) * amountDue) * 100) / 100;
                return {
                    ...r,
                    amount: amt.toFixed(2)
                };
            });

            const totalPercent = paymentRows.reduce((sum, r) => sum + (parseFloat(r.percent) || 0), 0);
            if (Math.abs(totalPercent - 100) < 0.01 && rowsWithAmount.length > 0) {
                const calculatedSum = rowsWithAmount.reduce((sum, r) => sum + parseFloat(r.amount), 0);
                const diff = Math.round((amountDue - calculatedSum) * 100) / 100;
                if (diff !== 0) {
                    const lastIdx = rowsWithAmount.length - 1;
                    const lastAmt = parseFloat(rowsWithAmount[lastIdx].amount) + diff;
                    rowsWithAmount[lastIdx].amount = lastAmt.toFixed(2);
                }
            }

            return rowsWithAmount;
        }

        return paymentRows;
    }, [paymentRows, splitMode, amountDue]);

    const plannedTotal = useMemo(() => {
        return calculatedRows.reduce((sum, r) => sum + (parseFloat(r.amount) || 0), 0);
    }, [calculatedRows]);

    const totalPercent = useMemo(() => {
        return paymentRows.reduce((sum, r) => sum + (parseFloat(r.percent) || 0), 0);
    }, [paymentRows]);

    const isOverAllocated = splitMode === 'amount' ? plannedTotal > amountDue + 0.01 : splitMode === 'percent' ? totalPercent > 100.01 : false;
    const isFullyAllocated = splitMode === 'amount' ? Math.abs(plannedTotal - amountDue) < 0.01 : splitMode === 'percent' ? Math.abs(totalPercent - 100) < 0.01 : true;

    const validationAlert = useMemo(() => {
        if (splitMode === 'amount') {
            const diff = Math.round((plannedTotal - amountDue) * 100) / 100;
            if (diff > 0.01) {
                return {
                    severity: 'warning' as const,
                    text: `Planned total exceeds remaining due by ${formatCurrency(diff)}`
                };
            } else if (diff < -0.01) {
                return {
                    severity: 'info' as const,
                    text: `Planned total is short of remaining due by ${formatCurrency(Math.abs(diff))}`
                };
            } else {
                return {
                    severity: 'success' as const,
                    text: 'Planned total matches remaining due exactly'
                };
            }
        } else if (splitMode === 'percent') {
            const diff = Math.round((totalPercent - 100) * 100) / 100;
            if (diff > 0.01) {
                return {
                    severity: 'warning' as const,
                    text: `Planned percentages sum to ${totalPercent.toFixed(2)}% (exceeds 100% by ${diff.toFixed(2)}%)`
                };
            } else if (diff < -0.01) {
                return {
                    severity: 'info' as const,
                    text: `Planned percentages sum to ${totalPercent.toFixed(2)}% (short of 100% by ${Math.abs(diff).toFixed(2)}%)`
                };
            } else {
                return {
                    severity: 'success' as const,
                    text: 'Planned percentages sum to exactly 100%'
                };
            }
        } else {
            return {
                severity: 'success' as const,
                text: `Splitting ${formatCurrency(amountDue)} proportionally based on shares`
            };
        }
    }, [splitMode, plannedTotal, totalPercent, amountDue]);

    // Sync state when dialog opens or initial order changes
    useEffect(() => {
        if (initialOrder && open) {
            setOrder(initialOrder);
            prevPointsUsed.current = initialOrder.loyaltyPoints?.pointsUsed || 0;
            setTipPercent(0);
            setCustomTipAmount('');
            setIsCustomActive(false);
            if (initialOrder.loyaltyPoints?.pointsUsed) {
                setRewardsExpanded(true);
            } else {
                setRewardsExpanded(false);
            }

            // Check for customer and fetch rewards
            const fetchRewards = async () => {
                const customer = initialOrder.customer;
                if (customer?.email || customer?.phone) {
                    try {
                        setIsFetchingRewards(true);
                        const res = await rewardsAPI.getCustomerInfo({ 
                            email: customer.email, 
                            phone: customer.phone 
                        });
                        setRewardPointsInfo(res.data);
                        // If order already has points used, pre-fill them
                        if (initialOrder.loyaltyPoints?.pointsUsed) {
                            setPointsToRedeem(initialOrder.loyaltyPoints.pointsUsed);
                        }
                    } catch (err) {
                        console.error('Failed to fetch rewards:', err);
                    } finally {
                        setIsFetchingRewards(false);
                    }
                }
            };
            fetchRewards();
        }
    }, [initialOrder, open]);

    // Manage/sync split bill rows
    useEffect(() => {
        if (open && amountDue > 0) {
            const pointsChanged = currentPointsUsed !== prevPointsUsed.current;
            prevPointsUsed.current = currentPointsUsed;

            if (paymentRows.length <= 1) {
                const currentMethod = paymentRows[0]?.method || paymentMethod || 'cash';
                setPaymentRows([
                    {
                        id: paymentRows[0]?.id || Math.random().toString(),
                        amount: Number(amountDue).toFixed(2),
                        shares: '1',
                        percent: '100',
                        method: currentMethod,
                        transactionId: paymentRows[0]?.transactionId || '',
                        isLocked: false
                    }
                ]);
            } else if (!pointsChanged || totalPaid === 0) {
                setPaymentRows(prev => redistributeRows(prev, splitMode, amountDue));
            }
        } else if (!open || amountDue === 0) {
            setPaymentRows([]);
        }
    }, [open, amountDue, currentPointsUsed, totalPaid]);

    if (!order) return null;

    const handleSplitModeChange = (newMode: 'amount' | 'share' | 'percent') => {
        if (!newMode) return;
        
        setPaymentRows(prev => {
            const currentCalculated = calculatedRows;
            
            const nextRows = prev.map((row, idx) => {
                const calcAmt = parseFloat(currentCalculated[idx]?.amount || '0');
                
                let newShares = row.shares;
                let newPercent = row.percent;
                let newAmount = row.amount;

                if (newMode === 'amount') {
                    newAmount = calcAmt.toFixed(2);
                } else if (newMode === 'percent') {
                    newPercent = amountDue > 0 ? ((calcAmt / amountDue) * 100).toFixed(2) : '0.00';
                } else if (newMode === 'share') {
                    newShares = '1';
                }

                return {
                    ...row,
                    amount: newAmount,
                    shares: newShares,
                    percent: newPercent,
                    isLocked: newMode === 'share' ? false : row.isLocked
                };
            });
            
            return redistributeRows(nextRows, newMode, amountDue);
        });
        
        setSplitMode(newMode);
    };

    // Split planners
    const handleQuickSplit = (parts: number) => {
        if (parts <= 0 || amountDue <= 0) return;
        
        setPaymentRows(prev => {
            const lockedRows = prev.filter(r => r.isLocked);
            const L = lockedRows.length;
            const targetU = Math.max(0, parts - L);
            
            const nextRows: PaymentRow[] = [];
            let unlockedKeptCount = 0;
            
            // Go through the previous rows and keep all locked ones, and unlocked ones up to targetU
            for (const row of prev) {
                if (row.isLocked) {
                    nextRows.push(row);
                } else if (unlockedKeptCount < targetU) {
                    nextRows.push(row);
                    unlockedKeptCount++;
                }
            }
            
            // If we still need more unlocked rows, create and append them
            while (unlockedKeptCount < targetU) {
                nextRows.push({
                    id: Math.random().toString(),
                    amount: '0.00',
                    shares: '1',
                    percent: '0.00',
                    method: paymentMethod || 'cash',
                    transactionId: '',
                    isLocked: false
                });
                unlockedKeptCount++;
            }
            
            return redistributeRows(nextRows, splitMode, amountDue);
        });
    };

    const handleSplitEqually = () => {
        if (paymentRows.length === 0 || amountDue <= 0) return;
        setPaymentRows(prev => {
            const unlocked = prev.map(row => ({
                ...row,
                isLocked: false
            }));
            return redistributeRows(unlocked, splitMode, amountDue);
        });
    };

    const handleAddRow = () => {
        if (paymentRows.length >= MAX_SPLIT_PAYERS) {
            toast.error(`Maximum of ${MAX_SPLIT_PAYERS} split bill payers allowed`);
            return;
        }
        setPaymentRows(prev => {
            const newRow: PaymentRow = {
                id: Math.random().toString(),
                amount: '0.00',
                shares: '1',
                percent: '0.00',
                method: paymentMethod || 'cash',
                transactionId: '',
                isLocked: false
            };
            
            const updated = [...prev, newRow];
            return redistributeRows(updated, splitMode, amountDue);
        });
    };

    const handleRemoveRow = (rowId: string) => {
        setPaymentRows(prev => {
            const remaining = prev.filter(r => r.id !== rowId);
            if (remaining.length === 0) return [];
            
            return redistributeRows(remaining, splitMode, amountDue);
        });
    };

    const handleUpdateRow = (rowId: string, fields: Partial<PaymentRow>) => {
        setPaymentRows(prev => prev.map(r => r.id === rowId ? { ...r, ...fields } : r));
    };

    const handleUpdateRowAmount = (rowId: string, newAmountVal: string) => {
        setPaymentRows(prev => {
            const updated = prev.map(r => r.id === rowId ? {
                ...r,
                amount: newAmountVal,
                isLocked: true
            } : r);
            
            return redistributeRows(updated, 'amount', amountDue);
        });
    };

    const handleUpdateRowPercent = (rowId: string, newPercentVal: string) => {
        setPaymentRows(prev => {
            const updated = prev.map(r => r.id === rowId ? {
                ...r,
                percent: newPercentVal,
                isLocked: true
            } : r);
            
            return redistributeRows(updated, 'percent', amountDue);
        });
    };

    const handleAddSplit = async (rowId: string, _paymentIntentId?: string) => {
        const row = calculatedRows.find(r => r.id === rowId);
        if (!row) return;

        const amt = parseFloat(row.amount) || 0;
        if (amt <= 0 || amt > amountDue + 0.01) {
            toast.error('Invalid payment amount. Must not exceed remaining balance.');
            return;
        }
        const isFullyPaid = amt >= amountDue - 0.01;
        setLoading(true);
        try {
            const res = await ordersAPI.addPaymentSplit(order._id, {
                amount: amt,
                method: row.method,
                transactionId: _paymentIntentId || row.transactionId,
                tipAmount: pendingTipAmount > 0 ? pendingTipAmount : 0
            });
            toast.success(`Payment of ${formatCurrency(amt)} added`);
            // Cash collected — pop the drawer (wired to the billing printer). Best-effort.
            if (row.method === 'cash') {
                openCashDrawer(settings.printer).catch((err) =>
                    console.error('[CashDrawer] Failed to open drawer:', err),
                );
            }

            // Remove the paid row from planner
            setPaymentRows(prev => prev.filter(r => r.id !== rowId));

            // If fully paid, auto-forward/complete
            if (res.data.paymentStatus === 'paid' || isFullyPaid) {
                try {
                    await ordersAPI.updateStatus(order._id, 'completed', 'Payment fully collected');
                    toast.success('Order completed and fully paid!');
                    onSuccess();
                    onClose();
                } catch (completeErr) {
                    console.error('Failed to auto-complete order:', completeErr);
                    // Update state so the user can manually click complete if auto-complete failed
                    setOrder(res.data);
                }
            } else {
                setOrder(res.data);
            }
        } catch (error: any) {
            console.error('Error adding payment:', error);
            toast.error(error.response?.data?.message || 'Failed to add payment slice');
        } finally {
            setLoading(false);
            setStripeModalOpen(false);
            setProcessingRowId(null);
        }
    };

    const handleRemoveSplit = async (paymentId: string) => {
        if (!window.confirm('Are you sure you want to void this payment?')) return;
        setLoading(true);
        try {
            const res = await ordersAPI.removePaymentSplit(order._id, paymentId);
            toast.success('Payment removed');
            setOrder(res.data);
        } catch (error: any) {
            toast.error('Failed to remove payment');
        } finally {
            setLoading(false);
        }
    };

    const handleApplyRewards = async () => {
        if (!rewardPointsInfo) return;
        if (totalPaid > 0) {
            toast.error("Reward points cannot be applied after payment collection has started.");
            return;
        }

        setIsApplyingRewards(true);
        try {
            const res = await (ordersAPI as any).update(order._id, {
                loyaltyPoints: {
                    pointsUsed: pointsToRedeem
                }
            });
            toast.success('Reward points applied!');
            setOrder(res.data);
        } catch (err: any) {
            console.error('Failed to apply rewards:', err);
            toast.error(err.response?.data?.message || 'Failed to apply rewards');
        } finally {
            setIsApplyingRewards(false);
        }
    };

    const handleRemoveRewards = async () => {
        if (!rewardPointsInfo) return;
        if (totalPaid > 0) {
            toast.error("Reward points cannot be applied after payment collection has started.");
            return;
        }

        setIsApplyingRewards(true);
        try {
            const res = await (ordersAPI as any).update(order._id, {
                loyaltyPoints: {
                    pointsUsed: 0
                }
            });
            toast.success('Reward points removed!');
            setOrder(res.data);
            setPointsToRedeem(0);
        } catch (err: any) {
            console.error('Failed to remove rewards:', err);
            toast.error(err.response?.data?.message || 'Failed to remove rewards');
        } finally {
            setIsApplyingRewards(false);
        }
    };

    const handleCompleteOrder = async () => {
        setLoading(true);
        try {
            // Already fully paid, we just mark order completed explicitly
            await ordersAPI.updateStatus(order._id, 'completed', 'Payment fully collected');
            toast.success('Order completed and fully paid!');
            onSuccess();
            onClose();
        } catch (error: any) {
            toast.error('Failed to complete order');
        } finally {
            setLoading(false);
        }
    };

    const handleCardPayment = (rowId: string) => {
        const row = calculatedRows.find(r => r.id === rowId);
        if (!row) return;

        const amt = parseFloat(row.amount) || 0;
        if (amt <= 0 || amt > amountDue + 0.01) {
            toast.error('Invalid payment amount');
            return;
        }
        setProcessingRowId(rowId);
        setStripeModalOpen(true);
    };

    return (
        <>
            <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
                <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    Collect Payment
                    <IconButton onClick={onClose} size="small">
                        <CloseIcon />
                    </IconButton>
                </DialogTitle>

                <DialogContent dividers>
                    {/* Order Info & Ledger balances */}
                    <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between' }}>
                        <Box>
                            <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                                Order #{order.orderNumber?.split('-').pop() || order._id.slice(-6)}
                            </Typography>
                            <Typography variant="h4" fontWeight="bold" color="primary">
                                {formatCurrency(order?.totalAmount)}
                            </Typography>
                        </Box>
                        <Box textAlign="right">
                            <Typography variant="subtitle2" color="success.main" gutterBottom>
                                Paid: {formatCurrency(totalPaid)}
                            </Typography>
                            <Typography variant="h5" color={amountDue === 0 ? "success.main" : "error.main"} fontWeight="bold">
                                Due: {formatCurrency(amountDue)}
                            </Typography>
                        </Box>
                    </Box>

                    {/* Previously Successful Payments List */}
                    {order.payments && order.payments.length > 0 && (
                        <Box sx={{ mb: 2 }}>
                            <Typography variant="subtitle2" color="text.secondary">Applied Payments</Typography>
                            <Paper variant="outlined" sx={{ mt: 1 }}>
                                <List dense>
                                    {order.payments.map((p: any) => (
                                        <ListItem key={p._id}>
                                            <ListItemText
                                                primary={`${p.method?.toUpperCase() || 'UNKNOWN'} Payment`}
                                                secondary={new Date(p.recordedAt || p.createdAt).toLocaleString()}
                                            />
                                            <ListItemSecondaryAction>
                                                <Typography variant="body2" component="span" sx={{ mr: 2, fontWeight: 'bold' }}>
                                                    {formatCurrency(p.amount)}
                                                </Typography>
                                                <IconButton edge="end" color="error" size="small" onClick={() => handleRemoveSplit(p._id)}>
                                                    <DeleteIcon />
                                                </IconButton>
                                            </ListItemSecondaryAction>
                                        </ListItem>
                                    ))}
                                </List>
                            </Paper>
                        </Box>
                    )}

                    <Divider sx={{ my: 2 }} />

                    {/* Payment Entry (Hidden if fully paid) */}
                    {amountDue > 0 ? (
                        <>
                            {/* Tip Selection Section */}
                            <Box sx={{ mb: 3 }}>
                                <Typography variant="subtitle2" fontWeight="bold" gutterBottom>
                                    Add Tip (Optional)
                                </Typography>
                                <Stack direction="row" spacing={1} flexWrap="wrap" sx={{ gap: 1 }}>
                                    {[5, 10, 15, 20].map((rate) => (
                                        <Button
                                            key={rate}
                                            variant={tipPercent === rate && !isCustomActive ? "contained" : "outlined"}
                                            size="small"
                                            sx={{ 
                                                minWidth: '65px', 
                                                borderRadius: 2,
                                                textTransform: 'none',
                                                fontWeight: 'medium'
                                            }}
                                            onClick={() => {
                                                setCustomTipAmount('');
                                                setTipPercent(rate);
                                                setIsCustomActive(false);
                                            }}
                                        >
                                            {rate}%
                                        </Button>
                                    ))}
                                    <Button
                                        variant={tipPercent === 0 && !isCustomActive ? "contained" : "outlined"}
                                        size="small"
                                        sx={{ 
                                            minWidth: '75px', 
                                            borderRadius: 2,
                                            textTransform: 'none',
                                            fontWeight: 'medium'
                                        }}
                                        onClick={() => {
                                            setTipPercent(0);
                                            setCustomTipAmount('');
                                            setIsCustomActive(false);
                                        }}
                                    >
                                        No Tip
                                    </Button>
                                    <Button
                                        variant={isCustomActive ? "contained" : "outlined"}
                                        size="small"
                                        sx={{ 
                                            minWidth: '100px', 
                                            borderRadius: 2,
                                            textTransform: 'none',
                                            fontWeight: 'medium'
                                        }}
                                        onClick={() => {
                                            setTipPercent(0);
                                            setIsCustomActive(true);
                                        }}
                                    >
                                        Other Amount
                                    </Button>
                                </Stack>
                                
                                {isCustomActive && (
                                    <Box sx={{ 
                                        mt: 1.5, 
                                        p: 1.5, 
                                        borderRadius: 2, 
                                        bgcolor: 'action.hover', 
                                        border: '1px solid', 
                                        borderColor: 'divider',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: 2
                                    }}>
                                        <TextField
                                            label="Other Tip Amount"
                                            type="number"
                                            size="small"
                                            placeholder="0.00"
                                            autoFocus
                                            value={customTipAmount}
                                            onChange={(e) => setCustomTipAmount(e.target.value)}
                                            InputProps={{
                                                startAdornment: <InputAdornment position="start">{isIndia ? '₹' : '$'}</InputAdornment>,
                                            }}
                                            sx={{ 
                                                width: '100%',
                                                '& .MuiOutlinedInput-root': {
                                                    borderRadius: 1.5,
                                                    bgcolor: 'background.paper'
                                                }
                                            }}
                                            inputProps={{ min: 0, step: 0.01 }}
                                        />
                                    </Box>
                                )}
                                
                                {pendingTipAmount > 0 && (
                                    <Typography variant="caption" color="success.main" sx={{ mt: 0.5, display: 'block', fontWeight: 'bold' }}>
                                        + {formatCurrency(pendingTipAmount)} Tip Selected
                                    </Typography>
                                )}
                            </Box>

                            {/* Reward Points Section */}
                            {(rewardPointsInfo || isFetchingRewards) && (
                                <Accordion
                                    expanded={rewardsExpanded}
                                    onChange={(e, expanded) => setRewardsExpanded(expanded)}
                                    disableGutters
                                    elevation={0}
                                    sx={{
                                        mb: 3,
                                        border: '1px dashed',
                                        borderColor: 'primary.main',
                                        borderRadius: '8px !important',
                                        bgcolor: 'rgba(25, 118, 210, 0.04)',
                                        '&:before': { display: 'none' }
                                    }}
                                >
                                    <AccordionSummary
                                        expandIcon={<ExpandMoreIcon color="primary" />}
                                        sx={{ px: 2, minHeight: 48, '&.Mui-expanded': { minHeight: 48 } }}
                                    >
                                        <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" sx={{ width: '100%', pr: 1 }}>
                                            <Typography variant="subtitle2" fontWeight="bold" color="primary">
                                                Redeem Reward Points
                                            </Typography>
                                            {isFetchingRewards && (
                                                <CircularProgress size={14} />
                                            )}
                                            {!isFetchingRewards && hasAppliedRewards && (
                                                <Chip
                                                    label={`Applied: ${order.loyaltyPoints?.pointsUsed} pts (-${formatCurrency(order.rewardDiscount)})`}
                                                    size="small"
                                                    color="success"
                                                    sx={{ height: 20, fontSize: '0.65rem', fontWeight: 'bold' }}
                                                />
                                            )}
                                            {!isFetchingRewards && !hasAppliedRewards && rewardPointsInfo && rewardPointsInfo.points > 0 && (
                                                <Chip
                                                    label={`${rewardPointsInfo.points} pts available`}
                                                    size="small"
                                                    color="primary"
                                                    variant="outlined"
                                                    sx={{ height: 20, fontSize: '0.65rem', bgcolor: 'background.paper' }}
                                                />
                                            )}
                                        </Stack>
                                    </AccordionSummary>
                                    <AccordionDetails sx={{ px: 2, pb: 2, pt: 0 }}>
                                        {isFetchingRewards ? (
                                            <Stack direction="row" spacing={1} alignItems="center" justifyContent="center" sx={{ py: 1 }}>
                                                <CircularProgress size={16} />
                                                <Typography variant="body2">Fetching customer rewards...</Typography>
                                            </Stack>
                                        ) : (
                                            <Box>
                                                {hasAppliedRewards ? (
                                                    <Box sx={{ mt: 1 }}>
                                                        <Typography variant="body2" sx={{ mb: 1.5 }}>
                                                            Applied: <strong>{order.loyaltyPoints?.pointsUsed} pts</strong>
                                                            <Chip
                                                                label={`-$${order.rewardDiscount || 0} Discount`}
                                                                size="small"
                                                                color="success"
                                                                sx={{ height: 18, ml: 1, fontSize: '0.6rem', fontWeight: 'bold' }}
                                                            />
                                                        </Typography>
                                                        <Button
                                                            variant="outlined"
                                                            color="error"
                                                            size="small"
                                                            fullWidth
                                                            onClick={handleRemoveRewards}
                                                            disabled={isApplyingRewards || totalPaid > 0}
                                                        >
                                                            {isApplyingRewards ? 'Removing...' : 'Remove Applied Reward Points'}
                                                        </Button>
                                                        {totalPaid > 0 && (
                                                            <Typography variant="caption" color="error.main" sx={{ mt: 1, display: 'block', fontWeight: 'medium' }}>
                                                                Reward points cannot be applied after payment collection has started.
                                                            </Typography>
                                                        )}
                                                    </Box>
                                                ) : (
                                                    <Stack direction="row" spacing={2} alignItems="flex-start" sx={{ mt: 1 }}>
                                                        <Box sx={{ flexGrow: 1 }}>
                                                            <Typography variant="body2">
                                                                Balance: <strong>{rewardPointsInfo?.points || 0} pts</strong>
                                                                <Chip
                                                                    label={`$${rewardPointsInfo?.dollarValue || 0} Value`}
                                                                    size="small"
                                                                    color="success"
                                                                    variant="outlined"
                                                                    sx={{ height: 18, ml: 1, fontSize: '0.6rem' }}
                                                                />
                                                            </Typography>
                                                            <TextField
                                                                margin="dense"
                                                                label="Points to Redeem"
                                                                type="number"
                                                                size="small"
                                                                fullWidth
                                                                value={pointsToRedeem || ''}
                                                                onChange={(e) => setPointsToRedeem(Math.min(maxUsablePoints, Math.max(0, parseInt(e.target.value) || 0)))}
                                                                inputProps={{ min: 0, max: maxUsablePoints }}
                                                                disabled={!rewardPointsInfo || rewardPointsInfo.points === 0 || (rewardPointsInfo.points < (rewardPointsInfo.settings?.minPointsToRedeem || 0)) || totalPaid > 0}
                                                            />
                                                            {rewardPointsInfo?.settings?.minPointsToRedeem > 0 && (
                                                                <Typography variant="caption" color="text.secondary">
                                                                    Min. {rewardPointsInfo.settings.minPointsToRedeem} pts required.
                                                                </Typography>
                                                            )}
                                                            {totalPaid > 0 && (
                                                                <Typography variant="caption" color="error.main" sx={{ mt: 1, display: 'block', fontWeight: 'medium' }}>
                                                                    Reward points cannot be applied after payment collection has started.
                                                                </Typography>
                                                            )}
                                                        </Box>
                                                        <Stack spacing={1} sx={{ mt: 3.5 }}>
                                                            <Button
                                                                variant="outlined"
                                                                size="small"
                                                                onClick={() => setPointsToRedeem(maxUsablePoints)}
                                                                disabled={maxUsablePoints === 0 || (rewardPointsInfo && rewardPointsInfo.points < (rewardPointsInfo.settings?.minPointsToRedeem || 0)) || totalPaid > 0}
                                                            >
                                                                Max
                                                            </Button>
                                                            <Button
                                                                variant="contained"
                                                                size="small"
                                                                onClick={handleApplyRewards}
                                                                disabled={isApplyingRewards || pointsToRedeem <= 0 || totalPaid > 0}
                                                            >
                                                                {isApplyingRewards ? '...' : 'Apply'}
                                                            </Button>
                                                        </Stack>
                                                    </Stack>
                                                )}
                                            </Box>
                                        )}
                                    </AccordionDetails>
                                </Accordion>
                            )}

                            <Divider sx={{ my: 2 }} />

                            {hasAppliedRewards && (
                                <Alert severity="info" sx={{ mb: 2, borderRadius: 2 }}>
                                    Reward points applied: <strong>{order.loyaltyPoints?.pointsUsed} points</strong> (<strong>{formatCurrency(order.rewardDiscount)}</strong> discount).
                                    {paymentRows.length > 1 && " Please review and adjust the split payment amounts below to match the new remaining due."}
                                </Alert>
                            )}

                            {/* Split Bill Planner Section */}
                            <Box sx={{ mb: 3 }}>
                                <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
                                    <Typography variant="subtitle2" fontWeight="bold">
                                        Split Bill Planner
                                    </Typography>
                                    <Stack direction="row" spacing={1}>
                                        <Button size="small" variant="outlined" sx={{ borderRadius: 2 }} onClick={() => handleQuickSplit(2)}>
                                            2-Ways
                                        </Button>
                                        <Button size="small" variant="outlined" sx={{ borderRadius: 2 }} onClick={() => handleQuickSplit(3)}>
                                            3-Ways
                                        </Button>
                                        <Button size="small" variant="outlined" sx={{ borderRadius: 2 }} onClick={() => handleQuickSplit(4)}>
                                            4-Ways
                                        </Button>
                                        <Button
                                            size="small"
                                            variant="contained"
                                            sx={{ borderRadius: 2 }}
                                            onClick={handleAddRow}
                                            startIcon={<AddIcon />}
                                            disabled={paymentRows.length >= MAX_SPLIT_PAYERS}
                                        >
                                            Add Split
                                        </Button>
                                    </Stack>
                                </Stack>

                                {/* Segment Switcher & Equal Action */}
                                <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2, gap: 1 }}>
                                    <ToggleButtonGroup
                                        value={splitMode}
                                        exclusive
                                        onChange={(_, value) => handleSplitModeChange(value)}
                                        size="small"
                                        color="primary"
                                        sx={{
                                            bgcolor: 'background.paper',
                                            '& .MuiToggleButton-root': {
                                                px: 2,
                                                py: 0.5,
                                                textTransform: 'none',
                                                fontWeight: 'medium',
                                            }
                                        }}
                                    >
                                        <ToggleButton value="amount">
                                            {isIndia ? '₹' : '$'} Amount
                                        </ToggleButton>
                                        <ToggleButton value="share">
                                            <Stack direction="row" spacing={0.5} alignItems="center">
                                                <ShareIcon sx={{ fontSize: '0.9rem' }} />
                                                <span>Share</span>
                                            </Stack>
                                        </ToggleButton>
                                        <ToggleButton value="percent">
                                            % Percent
                                        </ToggleButton>
                                    </ToggleButtonGroup>

                                    <Button
                                        size="small"
                                        variant="text"
                                        startIcon={<ResetIcon sx={{ fontSize: '0.9rem' }} />}
                                        onClick={handleSplitEqually}
                                        sx={{ textTransform: 'none', fontWeight: 'medium' }}
                                    >
                                        Split Equally
                                    </Button>
                                </Stack>

                                {/* Allocation Alert Status */}
                                <Alert 
                                    severity={validationAlert.severity}
                                    sx={{ mb: 2, py: 0.5, borderRadius: 2 }}
                                >
                                    {validationAlert.text}
                                </Alert>

                                {/* Payment Rows List */}
                                <Stack spacing={2}>
                                    {calculatedRows.map((row, index) => {
                                        const amt = parseFloat(row.amount) || 0;
                                        const isRowAmountInvalid = amt <= 0 || amt > amountDue + 0.01;
                                        return (
                                            <Paper 
                                                key={row.id} 
                                                variant="outlined" 
                                                sx={{ 
                                                    p: 2, 
                                                    display: 'flex', 
                                                    flexDirection: 'column', 
                                                    gap: 1.5,
                                                    position: 'relative',
                                                    borderRadius: 2,
                                                    borderColor: processingRowId === row.id ? 'primary.main' : row.isLocked ? 'primary.light' : 'divider',
                                                    bgcolor: processingRowId === row.id ? 'action.hover' : row.isLocked ? 'rgba(25, 118, 210, 0.02)' : 'background.paper',
                                                    borderWidth: row.isLocked ? 1.5 : 1
                                                }}
                                            >
                                                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                    <Typography variant="caption" color={row.isLocked ? "primary.main" : "text.secondary"} fontWeight="bold">
                                                        Part #{index + 1} {row.isLocked && "(Locked)"}
                                                    </Typography>
                                                    <IconButton 
                                                        size="small" 
                                                        color="error" 
                                                        onClick={() => handleRemoveRow(row.id)}
                                                        disabled={loading || paymentRows.length <= 1}
                                                    >
                                                        <DeleteIcon fontSize="small" />
                                                    </IconButton>
                                                </Box>
 
                                                <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', alignItems: 'center' }}>
                                                    {/* Mode specific allocation selector */}
                                                    {splitMode === 'amount' && (
                                                        <Stack direction="row" alignItems="center" spacing={0.5}>
                                                            <TextField
                                                                label="Amount"
                                                                type="number"
                                                                size="small"
                                                                value={row.amount}
                                                                onChange={(e) => handleUpdateRowAmount(row.id, e.target.value)}
                                                                disabled={loading}
                                                                sx={{ width: '110px' }}
                                                                inputProps={{ min: 0.01, step: 0.01 }}
                                                            />
                                                            <IconButton
                                                                size="small"
                                                                disabled={loading || paymentRows.length <= 1}
                                                                onClick={() => {
                                                                    setPaymentRows(prev => {
                                                                        const next = prev.map(r => r.id === row.id ? { ...r, isLocked: !r.isLocked } : r);
                                                                        return redistributeRows(next, 'amount', amountDue);
                                                                    });
                                                                }}
                                                                color={row.isLocked ? "primary" : "default"}
                                                                title={row.isLocked ? "Locked. Click to unlock." : "Unlocked. Click to lock."}
                                                            >
                                                                {row.isLocked ? <LockIcon fontSize="small" /> : <LockOpenIcon fontSize="small" />}
                                                            </IconButton>
                                                        </Stack>
                                                    )}
 
                                                    {splitMode === 'share' && (
                                                        <Stack direction="row" alignItems="center" spacing={1} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 1.5, px: 1, py: 0.5, height: 40 }}>
                                                            <IconButton 
                                                                size="small" 
                                                                onClick={() => {
                                                                    const currentShares = Math.max(1, Math.round(parseFloat(row.shares) || 1) - 1);
                                                                    handleUpdateRow(row.id, { shares: currentShares.toString() });
                                                                }}
                                                                disabled={loading || (parseFloat(row.shares) || 1) <= 1}
                                                            >
                                                                <MinusIcon fontSize="small" />
                                                            </IconButton>
                                                            <Typography variant="body2" fontWeight="bold" sx={{ minWidth: 20, textAlign: 'center' }}>
                                                                {row.shares}
                                                            </Typography>
                                                            <IconButton 
                                                                size="small" 
                                                                onClick={() => {
                                                                    const currentShares = Math.round(parseFloat(row.shares) || 1) + 1;
                                                                    handleUpdateRow(row.id, { shares: currentShares.toString() });
                                                                }}
                                                                disabled={loading}
                                                            >
                                                                <PlusIcon fontSize="small" />
                                                            </IconButton>
                                                        </Stack>
                                                    )}
 
                                                    {splitMode === 'percent' && (
                                                        <Stack direction="row" alignItems="center" spacing={0.5}>
                                                            <TextField
                                                                label="Percent"
                                                                type="number"
                                                                size="small"
                                                                value={row.percent}
                                                                onChange={(e) => handleUpdateRowPercent(row.id, e.target.value)}
                                                                disabled={loading}
                                                                sx={{ width: '100px' }}
                                                                InputProps={{
                                                                    endAdornment: <InputAdornment position="end">%</InputAdornment>,
                                                                }}
                                                                inputProps={{ min: 0, max: 100, step: 0.01 }}
                                                            />
                                                            <IconButton
                                                                size="small"
                                                                disabled={loading || paymentRows.length <= 1}
                                                                onClick={() => {
                                                                    setPaymentRows(prev => {
                                                                        const next = prev.map(r => r.id === row.id ? { ...r, isLocked: !r.isLocked } : r);
                                                                        return redistributeRows(next, 'percent', amountDue);
                                                                    });
                                                                }}
                                                                color={row.isLocked ? "primary" : "default"}
                                                                title={row.isLocked ? "Locked. Click to unlock." : "Unlocked. Click to lock."}
                                                            >
                                                                {row.isLocked ? <LockIcon fontSize="small" /> : <LockOpenIcon fontSize="small" />}
                                                            </IconButton>
                                                        </Stack>
                                                    )}

                                                    {/* Calculated read-only amount for share/percent modes */}
                                                    {splitMode !== 'amount' && (
                                                        <Box sx={{ minWidth: 70 }}>
                                                            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', lineHeight: 1 }}>
                                                                Amount
                                                            </Typography>
                                                            <Typography variant="body2" fontWeight="bold" color="primary.main">
                                                                {formatCurrency(amt)}
                                                            </Typography>
                                                        </Box>
                                                    )}

                                                    <FormControl size="small" sx={{ minWidth: '120px', flexGrow: 1 }}>
                                                        <Select
                                                            value={row.method}
                                                            onChange={(e) => handleUpdateRow(row.id, { method: e.target.value })}
                                                            disabled={loading}
                                                        >
                                                            {availableMethods.map((m) => (
                                                                <MenuItem key={m.val} value={m.val}>
                                                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                                                        {m.icon}
                                                                        <Typography variant="body2">{m.title}</Typography>
                                                                    </Box>
                                                                </MenuItem>
                                                            ))}
                                                        </Select>
                                                    </FormControl>

                                                    <TextField
                                                        label="Ref ID (Opt.)"
                                                        size="small"
                                                        value={row.transactionId}
                                                        onChange={(e) => {
                                                            const sanitized = e.target.value.replace(/[^a-zA-Z0-9]/g, '').slice(0, 50);
                                                            handleUpdateRow(row.id, { transactionId: sanitized });
                                                        }}
                                                        disabled={loading || row.method === 'card'}
                                                        inputProps={{ maxLength: 50 }}
                                                        sx={{ width: '100px', flexGrow: 1 }}
                                                    />

                                                    <Button
                                                        variant="contained"
                                                        size="small"
                                                        onClick={() => {
                                                            if (row.method === 'card') {
                                                                handleCardPayment(row.id);
                                                            } else {
                                                                handleAddSplit(row.id);
                                                            }
                                                        }}
                                                        disabled={loading || isRowAmountInvalid}
                                                    >
                                                        {row.method === 'card' ? 'Pay Card' : 'Collect'}
                                                    </Button>
                                                </Box>

                                                {/* QR Code Display for Dynamic Digital Payments */}
                                                {(() => {
                                                    const currentMethod = row.method;
                                                    const qrCodeUrl = settings?.system?.paymentQrCodes?.[currentMethod];
                                                    const isQrMethod = !['cash', 'card', 'cheque', 'creditCard', 'debitCard'].includes(currentMethod);
                                                    
                                                    if (isQrMethod) {
                                                        const methodTitle = availableMethods.find(m => m.val === currentMethod)?.title || currentMethod;
                                                        return (
                                                            <Box sx={{ 
                                                                display: 'flex', 
                                                                flexDirection: 'column', 
                                                                alignItems: 'center', 
                                                                gap: 1, 
                                                                p: 2, 
                                                                border: '1px dashed', 
                                                                borderColor: qrCodeUrl ? 'divider' : 'warning.light', 
                                                                borderRadius: 2, 
                                                                bgcolor: 'background.paper', 
                                                                mt: 1.5,
                                                                maxWidth: '300px',
                                                                mx: 'auto',
                                                                width: '100%'
                                                            }}>
                                                                {qrCodeUrl ? (
                                                                    <>
                                                                        <Typography variant="caption" color="text.secondary" fontWeight="bold">
                                                                            Scan QR to pay {formatCurrency(amt)} via {methodTitle}
                                                                        </Typography>
                                                                        <Box sx={{ width: 140, height: 140, display: 'flex', justifyContent: 'center', alignItems: 'center', overflow: 'hidden', border: '1px solid', borderColor: 'divider', borderRadius: 1, p: 0.5, bgcolor: '#fff' }}>
                                                                            <img src={qrCodeUrl} alt={`${methodTitle} QR`} style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} />
                                                                        </Box>
                                                                    </>
                                                                ) : (
                                                                    <Typography variant="caption" color="warning.main" fontWeight="bold" align="center">
                                                                        No QR Code configured for {methodTitle} in POS Settings.
                                                                    </Typography>
                                                                )}
                                                            </Box>
                                                        );
                                                    }
                                                    return null;
                                                })()}
                                            </Paper>
                                        );
                                    })}
                                </Stack>
                            </Box>
                        </>
                    ) : (
                        <Alert severity="success" sx={{ mt: 2, py: 2, fontSize: '1.2rem', display: 'flex', justifyContent: 'center' }}>
                            Order is Fully Paid! This order is ready to be completed.
                        </Alert>
                    )}
                </DialogContent>

                <DialogActions>
                    <Button onClick={onClose} disabled={loading}>
                        {amountDue > 0 ? "Cancel" : "Close"}
                    </Button>

                    {amountDue === 0 && (
                        <Button
                            onClick={handleCompleteOrder}
                            variant="contained"
                            color="success"
                            disabled={loading}
                        >
                            Complete Order & Print Receipt
                        </Button>
                    )}
                </DialogActions>
            </Dialog>

            <PaymentModal
                open={stripeModalOpen}
                onClose={() => {
                    setStripeModalOpen(false);
                    setProcessingRowId(null);
                }}
                amount={processingRowId ? (parseFloat(calculatedRows.find(r => r.id === processingRowId)?.amount || '0') || 0) : 0}
                onSuccess={(intentId) => {
                    if (processingRowId) {
                        handleAddSplit(processingRowId, intentId);
                    }
                }}
            />
        </>
    );
};

export default PaymentCollectionDialog;

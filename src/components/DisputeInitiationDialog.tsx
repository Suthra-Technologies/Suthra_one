import React, { useEffect, useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  MenuItem,
  Stack,
  Typography,
  Box,
  IconButton,
  Checkbox,
  Chip,
  Paper,
} from '@mui/material';
import { Close as CloseIcon, Gavel, Add, Remove } from '@mui/icons-material';
import { disputesAPI } from '../services/api';
import { toast } from 'react-hot-toast';
import { useSettings } from '../context/SettingsContext';

interface DisputeInitiationDialogProps {
  open: boolean;
  order: any;
  onClose: () => void;
  onSuccess: () => void;
}

const round2 = (n: number) => Math.round(n * 100) / 100;

// Amount still open to dispute: order total minus anything already refunded
const getDisputableAmount = (order: any): number => {
  const total = Number(order?.totalAmount || 0);
  const refunds = Array.isArray(order?.refunds) ? order.refunds : [];
  const refunded = refunds.reduce(
    (sum: number, r: any) => sum + Number(r?.amount ?? r?.totalRefundAmount ?? 0),
    0,
  );
  return Math.max(0, total - refunded);
};

// Selected items' subtotal plus their proportional share of the order tax —
// mirrors the backend/item-refund calculation exactly
const computeItemsAmount = (order: any, selected: Record<number, number>): number => {
  const items: any[] = order?.items || [];
  const itemsSubtotal = Object.entries(selected).reduce(
    (sum, [idx, qty]) => sum + Number(items[Number(idx)]?.price || 0) * qty,
    0,
  );
  const orderSubtotal = Number(order?.subtotal)
    || items.reduce((sum, i) => sum + Number(i.price || 0) * Number(i.quantity || 0), 0);
  const taxAmount = Number(order?.tax?.amount || 0);
  const proportionalTax = orderSubtotal > 0 ? (itemsSubtotal / orderSubtotal) * taxAmount : 0;
  return round2(itemsSubtotal + proportionalTax);
};

const DisputeInitiationDialog: React.FC<DisputeInitiationDialogProps> = ({
  open,
  order,
  onClose,
  onSuccess,
}) => {
  const { formatCurrency } = useSettings();
  const [loading, setLoading] = useState(false);
  const [submitAttempted, setSubmitAttempted] = useState(false);
  // itemIndex → disputed quantity; empty = whole-order dispute with manual amount
  const [selectedItems, setSelectedItems] = useState<Record<number, number>>({});
  const [formData, setFormData] = useState({
    reason: 'price_error',
    description: '',
    disputedAmount: '',
  });

  const maxAmount = getDisputableAmount(order);
  const orderItems: any[] = order?.items || [];
  const hasItemSelection = Object.keys(selectedItems).length > 0;

  // Reset the form each time the dialog opens so state never leaks between orders/opens
  useEffect(() => {
    if (open) {
      setSelectedItems({});
      setFormData({
        reason: 'price_error',
        description: '',
        disputedAmount: getDisputableAmount(order).toFixed(2),
      });
      setSubmitAttempted(false);
    }
  }, [open, order?._id]);

  const applySelection = (next: Record<number, number>) => {
    setSelectedItems(next);
    const amount = Object.keys(next).length > 0
      ? computeItemsAmount(order, next)
      : getDisputableAmount(order);
    setFormData((prev) => ({ ...prev, disputedAmount: amount.toFixed(2) }));
  };

  // Quantity still open to dispute on an item (ordered minus already under active dispute)
  const getAvailableQty = (item: any): number =>
    Math.max(0, Number(item?.quantity || 0) - Number(item?.disputedQuantity || 0));

  const toggleItem = (idx: number) => {
    const next = { ...selectedItems };
    if (next[idx] !== undefined) {
      delete next[idx];
    } else {
      if (getAvailableQty(orderItems[idx]) <= 0) return;
      next[idx] = 1;
    }
    applySelection(next);
  };

  const changeQty = (idx: number, delta: number) => {
    const max = getAvailableQty(orderItems[idx]) || 1;
    const current = selectedItems[idx] ?? 0;
    const nextQty = Math.min(max, Math.max(1, current + delta));
    applySelection({ ...selectedItems, [idx]: nextQty });
  };

  const parsedAmount = parseFloat(formData.disputedAmount);
  const amountTooHigh = !isNaN(parsedAmount) && parsedAmount > maxAmount;
  const amountInvalid = isNaN(parsedAmount) || parsedAmount <= 0;
  const descriptionMissing = !formData.description.trim();

  const handleSubmit = async () => {
    if (loading) return;
    setSubmitAttempted(true);

    // A whole-order dispute can't stack on top of existing active disputes
    if (order?.isDisputed && !hasItemSelection) {
      toast.error('This order already has an active dispute — select the specific items you are disputing');
      return;
    }

    if (amountInvalid) {
      toast.error('Please enter a valid amount greater than 0');
      return;
    }

    if (amountTooHigh) {
      toast.error(`Disputed amount cannot exceed ${formatCurrency(maxAmount)}`);
      return;
    }

    if (descriptionMissing) {
      toast.error('Please provide a description');
      return;
    }

    setLoading(true);
    try {
      await disputesAPI.create({
        orderId: order._id,
        reason: formData.reason,
        description: formData.description.trim(),
        disputedAmount: round2(parsedAmount),
        ...(hasItemSelection
          ? {
              items: Object.entries(selectedItems).map(([itemIndex, quantity]) => ({
                itemIndex: Number(itemIndex),
                quantity,
              })),
            }
          : {}),
      });
      toast.success('Dispute initiated successfully');
      onSuccess();
    } catch (error: any) {
      const message = error.response?.data?.message;
      toast.error(Array.isArray(message) ? message[0] : message || 'Failed to initiate dispute');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Gavel color="error" />
          <Typography variant="h6">Initiate Dispute</Typography>
        </Box>
        <IconButton onClick={onClose} size="small">
          <CloseIcon />
        </IconButton>
      </DialogTitle>
      <DialogContent dividers>
        <Stack spacing={3} sx={{ mt: 1 }}>
          <Typography variant="body2" color="text.secondary">
            You are initiating a formal dispute for Order <strong>#{order?.orderNumber}</strong>.
            This will be tracked for financial audit.
          </Typography>

          <TextField
            select
            fullWidth
            label="Reason for Dispute"
            value={formData.reason}
            onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
          >
            <MenuItem value="price_error">Billing/Price Error</MenuItem>
            <MenuItem value="item_missing">Item Missing</MenuItem>
            <MenuItem value="service_issue">Service Issue</MenuItem>
            <MenuItem value="quality_issue">Quality Issue</MenuItem>
            <MenuItem value="unauthorized_charge">Unauthorized Charge</MenuItem>
            <MenuItem value="other">Other</MenuItem>
          </TextField>

          {orderItems.length > 0 && (
            <Box>
              <Typography variant="caption" color="text.secondary" fontWeight={700} sx={{ textTransform: 'uppercase' }}>
                Disputed Items (optional)
              </Typography>
              <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 1 }}>
                Select the items and quantities in question — the amount is calculated automatically.
              </Typography>
              <Paper variant="outlined">
                {orderItems.map((item: any, idx: number) => {
                  const cancelled = item.preparationStatus === 'cancelled';
                  const availableQty = getAvailableQty(item);
                  const disputedQty = Number(item.disputedQuantity || 0);
                  const disabled = cancelled || availableQty <= 0;
                  const checked = selectedItems[idx] !== undefined;
                  const qty = selectedItems[idx] ?? 1;
                  return (
                    <Box
                      key={idx}
                      sx={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 1,
                        px: 1,
                        py: 0.5,
                        borderBottom: idx < orderItems.length - 1 ? '1px solid' : 'none',
                        borderColor: 'divider',
                        opacity: disabled ? 0.55 : 1,
                      }}
                    >
                      <Checkbox size="small" checked={checked} onChange={() => toggleItem(idx)} disabled={disabled} />
                      <Box sx={{ flex: 1, minWidth: 0 }}>
                        <Typography
                          variant="body2"
                          noWrap
                          sx={cancelled ? { textDecoration: 'line-through' } : undefined}
                        >
                          {item.name}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {formatCurrency(Number(item.price || 0))} × {item.quantity} ordered
                        </Typography>
                      </Box>
                      {cancelled ? (
                        <Chip label="CANCELLED" size="small" variant="outlined" sx={{ height: 20, fontSize: '0.65rem' }} />
                      ) : disputedQty > 0 && (
                        <Chip
                          label={availableQty <= 0 ? 'IN DISPUTE' : `${disputedQty} IN DISPUTE`}
                          size="small"
                          color="error"
                          variant="outlined"
                          sx={{ height: 20, fontSize: '0.65rem' }}
                        />
                      )}
                      {checked && !disabled && (
                        <Stack direction="row" alignItems="center" spacing={0.5}>
                          <IconButton size="small" onClick={() => changeQty(idx, -1)} disabled={qty <= 1}>
                            <Remove fontSize="inherit" />
                          </IconButton>
                          <Typography variant="body2" sx={{ minWidth: 20, textAlign: 'center' }}>{qty}</Typography>
                          <IconButton size="small" onClick={() => changeQty(idx, 1)} disabled={qty >= availableQty}>
                            <Add fontSize="inherit" />
                          </IconButton>
                        </Stack>
                      )}
                    </Box>
                  );
                })}
              </Paper>
            </Box>
          )}

          <TextField
            fullWidth
            required
            label="Disputed Amount"
            type="number"
            value={formData.disputedAmount}
            onChange={(e) => setFormData({ ...formData, disputedAmount: e.target.value })}
            onBlur={() => {
                const parsed = parseFloat(formData.disputedAmount);
                if (!isNaN(parsed)) {
                    setFormData({ ...formData, disputedAmount: parsed.toFixed(2) });
                }
            }}
            InputProps={{ readOnly: hasItemSelection }}
            inputProps={{ step: 0.01, min: 0.01, max: maxAmount }}
            error={amountTooHigh || (submitAttempted && amountInvalid)}
            helperText={
                amountTooHigh
                    ? `Cannot exceed disputable balance (${formatCurrency(maxAmount)})`
                    : submitAttempted && amountInvalid
                        ? 'Amount must be greater than 0'
                        : hasItemSelection
                            ? 'Auto-calculated from selected items + proportional tax'
                            : `Disputable balance: ${formatCurrency(maxAmount)}`
            }
          />

          <TextField
            fullWidth
            required
            multiline
            rows={4}
            label="Description / Details"
            placeholder="Explain the issue in detail..."
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            error={submitAttempted && descriptionMissing}
            helperText={submitAttempted && descriptionMissing ? 'Description is required' : ''}
          />
        </Stack>
      </DialogContent>
      <DialogActions sx={{ p: 2 }}>
        <Button onClick={onClose}>Cancel</Button>
        <Button
          variant="contained"
          color="error"
          onClick={handleSubmit}
          disabled={loading}
        >
          {loading ? 'Submitting...' : 'Initiate Dispute'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default DisputeInitiationDialog;

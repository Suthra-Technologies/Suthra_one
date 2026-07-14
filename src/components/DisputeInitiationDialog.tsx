import React, { useState } from 'react';
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
} from '@mui/material';
import { Close as CloseIcon, Gavel } from '@mui/icons-material';
import { disputesAPI } from '../services/api';
import { toast } from 'react-hot-toast';

interface DisputeInitiationDialogProps {
  open: boolean;
  order: any;
  onClose: () => void;
  onSuccess: () => void;
}

const DisputeInitiationDialog: React.FC<DisputeInitiationDialogProps> = ({
  open,
  order,
  onClose,
  onSuccess,
}) => {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    reason: 'price_error',
    description: '',
    disputedAmount: String((order?.totalAmount || 0).toFixed(2)),
  });

  const handleSubmit = async () => {
    if (loading) return;
    
    const amount = parseFloat(formData.disputedAmount);
    if (isNaN(amount) || amount <= 0) {
      toast.error('Please enter a valid amount greater than 0');
      return;
    }
    
    if (amount > (order?.totalAmount || 0)) {
      toast.error(`Disputed amount cannot exceed order total ($${(order?.totalAmount || 0).toFixed(2)})`);
      return;
    }

    if (!formData.description) {
      toast.error('Please provide a description');
      return;
    }

    setLoading(true);
    try {
      await disputesAPI.create({
        orderId: order._id,
        orderNumber: order.orderNumber,
        reason: formData.reason,
        description: formData.description,
        disputedAmount: parseFloat(Number(formData.disputedAmount).toFixed(2)),
      });
      toast.success('Dispute initiated successfully');
      onSuccess();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to initiate dispute');
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

          <TextField
            fullWidth
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
            inputProps={{ step: 0.01, min: 0, max: order?.totalAmount }}
            error={parseFloat(formData.disputedAmount) > (order?.totalAmount || 0) || parseFloat(formData.disputedAmount) <= 0}
            helperText={
                parseFloat(formData.disputedAmount) > (order?.totalAmount || 0) 
                    ? `Cannot exceed order total ($${(order?.totalAmount || 0).toFixed(2)})` 
                    : parseFloat(formData.disputedAmount) <= 0 
                        ? 'Amount must be greater than 0' 
                        : ''
            }
          />

          <TextField
            fullWidth
            multiline
            rows={4}
            label="Description / Details"
            placeholder="Explain the issue in detail..."
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
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

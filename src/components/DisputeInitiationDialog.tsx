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
    reason: 'billing_error',
    description: '',
    disputedAmount: order?.totalAmount || 0,
  });

  const handleSubmit = async () => {
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
        disputedAmount: formData.disputedAmount,
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
            <MenuItem value="billing_error">Billing Error</MenuItem>
            <MenuItem value="item_missing">Item Missing</MenuItem>
            <MenuItem value="poor_service">Poor Service</MenuItem>
            <MenuItem value="quality_issue">Quality Issue</MenuItem>
            <MenuItem value="other">Other</MenuItem>
          </TextField>

          <TextField
            fullWidth
            label="Disputed Amount"
            type="number"
            value={formData.disputedAmount}
            onChange={(e) => setFormData({ ...formData, disputedAmount: parseFloat(e.target.value) || 0 })}
            inputProps={{ step: 0.01 }}
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

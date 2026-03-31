import React, { useState } from 'react';
import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Button,
    TextField,
    Typography,
    Box,
    Alert,
    IconButton,
} from '@mui/material';
import { Close as CloseIcon } from '@mui/icons-material';
import { inventoryAPI } from '../services/api';
import { toast } from 'react-hot-toast';

interface RawMaterial {
    _id: string;
    name: string;
    sku: string;
    currentStock: number;
    unit: string;
}

interface Props {
    open: boolean;
    onClose: () => void;
    onSave: () => void;
    material: RawMaterial | null;
}

const UsageDialog: React.FC<Props> = ({ open, onClose, onSave, material }) => {
    const [quantity, setQuantity] = useState<number>(0);
    const [reason, setReason] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async () => {
        if (!material) return;

        if (quantity <= 0) {
            toast.error('Quantity must be greater than 0');
            return;
        }

        if (quantity > material.currentStock) {
            toast.error(`Insufficient stock. Available: ${material.currentStock} ${material.unit}`);
            return;
        }

        if (!reason.trim()) {
            toast.error('Please provide a reason for usage');
            return;
        }

        try {
            setLoading(true);

            await inventoryAPI.recordUsage(material._id, {
                quantity,
                reason: reason.trim(),
            });

            // Reset form
            setQuantity(0);
            setReason('');
            setReason('');
            toast.success('Usage recorded successfully');
            onSave();
        } catch (err: any) {
            toast.error(err.response?.data?.message || 'Failed to record usage');
        } finally {
            setLoading(false);
        }
    };

    const handleClose = () => {
        setQuantity(0);
        setReason('');
        onClose();
    };

    if (!material) return null;

    return (
        <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
            <DialogTitle sx={{ m: 0, p: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Typography variant="h6" component="div">Record Material Usage</Typography>
                <IconButton
                    onClick={handleClose}
                    size="small"
                    sx={{
                        color: 'white',
                        bgcolor: 'error.main',
                        '&:hover': {
                            bgcolor: 'error.dark',
                        },
                        width: 24,
                        height: 24
                    }}
                >
                    <CloseIcon sx={{ fontSize: '1rem' }} />
                </IconButton>
            </DialogTitle>
            <DialogContent sx={{ '& .MuiFormLabel-asterisk': { color: 'red' } }}>
                <Box sx={{ mt: 2 }}>
                    <Box sx={{ mb: 3, p: 2, bgcolor: 'grey.100', borderRadius: 1 }}>
                        <Typography variant="subtitle2" color="text.secondary">
                            Material
                        </Typography>
                        <Typography variant="h6">{material.name}</Typography>
                        {/* <Typography variant="body2" color="text.secondary">
                            SKU: {material.sku}
                        </Typography> */}
                        <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                            Available Stock: <strong>{material.currentStock} {material.unit}</strong>
                        </Typography>
                    </Box>

                    <TextField
                        fullWidth
                        label="Quantity Used"
                        type="number"
                        required
                        value={quantity}
                        onChange={(e) => setQuantity(parseFloat(e.target.value) || 0)}
                        inputProps={{ min: 0, max: material.currentStock, step: 0.01 }}
                        helperText={`Enter quantity in ${material.unit}`}
                        sx={{ mb: 2 }}
                    />

                    <TextField
                        fullWidth
                        label="Reason for Usage"
                        multiline
                        required
                        rows={3}
                        value={reason}
                        onChange={(e) => setReason(e.target.value)}
                        placeholder="e.g., Used for pizza dough preparation"
                        helperText="Please describe why this material is being used"
                    />


                </Box>
            </DialogContent>
            <DialogActions>
                <Button onClick={handleClose} disabled={loading}>
                    Cancel
                </Button>
                <Button onClick={handleSubmit} variant="contained" disabled={loading}>
                    {loading ? 'Recording...' : 'Record Usage'}
                </Button>
            </DialogActions>
        </Dialog>
    );
};

export default UsageDialog;

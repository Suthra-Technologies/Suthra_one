import {
    Box,
    Button,
    CircularProgress,
    Dialog,
    DialogActions,
    DialogContent,
    DialogContentText,
    DialogTitle,
    Divider,
    Typography,
} from '@mui/material';
import { Storefront as StorefrontIcon } from '@mui/icons-material';
import React, { useState } from 'react';
import { toast } from 'react-hot-toast';
import { ordersAPI } from 'src/services/api';

interface AutoCloseRequest {
    orders: any[];
    count: number;
    closeTime: string;
}

interface Props {
    request: AutoCloseRequest | null;
    onClose: () => void;
}

const formatOrderType = (type?: string) =>
    (type || 'order').replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());

/**
 * Shown when the backend requests an auto-close ~30 min before the store's
 * closing time. Lists the still-open orders and lets an admin/manager close
 * them all (mark completed) in one action.
 */
const AutoCloseOrdersDialog: React.FC<Props> = ({ request, onClose }) => {
    const [closing, setClosing] = useState(false);

    const handleCloseAll = async () => {
        setClosing(true);
        try {
            const res = await ordersAPI.closeAllOrders();
            const { closed = 0, failed = 0 } = res.data || {};
            if (failed > 0) {
                toast.success(`Closed ${closed} order(s); ${failed} could not be closed.`);
            } else {
                toast.success(`Closed ${closed} order(s).`);
            }
            onClose();
        } catch (error: any) {
            toast.error(error.response?.data?.message || 'Failed to close orders. Please try again.');
        } finally {
            setClosing(false);
        }
    };

    return (
        <Dialog open={!!request} onClose={closing ? undefined : onClose} maxWidth="sm" fullWidth>
            <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1, fontWeight: 700 }}>
                <StorefrontIcon color="error" />
                Store Closing Soon
            </DialogTitle>
            <DialogContent>
                <DialogContentText sx={{ mb: 2 }}>
                    The store closes at <strong>{request?.closeTime}</strong>. There{' '}
                    {request?.count === 1 ? 'is' : 'are'} <strong>{request?.count ?? 0}</strong> open
                    order{request?.count === 1 ? '' : 's'} that still need to be closed. You can
                    auto-close them all (mark as completed) now.
                </DialogContentText>

                <Divider sx={{ mb: 1 }} />
                <Box sx={{ maxHeight: 260, overflowY: 'auto' }}>
                    {(request?.orders || []).map((o) => (
                        <Box
                            key={o._id}
                            sx={{
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                py: 0.75,
                                borderBottom: '1px solid',
                                borderColor: 'divider',
                            }}
                        >
                            <Box>
                                <Typography variant="body2" fontWeight={600}>
                                    #{o.dailyTokenNumber ?? o.orderNumber}
                                    {o.tableNumber ? ` · Table ${o.tableNumber}` : ''}
                                </Typography>
                                <Typography variant="caption" color="text.secondary">
                                    {formatOrderType(o.orderType)} · {formatOrderType(o.status)}
                                </Typography>
                            </Box>
                            {typeof o.totalAmount === 'number' && (
                                <Typography variant="body2" color="text.secondary">
                                    {o.totalAmount}
                                </Typography>
                            )}
                        </Box>
                    ))}
                </Box>
            </DialogContent>
            <DialogActions sx={{ p: 2, gap: 1 }}>
                <Button onClick={onClose} disabled={closing} color="inherit">
                    Not now
                </Button>
                <Button
                    onClick={handleCloseAll}
                    disabled={closing}
                    variant="contained"
                    color="error"
                    startIcon={closing ? <CircularProgress size={16} color="inherit" /> : undefined}
                >
                    {closing ? 'Closing…' : 'Auto-close all orders'}
                </Button>
            </DialogActions>
        </Dialog>
    );
};

export default AutoCloseOrdersDialog;

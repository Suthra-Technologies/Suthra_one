import React, { useEffect, useState } from 'react';
import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Button,
    List,
    ListItem,
    ListItemText,
    Typography,
    CircularProgress,
    Box,
    Chip,
    Divider
} from '@mui/material';
import { History as HistoryIcon } from '@mui/icons-material';
import { auditLogsAPI } from '../../services/api';
import { format } from 'date-fns';
import { toast } from 'react-hot-toast';

interface HistoryDialogProps {
    open: boolean;
    onClose: () => void;
    targetId: string;
    module: string;
    title: string;
}

const HistoryDialog: React.FC<HistoryDialogProps> = ({ open, onClose, targetId, module, title }) => {
    const [logs, setLogs] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (open && targetId) {
            fetchLogs();
        } else {
            setLogs([]);
        }
    }, [open, targetId]);

    const fetchLogs = async () => {
        setLoading(true);
        try {
            const response = await auditLogsAPI.getAll({ targetId, module, limit: 100 });
            if (response.data && response.data.logs) {
                setLogs(response.data.logs);
            }
        } catch (error) {
            console.error('Error fetching history:', error);
            toast.error('Failed to load history logs');
        } finally {
            setLoading(false);
        }
    };

    const renderActionLabel = (action: string) => {
        switch (action?.toLowerCase()) {
            case 'create': return <Chip size="small" label="Created" color="success" />;
            case 'update_status': return <Chip size="small" label="Status Update" color="info" />;
            case 'check_in': return <Chip size="small" label="Checked In" color="secondary" />;
            case 'cancel': return <Chip size="small" label="Cancelled" color="error" />;
            case 'delete': return <Chip size="small" label="Deleted" color="error" />;
            case 'update': return <Chip size="small" label="Updated" color="primary" />;
            default: return <Chip size="small" label={action} />;
        }
    };

    const renderDetails = (details: any) => {
        if (!details) return null;
        if (details.previousStatus && details.nextStatus) {
            return `Changed from ${details.previousStatus} to ${details.nextStatus}`;
        }
        if (details.note) {
            if (details.note.includes(', ')) {
                const parts = details.note.split(', ');
                return (
                    <ul style={{ margin: '4px 0 0 0', paddingLeft: '16px', listStyleType: 'disc' }}>
                        {parts.map((part: string, idx: number) => (
                            <li key={idx} style={{ marginTop: '2px' }}>{part}</li>
                        ))}
                    </ul>
                );
            }
            return <Box sx={{ mt: 0.5 }}>{details.note}</Box>;
        }
        return null;
    };

    return (
        <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
            <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <HistoryIcon />
                {title}
            </DialogTitle>
            <Divider />
            <DialogContent>
                {loading ? (
                    <Box display="flex" justifyContent="center" p={4}>
                        <CircularProgress />
                    </Box>
                ) : logs.length === 0 ? (
                    <Typography color="text.secondary" align="center" sx={{ py: 3 }}>
                        No history logs found for this item.
                    </Typography>
                ) : (
                    <List disablePadding>
                        {logs.map((log, index) => (
                            <React.Fragment key={log._id}>
                                <ListItem alignItems="flex-start" sx={{ px: 0 }}>
                                    <ListItemText
                                        primary={
                                            <Box display="flex" alignItems="center" gap={1} mb={0.5}>
                                                {renderActionLabel(log.action)}
                                                <Typography variant="body2" color="text.secondary">
                                                    {format(new Date(log.createdAt), 'MMM dd, yyyy h:mm a')}
                                                </Typography>
                                            </Box>
                                        }
                                        secondary={
                                            <Box>
                                                <Typography variant="body2" color="text.primary">
                                                    By: {log.performedByName || 'Unknown'} {log.userRole ? `(${log.userRole})` : ''}
                                                </Typography>
                                                {renderDetails(log.details) && (
                                                    <Typography variant="caption" color="text.secondary">
                                                        {renderDetails(log.details)}
                                                    </Typography>
                                                )}
                                            </Box>
                                        }
                                    />
                                </ListItem>
                                {index < logs.length - 1 && <Divider component="li" />}
                            </React.Fragment>
                        ))}
                    </List>
                )}
            </DialogContent>
            <DialogActions>
                <Button onClick={onClose} variant="outlined" color="inherit">
                    Close
                </Button>
            </DialogActions>
        </Dialog>
    );
};

export default HistoryDialog;

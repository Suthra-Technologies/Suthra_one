import React, { useState, useEffect } from 'react';
import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Button,
    FormControl,
    InputLabel,
    Select,
    MenuItem,
    Box,
    Typography,
    Checkbox,
    ListItemText,
    Alert,
    CircularProgress,
    Stack,
    Chip
} from '@mui/material';
import { tablesAPI } from '../../../services/api';
import { toast } from 'react-hot-toast';

interface MergeTablesDialogProps {
    open: boolean;
    onClose: () => void;
    tables: any[];
    onSuccess: () => void;
    initialPrimaryTableId?: string;
}

const MergeTablesDialog: React.FC<MergeTablesDialogProps> = ({
    open,
    onClose,
    tables,
    onSuccess,
    initialPrimaryTableId
}) => {
    const [primaryTableId, setPrimaryTableId] = useState<string>('');
    const [selectedSecondaryIds, setSelectedSecondaryIds] = useState<string[]>([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (open) {
            setPrimaryTableId(initialPrimaryTableId || '');
            setSelectedSecondaryIds([]);
        }
    }, [open, initialPrimaryTableId]);

    const availableTables = tables.filter(t => !t.isMerged && !t.isPrimary);
    
    // For primary, we can also include already primary tables if we want to add more to them
    const primaryOptions = tables.filter(t => !t.isMerged || t.isPrimary);

    const handleMerge = async () => {
        if (!primaryTableId || selectedSecondaryIds.length === 0) {
            toast.error('Please select a primary table and at least one table to merge with.');
            return;
        }

        try {
            setLoading(true);
            await tablesAPI.merge(primaryTableId, selectedSecondaryIds);
            toast.success('Tables merged successfully');
            onSuccess();
            onClose();
        } catch (error: any) {
            console.error('Error merging tables:', error);
            toast.error(error.response?.data?.message || 'Failed to merge tables');
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
            <DialogTitle>Merge Tables</DialogTitle>
            <DialogContent>
                <Box sx={{ mt: 1, display: 'flex', flexDirection: 'column', gap: 3 }}>
                    <Alert severity="info">
                        Merging tables creates a logical group. All orders will be associated with the <strong>Primary</strong> table.
                    </Alert>

                    <FormControl fullWidth size="small">
                        <InputLabel>Primary Table</InputLabel>
                        <Select
                            value={primaryTableId}
                            label="Primary Table"
                            onChange={(e) => {
                                setPrimaryTableId(e.target.value);
                                // Remove from secondary if it was there
                                setSelectedSecondaryIds(prev => prev.filter(id => id !== e.target.value));
                            }}
                        >
                            {primaryOptions.map((t) => (
                                <MenuItem key={t._id} value={t._id}>
                                    Table {t.tableNumber} (Cap: {t.capacity}) {t.status !== 'available' ? `(${t.status})` : ''}
                                </MenuItem>
                            ))}
                        </Select>
                    </FormControl>

                    <FormControl fullWidth size="small">
                        <InputLabel>Tables to Merge</InputLabel>
                        <Select
                            multiple
                            value={selectedSecondaryIds}
                            label="Tables to Merge"
                            onChange={(e) => setSelectedSecondaryIds(typeof e.target.value === 'string' ? e.target.value.split(',') : e.target.value)}
                            renderValue={(selected) => (
                                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                                    {selected.map((value) => (
                                        <Chip 
                                            key={value} 
                                            label={`Table ${tables.find(t => t._id === value)?.tableNumber || value}`} 
                                            size="small" 
                                        />
                                    ))}
                                </Box>
                            )}
                        >
                            {availableTables
                                .filter(t => t._id !== primaryTableId)
                                .map((t) => (
                                    <MenuItem key={t._id} value={t._id}>
                                        <Checkbox checked={selectedSecondaryIds.indexOf(t._id) > -1} />
                                        <ListItemText primary={`Table ${t.tableNumber} (Cap: ${t.capacity})`} secondary={t.status !== 'available' ? t.status : ''} />
                                    </MenuItem>
                                ))}
                        </Select>
                    </FormControl>

                    {primaryTableId && (
                        <Box>
                            <Typography variant="subtitle2" gutterBottom>Resulting Group:</Typography>
                            <Stack direction="row" spacing={1} alignItems="center">
                                <Chip label={`Primary: ${tables.find(t => t._id === primaryTableId)?.tableNumber}`} color="primary" />
                                <Typography variant="body2">+</Typography>
                                {selectedSecondaryIds.map(id => (
                                    <Chip key={id} label={tables.find(t => t._id === id)?.tableNumber} variant="outlined" />
                                ))}
                            </Stack>
                        </Box>
                    )}
                </Box>
            </DialogContent>
            <DialogActions>
                <Button onClick={onClose} disabled={loading}>Cancel</Button>
                <Button 
                    onClick={handleMerge} 
                    variant="contained" 
                    disabled={loading || !primaryTableId || selectedSecondaryIds.length === 0}
                    startIcon={loading && <CircularProgress size={20} />}
                >
                    Merge Tables
                </Button>
            </DialogActions>
        </Dialog>
    );
};

export default MergeTablesDialog;

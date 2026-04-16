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
    onSelect: (primaryId: string, secondaryIds: string[]) => void;
    initialPrimaryTableId?: string;
}

const MergeTablesDialog: React.FC<MergeTablesDialogProps> = ({
    open,
    onClose,
    tables,
    onSelect,
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

    const handleMerge = () => {
        if (!primaryTableId || selectedSecondaryIds.length === 0) {
            toast.error('Please select a primary table and at least one table to merge with.');
            return;
        }

        onSelect(primaryTableId, selectedSecondaryIds);
        onClose();
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
                        <Box sx={{ mt: 1 }}>
                            <Typography variant="subtitle2" gutterBottom>Resulting Group:</Typography>
                            <Box sx={{ p: 1.5, bgcolor: 'info.lighter', borderRadius: 1, border: '1px solid', borderColor: 'info.light', mb: 2 }}>
                                <Stack direction="row" justifyContent="space-between" alignItems="center">
                                    <Typography variant="body2" color="info.darker" fontWeight="bold">
                                        Combined Capacity:
                                    </Typography>
                                    <Typography variant="body1" color="info.darker" fontWeight="bold">
                                        {[primaryTableId, ...selectedSecondaryIds].reduce((sum, id) => {
                                            const table = tables.find(t => t._id === id);
                                            return sum + (table?.capacity || 0);
                                        }, 0)} Guests
                                    </Typography>
                                </Stack>
                            </Box>
                            <Stack direction="row" spacing={1} alignItems="center">
                                <Chip label={`Primary: ${tables.find(t => t._id === primaryTableId)?.tableNumber}`} color="primary" />
                                {selectedSecondaryIds.length > 0 && <Typography variant="body2">+</Typography>}
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
                    disabled={!primaryTableId || selectedSecondaryIds.length === 0}
                >
                    Confirm Merge
                </Button>
            </DialogActions>
        </Dialog>
    );
};

export default MergeTablesDialog;

import React, { useState, useEffect } from 'react';
import {
    Box,
    Button,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    TextField,
    FormControl,
    InputLabel,
    Select,
    MenuItem,
    Stack,
    FormHelperText,
    IconButton,
    CircularProgress
} from '@mui/material';
import {
    Add as AddIcon,
    Close as CloseIcon
} from '@mui/icons-material';
import { toast } from 'react-hot-toast';
import { tablesAPI } from '../../../services/api';

interface EditTableDialogProps {
    open: boolean;
    onClose: () => void;
    onSuccess: () => void;
    table: any;
    customLocations: string[];
    onOpenAddLocation: () => void;
}

const CAPACITY_OPTIONS = [2, 4, 6, 8, 10, 12, 14, 16, 18, 20];

const EditTableDialog: React.FC<EditTableDialogProps> = ({
    open,
    onClose,
    onSuccess,
    table,
    customLocations,
    onOpenAddLocation
}) => {
    const [editTable, setEditTable] = useState<any>(null);
    const [isProcessing, setIsProcessing] = useState(false);

    useEffect(() => {
        if (table) {
            setEditTable({ ...table });
        }
    }, [table, open]);

    const [touched, setTouched] = useState({
        tableNumber: false,
        capacity: false,
        location: false,
        status: false
    });
    const [errors, setErrors] = useState({
        tableNumber: '',
        capacity: '',
        location: '',
        status: ''
    });

    const validateField = (name: string, value: any): string => {
        let error = '';
        if (name === 'tableNumber') {
            const raw = value === undefined || value === null || value === '' ? '' : value.toString();
            if (raw === '') {
                error = 'Table number is required';
            } else {
                const num = Number(raw);
                if (Number.isNaN(num) || !Number.isInteger(num)) {
                    error = 'Table number must be a whole number';
                } else if (num < 1) {
                    error = 'Table number must be at least 1';
                }
            }
        }
        if (name === 'capacity') {
            const raw = value === undefined || value === null || value === '' ? '' : value.toString();
            if (raw === '') {
                error = 'Capacity is required';
            } else {
                const num = Number(raw);
                if (Number.isNaN(num) || !Number.isInteger(num)) {
                    error = 'Capacity must be a whole number';
                } else if (num < 1) {
                    error = 'Capacity must be at least 1';
                }
            }
        }
        if (name === 'location') {
            if (!value || value.toString().trim() === '') {
                error = 'Location is required';
            }
        }
        if (name === 'status') {
            if (!value || value.toString().trim() === '') {
                error = 'Status is required';
            }
        }
        setErrors(prev => ({ ...prev, [name]: error }));
        return error;
    };

    const validateAll = (): boolean => {
        const fields = ['tableNumber', 'capacity', 'location', 'status'];
        setTouched({
            tableNumber: true,
            capacity: true,
            location: true,
            status: true
        });

        let hasError = false;
        if (!editTable) return true;

        fields.forEach(f => {
            if (validateField(f, editTable[f])) hasError = true;
        });

        return !hasError;
    };

    const handleUpdateTable = async () => {
        if (isProcessing || !editTable) return;
        if (!validateAll()) {
            toast.error('Please fill all required fields correctly');
            return;
        }
        try {
            setIsProcessing(true);
            const updateData = {
                tableName: editTable.tableName,
                tableNumber: editTable.tableNumber,
                capacity: editTable.capacity,
                location: editTable.location,
                status: editTable.status,
                featureTag: editTable.featureTag || '',
                vibeText: editTable.vibeText || '',
            };
            await tablesAPI.update(editTable._id, updateData);
            toast.success('Table updated successfully');
            onSuccess();
        } catch (error) {
            console.error('Error updating table:', error);
            toast.error('Failed to update table');
        } finally {
            setIsProcessing(false);
        }
    };

    if (!editTable) return null;

    return (
        <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
            <DialogTitle sx={{ m: 0, p: 2, position: 'relative' }}>
                Edit Table
                <IconButton
                    aria-label="close"
                    onClick={onClose}
                    size="small"
                    sx={{ position: 'absolute', right: 8, top: 8, bgcolor: 'error.main', color: 'common.white', '&:hover': { bgcolor: 'error.dark' }, width: 20, height: 20, padding: '4px', minWidth: 'auto', borderRadius: '50%' }}
                >
                    <CloseIcon fontSize="small" />
                </IconButton>
            </DialogTitle>
            <DialogContent>
                <Box component="form" sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
                    <TextField
                        label="Table Number"
                        type="number"
                        value={editTable.tableNumber || ''}
                        onChange={e => {
                            const val = e.target.value === '' ? 0 : parseInt(e.target.value, 10);
                            if (val >= 0) setEditTable({ ...editTable, tableNumber: val });
                        }}
                        onBlur={() => {
                            setTouched(prev => ({ ...prev, tableNumber: true }));
                            validateField('tableNumber', editTable.tableNumber);
                        }}
                        required
                        error={touched.tableNumber && Boolean(errors.tableNumber)}
                        helperText={touched.tableNumber && errors.tableNumber ? errors.tableNumber : ''}
                        slotProps={{ htmlInput: { min: 1 } }}
                        InputLabelProps={{
                            sx: {
                                '& .MuiFormLabel-asterisk': {
                                    color: 'error.main'
                                }
                            }
                        }}
                    />
                    <FormControl fullWidth required error={touched.capacity && Boolean(errors.capacity)}>
                        <InputLabel id="edit-capacity-label" sx={{ '& .MuiFormLabel-asterisk': { color: 'error.main' } }}>Capacity</InputLabel>
                        <Select
                            labelId="edit-capacity-label"
                            value={editTable.capacity || ''}
                            label="Capacity"
                            onChange={e => {
                                const val = Number(e.target.value);
                                setEditTable({ ...editTable, capacity: val });
                                setTouched(prev => ({ ...prev, capacity: true }));
                                validateField('capacity', val);
                            }}
                        >
                            {CAPACITY_OPTIONS.map(opt => (
                                <MenuItem key={opt} value={opt}>{opt} People</MenuItem>
                            ))}
                        </Select>
                        {touched.capacity && errors.capacity && <FormHelperText>{errors.capacity}</FormHelperText>}
                    </FormControl>
                    <Stack direction="row" sx={{ width: '100%' }}>
                        <FormControl fullWidth sx={{ '& .MuiOutlinedInput-root': { borderTopRightRadius: 0, borderBottomRightRadius: 0 } }}>
                            <InputLabel>Location</InputLabel>
                            <Select
                                value={editTable.location || 'indoor'}
                                label="Location"
                                onChange={e => {
                                    const v = e.target.value as string;
                                    setEditTable({ ...editTable, location: v, section: v });
                                    setTouched(prev => ({ ...prev, location: true }));
                                    validateField('location', v);
                                }}
                                MenuProps={{
                                    PaperProps: {
                                        style: {
                                            maxHeight: 250
                                        }
                                    }
                                }}
                            >
                                {(() => {
                                    const locSet = new Set<string>(['indoor', 'outdoor', 'private_room', 'bar']);
                                    if (editTable?.location) locSet.add(editTable.location.toLowerCase());
                                    customLocations.forEach(loc => {
                                        const norm = loc.trim().toLowerCase();
                                        if (norm && norm !== 'inside') locSet.add(norm);
                                    });
                                    return Array.from(locSet).map(loc => (
                                        <MenuItem key={loc} value={loc} sx={{ textTransform: 'capitalize' }}>
                                            {loc.replace(/_/g, ' ')}
                                        </MenuItem>
                                    ));
                                })()}
                            </Select>
                        </FormControl>
                        <Button
                            variant="contained"
                            color="primary"
                            onClick={onOpenAddLocation}
                            sx={{
                                borderTopLeftRadius: 0,
                                borderBottomLeftRadius: 0,
                                minWidth: '56px',
                                boxShadow: 'none'
                            }}
                        >
                            <AddIcon />
                        </Button>
                    </Stack>
                    <FormControl fullWidth>
                        <InputLabel>Status</InputLabel>
                        <Select
                            value={editTable.status || 'available'}
                            label="Status"
                            onChange={e => {
                                const v = e.target.value as string;
                                setEditTable({ ...editTable, status: v });
                                setTouched(prev => ({ ...prev, status: true }));
                                validateField('status', v);
                            }}
                        >
                            <MenuItem value="available">Available</MenuItem>
                            <MenuItem value="occupied">Occupied</MenuItem>
                            <MenuItem value="reserved">Reserved</MenuItem>
                        </Select>
                    </FormControl>

                    <TextField
                        label="Ambiance / Location Tag (e.g. Scenic Window Spot 🪟)"
                        value={editTable.featureTag || ''}
                        onChange={e => setEditTable({ ...editTable, featureTag: e.target.value })}
                        placeholder="e.g. Scenic Window Spot 🪟, Heated Patio Spot 🌿, VIP Corner"
                        fullWidth
                    />

                    <TextField
                        label="Vibe Description"
                        value={editTable.vibeText || ''}
                        onChange={e => setEditTable({ ...editTable, vibeText: e.target.value })}
                        placeholder="e.g. Romantic corner with sunset view"
                        fullWidth
                    />
                </Box>
            </DialogContent>
            <DialogActions>
                <Button onClick={onClose}>Cancel</Button>
                <Button variant="contained" onClick={handleUpdateTable} disabled={isProcessing} startIcon={isProcessing && <CircularProgress size={16} color="inherit" />}>
                    {isProcessing ? 'Updating...' : 'Update'}
                </Button>
            </DialogActions>
        </Dialog>
    );
};

export default React.memo(EditTableDialog);

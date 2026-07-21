import React, { useState } from 'react';
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

interface AddTableDialogProps {
    open: boolean;
    onClose: () => void;
    onSuccess: () => void;
    customLocations: string[];
    onOpenAddLocation: () => void;
}

const CAPACITY_OPTIONS = [2, 4, 6, 8, 10, 12, 14, 16, 18, 20];

const AddTableDialog: React.FC<AddTableDialogProps> = ({
    open,
    onClose,
    onSuccess,
    customLocations,
    onOpenAddLocation
}) => {
    const [newTableName, setNewTableName] = useState('');
    const [newTableNumber, setNewTableNumber] = useState(0);
    const [newTableCapacity, setNewTableCapacity] = useState(0);
    const [newTableLocation, setNewTableLocation] = useState('indoor');
    const [newTableStatus, setNewTableStatus] = useState('available');
    const [isProcessing, setIsProcessing] = useState(false);

    const [touched, setTouched] = useState({
        tableName: false,
        tableNumber: false,
        capacity: false,
        location: false,
        status: false
    });
    const [errors, setErrors] = useState({
        tableName: '',
        tableNumber: '',
        capacity: '',
        location: '',
        status: ''
    });

    const validateField = (name: string, value: any): string => {
        let error = '';
        if (name === 'tableName') {
            const val = value ? value.toString().trim() : '';
            if (val.length > 0 && val.length < 2) {
                error = 'Table name must be at least 2 characters';
            }
        }
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
        const fields = ['tableName', 'tableNumber', 'capacity', 'location', 'status'];
        setTouched({
            tableName: true,
            tableNumber: true,
            capacity: true,
            location: true,
            status: true
        });

        let hasError = false;
        const values: Record<string, any> = {
            tableName: newTableName,
            tableNumber: newTableNumber,
            capacity: newTableCapacity,
            location: newTableLocation,
            status: newTableStatus
        };

        fields.forEach(f => {
            if (validateField(f, values[f])) hasError = true;
        });

        return !hasError;
    };

    const handleAddTable = async () => {
        if (isProcessing) return;
        if (!validateAll()) {
            toast.error('Please fill all the required fields correctly');
            return;
        }
        try {
            setIsProcessing(true);
            const payload = {
                tableName: newTableName,
                tableNumber: newTableNumber,
                capacity: newTableCapacity,
                location: newTableLocation,
                status: newTableStatus,
            };
            await tablesAPI.create(payload);
            toast.success('Table added successfully');
            resetFields();
            onSuccess();
        } catch (error: any) {
            console.error('Error adding table:', error);
            const errorMessage = error.response?.data?.error || error.response?.data?.message || 'Failed to add table';
            toast.error(errorMessage);
        } finally {
            setIsProcessing(false);
        }
    };

    const resetFields = () => {
        setNewTableName('');
        setNewTableNumber(0);
        setNewTableCapacity(0);
        setNewTableLocation('indoor');
        setNewTableStatus('available');
        setTouched({
            tableName: false,
            tableNumber: false,
            capacity: false,
            location: false,
            status: false
        });
        setErrors({
            tableName: '',
            tableNumber: '',
            capacity: '',
            location: '',
            status: ''
        });
    };

    const handleClose = () => {
        resetFields();
        onClose();
    };

    return (
        <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
            <DialogTitle sx={{ m: 0, p: 2, position: 'relative' }}>
                Add New Table
                <IconButton
                    aria-label="close"
                    onClick={handleClose}
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
                        value={newTableNumber === 0 ? '' : newTableNumber}
                        onChange={e => {
                            const val = e.target.value === '' ? 0 : parseInt(e.target.value, 10);
                            if (val >= 0) setNewTableNumber(val);
                        }}
                        onBlur={() => {
                            setTouched(prev => ({ ...prev, tableNumber: true }));
                            validateField('tableNumber', newTableNumber);
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
                        <InputLabel id="add-capacity-label" sx={{ '& .MuiFormLabel-asterisk': { color: 'error.main' } }}>Capacity</InputLabel>
                        <Select
                            labelId="add-capacity-label"
                            value={newTableCapacity || ''}
                            label="Capacity"
                            onChange={e => {
                                const val = Number(e.target.value);
                                setNewTableCapacity(val);
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
                                value={newTableLocation}
                                label="Location"
                                onChange={e => {
                                    const v = e.target.value as string;
                                    setNewTableLocation(v);
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
                                <MenuItem value="indoor">Indoor</MenuItem>
                                <MenuItem value="outdoor">Outdoor</MenuItem>
                                <MenuItem value="private_room">Private Room</MenuItem>
                                <MenuItem value="bar">Bar</MenuItem>
                                <MenuItem value="patio">Patio</MenuItem>
                                <MenuItem value="main_dining">Main Dining</MenuItem>
                                <MenuItem value="vip_section">VIP Section</MenuItem>
                                <MenuItem value="party_hall">Party Hall</MenuItem>
                                <MenuItem value="terrace">Terrace</MenuItem>
                                {customLocations.map(loc => (
                                    <MenuItem key={loc} value={loc} sx={{ textTransform: 'capitalize' }}>
                                        {loc.replace(/_/g, ' ')}
                                    </MenuItem>
                                ))}
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
                            value={newTableStatus}
                            label="Status"
                            onChange={e => {
                                const v = e.target.value as string;
                                setNewTableStatus(v);
                                setTouched(prev => ({ ...prev, status: true }));
                                validateField('status', v);
                            }}>
                            <MenuItem value="available">Available</MenuItem>
                            <MenuItem value="occupied">Occupied</MenuItem>
                            <MenuItem value="reserved">Reserved</MenuItem>
                        </Select>
                    </FormControl>
                </Box>
            </DialogContent>
            <DialogActions>
                <Button onClick={handleClose}>Cancel</Button>
                <Button variant="contained" onClick={handleAddTable} disabled={isProcessing} startIcon={isProcessing && <CircularProgress size={16} color="inherit" />}>
                    {isProcessing ? 'Adding...' : 'Add'}
                </Button>
            </DialogActions>
        </Dialog>
    );
};

export default React.memo(AddTableDialog);

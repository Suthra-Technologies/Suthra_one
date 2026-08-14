import React, { useState, useEffect, useMemo } from 'react';
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
    CircularProgress,
    Chip,
    Alert,
    Autocomplete,
    Typography
} from '@mui/material';
import {
    Add as AddIcon,
    Close as CloseIcon,
    AutoAwesome as SparklesIcon,
    Warning as WarningIcon,
    CheckCircle as CheckIcon
} from '@mui/icons-material';
import { toast } from 'react-hot-toast';
import { tablesAPI } from '../../../services/api';

interface AddTableDialogProps {
    open: boolean;
    onClose: () => void;
    onSuccess: () => void;
    customLocations: string[];
    onOpenAddLocation: () => void;
    initialLocation?: string;
    existingTables?: any[];
}

const CAPACITY_OPTIONS = [2, 4, 6, 8, 10, 12, 14, 16, 18, 20];

const AddTableDialog: React.FC<AddTableDialogProps> = ({
    open,
    onClose,
    onSuccess,
    customLocations,
    onOpenAddLocation,
    initialLocation = 'indoor',
    existingTables = []
}) => {
    const [newTableName, setNewTableName] = useState('');
    const [newTableNumber, setNewTableNumber] = useState(0);
    const [newTableCapacity, setNewTableCapacity] = useState(0);
    const [newTableLocation, setNewTableLocation] = useState(initialLocation || 'indoor');
    const [newTableStatus, setNewTableStatus] = useState('available');
    const [isProcessing, setIsProcessing] = useState(false);

    const [fetchedTables, setFetchedTables] = useState<any[]>([]);

    // Process all DB tables (both active & archived) for global duplicate checking
    const allDbTables = useMemo(() => {
        const combined = [...(Array.isArray(existingTables) ? existingTables : []), ...fetchedTables];
        const map = new Map<string, any>();
        combined.forEach(t => {
            if (t && (t._id || t.id || t.tableNumber)) {
                const key = t._id ? t._id.toString() : (t.id ? t.id.toString() : String(t.tableNumber));
                map.set(key, t);
            }
        });
        return Array.from(map.values());
    }, [existingTables, fetchedTables]);

    const occupiedNumbersMap = useMemo(() => {
        const map = new Map<string, { tableNumber: string | number; location: string; isInactive: boolean }>();
        allDbTables.forEach(t => {
            const rawVal = t.tableNumber !== undefined && t.tableNumber !== null && t.tableNumber !== ''
                ? t.tableNumber
                : (t.number !== undefined && t.number !== null && t.number !== ''
                    ? t.number
                    : (t.table_number || t.tableName || t.name || ''));
            const rawNum = String(rawVal).trim();
            if (rawNum) {
                const isInactive = Boolean(t.isDeleted || t.isActive === false);
                const roomName = (t.section || t.location || 'indoor').replace(/_/g, ' ').toUpperCase();
                map.set(rawNum.toLowerCase(), {
                    tableNumber: rawVal,
                    location: isInactive ? `${roomName} (Inactive/Archived)` : roomName,
                    isInactive
                });
            }
        });
        return map;
    }, [allDbTables]);

    const nextSuggestedNumber = useMemo(() => {
        let candidate = 1;
        while (occupiedNumbersMap.has(String(candidate).toLowerCase()) && candidate <= 10000) {
            candidate++;
        }
        return candidate;
    }, [occupiedNumbersMap]);

    useEffect(() => {
        if (open) {
            setNewTableLocation(initialLocation || 'indoor');
            tablesAPI.getAll({ includeDeleted: true }).then(res => {
                if (Array.isArray(res?.data)) {
                    setFetchedTables(res.data);
                }
            }).catch(() => null);
        }
    }, [open, initialLocation]);

    useEffect(() => {
        if (open) {
            setNewTableNumber(nextSuggestedNumber);
        }
    }, [open, nextSuggestedNumber]);

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
        const currentNumStr = String(newTableNumber || '').trim();
        const existingOccupant = currentNumStr ? occupiedNumbersMap.get(currentNumStr.toLowerCase()) : null;
        if (existingOccupant) {
            toast.error(`Table #${newTableNumber} already exists in ${existingOccupant.location}. Use #${nextSuggestedNumber} instead.`);
            return;
        }
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
                    {/* Smart Table Number Suggestion & Live Availability Helper */}
                    {(() => {
                        const currentNumStr = String(newTableNumber || '').trim();
                        const existingOccupant = currentNumStr ? occupiedNumbersMap.get(currentNumStr.toLowerCase()) : null;
                        const isTaken = Boolean(existingOccupant);

                        return (
                            <>
                                <Box sx={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    justify: 'space-between',
                                    bgcolor: isTaken ? '#FEF2F2' : '#F0FDF4',
                                    border: '1.5px solid',
                                    borderColor: isTaken ? '#FCA5A5' : '#BBF7D0',
                                    p: 1.25,
                                    borderRadius: 2.5
                                }}>
                                    <Stack direction="row" spacing={1} alignItems="center">
                                        {isTaken ? (
                                            <WarningIcon sx={{ fontSize: 18, color: '#DC2626' }} />
                                        ) : (
                                            <SparklesIcon sx={{ fontSize: 18, color: '#16A34A' }} />
                                        )}
                                        <Typography variant="body2" fontWeight={800} sx={{ color: isTaken ? '#991B1B' : '#166534', fontSize: '0.78rem' }}>
                                            {isTaken 
                                                ? `⚠️ Table #${currentNumStr} is ALREADY TAKEN in ${existingOccupant?.location}`
                                                : `💡 Suggested Next Table: #${nextSuggestedNumber}`}
                                        </Typography>
                                    </Stack>
                                    <Button
                                        size="small"
                                        variant={isTaken ? "contained" : "text"}
                                        color={isTaken ? "error" : "success"}
                                        onClick={() => {
                                            setNewTableNumber(nextSuggestedNumber);
                                            setErrors(prev => ({ ...prev, tableNumber: '' }));
                                        }}
                                        sx={{ fontWeight: 800, textTransform: 'none', fontSize: '0.72rem', py: 0.2, px: 1 }}
                                    >
                                        Use #{nextSuggestedNumber}
                                    </Button>
                                </Box>

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
                                    error={isTaken || (touched.tableNumber && Boolean(errors.tableNumber))}
                                    helperText={isTaken ? `Table number #${currentNumStr} already exists in ${existingOccupant?.location}. Click "Use #${nextSuggestedNumber}" above.` : (touched.tableNumber && errors.tableNumber ? errors.tableNumber : '')}
                                    slotProps={{ htmlInput: { min: 1 } }}
                                    InputLabelProps={{
                                        sx: {
                                            '& .MuiFormLabel-asterisk': {
                                                color: 'error.main'
                                            }
                                        }
                                    }}
                                />
                            </>
                        );
                    })()}
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
                                {(() => {
                                    const locSet = new Set<string>(['indoor', 'outdoor', 'private_room', 'bar']);
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

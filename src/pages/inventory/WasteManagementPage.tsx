import React, { useState, useEffect } from 'react';
import {
    Box,
    Button,
    Card,
    CardContent,
    Container,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    FormControl,
    Grid,
    InputLabel,
    MenuItem,
    Select,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    TextField,
    Typography,
    Paper,
    IconButton,
    Tooltip,
    Chip,
    CircularProgress,
    Alert,
    Autocomplete,
    TablePagination,
} from '@mui/material';
import {
    Add as AddIcon,
    Delete as DeleteIcon,
    TrendingDown,
    History,
    FilterList,
    Warning,
    Fastfood,
    Category,
    Close as CloseIcon,
} from '@mui/icons-material';
import { format } from 'date-fns';
import { wasteAPI, inventoryAPI, menuAPI } from '../../services/api';
import { useSnackbar } from 'notistack';

const REASONS = [
    { value: 'expired', label: 'Expired' },
    { value: 'spilled', label: 'Spilled/Dropped' },
    { value: 'damaged', label: 'Damaged' },
    { value: 'prep_error', label: 'Preparation Error' },
    { value: 'customer_return', label: 'Customer Return' },
    { value: 'other', label: 'Other' },
];

const WasteManagementPage: React.FC = () => {
    const [logs, setLogs] = useState<any[]>([]);
    const [summary, setSummary] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [openDialog, setOpenDialog] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const { enqueueSnackbar } = useSnackbar();
    const [isMobile, setIsMobile] = useState(false);
    const headingFontSize = { xs: '0.9rem', sm: '1rem', md: '1.15rem' };
    const bodyFontSize = { xs: '0.78rem', sm: '0.88rem', md: '0.95rem' };

    useEffect(() => {
        const checkMobile = () => setIsMobile(window.innerWidth < 768);
        checkMobile();
        window.addEventListener('resize', checkMobile);
        return () => window.removeEventListener('resize', checkMobile);
    }, []);

    // Pagination
    const [page, setPage] = useState(0);
    const [rowsPerPage, setRowsPerPage] = useState(10);

    const handleChangePage = (event: unknown, newPage: number) => {
        setPage(newPage);
    };

    const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
        setRowsPerPage(parseInt(event.target.value, 10));
        setPage(0);
    };

    // Form State
    const [formData, setFormData] = useState({
        itemType: 'raw_material',
        itemId: '',
        itemName: '',
        quantity: 0,
        unit: '',
        reason: 'expired',
        notes: '',
    });

    const [rawMaterials, setRawMaterials] = useState<any[]>([]);
    const [menuItems, setMenuItems] = useState<any[]>([]);
    const [selectedItem, setSelectedItem] = useState<any>(null);

    useEffect(() => {
        fetchData();
        fetchOptions();
    }, []);

    const fetchData = async () => {
        try {
            setLoading(true);
            const [logsRes, summaryRes] = await Promise.all([
                wasteAPI.getAll(),
                wasteAPI.getSummary(),
            ]);
            setLogs(Array.isArray(logsRes.data) ? logsRes.data : []);
            setSummary(summaryRes.data || {});
        } catch (error) {
            console.error('Error fetching waste data:', error);
            enqueueSnackbar('Failed to fetch waste data', { variant: 'error' });
        } finally {
            setLoading(false);
        }
    };

    const fetchOptions = async () => {
        try {
            const [rawRes, menuRes] = await Promise.all([
                inventoryAPI.getAll(), // This fetches all inventory items, we should filter for raw materials if needed
                menuAPI.getAll(),
            ]);
            setRawMaterials(Array.isArray(rawRes.data) ? rawRes.data.filter((i: any) => i.category === 'raw_materials') : []);
            const menuData = menuRes.data;
            setMenuItems(Array.isArray(menuData) ? menuData : (menuData?.items || []));
        } catch (error) {
            console.error('Error fetching options:', error);
        }
    };

    const handleOpenDialog = () => {
        setOpenDialog(true);
    };

    const handleCloseDialog = () => {
        setOpenDialog(false);
        resetForm();
    };

    const resetForm = () => {
        setFormData({
            itemType: 'raw_material',
            itemId: '',
            itemName: '',
            quantity: 0,
            unit: '',
            reason: 'expired',
            notes: '',
        });
        setSelectedItem(null);
    };

    const handleFormChange = (e: any) => {
        const { name, value } = e.target;
        setFormData((prev) => ({ ...prev, [name]: value }));

        if (name === 'itemType') {
            setSelectedItem(null);
            setFormData((prev) => ({ ...prev, itemId: '', itemName: '', unit: '' }));
        }
    };

    const handleItemSelect = (event: any, newValue: any) => {
        setSelectedItem(newValue);
        if (newValue) {
            setFormData((prev) => ({
                ...prev,
                itemId: newValue._id,
                itemName: newValue.name,
                unit: newValue.unit || (formData.itemType === 'menu_item' ? 'portion' : ''),
            }));
        } else {
            setFormData((prev) => ({ ...prev, itemId: '', itemName: '' }));
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.itemId || formData.quantity <= 0) {
            enqueueSnackbar('Please select an item and enter quantity', { variant: 'warning' });
            return;
        }

        try {
            setSubmitting(true);
            await wasteAPI.create(formData);
            enqueueSnackbar('Waste logged successfully', { variant: 'success' });
            handleCloseDialog();
            fetchData();
        } catch (error: any) {
            console.error('Error logging waste:', error);
            enqueueSnackbar(error.response?.data?.message || 'Failed to log waste', { variant: 'error' });
        } finally {
            setSubmitting(false);
        }
    };

    const getReasonLabel = (value: string) => {
        return REASONS.find((r) => r.value === value)?.label || value;
    };

    if (loading && logs.length === 0) {
        return (
            <Box display="flex" justifyContent="center" alignItems="center" height="80vh">
                <CircularProgress />
            </Box>
        );
    }

    return (
        <Container maxWidth="xl" sx={{ py: { xs: 2, sm: 4 }, px: { xs: 1.25, sm: 3 } }}>
            <Box
                sx={{
                    display: 'flex',
                    flexDirection: { xs: 'column', sm: 'row' },
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    mb: 4,
                    gap: { xs: 2, sm: 1 }
                }}
            >
                <Typography
                    variant="h4"
                    fontWeight="bold"
                    sx={{
                        fontSize: headingFontSize,
                        color: { xs: '#000', sm: 'text.primary' },
                        textAlign: { xs: 'center', sm: 'left' },
                        width: { xs: '100%', sm: 'auto' }
                    }}
                >
                    Wastage Management
                </Typography>
                <Button
                    variant="contained"
                    color="primary"
                    startIcon={<AddIcon />}
                    onClick={handleOpenDialog}
                    sx={{
                        borderRadius: 2,
                        width: { xs: '100%', sm: 'auto' },
                        fontSize: bodyFontSize
                    }}
                >
                    Log Waste
                </Button>
            </Box>

            {/* Summary Cards */}
         <Grid container spacing={{ xs: 1.25, sm: 3 }} mb={{ xs: 2, sm: 4 }}>
    <Grid item xs={12} md={4}>
        <Card sx={{ 
            borderRadius: 3, 
            boxShadow: 2, 
            height: { xs: 'auto', sm: '100%' },
            display: 'flex',
            alignItems: 'center',
            bgcolor: 'background.paper'
        }}>
            <CardContent sx={{ 
                p: { xs: 0.75, sm: 1.5 },
                width: '100%',
                textAlign: 'center'
            }}>
                <Box display="flex" alignItems="center" justifyContent="center" mb={1.5}>
                    <Box sx={{ 
                        display: 'flex', 
                        alignItems: 'center', 
                        bgcolor: '#eef2ff', 
                        color: '#4f46e5',
                        px: 1.5,
                        py: 0.5,
                        borderRadius: '12px'
                    }}>
                        <TrendingDown sx={{ mr: 1, fontSize: { xs: '1rem', sm: '1.2rem' } }} />
                        <Typography variant="h6" sx={{ fontSize: headingFontSize, fontWeight: 600 }}>
                            Total Financial Loss
                        </Typography>
                    </Box>
                </Box>
                <Typography
                    variant="h6"
                    fontWeight="bold"
                    sx={{ fontSize: { xs: '1rem', sm: '1.4rem', md: '1.7rem' }, lineHeight: 1.1 }}
                >
                    ${summary?.totalLoss.toFixed(2) || '0.00'}
                </Typography>
                <Typography variant="body2" sx={{ color: 'text.secondary', fontSize: bodyFontSize, mt: 0.5 }}>
                    Across {summary?.count || 0} waste records
                </Typography>
            </CardContent>
        </Card>
    </Grid>
    <Grid item xs={12} md={4}>
        <Card sx={{ 
            borderRadius: 3, 
            boxShadow: 3,
            height: { xs: 'auto', sm: '100%' },
            display: 'flex',
            alignItems: 'center'
        }}>
            <CardContent sx={{ 
                p: { xs: 0.75, sm: 1.5 },
                width: '100%',
                textAlign: 'center'
            }}>
                <Box display="flex" alignItems="center" justifyContent="center" mb={0.5} color="warning.main">
                    <Category sx={{ mr: 1, fontSize: { xs: '1.2rem', sm: '1.5rem' } }} />
                    <Typography variant="h6" sx={{ fontSize: headingFontSize }}>
                        Raw Material Loss
                    </Typography>
                </Box>
                <Typography
                    variant="h6"
                    fontWeight="bold"
                    sx={{ fontSize: { xs: '1rem', sm: '1.4rem', md: '1.7rem' }, lineHeight: 1.1 }}
                >
                    ${summary?.byType?.raw_material.toFixed(2) || '0.00'}
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ fontSize: bodyFontSize }}>
                    Ingredients and Supplies
                </Typography>
            </CardContent>
        </Card>
    </Grid>
    <Grid item xs={12} md={4}>
        <Card sx={{ 
            borderRadius: 3, 
            boxShadow: 3,
            height: { xs: 'auto', sm: '100%' },
            display: 'flex',
            alignItems: 'center'
        }}>
            <CardContent sx={{ 
                p: { xs: 0.75, sm: 1.5 },
                width: '100%',
                textAlign: 'center'
            }}>
                <Box display="flex" alignItems="center" justifyContent="center" mb={0.5} color="error.main">
                    <Fastfood sx={{ mr: 1, fontSize: { xs: '1.2rem', sm: '1.5rem' } }} />
                    <Typography variant="h6" sx={{ fontSize: headingFontSize }}>
                        Menu Item Loss
                    </Typography>
                </Box>
                <Typography
                    variant="h6"
                    fontWeight="bold"
                    sx={{ fontSize: { xs: '1rem', sm: '1.4rem', md: '1.7rem' }, lineHeight: 1.1 }}
                >
                    ${summary?.byType?.menu_item.toFixed(2) || '0.00'}
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ fontSize: bodyFontSize }}>
                    Prepared Food Waste
                </Typography>
            </CardContent>
        </Card>
    </Grid>
</Grid>

            {/* Waste Logs Table */}
            {isMobile ? (
                // Mobile Card View
                <Box>
                    {logs.length === 0 ? (
                        <Paper sx={{ p: 3, textAlign: 'center', borderRadius: 3 }}>
                            No wastage records found
                        </Paper>
                    ) : (
                        logs
                            .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
                            .map((log) => (
                                <Card key={log._id} sx={{ mb: 1.25, boxShadow: 2, borderRadius: 2 }}>
                                    <CardContent sx={{ p: 1.35, '&:last-child': { pb: 1.35 } }}>
                                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1.2 }}>
                                            <Typography variant="caption" color="text.secondary">
                                                {format(new Date(log.createdAt), 'MMM dd, yyyy HH:mm')}
                                            </Typography>
                                            <Chip
                                                label={log.itemType === 'raw_material' ? 'Raw Material' : 'Menu Item'}
                                                size="small"
                                                color={log.itemType === 'raw_material' ? 'warning' : 'info'}
                                                variant="outlined"
                                            />
                                        </Box>

                                        <Typography variant="h6" sx={{ mb: 1.1, fontWeight: 'bold', fontSize: '0.95rem', lineHeight: 1.2 }}>
                                            {log.itemName}
                                        </Typography>

                                        <Box sx={{ display: 'grid', gap: 0.85 }}>
                                            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                <Typography variant="body2" color="text.secondary">Quantity:</Typography>
                                                <Typography variant="body2" fontWeight="medium">
                                                    {log.quantity} {log.unit}
                                                </Typography>
                                            </Box>

                                            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                <Typography variant="body2" color="text.secondary">Loss Value:</Typography>
                                                <Typography variant="body1" sx={{ color: 'error.main', fontWeight: 'bold', fontSize: '0.85rem' }}>
                                                    -${log.cost.toFixed(2)}
                                                </Typography>
                                            </Box>

                                            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                <Typography variant="body2" color="text.secondary">Reason:</Typography>
                                                <Chip label={getReasonLabel(log.reason)} size="small" />
                                            </Box>

                                            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                <Typography variant="body2" color="text.secondary">Recorded By:</Typography>
                                                <Typography variant="body2">{log.recordedByName}</Typography>
                                            </Box>

                                            {log.notes && log.notes !== '-' && (
                                                <Box sx={{ mt: 0.7, pt: 1, borderTop: 1, borderColor: 'divider' }}>
                                                    <Typography variant="caption" color="text.secondary" display="block" gutterBottom>
                                                        Notes:
                                                    </Typography>
                                                    <Typography variant="body2">{log.notes}</Typography>
                                                </Box>
                                            )}
                                        </Box>
                                    </CardContent>
                                </Card>
                            ))
                    )}
                    <Paper sx={{ mt: 1.2, borderRadius: 2 }}>
                        <TablePagination
                            rowsPerPageOptions={[5, 10, 25]}
                            component="div"
                            count={logs.length}
                            rowsPerPage={rowsPerPage}
                            page={page}
                            onPageChange={handleChangePage}
                            onRowsPerPageChange={handleChangeRowsPerPage}
                        />
                    </Paper>
                </Box>
            ) : (

                // Desktop/Tablet Table View
                <TableContainer
                    component={Paper}
                    sx={{
                        borderRadius: { xs: 0, sm: 3 },
                        boxShadow: 3,
                        overflow: 'hidden', // Remove scroll
                    }}
                >
                    <Table>
                        <TableHead sx={{ backgroundColor: 'grey.100' }}>
                            <TableRow>
                                <TableCell><b>Date</b></TableCell>
                                <TableCell><b>Item Name</b></TableCell>
                                <TableCell sx={{ display: { xs: 'none', md: 'table-cell' } }}><b>Type</b></TableCell>
                                <TableCell><b>Quantity</b></TableCell>
                                <TableCell><b>Loss Value</b></TableCell>
                                <TableCell sx={{ display: { xs: 'none', lg: 'table-cell' } }}><b>Reason</b></TableCell>
                                <TableCell sx={{ display: { xs: 'none', lg: 'table-cell' } }}><b>Recorded By</b></TableCell>
                                <TableCell sx={{ display: { xs: 'none', xl: 'table-cell' } }}><b>Notes</b></TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {logs.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={8} align="center" sx={{ py: 3 }}>
                                        No wastage records found
                                    </TableCell>
                                </TableRow>
                            ) : (
                                logs
                                    .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
                                    .map((log) => (
                                        <TableRow key={log._id} hover>
                                            <TableCell sx={{ fontSize: { xs: '0.75rem', md: '0.875rem' } }}>
                                                {format(new Date(log.createdAt), 'MMM dd, yyyy HH:mm')}
                                            </TableCell>
                                            <TableCell><b>{log.itemName}</b></TableCell>
                                            <TableCell sx={{ display: { xs: 'none', md: 'table-cell' } }}>
                                                <Chip
                                                    label={log.itemType === 'raw_material' ? 'Raw Material' : 'Menu Item'}
                                                    size="small"
                                                    color={log.itemType === 'raw_material' ? 'warning' : 'info'}
                                                    variant="outlined"
                                                />
                                            </TableCell>
                                            <TableCell sx={{ fontSize: { xs: '0.75rem', md: '0.875rem' } }}>
                                                {log.quantity} {log.unit}
                                            </TableCell>
                                            <TableCell sx={{ color: 'error.main', fontWeight: 'bold', fontSize: { xs: '0.75rem', md: '0.875rem' } }}>
                                                -${log.cost.toFixed(2)}
                                            </TableCell>
                                            <TableCell sx={{ display: { xs: 'none', lg: 'table-cell' } }}>
                                                <Chip label={getReasonLabel(log.reason)} size="small" />
                                            </TableCell>
                                            <TableCell sx={{ display: { xs: 'none', lg: 'table-cell' } }}>
                                                {log.recordedByName}
                                            </TableCell>
                                            <TableCell sx={{ display: { xs: 'none', xl: 'table-cell' } }}>
                                                {log.notes || '-'}
                                            </TableCell>
                                        </TableRow>
                                    ))
                            )}
                        </TableBody>
                    </Table>
                    <TablePagination
                        rowsPerPageOptions={[5, 10, 25]}
                        component="div"
                        count={logs.length}
                        rowsPerPage={rowsPerPage}
                        page={page}
                        onPageChange={handleChangePage}
                        onRowsPerPageChange={handleChangeRowsPerPage}
                    />
                </TableContainer>
            )}

            {/* Log Waste Dialog */}
            <Dialog
                open={openDialog}
                onClose={handleCloseDialog}
                maxWidth="sm"
                fullWidth
                sx={{
                    '& .MuiDialog-container': {
                        alignItems: { xs: 'flex-start', sm: 'center' }, // Align to top on mobile
                        pt: { xs: '70px', sm: 0 } // Add specific padding top for mobile
                    }
                }}
            >
                <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontWeight: 'bold' }}>
                    Record New Waste
                    <IconButton
                        onClick={handleCloseDialog}
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
                        <CloseIcon sx={{ fontSize: '1.1rem' }} />
                    </IconButton>
                </DialogTitle>
                <DialogContent dividers sx={{ '& .MuiFormLabel-asterisk': { color: 'red' } }}>
                    <Box component="form" sx={{ mt: 1 }}>
                        <Grid container spacing={2}>
                            <Grid item xs={12}>
                                <FormControl fullWidth>
                                    <InputLabel>Item Type</InputLabel>
                                    <Select
                                        name="itemType"
                                        value={formData.itemType}
                                        label="Item Type"
                                        onChange={handleFormChange}
                                    >
                                        <MenuItem value="raw_material">Raw Material / Inventory</MenuItem>
                                        <MenuItem value="menu_item">Finished Dish / Menu Item</MenuItem>
                                    </Select>
                                </FormControl>
                            </Grid>

                            <Grid item xs={12}>
                                <Autocomplete
                                    options={formData.itemType === 'raw_material' ? rawMaterials : menuItems}
                                    getOptionLabel={(option) => option.name}
                                    value={selectedItem}
                                    onChange={handleItemSelect}
                                    renderInput={(params) => (
                                        <TextField
                                            {...params}
                                            label={`Select ${formData.itemType === 'raw_material' ? 'Material' : 'Item'}`}
                                            required
                                        />
                                    )}
                                />
                            </Grid>

                            <Grid item xs={6}>
                                <TextField
                                    fullWidth
                                    label="Quantity"
                                    name="quantity"
                                    type="number"
                                    value={formData.quantity}
                                    onChange={(e) => {
                                        const val = parseFloat(e.target.value);
                                        // Restrict quantity to 0-99,999 Range
                                        setFormData(prev => ({ ...prev, quantity: isNaN(val) ? 0 : Math.min(99999, Math.max(0, val)) }));
                                    }}
                                    inputProps={{ min: 0, max: 99999, step: "any" }}
                                    required
                                    helperText="Max 99,999"
                                />
                            </Grid>
                            <Grid item xs={6}>
                                <TextField
                                    fullWidth
                                    label="Unit"
                                    name="unit"
                                    value={formData.unit}
                                    disabled // Unit is derived from selected item
                                />
                            </Grid>

                            <Grid item xs={12}>
                                <FormControl fullWidth>
                                    <InputLabel>Reason for Waste</InputLabel>
                                    <Select
                                        name="reason"
                                        value={formData.reason}
                                        label="Reason for Waste"
                                        onChange={handleFormChange}
                                    >
                                        {REASONS.map((r) => (
                                            <MenuItem key={r.value} value={r.value}>
                                                {r.label}
                                            </MenuItem>
                                        ))}
                                    </Select>
                                </FormControl>
                            </Grid>

                            <Grid item xs={12}>
                                <TextField
                                    fullWidth
                                    label="Notes / Details"
                                    name="notes"
                                    multiline
                                    rows={3}
                                    inputProps={{ maxLength: 200 }}
                                    value={formData.notes}
                                    onChange={handleFormChange}
                                    helperText={`${formData.notes.length}/200`}
                                    placeholder="e.g. Broke on floor, expired yesterday"
                                />
                            </Grid>

                            {selectedItem && (
                                <Grid item xs={12}>
                                    <Alert severity="info">
                                        Approximate Loss: <b>${((selectedItem.costPrice || 0) * formData.quantity).toFixed(2)}</b>
                                    </Alert>
                                </Grid>
                            )}
                        </Grid>
                    </Box>
                </DialogContent>
                <DialogActions sx={{ px: 3, py: 2 }}>
                    <Button onClick={handleCloseDialog} color="inherit">
                        Cancel
                    </Button>
                    <Button
                        onClick={handleSubmit}
                        variant="contained"
                        disabled={submitting}
                        startIcon={submitting ? <CircularProgress size={20} /> : null}
                    >
                        {submitting ? 'Recording...' : 'Record Waste'}
                    </Button>
                </DialogActions>
            </Dialog>
        </Container>
    );
};

export default WasteManagementPage;

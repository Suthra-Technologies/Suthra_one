import React, { useState, useEffect } from 'react';
import {
    Box,
    Container,
    Typography,
    Tabs,
    Tab,
    Button,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    TablePagination,
    Paper,
    Chip,
    IconButton,
    Alert,
    CircularProgress,
    TextField,
    Card,
    CardContent,
    Grid,
    Stack,
    useTheme,
    useMediaQuery,
    alpha,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Select,
    MenuItem,
    FormControl,
    InputLabel,
    Badge,
} from '@mui/material';
import {
    Add as AddIcon,
    Edit as EditIcon,
    Delete as DeleteIcon,
    TrendingDown as UsageIcon,
    Refresh as RefreshIcon,
    WarningAmber as WarningIcon,
    DeleteForever as DeleteForeverIcon,
    Close as CloseIcon,
    CloudUpload as BulkUploadIcon,
     Notes as NotesIcon,
    EventNote as ItemNotesIcon,
    History as HistoryIcon,
} from '@mui/icons-material';
import { Drawer } from '@mui/material';
// import { NotesTabContainer } from 'src/components/notes/NotesTabContainer';
// import { useNotesHistory } from 'src/hooks/useNotesHistory';
import { toast } from 'react-hot-toast';
import { inventoryAPI } from '../../services/api';
import RawMaterialDialog from '../../components/RawMaterialDialog';
import UsageDialog from '../../components/UsageDialog';
import BulkUploadDialog from '../../components/BulkUploadDialog';
// import VendorNotesDialog from 'src/components/VendorNotesDialog';
import { useSettings } from '../../context/SettingsContext';

interface RawMaterial {
    _id: string;
    name: string;
    sku: string;
    category: string;
    unit: string;
    currentStock: number;
    minimumStock: number;
    reorderLevel: number;
    costPrice: number;
    maximumStock: number;
    supplier?: {
        name?: string;
        contact?: string;
    };
    createdBy?: {
        firstName: string;
        lastName: string;
    };
    updatedBy?: {
        firstName: string;
        lastName: string;
    };
    createdAt: string;
    updatedAt: string;
}

// Vendor interface
interface Vendor {
    _id: string;
    name: string;
    contact?: string;
    email?: string;
    address?: string;
    status: string;
}

interface UsageRecord {
    _id: string;
    item: {
        name: string;
        sku: string;
        unit: string;
    };
    quantity: number;
    reason: string;
    totalCost: number;
    createdAt: string;
    performedBy: {
        firstName?: string;
        lastName?: string;
        username?: string;
        email?: string;
    };
}

interface DailyReport {
    date?: string;
    fromDate?: string;
    toDate?: string;
    summary: {
        totalItems: number;
        totalCost: number;
    };
    records: UsageRecord[];
    pagination?: {
        total: number;
        page: number;
        limit: number;
        totalPages: number;
    };
}

const InventoryPage: React.FC = () => {
    const { formatCurrency } = useSettings();
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
    const isTabletOrMobile = useMediaQuery(theme.breakpoints.down('lg'));
    const [tabValue, setTabValue] = useState(0);
    const [rawMaterials, setRawMaterials] = useState<RawMaterial[]>([]);
    const [dailyReport, setDailyReport] = useState<DailyReport | null>(null);
    const [loading, setLoading] = useState(false);
// Notes History Feature
    const { openTab, activeTabs } = useNotesHistory();
    const [notesDrawerOpen, setNotesDrawerOpen] = useState(false);
    // Date range for usage report - default to today
    const today = new Date().toISOString().split('T')[0];
    const [fromDate, setFromDate] = useState(today);
    const [toDate, setToDate] = useState(today);

    const [page, setPage] = useState(0);
    const [limit, setLimit] = useState(10);
    const [totalMaterials, setTotalMaterials] = useState(0);

    const [usagePage, setUsagePage] = useState(0);
    const [usageLimit, setUsageLimit] = useState(10);
    const [totalUsageRecords, setTotalUsageRecords] = useState(0);
    const [reportType, setReportType] = useState('usage');

    const [materialDialogOpen, setMaterialDialogOpen] = useState(false);
    const [usageDialogOpen, setUsageDialogOpen] = useState(false);
    const [bulkUploadDialogOpen, setBulkUploadDialogOpen] = useState(false);
    const [selectedMaterial, setSelectedMaterial] = useState<RawMaterial | null>(null);
    const [selectedVendorForNotes, setSelectedVendorForNotes] = useState<Vendor | null>(null);
    const [vendorNotesOpen, setVendorNotesOpen] = useState(false);
    const [confirmDelete, setConfirmDelete] = useState<{ open: boolean; title: string; message: React.ReactNode; onConfirm: () => void }>({
        open: false,
        title: '',
        message: '',
        onConfirm: () => { }
    });

    useEffect(() => {
        loadRawMaterials();
    }, []);

    useEffect(() => {
        if (tabValue === 1) {
            loadDailyReport();
        }
    }, [tabValue, fromDate, toDate, usagePage, usageLimit, reportType]);

    useEffect(() => {
        if (tabValue === 0) {
            loadRawMaterials();
        }
    }, [page, limit, tabValue]);

    const loadRawMaterials = async () => {
        try {
            setLoading(true);
            const response = await inventoryAPI.getRawMaterials({ page: page + 1, limit });
            const materials = Array.isArray(response.data?.materials) ? response.data.materials : [];
            setRawMaterials(materials);
            setTotalMaterials(response.data?.total ?? materials.length);
        } catch (err: any) {
            toast.error(err.response?.data?.message || 'Failed to load raw materials');
        } finally {
            setLoading(false);
        }
    };

    const loadDailyReport = async () => {
        try {
            setLoading(true);
            const response = await inventoryAPI.getUsageReport(fromDate, toDate, { page: usagePage + 1, limit: usageLimit, type: reportType });
            setDailyReport(response.data);
            setTotalUsageRecords(response.data.pagination?.total || 0);
        } catch (err: any) {
            toast.error(err.response?.data?.message || 'Failed to load usage report');
        } finally {
            setLoading(false);
        }
    };

    const handleAddMaterial = () => {
        setSelectedMaterial(null);
        setMaterialDialogOpen(true);
    };

    const handleEditMaterial = (material: RawMaterial) => {
        console.log('EDIT clicked for material:', material.name);
        setSelectedMaterial(material);
        setMaterialDialogOpen(true);
    };

    const handleDeleteMaterial = async (material: RawMaterial) => {
        setConfirmDelete({
            open: true,
            title: 'Delete Material',
            message: <>Are you sure you want to delete <strong>"{material.name}"</strong>? This action cannot be undone.</>,
            onConfirm: async () => {
                try {
                    await inventoryAPI.delete(material._id);
                    toast.success(`Material "${material.name}" deleted successfully`);
                    loadRawMaterials();
                } catch (err: any) {
                    toast.error(err.response?.data?.message || 'Failed to delete material');
                }
            }
        });
    };

    const handleRecordUsage = (material: RawMaterial) => {
        console.log('USAGE clicked for material:', material.name);
        setSelectedMaterial(material);
        setUsageDialogOpen(true);
    };

    const handleMaterialSaved = () => {
        console.log('handleMaterialSaved called - closing dialog and reloading');
        setMaterialDialogOpen(false);
        loadRawMaterials();
    };

    const handleUsageRecorded = () => {
        setUsageDialogOpen(false);
        loadRawMaterials();
        if (tabValue === 1) {
            loadDailyReport();
        }
    };

    const handleVendorNotes = (material: RawMaterial) => {
        if (material.supplier?.name) {
            // Create vendor object from supplier data
            const vendor: Vendor = {
                _id: material._id + '_vendor', // Use material ID + suffix as vendor ID
                name: material.supplier.name,
                contact: material.supplier.contact,
                email: material.supplier.email,
                address: material.supplier.address,
                status: 'active'
            };
            setSelectedVendorForNotes(vendor);
            setVendorNotesOpen(true);
        } else {
            toast.error('No vendor assigned to this material');
        }
    };

    const handleItemNotes = (material: RawMaterial) => {
        openTab(material._id, material.name);
        setNotesDrawerOpen(true);
    };

    const getStockStatus = (material: RawMaterial) => {
        if (material.currentStock <= material.reorderLevel) {
            return { label: 'Critical', color: 'error' as const };
        } else if (material.currentStock <= material.minimumStock) {
            return { label: 'Low', color: 'warning' as const };
        }
        return { label: 'Good', color: 'success' as const };
    };

    return (
        <Container maxWidth="xl" sx={{ mt: 4, mb: 4 }}>
            <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Typography variant="h4" fontWeight="bold">
                    Inventory Management
                </Typography>
                {isMobile ? (
                    <IconButton
                        color="primary"
                        onClick={() => tabValue === 0 ? loadRawMaterials() : loadDailyReport()}
                        sx={{ bgcolor: alpha(theme.palette.primary.main, 0.1), '&:hover': { bgcolor: alpha(theme.palette.primary.main, 0.2) } }}
                    >
                        <RefreshIcon />
                    </IconButton>
                ) : (
                    <Button
                        variant="outlined"
                        startIcon={<RefreshIcon />}
                        onClick={() => tabValue === 0 ? loadRawMaterials() : loadDailyReport()}
                    >
                        Refresh
                    </Button>
                )}
            </Box>

            <Paper sx={{ mb: 3 }}>
                <Tabs value={tabValue} onChange={(_, newValue) => setTabValue(newValue)}>
                    <Tab label="Raw Materials" />
                    <Tab label="Usage Reports" />
                </Tabs>
                  <Box sx={{ display: 'flex', alignItems: 'center', px: 1 }}>
                    <IconButton
                        color={activeTabs.length > 0 ? "primary" : "default"}
                        onClick={() => setNotesDrawerOpen(true)}
                        title="Item Notes Center"
                    >
                        <Badge badgeContent={activeTabs.length} color="primary">
                            <ItemNotesIcon />
                        </Badge>
                    </IconButton>
                </Box>
            </Paper>

            {/* Raw Materials Tab */}
            {tabValue === 0 && (
                <Box>
                    <Box sx={{ mb: 2, display: 'flex', justifyContent: { xs: 'center', sm: 'flex-end' } }}>
                        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} sx={{ width: { xs: '100%', sm: 'auto' } }}>
                            <Button
                                variant="outlined"
                                startIcon={<BulkUploadIcon />}
                                onClick={() => setBulkUploadDialogOpen(true)}
                                sx={{
                                    width: { xs: '100%', sm: 'auto' },
                                    py: { xs: 1.2, sm: 1 },
                                    borderColor: 'primary.main',
                                    '&:hover': {
                                        borderColor: 'primary.dark',
                                        bgcolor: alpha(theme.palette.primary.main, 0.05),
                                    }
                                }}
                            >
                                Bulk Upload
                            </Button>
                            <Button
                                variant="contained"
                                startIcon={<AddIcon />}
                                onClick={handleAddMaterial}
                                sx={{ width: { xs: '100%', sm: 'auto' }, py: { xs: 1.2, sm: 1 } }}
                            >
                                Add Material
                            </Button>
                        </Stack>
                    </Box>

                    {loading ? (
                        <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
                            <CircularProgress />
                        </Box>
                    ) : rawMaterials.length === 0 ? (
                        <Box sx={{ p: 4, textAlign: 'center' }}>
                            <Typography color="text.secondary">
                                No raw materials found. Click "Add Material" to get started.
                            </Typography>
                        </Box>
                    ) : isTabletOrMobile ? (
                        // Mobile Card View for Raw Materials
                        <Stack spacing={2}>
                            {rawMaterials.map((material) => {
                                const status = getStockStatus(material);
                                return (
                                    <Card key={material._id}>
                                        <CardContent>
                                            <Stack direction="row" justifyContent="space-between" alignItems="center" mb={2}>
                                                <Box>
                                                    <Typography variant="subtitle1" fontWeight="bold">
                                                        {material.name}
                                                    </Typography>
                                                </Box>
                                                <Chip label={status.label} color={status.color} size="small" />
                                            </Stack>

                                            <Grid container spacing={1} mb={2}>
                                                <Grid item xs={6}>
                                                    <Typography variant="caption" color="text.secondary">Stock</Typography>
                                                    <Typography variant="body2" fontWeight="bold">
                                                        {parseFloat((material.currentStock || 0).toFixed(2))} {material.unit}
                                                    </Typography>
                                                </Grid>
                                                <Grid item xs={6}>
                                                    <Typography variant="caption" color="text.secondary">Reorder Level</Typography>
                                                    <Typography variant="body2">
                                                        {parseFloat((material.reorderLevel || 0).toFixed(2))}
                                                    </Typography>
                                                </Grid>
                                                <Grid item xs={12}>
                                                    <Typography variant="caption" color="text.secondary">Last Modified</Typography>
                                                    <Typography variant="body2" sx={{ fontSize: '0.75rem' }}>
                                                        {material.updatedBy ? `${material.updatedBy.firstName} ${material.updatedBy.lastName}` : 'System'}
                                                        ({new Date(material.updatedAt).toLocaleString()})
                                                    </Typography>
                                                </Grid>
                                            </Grid>

                                            <Stack direction="row" spacing={1} justifyContent="flex-end" sx={{ mt: 1, borderTop: 1, borderColor: 'divider', pt: 2 }}>
                                                <Button
                                                    size="small"
                                                    startIcon={<UsageIcon />}
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        handleRecordUsage(material);
                                                    }}
                                                >
                                                    Usage
                                                </Button>
                                                   {material.supplier?.name && (
                                                    <Button
                                                        size="small"
                                                        startIcon={<NotesIcon />}
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            handleVendorNotes(material);
                                                        }}
                                                        color="info"
                                                    >
                                                        Notes
                                                    </Button>
                                                )}
                                                <Button
                                                    size="small"
                                                    startIcon={<ItemNotesIcon />}
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        handleItemNotes(material);
                                                    }}
                                                    color="primary"
                                                >
                                                    Item Notes
                                                </Button>

                                                <IconButton
                                                    size="small"
                                                    color="primary"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        handleEditMaterial(material);
                                                    }}
                                                >
                                                    <EditIcon />
                                                </IconButton>
                                                <IconButton
                                                    size="small"
                                                    color="error"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        handleDeleteMaterial(material);
                                                    }}
                                                >
                                                    <DeleteIcon />
                                                </IconButton>
                                            </Stack>
                                        </CardContent>
                                    </Card>
                                );
                            })}
                        </Stack>
                    ) : (
                        // Desktop Table View
                        <TableContainer component={Paper}>
                            <Table>
                                <TableHead>
                                    <TableRow>
                                        <TableCell>Name</TableCell>
                                        <TableCell align="right">Current Stock</TableCell>
                                        <TableCell align="right">Min Stock</TableCell>
                                        <TableCell align="right">Reorder Level</TableCell>
                                        <TableCell>Unit</TableCell>
                                        <TableCell>Status</TableCell>
                                        <TableCell>Supplier</TableCell>
                                        <TableCell>Last Modified</TableCell>
                                        <TableCell align="center">Actions</TableCell>
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {rawMaterials.map((material) => {
                                        const status = getStockStatus(material);
                                        return (
                                            <TableRow key={material._id}>
                                                <TableCell>{material.name}</TableCell>
                                                <TableCell align="right">
                                                    <strong>{parseFloat((material.currentStock || 0).toFixed(2))}</strong>
                                                </TableCell>
                                                <TableCell align="right">{parseFloat((material.minimumStock || 0).toFixed(2))}</TableCell>
                                                <TableCell align="right">{parseFloat((material.reorderLevel || 0).toFixed(2))}</TableCell>
                                                <TableCell>{material.unit}</TableCell>
                                                <TableCell>
                                                    <Chip label={status.label} color={status.color} size="small" />
                                                </TableCell>
                                                <TableCell>{material.supplier?.name || '-'}</TableCell>
                                                <TableCell>
                                                    <Box>
                                                        <Typography variant="body2" fontWeight="bold">
                                                            {material.updatedBy ? `${material.updatedBy.firstName} ${material.updatedBy.lastName}` : (material.createdBy ? `${material.createdBy.firstName} ${material.createdBy.lastName}` : 'System')}
                                                        </Typography>
                                                        <Typography variant="caption" color="text.secondary">
                                                            {new Date(material.updatedAt).toLocaleString()}
                                                        </Typography>
                                                    </Box>
                                                </TableCell>
                                                <TableCell align="center">
                                                    <IconButton
                                                        size="small"
                                                        color="primary"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            handleRecordUsage(material);
                                                        }}
                                                        title="Record Usage"
                                                    >
                                                        <UsageIcon />
                                                    </IconButton>
                                                    {/* {material.supplier?.name && (
                                                        <IconButton
                                                            size="small"
                                                            color="info"
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                handleVendorNotes(material);
                                                            }}
                                                            title="Vendor Notes"
                                                        >
                                                            <NotesIcon />
                                                        </IconButton>
                                                    )} */}
                                                    <IconButton
                                                        size="small"
                                                        color="primary"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            handleItemNotes(material);
                                                        }}
                                                        title="Item Notes"
                                                    >
                                                        <ItemNotesIcon />
                                                    </IconButton>
                                                    <IconButton
                                                        size="small"
                                                        color="primary"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            handleEditMaterial(material);
                                                        }}
                                                        title="Edit"
                                                    >
                                                        <EditIcon />
                                                    </IconButton>
                                                    <IconButton
                                                        size="small"
                                                        color="error"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            handleDeleteMaterial(material);
                                                        }}
                                                        title="Delete"
                                                    >
                                                        <DeleteIcon />
                                                    </IconButton>
                                                </TableCell>
                                            </TableRow>
                                        );
                                    })}
                                </TableBody>
                            </Table>
                        </TableContainer>
                    )}
                    <TablePagination
                        component="div"
                        count={totalMaterials}
                        page={page}
                        onPageChange={(e, newPage) => setPage(newPage)}
                        rowsPerPage={limit}
                        onRowsPerPageChange={(e) => {
                            setLimit(parseInt(e.target.value, 10));
                            setPage(0);
                        }}
                    />
                </Box>
            )}

            {/* Usage Reports Tab */}
            {tabValue === 1 && (
                <Box>
                    <Grid container spacing={2} sx={{ mb: 3 }}>
                        <Grid item xs={6} sm="auto">
                            <TextField
                                label="From Date"
                                type="date"
                                value={fromDate}
                                onChange={(e) => setFromDate(e.target.value)}
                                InputLabelProps={{ shrink: true }}
                                sx={{ minWidth: { xs: '100%', sm: 200 } }}
                                fullWidth
                            />
                        </Grid>
                        <Grid item xs={6} sm="auto">
                            <TextField
                                label="To Date"
                                type="date"
                                value={toDate}
                                onChange={(e) => setToDate(e.target.value)}
                                InputLabelProps={{ shrink: true }}
                                sx={{ minWidth: { xs: '100%', sm: 200 } }}
                                fullWidth
                            />
                        </Grid>
                        <Grid item xs={12} sm="auto">
                            <FormControl size="small" sx={{ minWidth: { xs: '100%', sm: 150 }, mt: { xs: 0, sm: 0 } }}>
                                <InputLabel>Report Type</InputLabel>
                                <Select
                                    label="Report Type"
                                    value={reportType}
                                    onChange={(e) => {
                                        setReportType(e.target.value);
                                        setUsagePage(0);
                                    }}
                                >
                                    <MenuItem value="usage">Usage</MenuItem>
                                    <MenuItem value="wastage">Wastage</MenuItem>
                                </Select>
                            </FormControl>
                        </Grid>
                    </Grid>

                    {loading ? (
                        <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
                            <CircularProgress />
                        </Box>
                    ) : dailyReport ? (
                        <>
                            <Grid container spacing={3} sx={{ mb: 3 }}>
                                <Grid item xs={12} md={6}>
                                    <Card>
                                        <CardContent>
                                            <Typography color="text.secondary" gutterBottom>
                                                Total Materials Used
                                            </Typography>
                                            <Typography variant="h4">
                                                {dailyReport.summary.totalItems}
                                            </Typography>
                                        </CardContent>
                                    </Card>
                                </Grid>
                                <Grid item xs={12} md={6}>
                                    <Card>
                                        <CardContent>
                                            <Typography color="text.secondary" gutterBottom>
                                                Total Cost
                                            </Typography>
                                            <Typography variant="h4">
                                                {formatCurrency(dailyReport.summary.totalCost)}
                                            </Typography>
                                        </CardContent>
                                    </Card>
                                </Grid>
                            </Grid>

                            {dailyReport.records.length === 0 ? (
                                <Box sx={{ p: 4, textAlign: 'center' }}>
                                    <Typography color="text.secondary">
                                        No usage recorded for this date range.
                                    </Typography>
                                </Box>
                            ) : isTabletOrMobile ? (
                                // Mobile Card View for Usage Reports
                                <Stack spacing={2}>
                                    {dailyReport.records.map((record) => (
                                        <Card key={record._id}>
                                            <CardContent>
                                                <Stack direction="row" justifyContent="space-between" alignItems="flex-start" mb={2}>
                                                    <Box>
                                                        <Typography variant="subtitle1" fontWeight="bold">
                                                            {record.item.name}
                                                        </Typography>
                                                        <Typography variant="caption" color="text.secondary">
                                                            {new Date(record.createdAt).toLocaleTimeString()} · {new Date(record.createdAt).toLocaleDateString()}
                                                        </Typography>
                                                    </Box>
                                                    <Typography variant="body2" fontWeight="bold" color="primary">
                                                        {formatCurrency(record.totalCost)}
                                                    </Typography>
                                                </Stack>

                                                <Typography variant="caption" color="text.secondary" display="block" mb={1}>
                                                    User: {record.performedBy ? (record.performedBy.firstName ? `${record.performedBy.firstName} ${record.performedBy.lastName}` : (record.performedBy.username || record.performedBy.email)) : 'System'}
                                                </Typography>

                                                <Grid container spacing={1}>
                                                    <Grid item xs={6}>
                                                        <Typography variant="caption" color="text.secondary">Quantity Used</Typography>
                                                        <Typography variant="body2">
                                                            {Math.abs(record.quantity)} {record.item.unit}
                                                        </Typography>
                                                    </Grid>
                                                    <Grid item xs={6}>
                                                        <Typography variant="caption" color="text.secondary">Reason</Typography>
                                                        <Typography variant="body2">{record.reason}</Typography>
                                                    </Grid>
                                                </Grid>
                                            </CardContent>
                                        </Card>
                                    ))}
                                </Stack>
                            ) : (
                                <TableContainer component={Paper}>
                                    <Table>
                                        <TableHead>
                                            <TableRow>
                                                <TableCell>Material</TableCell>
                                                <TableCell align="right">Quantity Used</TableCell>
                                                <TableCell>Reason</TableCell>
                                                <TableCell align="right">Cost</TableCell>
                                                <TableCell>User</TableCell>
                                                <TableCell>Time</TableCell>
                                            </TableRow>
                                        </TableHead>
                                        <TableBody>
                                            {dailyReport.records.map((record) => (
                                                <TableRow key={record._id}>
                                                    <TableCell>{record.item.name}</TableCell>
                                                    <TableCell align="right">
                                                        {Math.abs(record.quantity)} {record.item.unit}
                                                    </TableCell>
                                                    <TableCell>{record.reason}</TableCell>
                                                    <TableCell align="right">{formatCurrency(record.totalCost)}</TableCell>
                                                    <TableCell>{record.performedBy ? (record.performedBy.firstName ? `${record.performedBy.firstName} ${record.performedBy.lastName}` : (record.performedBy.username || record.performedBy.email)) : 'System'}</TableCell>
                                                    <TableCell>
                                                        {new Date(record.createdAt).toLocaleTimeString()}
                                                    </TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                </TableContainer>
                            )}
                        </>
                    ) : null}

                    {dailyReport && (
                        <TablePagination
                            component="div"
                            count={totalUsageRecords}
                            page={usagePage}
                            onPageChange={(e, newPage) => setUsagePage(newPage)}
                            rowsPerPage={usageLimit}
                            onRowsPerPageChange={(e) => {
                                setUsageLimit(parseInt(e.target.value, 10));
                                setUsagePage(0);
                            }}
                        />
                    )}
                </Box>
            )}

          

            <RawMaterialDialog
                open={materialDialogOpen}
                onClose={() => setMaterialDialogOpen(false)}
                onSave={handleMaterialSaved}
                material={selectedMaterial}
            />

            <UsageDialog
                open={usageDialogOpen}
                onClose={() => setUsageDialogOpen(false)}
                onSave={handleUsageRecorded}
                material={selectedMaterial}
            />

            <BulkUploadDialog
                open={bulkUploadDialogOpen}
                onClose={() => setBulkUploadDialogOpen(false)}
                onUploadComplete={loadRawMaterials}
            />

            {/* Custom Delete Confirmation Dialog */}
            <Dialog
                open={confirmDelete.open}
                onClose={() => setConfirmDelete({ ...confirmDelete, open: false })}
                PaperProps={{
                    sx: { borderRadius: 3, p: 1, maxWidth: '400px' }
                }}
            >
                <DialogTitle sx={{ m: 0, p: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                        <WarningIcon sx={{ color: 'error.main', fontSize: 32 }} />
                        <Typography variant="h6" sx={{ fontWeight: 'bold', color: 'error.main' }}>
                            {confirmDelete.title}
                        </Typography>
                    </Box>
                    <IconButton
                        onClick={() => setConfirmDelete({ ...confirmDelete, open: false })}
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
                <DialogContent>
                    <Typography variant="body1" sx={{ color: 'text.secondary', py: 1 }}>
                        {confirmDelete.message}
                    </Typography>
                </DialogContent>
                <DialogActions sx={{ p: 2.5, pt: 1.5, gap: 1.5 }}>
                    <Button
                        onClick={() => setConfirmDelete({ ...confirmDelete, open: false })}
                        variant="outlined"
                        sx={{
                            borderRadius: 2,
                            px: 3,
                            color: 'text.secondary',
                            borderColor: 'divider',
                            '&:hover': { borderColor: 'text.secondary', bgcolor: 'action.hover' }
                        }}
                    >
                        Cancel
                    </Button>
                    <Button
                        onClick={() => {
                            confirmDelete.onConfirm();
                            setConfirmDelete({ ...confirmDelete, open: false });
                        }}
                        variant="contained"
                        color="error"
                        startIcon={<DeleteForeverIcon />}
                        sx={{
                            borderRadius: 2,
                            px: 3,
                            boxShadow: theme.shadows[4],
                            '&:hover': { boxShadow: theme.shadows[8] }
                        }}
                    >
                        Delete
                    </Button>
                </DialogActions>
            </Dialog>
              {/* Vendor Notes Dialog */}
            <VendorNotesDialog
                open={vendorNotesOpen}
                onClose={() => setVendorNotesOpen(false)}
                vendor={selectedVendorForNotes}
            />

            {/* Item Notes Recovery Drawer */}
            <Drawer
                anchor="right"
                open={notesDrawerOpen}
                onClose={() => setNotesDrawerOpen(false)}
                PaperProps={{
                    sx: { width: { xs: '100%', sm: 450, md: 500 }, p: 0 }
                }}
            >
                <Box sx={{ h: '100%', display: 'flex', flexDirection: 'column', height: '100%' }}>
                    <Box sx={{ p: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center', bgcolor: 'primary.main', color: 'white' }}>
                        <Typography variant="h6" fontWeight="bold">Item Notes Center</Typography>
                        <IconButton onClick={() => setNotesDrawerOpen(false)} size="small" sx={{ color: 'white' }}>
                            <CloseIcon />
                        </IconButton>
                    </Box>
                    <Box sx={{ flexGrow: 1, overflow: 'hidden' }}>
                        <NotesTabContainer />
                    </Box>
                </Box>
            </Drawer>
        </Container>
    );
};

export default InventoryPage;


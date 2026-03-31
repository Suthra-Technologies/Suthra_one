import React, { useState, useRef } from 'react';
import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Button,
    Box,
    Typography,
    IconButton,
    Paper,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Chip,
    LinearProgress,
    Alert,
    AlertTitle,
    Stack,
    Divider,
    useTheme,
    alpha,
    Collapse,
    List,
    ListItem,
    ListItemIcon,
    ListItemText,
} from '@mui/material';
import {
    Close as CloseIcon,
    CloudUpload as UploadIcon,
    Download as DownloadIcon,
    CheckCircle as SuccessIcon,
    Error as ErrorIcon,
    WarningAmber as WarningIcon,
    Description as FileIcon,
    DeleteOutline as DeleteIcon,
    ExpandMore as ExpandMoreIcon,
    ExpandLess as ExpandLessIcon,
} from '@mui/icons-material';
import * as XLSX from 'xlsx';
import { inventoryAPI } from '../services/api';
import { toast } from 'react-hot-toast';
import { useSettings } from '../context/SettingsContext';

interface BulkUploadDialogProps {
    open: boolean;
    onClose: () => void;
    onUploadComplete: () => void;
}

interface ParsedRow {
    name: string;
    category: string;
    unit: string;
    currentStock: number;
    minimumStock: number;
    maximumStock: number;
    reorderLevel: number;
    costPrice: number;
    sellingPrice?: number;
    supplierName?: string;
    supplierContact?: string;
    supplierEmail?: string;
    description?: string;
    isPerishable?: boolean | string;
    shelfLife?: number;
    [key: string]: any;
}

interface UploadResult {
    success: number;
    failed: number;
    errors: Array<{ row: number; name?: string; error: string }>;
}

const BulkUploadDialog: React.FC<BulkUploadDialogProps> = ({
    open,
    onClose,
    onUploadComplete,
}) => {
    const theme = useTheme();
    const fileInputRef = useRef<HTMLInputElement>(null);
    const { settings, getUnits, unitSystem } = useSettings();
    const units = getUnits();

    const [file, setFile] = useState<File | null>(null);
    const [parsedData, setParsedData] = useState<ParsedRow[]>([]);
    const [uploading, setUploading] = useState(false);
    const [uploadResult, setUploadResult] = useState<UploadResult | null>(null);
    const [parseError, setParseError] = useState<string | null>(null);
    const [showErrors, setShowErrors] = useState(false);

    const handleClose = () => {
        if (!uploading) {
            setFile(null);
            setParsedData([]);
            setUploadResult(null);
            setParseError(null);
            setShowErrors(false);
            onClose();
        }
    };

    const downloadTemplate = () => {
        // Get available units based on settings
        const availableUnits = units.map(u => u.value);
        const defaultUnit = availableUnits[0] || (unitSystem === 'imperial' ? 'lb' : 'kg');
        const liquidUnit = units.find(u => u.type === 'volume')?.value || (unitSystem === 'imperial' ? 'gallon' : 'l');

        const templateData = [
            {
                name: 'Tomatoes',
                category: 'raw_materials',
                unit: defaultUnit,
                currentStock: 50,
                minimumStock: 10,
                maximumStock: 200,
                reorderLevel: 20,
                costPrice: 25,
                sellingPrice: 0,
                supplierName: 'Fresh Farms',
                supplierContact: '9876543210',
                supplierEmail: 'contact@freshfarms.com',
                description: 'Fresh tomatoes for cooking',
                isPerishable: 'Yes',
                shelfLife: 7,
            },
            {
                name: 'Cooking Oil',
                category: 'raw_materials',
                unit: liquidUnit,
                currentStock: 100,
                minimumStock: 20,
                maximumStock: 500,
                reorderLevel: 50,
                costPrice: 120,
                sellingPrice: 0,
                supplierName: 'Oil Traders',
                supplierContact: '9876543211',
                supplierEmail: 'sales@oiltraders.com',
                description: 'Refined cooking oil',
                isPerishable: 'No',
                shelfLife: '',
            },
            {
                name: 'Rice',
                category: 'raw_materials',
                unit: defaultUnit,
                currentStock: 200,
                minimumStock: 50,
                maximumStock: 1000,
                reorderLevel: 100,
                costPrice: 45,
                sellingPrice: 0,
                supplierName: 'Rice Mill',
                supplierContact: '9876543212',
                supplierEmail: 'orders@ricemill.com',
                description: 'Basmati rice',
                isPerishable: 'No',
                shelfLife: '',
            },
        ];

        const worksheet = XLSX.utils.json_to_sheet(templateData);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, 'Raw Materials');

        // Set column widths
        worksheet['!cols'] = [
            { wch: 20 }, // name
            { wch: 15 }, // category
            { wch: 15 }, // unit - wider to show dropdown values
            { wch: 15 }, // currentStock
            { wch: 15 }, // minimumStock
            { wch: 15 }, // maximumStock
            { wch: 15 }, // reorderLevel
            { wch: 12 }, // costPrice
            { wch: 12 }, // sellingPrice
            { wch: 20 }, // supplierName
            { wch: 15 }, // supplierContact
            { wch: 25 }, // supplierEmail
            { wch: 30 }, // description
            { wch: 12 }, // isPerishable
            { wch: 12 }, // shelfLife
        ];

        // Add data validation for dropdowns (Note: XLSX.js has limited support for data validation)
        // We'll add a reference sheet with valid values instead

        // Create a reference sheet with valid values for dropdowns
        const validCategories = ['ingredients', 'beverages', 'supplies', 'raw_materials', 'packaging'];
        const validUnitsWithLabels = units.map(u => `${u.value} (${u.label})`);

        // Create reference data
        const maxRows = Math.max(validCategories.length, availableUnits.length);
        const referenceData: any[] = [];
        for (let i = 0; i < maxRows; i++) {
            referenceData.push({
                'Valid Categories': validCategories[i] || '',
                'Valid Units': availableUnits[i] || '',
                'Unit Labels': validUnitsWithLabels[i] || '',
            });
        }

        const referenceSheet = XLSX.utils.json_to_sheet(referenceData);
        XLSX.utils.book_append_sheet(workbook, referenceSheet, 'Valid Values');

        // Add a header comment to the main sheet explaining the valid values
        worksheet['C1'] = {
            v: 'unit',
            c: [{
                a: 'System',
                t: `Valid units: ${availableUnits.join(', ')}\n\nCheck 'Valid Values' sheet for reference.`
            }]
        };

        XLSX.writeFile(workbook, 'raw_materials_template.xlsx');
        toast.success(`Template downloaded with ${unitSystem === 'imperial' ? 'Imperial' : 'Metric'} units!`);
    };

    const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
        const selectedFile = event.target.files?.[0];
        if (selectedFile) {
            processFile(selectedFile);
        }
    };

    const handleDrop = (event: React.DragEvent<HTMLDivElement>) => {
        event.preventDefault();
        const droppedFile = event.dataTransfer.files[0];
        if (droppedFile) {
            processFile(droppedFile);
        }
    };

    const handleDragOver = (event: React.DragEvent<HTMLDivElement>) => {
        event.preventDefault();
    };

    const processFile = (selectedFile: File) => {
        setParseError(null);
        setUploadResult(null);

        // Validate file type
        const validTypes = [
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'application/vnd.ms-excel',
            'text/csv',
        ];
        const isValidType = validTypes.includes(selectedFile.type) ||
            selectedFile.name.endsWith('.xlsx') ||
            selectedFile.name.endsWith('.xls') ||
            selectedFile.name.endsWith('.csv');

        if (!isValidType) {
            setParseError('Please upload an Excel file (.xlsx, .xls) or CSV file');
            return;
        }

        setFile(selectedFile);

        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const data = new Uint8Array(e.target?.result as ArrayBuffer);
                const workbook = XLSX.read(data, { type: 'array' });
                const sheetName = workbook.SheetNames[0];
                const worksheet = workbook.Sheets[sheetName];
                const jsonData = XLSX.utils.sheet_to_json<ParsedRow>(worksheet);

                if (jsonData.length === 0) {
                    setParseError('The file is empty or has no valid data rows');
                    return;
                }

                // Validate required columns
                const requiredColumns = ['name'];
                const firstRow = jsonData[0];
                const missingColumns = requiredColumns.filter(col => !(col in firstRow));

                if (missingColumns.length > 0) {
                    setParseError(`Missing required columns: ${missingColumns.join(', ')}`);
                    return;
                }

                // Validate units against the configured unit system
                const validUnitValues = units.map(u => u.value.toLowerCase());
                const invalidUnitRows: { row: number; name: string; unit: string }[] = [];

                jsonData.forEach((row: any, index: number) => {
                    const rowUnit = String(row.unit || '').toLowerCase().trim();
                    if (rowUnit && !validUnitValues.includes(rowUnit)) {
                        invalidUnitRows.push({
                            row: index + 2, // Excel row (1-indexed + header)
                            name: String(row.name || 'Unknown'),
                            unit: rowUnit
                        });
                    }
                });

                if (invalidUnitRows.length > 0) {
                    const unitSystemName = unitSystem === 'imperial' ? 'Imperial' : 'Metric';
                    const errorMessages = invalidUnitRows.slice(0, 5).map(
                        r => `Row ${r.row}: "${r.name}" has invalid unit "${r.unit}"`
                    );
                    const moreErrors = invalidUnitRows.length > 5 ? `\n...and ${invalidUnitRows.length - 5} more` : '';
                    setParseError(
                        `Invalid units detected for ${unitSystemName} system.\n\n` +
                        `Valid units: ${validUnitValues.join(', ')}\n\n` +
                        `Errors:\n${errorMessages.join('\n')}${moreErrors}`
                    );
                    return;
                }

                setParsedData(jsonData);
            } catch (err: any) {
                setParseError('Failed to parse the file. Please ensure it is a valid Excel file.');
                console.error('Parse error:', err);
            }
        };
        reader.readAsArrayBuffer(selectedFile);
    };

    const clearFile = () => {
        setFile(null);
        setParsedData([]);
        setParseError(null);
        setUploadResult(null);
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    };

    const handleUpload = async () => {
        if (parsedData.length === 0) return;

        setUploading(true);
        try {
            const response = await inventoryAPI.bulkUploadRawMaterials(parsedData);
            setUploadResult(response.data);

            if (response.data.success > 0) {
                toast.success(`Successfully imported ${response.data.success} items!`);
                if (response.data.failed === 0) {
                    setTimeout(() => {
                        onUploadComplete();
                        handleClose();
                    }, 1500);
                }
            }

            if (response.data.failed > 0) {
                toast.error(`${response.data.failed} items failed to import. Check errors below.`);
                setShowErrors(true);
            }
        } catch (err: any) {
            toast.error(err.response?.data?.message || 'Failed to upload raw materials');
        } finally {
            setUploading(false);
        }
    };

    return (
        <Dialog
            open={open}
            onClose={handleClose}
            maxWidth="md"
            fullWidth
            PaperProps={{
                sx: {
                    borderRadius: 3,
                    maxHeight: '90vh',
                }
            }}
        >
            <DialogTitle sx={{ m: 0, p: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                    <UploadIcon sx={{ color: 'primary.main', fontSize: 28 }} />
                    <Typography variant="h6" fontWeight="bold">
                        Bulk Upload Raw Materials
                    </Typography>
                </Box>
                <IconButton
                    onClick={handleClose}
                    disabled={uploading}
                    size="small"
                    sx={{
                        color: 'text.secondary',
                        '&:hover': { bgcolor: alpha(theme.palette.error.main, 0.1), color: 'error.main' },
                    }}
                >
                    <CloseIcon />
                </IconButton>
            </DialogTitle>

            <Divider />

            <DialogContent sx={{ py: 3 }}>
                {/* Instructions */}
                <Alert severity="info" sx={{ mb: 3 }}>
                    <AlertTitle>How to Bulk Upload</AlertTitle>
                    <ol style={{ margin: 0, paddingLeft: 20 }}>
                        <li>Download the Excel template below</li>
                        <li>Fill in your raw materials data (name is required)</li>
                        <li>Upload the completed file</li>
                        <li>Review and confirm the import</li>
                    </ol>
                </Alert>

                {/* Download Template Button */}
                <Box sx={{ mb: 3 }}>
                    <Button
                        variant="outlined"
                        startIcon={<DownloadIcon />}
                        onClick={downloadTemplate}
                        sx={{ borderRadius: 2 }}
                    >
                        Download Excel Template
                    </Button>
                </Box>

                {/* File Upload Zone */}
                {!file ? (
                    <Paper
                        onDrop={handleDrop}
                        onDragOver={handleDragOver}
                        onClick={() => fileInputRef.current?.click()}
                        sx={{
                            p: 4,
                            textAlign: 'center',
                            border: '2px dashed',
                            borderColor: parseError ? 'error.main' : 'divider',
                            borderRadius: 2,
                            bgcolor: alpha(theme.palette.primary.main, 0.02),
                            cursor: 'pointer',
                            transition: 'all 0.2s',
                            '&:hover': {
                                borderColor: 'primary.main',
                                bgcolor: alpha(theme.palette.primary.main, 0.05),
                            }
                        }}
                    >
                        <UploadIcon sx={{ fontSize: 48, color: 'primary.main', mb: 2 }} />
                        <Typography variant="h6" gutterBottom>
                            Drag & Drop your Excel file here
                        </Typography>
                        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                            or click to browse
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                            Supported formats: .xlsx, .xls, .csv
                        </Typography>
                        <input
                            ref={fileInputRef}
                            type="file"
                            accept=".xlsx,.xls,.csv"
                            onChange={handleFileSelect}
                            style={{ display: 'none' }}
                        />
                    </Paper>
                ) : (
                    <Paper sx={{ p: 2, borderRadius: 2, bgcolor: alpha(theme.palette.success.main, 0.05) }}>
                        <Stack direction="row" alignItems="center" justifyContent="space-between">
                            <Stack direction="row" alignItems="center" spacing={2}>
                                <FileIcon sx={{ color: 'success.main', fontSize: 32 }} />
                                <Box>
                                    <Typography fontWeight="medium">{file.name}</Typography>
                                    <Typography variant="caption" color="text.secondary">
                                        {parsedData.length} rows ready to import
                                    </Typography>
                                </Box>
                            </Stack>
                            <IconButton onClick={clearFile} disabled={uploading} sx={{ color: 'error.main' }}>
                                <DeleteIcon />
                            </IconButton>
                        </Stack>
                    </Paper>
                )}

                {/* Parse Error */}
                {parseError && (
                    <Alert severity="error" sx={{ mt: 2 }}>
                        {parseError}
                    </Alert>
                )}

                {/* Data Preview */}
                {parsedData.length > 0 && !uploadResult && (
                    <Box sx={{ mt: 3 }}>
                        <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
                            Preview (First 5 rows)
                        </Typography>
                        <TableContainer component={Paper} sx={{ maxHeight: 300 }}>
                            <Table size="small" stickyHeader>
                                <TableHead>
                                    <TableRow>
                                        <TableCell>Name</TableCell>
                                        <TableCell>Category</TableCell>
                                        <TableCell>Unit</TableCell>
                                        <TableCell align="right">Stock</TableCell>
                                        <TableCell align="right">Cost Price</TableCell>
                                        <TableCell>Supplier</TableCell>
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {parsedData.slice(0, 5).map((row, index) => (
                                        <TableRow key={index}>
                                            <TableCell>{row.name}</TableCell>
                                            <TableCell>
                                                <Chip
                                                    label={row.category || 'raw_materials'}
                                                    size="small"
                                                    variant="outlined"
                                                />
                                            </TableCell>
                                            <TableCell>{row.unit || 'kg'}</TableCell>
                                            <TableCell align="right">{row.currentStock || 0}</TableCell>
                                            <TableCell align="right">{row.costPrice || 0}</TableCell>
                                            <TableCell>{row.supplierName || '-'}</TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </TableContainer>
                        {parsedData.length > 5 && (
                            <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                                ... and {parsedData.length - 5} more rows
                            </Typography>
                        )}
                    </Box>
                )}

                {/* Upload Progress */}
                {uploading && (
                    <Box sx={{ mt: 3 }}>
                        <Typography variant="body2" color="text.secondary" gutterBottom>
                            Uploading {parsedData.length} items...
                        </Typography>
                        <LinearProgress />
                    </Box>
                )}

                {/* Upload Results */}
                {uploadResult && (
                    <Box sx={{ mt: 3 }}>
                        <Stack direction="row" spacing={2} sx={{ mb: 2 }}>
                            <Paper sx={{ p: 2, flex: 1, bgcolor: alpha(theme.palette.success.main, 0.1), borderRadius: 2 }}>
                                <Stack direction="row" alignItems="center" spacing={1}>
                                    <SuccessIcon sx={{ color: 'success.main' }} />
                                    <Box>
                                        <Typography variant="h5" fontWeight="bold" color="success.main">
                                            {uploadResult.success}
                                        </Typography>
                                        <Typography variant="caption" color="text.secondary">
                                            Successfully Imported
                                        </Typography>
                                    </Box>
                                </Stack>
                            </Paper>
                            <Paper sx={{ p: 2, flex: 1, bgcolor: alpha(theme.palette.error.main, 0.1), borderRadius: 2 }}>
                                <Stack direction="row" alignItems="center" spacing={1}>
                                    <ErrorIcon sx={{ color: 'error.main' }} />
                                    <Box>
                                        <Typography variant="h5" fontWeight="bold" color="error.main">
                                            {uploadResult.failed}
                                        </Typography>
                                        <Typography variant="caption" color="text.secondary">
                                            Failed to Import
                                        </Typography>
                                    </Box>
                                </Stack>
                            </Paper>
                        </Stack>

                        {/* Error Details */}
                        {uploadResult.errors.length > 0 && (
                            <Box>
                                <Button
                                    onClick={() => setShowErrors(!showErrors)}
                                    endIcon={showErrors ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                                    sx={{ mb: 1 }}
                                    color="error"
                                >
                                    {showErrors ? 'Hide' : 'Show'} Error Details ({uploadResult.errors.length})
                                </Button>
                                <Collapse in={showErrors}>
                                    <Paper sx={{ maxHeight: 200, overflow: 'auto', bgcolor: alpha(theme.palette.error.main, 0.05) }}>
                                        <List dense>
                                            {uploadResult.errors.map((error, index) => (
                                                <ListItem key={index}>
                                                    <ListItemIcon sx={{ minWidth: 36 }}>
                                                        <WarningIcon sx={{ color: 'error.main', fontSize: 20 }} />
                                                    </ListItemIcon>
                                                    <ListItemText
                                                        primary={`Row ${error.row}: ${error.name || 'Unknown'}`}
                                                        secondary={error.error}
                                                        primaryTypographyProps={{ fontWeight: 'medium', fontSize: '0.875rem' }}
                                                        secondaryTypographyProps={{ color: 'error.main' }}
                                                    />
                                                </ListItem>
                                            ))}
                                        </List>
                                    </Paper>
                                </Collapse>
                            </Box>
                        )}
                    </Box>
                )}
            </DialogContent>

            <Divider />

            <DialogActions sx={{ p: 2.5, gap: 1.5 }}>
                <Button
                    onClick={handleClose}
                    disabled={uploading}
                    variant="outlined"
                    sx={{ borderRadius: 2, px: 3 }}
                >
                    {uploadResult ? 'Close' : 'Cancel'}
                </Button>
                {!uploadResult && (
                    <Button
                        onClick={handleUpload}
                        disabled={parsedData.length === 0 || uploading}
                        variant="contained"
                        startIcon={<UploadIcon />}
                        sx={{
                            borderRadius: 2,
                            px: 3,
                            boxShadow: theme.shadows[4],
                        }}
                    >
                        {uploading ? 'Uploading...' : `Upload ${parsedData.length} Items`}
                    </Button>
                )}
                {uploadResult && uploadResult.success > 0 && uploadResult.failed > 0 && (
                    <Button
                        onClick={() => {
                            onUploadComplete();
                            handleClose();
                        }}
                        variant="contained"
                        color="success"
                        sx={{ borderRadius: 2, px: 3 }}
                    >
                        Done
                    </Button>
                )}
            </DialogActions>
        </Dialog>
    );
};

export default BulkUploadDialog;

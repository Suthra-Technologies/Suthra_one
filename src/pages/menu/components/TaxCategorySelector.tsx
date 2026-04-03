import React, { useState, useEffect, useCallback } from 'react';
import {
    Box,
    TextField,
    Autocomplete,
    IconButton,
    Tooltip,
    Dialog,
    DialogTitle,
    DialogContent,
    Typography,
    InputAdornment,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Paper,
    Button,
    CircularProgress,
    alpha,
    useTheme,
    Pagination
} from '@mui/material';
import {
    InfoOutlined as InfoIcon,
    Search as SearchIcon,
    Close as CloseIcon,
    Check as CheckIcon,
    ContentCopy as CopyIcon
} from '@mui/icons-material';
import { taxCategoriesAPI } from '../../../services/api';
import { toast } from 'react-hot-toast';

interface TaxCategory {
    tic: string;
    name: string;
    description: string;
}

interface TaxCategorySelectorProps {
    value: string;
    onChange: (value: string) => void;
    error?: boolean;
    helperText?: string;
    required?: boolean;
}

const TaxCategorySelector: React.FC<TaxCategorySelectorProps> = ({
    value,
    onChange,
    error,
    helperText,
    required = true
}) => {
    const theme = useTheme();
    const [openModal, setOpenModal] = useState(false);
    const [options, setOptions] = useState<TaxCategory[]>([]);
    const [loading, setLoading] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    
    // Modal State
    const [modalSearch, setModalSearch] = useState('');
    const [modalData, setModalData] = useState<TaxCategory[]>([]);
    const [modalLoading, setModalLoading] = useState(false);
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [totalResults, setTotalResults] = useState(0);
    const limit = 8;

    // Fetch options for the Autocomplete
    const fetchOptions = useCallback(async (search: string) => {
        setLoading(true);
        try {
            const res = await taxCategoriesAPI.getAll({ search, limit: 10 });
            // Handle the specific structure: res.data.data.taxCategories
            const resData = res.data;
            let rawData: any[] = [];
            
            if (resData?.data?.taxCategories && Array.isArray(resData.data.taxCategories)) {
                rawData = resData.data.taxCategories;
            } else if (Array.isArray(resData?.data)) {
                rawData = resData.data;
            } else if (Array.isArray(resData)) {
                rawData = resData;
            } else if (resData?.data?.categories && Array.isArray(resData.data.categories)) {
                rawData = resData.data.categories;
            }

            // Map the data to our interface (product_tax_code -> tic)
            const data: TaxCategory[] = rawData.map((item: any) => ({
                tic: item.product_tax_code || item.tic || '',
                name: item.name || '',
                description: item.description || ''
            }));
            
            setOptions(data);
        } catch (err) {
            console.error('Failed to fetch tax categories', err);
            setOptions([]); // Ensure options is reset to empty array on error
        } finally {
            setLoading(false);
        }
    }, []);

    // Fetch data for the Informational Modal
    const fetchModalData = useCallback(async (search: string, currentPage: number) => {
        setModalLoading(true);
        try {
            const res = await taxCategoriesAPI.getAll({ search, page: currentPage, limit });
            const resData = res.data;
            let rawData: any[] = [];
            
            if (resData?.data?.taxCategories && Array.isArray(resData.data.taxCategories)) {
                rawData = resData.data.taxCategories;
            } else if (Array.isArray(resData?.data)) {
                rawData = resData.data;
            } else if (Array.isArray(resData)) {
                rawData = resData;
            }

            const data: TaxCategory[] = rawData.map((item: any) => ({
                tic: item.product_tax_code || item.tic || '',
                name: item.name || '',
                description: item.description || ''
            }));

            const total = resData?.data?.total || resData?.total || resData?.data?.totalCount || data.length;
            
            setModalData(data);
            setTotalResults(total);
            setTotalPages(Math.ceil(total / limit) || 1);
        } catch (err) {
            console.error('Failed to fetch modal tax data', err);
            toast.error('Failed to fetch tax categories information');
            setModalData([]);
        } finally {
            setModalLoading(false);
        }
    }, []);

    useEffect(() => {
        const delayDebounceFn = setTimeout(() => {
            fetchOptions(searchTerm);
        }, 500);

        return () => clearTimeout(delayDebounceFn);
    }, [searchTerm, fetchOptions]);

    useEffect(() => {
        if (openModal) {
            fetchModalData(modalSearch, page);
        }
    }, [openModal, modalSearch, page, fetchModalData]);

    const handleCopy = (tic: string) => {
        navigator.clipboard.writeText(tic);
        toast.success(`Copied Tax Code: ${tic}`);
    };

    const handleSelect = (tic: string) => {
        onChange(tic);
        setOpenModal(false);
    };

    return (
        <Box sx={{ width: '100%' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 0.5, gap: 1 }}>
                <Typography variant="body2" fontWeight={600} color={error ? 'error' : 'text.primary'}>
                    Tax Code{required && <span style={{ color: theme.palette.error.main }}>*</span>}
                </Typography>
                <Tooltip title="View Tax Code Information">
                    <IconButton size="small" onClick={() => setOpenModal(true)} sx={{ p: 0.5 }}>
                        <InfoIcon sx={{ fontSize: 18, color: theme.palette.primary.main }} />
                    </IconButton>
                </Tooltip>
            </Box>

            <Autocomplete
                freeSolo
                options={options}
                getOptionLabel={(option) => {
                    if (typeof option === 'string') return option;
                    return option.name ? `${option.tic} - ${option.name}` : option.tic;
                }}
                isOptionEqualToValue={(option, val) => {
                    if (typeof val === 'string') return option.tic === val;
                    return option.tic === val.tic;
                }}
                value={options.find(opt => opt.tic === value) || value || ''}
                onChange={(_, newValue) => {
                    if (typeof newValue === 'string') {
                        onChange(newValue);
                    } else if (newValue) {
                        onChange(newValue.tic);
                    } else {
                        onChange('');
                    }
                }}
                onInputChange={(_, newValue, reason) => {
                    // Only update search and parent value if user is explicitly typing
                    if (reason === 'input') {
                        setSearchTerm(newValue);
                        onChange(newValue);
                    } else if (reason === 'clear') {
                        setSearchTerm('');
                        onChange('');
                    }
                }}
                loading={loading}
                renderInput={(params) => (
                    <TextField
                        {...params}
                        placeholder="Search Tax Code (TIC)"
                        error={error}
                        helperText={helperText}
                        fullWidth
                        size="small"
                        InputProps={{
                            ...params.InputProps,
                            startAdornment: (
                                <InputAdornment position="start">
                                    {loading ? <CircularProgress size={16} /> : <SearchIcon fontSize="small" color="action" />}
                                </InputAdornment>
                            ),
                        }}
                    />
                )}
                renderOption={(props, option) => (
                    <Box component="li" {...props} key={option.tic} sx={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', py: 1 }}>
                        <Typography variant="body2" fontWeight={600}>
                            {option.tic} - {option.name}
                        </Typography>
                        <Typography variant="caption" color="text.secondary" sx={{ 
                            display: '-webkit-box',
                            WebkitLineClamp: 2,
                            WebkitBoxOrient: 'vertical',
                            overflow: 'hidden'
                        }}>
                            {option.description}
                        </Typography>
                    </Box>
                )}
            />

            {/* Informational Modal */}
            <Dialog 
                open={openModal} 
                onClose={() => setOpenModal(false)}
                maxWidth="md"
                fullWidth
                PaperProps={{
                    sx: { borderRadius: 3, boxShadow: theme.shadows[5] }
                }}
            >
                <DialogTitle sx={{ m: 0, p: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Box>
                        <Typography variant="h6" fontWeight="bold" color="primary">Tax Code Information</Typography>
                        <Typography variant="caption" color="text.secondary">Browse and copy tax classification codes</Typography>
                    </Box>
                    <IconButton onClick={() => setOpenModal(false)} size="small">
                        <CloseIcon />
                    </IconButton>
                </DialogTitle>
                <DialogContent sx={{ p: 0 }}>
                    <Box sx={{ p: 2, bgcolor: alpha(theme.palette.primary.main, 0.03), borderBottom: 1, borderColor: 'divider' }}>
                        <TextField
                            fullWidth
                            size="small"
                            placeholder="Search in tax categories (e.g. food, soda, candy)..."
                            value={modalSearch}
                            onChange={(e) => {
                                setModalSearch(e.target.value);
                                setPage(1);
                            }}
                            InputProps={{
                                startAdornment: (
                                    <InputAdornment position="start">
                                        <SearchIcon color="action" />
                                    </InputAdornment>
                                ),
                                endAdornment: modalLoading && <CircularProgress size={20} />
                            }}
                            sx={{ bgcolor: 'background.paper', borderRadius: 2 }}
                        />
                    </Box>

                    <TableContainer sx={{ minHeight: 400, maxHeight: 600 }}>
                        <Table stickyHeader size="small">
                            <TableHead>
                                <TableRow>
                                    <TableCell width="15%">TAX CODE</TableCell>
                                    <TableCell width="30%">NAME</TableCell>
                                    <TableCell width="45%">DESCRIPTION</TableCell>
                                    <TableCell width="10%" align="center">ACTION</TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {modalLoading && modalData.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={4} align="center" sx={{ py: 10 }}>
                                            <CircularProgress size={40} />
                                            <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>Fetching tax categories...</Typography>
                                        </TableCell>
                                    </TableRow>
                                ) : modalData.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={4} align="center" sx={{ py: 10 }}>
                                            <Typography variant="body1" color="text.secondary">No results found for "{modalSearch}"</Typography>
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    modalData.map((row) => (
                                        <TableRow key={row.tic} hover sx={{ '&:last-child td, &:last-child th': { border: 0 } }}>
                                            <TableCell>
                                                <Box sx={{ 
                                                    px: 1, py: 0.5, borderRadius: 1.5, 
                                                    bgcolor: alpha(theme.palette.primary.main, 0.08),
                                                    color: 'primary.main',
                                                    fontWeight: 'bold',
                                                    fontSize: '0.8rem',
                                                    display: 'inline-block',
                                                    border: '1px solid',
                                                    borderColor: alpha(theme.palette.primary.main, 0.2)
                                                }}>
                                                    {row.tic}
                                                </Box>
                                            </TableCell>
                                            <TableCell sx={{ fontWeight: 600 }}>{row.name}</TableCell>
                                            <TableCell>
                                                <Typography variant="body2" sx={{ 
                                                    color: 'text.secondary',
                                                    display: '-webkit-box',
                                                    WebkitLineClamp: 3,
                                                    WebkitBoxOrient: 'vertical',
                                                    overflow: 'hidden',
                                                    lineHeight: 1.4
                                                }}>
                                                    {row.description}
                                                </Typography>
                                            </TableCell>
                                            <TableCell align="center">
                                                <Box sx={{ display: 'flex', gap: 0.5, justifyContent: 'center' }}>
                                                    <Tooltip title="Copy Tic Code">
                                                        <IconButton size="small" onClick={() => handleCopy(row.tic)}>
                                                            <CopyIcon sx={{ fontSize: 18 }} />
                                                        </IconButton>
                                                    </Tooltip>
                                                    <Tooltip title="Select This Code">
                                                        <IconButton size="small" color="primary" onClick={() => handleSelect(row.tic)}>
                                                            <CheckIcon sx={{ fontSize: 18 }} />
                                                        </IconButton>
                                                    </Tooltip>
                                                </Box>
                                            </TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    </TableContainer>

                    <Box sx={{ p: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: 1, borderColor: 'divider' }}>
                        <Typography variant="caption" color="text.secondary">
                            Showing {(page - 1) * limit + 1} to {Math.min(page * limit, totalResults)} of {totalResults}
                        </Typography>
                        <Pagination 
                            count={totalPages} 
                            page={page} 
                            onChange={(_, v) => setPage(v)} 
                            size="small" 
                            color="primary"
                            shape="rounded"
                        />
                    </Box>
                </DialogContent>
            </Dialog>
        </Box>
    );
};

export default TaxCategorySelector;

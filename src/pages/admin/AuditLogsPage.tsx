import React, { useState, useEffect } from 'react';
import {
    Box,
    Container,
    Typography,
    Paper,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    TablePagination,
    Chip,
    FormControl,
    InputLabel,
    Select,
    MenuItem,
    TextField,
    Stack,
    CircularProgress,
    Card,
    CardContent,
    useMediaQuery,
    useTheme,
} from '@mui/material';
import {
    History as HistoryIcon,
    Person as PersonIcon,
    Category as CategoryIcon,
    Edit as EditIcon,
    Delete as DeleteIcon,
    Add as AddIcon,
    Login as LoginIcon,
    Logout as LogoutIcon,
} from '@mui/icons-material';
import { auditLogsAPI } from '../../services/api';
import { toast } from 'react-hot-toast';

const AuditLogsPage: React.FC = () => {
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
    const headingFontSize = { xs: '1.1rem', sm: '1.4rem', md: '2rem' };
    const bodyFontSize = { xs: '0.78rem', sm: '0.88rem', md: '0.95rem' };

    const [logs, setLogs] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [page, setPage] = useState(0);
    const [rowsPerPage, setRowsPerPage] = useState(50);
    const [total, setTotal] = useState(0);

    // Filters
    const [moduleFilter, setModuleFilter] = useState('');
    const [actionFilter, setActionFilter] = useState('');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');

    const modules = ['MENU', 'CATEGORY', 'ORDER', 'USER', 'TABLE', 'INVENTORY', 'BOOKING', 'ATTENDANCE'];
    const actions = ['CREATED', 'UPDATED', 'DELETED', 'STATUS_UPDATE', 'CLOCK_IN', 'CLOCK_OUT'];

    useEffect(() => {
        fetchLogs();
    }, [page, rowsPerPage, moduleFilter, actionFilter, startDate, endDate]);

    const fetchLogs = async () => {
        setLoading(true);
        try {
            const params: any = {
                page: page + 1,
                limit: rowsPerPage,
            };

            if (moduleFilter) params.module = moduleFilter;
            if (actionFilter) params.action = actionFilter;
            if (startDate) params.startDate = startDate;
            if (endDate) params.endDate = endDate;

            const response = await auditLogsAPI.getAll(params);
            setLogs(response.data.logs || []);
            setTotal(response.data.total || 0);
        } catch (error: any) {
            console.error('Error fetching audit logs:', error);
            toast.error('Failed to fetch audit logs');
        } finally {
            setLoading(false);
        }
    };

    const handleChangePage = (event: unknown, newPage: number) => {
        setPage(newPage);
    };

    const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
        setRowsPerPage(parseInt(event.target.value, 10));
        setPage(0);
    };

    const getActionColor = (action: string) => {
        switch (action) {
            case 'CREATED':
            case 'CLOCK_IN':
                return 'success';
            case 'UPDATED':
            case 'STATUS_UPDATE':
                return 'info';
            case 'DELETED':
            case 'CLOCK_OUT':
                return 'error'; // Or 'warning'
            default:
                return 'default';
        }
    };

    const getActionIcon = (action: string) => {
        switch (action) {
            case 'CREATED':
                return <AddIcon fontSize="small" />;
            case 'CLOCK_IN':
                return <LoginIcon fontSize="small" />;
            case 'UPDATED':
            case 'STATUS_UPDATE':
                return <EditIcon fontSize="small" />;
            case 'DELETED':
                return <DeleteIcon fontSize="small" />;
            case 'CLOCK_OUT':
                return <LogoutIcon fontSize="small" />;
            default:
                return <HistoryIcon fontSize="small" />;
        }
    };

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleString();
    };

    const getDetailsText = (details: any) => (
        typeof details === 'string' ? details : JSON.stringify(details)
    );

    return (
        <Container maxWidth="xl" sx={{ mt: { xs: 1.5, sm: 4 }, mb: { xs: 2, sm: 4 }, px: { xs: 1.25, sm: 3 } }}>
            <Box sx={{ mb: { xs: 2, sm: 4 } }}>
                <Typography
                    variant="h4"
                    gutterBottom
                    sx={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: { xs: 'center', sm: 'flex-start' },
                        gap: 1,
                        textAlign: { xs: 'center', sm: 'left' },
                        color: { xs: '#000', sm: 'text.primary' },
                        fontSize: headingFontSize,
                    }}
                >
                    <HistoryIcon sx={{ fontSize: { xs: 22, sm: 34 } }} />
                    Audit Logs
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ fontSize: bodyFontSize, textAlign: { xs: 'center', sm: 'left' } }}>
                    Track all system actions and changes made by users
                </Typography>
            </Box>

            {/* Summary Cards */}
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={{ xs: 1.25, sm: 2 }} sx={{ mb: { xs: 2, sm: 3 } }}>
                <Card sx={{ flex: 1, background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}>
                    <CardContent sx={{ p: { xs: 1.5, sm: 2 } }}>
                        <Typography variant="h6" sx={{ color: 'white', fontSize: headingFontSize }}>
                            Total Logs
                        </Typography>
                        <Typography variant="h3" sx={{ color: 'white', fontWeight: 'bold', fontSize: { xs: '1.35rem', sm: '2rem', md: '3rem' } }}>
                            {total}
                        </Typography>
                    </CardContent>
                </Card>
                <Card sx={{ flex: 1, background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)' }}>
                    <CardContent sx={{ p: { xs: 1.5, sm: 2 } }}>
                        <Typography variant="h6" sx={{ color: 'white', fontSize: headingFontSize }}>
                            Modules Tracked
                        </Typography>
                        <Typography variant="h3" sx={{ color: 'white', fontWeight: 'bold', fontSize: { xs: '1.35rem', sm: '2rem', md: '3rem' } }}>
                            {modules.length}
                        </Typography>
                    </CardContent>
                </Card>
            </Stack>

            {/* Filters */}
            <Paper sx={{ p: { xs: 1.5, sm: 3 }, mb: { xs: 2, sm: 3 } }}>
                <Typography variant="h6" gutterBottom sx={{ fontSize: headingFontSize, color: { xs: '#000', sm: 'text.primary' }, textAlign: { xs: 'center', sm: 'left' } }}>
                    Filters
                </Typography>
                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={{ xs: 1, sm: 2 }} flexWrap="wrap">
                    <FormControl fullWidth={isMobile} sx={{ minWidth: { xs: '100%', sm: 200 } }}>
                        <InputLabel>Module</InputLabel>
                        <Select
                            value={moduleFilter}
                            label="Module"
                            onChange={(e) => setModuleFilter(e.target.value)}
                            size={isMobile ? 'small' : 'medium'}
                        >
                            <MenuItem value="">All Modules</MenuItem>
                            {modules.map((module) => (
                                <MenuItem key={module} value={module}>
                                    {module}
                                </MenuItem>
                            ))}
                        </Select>
                    </FormControl>

                    <FormControl fullWidth={isMobile} sx={{ minWidth: { xs: '100%', sm: 200 } }}>
                        <InputLabel>Action</InputLabel>
                        <Select
                            value={actionFilter}
                            label="Action"
                            onChange={(e) => setActionFilter(e.target.value)}
                            size={isMobile ? 'small' : 'medium'}
                        >
                            <MenuItem value="">All Actions</MenuItem>
                            {actions.map((action) => (
                                <MenuItem key={action} value={action}>
                                    {action}
                                </MenuItem>
                            ))}
                        </Select>
                    </FormControl>

                    <TextField
                        label="Start Date"
                        type="date"
                        value={startDate}
                        onChange={(e) => setStartDate(e.target.value)}
                        InputLabelProps={{ shrink: true }}
                        size={isMobile ? 'small' : 'medium'}
                        fullWidth={isMobile}
                        sx={{ minWidth: { xs: '100%', sm: 200 } }}
                    />

                    <TextField
                        label="End Date"
                        type="date"
                        value={endDate}
                        onChange={(e) => setEndDate(e.target.value)}
                        InputLabelProps={{ shrink: true }}
                        size={isMobile ? 'small' : 'medium'}
                        fullWidth={isMobile}
                        sx={{ minWidth: { xs: '100%', sm: 200 } }}
                    />
                </Stack>
            </Paper>

            {/* Audit Logs - Mobile Cards */}
            <Paper sx={{ display: { xs: 'block', md: 'none' }, p: 1.1, mb: 1.25 }}>
                {loading ? (
                    <Box sx={{ display: 'flex', justifyContent: 'center', py: 3 }}>
                        <CircularProgress size={22} />
                    </Box>
                ) : logs.length === 0 ? (
                    <Box sx={{ py: 2, textAlign: 'center' }}>
                        <Typography variant="body2" color="text.secondary" sx={{ fontSize: bodyFontSize }}>
                            No audit logs found
                        </Typography>
                    </Box>
                ) : (
                    <Stack spacing={1}>
                        {logs.map((log) => (
                            <Paper key={log._id} variant="outlined" sx={{ p: 1.1, borderRadius: 2 }}>
                                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 1, mb: 0.5 }}>
                                    <Typography variant="caption" sx={{ fontSize: bodyFontSize }}>
                                        {formatDate(log.createdAt)}
                                    </Typography>
                                    <Chip
                                        icon={getActionIcon(log.action)}
                                        label={log.action}
                                        size="small"
                                        color={getActionColor(log.action)}
                                    />
                                </Box>
                                <Box sx={{ display: 'flex', gap: 0.75, mb: 0.5, flexWrap: 'wrap' }}>
                                    <Chip icon={<CategoryIcon />} label={log.module} size="small" color="primary" variant="outlined" />
                                    <Chip label={log.userRole} size="small" variant="outlined" />
                                </Box>
                                <Typography variant="body2" sx={{ fontSize: bodyFontSize }}>
                                    <strong>User:</strong> {log.performedByName}
                                </Typography>
                                <Typography variant="body2" sx={{ fontSize: bodyFontSize }}>
                                    <strong>Target:</strong> {log.targetName || log.targetId}
                                </Typography>
                                <Typography
                                    variant="body2"
                                    color="text.secondary"
                                    sx={{
                                        fontSize: bodyFontSize,
                                        mt: 0.35,
                                        display: '-webkit-box',
                                        WebkitLineClamp: 2,
                                        WebkitBoxOrient: 'vertical',
                                        overflow: 'hidden',
                                    }}
                                >
                                    {getDetailsText(log.details)}
                                </Typography>
                            </Paper>
                        ))}
                    </Stack>
                )}
            </Paper>

            {/* Audit Logs Table */}
            <Paper>
                <TableContainer sx={{ overflowX: 'auto', display: { xs: 'none', md: 'block' } }}>
                    <Table size={isMobile ? 'small' : 'medium'} sx={{ minWidth: { xs: 760, sm: 900 } }}>
                        <TableHead>
                            <TableRow>
                                <TableCell>Timestamp</TableCell>
                                <TableCell>Module</TableCell>
                                <TableCell>Action</TableCell>
                                <TableCell>Performed By</TableCell>
                                <TableCell>Role</TableCell>
                                <TableCell>Target</TableCell>
                                <TableCell>Details</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {loading ? (
                                <TableRow>
                                    <TableCell colSpan={7} align="center" sx={{ py: 4 }}>
                                        <CircularProgress />
                                    </TableCell>
                                </TableRow>
                            ) : logs.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={7} align="center" sx={{ py: 4 }}>
                                        <Typography variant="body2" color="text.secondary" sx={{ fontSize: bodyFontSize }}>
                                            No audit logs found
                                        </Typography>
                                    </TableCell>
                                </TableRow>
                            ) : (
                                logs.map((log) => (
                                    <TableRow key={log._id} hover>
                                        <TableCell>
                                            <Typography variant="body2" sx={{ fontSize: bodyFontSize }}>
                                                {formatDate(log.createdAt)}
                                            </Typography>
                                        </TableCell>
                                        <TableCell>
                                            <Chip
                                                icon={<CategoryIcon />}
                                                label={log.module}
                                                size="small"
                                                color="primary"
                                                variant="outlined"
                                            />
                                        </TableCell>
                                        <TableCell>
                                            <Chip
                                                icon={getActionIcon(log.action)}
                                                label={log.action}
                                                size="small"
                                                color={getActionColor(log.action)}
                                            />
                                        </TableCell>
                                        <TableCell>
                                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                                <PersonIcon fontSize="small" color="action" />
                                                <Typography variant="body2" sx={{ fontSize: bodyFontSize }}>
                                                    {log.performedByName}
                                                </Typography>
                                            </Box>
                                        </TableCell>
                                        <TableCell>
                                            <Chip label={log.userRole} size="small" variant="outlined" />
                                        </TableCell>
                                        <TableCell>
                                            <Typography variant="body2" fontWeight="medium" sx={{ fontSize: bodyFontSize }}>
                                                {log.targetName || log.targetId}
                                            </Typography>
                                        </TableCell>
                                        <TableCell>
                                            <Typography
                                                variant="body2"
                                                color="text.secondary"
                                                sx={{
                                                    fontSize: bodyFontSize,
                                                    maxWidth: 300,
                                                    overflow: 'hidden',
                                                    textOverflow: 'ellipsis',
                                                    whiteSpace: 'nowrap',
                                                }}
                                            >
                                                {getDetailsText(log.details)}
                                            </Typography>
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </TableContainer>
                <TablePagination
                    rowsPerPageOptions={[25, 50, 100]}
                    component="div"
                    count={total}
                    rowsPerPage={rowsPerPage}
                    page={page}
                    onPageChange={handleChangePage}
                    onRowsPerPageChange={handleChangeRowsPerPage}
                    sx={{
                        '& .MuiTablePagination-toolbar': { px: { xs: 0.5, sm: 2 }, minHeight: { xs: 44, sm: 52 } },
                        '& .MuiTablePagination-selectLabel, & .MuiTablePagination-displayedRows': { fontSize: bodyFontSize, m: 0 }
                    }}
                />
            </Paper>
        </Container>
    );
};

export default AuditLogsPage;

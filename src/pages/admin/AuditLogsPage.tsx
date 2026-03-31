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

    return (
        <Container maxWidth="xl" sx={{ mt: 4, mb: 4 }}>
            <Box sx={{ mb: 4 }}>
                <Typography variant="h4" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <HistoryIcon fontSize="large" />
                    Audit Logs
                </Typography>
                <Typography variant="body2" color="text.secondary">
                    Track all system actions and changes made by users
                </Typography>
            </Box>

            {/* Summary Cards */}
            <Stack direction="row" spacing={2} sx={{ mb: 3 }}>
                <Card sx={{ flex: 1, background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}>
                    <CardContent>
                        <Typography variant="h6" sx={{ color: 'white' }}>
                            Total Logs
                        </Typography>
                        <Typography variant="h3" sx={{ color: 'white', fontWeight: 'bold' }}>
                            {total}
                        </Typography>
                    </CardContent>
                </Card>
                <Card sx={{ flex: 1, background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)' }}>
                    <CardContent>
                        <Typography variant="h6" sx={{ color: 'white' }}>
                            Modules Tracked
                        </Typography>
                        <Typography variant="h3" sx={{ color: 'white', fontWeight: 'bold' }}>
                            {modules.length}
                        </Typography>
                    </CardContent>
                </Card>
            </Stack>

            {/* Filters */}
            <Paper sx={{ p: 3, mb: 3 }}>
                <Typography variant="h6" gutterBottom>
                    Filters
                </Typography>
                <Stack direction="row" spacing={2} flexWrap="wrap">
                    <FormControl sx={{ minWidth: 200 }}>
                        <InputLabel>Module</InputLabel>
                        <Select
                            value={moduleFilter}
                            label="Module"
                            onChange={(e) => setModuleFilter(e.target.value)}
                        >
                            <MenuItem value="">All Modules</MenuItem>
                            {modules.map((module) => (
                                <MenuItem key={module} value={module}>
                                    {module}
                                </MenuItem>
                            ))}
                        </Select>
                    </FormControl>

                    <FormControl sx={{ minWidth: 200 }}>
                        <InputLabel>Action</InputLabel>
                        <Select
                            value={actionFilter}
                            label="Action"
                            onChange={(e) => setActionFilter(e.target.value)}
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
                        sx={{ minWidth: 200 }}
                    />

                    <TextField
                        label="End Date"
                        type="date"
                        value={endDate}
                        onChange={(e) => setEndDate(e.target.value)}
                        InputLabelProps={{ shrink: true }}
                        sx={{ minWidth: 200 }}
                    />
                </Stack>
            </Paper>

            {/* Audit Logs Table */}
            <Paper>
                <TableContainer>
                    <Table>
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
                                        <Typography variant="body2" color="text.secondary">
                                            No audit logs found
                                        </Typography>
                                    </TableCell>
                                </TableRow>
                            ) : (
                                logs.map((log) => (
                                    <TableRow key={log._id} hover>
                                        <TableCell>
                                            <Typography variant="body2">
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
                                                <Typography variant="body2">
                                                    {log.performedByName}
                                                </Typography>
                                            </Box>
                                        </TableCell>
                                        <TableCell>
                                            <Chip label={log.userRole} size="small" variant="outlined" />
                                        </TableCell>
                                        <TableCell>
                                            <Typography variant="body2" fontWeight="medium">
                                                {log.targetName || log.targetId}
                                            </Typography>
                                        </TableCell>
                                        <TableCell>
                                            <Typography
                                                variant="body2"
                                                color="text.secondary"
                                                sx={{
                                                    maxWidth: 300,
                                                    overflow: 'hidden',
                                                    textOverflow: 'ellipsis',
                                                    whiteSpace: 'nowrap',
                                                }}
                                            >
                                                {typeof log.details === 'string'
                                                    ? log.details
                                                    : JSON.stringify(log.details)}
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
                />
            </Paper>
        </Container>
    );
};

export default AuditLogsPage;

import {
    Add as AddIcon,
    Close as CloseIcon,
    Download as DownloadIcon,
    Edit as EditIcon,
    Dns as IpIcon,
    RadioButtonChecked as LiveIcon,
    LocationOn as LocationIcon,
    Map as MapIcon,
    Payments as PayrollIcon,
    Person as PersonIcon,
    Refresh as RefreshIcon,
    Search as SearchIcon,
    AccessTime as TimeIcon,
    Today as TodayIcon
} from '@mui/icons-material';
import {
    alpha,
    Avatar,
    Box,
    Button,
    Card,
    CardContent,
    Chip,
    CircularProgress,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    Divider,
    FormControl,
    Grid,
    IconButton,
    InputAdornment,
    InputLabel,
    MenuItem,
    Pagination,
    Paper,
    Select,
    Stack,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    TextField,
    Tooltip,
    Typography,
    useMediaQuery,
    useTheme
} from '@mui/material';
import React, { useCallback, useEffect, useState } from 'react';
import { toast } from 'react-hot-toast';
import MapComponent from '../components/MapComponent';
import { useSettings } from '../context/SettingsContext';
import { attendanceAPI, usersAPI } from '../services/api';

const ITEMS_PER_PAGE = 10;

const AttendancePage: React.FC = () => {
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('md'));
    const headingFontSize = { xs: '1.12rem', sm: '1.4rem', md: '2.125rem' };
    const bodyFontSize = { xs: '0.78rem', sm: '0.88rem', md: '0.95rem' };
    const { formatCurrency } = useSettings();
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [attendance, setAttendance] = useState<any[]>([]);
    const [users, setUsers] = useState<any[]>([]);
    const [activeRoleFilter, setActiveRoleFilter] = useState<string>('all');
    const [searchTerm, setSearchTerm] = useState('');
    const [refreshToggle, setRefreshToggle] = useState(false);
    const debounceTimeoutRef = React.useRef<any>(null);

    // Pagination State
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [totalRecords, setTotalRecords] = useState(0);
    const [backendStats, setBackendStats] = useState({
        totalHours: 0,
        totalEarnings: 0,
        activeShifts: 0
    });

    const [filters, setFilters] = useState({
        startDate: new Date(new Date().setDate(new Date().getDate() - 30)).toISOString().split('T')[0],
        endDate: new Date().toISOString().split('T')[0],
        search: ''
    });

    // Details Modal State
    const [detailsOpen, setDetailsOpen] = useState(false);
    const [selectedShift, setSelectedShift] = useState<any>(null);

    // Manual Entry Form State
    const [manualOpen, setManualOpen] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [manualForm, setManualForm] = useState({
        userId: '',
        clockInTime: new Date().toISOString().slice(0, 16),
        clockOutTime: '',
        note: ''
    });

    const fetchAttendance = useCallback(async (isSilent = false) => {
        let isMonitorActive = true;
        try {
            if (!isSilent) setLoading(true);
            else setRefreshing(true);

            const response = await attendanceAPI.getAllAttendance({
                startDate: filters.startDate,
                endDate: filters.endDate,
                search: filters.search,
                role: activeRoleFilter === 'all' ? undefined : activeRoleFilter, // Only send role if not 'all'
                page,
                limit: ITEMS_PER_PAGE
            });

            if (!isMonitorActive) return;

            const isPaginated = !Array.isArray(response.data) && response.data.data;
            let data = isPaginated ? response.data.data : (Array.isArray(response.data) ? response.data : []);

            // Only apply client-side filtering if the backend DID NOT paginate (legacy or fallback)
            // If backend already filtered using params above, we shouldn't re-filter here
            if (!isPaginated) {
                data = data.filter((row: any) => {
                    const roleMatches = activeRoleFilter === 'all' || row.user?.roles?.includes(activeRoleFilter);
                    const name = `${row.user?.firstName || ''} ${row.user?.lastName || ''}`.toLowerCase();
                    const searchMatches = !filters.search || name.includes(filters.search.toLowerCase());
                    return roleMatches && searchMatches;
                });
            }

            const total = isPaginated ? response.data.total : data.length;
            const stats = isPaginated ? response.data.stats : null;

            setAttendance(data);
            setTotalRecords(total);
            setTotalPages(isPaginated ? response.data.totalPages || Math.ceil(total / ITEMS_PER_PAGE) : Math.ceil(total / ITEMS_PER_PAGE));
            if (stats) setBackendStats(stats);
        } catch (error) {
            if (isMonitorActive) {
                console.error('Failed to fetch attendance', error);
                if (!isSilent) toast.error('Failed to load attendance logs');
            }
        } finally {
            if (isMonitorActive) {
                setLoading(false);
                setRefreshing(false);
            }
        }
        return () => { isMonitorActive = false; };
    }, [filters.startDate, filters.endDate, filters.search, activeRoleFilter, page, refreshToggle]);

    // Role filter change resets page
    const handleRoleChange = (role: string) => {
        setActiveRoleFilter(role);
        setPage(1);
    };

    // Search change resets page
    const handleSearchChange = (val: string) => {
        setFilters(f => ({ ...f, search: val }));
        setPage(1);
    };

    const fetchUsers = async () => {
        try {
            const response = await usersAPI.getUsers();
            const allUsers = response.data.data || response.data.users || response.data || [];
            setUsers(allUsers.filter((u: any) => !u.roles?.includes('customer')));
        } catch (error) {
            console.error('Failed to fetch users', error);
        }
    };

    useEffect(() => {
        fetchAttendance();
        fetchUsers();
    }, [fetchAttendance]);

    // Debounce effect for search input
    useEffect(() => {
        if (debounceTimeoutRef.current) {
            clearTimeout(debounceTimeoutRef.current);
        }
        debounceTimeoutRef.current = setTimeout(() => {
            handleSearchChange(searchTerm);
        }, 300); // 300ms debounce delay

        return () => {
            if (debounceTimeoutRef.current) {
                clearTimeout(debounceTimeoutRef.current);
            }
        };
    }, [searchTerm]);


    // Auto-refresh every 45 seconds
    useEffect(() => {
        const interval = setInterval(() => {
            fetchAttendance(true);
        }, 45000);
        return () => clearInterval(interval);
    }, [fetchAttendance]);

    const handleManualSubmit = async () => {
        if (submitting) return;
        if (!manualForm.userId || !manualForm.clockInTime) {
            toast.error('Staff member and Clock-in time are required');
            return;
        }

        try {
            setSubmitting(true);
            const payload = {
                ...manualForm,
                clockInTime: manualForm.clockInTime ? new Date(manualForm.clockInTime).toISOString() : '',
                clockOutTime: manualForm.clockOutTime ? new Date(manualForm.clockOutTime).toISOString() : ''
            };
            await attendanceAPI.createManual(payload);
            toast.success('Attendance record added successfully');
            setManualOpen(false);
            setFilters(prev => ({ ...prev, search: '' }));
            setActiveRoleFilter('all');
            if (page === 1) {
                setRefreshToggle(p => !p); // Force refresh if already on page 1
            } else {
                setPage(1); // Reset to first page will trigger fetch via useEffect
            }
            setManualForm({
                userId: '',
                clockInTime: new Date().toISOString().slice(0, 16),
                clockOutTime: '',
                note: ''
            });
        } catch (error: any) {
            toast.error(error.response?.data?.message || 'Failed to add record');
        } finally {
            setSubmitting(false);
        }
    };

    // Edit Modal State
    const [editOpen, setEditOpen] = useState(false);
    const [editSubmitting, setEditSubmitting] = useState(false);
    const [editForm, setEditForm] = useState({
        id: '',
        clockInTime: '',
        clockOutTime: '',
        note: ''
    });

    const handleEditClick = (shift: any) => {
        // Format for datetime-local input: YYYY-MM-DDThh:mm
        const formatForInput = (dateStr: string) => {
            if (!dateStr) return '';
            const d = new Date(dateStr);
            // Adjust for local timezone offset manually to display correctly in input type="datetime-local"
            // Or simpler: use toISOString().slice(0,16) IF we are okay with UTC/ISO. 
            // Ideally we want local time.
            const offsetMs = d.getTimezoneOffset() * 60 * 1000;
            const localISOTime = (new Date(d.getTime() - offsetMs)).toISOString().slice(0, 16);
            return localISOTime;
        };

        setEditForm({
            id: shift._id,
            clockInTime: formatForInput(shift.clockInTime),
            clockOutTime: formatForInput(shift.clockOutTime),
            note: shift.note || ''
        });
        setEditOpen(true);
    };

    const handleEditSubmit = async () => {
        if (editSubmitting) return;
        try {
            setEditSubmitting(true);
            await attendanceAPI.update(editForm.id, {
                clockInTime: editForm.clockInTime ? new Date(editForm.clockInTime).toISOString() : '',
                clockOutTime: editForm.clockOutTime ? new Date(editForm.clockOutTime).toISOString() : null, // Empty string -> null for backend
                note: editForm.note
            });
            toast.success('Attendance record updated successfully');
            setEditOpen(false);
            setRefreshToggle(p => !p); // Refresh list via useEffect
        } catch (error: any) {
            toast.error(error.response?.data?.message || 'Failed to update record');
        } finally {
            setEditSubmitting(false);
        }
    };

    const handleViewDetails = (shift: any) => {
        setSelectedShift(shift);
        setDetailsOpen(true);
    };

    const getStatusChip = (status: string) => {
        if (status === 'active') {
            return (
                <Chip
                    label="LIVE"
                    icon={<LiveIcon sx={{ fontSize: '14px !important', animation: 'blink 1.5s infinite' }} />}
                    size="small"
                    sx={{ bgcolor: alpha(theme.palette.success.main, 0.1), color: 'success.main', fontWeight: 'bold' }}
                />
            );
        }
        return <Chip label="COMPLETED" size="small" variant="outlined" sx={{ color: 'text.secondary' }} />;
    };

    const roles = ['all', 'waiter', 'cashier', 'manager', 'kitchen_staff', 'delivery'];

    return (
        <Box sx={{ p: { xs: 1.4, md: 4 }, maxWidth: 1600, mx: 'auto' }}>
            {/* Header Section */}
            <Box sx={{ mb: { xs: 2.5, md: 6 }, display: 'flex', flexDirection: { xs: 'column', md: 'row' }, justifyContent: 'space-between', alignItems: { md: 'flex-end' }, gap: { xs: 1.5, md: 3 } }}>
                <Box sx={{ textAlign: { xs: 'center', md: 'left' }, width: { xs: '100%', md: 'auto' } }}>
                    <Typography variant="h4" fontWeight="900" sx={{ letterSpacing: '-0.5px', mb: 0.6, fontSize: headingFontSize, color: { xs: '#000', md: 'text.primary' } }}>
                        Staff Operations Center
                    </Typography>
                    <Typography variant="body1" color="text.secondary" sx={{ opacity: 0.8, fontSize: bodyFontSize }}>
                        Real-time shift cycle monitoring, geolocation tracking, and payroll aggregation.
                    </Typography>
                </Box>
                <Stack direction="row" spacing={2} sx={{ width: { xs: '100%', md: 'auto' }, justifyContent: { xs: 'space-between', md: 'flex-start' } }}>
                    <Button
                        variant="contained"
                        startIcon={<AddIcon />}
                        onClick={() => setManualOpen(true)}
                        sx={{ borderRadius: 3, px: 3, py: 1.5, fontWeight: 'bold', boxShadow: theme.palette.mode === 'light' ? '0 8px 20px rgba(0,0,0,0.1)' : '0 8px 20px rgba(0,0,0,0.4)', flexGrow: { xs: 1, md: 0 } }}
                    >
                        New Entry
                    </Button>
                    <IconButton onClick={() => fetchAttendance()} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 3, width: 48, height: 48 }}>
                        <RefreshIcon className={refreshing ? 'spin-animation' : ''} />
                    </IconButton>
                </Stack>
            </Box>

            {/* Premium Stats Dashboard */}
            <Grid container spacing={{ xs: 0.9, md: 3 }} sx={{ mb: { xs: 1.6, md: 6 } }}>
                {[
                    { label: 'Active Personnel', value: backendStats.activeShifts, desc: 'Currently clocked in', icon: <PersonIcon />, color: theme.palette.success.main },
                    { label: filters.search ? 'Search Results' : 'Logged Shifts', value: totalRecords, desc: filters.search ? `Matches for "${filters.search}"` : 'Logged shift records', icon: <TodayIcon />, color: theme.palette.info.main },
                    { label: 'Cumulative Hours', value: `${backendStats.totalHours.toFixed(1)}h`, desc: 'Period productivity', icon: <TimeIcon />, color: theme.palette.warning.main },
                    { label: 'Payroll Weight', value: formatCurrency(backendStats.totalEarnings), desc: 'Est. period expenditure', icon: <PayrollIcon />, color: theme.palette.error.main }
                ].map((stat, i) => (
                    <Grid item xs={12} sm={6} md={3} key={i}>
                        <Paper sx={{ p: { xs: 1, md: 3 }, borderRadius: 0, bgcolor: alpha(stat.color, 0.04), border: '1px solid', borderColor: alpha(stat.color, 0.1), transition: '0.3s', '&:hover': { transform: 'translateY(-4px)', boxShadow: `0 10px 30px ${alpha(stat.color, 0.1)}` } }}>
                            <Stack direction="row" spacing={{ xs: 1.2, md: 2.5 }} alignItems="center">
                                <Box sx={{ p: { xs: 1.2, md: 2 }, borderRadius: 4, bgcolor: stat.color, color: 'white', display: 'flex', boxShadow: `0 5px 15px ${alpha(stat.color, 0.4)}` }}>
                                    {stat.icon}
                                </Box>
                                <Box sx={{ minWidth: 0, flexGrow: 1 }}>
                                    <Typography
                                        fontWeight="900"
                                        sx={{
                                            fontSize: { xs: '0.96rem', md: '1.3rem', lg: '1.25rem' },
                                            lineHeight: 1.1,
                                            mb: { xs: 0.2, md: 0.5 },
                                            wordBreak: 'break-word'
                                        }}
                                    >
                                        {stat.value}
                                    </Typography>
                                    <Typography variant="caption" color="text.secondary" fontWeight="bold" sx={{ textTransform: 'uppercase', letterSpacing: '0.5px', display: 'block', fontSize: bodyFontSize }}>{stat.label}</Typography>
                                </Box>
                            </Stack>
                            <Typography variant="caption" color="text.secondary" sx={{ mt: { xs: 0.55, md: 2 }, display: 'block', fontStyle: 'italic', fontSize: bodyFontSize }}>
                                {stat.desc}
                            </Typography>
                        </Paper>
                    </Grid>
                ))}
            </Grid>

            {/* Filters Cockpit */}
            <Paper sx={{ p: { xs: 1, md: 3 }, mb: { xs: 1.8, md: 4 }, borderRadius: 0, boxShadow: theme.palette.mode === 'light' ? '0 4px 15px rgba(0,0,0,0.05)' : '0 4px 15px rgba(0,0,0,0.4)', border: `1px solid ${theme.palette.divider}`, bgcolor: theme.palette.background.paper }}>
                <Grid container spacing={{ xs: 1.2, md: 3 }} alignItems="center">
                    <Grid item xs={12} md={4}>
                        <TextField
                            fullWidth
                            placeholder="Search staff by name..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            sx={{ '& .MuiOutlinedInput-root': { borderRadius: 3, bgcolor: theme.palette.mode === 'light' ? '#f8fafc' : alpha(theme.palette.background.paper, 0.8) } }}
                            InputProps={{ startAdornment: <InputAdornment position="start"><SearchIcon color="action" /></InputAdornment> }}
                        />
                    </Grid>
                    <Grid item xs={12} md={5}>
                        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                            <TextField
                                type="date"
                                label="From"
                                value={filters.startDate}
                                onChange={(e) => {
                                    setFilters({ ...filters, startDate: e.target.value });
                                    setPage(1);
                                }}
                                InputLabelProps={{ shrink: true }}
                                fullWidth
                                sx={{ '& .MuiOutlinedInput-root': { borderRadius: 3 } }}
                            />
                            <TextField
                                type="date"
                                label="To"
                                value={filters.endDate}
                                onChange={(e) => {
                                    setFilters({ ...filters, endDate: e.target.value });
                                    setPage(1);
                                }}
                                InputLabelProps={{ shrink: true }}
                                fullWidth
                                sx={{ '& .MuiOutlinedInput-root': { borderRadius: 3 } }}
                            />
                        </Stack>
                    </Grid>
                    <Grid item xs={12} md={3}>
                        <Button
                            fullWidth
                            variant="outlined"
                            startIcon={<DownloadIcon />}
                            onClick={() => toast.success('Generation export batch...')}
                            sx={{ borderRadius: 3, py: 1.8, fontWeight: 'bold', borderStyle: 'dashed' }}
                        >
                            Export Financials
                        </Button>
                    </Grid>
                </Grid>

                <Divider sx={{ my: { xs: 1, md: 3 } }} />

                <Box
                    sx={{
                        display: 'flex',
                        gap: 1,
                        overflowX: 'visible',
                        flexWrap: 'wrap',
                        pb: { xs: 2, md: 0 },
                        px: { xs: 0.5, md: 0 },
                        mx: { xs: -1, md: 0 }, // Negative margin to bleed to edges on mobile
                        '&::-webkit-scrollbar': { display: 'none' },
                        scrollbarWidth: 'none',
                        '-ms-overflow-style': 'none',
                        WebkitOverflowScrolling: 'touch'
                    }}
                >
                    {roles.map(role => (
                        <Chip
                            key={role}
                            label={role.replace('_', ' ').toUpperCase()}
                            onClick={() => {
                                setActiveRoleFilter(role);
                                setPage(1);
                            }}
                            variant={activeRoleFilter === role ? 'filled' : 'outlined'}
                            color={activeRoleFilter === role ? 'primary' : 'default'}
                            sx={{
                                borderRadius: 3,
                                fontWeight: '900',
                                px: { xs: 1.2, md: 2 },
                                py: { xs: 1.9, md: 2.5 },
                                fontSize: { xs: '0.68rem', md: '0.75rem' },
                                letterSpacing: '0.5px',
                                flexShrink: 0,
                                transition: '0.2s',
                                ...(activeRoleFilter === role ? {
                                    boxShadow: `0 4px 12px ${alpha(theme.palette.primary.main, 0.3)}`,
                                } : {
                                    bgcolor: theme.palette.background.paper,
                                    borderColor: alpha(theme.palette.divider, 0.2)
                                }),
                                '&:hover': {
                                    transform: 'translateY(-1px)',
                                    bgcolor: activeRoleFilter === role ? 'primary.dark' : alpha(theme.palette.primary.main, 0.05)
                                }
                            }}
                        />
                    ))}
                </Box>
            </Paper>

            {/* Monitoring Table */}
            <Box sx={{ mb: 4 }}>
                {loading ? (
                    <Paper sx={{ p: 10, textAlign: 'center', borderRadius: 0 }}>
                        <CircularProgress size={60} thickness={2} />
                        <Typography sx={{ mt: 3, color: 'text.secondary', fontWeight: '500' }}>Synchronizing staff history...</Typography>
                    </Paper>
                ) : (
                    <>
                        {isMobile ? (
                            <Stack spacing={1.15}>
                                {attendance.map((row: any, index: number) => (
                                    <Box key={`${row._id || 'card'}-${index}`} sx={{ mb: 1 }}>
                                        <Card sx={{ borderRadius: 3, boxShadow: theme.palette.mode === 'light' ? '0 4px 12px rgba(0,0,0,0.05)' : '0 4px 12px rgba(0,0,0,0.4)', border: `1px solid ${theme.palette.divider}`, bgcolor: theme.palette.background.paper }}>
                                            <CardContent sx={{ p: 1.2, '&:last-child': { pb: 1.2 } }}>
                                                <Stack spacing={1.05}>
                                                    <Stack direction="row" justifyContent="space-between" alignItems="center">
                                                        <Stack direction="row" spacing={1.5} alignItems="center">
                                                            <Avatar src={row.user?.profileImage} sx={{ width: 40, height: 40, border: '1px solid', borderColor: 'divider' }}>
                                                                {row.user?.firstName?.charAt(0) || <PersonIcon />}
                                                            </Avatar>
                                                            <Box>
                                                                <Typography variant="subtitle2" fontWeight="800">{row.user?.firstName || 'Unknown'} {row.user?.lastName || 'Staff'}</Typography>
                                                                <Typography variant="caption" color="text.secondary" sx={{ textTransform: 'uppercase', fontWeight: 'bold' }}>
                                                                    {row.user?.roles?.[0]?.replace('_', ' ') || 'Unknown Role'}
                                                                </Typography>
                                                            </Box>
                                                        </Stack>
                                                        {getStatusChip(row.status)}
                                                    </Stack>

                                                    <Divider />

                                                    <Grid container spacing={1.1}>
                                                        <Grid item xs={6}>
                                                            <Typography variant="caption" color="text.secondary" display="block">TIMESTAMPS</Typography>
                                                            <Typography variant="body2" fontWeight="600">IN: {new Date(row.clockInTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</Typography>
                                                            {row.clockOutTime ? (
                                                                <Typography variant="caption" color="text.secondary">OUT: {new Date(row.clockOutTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</Typography>
                                                            ) : (
                                                                <Typography variant="caption" color="success.main" sx={{ fontWeight: 'bold' }}>ACTIVE NOW</Typography>
                                                            )}
                                                        </Grid>
                                                        <Grid item xs={6}>
                                                            <Typography variant="caption" color="text.secondary" display="block">FINANCIALS</Typography>
                                                            <Typography variant="subtitle2" fontWeight="800" color="primary">
                                                                {row.estimatedEarnings ? formatCurrency(row.estimatedEarnings) : '--'}
                                                            </Typography>
                                                            <Typography variant="caption" color="text.secondary">Work: {row.totalHours ? `${row.totalHours}h` : '--'}</Typography>
                                                        </Grid>
                                                    </Grid>

                                                    <Divider />

                                                    <Stack direction="row" justifyContent="space-between" alignItems="center">
                                                        <Stack direction="row" spacing={1}>
                                                            <Tooltip title={`IP: ${row.clockInIp}`}>
                                                                <Chip label="IP" size="small" variant="outlined" sx={{ height: 20, fontSize: '0.6rem' }} />
                                                            </Tooltip>
                                                            {row.clockInLocation?.lat && (
                                                                <IconButton
                                                                    size="small"
                                                                    onClick={() => window.open(`https://www.google.com/maps?q=${row.clockInLocation.lat},${row.clockInLocation.lng}`, '_blank')}
                                                                    sx={{ bgcolor: alpha(theme.palette.primary.main, 0.05) }}
                                                                >
                                                                    <LocationIcon fontSize="inherit" color="primary" />
                                                                </IconButton>
                                                            )}
                                                        </Stack>
                                                        <Stack direction="row" spacing={1}>
                                                            <IconButton
                                                                size="small"
                                                                onClick={() => handleEditClick(row)}
                                                                sx={{ bgcolor: alpha(theme.palette.warning.main, 0.1) }}
                                                            >
                                                                <EditIcon sx={{ fontSize: 18 }} color="warning" />
                                                            </IconButton>
                                                            <IconButton
                                                                size="small"
                                                                onClick={() => handleViewDetails(row)}
                                                                sx={{ bgcolor: alpha(theme.palette.primary.main, 0.05) }}
                                                            >
                                                                <MapIcon sx={{ fontSize: 18 }} color="primary" />
                                                            </IconButton>
                                                        </Stack>
                                                    </Stack>
                                                </Stack>
                                            </CardContent>
                                        </Card>
                                    </Box>
                                ))}
                            </Stack>
                        ) : (
                            <TableContainer component={Paper} sx={{ borderRadius: 0, overflow: 'hidden', boxShadow: theme.palette.mode === 'light' ? '0 4px 20px rgba(0,0,0,0.05)' : '0 4px 20px rgba(0,0,0,0.4)', border: `1px solid ${theme.palette.divider}` }}>
                                <Table>
                                    <TableHead sx={{ bgcolor: alpha(theme.palette.primary.main, 0.02) }}>
                                        <TableRow>
                                            <TableCell sx={{ fontWeight: 'bold', py: 2.5 }}>MEMBER</TableCell>
                                            <TableCell sx={{ fontWeight: 'bold' }}>STATUS</TableCell>
                                            <TableCell sx={{ fontWeight: 'bold' }}>TIMESTAMPS</TableCell>
                                            <TableCell sx={{ fontWeight: 'bold' }}>GEOTAGS</TableCell>
                                            <TableCell sx={{ fontWeight: 'bold' }}>TOTAL WORK</TableCell>
                                            <TableCell sx={{ fontWeight: 'bold' }}>EST. PAYROLL</TableCell>
                                            <TableCell align="right" sx={{ fontWeight: 'bold' }}>ACTION</TableCell>
                                        </TableRow>
                                    </TableHead>
                                    <TableBody>
                                        {attendance.map((row: any, index: number) => (
                                            <TableRow key={`${row._id || 'row'}-${index}`} hover sx={{ '&:last-child td, &:last-child th': { border: 0 } }}>
                                                <TableCell>
                                                    <Stack direction="row" spacing={2} alignItems="center">
                                                        <Avatar
                                                            src={row.user?.profileImage}
                                                            sx={{ width: 44, height: 44, border: '2px solid', borderColor: 'divider' }}
                                                        >
                                                            {row.user?.firstName?.charAt(0) || <PersonIcon />}
                                                        </Avatar>
                                                        <Box>
                                                            <Typography variant="subtitle2" fontWeight="800">
                                                                {row.user?.firstName || 'Unknown'} {row.user?.lastName || 'Staff'}
                                                            </Typography>
                                                            <Typography variant="caption" color="text.secondary" sx={{ textTransform: 'uppercase', fontStyle: 'bold' }}>
                                                                {activeRoleFilter !== 'all' && row.user?.roles?.includes(activeRoleFilter)
                                                                    ? activeRoleFilter.replace('_', ' ')
                                                                    : (row.user?.roles?.[0]?.replace('_', ' ') || 'Unknown Role')}
                                                            </Typography>
                                                        </Box>
                                                    </Stack>
                                                </TableCell>
                                                <TableCell>{getStatusChip(row.status)}</TableCell>
                                                <TableCell>
                                                    <Typography variant="body2" fontWeight="500">IN: {new Date(row.clockInTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</Typography>
                                                    {row.clockOutTime ? (
                                                        <Typography variant="caption" color="text.secondary">OUT: {new Date(row.clockOutTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</Typography>
                                                    ) : (
                                                        <Typography variant="caption" color="success.main" sx={{ fontWeight: 'bold' }}>ACTIVE NOW</Typography>
                                                    )}
                                                </TableCell>
                                                <TableCell>
                                                    <Stack direction="row" spacing={1}>
                                                        <Tooltip title={`IP: ${row.clockInIp}`}>
                                                            <Chip label="IP" size="small" variant="outlined" sx={{ height: 20, fontSize: '0.6rem' }} />
                                                        </Tooltip>
                                                        {row.clockInLocation?.lat && (
                                                            <Tooltip title="View Geolocation">
                                                                <IconButton
                                                                    size="small"
                                                                    onClick={() => window.open(`https://www.google.com/maps?q=${row.clockInLocation.lat},${row.clockInLocation.lng}`, '_blank')}
                                                                    sx={{ bgcolor: alpha(theme.palette.primary.main, 0.05) }}
                                                                >
                                                                    <LocationIcon fontSize="inherit" color="primary" />
                                                                </IconButton>
                                                            </Tooltip>
                                                        )}
                                                    </Stack>
                                                </TableCell>
                                                <TableCell>
                                                    <Typography variant="subtitle2" fontWeight="900">{row.totalHours ? `${row.totalHours}h` : '--'}</Typography>
                                                </TableCell>
                                                <TableCell>
                                                    <Typography variant="subtitle1" fontWeight="900" color="primary">
                                                        {row.estimatedEarnings ? formatCurrency(row.estimatedEarnings) : '--'}
                                                    </Typography>
                                                </TableCell>
                                                <TableCell align="right">
                                                    <Stack direction="row" spacing={1} justifyContent="flex-end">
                                                        <Tooltip title="Edit Record">
                                                            <IconButton
                                                                size="small"
                                                                onClick={() => handleEditClick(row)}
                                                                sx={{ bgcolor: alpha(theme.palette.warning.main, 0.1), '&:hover': { bgcolor: alpha(theme.palette.warning.main, 0.2) } }}
                                                            >
                                                                <EditIcon sx={{ fontSize: 20 }} color="warning" />
                                                            </IconButton>
                                                        </Tooltip>
                                                        <Tooltip title="View Detailed Logs">
                                                            <IconButton
                                                                size="small"
                                                                onClick={() => handleViewDetails(row)}
                                                                sx={{ bgcolor: alpha(theme.palette.primary.main, 0.05), '&:hover': { bgcolor: alpha(theme.palette.primary.main, 0.1) } }}
                                                            >
                                                                <MapIcon sx={{ fontSize: 20 }} color="primary" />
                                                            </IconButton>
                                                        </Tooltip>
                                                    </Stack>
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </TableContainer>
                        )}

                        {totalRecords > ITEMS_PER_PAGE && (
                            <Box sx={{
                                p: 3,
                                display: 'flex',
                                flexDirection: { xs: 'column', sm: 'row' },
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                gap: 2,
                                borderTop: '1px solid',
                                borderColor: 'divider',
                                bgcolor: alpha(theme.palette.primary.main, 0.01)
                            }}>
                                <Typography variant="body2" color="text.secondary" sx={{ fontWeight: '500' }}>
                                    Showing <strong>{Math.min((page - 1) * ITEMS_PER_PAGE + 1, totalRecords)}</strong> to <strong>{Math.min(page * ITEMS_PER_PAGE, totalRecords)}</strong> of <strong>{totalRecords}</strong> personnel records
                                </Typography>
                                {totalPages > 1 && (
                                    <Pagination
                                        count={totalPages}
                                        page={page}
                                        onChange={(_, p) => setPage(p)}
                                        color="primary"
                                        size="medium"
                                        sx={{
                                            '& .MuiPaginationItem-root': {
                                                borderRadius: 2,
                                                fontWeight: 'bold',
                                                '&.Mui-selected': {
                                                    boxShadow: `0 4px 10px ${alpha(theme.palette.primary.main, 0.3)}`
                                                }
                                            }
                                        }}
                                    />
                                )}
                            </Box>
                        )}

                        {attendance.length === 0 && (
                            <Box sx={{ p: 10, textAlign: 'center' }}>
                                <Typography color="text.secondary">No attendance records found for this period.</Typography>
                            </Box>
                        )}
                    </>
                )}
            </Box>

            {/* Manual Entry Modal */}
            <Dialog
                open={manualOpen}
                onClose={(event, reason) => {
                    if (reason !== 'backdropClick') {
                        setManualOpen(false);
                    }
                }}
                disableEscapeKeyDown
                maxWidth="xs"
                fullWidth
                PaperProps={{
                    sx: {
                        borderRadius: 2,
                        p: { xs: 0.5, sm: 2 },
                        position: 'relative',
                        bgcolor: theme.palette.background.paper,
                        m: { xs: 4, sm: 'auto' }, // Increased margins to provide visual 'space'
                        maxHeight: { xs: 'calc(100% - 140px)', sm: 'calc(100% - 96px)' } // Constrained to show nav behind
                    }
                }}
            >
                <IconButton
                    onClick={() => setManualOpen(false)}
                    sx={{
                        position: 'absolute',
                        right: 18,
                        top: 18,
                        bgcolor: 'error.main',
                        color: 'white',
                        width: 24,
                        height: 24,
                        padding: 0,
                        '&:hover': {
                            bgcolor: 'error.dark',
                        },
                        zIndex: 10
                    }}
                >
                    <CloseIcon sx={{ fontSize: 16 }} />
                </IconButton>
                <DialogTitle sx={{ fontWeight: '900', fontSize: '1.5rem', pb: 0 }}>Log Manual Shift</DialogTitle>
                <DialogContent>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 4 }}>Correct historical data or log missing attendance.</Typography>
                    <Stack spacing={3}>
                        <FormControl fullWidth required>
                            <InputLabel>Target Personnel</InputLabel>
                            <Select
                                value={manualForm.userId}
                                label="Target Personnel"
                                onChange={(e) => setManualForm({ ...manualForm, userId: e.target.value })}
                                sx={{ borderRadius: 3 }}
                            >
                                {users.map(user => (
                                    <MenuItem key={user._id} value={user._id}>
                                        {user.firstName} {user.lastName} ({user.roles?.[0]})
                                    </MenuItem>
                                ))}
                            </Select>
                        </FormControl>

                        <TextField
                            fullWidth
                            type="datetime-local"
                            label="Cycle Start (Clock-In)"
                            value={manualForm.clockInTime}
                            onChange={(e) => setManualForm({ ...manualForm, clockInTime: e.target.value })}
                            InputLabelProps={{ shrink: true }}
                            sx={{ '& .MuiOutlinedInput-root': { borderRadius: 3 } }}
                            required
                        />

                        <TextField
                            fullWidth
                            type="datetime-local"
                            label="Cycle End (Clock-Out)"
                            value={manualForm.clockOutTime}
                            onChange={(e) => setManualForm({ ...manualForm, clockOutTime: e.target.value })}
                            InputLabelProps={{ shrink: true }}
                            helperText="Leave empty to mark as currently active"
                            sx={{ '& .MuiOutlinedInput-root': { borderRadius: 3 } }}
                        />

                        <TextField
                            fullWidth
                            label="Administrative Notes"
                            placeholder="e.g. Backdated entry for Tuesday gate failure"
                            multiline
                            rows={3}
                            value={manualForm.note}
                            onChange={(e) => setManualForm({ ...manualForm, note: e.target.value })}
                            sx={{ '& .MuiOutlinedInput-root': { borderRadius: 3 } }}
                        />
                    </Stack>
                </DialogContent>
                <DialogActions sx={{ px: 3, pb: 2 }}>
                    <Button onClick={() => setManualOpen(false)} sx={{ fontWeight: 'bold' }}>Cancel</Button>
                    <Button
                        onClick={handleManualSubmit}
                        variant="contained"
                        disabled={submitting}
                        sx={{ borderRadius: 3, px: 4, fontWeight: 'bold' }}
                    >
                        {submitting ? <CircularProgress size={20} /> : 'Save Log'}
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Edit Attendance Modal */}
            <Dialog
                open={editOpen}
                onClose={(event, reason) => {
                    if (reason !== 'backdropClick') {
                        setEditOpen(false);
                    }
                }}
                disableEscapeKeyDown
                maxWidth="xs"
                fullWidth
                PaperProps={{ sx: { borderRadius: 0, p: 2, position: 'relative' } }}
            >
                <IconButton
                    onClick={() => setEditOpen(false)}
                    sx={{
                        position: 'absolute',
                        right: 18,
                        top: 18,
                        bgcolor: 'error.main',
                        color: 'white',
                        width: 24,
                        height: 24,
                        padding: 0,
                        '&:hover': { bgcolor: 'error.dark' },
                        zIndex: 10
                    }}
                >
                    <CloseIcon sx={{ fontSize: 16 }} />
                </IconButton>
                <DialogTitle sx={{ fontWeight: '900', fontSize: '1.5rem', pb: 0 }}>Edit Attendance Log</DialogTitle>
                <DialogContent>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 4 }}>Modify clock-in/out times for corrections.</Typography>
                    <Stack spacing={3}>
                        <TextField
                            fullWidth
                            type="datetime-local"
                            label="Cycle Start (Clock-In)"
                            value={editForm.clockInTime}
                            onChange={(e) => setEditForm({ ...editForm, clockInTime: e.target.value })}
                            InputLabelProps={{ shrink: true }}
                            sx={{ '& .MuiOutlinedInput-root': { borderRadius: 3 } }}
                            required
                        />

                        <TextField
                            fullWidth
                            type="datetime-local"
                            label="Cycle End (Clock-Out)"
                            value={editForm.clockOutTime}
                            onChange={(e) => setEditForm({ ...editForm, clockOutTime: e.target.value })}
                            InputLabelProps={{ shrink: true }}
                            helperText="Clear to mark as currently active"
                            sx={{ '& .MuiOutlinedInput-root': { borderRadius: 3 } }}
                        />

                        <TextField
                            fullWidth
                            label="Administrative Notes"
                            placeholder="Reason for correction..."
                            multiline
                            rows={3}
                            value={editForm.note}
                            onChange={(e) => setEditForm({ ...editForm, note: e.target.value })}
                            sx={{ '& .MuiOutlinedInput-root': { borderRadius: 3 } }}
                        />
                    </Stack>
                </DialogContent>
                <DialogActions sx={{ px: 3, pb: 2 }}>
                    <Button onClick={() => setEditOpen(false)} sx={{ fontWeight: 'bold' }}>Cancel</Button>
                    <Button
                        onClick={handleEditSubmit}
                        variant="contained"
                        disabled={editSubmitting}
                        color="warning"
                        sx={{ borderRadius: 3, px: 4, fontWeight: 'bold' }}
                    >
                        {editSubmitting ? <CircularProgress size={20} /> : 'Update Log'}
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Shift Details Modal */}
            <Dialog
                open={detailsOpen}
                onClose={(event, reason) => {
                    if (reason !== 'backdropClick') {
                        setDetailsOpen(false);
                    }
                }}
                disableEscapeKeyDown
                maxWidth="md"
                fullWidth
                PaperProps={{
                    sx: {
                        borderRadius: 3,
                        overflow: 'hidden',
                        position: 'relative',
                        bgcolor: theme.palette.background.paper,
                        m: { xs: 3, md: 'auto' }, // Floating effect on mobile
                        maxHeight: { xs: 'calc(100% - 150px)', sm: 'calc(100% - 120px)' } // Significant gaps for nav bars
                    }
                }}
            >
                {selectedShift && (
                    <>
                        <DialogTitle sx={{ p: 0 }}>
                            <Box sx={{ bgcolor: 'primary.main', color: 'white', p: { xs: 2, md: 3 }, pr: { xs: 6, md: 8 }, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <Stack direction="row" spacing={2} alignItems="center" sx={{ minWidth: 0 }}>
                                    <Avatar src={selectedShift.user?.profileImage} sx={{ width: { xs: 40, md: 50 }, height: { xs: 40, md: 50 }, border: '2px solid rgba(255,255,255,0.3)' }} />
                                    <Box sx={{ minWidth: 0 }}>
                                        <Typography variant="h6" fontWeight="900" sx={{ lineHeight: 1.2, fontSize: { xs: '1rem', md: '1.25rem' }, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                            {selectedShift.user?.firstName} {selectedShift.user?.lastName}
                                        </Typography>
                                        <Typography variant="caption" sx={{ opacity: 0.8, textTransform: 'uppercase', fontWeight: 'bold', display: 'block', fontSize: '0.7rem' }}>
                                            {selectedShift.user?.roles?.[0]} • Detailed Cycle Log
                                        </Typography>
                                    </Box>
                                </Stack>
                                <IconButton
                                    onClick={() => setDetailsOpen(false)}
                                    sx={{
                                        position: 'absolute',
                                        right: 12,
                                        top: 12,
                                        bgcolor: 'error.main',
                                        color: 'white',
                                        width: 28,
                                        height: 28,
                                        padding: 0,
                                        '&:hover': {
                                            bgcolor: 'error.dark',
                                        },
                                        zIndex: 10
                                    }}
                                >
                                    <CloseIcon sx={{ fontSize: 18 }} />
                                </IconButton>
                            </Box>
                        </DialogTitle>
                        <DialogContent sx={{ p: { xs: 1.5, md: 4 } }}>
                            <Grid container spacing={{ xs: 2, md: 4 }}>
                                <Grid item xs={12} md={6}>
                                    <Typography variant="overline" color="text.secondary" fontWeight="900" sx={{ mb: 1, display: 'block' }}>Shift Overview</Typography>
                                    <Stack spacing={{ xs: 2, md: 3 }} sx={{ mt: { xs: 1, md: 2 } }}>
                                        <Paper variant="outlined" sx={{ p: 2, borderRadius: 3, bgcolor: alpha(theme.palette.primary.main, 0.02) }}>
                                            <Stack spacing={2}>
                                                <Stack direction="row" justifyContent="space-between">
                                                    <Typography variant="body2" color="text.secondary">Shift Status</Typography>
                                                    {getStatusChip(selectedShift.status)}
                                                </Stack>
                                                <Divider />
                                                <Stack direction="row" justifyContent="space-between">
                                                    <Typography variant="body2" color="text.secondary">Clock-In Time</Typography>
                                                    <Typography variant="body2" fontWeight="bold">{new Date(selectedShift.clockInTime).toLocaleString()}</Typography>
                                                </Stack>
                                                <Stack direction="row" justifyContent="space-between">
                                                    <Typography variant="body2" color="text.secondary">Clock-Out Time</Typography>
                                                    <Typography variant="body2" fontWeight="bold">
                                                        {selectedShift.clockOutTime ? new Date(selectedShift.clockOutTime).toLocaleString() : 'Running...'}
                                                    </Typography>
                                                </Stack>
                                                <Divider />
                                                <Stack direction="row" justifyContent="space-between">
                                                    <Typography variant="body2" color="text.secondary">Total Duration</Typography>
                                                    <Typography variant="h6" fontWeight="900" color="primary">{selectedShift.totalHours ? `${selectedShift.totalHours} Hours` : '--'}</Typography>
                                                </Stack>
                                                <Stack direction="row" justifyContent="space-between">
                                                    <Typography variant="body2" color="text.secondary">Estimated Earnings</Typography>
                                                    <Typography variant="h6" fontWeight="900" color="success.main">{selectedShift.estimatedEarnings ? formatCurrency(selectedShift.estimatedEarnings) : '--'}</Typography>
                                                </Stack>
                                            </Stack>
                                        </Paper>

                                        <Box>
                                            <Typography variant="overline" color="text.secondary" fontWeight="900">Connectivity & Identity</Typography>
                                            <Stack direction="row" spacing={1} sx={{ mt: 1 }}>
                                                <Chip icon={<IpIcon fontSize="small" />} label={`IP: ${selectedShift.clockInIp}`} size="small" sx={{ borderRadius: 2 }} />
                                                <Chip label={`Staff ID: ${selectedShift.user?._id?.slice(-6).toUpperCase()}`} size="small" variant="outlined" sx={{ borderRadius: 2 }} />
                                            </Stack>
                                        </Box>

                                        <Box>
                                            <Typography variant="overline" color="text.secondary" fontWeight="900">System Audit Trace</Typography>
                                            <Paper variant="outlined" sx={{ p: 2, mt: 1, borderRadius: 3, bgcolor: alpha(theme.palette.info.main, 0.02), borderStyle: 'dashed' }}>
                                                <Stack spacing={1}>
                                                    <Stack direction="row" justifyContent="space-between">
                                                        <Typography variant="caption" color="text.secondary">Recorded By:</Typography>
                                                        <Typography variant="caption" fontWeight="bold">
                                                            {selectedShift.createdBy ?
                                                                `${selectedShift.createdBy.firstName} ${selectedShift.createdBy.lastName} (Admin)` :
                                                                "Self-Recorded (App)"
                                                            }
                                                        </Typography>
                                                    </Stack>
                                                    <Stack direction="row" justifyContent="space-between">
                                                        <Typography variant="caption" color="text.secondary">System Timestamp:</Typography>
                                                        <Typography variant="caption" fontWeight="bold">
                                                            {new Date(selectedShift.createdAt).toLocaleString()}
                                                        </Typography>
                                                    </Stack>
                                                </Stack>
                                            </Paper>
                                        </Box>

                                        <Box>
                                            <Typography variant="overline" color="text.secondary" fontWeight="900">Administrative Notes</Typography>
                                            <Typography variant="body2" sx={{ mt: 1, p: 2, bgcolor: theme.palette.mode === 'dark' ? alpha(theme.palette.background.paper, 0.5) : 'grey.50', borderRadius: 3, borderLeft: '4px solid', borderColor: 'divider', fontStyle: 'italic' }}>
                                                {selectedShift.note || "No administrative notes recorded for this cycle."}
                                            </Typography>
                                        </Box>
                                    </Stack>
                                </Grid>
                                <Grid item xs={12} md={6}>
                                    <Typography variant="overline" color="text.secondary" fontWeight="900">Geospatial Verification</Typography>
                                    <Box sx={{ mt: 2, height: 350, borderRadius: 4, overflow: 'hidden', border: '1px solid', borderColor: 'divider' }}>
                                        {selectedShift.clockInLocation?.lat ? (
                                            <MapComponent
                                                center={{ lat: selectedShift.clockInLocation.lat, lng: selectedShift.clockInLocation.lng }}
                                                markerPosition={{ lat: selectedShift.clockInLocation.lat, lng: selectedShift.clockInLocation.lng }}
                                                height="100%"
                                                zoom={16}
                                            />
                                        ) : (
                                            <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', bgcolor: theme.palette.mode === 'dark' ? alpha(theme.palette.background.paper, 0.5) : 'grey.50', gap: 2 }}>
                                                <LocationIcon sx={{ fontSize: 48, color: 'text.disabled' }} />
                                                <Typography variant="caption" color="text.secondary">No GPS coordinate data available for this log.</Typography>
                                            </Box>
                                        )}
                                    </Box>
                                    <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block', textAlign: 'center' }}>
                                        * Latitude/Longitude coordinates captured at moment of clock-in.
                                    </Typography>
                                </Grid>
                            </Grid>
                        </DialogContent>
                        <DialogActions sx={{ p: { xs: 2, md: 3 }, bgcolor: theme.palette.mode === 'dark' ? alpha(theme.palette.primary.main, 0.05) : 'grey.50' }}>
                            <Button fullWidth variant="outlined" onClick={() => setDetailsOpen(false)} sx={{ borderRadius: 3, fontWeight: 'bold', py: { xs: 0.8, md: 1.2 } }}>
                                Close Detailed View
                            </Button>
                        </DialogActions>
                    </>
                )}
            </Dialog>

            <style>{`
                @keyframes blink {
                    0% { opacity: 1; }
                    50% { opacity: 0.4; }
                    100% { opacity: 1; }
                }
                .spin-animation {
                    animation: spin 1s linear infinite;
                }
                @keyframes spin {
                    from { transform: rotate(0deg); }
                    to { transform: rotate(360deg); }
                }
            `}</style>
        </Box>
    );
};

export default AttendancePage;

import React, { useCallback, useEffect, useState } from 'react';
import {
    Box,
    Typography,
    Card,
    CardContent,
    Button,
    TextField,
    IconButton,
    Chip,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Paper,
    Stack,
    MenuItem,
    Autocomplete,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Tab,
    Tabs,
    ToggleButton,
    ToggleButtonGroup,
    Tooltip,
    TablePagination,
    Switch,
    CircularProgress,
    InputAdornment,
    useTheme,
    useMediaQuery,
    alpha,
} from '@mui/material';
import {
    Search,
    Add,
    Edit,
    DeleteOutline,
    RestoreFromTrash,
    NotificationsActive,
    Person,
    Groups,
    Check,
    Close,
} from '@mui/icons-material';
import { toast } from 'react-hot-toast';
import { notificationsAPI } from '../../services/api';
import NotificationConfigDialog from './components/NotificationConfigDialog';

interface LinkedEvent {
    eventId: string;
    eventName: string;
    enabled: boolean;
}

interface LinkedConfig {
    _id: string;
    referenceId: string;
    name: string;
    user?: string | null;
    role?: string | null;
    // Roles held by the targeted user; absent on role configurations.
    userRoles?: string[];
    isActive: boolean;
    isDeleted: boolean;
    createdAt: string;
    notifications: Array<{
        categoryId: string;
        category: string;
        events: LinkedEvent[];
    }>;
}

const prettify = (value: string) => value.replace(/_/g, ' ');

const ManageNotificationsPage: React.FC = () => {
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('md'));

    const [tab, setTab] = useState(0);
    const [loading, setLoading] = useState(true);
    const [configs, setConfigs] = useState<LinkedConfig[]>([]);
    const [total, setTotal] = useState(0);
    const [page, setPage] = useState(0);
    const [rowsPerPage, setRowsPerPage] = useState(10);
    const [search, setSearch] = useState('');
    // Roles grant events; users narrow within them. Users are the day-to-day
    // view, so it opens there.
    const [typeFilter, setTypeFilter] = useState<'role' | 'user'>('user');
    const [debouncedSearch, setDebouncedSearch] = useState('');
    const [showDeleted, setShowDeleted] = useState(false);

    const [dialogOpen, setDialogOpen] = useState(false);
    const [editing, setEditing] = useState<LinkedConfig | null>(null);

    // Categories tab
    const [categories, setCategories] = useState<any[]>([]);
    const [categoriesLoading, setCategoriesLoading] = useState(false);
    const [categoryDialogOpen, setCategoryDialogOpen] = useState(false);
    const [editingCategory, setEditingCategory] = useState<any>(null);
    const [categoryName, setCategoryName] = useState('');
    const [categoryEvents, setCategoryEvents] = useState<Array<{ eventName: string; enabled: boolean }>>([]);
    const [savingCategory, setSavingCategory] = useState(false);
    // Catalog of selectable names, and the subset not yet used by this tenant.
    const [enumCategories, setEnumCategories] = useState<string[]>([]);
    const [enumEvents, setEnumEvents] = useState<string[]>([]);
    const [availableCategories, setAvailableCategories] = useState<string[]>([]);
    const [availableEvents, setAvailableEvents] = useState<string[]>([]);
    const [eventsByCategory, setEventsByCategory] = useState<Record<string, string[]>>({});
    const [savingCategoryId, setSavingCategoryId] = useState<string | null>(null);

    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedSearch(search);
            setPage(0);
        }, 300);
        return () => clearTimeout(timer);
    }, [search]);

    const fetchConfigs = useCallback(async () => {
        setLoading(true);
        try {
            const res = await notificationsAPI.list({
                search: debouncedSearch || undefined,
                page: page + 1,
                limit: rowsPerPage,
                isDeleted: showDeleted,
                type: typeFilter,
            });
            setConfigs(res.data?.data || []);
            setTotal(res.data?.pagination?.total || 0);
        } catch (err: any) {
            toast.error(err?.response?.data?.message || 'Failed to load notification configurations');
            setConfigs([]);
        } finally {
            setLoading(false);
        }
    }, [debouncedSearch, page, rowsPerPage, showDeleted, typeFilter]);

    const fetchCategories = useCallback(async () => {
        setCategoriesLoading(true);
        try {
            const [res, enumsRes] = await Promise.all([
                notificationsAPI.getCategories({ limit: 100 }),
                notificationsAPI.getEnums(),
            ]);
            setCategories(res.data?.data || []);

            const enums = enumsRes.data || {};
            setEnumCategories(enums.categories || []);
            setEnumEvents(enums.events || []);
            setAvailableCategories(enums.availableCategories || []);
            setAvailableEvents(enums.availableEvents || []);
            setEventsByCategory(enums.eventsByCategory || {});
        } catch (err: any) {
            toast.error(err?.response?.data?.message || 'Failed to load categories');
            setCategories([]);
        } finally {
            setCategoriesLoading(false);
        }
    }, []);

    useEffect(() => {
        if (tab === 0) fetchConfigs();
        else fetchCategories();
    }, [tab, fetchConfigs, fetchCategories]);

    const handleDelete = async (config: LinkedConfig) => {
        if (!window.confirm(`Delete the notification configuration for ${config.name}?`)) return;
        try {
            await notificationsAPI.remove(config._id, 'Deleted from Manage Notifications');
            toast.success('Configuration deleted');
            fetchConfigs();
        } catch (err: any) {
            toast.error(err?.response?.data?.message || 'Failed to delete configuration');
        }
    };

    const handleRestore = async (config: LinkedConfig) => {
        try {
            await notificationsAPI.restore(config._id);
            toast.success('Configuration restored');
            fetchConfigs();
        } catch (err: any) {
            toast.error(err?.response?.data?.message || 'Failed to restore configuration');
        }
    };

    const openCreateCategory = () => {
        setEditingCategory(null);
        setCategoryName('');
        setCategoryEvents([]);
        setCategoryDialogOpen(true);
    };

    const openEditCategory = (category: any) => {
        setEditingCategory(category);
        setCategoryName(category.category || '');
        setCategoryEvents(
            (category.events || []).map((e: any) => ({
                eventName: e.eventName,
                enabled: e.enabled !== false,
            })),
        );
        setCategoryDialogOpen(true);
    };

    /**
     * Picking a category pre-fills the events that belong to it, matching how
     * AFC derives a category's events from the catalog rather than asking the
     * user to remember them.
     */
    const handleCategorySelect = (name: string) => {
        setCategoryName(name);
        if (!editingCategory) {
            const suggested = (eventsByCategory[name] || []).filter((eventName) =>
                availableEvents.some((a) => a.toLowerCase() === eventName.toLowerCase()),
            );
            setCategoryEvents(suggested.map((eventName) => ({ eventName, enabled: true })));
        }
    };

    // Events already owned by another category are excluded, except the ones
    // this category currently holds while editing.
    const selectableEvents = React.useMemo(() => {
        const own = new Set(
            (editingCategory?.events || []).map((e: any) => String(e.eventName).toLowerCase()),
        );
        const pool = enumEvents.filter(
            (name) => availableEvents.some((a) => a.toLowerCase() === name.toLowerCase()) || own.has(name.toLowerCase()),
        );
        return pool;
    }, [enumEvents, availableEvents, editingCategory]);

    const handleSaveCategory = async () => {
        const name = categoryName.trim();
        if (!name) {
            toast.error('Select a category');
            return;
        }
        if (!categoryEvents.length) {
            toast.error('Add at least one event');
            return;
        }

        setSavingCategory(true);
        try {
            if (editingCategory) {
                await notificationsAPI.updateCategory(editingCategory._id, {
                    events: categoryEvents,
                });
                toast.success('Category updated');
            } else {
                await notificationsAPI.createCategory({ category: name, events: categoryEvents });
                toast.success('Category created');
            }
            setCategoryDialogOpen(false);
            fetchCategories();
        } catch (err: any) {
            toast.error(err?.response?.data?.message || 'Failed to save category');
        } finally {
            setSavingCategory(false);
        }
    };

    const handleDeleteCategory = async (category: any) => {
        if (!window.confirm(`Delete the "${category.category}" category and its events?`)) return;
        try {
            await notificationsAPI.removeCategory(category._id, 'Deleted from Manage Notifications');
            toast.success('Category deleted');
            fetchCategories();
        } catch (err: any) {
            toast.error(err?.response?.data?.message || 'Failed to delete category');
        }
    };

    const handleCategoryEventToggle = async (
        category: any,
        eventName: string,
        enabled: boolean,
    ) => {
        const nextEvents = (category.events || []).map((e: any) =>
            e.eventName === eventName ? { ...e, enabled } : e,
        );
        // Optimistic: the switch should respond immediately, and a failure
        // re-fetches the authoritative state below.
        setCategories((prev) =>
            prev.map((c) => (c._id === category._id ? { ...c, events: nextEvents } : c)),
        );
        setSavingCategoryId(category._id);
        try {
            await notificationsAPI.updateCategory(category._id, {
                events: nextEvents.map((e: any) => ({ eventName: e.eventName, enabled: e.enabled })),
            });
        } catch (err: any) {
            toast.error(err?.response?.data?.message || 'Failed to update category');
            fetchCategories();
        } finally {
            setSavingCategoryId(null);
        }
    };

    const enabledCount = (config: LinkedConfig) =>
        config.notifications.reduce(
            (sum, item) => sum + item.events.filter((e) => e.enabled).length,
            0,
        );

    /**
     * Every event for a config, grouped by category, each marked on or off.
     * Scrolls inside the tooltip so a config with many events stays readable.
     */
    const renderEventBreakdown = (config: LinkedConfig) => {
        const groups = config.notifications
            .map((item) => ({
                category: item.category,
                events: item.events,
                enabledCount: item.events.filter((e) => e.enabled).length,
            }))
            .filter((group) => group.events.length > 0);

        const total = groups.reduce((sum, group) => sum + group.events.length, 0);
        const enabledTotal = groups.reduce((sum, group) => sum + group.enabledCount, 0);

        return (
            <Box sx={{ maxHeight: 320, overflowY: 'auto', pr: 0.5 }}>
                <Typography
                    variant="subtitle2"
                    sx={{ fontWeight: 700, pb: 0.5, mb: 0.75, borderBottom: '1px solid', borderColor: 'divider' }}
                >
                    {enabledTotal} of {total} events on
                </Typography>
                <Stack spacing={1}>
                    {groups.map((group) => (
                        <Box key={group.category}>
                            <Typography
                                variant="caption"
                                sx={{ fontWeight: 700, opacity: 0.75, display: 'block', mb: 0.25 }}
                            >
                                {group.category} ({group.enabledCount}/{group.events.length})
                            </Typography>
                            <Stack spacing={0.25} sx={{ pl: 0.5 }}>
                                {group.events.map((event) => (
                                    <Stack
                                        key={event.eventId}
                                        direction="row"
                                        alignItems="center"
                                        justifyContent="space-between"
                                        spacing={1}
                                    >
                                        <Typography sx={{ fontSize: '0.72rem' }}>
                                            {prettify(event.eventName)}
                                        </Typography>
                                        {event.enabled ? (
                                            <Check sx={{ fontSize: 15, color: '#22c55e' }} />
                                        ) : (
                                            <Close sx={{ fontSize: 15, color: '#ef4444' }} />
                                        )}
                                    </Stack>
                                ))}
                            </Stack>
                        </Box>
                    ))}
                </Stack>
            </Box>
        );
    };

    const renderEventChips = (config: LinkedConfig) => {
        const all = config.notifications.flatMap((item) =>
            item.events.map((e) => ({ ...e, category: item.category })),
        );
        const enabled = all.filter((e) => e.enabled);

        if (!all.length) {
            return (
                <Typography variant="caption" color="text.secondary">
                    No events configured
                </Typography>
            );
        }

        const shown = enabled.slice(0, 3);
        const rest = enabled.length - shown.length;

        return (
            <Tooltip
                title={renderEventBreakdown(config)}
                arrow
                placement="bottom-start"
                // The tooltip scrolls, so it must stay open while the pointer is
                // inside it and must not be clipped by the table's overflow.
                enterTouchDelay={0}
                leaveDelay={200}
                slotProps={{
                    tooltip: {
                        sx: {
                            maxWidth: 380,
                            bgcolor: 'background.paper',
                            color: 'text.primary',
                            border: '1px solid',
                            borderColor: 'divider',
                            boxShadow: 6,
                            p: 1.25,
                            pointerEvents: 'auto',
                        },
                    },
                    arrow: { sx: { color: 'background.paper' } },
                }}
            >
                <Stack
                    direction="row"
                    spacing={0.5}
                    flexWrap="wrap"
                    useFlexGap
                    sx={{ cursor: 'pointer', width: 'fit-content' }}
                >
                    {enabled.length === 0 ? (
                        <Chip
                            label="All off"
                            size="small"
                            sx={{ height: 22, fontSize: '0.68rem', fontWeight: 600 }}
                        />
                    ) : (
                        shown.map((e) => (
                            <Chip
                                key={e.eventId}
                                label={prettify(e.eventName)}
                                size="small"
                                sx={{
                                    height: 22,
                                    fontSize: '0.68rem',
                                    bgcolor: alpha(theme.palette.primary.main, 0.1),
                                    color: 'primary.main',
                                    fontWeight: 600,
                                }}
                            />
                        ))
                    )}
                    {rest > 0 && (
                        <Chip
                            label={`+${rest} more`}
                            size="small"
                            sx={{ height: 22, fontSize: '0.68rem', fontWeight: 600 }}
                        />
                    )}
                </Stack>
            </Tooltip>
        );
    };

    const targetChip = (config: LinkedConfig) => (
        <Chip
            icon={config.user ? <Person sx={{ fontSize: 14 }} /> : <Groups sx={{ fontSize: 14 }} />}
            label={config.user ? 'User' : 'Role'}
            size="small"
            sx={{
                height: 22,
                fontSize: '0.68rem',
                fontWeight: 700,
                bgcolor: alpha(config.user ? '#0ea5e9' : '#8b5cf6', 0.12),
                color: config.user ? '#0369a1' : '#6d28d9',
            }}
        />
    );

    /**
     * For a role row this is the role itself; for a user row it is the roles
     * they hold, which are what bound the events they can be given.
     */
    const renderRoleCell = (config: LinkedConfig) => {
        const roles = config.role ? [config.role] : config.userRoles || [];

        if (!roles.length) {
            return (
                <Typography variant="caption" color="text.secondary">
                    —
                </Typography>
            );
        }

        return (
            <Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap>
                {roles.map((role) => (
                    <Chip
                        key={role}
                        label={prettify(role)}
                        size="small"
                        variant="outlined"
                        sx={{ height: 22, fontSize: '0.68rem', fontWeight: 600, textTransform: 'capitalize' }}
                    />
                ))}
            </Stack>
        );
    };

    const configsTab = (
        <>
            <Stack
                direction={{ xs: 'column', sm: 'row' }}
                spacing={1.5}
                alignItems={{ xs: 'stretch', sm: 'center' }}
                sx={{ mb: 2 }}
            >
                <TextField
                    size="small"
                    placeholder="Search by name or ID"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    sx={{ flex: 1, maxWidth: { sm: 360 } }}
                    InputProps={{
                        startAdornment: (
                            <InputAdornment position="start">
                                <Search fontSize="small" />
                            </InputAdornment>
                        ),
                    }}
                />
                <ToggleButtonGroup
                    size="small"
                    exclusive
                    value={typeFilter}
                    onChange={(_, value) => {
                        if (!value) return; // ignore deselecting the active button
                        setTypeFilter(value);
                        setPage(0);
                    }}
                    sx={{ '& .MuiToggleButton-root': { px: 1.5, textTransform: 'none', fontWeight: 700 } }}
                >
                    <ToggleButton value="role">
                        <Groups sx={{ fontSize: 16, mr: 0.5 }} />
                        Roles
                    </ToggleButton>
                    <ToggleButton value="user">
                        <Person sx={{ fontSize: 16, mr: 0.5 }} />
                        Users
                    </ToggleButton>
                </ToggleButtonGroup>

                <Stack direction="row" spacing={1} alignItems="center">
                    <Typography variant="body2" color="text.secondary">
                        Show deleted
                    </Typography>
                    <Switch
                        size="small"
                        checked={showDeleted}
                        onChange={(e) => {
                            setShowDeleted(e.target.checked);
                            setPage(0);
                        }}
                    />
                </Stack>
                <Button
                    variant="contained"
                    startIcon={<Add />}
                    onClick={() => {
                        setEditing(null);
                        setDialogOpen(true);
                    }}
                >
                    Add Configuration
                </Button>
            </Stack>

            {loading ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
                    <CircularProgress />
                </Box>
            ) : configs.length === 0 ? (
                <Box sx={{ textAlign: 'center', py: 8 }}>
                    <NotificationsActive sx={{ fontSize: 44, color: 'text.disabled', mb: 1 }} />
                    <Typography variant="body2" color="text.secondary">
                        {showDeleted
                            ? 'No deleted configurations.'
                            : typeFilter === 'role'
                                ? 'No role configurations yet.'
                                : 'No user configurations yet.'}
                    </Typography>
                </Box>
            ) : isMobile ? (
                <Stack spacing={1.5}>
                    {configs.map((config) => (
                        <Paper key={config._id} variant="outlined" sx={{ borderRadius: 3, p: 2 }}>
                            <Stack
                                direction="row"
                                justifyContent="space-between"
                                alignItems="flex-start"
                                sx={{ mb: 1 }}
                            >
                                <Box>
                                    <Typography fontWeight={600} variant="body2">
                                        {config.name || '—'}
                                    </Typography>
                                    <Typography variant="caption" color="text.secondary">
                                        {config.referenceId}
                                    </Typography>
                                    <Box sx={{ mt: 0.5 }}>{renderRoleCell(config)}</Box>
                                </Box>
                                {targetChip(config)}
                            </Stack>
                            <Box sx={{ mb: 1.5 }}>{renderEventChips(config)}</Box>
                            <Stack direction="row" spacing={1} justifyContent="flex-end">
                                {config.isDeleted ? (
                                    <Button
                                        size="small"
                                        startIcon={<RestoreFromTrash />}
                                        onClick={() => handleRestore(config)}
                                    >
                                        Restore
                                    </Button>
                                ) : (
                                    <>
                                        <Button
                                            size="small"
                                            startIcon={<Edit />}
                                            onClick={() => {
                                                setEditing(config);
                                                setDialogOpen(true);
                                            }}
                                        >
                                            Edit
                                        </Button>
                                        <Button
                                            size="small"
                                            color="error"
                                            startIcon={<DeleteOutline />}
                                            onClick={() => handleDelete(config)}
                                        >
                                            Delete
                                        </Button>
                                    </>
                                )}
                            </Stack>
                        </Paper>
                    ))}
                </Stack>
            ) : (
                <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 3 }}>
                    <Table size="small">
                        <TableHead sx={{ bgcolor: alpha('#94a3b8', 0.05) }}>
                            <TableRow>
                                <TableCell sx={{ fontWeight: 700 }}>Reference</TableCell>
                                <TableCell sx={{ fontWeight: 700 }}>Name</TableCell>
                                <TableCell sx={{ fontWeight: 700 }}>Type</TableCell>
                                <TableCell sx={{ fontWeight: 700 }}>Role</TableCell>
                                <TableCell sx={{ fontWeight: 700 }}>Enabled Events</TableCell>
                                <TableCell align="center" sx={{ fontWeight: 700 }}>
                                    Count
                                </TableCell>
                                <TableCell align="right" sx={{ fontWeight: 700 }}>
                                    Actions
                                </TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {configs.map((config) => (
                                <TableRow
                                    key={config._id}
                                    hover
                                    sx={config.isDeleted ? { bgcolor: alpha('#ef4444', 0.04) } : undefined}
                                >
                                    <TableCell sx={{ fontWeight: 500 }}>{config.referenceId}</TableCell>
                                    <TableCell sx={{ fontWeight: 500 }}>{config.name || '—'}</TableCell>
                                    <TableCell>{targetChip(config)}</TableCell>
                                    <TableCell>{renderRoleCell(config)}</TableCell>
                                    <TableCell sx={{ maxWidth: 420 }}>{renderEventChips(config)}</TableCell>
                                    <TableCell align="center">
                                        <Typography variant="body2" fontWeight={600}>
                                            {enabledCount(config)}
                                        </Typography>
                                    </TableCell>
                                    <TableCell align="right">
                                        {config.isDeleted ? (
                                            <Tooltip title="Restore">
                                                <IconButton size="small" onClick={() => handleRestore(config)}>
                                                    <RestoreFromTrash fontSize="small" />
                                                </IconButton>
                                            </Tooltip>
                                        ) : (
                                            <>
                                                <Tooltip title="Edit">
                                                    <IconButton
                                                        size="small"
                                                        onClick={() => {
                                                            setEditing(config);
                                                            setDialogOpen(true);
                                                        }}
                                                    >
                                                        <Edit fontSize="small" />
                                                    </IconButton>
                                                </Tooltip>
                                                <Tooltip title="Delete">
                                                    <IconButton
                                                        size="small"
                                                        color="error"
                                                        onClick={() => handleDelete(config)}
                                                    >
                                                        <DeleteOutline fontSize="small" />
                                                    </IconButton>
                                                </Tooltip>
                                            </>
                                        )}
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                    <TablePagination
                        component="div"
                        count={total}
                        page={page}
                        onPageChange={(_, next) => setPage(next)}
                        rowsPerPage={rowsPerPage}
                        onRowsPerPageChange={(e) => {
                            setRowsPerPage(parseInt(e.target.value, 10));
                            setPage(0);
                        }}
                        rowsPerPageOptions={[10, 25, 50]}
                    />
                </TableContainer>
            )}
        </>
    );

    const categoriesTab = categoriesLoading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
            <CircularProgress />
        </Box>
    ) : (
        <Stack spacing={2}>
            <Stack
                direction={{ xs: 'column', sm: 'row' }}
                alignItems={{ xs: 'stretch', sm: 'center' }}
                justifyContent="space-between"
                spacing={1.5}
            >
                <Typography variant="body2" color="text.secondary">
                    Turn an event off here to stop it reaching everyone, regardless of the per-user
                    and per-role configurations.
                </Typography>
                <Button
                    variant="contained"
                    size="small"
                    startIcon={<Add />}
                    onClick={openCreateCategory}
                    sx={{ borderRadius: 2, fontWeight: 700, whiteSpace: 'nowrap' }}
                >
                    Add Category
                </Button>
            </Stack>
            {categories.map((category) => (
                <Paper key={category._id} variant="outlined" sx={{ borderRadius: 3, p: 2 }}>
                    <Stack
                        direction="row"
                        alignItems="center"
                        justifyContent="space-between"
                        sx={{ mb: 1.5 }}
                    >
                        <Stack direction="row" alignItems="center" spacing={1}>
                            <Typography fontWeight={700}>{category.category}</Typography>
                            {category.isCustom && (
                                <Chip label="Custom" size="small" color="primary" variant="outlined" />
                            )}
                        </Stack>
                        <Stack direction="row" alignItems="center" spacing={0.5}>
                            {savingCategoryId === category._id && <CircularProgress size={16} />}
                            {/* Built-in categories are recreated from code constants,
                                so only custom ones can be edited or removed. */}
                            {category.isCustom && (
                                <>
                                    <Tooltip title="Edit category">
                                        <IconButton size="small" onClick={() => openEditCategory(category)}>
                                            <Edit fontSize="small" />
                                        </IconButton>
                                    </Tooltip>
                                    <Tooltip title="Delete category">
                                        <IconButton
                                            size="small"
                                            color="error"
                                            onClick={() => handleDeleteCategory(category)}
                                        >
                                            <DeleteOutline fontSize="small" />
                                        </IconButton>
                                    </Tooltip>
                                </>
                            )}
                        </Stack>
                    </Stack>
                    <Stack spacing={0.5}>
                        {(category.events || []).map((event: any) => (
                            <Stack
                                key={event._id || event.eventName}
                                direction="row"
                                alignItems="center"
                                justifyContent="space-between"
                                sx={{
                                    px: 1,
                                    py: 0.5,
                                    borderRadius: 1.5,
                                    '&:hover': { bgcolor: alpha('#94a3b8', 0.06) },
                                }}
                            >
                                <Typography variant="body2">{prettify(event.eventName)}</Typography>
                                <Switch
                                    size="small"
                                    checked={event.enabled !== false}
                                    onChange={(e) =>
                                        handleCategoryEventToggle(
                                            category,
                                            event.eventName,
                                            e.target.checked,
                                        )
                                    }
                                />
                            </Stack>
                        ))}
                    </Stack>
                </Paper>
            ))}
        </Stack>
    );

    return (
        <Box sx={{ p: { xs: 2, md: 3 } }}>
            <Box sx={{ mb: 3 }}>
                <Typography variant="h5" fontWeight={700}>
                    Manage Notifications
                </Typography>
                <Typography variant="body2" color="text.secondary">
                    Choose which in-app notifications each member of staff or role receives.
                </Typography>
            </Box>

            <Card sx={{ borderRadius: 3 }}>
                <Tabs
                    value={tab}
                    onChange={(_, next) => setTab(next)}
                    sx={{ px: 2, borderBottom: 1, borderColor: 'divider' }}
                >
                    <Tab label="Configurations" />
                    <Tab label="Categories" />
                </Tabs>
                <CardContent>{tab === 0 ? configsTab : categoriesTab}</CardContent>
            </Card>

            <NotificationConfigDialog
                open={dialogOpen}
                editing={editing}
                onClose={() => {
                    setDialogOpen(false);
                    setEditing(null);
                }}
                onSaved={() => {
                    setDialogOpen(false);
                    setEditing(null);
                    fetchConfigs();
                }}
            />

            <Dialog
                open={categoryDialogOpen}
                onClose={() => setCategoryDialogOpen(false)}
                maxWidth="sm"
                fullWidth
                fullScreen={isMobile}
            >
                <DialogTitle sx={{ fontWeight: 800 }}>
                    {editingCategory ? 'Edit Category' : 'Add Category'}
                </DialogTitle>
                <DialogContent dividers>
                    <Stack spacing={2.5} sx={{ pt: 1 }}>
                        <TextField
                            select
                            label="Category Name"
                            value={categoryName}
                            onChange={(e) => handleCategorySelect(e.target.value)}
                            fullWidth
                            size="small"
                            required
                            disabled={Boolean(editingCategory)}
                            helperText={
                                editingCategory
                                    ? 'The category name cannot be changed'
                                    : availableCategories.length
                                        ? 'Selecting a category fills in its events'
                                        : 'Every category is already configured'
                            }
                        >
                            {(editingCategory ? enumCategories : availableCategories).map((name) => (
                                <MenuItem key={name} value={name}>
                                    {prettify(name)}
                                </MenuItem>
                            ))}
                        </TextField>

                        <Autocomplete
                            multiple
                            options={selectableEvents}
                            value={categoryEvents.map((e) => e.eventName)}
                            getOptionLabel={(option) => prettify(option)}
                            onChange={(_, selected) =>
                                setCategoryEvents(
                                    selected.map((eventName) => {
                                        const existing = categoryEvents.find(
                                            (e) => e.eventName === eventName,
                                        );
                                        return existing || { eventName, enabled: true };
                                    }),
                                )
                            }
                            renderInput={(params) => (
                                <TextField
                                    {...params}
                                    label="Events"
                                    size="small"
                                    placeholder="Select events"
                                    helperText="Only events not already used by another category are listed"
                                />
                            )}
                        />

                        {categoryEvents.length > 0 && (
                            <Stack spacing={0.5}>
                                {categoryEvents.map((event) => (
                                    <Stack
                                        key={event.eventName}
                                        direction="row"
                                        alignItems="center"
                                        justifyContent="space-between"
                                        sx={{
                                            px: 1.5,
                                            py: 0.75,
                                            borderRadius: 1.5,
                                            border: '1px solid',
                                            borderColor: 'divider',
                                        }}
                                    >
                                        <Typography variant="body2">{prettify(event.eventName)}</Typography>
                                        <Stack direction="row" alignItems="center" spacing={0.5}>
                                            <Switch
                                                size="small"
                                                checked={event.enabled}
                                                onChange={(e) =>
                                                    setCategoryEvents((prev) =>
                                                        prev.map((item) =>
                                                            item.eventName === event.eventName
                                                                ? { ...item, enabled: e.target.checked }
                                                                : item,
                                                        ),
                                                    )
                                                }
                                            />
                                            <IconButton
                                                size="small"
                                                color="error"
                                                onClick={() =>
                                                    setCategoryEvents((prev) =>
                                                        prev.filter((item) => item.eventName !== event.eventName),
                                                    )
                                                }
                                            >
                                                <DeleteOutline fontSize="small" />
                                            </IconButton>
                                        </Stack>
                                    </Stack>
                                ))}
                            </Stack>
                        )}
                    </Stack>
                </DialogContent>
                <DialogActions sx={{ px: 3, py: 2 }}>
                    <Button onClick={() => setCategoryDialogOpen(false)} disabled={savingCategory}>
                        Cancel
                    </Button>
                    <Button
                        variant="contained"
                        onClick={handleSaveCategory}
                        disabled={savingCategory}
                        startIcon={savingCategory ? <CircularProgress size={16} color="inherit" /> : undefined}
                        sx={{ borderRadius: 2, fontWeight: 700 }}
                    >
                        {editingCategory ? 'Update Category' : 'Create Category'}
                    </Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
};

export default ManageNotificationsPage;

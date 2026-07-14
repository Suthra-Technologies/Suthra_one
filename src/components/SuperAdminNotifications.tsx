import React from 'react';
import {
    Badge,
    Box,
    Button,
    CircularProgress,
    Divider,
    IconButton,
    List,
    ListItemButton,
    ListItemIcon,
    ListItemText,
    Popover,
    Tooltip,
    Typography,
    alpha,
} from '@mui/material';
import {
    Notifications as NotificationsIcon,
    NotificationsNone as NotificationsNoneIcon,
    Store as StoreIcon,
    CardMembership as PlanIcon,
    SupportAgent as TicketIcon,
    ContactPage as DemoIcon,
    History as HistoryIcon,
    DoneAll as DoneAllIcon,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { superAPI } from '../services/api';

const LAST_SEEN_KEY = 'superadmin_notif_last_seen';
const POLL_INTERVAL = 60_000; // 60s

// Map an admin-log module to an icon, accent color and the page to open on click.
const moduleMeta = (mod: string): { icon: React.ReactElement; color: string; path: string } => {
    switch (mod) {
        case 'STORE': return { icon: <StoreIcon fontSize="small" />, color: '#3b82f6', path: '/superadmin/logs/stores' };
        case 'PLAN': return { icon: <PlanIcon fontSize="small" />, color: '#8b5cf6', path: '/superadmin/logs/plans' };
        case 'TICKET': return { icon: <TicketIcon fontSize="small" />, color: '#f59e0b', path: '/superadmin/tickets' };
        case 'DEMO_REQUEST': return { icon: <DemoIcon fontSize="small" />, color: '#06b6d4', path: '/superadmin/demo-requests' };
        default: return { icon: <HistoryIcon fontSize="small" />, color: '#6366f1', path: '/superadmin/admin-logs' };
    }
};

// Human-friendly action wording for the notification title.
const actionLabel = (action: string): string => {
    switch (action) {
        case 'CREATED': return 'created';
        case 'DELETED': return 'deleted';
        case 'UPDATED': return 'updated';
        case 'STATUS_CHANGED': return 'status changed';
        case 'REPLIED': return 'replied';
        default: return (action || '')?.toLowerCase().replace(/_/g, ' ');
    }
};

const moduleLabel = (mod: string): string => {
    switch (mod) {
        case 'STORE': return 'Store';
        case 'PLAN': return 'Plan';
        case 'TICKET': return 'Ticket';
        case 'DEMO_REQUEST': return 'Demo Request';
        default: return mod || 'Activity';
    }
};

const timeAgo = (dateStr: string): string => {
    if (!dateStr) return '';
    const diff = Date.now() - new Date(dateStr).getTime();
    if (diff < 0) return 'just now';
    const sec = Math.floor(diff / 1000);
    if (sec < 60) return 'just now';
    const min = Math.floor(sec / 60);
    if (min < 60) return `${min}m ago`;
    const hr = Math.floor(min / 60);
    if (hr < 24) return `${hr}h ago`;
    const days = Math.floor(hr / 24);
    if (days < 7) return `${days}d ago`;
    return new Date(dateStr).toLocaleDateString();
};

const SuperAdminNotifications: React.FC = () => {
    const navigate = useNavigate();
    const [anchorEl, setAnchorEl] = React.useState<null | HTMLElement>(null);
    const [logs, setLogs] = React.useState<any[]>([]);
    const [loading, setLoading] = React.useState(false);
    const [lastSeen, setLastSeen] = React.useState<number>(() => {
        const stored = localStorage.getItem(LAST_SEEN_KEY);
        return stored ? Number(stored) : 0;
    });

    const fetchLogs = React.useCallback(async () => {
        try {
            setLoading(true);
            const res = await superAPI.getAdminLogs({ page: 1, limit: 15 });
            setLogs(res.data?.logs || []);
        } catch {
            // Silent — the bell should never break the header.
        } finally {
            setLoading(false);
        }
    }, []);

    // Initial load + polling.
    React.useEffect(() => {
        fetchLogs();
        const id = setInterval(fetchLogs, POLL_INTERVAL);
        return () => clearInterval(id);
    }, [fetchLogs]);

    const unreadCount = React.useMemo(
        () => logs.filter(l => l.createdAt && new Date(l.createdAt).getTime() > lastSeen).length,
        [logs, lastSeen],
    );

    const handleOpen = (event: React.MouseEvent<HTMLElement>) => {
        setAnchorEl(event.currentTarget);
        fetchLogs();
    };

    const markAllRead = () => {
        const now = Date.now();
        localStorage.setItem(LAST_SEEN_KEY, String(now));
        setLastSeen(now);
    };

    const handleClose = () => {
        // Opening counts as "seen" — clear the badge when the panel closes.
        markAllRead();
        setAnchorEl(null);
    };

    const handleItemClick = (log: any) => {
        const { path } = moduleMeta(log.module);
        markAllRead();
        setAnchorEl(null);
        navigate(path);
    };

    const open = Boolean(anchorEl);

    return (
        <>
            <Tooltip title="Notifications">
                <IconButton onClick={handleOpen} color="inherit" sx={{ mr: 0.5 }}>
                    <Badge badgeContent={unreadCount} color="error" max={99} overlap="circular">
                        {unreadCount > 0 ? <NotificationsIcon /> : <NotificationsNoneIcon />}
                    </Badge>
                </IconButton>
            </Tooltip>

            <Popover
                open={open}
                anchorEl={anchorEl}
                onClose={handleClose}
                anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
                transformOrigin={{ vertical: 'top', horizontal: 'right' }}
                slotProps={{ paper: { sx: { width: 380, maxWidth: '92vw', borderRadius: 2, mt: 1, overflow: 'hidden' } } }}
            >
                <Box sx={{ px: 2, py: 1.5, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <Typography variant="subtitle1" fontWeight={700}>Notifications</Typography>
                    <Button
                        size="small"
                        startIcon={<DoneAllIcon fontSize="small" />}
                        onClick={markAllRead}
                        disabled={unreadCount === 0}
                        sx={{ textTransform: 'none' }}
                    >
                        Mark all read
                    </Button>
                </Box>
                <Divider />

                {loading && logs.length === 0 ? (
                    <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
                        <CircularProgress size={24} />
                    </Box>
                ) : logs.length === 0 ? (
                    <Box sx={{ py: 5, textAlign: 'center' }}>
                        <NotificationsNoneIcon sx={{ fontSize: 40, color: 'text.disabled', mb: 1 }} />
                        <Typography variant="body2" color="text.secondary">No recent activity</Typography>
                    </Box>
                ) : (
                    <List sx={{ py: 0, maxHeight: 420, overflowY: 'auto' }}>
                        {logs.map((log) => {
                            const meta = moduleMeta(log.module);
                            const isUnread = log.createdAt && new Date(log.createdAt).getTime() > lastSeen;
                            const who = log.performedByName || log.performedByEmail || log.performedBy?.email || 'System';
                            const title = `${moduleLabel(log.module)} ${actionLabel(log.action)}${log.targetName ? `: ${log.targetName}` : ''}`;
                            const detail = typeof log.details === 'string' ? log.details : '';
                            return (
                                <ListItemButton
                                    key={log._id}
                                    onClick={() => handleItemClick(log)}
                                    sx={{
                                        alignItems: 'flex-start',
                                        gap: 0.5,
                                        bgcolor: isUnread ? alpha(meta.color, 0.06) : 'transparent',
                                        '&:hover': { bgcolor: alpha(meta.color, 0.1) },
                                    }}
                                >
                                    <ListItemIcon sx={{ minWidth: 40, mt: 0.5 }}>
                                        <Box sx={{
                                            width: 32, height: 32, borderRadius: '50%',
                                            bgcolor: alpha(meta.color, 0.12), color: meta.color,
                                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        }}>
                                            {meta.icon}
                                        </Box>
                                    </ListItemIcon>
                                    <ListItemText
                                        primary={
                                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                                <Typography variant="body2" fontWeight={isUnread ? 700 : 500} sx={{ flexGrow: 1 }}>
                                                    {title}
                                                </Typography>
                                                {isUnread && <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: meta.color, flexShrink: 0 }} />}
                                            </Box>
                                        }
                                        secondary={
                                            <>
                                                {detail && (
                                                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                                        {detail}
                                                    </Typography>
                                                )}
                                                <Typography variant="caption" color="text.disabled">
                                                    {who} · {timeAgo(log.createdAt)}
                                                </Typography>
                                            </>
                                        }
                                    />
                                </ListItemButton>
                            );
                        })}
                    </List>
                )}

                <Divider />
                <Box sx={{ p: 1 }}>
                    <Button
                        fullWidth
                        size="small"
                        onClick={() => { markAllRead(); setAnchorEl(null); navigate('/superadmin/admin-logs'); }}
                        sx={{ textTransform: 'none', fontWeight: 600 }}
                    >
                        View all activity
                    </Button>
                </Box>
            </Popover>
        </>
    );
};

export default SuperAdminNotifications;

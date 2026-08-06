import React from 'react';
import {
    Timeline,
    TimelineItem,
    TimelineSeparator,
    TimelineConnector,
    TimelineContent,
    TimelineDot,
    TimelineOppositeContent,
} from '@mui/lab';
import { Typography, Paper, Box, Chip } from '@mui/material';
import { useSettings, getDateLocale } from '../../context/SettingsContext';
import {
    PersonAdd as PersonAddIcon,
    Edit as EditIcon,
    Delete as DeleteIcon,
    Lock as LockIcon,
    CheckCircle as CheckCircleIcon,
    Cancel as CancelIcon,
} from '@mui/icons-material';

interface ActionHistoryItem {
    action: string;
    performedBy: string;
    performedByName?: string;
    role: string;
    timestamp: Date | string;
    details: string;
}

interface ActionHistoryListProps {
    history: ActionHistoryItem[];
    emptyMessage?: string;
}

const ActionHistoryList: React.FC<ActionHistoryListProps> = ({ history, emptyMessage }) => {
    const { settings } = useSettings();
    const dateLocale = getDateLocale(settings?.restaurant?.country || '');

    if (!history || history.length === 0) {
        return (
            <Box sx={{ p: 3, textAlign: 'center' }}>
                <Typography variant="body2" color="text.secondary">
                    {emptyMessage || 'No action history available'}
                </Typography>
            </Box>
        );
    }

    // Modules disagree on tense — users log CREATED/UPDATED, menu and inventory
    // log CREATE/UPDATE — so the trailing 'D' is dropped before matching and
    // both spellings get the same icon and colour.
    const normalizeAction = (action: string) =>
        (action || '').toUpperCase().replace(/D$/, '');

    const getActionIcon = (action: string) => {
        switch (normalizeAction(action)) {
            case 'CREATE':
                return <PersonAddIcon />;
            case 'UPDATE':
                return <EditIcon />;
            case 'DELETE':
                return <DeleteIcon />;
            case 'PASSWORD_RESET':
                return <LockIcon />;
            case 'ACTIVATE':
                return <CheckCircleIcon />;
            case 'DEACTIVATE':
                return <CancelIcon />;
            default:
                return <EditIcon />;
        }
    };

    const getActionColor = (action: string): "primary" | "secondary" | "success" | "error" | "warning" | "info" => {
        switch (normalizeAction(action)) {
            case 'CREATE':
                return 'success';
            case 'UPDATE':
                return 'info';
            case 'DELETE':
                return 'error';
            case 'PASSWORD_RESET':
                return 'warning';
            case 'ACTIVATE':
                return 'success';
            case 'DEACTIVATE':
                return 'error';
            default:
                return 'primary';
        }
    };

    // Day/month order follows the tenant's country rather than being fixed to
    // en-US, so the timeline reads the same way as the dates inside the entries.
    const formatDate = (date: Date | string) => {
        const d = new Date(date);
        return d.toLocaleString(dateLocale, {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        });
    };

    // Entries are appended as they happen, so the stored order is oldest-first.
    // A timeline reads best newest-first — the most recent change is what
    // someone opening the History tab is looking for. Sorted on a copy so the
    // caller's array is left alone.
    const ordered = [...history].sort(
        (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
    );

    return (
        <Timeline position="right" sx={{ p: 0 }}>
            {ordered.map((item, index) => (
                <TimelineItem key={index}>
                    <TimelineOppositeContent sx={{ flex: 0.3 }}>
                        <Typography variant="caption" display="block">
                            {formatDate(item.timestamp)}
                        </Typography>
                        <Chip
                            label={item.role}
                            size="small"
                            sx={{ mt: 0.5 }}
                            variant="outlined"
                        />
                    </TimelineOppositeContent>
                    <TimelineSeparator>
                        <TimelineDot color={getActionColor(item.action)}>
                            {getActionIcon(item.action)}
                        </TimelineDot>
                        {index < ordered.length - 1 && <TimelineConnector />}
                    </TimelineSeparator>
                    <TimelineContent>
                        <Paper elevation={1} sx={{ p: 2, mb: 2 }}>
                            <Typography variant="subtitle2" component="h6" fontWeight="bold">
                                {item.action.replace(/_/g, ' ')}
                            </Typography>
                            <Typography variant="body2" color="text.secondary" gutterBottom>
                                By: {item.performedByName || item.performedBy}
                            </Typography>
                            {/* An update's details is a ';'-joined list of
                                "Field: old → new" changes. Split it back out so
                                each change is its own line, rather than one long
                                run of text that wraps mid-change. */}
                            {(() => {
                                const parts = String(item.details || '')
                                    .split(';')
                                    .map((part) => part.trim())
                                    .filter(Boolean);

                                if (parts.length <= 1) {
                                    return (
                                        <Typography variant="body2" sx={{ mt: 1 }}>
                                            {item.details}
                                        </Typography>
                                    );
                                }

                                return (
                                    <Box component="ul" sx={{ mt: 1, mb: 0, pl: 2.5 }}>
                                        {parts.map((part, i) => (
                                            <Typography
                                                key={i}
                                                component="li"
                                                variant="body2"
                                                sx={{ '&::marker': { color: 'text.disabled' } }}
                                            >
                                                {part}
                                            </Typography>
                                        ))}
                                    </Box>
                                );
                            })()}
                        </Paper>
                    </TimelineContent>
                </TimelineItem>
            ))}
        </Timeline>
    );
};

export default ActionHistoryList;

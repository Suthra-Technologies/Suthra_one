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
    if (!history || history.length === 0) {
        return (
            <Box sx={{ p: 3, textAlign: 'center' }}>
                <Typography variant="body2" color="text.secondary">
                    {emptyMessage || 'No action history available'}
                </Typography>
            </Box>
        );
    }

    const getActionIcon = (action: string) => {
        switch (action.toUpperCase()) {
            case 'CREATED':
                return <PersonAddIcon />;
            case 'UPDATED':
                return <EditIcon />;
            case 'DELETED':
                return <DeleteIcon />;
            case 'PASSWORD_RESET':
                return <LockIcon />;
            case 'ACTIVATED':
                return <CheckCircleIcon />;
            case 'DEACTIVATED':
                return <CancelIcon />;
            default:
                return <EditIcon />;
        }
    };

    const getActionColor = (action: string): "primary" | "secondary" | "success" | "error" | "warning" | "info" => {
        switch (action.toUpperCase()) {
            case 'CREATED':
                return 'success';
            case 'UPDATED':
                return 'info';
            case 'DELETED':
                return 'error';
            case 'PASSWORD_RESET':
                return 'warning';
            case 'ACTIVATED':
                return 'success';
            case 'DEACTIVATED':
                return 'error';
            default:
                return 'primary';
        }
    };

    const formatDate = (date: Date | string) => {
        const d = new Date(date);
        return d.toLocaleString('en-US', {
            month: '2-digit',
            day: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            hour12: true
        });
    };

    return (
        <Timeline position="right" sx={{ p: 0 }}>
            {history.map((item, index) => (
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
                        {index < history.length - 1 && <TimelineConnector />}
                    </TimelineSeparator>
                    <TimelineContent>
                        <Paper elevation={1} sx={{ p: 2, mb: 2 }}>
                            <Typography variant="subtitle2" component="h6" fontWeight="bold">
                                {item.action.replace(/_/g, ' ')}
                            </Typography>
                            <Typography variant="body2" color="text.secondary" gutterBottom>
                                By: {item.performedByName || item.performedBy}
                            </Typography>
                            <Typography variant="body2" sx={{ mt: 1 }}>
                                {item.details}
                            </Typography>
                        </Paper>
                    </TimelineContent>
                </TimelineItem>
            ))}
        </Timeline>
    );
};

export default ActionHistoryList;

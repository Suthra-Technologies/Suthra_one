import React from 'react';
import {
  Drawer,
  Box,
  Typography,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  IconButton,
  Chip,
  Divider,
  Button,
  Tooltip,
} from '@mui/material';
import {
  Close,
  ShoppingCart,
  Kitchen,
  Warning,
  Info,
  CheckCircle,
  Error,
  NotificationImportant,
} from '@mui/icons-material';
import { formatDistanceToNow } from 'date-fns';
import { useAuth } from '../context/AuthContext';
import { useNotifications } from '../context/NotificationProvider';

export interface Notification {
  id: number | string;
  timestamp: Date | string;
  read: boolean;
  type: string;
  title: string;
  message: string;
  priority: string;
  data?: any;
  targetRoles?: string[];
}

interface NotificationPanelProps {
  open: boolean;
  onClose: () => void;
  notifications?: Notification[];
}

const NotificationPanel: React.FC<NotificationPanelProps> = ({ open, onClose, notifications = [] }) => {
  const { user } = useAuth();
  const { markAsRead, markAllAsRead, clearNotifications } = useNotifications();

  const getNotificationIcon = (type: string) => {
    const iconMap: Record<string, React.ReactElement> = {
      order: <ShoppingCart color="primary" />,
      kitchen: <Kitchen color="warning" />,
      inventory: <Warning color="error" />,
      system: <Info color="info" />,
      success: <CheckCircle color="success" />,
      error: <Error color="error" />,
      warning: <Warning color="warning" />,
      info: <NotificationImportant color="info" />,
    };
    return iconMap[type] || iconMap.info;
  };

  const getNotificationColor = (type: string) => {
    const colorMap: Record<string, any> = {
      order: 'primary',
      kitchen: 'warning',
      inventory: 'error',
      system: 'info',
      success: 'success',
      error: 'error',
      warning: 'warning',
      info: 'info',
    };
    return colorMap[type] || 'default';
  };

  const getPriorityLabel = (priority: string) => {
    const labelMap: Record<string, string> = {
      high: 'High Priority',
      medium: 'Medium',
      low: 'Low',
    };
    return labelMap[priority] || '';
  };

  const getPriorityColor = (priority: string) => {
    const colorMap: Record<string, any> = {
      high: 'error',
      medium: 'warning',
      low: 'info',
    };
    return colorMap[priority] || 'default';
  };

  const handleMarkAllAsRead = () => {
    markAllAsRead();
  };

  const handleClearAll = () => {
    clearNotifications();
  };

  const handleNotificationClick = (notification: Notification) => {
    // We can navigate to details if notification has data
    if (notification.data?.orderId) {
      // Logic to navigate or open order details
    }
  };

  const handleMarkAsRead = (e: React.MouseEvent, id: string | number) => {
    e.stopPropagation();
    markAsRead(id);
  };

  const filterNotificationsByRole = (notifs: Notification[]) => {
    if (!user?.role) return notifs;

    if (user.role === 'admin' || user.role === 'manager' || user.role === 'cashier') {
      return notifs;
    }

    return notifs.filter(notification => {
      if (!notification.targetRoles || notification.targetRoles.length === 0) {
        return true;
      }

      if (notification.targetRoles.includes(user.role)) {
        return true;
      }

      if (user.role === 'delivery') {
        return notification.type === 'order' && notification.data?.orderType === 'delivery';
      }

      if (user.role === 'kitchen' || user.role === 'kitchen_staff') {
        return notification.type === 'kitchen' || notification.type === 'order';
      }

      if (user.role === 'waiter') {
        return notification.type === 'order' || notification.type === 'table';
      }

      if (user.role === 'customer') {
        return notification.targetRoles.includes('customer');
      }

      return false;
    });
  };

  const filteredNotifications = filterNotificationsByRole(notifications);

  const sortedNotifications = [...filteredNotifications].sort((a, b) => {
    const priorityOrder: Record<string, number> = { high: 3, medium: 2, low: 1 };
    const aPriority = priorityOrder[a.priority] || 1;
    const bPriority = priorityOrder[b.priority] || 1;
    if (aPriority !== bPriority) {
      return bPriority - aPriority;
    }
    return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
  });

  return (
    <Drawer
      anchor="right"
      open={open}
      onClose={onClose}
      PaperProps={{ sx: { width: 400, maxWidth: '90vw' } }}
    >
      <Box sx={{ p: 2, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Typography variant="h6" fontWeight="bold">
          Notifications
        </Typography>
        <IconButton onClick={onClose} size="small">
          <Close />
        </IconButton>
      </Box>
      <Divider />
      {sortedNotifications.length > 0 && (
        <Box sx={{ p: 2, display: 'flex', gap: 1 }}>
          <Button size="small" variant="outlined" onClick={handleMarkAllAsRead} sx={{ flex: 1 }}>
            Mark All Read
          </Button>
          <Button size="small" variant="outlined" color="error" onClick={handleClearAll} sx={{ flex: 1 }}>
            Clear All
          </Button>
        </Box>
      )}
      <Box sx={{ flexGrow: 1, overflow: 'auto' }}>
        {sortedNotifications.length === 0 ? (
          <Box sx={{ p: 4, textAlign: 'center', color: 'text.secondary' }}>
            <NotificationImportant sx={{ fontSize: 48, mb: 2, opacity: 0.5 }} />
            <Typography variant="body1">No notifications</Typography>
            <Typography variant="body2">You're all caught up!</Typography>
          </Box>
        ) : (
          <List sx={{ p: 0 }}>
            {sortedNotifications.map((notification, index) => (
              <React.Fragment key={notification.id || index}>
                <ListItem
                  alignItems="flex-start"
                  onClick={() => handleNotificationClick(notification)}
                  sx={{
                    '&:hover': { bgcolor: 'action.hover', cursor: 'pointer' },
                    bgcolor: notification.read ? 'transparent' : 'action.selected',
                    borderLeft: notification.priority === 'high' ? '4px solid' : 'none',
                    borderLeftColor: 'error.main',
                  }}
                >
                  <Box sx={{ mr: 2, mt: 0.5 }}>{getNotificationIcon(notification.type)}</Box>
                  <ListItemText
                    primary={
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                        <Typography variant="subtitle2" fontWeight="medium" component="span">
                          {notification.title}
                        </Typography>
                        {notification.priority && notification.priority !== 'low' && (
                          <Chip
                            label={getPriorityLabel(notification.priority)}
                            size="small"
                            color={getPriorityColor(notification.priority)}
                            sx={{ height: 18, fontSize: '0.625rem' }}
                          />
                        )}
                      </Box>
                    }
                    secondary={
                      <Box component="span" sx={{ display: 'block' }}>
                        <Typography variant="body2" color="text.secondary" component="span" sx={{ display: 'block', mb: 0.5 }}>
                          {notification.message}
                        </Typography>
                        <Box component="span" sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                          <Typography variant="caption" color="text.secondary" component="span">
                            {formatDistanceToNow(new Date(notification.timestamp), { addSuffix: true })}
                          </Typography>
                          {notification.type && (
                            <Chip
                              label={notification.type.toUpperCase()}
                              size="small"
                              variant="outlined"
                              color={getNotificationColor(notification.type)}
                              sx={{ height: 16, fontSize: '0.625rem' }}
                            />
                          )}
                        </Box>
                        {notification.data && notification.data.orderId && (
                          <Typography variant="caption" color="primary.main" component="span" sx={{ display: 'block', mt: 0.5 }}>
                            Order #{notification.data.orderId}
                          </Typography>
                        )}
                        {notification.data && notification.data.tableNumber && (
                          <Typography variant="caption" color="secondary.main" component="span" sx={{ display: 'block' }}>
                            Table {notification.data.tableNumber}
                          </Typography>
                        )}
                      </Box>
                    }
                  />
                  <ListItemSecondaryAction>
                    {!notification.read && (
                      <Tooltip title="Mark as Read">
                        <IconButton
                          edge="end"
                          size="small"
                          onClick={(e) => handleMarkAsRead(e, notification.id)}
                          sx={{ color: 'primary.main' }}
                        >
                          <CheckCircle sx={{ fontSize: 20 }} />
                        </IconButton>
                      </Tooltip>
                    )}
                  </ListItemSecondaryAction>
                </ListItem>
                {index < sortedNotifications.length - 1 && <Divider />}
              </React.Fragment>
            ))}
          </List>
        )}
      </Box>
    </Drawer>
  );
};

export default NotificationPanel;

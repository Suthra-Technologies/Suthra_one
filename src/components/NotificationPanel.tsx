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

  const getOrderNotificationDetails = (notification: Notification) => {
    const sourceOrder = notification.data?.order || notification.data || {};

    const rawOrderId =
      sourceOrder.orderNumber ??
      sourceOrder.orderId ??
      sourceOrder.order_id ??
      notification.data?.orderNumber ??
      notification.data?.orderId ??
      notification.data?.order_id;

    const orderIdString = String(rawOrderId ?? '');
    const displayOrderId = orderIdString
      ? (orderIdString.includes('-') ? orderIdString.split('-').pop() : orderIdString)
      : '--';

    const rawToken =
      sourceOrder.dailyTokenNumber ??
      sourceOrder.tokenNumber ??
      sourceOrder.tokenNo ??
      sourceOrder.token_no ??
      sourceOrder.token ??
      notification.data?.dailyTokenNumber ??
      notification.data?.tokenNumber ??
      notification.data?.tokenNo ??
      notification.data?.token_no ??
      notification.data?.token;

    const tokenDigits = rawToken === null || rawToken === undefined ? '' : String(rawToken).replace(/\D/g, '');
    const displayTokenNo = tokenDigits ? tokenDigits.padStart(2, '0') : '--';

    const rawOrderType =
      sourceOrder.orderType ??
      sourceOrder.type ??
      sourceOrder.order_type ??
      notification.data?.orderType ??
      notification.data?.type ??
      notification.data?.order_type;

    const displayOrderType = rawOrderType
      ? String(rawOrderType)
          .replace(/_/g, ' ')
          .replace(/\b\w/g, (char) => char.toUpperCase())
      : '--';

    const displayStatus =
      notification.data?.status ??
      sourceOrder.status ??
      'Update';

    return { displayOrderId, displayTokenNo, displayOrderType, displayStatus };
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
        <Box sx={{
          px: 2,
          pt: 1.5,
          pb: 1.5,
          mt: 1,
          display: 'flex',
          gap: 1,
          borderBottom: '1px solid rgba(0,0,0,0.12)',
        }}>
          <Button
            size="small"
            variant="outlined"
            onClick={handleMarkAllAsRead}
            sx={{ flex: 1, fontSize: { xs: '0.72rem', sm: '0.8rem' }, py: { xs: 0.75, sm: 1 }, textTransform: 'none', borderRadius: 2 }}
          >
            Mark All Read
          </Button>
          <Button
            size="small"
            variant="outlined"
            color="error"
            onClick={handleClearAll}
            sx={{ flex: 1, fontSize: { xs: '0.72rem', sm: '0.8rem' }, py: { xs: 0.75, sm: 1 }, textTransform: 'none', borderRadius: 2 }}
          >
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
                  <Box sx={{ mr: 2, mt: 0.5, flexShrink: 0 }}>{getNotificationIcon(notification.type)}</Box>
                  
                  {/* Conditional Rendering: Premium Single Card for Order Updates vs Standard Layout */}
                  {(notification.data?.orderId || notification.data?.orderNumber || notification.data?.status) ? (
                    <Box sx={{ flexGrow: 1 }}>
                      {(() => {
                        const { displayOrderId, displayTokenNo, displayOrderType, displayStatus } =
                          getOrderNotificationDetails(notification);

                        return (
                      <Box sx={{
                        p: 1.75,
                        borderRadius: '16px',
                        background: 'linear-gradient(135deg, #6366f1 0%, #a855f7 100%)',
                        color: 'white',
                        boxShadow: '0 4px 15px rgba(99, 102, 241, 0.25)',
                        position: 'relative',
                        overflow: 'hidden'
                      }}>
                        {/* Decorative background element */}
                        <Box sx={{
                          position: 'absolute',
                          top: -20,
                          right: -20,
                          width: 80,
                          height: 80,
                          borderRadius: '50%',
                          background: 'rgba(255,255,255,0.1)',
                        }} />
                        
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1.5 }}>
                          <Box>
                            <Typography sx={{ fontSize: '0.6rem', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.08em', opacity: 0.9, mb: 0.25 }}>
                              Order Update
                            </Typography>
                             <Typography sx={{ fontSize: '0.68rem', opacity: 0.95, fontWeight: 700 }}>
                            Token No: <Box component="span" sx={{ fontWeight: 900 }}>{displayTokenNo}</Box>
                          </Typography>
                          </Box>
                          {!notification.read && (
                            <IconButton
                              size="small"
                              onClick={(e) => handleMarkAsRead(e, notification.id)}
                              sx={{ color: 'white', p: 0.5, bgcolor: 'rgba(255,255,255,0.2)', '&:hover': { bgcolor: 'rgba(255,255,255,0.3)' } }}
                            >
                              <CheckCircle sx={{ fontSize: 16 }} />
                            </IconButton>
                          )}
                        </Box>

                        <Box sx={{ display: 'flex', gap: 1.25, flexWrap: 'wrap', mb: 1.25 }}>
             
                          <Typography sx={{ fontSize: '0.9rem', fontWeight: 900, letterSpacing: '0.02em' }}>
                              Order ID: {displayOrderId}
                            </Typography>
                          <Typography sx={{ fontSize: '0.68rem', opacity: 0.95, fontWeight: 700 }}>
                            Type: <Box component="span" sx={{ fontWeight: 900 }}>{displayOrderType}</Box>
                          </Typography>
                        </Box>

                        <Box sx={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between' }}>
                          <Box>
                             <Typography sx={{ fontSize: '0.65rem', opacity: 0.8, fontWeight: 500 }}>
                                {formatDistanceToNow(new Date(notification.timestamp), { addSuffix: true })}
                             </Typography>
                          </Box>
                          
                          {/* HIGHLIGHTED STATUS */}
                          <Box sx={{
                            bgcolor: 'white',
                            color: '#6366f1',
                            px: 1.5,
                            py: 0.6,
                            borderRadius: '8px',
                            fontWeight: 950,
                            fontSize: '0.7rem',
                            textTransform: 'uppercase',
                            letterSpacing: '0.05em',
                            boxShadow: '0 4px 10px rgba(0,0,0,0.1)'
                          }}>
                            {String(displayStatus).replace(/_/g, ' ')}
                          </Box>
                        </Box>
                      </Box>
                        );
                      })()}
                    </Box>
                  ) : (
                    <ListItemText
                      primary={
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, mb: 0.5, flexWrap: 'wrap' }}>
                          <Typography variant="subtitle2" fontWeight={900} component="span" sx={{ fontSize: '0.8rem', color: 'text.primary' }}>
                             {notification.title}
                          </Typography>
                          {notification.priority && notification.priority !== 'low' && (
                            <Chip
                              label={getPriorityLabel(notification.priority)}
                              size="small"
                              color={getPriorityColor(notification.priority)}
                              sx={{ height: 18, fontSize: '0.6rem', fontWeight: 900 }}
                            />
                          )}
                        </Box>
                      }
                      secondary={
                        <Box component="span" sx={{ display: 'block' }}>
                          <Typography variant="body2" color="text.secondary" component="span" sx={{ display: 'block', mb: 0.5 }}>
                            {notification.message}
                          </Typography>
                          <Box component="span" sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1 }}>
                            <Typography variant="caption" color="text.secondary" component="span">
                              {formatDistanceToNow(new Date(notification.timestamp), { addSuffix: true })}
                            </Typography>
                            <Box component="span" sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                              {notification.type && (
                                <Chip
                                  label={notification.type.toUpperCase()}
                                  size="small"
                                  variant="outlined"
                                  color={getNotificationColor(notification.type)}
                                  sx={{ height: 16, fontSize: '0.625rem' }}
                                />
                              )}
                              {!notification.read && (
                                <Tooltip title="Mark as Read">
                                  <IconButton
                                    size="small"
                                    onClick={(e) => handleMarkAsRead(e, notification.id)}
                                    sx={{ color: 'primary.main', p: 0.25 }}
                                  >
                                    <CheckCircle sx={{ fontSize: 18 }} />
                                  </IconButton>
                                </Tooltip>
                              )}
                            </Box>
                          </Box>
                        </Box>
                      }
                    />
                  )}
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
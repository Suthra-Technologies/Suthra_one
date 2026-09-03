import React, { useEffect, useState } from 'react';
import { Box, Typography, Grid, Card, CardContent, CardActionArea, Divider, Skeleton } from '@mui/material';
import {
  SupportAgent as SupportIcon,
  Store as StoreIcon,
  CardMembership as CardMembershipIcon,
  LocalShipping as DeliveryIcon,
  Assessment as LogIcon,
  ContactPage as DemoIcon,
  Receipt as ReceiptIcon,
  Settings as SettingsIcon,
  Group as TeamIcon,
  PlaylistAddCheck as TasksIcon,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { superAPI } from '../../services/api';

const SuperAdminPortal: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [taskCounts, setTaskCounts] = useState<{ demoRequests: number; openTickets: number; newRegistrations: number } | null>(null);

  useEffect(() => {
    let cancelled = false;

    const loadTaskCounts = async () => {
      try {
        const [demoRes, ticketsRes, tenantsRes] = await Promise.all([
          superAPI.listDemoRequests({ status: 'pending', limit: 1 }),
          superAPI.listSupportTickets({ status: 'open', limit: 1 }),
          superAPI.listTenants({ status: 'pending', limit: 1 }),
        ]);
        if (cancelled) return;
        setTaskCounts({
          demoRequests: demoRes.data?.total || 0,
          openTickets: ticketsRes.data?.total || 0,
          newRegistrations: tenantsRes.data?.total || 0,
        });
      } catch {
        if (!cancelled) setTaskCounts({ demoRequests: 0, openTickets: 0, newRegistrations: 0 });
      }
    };

    loadTaskCounts();
    return () => { cancelled = true; };
  }, []);

  const cards = [
    {
      title: 'Stores',
      icon: <StoreIcon fontSize="large" color="primary" />,
      path: '/superadmin/tenants',
      desc: 'View and manage restaurant subscriptions',
      permKey: 'stores',
    },
    {
      title: 'Subscription Plans',
      icon: <CardMembershipIcon fontSize="large" color="success" />,
      path: '/superadmin/plans',
      desc: 'Manage pricing and features',
      permKey: 'plans',
    },
    {
      title: 'Invoices',
      icon: <ReceiptIcon fontSize="large" color="warning" />,
      path: '/superadmin/invoices',
      desc: 'View and manage billing invoices',
      permKey: 'invoices',
    },
    {
      title: 'Delivery Reports',
      icon: <DeliveryIcon fontSize="large" sx={{ color: '#ef4444' }} />,
      path: '/superadmin/delivery-reports',
      desc: 'DoorDash & Uber Eats deliveries across all stores',
      permKey: 'delivery',
    },
    {
      title: 'Demo Requests',
      icon: <DemoIcon fontSize="large" color="info" />,
      path: '/superadmin/demo-requests',
      desc: 'Handle demo scheduling and confirmation',
      permKey: 'demo_requests',
    },
    {
      title: 'Support Tickets',
      icon: <SupportIcon fontSize="large" color="secondary" />,
      path: '/superadmin/tickets',
      desc: 'Respond to customer support requests',
      permKey: 'tickets',
    },
    {
      title: 'Team Management',
      icon: <TeamIcon fontSize="large" color="error" />,
      path: '/superadmin/team',
      desc: 'Manage administrative team permissions',
      permKey: 'team',
    },
    {
      title: 'Customer Activity',
      icon: <LogIcon fontSize="large" sx={{ color: '#0369a1' }} />,
      path: '/superadmin/activity',
      desc: 'Visitor & customer analytics across all tenants',
    },
    {
      title: 'Settings',
      icon: <SettingsIcon fontSize="large" sx={{ color: 'grey.600' }} />,
      path: '/superadmin/settings',
      desc: 'Manage platform-wide settings',
      permKey: 'settings',
    },
  ];

  const logCards = [
    { title: 'Stores Log', icon: <StoreIcon fontSize="medium" color="primary" />, path: '/superadmin/logs/stores', desc: 'All registered stores & status history', permKey: 'logs' },
    { title: 'Plans Log', icon: <CardMembershipIcon fontSize="medium" color="success" />, path: '/superadmin/logs/plans', desc: 'Subscription plans overview', permKey: 'logs' },
    { title: 'Demo Requests Log', icon: <DemoIcon fontSize="medium" color="error" />, path: '/superadmin/logs/demo-requests', desc: 'All demo requests & status history', permKey: 'logs' },
    { title: 'Support Tickets Log', icon: <SupportIcon fontSize="medium" color="secondary" />, path: '/superadmin/logs/tickets', desc: 'Full support ticket history', permKey: 'logs' },
  ];

  const todoTasks = [
    {
      title: 'Pending demo requests',
      desc: `${taskCounts?.demoRequests ?? 0} new request${taskCounts?.demoRequests === 1 ? '' : 's'} awaiting confirmation`,
      path: '/superadmin/demo-requests',
      count: taskCounts?.demoRequests ?? 0,
      icon: <DemoIcon fontSize="small" color="info" />,
    },
    {
      title: 'Open support tickets',
      desc: `${taskCounts?.openTickets ?? 0} ticket${taskCounts?.openTickets === 1 ? '' : 's'} need a response`,
      path: '/superadmin/tickets',
      count: taskCounts?.openTickets ?? 0,
      icon: <SupportIcon fontSize="small" color="secondary" />,
    },
    {
      title: 'New registrations',
      desc: `${taskCounts?.newRegistrations ?? 0} store${taskCounts?.newRegistrations === 1 ? '' : 's'} pending approval`,
      path: '/superadmin/tenants',
      count: taskCounts?.newRegistrations ?? 0,
      icon: <StoreIcon fontSize="small" color="primary" />,
    },
  ].filter(task => task.count > 0);

  // RBAC permissions logic
  const isRootAdmin = (user as any)?.isRootAdmin;
  const userPermissions: Array<{ module: string }> = (user as any)?.permissions || [];
  const userModules = userPermissions.map((p: any) => p.module);

  const filteredCards = isRootAdmin
    ? cards
    : cards.filter(card => !card.permKey || userModules.includes(card.permKey));

  const filteredLogCards = isRootAdmin
    ? logCards
    : logCards.filter(card => !card.permKey || userModules.includes(card.permKey));

  return (
    <Box sx={{ px: { xs: 1.5, sm: 3, md: 4 }, pb: { xs: 1.5, sm: 3, md: 4 }, pt: { xs: 0.5, sm: 3, md: 4 } }}>
      <Typography
        variant="h4"
        gutterBottom
        sx={{
          fontWeight: 'bold',
          mb: { xs: 2.5, sm: 4 },
          textAlign: { xs: 'center', sm: 'left' },
          fontSize: { xs: '1.5rem', sm: '2.125rem' },
        }}
      >
        Dashboard
      </Typography>

      <Box sx={{ display: 'flex', gap: { xs: 2, sm: 3 }, alignItems: 'flex-start', flexDirection: { xs: 'column', md: 'row' } }}>
        <Grid container spacing={{ xs: 2, sm: 3 }} sx={{ flex: 1 }}>
          {filteredCards.map((card, index) => (
            <Grid item xs={12} sm={6} lg={4} key={index}>
              <Card sx={{ height: '100%', borderRadius: 2 }}>
                <CardActionArea
                  onClick={() => navigate(card.path)}
                  sx={{ height: '100%', p: { xs: 1.5, sm: 2 } }}
                >
                  <CardContent
                    sx={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      textAlign: 'center',
                      gap: 0.5,
                      p: { xs: 1, sm: 1.5 },
                    }}
                  >
                    {card.icon}
                    <Typography
                      variant="h6"
                      sx={{ mt: { xs: 1.5, sm: 2 }, mb: 0.5, fontSize: { xs: '1.05rem', sm: '1.25rem' } }}
                    >
                      {card.title}
                    </Typography>
                    <Typography
                      variant="body2"
                      color="text.secondary"
                      sx={{ fontSize: { xs: '0.85rem', sm: '0.875rem' } }}
                    >
                      {card.desc}
                    </Typography>
                  </CardContent>
                </CardActionArea>
              </Card>
            </Grid>
          ))}
        </Grid>

        <Card
          sx={{
            width: { xs: '100%', md: 300 },
            flexShrink: 0,
            borderRadius: 2,
            alignSelf: 'stretch',
          }}
        >
          <CardContent sx={{ p: { xs: 2, sm: 3 } }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25, mb: 2 }}>
              <TasksIcon color="secondary" />
              <Typography variant="h6" fontWeight="bold" sx={{ fontSize: '1rem' }}>
                To Do Tasks
              </Typography>
            </Box>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
              {taskCounts === null ? (
                [...Array(3)].map((_, index) => (
                  <Skeleton key={index} variant="rounded" height={56} sx={{ borderRadius: 1.5 }} />
                ))
              ) : todoTasks.length === 0 ? (
                <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.85rem' }}>
                  Nothing pending — you're all caught up.
                </Typography>
              ) : (
                todoTasks.map((task, index) => (
                  <Box
                    key={index}
                    onClick={() => navigate(task.path)}
                    sx={{
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: 1.25,
                      p: 1.5,
                      border: '1px solid',
                      borderColor: 'divider',
                      borderRadius: 1.5,
                      cursor: 'pointer',
                      '&:hover': { borderColor: 'text.secondary' },
                    }}
                  >
                    <Box sx={{ display: 'flex', alignItems: 'center', mt: '1px' }}>{task.icon}</Box>
                    <Box>
                      <Typography variant="body2" fontWeight={600} sx={{ fontSize: '0.85rem' }}>
                        {task.title}
                      </Typography>
                      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.25 }}>
                        {task.desc}
                      </Typography>
                    </Box>
                  </Box>
                ))
              )}
            </Box>
          </CardContent>
        </Card>
      </Box>

      {/* Logs Section */}
      {filteredLogCards.length > 0 && (
        <Box sx={{ mt: { xs: 4, sm: 5 } }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: { xs: 2, sm: 3 } }}>
            <LogIcon color="action" />
            <Typography variant="h5" fontWeight="bold" sx={{ fontSize: { xs: '1.15rem', sm: '1.5rem' } }}>
              Logs
            </Typography>
            <Divider sx={{ flex: 1 }} />
          </Box>

          <Grid container spacing={{ xs: 2, sm: 3 }}>
            {filteredLogCards.map((card, index) => (
              <Grid item xs={12} sm={6} lg={3} key={index}>
                <Card sx={{ height: '100%', borderRadius: 2, border: '1px dashed', borderColor: 'divider' }} elevation={0}>
                  <CardActionArea
                    onClick={() => navigate(card.path)}
                    sx={{ height: '100%', p: { xs: 1.5, sm: 2 } }}
                  >
                    <CardContent
                      sx={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        textAlign: 'center',
                        gap: 0.5,
                        p: { xs: 1, sm: 1.5 },
                      }}
                    >
                      {card.icon}
                      <Typography
                        variant="h6"
                        sx={{ mt: { xs: 1, sm: 1.5 }, mb: 0.5, fontSize: { xs: '0.95rem', sm: '1.1rem' } }}
                      >
                        {card.title}
                      </Typography>
                      <Typography
                        variant="body2"
                        color="text.secondary"
                        sx={{ fontSize: { xs: '0.8rem', sm: '0.85rem' } }}
                      >
                        {card.desc}
                      </Typography>
                    </CardContent>
                  </CardActionArea>
                </Card>
              </Grid>
            ))}
          </Grid>
        </Box>
      )}
    </Box>
  );
};

export default SuperAdminPortal;


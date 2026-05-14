import React from 'react';
import { Box, Typography, Grid, Card, IconButton } from '@mui/material';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import SmsIcon from '@mui/icons-material/Sms';
import EmailIcon from '@mui/icons-material/Email';
import ReceiptIcon from '@mui/icons-material/Receipt';
import StoreIcon from '@mui/icons-material/Store';
import SupportAgentIcon from '@mui/icons-material/SupportAgent';
import PaymentIcon from '@mui/icons-material/Payment';

const TenantDetailsPage: React.FC = () => {
  const { tenantId } = useParams<{ tenantId: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const tenant = location.state?.tenant;
  const storeName = tenant?.name ? encodeURIComponent(tenant.name) : '';

  const tiles = [
    {
      title: 'SMS Usage',
      icon: <SmsIcon sx={{ fontSize: 40, color: '#1976d2' }} />,
      path: `/superadmin/sms-logs/${tenantId}`,
      color: '#e3f2fd',
    },
    {
      title: 'Email Usage',
      icon: <EmailIcon sx={{ fontSize: 40, color: '#2e7d32' }} />,
      path: `/superadmin/email-logs/${tenantId}`,
      color: '#e8f5e9',
    },
    {
      title: 'Orders',
      icon: <ReceiptIcon sx={{ fontSize: 40, color: '#ed6c02' }} />,
      path: `/superadmin/tenants/${tenantId}/orders`,
      color: '#fff3e0',
    },
    {
      title: 'Store Log',
      icon: <StoreIcon sx={{ fontSize: 40, color: '#7c3aed' }} />,
      path: `/superadmin/logs/stores?tenantId=${tenantId}&name=${storeName}`,
      color: '#f3e8ff',
    },
    {
      title: 'Tickets Log',
      icon: <SupportAgentIcon sx={{ fontSize: 40, color: '#0891b2' }} />,
      path: `/superadmin/logs/tickets?tenantId=${tenantId}&name=${storeName}`,
      color: '#e0f2fe',
    },
    {
      title: 'Platform Payments',
      icon: <PaymentIcon sx={{ fontSize: 40, color: '#1565c0' }} />,
      path: `/superadmin/tenants/${tenantId}/platform-payments`,
      color: '#e3f2fd',
    },
  ];

  return (
    <Box sx={{ px: { xs: 1.5, sm: 3 }, pb: { xs: 1.5, sm: 3 }, pt: { xs: 0.5, sm: 3 } }}>
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
        <IconButton onClick={() => navigate('/superadmin/tenants')} sx={{ mr: 2 }}>
          <ArrowBackIcon />
        </IconButton>
        <Typography variant="h4" sx={{ fontWeight: 'bold' }}>
          {tenant ? `${tenant.name} - Details` : 'Store Details'}
        </Typography>
      </Box>

      <Grid container spacing={3}>
        {tiles.map((tile, index) => (
          <Grid item xs={12} sm={6} md={4} key={index}>
            <Card
              elevation={2}
              onClick={() => navigate(tile.path, { state: { tenant } })}
              sx={{
                cursor: 'pointer',
                borderRadius: 3,
                transition: 'transform 0.2s, box-shadow 0.2s',
                '&:hover': {
                  transform: 'translateY(-4px)',
                  boxShadow: 6,
                },
                bgcolor: tile.color,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                p: 4,
                height: '100%',
              }}
            >
              <Box sx={{ mb: 2 }}>{tile.icon}</Box>
              <Typography variant="h6" sx={{ fontWeight: 600 }}>
                {tile.title}
              </Typography>
            </Card>
          </Grid>
        ))}
      </Grid>
    </Box>
  );
};

export default TenantDetailsPage;

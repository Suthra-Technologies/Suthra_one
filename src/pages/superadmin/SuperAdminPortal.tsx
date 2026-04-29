import React from 'react';
import { Box, Typography, Grid, Card, CardContent, CardActionArea } from '@mui/material';
import { People as PeopleIcon, SupportAgent as SupportIcon, Store as StoreIcon, CardMembership as CardMembershipIcon, LocalShipping as DeliveryIcon } from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';

const SuperAdminPortal: React.FC = () => {
  const navigate = useNavigate();

  const cards = [
    { title: 'Manage Tenants', icon: <StoreIcon fontSize="large" color="primary" />, path: '/superadmin/tenants', desc: 'View and manage restaurant subscriptions' },
    { title: 'Subscription Plans', icon: <CardMembershipIcon fontSize="large" color="success" />, path: '/superadmin/plans', desc: 'Manage pricing and features' },
    { title: 'Delivery Reports', icon: <DeliveryIcon fontSize="large" sx={{ color: '#ef4444' }} />, path: '/superadmin/delivery-reports', desc: 'DoorDash & Uber Eats deliveries across all stores' },
    { title: 'Support Tickets', icon: <SupportIcon fontSize="large" color="secondary" />, path: '/superadmin/tickets', desc: 'Respond to customer support requests' },
  ];

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
        Super Admin Portal
      </Typography>

      <Grid container spacing={{ xs: 2, sm: 3 }}>
        {cards.map((card, index) => (
          <Grid item xs={12} sm={6} lg={3} key={index}>
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
    </Box>
  );
};

export default SuperAdminPortal;

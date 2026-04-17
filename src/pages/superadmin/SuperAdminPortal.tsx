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
    <Box sx={{ p: 3 }}>
      <Typography
        variant="h3"
        gutterBottom
        sx={{
          fontWeight: 'bold',
          mb: 4,
          textAlign: { xs: 'center', sm: 'left' },
          fontSize: { xs: '1.5rem', sm: '2.125rem', md: '3rem' },
          whiteSpace: { xs: 'nowrap', sm: 'normal' },
          overflow: { xs: 'hidden', sm: 'visible' },
          textOverflow: { xs: 'ellipsis', sm: 'clip' }
        }}
      >
        Super Admin Portal
      </Typography>

      <Grid container spacing={3}>
        {cards.map((card, index) => (
          <Grid item xs={12} md={4} key={index}>
            <Card sx={{ height: '100%' }}>
              <CardActionArea onClick={() => navigate(card.path)} sx={{ height: '100%', p: 2 }}>
                <CardContent sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
                  {card.icon}
                  <Typography variant="h5" sx={{ mt: 2, mb: 1 }}>{card.title}</Typography>
                  <Typography variant="body2" color="textSecondary">{card.desc}</Typography>
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

import { Box, Typography } from '@mui/material';
import React from 'react';
import ActivityDashboard from '../../components/activity/ActivityDashboard';

const ActivityOverviewPage: React.FC = () => (
    <Box sx={{ p: 3 }}>
        <Typography variant="h4" fontWeight="bold" gutterBottom>Customer Activity (All Tenants)</Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            Cross-tenant visitor and customer engagement analytics.
        </Typography>
        <ActivityDashboard mode="superadmin" />
    </Box>
);

export default ActivityOverviewPage;

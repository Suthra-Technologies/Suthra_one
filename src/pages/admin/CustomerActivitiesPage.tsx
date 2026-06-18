import { Box, Typography } from '@mui/material';
import React from 'react';
import ActivityDashboard from '../../components/activity/ActivityDashboard';

const CustomerActivitiesPage: React.FC = () => (
    <Box sx={{ p: 3 }}>
        <Typography variant="h4" fontWeight="bold" gutterBottom>Customer Activities</Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            Visitor and customer engagement analytics for your restaurant.
        </Typography>
        <ActivityDashboard mode="admin" />
    </Box>
);

export default CustomerActivitiesPage;

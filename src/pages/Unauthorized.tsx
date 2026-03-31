import { Box, Typography } from '@mui/material';

export const Unauthorized = () => (
    <Box sx={{ p: 4, textAlign: 'center' }}>
        <Typography variant="h4" color="error">
            🚫 You don’t have permission to view this page.
        </Typography>
        <Typography sx={{ mt: 2 }}>
            If you think this is a mistake, please contact your system administrator.
        </Typography>
    </Box>
);

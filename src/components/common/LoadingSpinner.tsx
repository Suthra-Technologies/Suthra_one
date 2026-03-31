import React from 'react';
import { Box, CircularProgress, Typography } from '@mui/material';

interface LoadingSpinnerProps {
  size?: number;
  message?: string;
  centered?: boolean;
  color?: 'primary' | 'secondary' | 'error' | 'info' | 'success' | 'warning' | undefined;
}

const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({
  size = 40,
  message = 'Loading...',
  centered = true,
  color = 'primary',
}) => {
  const content = (
    <Box display="flex" flexDirection="column" alignItems="center" gap={2}>
      <CircularProgress size={size} color={color} />
      {message && (
        <Typography variant="body2" color="text.secondary">
          {message}
        </Typography>
      )}
    </Box>
  );

  if (centered) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="200px" width="100%">
        {content}
      </Box>
    );
  }

  return content;
};

export default LoadingSpinner;

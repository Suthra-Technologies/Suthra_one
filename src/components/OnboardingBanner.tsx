import React, { useEffect, useState } from 'react';
import { Typography, Button, Paper } from '@mui/material';
import { useNavigate, useLocation } from 'react-router-dom';
import { useSettings } from '../context/SettingsContext';
import { useAuth } from '../context/AuthContext';
import { menuAPI } from '../services/api';

const OnboardingBanner: React.FC = () => {
  const { settings } = useSettings();
  const { activeRole } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [hasMenu, setHasMenu] = useState<boolean | null>(null);

  useEffect(() => {
    if (activeRole !== 'admin') return;

    const checkMenu = async () => {
      try {
        const res = await menuAPI.getAll({ limit: 1 });
        const items = res.data.items || res.data;
        setHasMenu(items && items.length > 0);
      } catch (err) {
        console.error('Failed to check menu:', err);
      }
    };
    checkMenu();
  }, [activeRole]);

  if (activeRole !== 'admin') return null;

  const isSettingsIncomplete = !settings?.restaurant?.address || !settings?.restaurant?.logo;
  const isMenuIncomplete = hasMenu === false;

  if (!isSettingsIncomplete && !isMenuIncomplete) return null;

  return (
    <Paper 
      elevation={0}
      sx={{ 
        bgcolor: 'primary.light', 
        color: 'primary.contrastText', 
        p: 2, 
        mb: 2,
        borderRadius: 2,
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: 2,
        boxShadow: '0 4px 14px 0 rgba(79, 70, 229, 0.39)'
      }}
    >
      {isSettingsIncomplete ? (
        <>
          <Typography variant="body1" fontWeight="bold">
            Step 1: Welcome aboard! 👋 Let's get things rolling—please add your restaurant's logo and address below to officially unlock your store.
          </Typography>
          {location.pathname !== '/settings' && (
            <Button 
              variant="contained" 
              sx={{ bgcolor: '#fff', color: 'primary.main', '&:hover': { bgcolor: '#f0f0f0' } }} 
              onClick={() => navigate('/settings')}
            >
              Complete Settings
            </Button>
          )}
        </>
      ) : (
        <>
          <Typography variant="body1" fontWeight="bold">
            🎉 Profile saved! Step 2: Please upload your first Menu Item to start taking orders.
          </Typography>
          {location.pathname !== '/menu' && (
            <Button 
              variant="contained" 
              sx={{ bgcolor: '#fff', color: 'primary.main', '&:hover': { bgcolor: '#f0f0f0' } }} 
              onClick={() => navigate('/menu')}
            >
              Upload Menu
            </Button>
          )}
        </>
      )}
    </Paper>
  );
};

export default OnboardingBanner;

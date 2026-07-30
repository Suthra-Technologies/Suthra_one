import React, { useEffect, useState } from 'react';
import { Typography, Button, Paper } from '@mui/material';
import { useNavigate, useLocation } from 'react-router-dom';
import { useSettings } from '../context/SettingsContext';
import { useAuth } from '../context/AuthContext';
import { useActiveTenant } from '../hooks/useActiveTenant';
import { menuAPI } from '../services/api';

const OnboardingBanner: React.FC = () => {
  const { settings, loading } = useSettings();
  const { activeRole } = useAuth();
  const { getRelativePath } = useActiveTenant();
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
        setHasMenu(true); // Default to true on error to avoid blocking the user incorrectly
      }
    };
    checkMenu();
  }, [activeRole]);

  const isSettingsIncomplete = !settings?.restaurant?.address || !settings?.restaurant?.logo;
  const isMenuIncomplete = hasMenu === false;

  useEffect(() => {
    if (activeRole !== 'admin') return;
    if (loading || hasMenu === null) return;

    const currentPath = location.pathname;
    const settingsPath = getRelativePath('/settings');
    const menuPath = getRelativePath('/menu');

    if (isSettingsIncomplete && currentPath !== settingsPath) {
      navigate(settingsPath, { replace: true });
    } else if (!isSettingsIncomplete && isMenuIncomplete && currentPath !== menuPath) {
      navigate(menuPath, { replace: true });
    }
  }, [
    activeRole,
    loading,
    hasMenu,
    isSettingsIncomplete,
    isMenuIncomplete,
    location.pathname,
    navigate,
    getRelativePath
  ]);

  if (activeRole !== 'admin') return null;
  if (loading || hasMenu === null) return null; // Wait until data is fully loaded

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
            Step 1: Welcome! 👋 Please complete your restaurant profile by adding your address and logo to unlock all features.
          </Typography>
          {location.pathname !== getRelativePath('/settings') && (
            <Button 
              variant="contained" 
              sx={{ bgcolor: '#fff', color: 'primary.main', '&:hover': { bgcolor: '#f0f0f0' } }} 
              onClick={() => navigate(getRelativePath('/settings'))}
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
          {location.pathname !== getRelativePath('/menu') && (
            <Button 
              variant="contained" 
              sx={{ bgcolor: '#fff', color: 'primary.main', '&:hover': { bgcolor: '#f0f0f0' } }} 
              onClick={() => navigate(getRelativePath('/menu'))}
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

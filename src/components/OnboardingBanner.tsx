import React, { useEffect, useState } from 'react';
import { Typography, Button, Paper } from '@mui/material';
import { useNavigate, useLocation } from 'react-router-dom';
import { useSettings } from '../context/SettingsContext';
import { useAuth } from '../context/AuthContext';
import { useActiveTenant } from '../hooks/useActiveTenant';
import { menuAPI } from '../services/api';

const OnboardingBanner: React.FC = () => {
  const { settings, loading, isFetched, fetchError } = useSettings();
  const { activeRole, user } = useAuth();
  const { getRelativePath, slug } = useActiveTenant();
  const navigate = useNavigate();
  const location = useLocation();

  const getCachedProfileStatus = (): boolean | null => {
    if ((user?.tenant as any)?.isProfileComplete === true) return true;
    const tenantKey = slug || (user?.tenant as any)?._id || (user?.tenant as any)?.slug;
    if (tenantKey) {
      const cached = localStorage.getItem(`has_profile_${tenantKey}`);
      if (cached === 'true') return true;
      if (cached === 'false') return false;
    }
    return null;
  };

  const getCachedMenuStatus = (): boolean | null => {
    if ((user?.tenant as any)?.hasMenu === true) return true;
    const tenantKey = slug || (user?.tenant as any)?._id || (user?.tenant as any)?.slug;
    if (tenantKey) {
      const cached = localStorage.getItem(`has_menu_${tenantKey}`);
      if (cached === 'true') return true;
      if (cached === 'false') return false;
    }
    return null;
  };

  const [hasMenu, setHasMenu] = useState<boolean | null>(getCachedMenuStatus);

  useEffect(() => {
    if (activeRole !== 'admin') return;

    const checkMenu = async () => {
      try {
        const res = await menuAPI.getAll({ limit: 1 });
        const items = res.data.items || res.data;
        const exists = Boolean(items && items.length > 0);
        setHasMenu(exists);
        const tenantKey = slug || (user?.tenant as any)?._id || (user?.tenant as any)?.slug;
        if (tenantKey) {
          localStorage.setItem(`has_menu_${tenantKey}`, exists ? 'true' : 'false');
        }
      } catch (err) {
        console.error('Failed to check menu:', err);
        // Retain prior state or default to true on error to avoid blocking the user incorrectly
        setHasMenu(prev => prev !== null ? prev : true);
      }
    };

    checkMenu();

    const handleMenuUpdated = () => {
      checkMenu();
    };
    window.addEventListener('menu_updated', handleMenuUpdated);
    return () => {
      window.removeEventListener('menu_updated', handleMenuUpdated);
    };
  }, [activeRole, slug, user?.tenant]);

  // Robust check combining settings, user.tenant, cached profile state, and name presence
  const isProfileCompleteFlag =
    (user?.tenant as any)?.isProfileComplete === true ||
    getCachedProfileStatus() === true ||
    Boolean(settings?.restaurant?.name?.trim() || (user?.tenant as any)?.name?.trim());

  useEffect(() => {
    if (isProfileCompleteFlag) {
      const tenantKey = slug || (user?.tenant as any)?._id || (user?.tenant as any)?.slug;
      if (tenantKey) {
        localStorage.setItem(`has_profile_${tenantKey}`, 'true');
      }
    }
  }, [isProfileCompleteFlag, slug, user?.tenant]);

  const isSettingsIncomplete = !isProfileCompleteFlag;
  const isMenuIncomplete = hasMenu === false;

  if (activeRole !== 'admin') return null;
  if (loading || !isFetched || fetchError || hasMenu === null) return null; // Wait until data is fully loaded

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

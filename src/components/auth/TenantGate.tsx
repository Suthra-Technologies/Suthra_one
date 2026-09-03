import React, { useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { tenantAPI } from '../../services/api';

interface TenantGateProps {
  children: ReactNode;
}

const TenantGate: React.FC<TenantGateProps> = ({ children }) => {
  const [checked, setChecked] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    let mounted = true;
    const checkTenant = async () => {
      try {
        await tenantAPI.getCurrent();
        if (mounted) setChecked(true);
      } catch (err) {
        if (location.pathname !== '/onboarding') {
          navigate('/onboarding', { replace: true });
        } else {
          setChecked(true);
        }
      }
    };
    checkTenant();
    return () => {
      mounted = false;
    };
  }, [navigate, location.pathname]);

  if (!checked) return null;
  return <>{children}</>;
};

export default TenantGate;

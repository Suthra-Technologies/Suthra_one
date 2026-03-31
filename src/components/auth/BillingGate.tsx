import React, { useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { billingAPI } from '../../services/api';

interface BillingGateProps {
  children: ReactNode;
}

const BillingGate: React.FC<BillingGateProps> = ({ children }) => {
  const [checked, setChecked] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    let mounted = true;
    const checkBilling = async () => {
      try {
        const { data } = await billingAPI.status();
        if (!data?.hasActiveAccess && location.pathname !== '/billing') {
          navigate('/billing', { replace: true });
        } else if (mounted) {
          setChecked(true);
        }
      } catch {
        if (mounted) setChecked(true);
      }
    };
    checkBilling();
    return () => {
      mounted = false;
    };
  }, [navigate, location.pathname]);

  if (!checked) return null;
  return <>{children}</>;
};

export default BillingGate;

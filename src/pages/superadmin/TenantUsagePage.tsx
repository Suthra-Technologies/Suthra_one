import React, { useCallback, useEffect, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Card,
  Chip,
  CircularProgress,
  IconButton,
  Stack,
  Typography,
} from '@mui/material';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import RefreshIcon from '@mui/icons-material/Refresh';
import DonutLargeIcon from '@mui/icons-material/DonutLarge';
import { superAPI } from '../../services/api';
import UsageBreakdown from '../../components/UsageBreakdown';

/**
 * Superadmin view of a single store's consumption against its plan limits —
 * the same meters the tenant sees under Dashboard → My Usage.
 */
const TenantUsagePage: React.FC = () => {
  const { tenantId } = useParams<{ tenantId: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const tenantFromState = location.state?.tenant;

  const [usageData, setUsageData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchUsage = useCallback(async () => {
    if (!tenantId) return;
    setLoading(true);
    setError('');
    try {
      const res = await superAPI.getTenantUsage(tenantId);
      setUsageData(res.data);
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Unable to load usage details');
    } finally {
      setLoading(false);
    }
  }, [tenantId]);

  useEffect(() => {
    fetchUsage();
  }, [fetchUsage]);

  // The response carries the store name, but fall back to whatever the
  // details page handed over so the header is not blank while loading.
  const storeName = usageData?.tenant?.name || tenantFromState?.name || 'Store';

  return (
    <Box sx={{ px: { xs: 1.5, sm: 3 }, pb: { xs: 1.5, sm: 3 }, pt: { xs: 0.5, sm: 3 } }}>
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
        <IconButton
          onClick={() => navigate(`/superadmin/tenants/${tenantId}`, { state: { tenant: tenantFromState } })}
          sx={{ mr: 2 }}
        >
          <ArrowBackIcon />
        </IconButton>
        <Typography variant="h4" sx={{ fontWeight: 'bold' }}>
          {storeName} - Usage
        </Typography>
      </Box>

      <Card elevation={2} sx={{ borderRadius: 3, p: { xs: 2, sm: 3 }, maxWidth: 720 }}>
        <Stack direction="row" alignItems="center" spacing={1.25} sx={{ mb: 2 }}>
          <DonutLargeIcon color="primary" />
          <Box>
            <Typography variant="h6" sx={{ fontWeight: 700, lineHeight: 1.2 }}>
              Plan Usage
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {new Date().toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}
            </Typography>
          </Box>
          <Box sx={{ ml: 'auto !important', display: 'flex', gap: 1, alignItems: 'center' }}>
            {usageData?.status && (
              <Chip
                size="small"
                label={usageData.status}
                color={usageData.status === 'active' ? 'success' : 'warning'}
                variant="outlined"
                sx={{ textTransform: 'capitalize' }}
              />
            )}
            {usageData?.plan && (
              <Chip
                size="small"
                label={usageData.plan}
                color="primary"
                variant="outlined"
                sx={{ textTransform: 'capitalize' }}
              />
            )}
          </Box>
        </Stack>

        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
            <CircularProgress />
          </Box>
        ) : error ? (
          <Alert severity="error">{error}</Alert>
        ) : usageData ? (
          <UsageBreakdown usageData={usageData} />
        ) : null}

        <Box sx={{ display: 'flex', mt: 2 }}>
          <Button onClick={fetchUsage} disabled={loading} startIcon={<RefreshIcon />}>
            Refresh
          </Button>
        </Box>
      </Card>
    </Box>
  );
};

export default TenantUsagePage;

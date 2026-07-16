import React, { useCallback, useEffect, useState } from 'react';
import {
    Alert,
    Box,
    Button,
    Chip,
    CircularProgress,
    Collapse,
    Paper,
    Stack,
    Typography,
    useTheme,
} from '@mui/material';
import { alpha } from '@mui/material/styles';
import AccountBalanceIcon from '@mui/icons-material/AccountBalance';
import WarningAmberRoundedIcon from '@mui/icons-material/WarningAmberRounded';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import RefreshIcon from '@mui/icons-material/Refresh';
import { paymentsAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';

type ConnectStatus = {
    needsOnboarding: boolean;
    accountId: string | null;
    chargesEnabled: boolean;
    payoutsEnabled: boolean;
    detailsSubmitted: boolean;
    status: string;
};

/**
 * Dashboard "Pending Actions" panel for tenant admins.
 *
 * Once a tenant is activated, online card payments stay blocked until the
 * restaurant completes Stripe Connect payout onboarding. Instead of the
 * superadmin collecting bank/KYC details out-of-band, this panel surfaces
 * the onboarding link so the tenant admin completes it themselves.
 */
const PendingActionsCard: React.FC = () => {
    const theme = useTheme();
    const { hasRole } = useAuth();
    const [status, setStatus] = useState<ConnectStatus | null>(null);
    const [loading, setLoading] = useState(true);
    const [starting, setStarting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const canAct = hasRole(['admin', 'manager']);

    const loadStatus = useCallback(async () => {
        try {
            const res = await paymentsAPI.getConnectStatus();
            setStatus(res.data);
        } catch {
            // Endpoint unavailable (e.g. superadmin context) — show nothing.
            setStatus(null);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        if (canAct) void loadStatus();
        else setLoading(false);
    }, [canAct, loadStatus]);

    const handleStartOnboarding = async () => {
        setStarting(true);
        setError(null);
        try {
            const returnUrl = window.location.href;
            const res = await paymentsAPI.startConnectOnboarding(returnUrl, returnUrl);
            const url = res.data?.onboardingUrl;
            if (url) {
                // Same-tab navigation: Stripe returns the admin here when done.
                window.location.assign(url);
            } else {
                setError('Could not get the onboarding link. Please try again.');
                setStarting(false);
            }
        } catch (err: any) {
            setError(err?.response?.data?.message || 'Failed to start onboarding. Please try again.');
            setStarting(false);
        }
    };

    if (!canAct || loading || !status?.needsOnboarding) return null;

    const inProgress = Boolean(status.accountId) && status.detailsSubmitted;

    return (
        <Collapse in appear>
            <Paper
                elevation={0}
                sx={{
                    mb: { xs: 2, sm: 3 },
                    p: { xs: 2, sm: 2.5 },
                    borderRadius: 3,
                    border: `1px solid ${alpha(theme.palette.warning.main, 0.45)}`,
                    bgcolor: alpha(theme.palette.warning.main, theme.palette.mode === 'dark' ? 0.12 : 0.06),
                }}
            >
                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems={{ xs: 'flex-start', sm: 'center' }}>
                    <Box
                        sx={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            width: 44,
                            height: 44,
                            borderRadius: 2,
                            flexShrink: 0,
                            bgcolor: alpha(theme.palette.warning.main, 0.18),
                            color: theme.palette.warning.dark,
                        }}
                    >
                        <AccountBalanceIcon />
                    </Box>
                    <Box sx={{ flexGrow: 1 }}>
                        <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" sx={{ mb: 0.5 }}>
                            <Typography variant="subtitle1" sx={{ fontWeight: 800 }}>
                                Pending Action: Set Up Payouts
                            </Typography>
                            <Chip
                                size="small"
                                icon={<WarningAmberRoundedIcon />}
                                color="warning"
                                label={inProgress ? 'Verification pending' : 'Required'}
                                sx={{ fontWeight: 700 }}
                            />
                        </Stack>
                        <Typography variant="body2" color="text.secondary">
                            {inProgress
                                ? 'Your details were submitted and Stripe is verifying them. Online card payments will be enabled automatically once verification completes.'
                                : 'Online card payments are disabled until you connect your bank account through Stripe. It takes about 5 minutes — have your business and bank details ready.'}
                        </Typography>
                        {error && (
                            <Alert severity="error" sx={{ mt: 1.5 }} onClose={() => setError(null)}>
                                {error}
                            </Alert>
                        )}
                    </Box>
                    <Stack direction="row" spacing={1} sx={{ flexShrink: 0, width: { xs: '100%', sm: 'auto' } }}>
                        {inProgress ? (
                            <Button
                                variant="outlined"
                                color="warning"
                                startIcon={<RefreshIcon />}
                                onClick={() => { setLoading(true); void loadStatus(); }}
                                fullWidth
                            >
                                Check Status
                            </Button>
                        ) : (
                            <Button
                                variant="contained"
                                color="warning"
                                startIcon={starting ? <CircularProgress size={18} color="inherit" /> : <OpenInNewIcon />}
                                onClick={() => void handleStartOnboarding()}
                                disabled={starting}
                                fullWidth
                                sx={{ fontWeight: 800, whiteSpace: 'nowrap' }}
                            >
                                {starting ? 'Opening Stripe…' : 'Set Up Payouts'}
                            </Button>
                        )}
                    </Stack>
                </Stack>
            </Paper>
        </Collapse>
    );
};

export default PendingActionsCard;

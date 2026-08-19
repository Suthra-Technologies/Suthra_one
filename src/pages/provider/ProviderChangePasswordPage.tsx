import { LockReset, Visibility, VisibilityOff } from '@mui/icons-material';
import {
    Alert,
    Box,
    Button,
    CircularProgress,
    IconButton,
    InputAdornment,
    Paper,
    Stack,
    TextField,
    Typography,
} from '@mui/material';
import React, { useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { authAPI } from '../../services/api';

const ACCENT = '#00695c';

/**
 * Forced password reset for a freshly provisioned provider account.
 *
 * Rendered outside MaterialProviderLayout on purpose: the layout redirects here
 * while `mustChangePassword` is set, so nesting it would loop. Once the change
 * succeeds we clear the flag locally and drop the provider into the portal.
 */
const ProviderChangePasswordPage: React.FC = () => {
    const navigate = useNavigate();
    const { user, updateUserData, logout } = useAuth();

    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showCurrent, setShowCurrent] = useState(false);
    const [showNew, setShowNew] = useState(false);
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [apiError, setApiError] = useState('');
    const [saving, setSaving] = useState(false);

    const mustChange = !!(user as any)?.mustChangePassword;

    // A provider who already set their own password has no business here.
    if (!mustChange) {
        return <Navigate to="/provider" replace />;
    }

    const validate = () => {
        const next: Record<string, string> = {};
        if (!currentPassword) next.currentPassword = 'Enter the temporary password from your email';
        if (!newPassword) {
            next.newPassword = 'Choose a new password';
        } else if (newPassword.length < 8) {
            next.newPassword = 'Password must be at least 8 characters';
        } else if (newPassword === currentPassword) {
            next.newPassword = 'New password must be different from the temporary one';
        }
        if (confirmPassword !== newPassword) next.confirmPassword = 'Passwords do not match';
        setErrors(next);
        return Object.keys(next).length === 0;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setApiError('');
        if (!validate()) return;

        setSaving(true);
        try {
            await authAPI.changePassword({ currentPassword, newPassword });
            // The backend clears mustChangePassword on the record; mirror it in
            // the session so the layout stops redirecting back here.
            updateUserData({ mustChangePassword: false } as any);
            navigate('/provider', { replace: true });
        } catch (err: any) {
            setApiError(err?.response?.data?.message || 'Could not change your password. Please try again.');
        } finally {
            setSaving(false);
        }
    };

    return (
        <Box
            sx={{
                minHeight: '100vh',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                bgcolor: 'background.default',
                p: 2,
            }}
        >
            <Paper elevation={3} sx={{ p: { xs: 3, sm: 4 }, width: '100%', maxWidth: 460, borderRadius: 2 }}>
                <Stack spacing={1} alignItems="center" sx={{ mb: 3 }}>
                    <Box
                        sx={{
                            width: 56,
                            height: 56,
                            borderRadius: '50%',
                            bgcolor: `${ACCENT}1A`,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                        }}
                    >
                        <LockReset sx={{ color: ACCENT, fontSize: 30 }} />
                    </Box>
                    <Typography variant="h6" fontWeight={700} textAlign="center">
                        Set your password
                    </Typography>
                    <Typography variant="body2" color="text.secondary" textAlign="center">
                        For security, choose your own password before using the
                        Material Provider Portal.
                    </Typography>
                </Stack>

                {apiError && <Alert severity="error" sx={{ mb: 2 }}>{apiError}</Alert>}

                <Box component="form" onSubmit={handleSubmit} noValidate>
                    <Stack spacing={2}>
                        <TextField
                            fullWidth
                            label="Temporary Password"
                            type={showCurrent ? 'text' : 'password'}
                            value={currentPassword}
                            onChange={(e) => setCurrentPassword(e.target.value)}
                            error={!!errors.currentPassword}
                            helperText={errors.currentPassword}
                            autoComplete="current-password"
                            InputProps={{
                                endAdornment: (
                                    <InputAdornment position="end">
                                        <IconButton onClick={() => setShowCurrent((v) => !v)} edge="end" size="small">
                                            {showCurrent ? <VisibilityOff /> : <Visibility />}
                                        </IconButton>
                                    </InputAdornment>
                                ),
                            }}
                        />
                        <TextField
                            fullWidth
                            label="New Password"
                            type={showNew ? 'text' : 'password'}
                            value={newPassword}
                            onChange={(e) => setNewPassword(e.target.value)}
                            error={!!errors.newPassword}
                            helperText={errors.newPassword || 'At least 8 characters'}
                            autoComplete="new-password"
                            InputProps={{
                                endAdornment: (
                                    <InputAdornment position="end">
                                        <IconButton onClick={() => setShowNew((v) => !v)} edge="end" size="small">
                                            {showNew ? <VisibilityOff /> : <Visibility />}
                                        </IconButton>
                                    </InputAdornment>
                                ),
                            }}
                        />
                        <TextField
                            fullWidth
                            label="Confirm New Password"
                            type={showNew ? 'text' : 'password'}
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            error={!!errors.confirmPassword}
                            helperText={errors.confirmPassword}
                            autoComplete="new-password"
                        />

                        <Button
                            type="submit"
                            variant="contained"
                            size="large"
                            disabled={saving}
                            sx={{ bgcolor: ACCENT, '&:hover': { bgcolor: '#004d40' } }}
                        >
                            {saving ? <CircularProgress size={22} sx={{ color: '#fff' }} /> : 'Set Password & Continue'}
                        </Button>

                        <Button
                            variant="text"
                            size="small"
                            color="inherit"
                            onClick={() => {
                                logout();
                                navigate('/login', { replace: true });
                            }}
                        >
                            Sign out
                        </Button>
                    </Stack>
                </Box>
            </Paper>
        </Box>
    );
};

export default ProviderChangePasswordPage;

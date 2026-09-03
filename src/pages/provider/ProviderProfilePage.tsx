import {
    Alert,
    Box,
    Button,
    CircularProgress,
    Divider,
    IconButton,
    InputAdornment,
    Paper,
    Stack,
    TextField,
    Typography,
} from '@mui/material';
import { Visibility, VisibilityOff } from '@mui/icons-material';
import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { authAPI } from '../../services/api';

const ACCENT = '#00695c';

/** Account page for a signed-in material provider: read-only details + password change. */
const ProviderProfilePage: React.FC = () => {
    const { user } = useAuth();

    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showPasswords, setShowPasswords] = useState(false);
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
    const [saving, setSaving] = useState(false);

    const validate = () => {
        const next: Record<string, string> = {};
        if (!currentPassword) next.currentPassword = 'Enter your current password';
        if (!newPassword) {
            next.newPassword = 'Choose a new password';
        } else if (newPassword.length < 8) {
            next.newPassword = 'Password must be at least 8 characters';
        }
        if (confirmPassword !== newPassword) next.confirmPassword = 'Passwords do not match';
        setErrors(next);
        return Object.keys(next).length === 0;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setFeedback(null);
        if (!validate()) return;

        setSaving(true);
        try {
            await authAPI.changePassword({ currentPassword, newPassword });
            setFeedback({ type: 'success', text: 'Password updated.' });
            setCurrentPassword('');
            setNewPassword('');
            setConfirmPassword('');
        } catch (err: any) {
            setFeedback({
                type: 'error',
                text: err?.response?.data?.message || 'Could not change your password. Please try again.',
            });
        } finally {
            setSaving(false);
        }
    };

    const details: Array<[string, string]> = [
        ['Provider', (user as any)?.firstName || '—'],
        ['Email', user?.email || '—'],
        ['Phone', user?.phone || '—'],
    ];

    return (
        <Box sx={{ maxWidth: 640 }}>
            <Typography variant="h5" fontWeight={700} sx={{ mb: 2 }}>
                Profile
            </Typography>

            <Paper variant="outlined" sx={{ p: 3, borderRadius: 2, mb: 3 }}>
                <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 2 }}>
                    Account Details
                </Typography>
                <Stack spacing={1.5}>
                    {details.map(([label, value]) => (
                        <Box key={label} sx={{ display: 'flex', justifyContent: 'space-between', gap: 2 }}>
                            <Typography variant="body2" color="text.secondary">{label}</Typography>
                            <Typography variant="body2" fontWeight={600} sx={{ textAlign: 'right' }}>{value}</Typography>
                        </Box>
                    ))}
                </Stack>
                <Divider sx={{ my: 2 }} />
                <Typography variant="caption" color="text.secondary">
                    These details are managed by the Suthra One team. Contact support to have them changed.
                </Typography>
            </Paper>

            <Paper variant="outlined" sx={{ p: 3, borderRadius: 2 }}>
                <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 2 }}>
                    Change Password
                </Typography>

                {feedback && (
                    <Alert severity={feedback.type} sx={{ mb: 2 }}>
                        {feedback.text}
                    </Alert>
                )}

                <Box component="form" onSubmit={handleSubmit} noValidate>
                    <Stack spacing={2}>
                        <TextField
                            fullWidth
                            label="Current Password"
                            type={showPasswords ? 'text' : 'password'}
                            value={currentPassword}
                            onChange={(e) => setCurrentPassword(e.target.value)}
                            error={!!errors.currentPassword}
                            helperText={errors.currentPassword}
                            autoComplete="current-password"
                            InputProps={{
                                endAdornment: (
                                    <InputAdornment position="end">
                                        <IconButton onClick={() => setShowPasswords((v) => !v)} edge="end" size="small">
                                            {showPasswords ? <VisibilityOff /> : <Visibility />}
                                        </IconButton>
                                    </InputAdornment>
                                ),
                            }}
                        />
                        <TextField
                            fullWidth
                            label="New Password"
                            type={showPasswords ? 'text' : 'password'}
                            value={newPassword}
                            onChange={(e) => setNewPassword(e.target.value)}
                            error={!!errors.newPassword}
                            helperText={errors.newPassword || 'At least 8 characters'}
                            autoComplete="new-password"
                        />
                        <TextField
                            fullWidth
                            label="Confirm New Password"
                            type={showPasswords ? 'text' : 'password'}
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            error={!!errors.confirmPassword}
                            helperText={errors.confirmPassword}
                            autoComplete="new-password"
                        />
                        <Box>
                            <Button
                                type="submit"
                                variant="contained"
                                disabled={saving}
                                sx={{ bgcolor: ACCENT, '&:hover': { bgcolor: '#004d40' } }}
                            >
                                {saving ? <CircularProgress size={20} sx={{ color: '#fff' }} /> : 'Update Password'}
                            </Button>
                        </Box>
                    </Stack>
                </Box>
            </Paper>
        </Box>
    );
};

export default ProviderProfilePage;

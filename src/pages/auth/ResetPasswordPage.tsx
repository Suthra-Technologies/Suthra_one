import React, { useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Box, Card, CardContent, Typography, TextField, Button, Alert } from '@mui/material';
import { authAPI } from '../../services/api';
import { toast } from 'react-hot-toast';

const ResetPasswordPage: React.FC = () => {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const token = searchParams.get('token');

    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [loading, setLoading] = useState(false);

    if (!token) {
        return (
            <Box display="flex" justifyContent="center" alignItems="center" minHeight="100vh">
                <Alert severity="error">Invalid or missing token</Alert>
            </Box>
        );
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (password !== confirmPassword) {
            toast.error('Passwords do not match');
            return;
        }
        if (password.length < 6) {
            toast.error('Password must be at least 6 characters');
            return;
        }

        setLoading(true);
        try {
            await authAPI.resetPasswordWithToken(token, password);
            toast.success('Password set successfully! Please login.');
            navigate('/login');
        } catch (error: any) {
            toast.error(error.response?.data?.message || 'Failed to set password');
        } finally {
            setLoading(false);
        }
    };

    return (
        <Box display="flex" justifyContent="center" alignItems="center" minHeight="100vh" bgcolor="background.default">
            <Card sx={{ maxWidth: 400, width: '100%', m: 2 }}>
                <CardContent>
                    <Typography variant="h5" gutterBottom textAlign="center">
                        Set Password
                    </Typography>
                    <Typography variant="body2" color="text.secondary" textAlign="center" mb={3}>
                        Please enter your new password below.
                    </Typography>
                    <form onSubmit={handleSubmit}>
                        <TextField
                            fullWidth
                            label="New Password"
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            margin="normal"
                            required
                        />
                        <TextField
                            fullWidth
                            label="Confirm Password"
                            type="password"
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            margin="normal"
                            required
                        />
                        <Button
                            fullWidth
                            variant="contained"
                            type="submit"
                            disabled={loading}
                            sx={{ mt: 2 }}
                        >
                            {loading ? 'Setting Password...' : 'Set Password'}
                        </Button>
                    </form>
                </CardContent>
            </Card>
        </Box>
    );
};

export default ResetPasswordPage;

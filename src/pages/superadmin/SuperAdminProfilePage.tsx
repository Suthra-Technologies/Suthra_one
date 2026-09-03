import React, { useEffect, useState } from 'react';
import {
    Box,
    Typography,
    Paper,
    TextField,
    Button,
    Avatar,
    Divider,
    Card,
    CardContent,
    IconButton,
    InputAdornment,
    alpha,
    Alert,
    CircularProgress,
    Switch,
    FormControlLabel,
    useTheme,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Select,
    MenuItem,
} from '@mui/material';
import type { SelectChangeEvent } from '@mui/material';
import Grid from '@mui/material/Grid2';
import {
    Save as SaveIcon,
    PhotoCamera,
    Visibility,
    VisibilityOff,
    Delete as DeleteIcon,
    Add as AddIcon,
    LocalShipping as DeliveryIcon,
} from '@mui/icons-material';
import { useAuth } from '../../context/AuthContext';
import { authAPI, superAPI, uploadAPI } from '../../services/api';
import { toast } from 'react-hot-toast';
import { validateEmail as _validateEmail, validateName, validatePassword, validateRequired, getHelperText, hasError } from '../../utils/validation';
import type { ValidationResult } from '../../utils/validation';
import PhoneInput from '../../components/PhoneInput';

const emptyDoordash = { enabled: false, developerId: '', keyId: '', signingSecret: '', externalStoreId: '', isSandbox: true };
const emptyUbereats = { enabled: false, clientId: '', clientSecret: '', customerId: '', isSandbox: true };
// Grubhub is credential storage only — there is no dispatch integration for it yet,
// unlike DoorDash/Uber Eats. Saved to the global store for future use / manual reference.
const emptyGrubhub = { enabled: false, clientId: '', clientSecret: '', restaurantId: '', isSandbox: true };

type DeliveryProvider = 'doordash' | 'ubereats' | 'grubhub';
const PROVIDER_LABELS: Record<DeliveryProvider, string> = { doordash: 'DoorDash', ubereats: 'Uber Eats', grubhub: 'Grubhub' };
const ALL_PROVIDERS: DeliveryProvider[] = ['doordash', 'ubereats', 'grubhub'];

const SuperAdminProfilePage: React.FC = () => {
    const { user, updateUserData } = useAuth();
    const theme = useTheme();

    const [loading, setLoading] = useState(false);
    const [avatarUploading, setAvatarUploading] = useState(false);

    const [profileData, setProfileData] = useState({
        firstName: user?.firstName || '',
        lastName: user?.lastName || '',
        email: user?.email || '',
        phone: user?.phone || '',
        dialCode: '1',
        profileImage: user?.profileImage || '',
    });
    const [profileErrors, setProfileErrors] = useState<Record<string, ValidationResult>>({});

    const [addressData, setAddressData] = useState({
        street: '', city: '', state: '', zipCode: '', country: '',
    });

    const [passwordData, setPasswordData] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
    const [passwordErrors, setPasswordErrors] = useState<Record<string, ValidationResult>>({});
    const [showPassword, setShowPassword] = useState(false);

    const [deleteAccountDialogOpen, setDeleteAccountDialogOpen] = useState(false);
    const [deleteConfirmText, setDeleteConfirmText] = useState('');

    const [deliverySettings, setDeliverySettings] = useState({ doordash: emptyDoordash, ubereats: emptyUbereats, grubhub: emptyGrubhub });
    const [deliveryLoading, setDeliveryLoading] = useState(false);
    const [deliverySaving, setDeliverySaving] = useState(false);
    const [showDoorSecret, setShowDoorSecret] = useState(false);
    const [showUberSecret, setShowUberSecret] = useState(false);
    const [showGrubSecret, setShowGrubSecret] = useState(false);
    // Which provider card(s) are shown, and which provider each card is currently set to.
    // Starts with a single DoorDash card; "+ Add another platform" appends the other one.
    const [activePlatforms, setActivePlatforms] = useState<DeliveryProvider[]>(['doordash']);

    useEffect(() => {
        (async () => {
            try {
                setLoading(true);
                const response = await authAPI.getProfile();
                const u = response.data;
                setProfileData({
                    firstName: u.firstName || '',
                    lastName: u.lastName || '',
                    email: u.email || '',
                    phone: u.phone || '',
                    dialCode: u.dialCode || '1',
                    profileImage: u.profileImage || '',
                });
                setAddressData({
                    street: u.address?.street || '',
                    city: u.address?.city || '',
                    state: u.address?.state || '',
                    zipCode: u.address?.zipCode || '',
                    country: u.address?.country || '',
                });
            } catch (error) {
                console.error('Error fetching profile:', error);
            } finally {
                setLoading(false);
            }
        })();
    }, []);

    useEffect(() => {
        setDeliveryLoading(true);
        superAPI.getGlobalDeliverySettings()
            .then((res: any) => {
                const doordash = { ...emptyDoordash, ...res.data?.doordash };
                const ubereats = { ...emptyUbereats, ...res.data?.ubereats };
                const grubhub = { ...emptyGrubhub, ...res.data?.grubhub };
                setDeliverySettings({ doordash, ubereats, grubhub });

                const hasData: Record<DeliveryProvider, boolean> = {
                    doordash: Boolean(doordash.developerId || doordash.signingSecret || doordash.enabled),
                    ubereats: Boolean(ubereats.clientId || ubereats.clientSecret || ubereats.enabled),
                    grubhub: Boolean(grubhub.clientId || grubhub.clientSecret || grubhub.enabled),
                };
                const withData = ALL_PROVIDERS.filter(p => hasData[p]);
                if (withData.length > 0) {
                    setActivePlatforms(withData);
                }
            })
            .catch((err: any) => console.error('Failed to load global delivery settings:', err))
            .finally(() => setDeliveryLoading(false));
    }, []);

    const handleProfileChange = (field: string, value: string) => {
        setProfileData(prev => ({ ...prev, [field]: value }));
    };

    const handleProfileBlur = (field: 'firstName' | 'lastName') => {
        setProfileErrors(prev => ({ ...prev, [field]: validateName(profileData[field], field === 'firstName' ? 'First name' : 'Last name') }));
    };

    const validateProfileForm = () => {
        const newErrors: Record<string, ValidationResult> = {
            firstName: validateName(profileData.firstName, 'First name'),
            lastName: validateName(profileData.lastName, 'Last name'),
        };
        setProfileErrors(newErrors);
        return Object.values(newErrors).every(v => v.isValid);
    };

    const handleProfileUpdate = async () => {
        if (!validateProfileForm()) {
            toast.error('Please fix the errors in the form');
            return;
        }
        try {
            setLoading(true);
            await authAPI.updateProfile({
                firstName: profileData.firstName,
                lastName: profileData.lastName,
                phone: profileData.phone,
                profileImage: profileData.profileImage,
            });
            updateUserData({
                firstName: profileData.firstName,
                lastName: profileData.lastName,
                phone: profileData.phone,
                profileImage: profileData.profileImage,
            });
            toast.success('Profile updated successfully');
        } catch (error: any) {
            console.error('Error updating profile:', error);
            toast.error(error.response?.data?.message || 'Failed to update profile');
        } finally {
            setLoading(false);
        }
    };

    const handleAvatarUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;
        try {
            setAvatarUploading(true);
            const response = await uploadAPI.uploadImage(file, 'user');
            setProfileData(prev => ({ ...prev, profileImage: response.data.url }));
        } catch (error: any) {
            console.error('Error uploading avatar:', error);
            toast.error(error.response?.data?.message || 'Failed to upload image');
        } finally {
            setAvatarUploading(false);
            event.target.value = '';
        }
    };

    const handleAddressUpdate = async () => {
        try {
            setLoading(true);
            await authAPI.updateProfile({ address: addressData });
            toast.success('Address updated successfully');
        } catch (error: any) {
            console.error('Error updating address:', error);
            toast.error(error.response?.data?.message || 'Failed to update address');
        } finally {
            setLoading(false);
        }
    };

    const handlePasswordChange = (field: string, value: string) => {
        setPasswordData(prev => ({ ...prev, [field]: value }));
    };

    const handlePasswordBlur = (field: 'currentPassword' | 'newPassword' | 'confirmPassword') => {
        if (field === 'confirmPassword') {
            setPasswordErrors(prev => ({
                ...prev,
                confirmPassword: passwordData.newPassword !== passwordData.confirmPassword
                    ? { isValid: false, message: 'Passwords do not match' }
                    : validateRequired(passwordData.confirmPassword, 'Confirm password'),
            }));
            return;
        }
        if (field === 'currentPassword') {
            setPasswordErrors(prev => ({ ...prev, currentPassword: validateRequired(passwordData.currentPassword, 'Current password') }));
            return;
        }
        setPasswordErrors(prev => ({ ...prev, newPassword: validatePassword(passwordData.newPassword) }));
    };

    const validatePasswordForm = () => {
        const newErrors: Record<string, ValidationResult> = {
            currentPassword: validateRequired(passwordData.currentPassword, 'Current password'),
            newPassword: validatePassword(passwordData.newPassword),
            confirmPassword: passwordData.newPassword !== passwordData.confirmPassword
                ? { isValid: false, message: 'Passwords do not match' }
                : validateRequired(passwordData.confirmPassword, 'Confirm password'),
        };
        setPasswordErrors(newErrors);
        return Object.values(newErrors).every(v => v.isValid);
    };

    const handlePasswordUpdate = async () => {
        if (!validatePasswordForm()) {
            toast.error('Please fix the errors in the form');
            return;
        }
        try {
            setLoading(true);
            await authAPI.changePassword({
                currentPassword: passwordData.currentPassword,
                newPassword: passwordData.newPassword,
            });
            toast.success('Password updated successfully');
            setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
            setPasswordErrors({});
        } catch (error: any) {
            console.error('Error updating password:', error);
            toast.error(error.response?.data?.message || 'Failed to update password');
        } finally {
            setLoading(false);
        }
    };

    const handleDeleteAccount = async () => {
        if (deleteConfirmText !== 'DELETE') {
            toast.error('Please type DELETE to confirm');
            return;
        }
        try {
            setLoading(true);
            await authAPI.deleteAccount();
            toast.success('Your account has been deleted successfully');
            localStorage.removeItem('jwt');
            localStorage.removeItem('user');
            window.location.href = '/login';
        } catch (error: any) {
            console.error('Error deleting account:', error);
            toast.error(error.response?.data?.message || 'Failed to delete account');
        } finally {
            setLoading(false);
            setDeleteAccountDialogOpen(false);
        }
    };

    const setDoor = (field: string, value: any) => {
        setDeliverySettings(prev => ({ ...prev, doordash: { ...prev.doordash, [field]: value } }));
    };
    const setUber = (field: string, value: any) => {
        setDeliverySettings(prev => ({ ...prev, ubereats: { ...prev.ubereats, [field]: value } }));
    };
    const setGrub = (field: string, value: any) => {
        setDeliverySettings(prev => ({ ...prev, grubhub: { ...prev.grubhub, [field]: value } }));
    };

    const remainingProviders = ALL_PROVIDERS.filter(p => !activePlatforms.includes(p));

    const handleAddPlatform = () => {
        if (remainingProviders.length === 0) return;
        setActivePlatforms(prev => [...prev, remainingProviders[0]]);
    };

    const handleRemovePlatform = (index: number) => {
        setActivePlatforms(prev => prev.filter((_, i) => i !== index));
    };

    const handleChangePlatformProvider = (index: number, nextProvider: DeliveryProvider) => {
        setActivePlatforms(prev => prev.map((p, i) => (i === index ? nextProvider : p)));
    };

    const handleSaveDeliverySettings = async () => {
        try {
            setDeliverySaving(true);
            const res = await superAPI.updateGlobalDeliverySettings(deliverySettings);
            setDeliverySettings({
                doordash: { ...emptyDoordash, ...res.data?.doordash },
                ubereats: { ...emptyUbereats, ...res.data?.ubereats },
                grubhub: { ...emptyGrubhub, ...res.data?.grubhub },
            });
            toast.success('Global delivery settings saved');
        } catch (error: any) {
            console.error('Error saving global delivery settings:', error);
            toast.error(error.response?.data?.message || 'Failed to save delivery settings');
        } finally {
            setDeliverySaving(false);
        }
    };

    return (
        <Box sx={{ p: { xs: 1, sm: 0 } }}>
            <Typography variant="h4" sx={{ mb: 3, fontWeight: 'bold' }}>
                My Profile
            </Typography>

            <Grid container spacing={3}>
                {/* Identity card */}
                <Grid size={{ xs: 12, md: 8 }}>
                    <Paper sx={{ p: 3 }}>
                        <Typography variant="h6" gutterBottom>Profile Information</Typography>
                        <Divider sx={{ mb: 3 }} />

                        <Grid container spacing={3}>
                            <Grid size={{ xs: 12 }} sx={{ display: 'flex', justifyContent: 'center', mb: 1 }}>
                                <Box sx={{ position: 'relative' }}>
                                    <Avatar
                                        src={profileData.profileImage}
                                        sx={{ width: 120, height: 120, bgcolor: 'error.main', fontSize: '3rem' }}
                                    >
                                        {profileData.firstName?.charAt(0)?.toUpperCase()}
                                    </Avatar>
                                    {avatarUploading && (
                                        <CircularProgress
                                            size={120}
                                            sx={{ position: 'absolute', top: 0, left: 0, color: 'error.main' }}
                                        />
                                    )}
                                    <IconButton
                                        sx={{ position: 'absolute', bottom: 0, right: 0, bgcolor: 'background.paper', '&:hover': { bgcolor: 'background.paper' } }}
                                        component="label"
                                        disabled={avatarUploading}
                                    >
                                        <PhotoCamera />
                                        <input hidden accept="image/*" type="file" onChange={handleAvatarUpload} />
                                    </IconButton>
                                </Box>
                            </Grid>

                            <Grid size={{ xs: 12, sm: 6 }}>
                                <TextField
                                    fullWidth label="First Name"
                                    value={profileData.firstName}
                                    onChange={(e) => handleProfileChange('firstName', e.target.value.replace(/[^a-zA-Z\s]/g, ''))}
                                    onBlur={() => handleProfileBlur('firstName')}
                                    error={hasError(profileErrors.firstName)}
                                    helperText={getHelperText(profileErrors.firstName)}
                                />
                            </Grid>
                            <Grid size={{ xs: 12, sm: 6 }}>
                                <TextField
                                    fullWidth label="Last Name"
                                    value={profileData.lastName}
                                    onChange={(e) => handleProfileChange('lastName', e.target.value.replace(/[^a-zA-Z\s]/g, ''))}
                                    onBlur={() => handleProfileBlur('lastName')}
                                    error={hasError(profileErrors.lastName)}
                                    helperText={getHelperText(profileErrors.lastName)}
                                />
                            </Grid>
                            <Grid size={{ xs: 12, sm: 6 }}>
                                <TextField
                                    fullWidth label="Email" type="email"
                                    value={profileData.email}
                                    slotProps={{ input: { readOnly: true } }}
                                    helperText="Contact support to change your email"
                                />
                            </Grid>
                            <Grid size={{ xs: 12, sm: 6 }}>
                                <PhoneInput
                                    value={profileData.phone}
                                    onChange={(val: string) => handleProfileChange('phone', val.replace(/\D/g, '').slice(0, 10))}
                                    dialCode={profileData.dialCode || '1'}
                                    onDialCodeChange={(code: string) => handleProfileChange('dialCode', code)}
                                    label="Phone" fullWidth
                                />
                            </Grid>
                            <Grid size={{ xs: 12 }}>
                                <Button variant="contained" color="error" startIcon={<SaveIcon />} onClick={handleProfileUpdate} disabled={loading}>
                                    Save Changes
                                </Button>
                            </Grid>
                        </Grid>
                    </Paper>

                    {/* Address card */}
                    <Paper sx={{ p: 3, mt: 3 }}>
                        <Typography variant="h6" gutterBottom>Address</Typography>
                        <Divider sx={{ mb: 3 }} />
                        <Grid container spacing={2}>
                            <Grid size={{ xs: 12 }}>
                                <TextField
                                    fullWidth label="Street"
                                    value={addressData.street}
                                    onChange={(e) => setAddressData(prev => ({ ...prev, street: e.target.value }))}
                                />
                            </Grid>
                            <Grid size={{ xs: 12, sm: 3 }}>
                                <TextField
                                    fullWidth label="City"
                                    value={addressData.city}
                                    onChange={(e) => setAddressData(prev => ({ ...prev, city: e.target.value }))}
                                />
                            </Grid>
                            <Grid size={{ xs: 12, sm: 3 }}>
                                <TextField
                                    fullWidth label="State"
                                    value={addressData.state}
                                    onChange={(e) => setAddressData(prev => ({ ...prev, state: e.target.value }))}
                                />
                            </Grid>
                            <Grid size={{ xs: 12, sm: 3 }}>
                                <TextField
                                    fullWidth label="Country"
                                    value={addressData.country}
                                    onChange={(e) => setAddressData(prev => ({ ...prev, country: e.target.value }))}
                                />
                            </Grid>
                            <Grid size={{ xs: 12, sm: 3 }}>
                                <TextField
                                    fullWidth label="ZIP"
                                    value={addressData.zipCode}
                                    onChange={(e) => setAddressData(prev => ({ ...prev, zipCode: e.target.value }))}
                                />
                            </Grid>
                            <Grid size={{ xs: 12 }}>
                                <Button variant="contained" color="error" startIcon={<SaveIcon />} onClick={handleAddressUpdate} disabled={loading}>
                                    Save Address
                                </Button>
                            </Grid>
                        </Grid>
                    </Paper>

                    {/* Danger Zone */}
                    <Card sx={{ mt: 3, borderColor: 'error.main', borderWidth: 1, borderStyle: 'solid', bgcolor: alpha(theme.palette.error.main, 0.02) }}>
                        <CardContent sx={{ p: 3 }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1, color: 'error.main' }}>
                                <DeleteIcon />
                                <Typography variant="h6" sx={{ fontWeight: 'bold' }}>Danger Zone</Typography>
                            </Box>
                            <Divider sx={{ mb: 2 }} />
                            <Grid container spacing={2} alignItems="center">
                                <Grid size={{ xs: 12, md: 8 }}>
                                    <Typography variant="subtitle1" fontWeight="bold" gutterBottom>Delete Account</Typography>
                                    <Typography variant="body2" color="text.secondary">
                                        Once you delete your account, there is no going back. All your personal data and preferences will be permanently removed.
                                    </Typography>
                                </Grid>
                                <Grid size={{ xs: 12, md: 4 }} sx={{ display: 'flex', justifyContent: { xs: 'flex-start', md: 'flex-end' } }}>
                                    <Button variant="contained" color="error" onClick={() => setDeleteAccountDialogOpen(true)} sx={{ px: 4 }}>
                                        Delete My Account
                                    </Button>
                                </Grid>
                            </Grid>
                        </CardContent>
                    </Card>
                </Grid>

                {/* Right column */}
                <Grid size={{ xs: 12, md: 4 }}>
                    {/* Change password */}
                    <Card sx={{ mb: 3 }}>
                        <CardContent sx={{ p: 3 }}>
                            <Typography variant="h6" gutterBottom>Change Password</Typography>
                            <Divider sx={{ mb: 2 }} />
                            <Grid container spacing={2}>
                                <Grid size={{ xs: 12 }}>
                                    <TextField
                                        fullWidth
                                        label="Current Password"
                                        type={showPassword ? 'text' : 'password'}
                                        value={passwordData.currentPassword}
                                        onChange={(e) => handlePasswordChange('currentPassword', e.target.value)}
                                        onBlur={() => handlePasswordBlur('currentPassword')}
                                        error={hasError(passwordErrors.currentPassword)}
                                        helperText={getHelperText(passwordErrors.currentPassword)}
                                        InputProps={{
                                            endAdornment: (
                                                <InputAdornment position="end">
                                                    <IconButton onClick={() => setShowPassword(!showPassword)} edge="end">
                                                        {showPassword ? <Visibility /> : <VisibilityOff />}
                                                    </IconButton>
                                                </InputAdornment>
                                            ),
                                        }}
                                    />
                                </Grid>
                                <Grid size={{ xs: 12 }}>
                                    <TextField
                                        fullWidth
                                        label="New Password"
                                        type={showPassword ? 'text' : 'password'}
                                        value={passwordData.newPassword}
                                        onChange={(e) => handlePasswordChange('newPassword', e.target.value)}
                                        onBlur={() => handlePasswordBlur('newPassword')}
                                        error={hasError(passwordErrors.newPassword)}
                                        helperText={getHelperText(passwordErrors.newPassword) || 'Minimum 8 characters'}
                                    />
                                </Grid>
                                <Grid size={{ xs: 12 }}>
                                    <TextField
                                        fullWidth
                                        label="Confirm Password"
                                        type={showPassword ? 'text' : 'password'}
                                        value={passwordData.confirmPassword}
                                        onChange={(e) => handlePasswordChange('confirmPassword', e.target.value)}
                                        onBlur={() => handlePasswordBlur('confirmPassword')}
                                        error={hasError(passwordErrors.confirmPassword)}
                                        helperText={getHelperText(passwordErrors.confirmPassword)}
                                    />
                                </Grid>
                                <Grid size={{ xs: 12 }}>
                                    <Button fullWidth variant="outlined" color="error" onClick={handlePasswordUpdate} disabled={loading}>
                                        Update Password
                                    </Button>
                                </Grid>
                            </Grid>
                        </CardContent>
                    </Card>

                    {/* Delivery platforms */}
                    <Card>
                        <CardContent sx={{ p: 3 }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                                <DeliveryIcon color="error" />
                                <Typography variant="h6">Delivery Platforms</Typography>
                                {deliveryLoading && <CircularProgress size={16} />}
                            </Box>
                            <Divider sx={{ mb: 2 }} />

                            {activePlatforms.map((provider, index) => (
                                <Box
                                    key={index}
                                    sx={{
                                        border: '1px solid',
                                        borderColor: deliverySettings[provider]?.enabled ? 'error.main' : 'divider',
                                        borderRadius: 2, p: 2, mb: 2,
                                    }}
                                >
                                    <Box display="flex" justifyContent="space-between" alignItems="center" mb={1.5} gap={1}>
                                        <Select
                                            size="small"
                                            value={provider}
                                            onChange={(e: SelectChangeEvent) => handleChangePlatformProvider(index, e.target.value as DeliveryProvider)}
                                            sx={{ minWidth: 140 }}
                                        >
                                            {ALL_PROVIDERS.map(p => (
                                                <MenuItem
                                                    key={p}
                                                    value={p}
                                                    disabled={p !== provider && activePlatforms.includes(p)}
                                                >
                                                    {PROVIDER_LABELS[p]}
                                                </MenuItem>
                                            ))}
                                        </Select>
                                        <Box display="flex" alignItems="center" gap={0.5}>
                                            <FormControlLabel
                                                sx={{ mr: 0 }}
                                                control={
                                                    <Switch
                                                        size="small"
                                                        checked={!!deliverySettings[provider]?.enabled}
                                                        onChange={e => {
                                                            const setter = provider === 'doordash' ? setDoor : provider === 'ubereats' ? setUber : setGrub;
                                                            setter('enabled', e.target.checked);
                                                        }}
                                                    />
                                                }
                                                label={deliverySettings[provider]?.enabled ? 'Enabled' : 'Disabled'}
                                            />
                                            {activePlatforms.length > 1 && (
                                                <IconButton size="small" onClick={() => handleRemovePlatform(index)} aria-label={`Remove ${PROVIDER_LABELS[provider]}`}>
                                                    <DeleteIcon fontSize="small" />
                                                </IconButton>
                                            )}
                                        </Box>
                                    </Box>

                                    {provider === 'doordash' && (
                                        <Box display="flex" flexDirection="column" gap={1.5}>
                                            <TextField size="small" fullWidth label="Developer ID" value={deliverySettings.doordash?.developerId || ''} onChange={e => setDoor('developerId', e.target.value)} />
                                            <TextField size="small" fullWidth label="Key ID" value={deliverySettings.doordash?.keyId || ''} onChange={e => setDoor('keyId', e.target.value)} />
                                            <TextField
                                                size="small" fullWidth label="Signing Secret"
                                                type={showDoorSecret ? 'text' : 'password'}
                                                value={deliverySettings.doordash?.signingSecret || ''}
                                                onChange={e => setDoor('signingSecret', e.target.value)}
                                                InputProps={{
                                                    endAdornment: (
                                                        <InputAdornment position="end">
                                                            <IconButton onClick={() => setShowDoorSecret(!showDoorSecret)} size="small">
                                                                {showDoorSecret ? <Visibility fontSize="small" /> : <VisibilityOff fontSize="small" />}
                                                            </IconButton>
                                                        </InputAdornment>
                                                    ),
                                                }}
                                            />
                                            <TextField size="small" fullWidth label="External Store ID" value={deliverySettings.doordash?.externalStoreId || ''} onChange={e => setDoor('externalStoreId', e.target.value)} />
                                            <FormControlLabel
                                                control={<Switch size="small" checked={!!deliverySettings.doordash?.isSandbox} onChange={e => setDoor('isSandbox', e.target.checked)} />}
                                                label="Sandbox mode"
                                            />
                                        </Box>
                                    )}

                                    {provider === 'ubereats' && (
                                        <Box display="flex" flexDirection="column" gap={1.5}>
                                            <TextField size="small" fullWidth label="Client ID" value={deliverySettings.ubereats?.clientId || ''} onChange={e => setUber('clientId', e.target.value)} />
                                            <TextField
                                                size="small" fullWidth label="Client Secret"
                                                type={showUberSecret ? 'text' : 'password'}
                                                value={deliverySettings.ubereats?.clientSecret || ''}
                                                onChange={e => setUber('clientSecret', e.target.value)}
                                                InputProps={{
                                                    endAdornment: (
                                                        <InputAdornment position="end">
                                                            <IconButton onClick={() => setShowUberSecret(!showUberSecret)} size="small">
                                                                {showUberSecret ? <Visibility fontSize="small" /> : <VisibilityOff fontSize="small" />}
                                                            </IconButton>
                                                        </InputAdornment>
                                                    ),
                                                }}
                                            />
                                            <TextField size="small" fullWidth label="Customer ID" value={deliverySettings.ubereats?.customerId || ''} onChange={e => setUber('customerId', e.target.value)} />
                                            <FormControlLabel
                                                control={<Switch size="small" checked={!!deliverySettings.ubereats?.isSandbox} onChange={e => setUber('isSandbox', e.target.checked)} />}
                                                label="Sandbox mode"
                                            />
                                        </Box>
                                    )}

                                    {provider === 'grubhub' && (
                                        <Box display="flex" flexDirection="column" gap={1.5}>
                                            <Alert severity="info" sx={{ py: 0.5 }}>
                                                Stored for reference only — no live Grubhub dispatch integration exists yet.
                                            </Alert>
                                            <TextField size="small" fullWidth label="Client ID" value={deliverySettings.grubhub?.clientId || ''} onChange={e => setGrub('clientId', e.target.value)} />
                                            <TextField
                                                size="small" fullWidth label="Client Secret"
                                                type={showGrubSecret ? 'text' : 'password'}
                                                value={deliverySettings.grubhub?.clientSecret || ''}
                                                onChange={e => setGrub('clientSecret', e.target.value)}
                                                InputProps={{
                                                    endAdornment: (
                                                        <InputAdornment position="end">
                                                            <IconButton onClick={() => setShowGrubSecret(!showGrubSecret)} size="small">
                                                                {showGrubSecret ? <Visibility fontSize="small" /> : <VisibilityOff fontSize="small" />}
                                                            </IconButton>
                                                        </InputAdornment>
                                                    ),
                                                }}
                                            />
                                            <TextField size="small" fullWidth label="Restaurant ID" value={deliverySettings.grubhub?.restaurantId || ''} onChange={e => setGrub('restaurantId', e.target.value)} />
                                            <FormControlLabel
                                                control={<Switch size="small" checked={!!deliverySettings.grubhub?.isSandbox} onChange={e => setGrub('isSandbox', e.target.checked)} />}
                                                label="Sandbox mode"
                                            />
                                        </Box>
                                    )}
                                </Box>
                            ))}

                            {remainingProviders.length > 0 && (
                                <Button
                                    fullWidth variant="outlined" color="error"
                                    startIcon={<AddIcon />}
                                    onClick={handleAddPlatform}
                                    sx={{ mb: 2, borderStyle: 'dashed' }}
                                >
                                    Add another platform
                                </Button>
                            )}

                            <Button
                                fullWidth variant="contained" color="error"
                                startIcon={deliverySaving ? <CircularProgress size={16} color="inherit" /> : <SaveIcon />}
                                onClick={handleSaveDeliverySettings}
                                disabled={deliverySaving || deliveryLoading}
                            >
                                {deliverySaving ? 'Saving...' : 'Save Delivery Settings'}
                            </Button>
                        </CardContent>
                    </Card>
                </Grid>
            </Grid>

            {/* Account Deletion Confirmation Dialog */}
            <Dialog open={deleteAccountDialogOpen} onClose={() => !loading && setDeleteAccountDialogOpen(false)} maxWidth="xs" fullWidth>
                <DialogTitle sx={{ color: 'error.main', fontWeight: 'bold' }}>Delete Account Permanently?</DialogTitle>
                <DialogContent>
                    <Typography variant="body2" sx={{ mb: 2 }}>
                        This action cannot be undone. This will permanently delete your profile and all associated data.
                    </Typography>
                    <Typography variant="body2" sx={{ mb: 2, fontWeight: 'bold' }}>
                        To confirm, please type "DELETE" in the box below:
                    </Typography>
                    <TextField
                        fullWidth
                        size="small"
                        placeholder="DELETE"
                        value={deleteConfirmText}
                        onChange={(e) => setDeleteConfirmText(e.target.value?.toUpperCase())}
                    />
                </DialogContent>
                <DialogActions sx={{ px: 3, pb: 2 }}>
                    <Button onClick={() => setDeleteAccountDialogOpen(false)} disabled={loading}>Cancel</Button>
                    <Button onClick={handleDeleteAccount} color="error" variant="contained" disabled={loading || deleteConfirmText !== 'DELETE'}>
                        {loading ? <CircularProgress size={24} /> : 'Permanently Delete Account'}
                    </Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
};

export default SuperAdminProfilePage;

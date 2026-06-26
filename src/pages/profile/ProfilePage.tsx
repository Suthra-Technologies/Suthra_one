import React, { useState, useEffect } from 'react';
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
    Chip,
    IconButton,
    InputAdornment,
    alpha,
    Alert,
    CircularProgress,
    Tooltip,
    Tabs,
    Tab,
    useTheme,
    useMediaQuery
} from '@mui/material';
import Grid from '@mui/material/Grid2';
import {
    Save as SaveIcon,
    PhotoCamera,
    Visibility,
    VisibilityOff,
    Edit as EditIcon,
    Add as AddIcon,
    Delete as DeleteIcon,
    Home as HomeIcon,
    Work as WorkIcon,
    LocationOn as LocationIcon,
    Star as StarIcon,
    StarBorder as StarBorderIcon,
    Close as CloseIcon,
    Payment as PaymentIcon,
    CreditCard as CreditCardIcon,
} from '@mui/icons-material';
import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    FormControl,
    InputLabel,
    Select,
    MenuItem,
    FormControlLabel,
    Checkbox,
} from '@mui/material';
import AddressAutocomplete from '../../components/AddressAutocomplete';
import { useAuth } from '../../context/AuthContext';
import { authAPI } from '../../services/api';
import { toast } from 'react-hot-toast';
import { useSettings } from '../../context/SettingsContext';
import { validateEmail, validatePhone, validateName, validatePassword, validateRequired, getHelperText, hasError } from '../../utils/validation';
import type { ValidationResult } from '../../utils/validation';
import PhoneInput from 'src/components/PhoneInput';

const ProfilePage: React.FC = () => {
    const { user, updateUserData, activeRole } = useAuth();
    const { settings } = useSettings();
    const [loading, setLoading] = useState(false);
    const [activeTab, setActiveTab] = useState(0);
    const [showPassword, setShowPassword] = useState(false);
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

    const [profileData, setProfileData] = useState({
        firstName: user?.firstName || '',
        lastName: user?.lastName || '',
        email: user?.email || '',
        phone: user?.phone || '',
        dialCode: (user as any)?.dialCode || settings?.restaurant?.dialCode || '1',
        profileImage: user?.profileImage || '',
        createdAt: (user as any)?.createdAt || '',
        hireDate: (user as any)?.hireDate || '',
    });

    const [savedAddresses, setSavedAddresses] = useState<any[]>(user?.savedAddresses || []);

    const [addressDialogOpen, setAddressDialogOpen] = useState(false);
    const [editingAddressIndex, setEditingAddressIndex] = useState<number | null>(null);
    const [deleteConfirm, setDeleteConfirm] = useState<{ open: boolean; index: number | null }>({
        open: false,
        index: null,
    });
    const [savedCards, setSavedCards] = useState<any[]>([]);
    const [cardDeleteConfirm, setCardDeleteConfirm] = useState<{ open: boolean; index: number | null }>({
        open: false,
        index: null,
    });
    const [deleteAccountDialogOpen, setDeleteAccountDialogOpen] = useState(false);
    const [deleteConfirmText, setDeleteConfirmText] = useState('');
    const [addressForm, setAddressForm] = useState({
        label: 'Home',
        street: '',
        city: '',
        state: '',
        zipCode: '',
        landmark: '',
        isDefault: false,
    });
    const [cardDialogOpen, setCardDialogOpen] = useState(false);
    const [cardForm, setCardForm] = useState({
        cardNumber: '',
        cardExpiry: '',
        cardCvc: '',
        isDefault: false,
    });

    useEffect(() => {
        const fetchProfile = async () => {
            try {
                setLoading(true);
                const response = await authAPI.getProfile();
                const userData = response.data;
                setProfileData({
                    firstName: userData.firstName || '',
                    lastName: userData.lastName || '',
                    email: userData.email || '',
                    phone: userData.phone || '',
                    dialCode: userData.dialCode || settings?.restaurant?.dialCode || '1',
                    profileImage: userData.profileImage || '',
                    createdAt: userData.createdAt || '',
                    hireDate: userData.hireDate || '',
                });
                setSavedAddresses(userData.savedAddresses || []);
                fetchSavedCards();
            } catch (error) {
                console.error('Error fetching profile:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchProfile();
    }, []);

    // Sync dial code with settings if still empty
    useEffect(() => {
        if (settings?.restaurant?.dialCode && !profileData.dialCode) {
            setProfileData(prev => ({ ...prev, dialCode: settings.restaurant.dialCode }));
        }
    }, [settings?.restaurant?.dialCode]);

    const [passwordData, setPasswordData] = useState({
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
    });

    const [profileErrors, setProfileErrors] = useState<Record<string, ValidationResult>>({});
    const [passwordErrors, setPasswordErrors] = useState<Record<string, ValidationResult>>({});

    const handleProfileChange = (field: string, value: string) => {
        setProfileData(prev => ({
            ...prev,
            [field]: value,
        }));
        // Clear error when user types
        if (profileErrors[field]) {
            setProfileErrors(prev => ({ ...prev, [field]: { isValid: true } }));
        }
    };

    // ensure phone input contains only digits and at most 10 characters
    const handlePhoneInput = (raw: string) => {
        const digitsOnly = raw.replace(/\D+/g, '');
        const limited = digitsOnly.slice(0, 10);
        handleProfileChange('phone', limited);
    };

    const handlePasswordChange = (field: string, value: string) => {
        setPasswordData(prev => ({
            ...prev,
            [field]: value,
        }));
        // Clear error when user types
        if (passwordErrors[field]) {
            setPasswordErrors(prev => ({ ...prev, [field]: { isValid: true } }));
        }
    };

    const handleProfileBlur = (field: string) => {
        const value = profileData[field as keyof typeof profileData];
        let validation: ValidationResult;

        switch (field) {
            case 'firstName':
                validation = validateName(value, 'First name');
                break;
            case 'lastName':
                validation = validateName(value, 'Last name');
                break;
            case 'email':
                validation = validateEmail(value);
                break;
            case 'phone':

                const cleaned = (value || '').toString().replace(/\D/g, '');
                if (!cleaned) {
                    validation = { isValid: true };
                } else if (cleaned.length < 10) {
                    validation = { isValid: true };
                } else {
                    validation = validatePhone(value);
                }
                break;
            default:
                validation = { isValid: true };
        }

        setProfileErrors(prev => ({ ...prev, [field]: validation }));
    };

    const handlePasswordBlur = (field: string) => {
        const value = passwordData[field as keyof typeof passwordData];
        let validation: ValidationResult;

        switch (field) {
            case 'currentPassword':
                validation = validateRequired(value, 'Current password');
                break;
            case 'newPassword':
                validation = validatePassword(value);
                break;
            case 'confirmPassword':
                if (value !== passwordData.newPassword) {
                    validation = { isValid: false, message: 'Passwords do not match' };
                } else {
                    validation = validateRequired(value, 'Confirm password');
                }
                break;
            default:
                validation = { isValid: true };
        }

        setPasswordErrors(prev => ({ ...prev, [field]: validation }));
    };

    const validateProfileForm = (): boolean => {
        const newErrors: Record<string, ValidationResult> = {
            firstName: validateName(profileData.firstName, 'First name'),
            lastName: validateName(profileData.lastName, 'Last name'),
            email: validateEmail(profileData.email),
            phone: validatePhone(profileData.phone),
        };

        setProfileErrors(newErrors);
        return Object.values(newErrors).every(v => v.isValid);
    };

    const validatePasswordForm = (): boolean => {
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

    const handleProfileUpdate = async () => {
        if (!validateProfileForm()) {
            toast.error('Please fix the errors in the form');
            return;
        }

        try {
            setLoading(true);
            await authAPI.updateProfile(profileData);
            toast.success('Profile updated successfully');
        } catch (error: any) {
            console.error('Error updating profile:', error);
            toast.error(error.response?.data?.message || 'Failed to update profile');
        } finally {
            setLoading(false);
        }
    };

    const handlePasswordUpdate = async () => {
        if (!validatePasswordForm()) {
            toast.error('Please fix the errors in the form');
            return;
        }

        try {
            setLoading(true);
            await authAPI.updateProfile({
                currentPassword: passwordData.currentPassword,
                newPassword: passwordData.newPassword,
            });
            toast.success('Password updated successfully');
            setPasswordData({
                currentPassword: '',
                newPassword: '',
                confirmPassword: '',
            });
            setPasswordErrors({});
        } catch (error: any) {
            console.error('Error updating password:', error);
            toast.error(error.response?.data?.message || 'Failed to update password');
        } finally {
            setLoading(false);
        }
    };

    const handleAvatarUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file) {
            // In a real app, you would upload to a server
            // For now, we'll just create a local URL
            const reader = new FileReader();
            reader.onloadend = () => {
                setProfileData(prev => ({
                    ...prev,
                    profileImage: reader.result as string,
                }));
            };
            reader.readAsDataURL(file);
        }
    };

    const handleOpenAddressDialog = (index: number | null = null) => {
        if (index !== null) {
            setEditingAddressIndex(index);
            setAddressForm(savedAddresses[index]);
        } else {
            setEditingAddressIndex(null);
            setAddressForm({
                label: 'Home',
                street: '',
                city: '',
                state: '',
                zipCode: '',
                landmark: '',
                isDefault: savedAddresses.length === 0,
            });
        }
        setAddressDialogOpen(true);
    };

    const handleSaveAddress = async () => {
        if (!addressForm.street) {
            toast.error('Street address is required');
            return;
        }

        let newAddresses = [...savedAddresses];
        if (addressForm.isDefault) {
            newAddresses = newAddresses.map(addr => ({ ...addr, isDefault: false }));
        }

        if (editingAddressIndex !== null) {
            newAddresses[editingAddressIndex] = addressForm;
        } else {
            newAddresses.push(addressForm);
        }

        try {
            setLoading(true);
            const response = await authAPI.updateProfile({ savedAddresses: newAddresses });
            const updatedAddresses = response.data.savedAddresses || [];
            setSavedAddresses(updatedAddresses);
            updateUserData({ savedAddresses: updatedAddresses });
            setAddressDialogOpen(false);
            toast.success(editingAddressIndex !== null ? 'Address updated' : 'Address added');
        } catch (error) {
            console.error('Error saving address:', error);
            toast.error('Failed to save address');
        } finally {
            setLoading(false);
        }
    };

    const handleDeleteAddress = async (index: number) => {
        setDeleteConfirm({ open: true, index });
    };

    const confirmDeleteAddress = async () => {
        const index = deleteConfirm.index;
        if (index === null) return;
        setDeleteConfirm({ open: false, index: null });

        const newAddresses = savedAddresses.filter((_, i) => i !== index);
        try {
            setLoading(true);
            const response = await authAPI.updateProfile({ savedAddresses: newAddresses });
            const updatedAddresses = response.data.savedAddresses || [];
            setSavedAddresses(updatedAddresses);
            updateUserData({ savedAddresses: updatedAddresses });
            toast.success('Address deleted');
        } catch (error) {
            console.error('Error deleting address:', error);
            toast.error('Failed to delete address');
        } finally {
            setLoading(false);
        }
    };

    const handleSetDefaultAddress = async (index: number) => {
        const isCurrentlyDefault = savedAddresses[index].isDefault;
        const newAddresses = savedAddresses.map((addr, i) => ({
            ...addr,
            isDefault: i === index ? !isCurrentlyDefault : false,
        }));

        try {
            setLoading(true);
            const response = await authAPI.updateProfile({ savedAddresses: newAddresses });
            const updatedAddresses = response.data.savedAddresses || [];
            setSavedAddresses(updatedAddresses);
            updateUserData({ savedAddresses: updatedAddresses });
            toast.success(isCurrentlyDefault ? 'Default address removed' : 'Default address updated');
        } catch (error) {
            console.error('Error setting default address:', error);
            toast.error('Failed to update default address');
        } finally {
            setLoading(false);
        }
    };

    const fetchSavedCards = async () => {
        try {
            const response = await authAPI.getCustomerCards();
            setSavedCards(response.data.savedCards || []);
        } catch (err) {
            console.error('Failed to fetch cards:', err);
        }
    };

    const handleDeleteCard = (index: number) => {
        setCardDeleteConfirm({ open: true, index });
    };

    const handleOpenCardDialog = () => {
        setCardForm({
            cardNumber: '',
            cardExpiry: '',
            cardCvc: '',
            isDefault: savedCards.length === 0,
        });
        setCardDialogOpen(true);
    };

    const handleSaveCard = async () => {
        const { cardNumber, cardExpiry, cardCvc } = cardForm;
        const cleanCardNum = cardNumber.replace(/\s/g, '');
        
        if (cleanCardNum.length < 15) {
            toast.error('Invalid card number');
            return;
        }
        if (cardExpiry.length < 5) {
            toast.error('Invalid expiry date (MM/YY)');
            return;
        }
        if (cardCvc.length < 3) {
            toast.error('Invalid CVC');
            return;
        }

        try {
            setLoading(true);
            const cardData = {
                brand: cleanCardNum.startsWith('4') ? 'Visa' : 
                       cleanCardNum.startsWith('5') ? 'Mastercard' : 
                       cleanCardNum.startsWith('3') ? 'Amex' : 'Card',
                last4: cleanCardNum.slice(-4),
                expMonth: cardExpiry.split('/')[0],
                expYear: cardExpiry.split('/')[1],
                isDefault: cardForm.isDefault
            };

            await authAPI.saveCustomerCard(cardData);
            toast.success('Card saved successfully');
            setCardDialogOpen(false);
            fetchSavedCards();
        } catch (error) {
            console.error('Error saving card:', error);
            toast.error('Failed to save card');
        } finally {
            setLoading(false);
        }
    };

    const confirmDeleteCard = async () => {
        const index = cardDeleteConfirm.index;
        if (index === null) return;
        setCardDeleteConfirm({ open: false, index: null });

        try {
            setLoading(true);
            await (authAPI as any).deleteCustomerCard(index);
            toast.success('Card removed successfully');
            fetchSavedCards();
        } catch (error) {
            console.error('Error deleting card:', error);
            toast.error('Failed to remove card');
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
            // Log out user
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

    return (
        <Box sx={{ p: { xs: 1, sm: 0 } }}>
            <Box sx={{ mb: { xs: 1, sm: 3 } }}>
                <Typography 
                    variant="h4" 
                    sx={{ 
                        mb: { xs: 0.5, sm: 2 }, 
                        textAlign: { xs: 'center', md: 'left' },
                        fontSize: { xs: '1.45rem', sm: '2.125rem' },
                        fontWeight: 'bold',
                        color: { xs: '#000', sm: 'inherit' },
                        whiteSpace: { xs: 'nowrap', sm: 'normal' }
                    }}
                >
                    My Profile
                </Typography>
            </Box>

            {/* Tabs */}
            <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: { xs: 1, sm: 3 } }}>
                <Tabs
                    value={activeTab}
                    onChange={(_, newVal) => setActiveTab(newVal)}
                    aria-label="profile tabs"
                    variant={isMobile ? 'scrollable' : 'standard'}
                    scrollButtons="auto"
                    sx={{
                        minHeight: { xs: 40, sm: 48 },
                        '& .MuiTab-root': {
                            fontSize: { xs: '0.75rem', sm: '0.875rem' },
                            minHeight: { xs: 40, sm: 48 },
                            px: { xs: 1, sm: 2 }
                        }
                    }}
                >
                    <Tab label="Profile" id="profile-tab-0" aria-controls="profile-tabpanel-0" />
                    {activeRole === 'customer' && (
                        <Tab label="Saved Addresses" id="profile-tab-1" aria-controls="profile-tabpanel-1" />
                    )}
                    {activeRole === 'customer' && (
                        <Tab label="Cards" id="profile-tab-2" aria-controls="profile-tabpanel-2" />
                    )}
                </Tabs>
            </Box>

            {/* ── TAB 0: Profile ── */}
            <Box role="tabpanel" hidden={activeTab !== 0} id="profile-tabpanel-0" aria-labelledby="profile-tab-0">
                {activeTab === 0 && (
                    <Grid container spacing={{ xs: 1, md: 3 }}>
                        {/* Profile Information Card */}
                        <Grid size={{ xs: 12, md: 8 }}>
                            <Paper sx={{ p: { xs: 1.5, md: 3 } }}>
                                <Typography variant="h6" gutterBottom sx={{ textAlign: { xs: 'center', md: 'left' }, fontSize: { xs: '1rem', md: '1.25rem' } }}>
                                    Profile Information
                                </Typography>
                                <Divider sx={{ mb: { xs: 1, md: 3 } }} />

                                <Grid container spacing={{ xs: 1.5, sm: 3 }}>
                                    <Grid size={{ xs: 12 }} sx={{ display: 'flex', justifyContent: 'center', mb: { xs: 1, md: 2 } }}>
                                        <Box sx={{ position: 'relative' }}>
                                            <Avatar
                                                src={profileData.profileImage}
                                                sx={{
                                                    width: { xs: 90, md: 120 },
                                                    height: { xs: 90, md: 120 },
                                                    bgcolor: 'primary.main',
                                                    fontSize: { xs: '2.2rem', md: '3rem' },
                                                }}
                                            >
                                                {profileData.firstName?.charAt(0)?.toUpperCase()}
                                            </Avatar>
                                            <IconButton
                                                sx={{
                                                    position: 'absolute',
                                                    bottom: 0,
                                                    right: 0,
                                                    bgcolor: 'background.paper',
                                                    '&:hover': { bgcolor: 'background.paper' },
                                                }}
                                                component="label"
                                            >
                                                <PhotoCamera />
                                                <input
                                                    hidden
                                                    accept="image/*"
                                                    type="file"
                                                    onChange={handleAvatarUpload}
                                                />
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
                                            onChange={(e) => handleProfileChange('email', e.target.value.toLowerCase())}
                                            onBlur={() => handleProfileBlur('email')}
                                            error={hasError(profileErrors.email)}
                                            helperText={getHelperText(profileErrors.email)}
                                        />
                                    </Grid>
                                    <Grid size={{ xs: 12, sm: 6 }}>
                                        <PhoneInput
                                            value={profileData.phone}
                                            onChange={(val) => {
                                                const clean = val.replace(/\D/g, '').slice(0, 10);
                                                handleProfileChange('phone', clean);
                                            }}
                                            dialCode={profileData.dialCode || '1'}
                                            onDialCodeChange={(code) => handleProfileChange('dialCode', code)}
                                            label="Phone" fullWidth
                                            onBlur={() => handleProfileBlur('phone')}
                                            error={hasError(profileErrors.phone)}
                                            helperText={getHelperText(profileErrors.phone) || "10-digit mobile number"}
                                        />
                                    </Grid>
                                    <Grid size={{ xs: 12 }} sx={{ display: 'flex', justifyContent: { xs: 'center', md: 'flex-start' } }}>
                                        <Button
                                            variant="contained" startIcon={<SaveIcon />}
                                            onClick={handleProfileUpdate} disabled={loading}
                                            sx={{ width: { xs: '100%', sm: 'auto' }, py: { xs: 1, sm: 1.5 } }}
                                        > Save Changes </Button>
                                    </Grid>
                                </Grid>
                            </Paper>
                        </Grid>

                        {/* Account Details Card */}
                        <Grid size={{ xs: 12, md: 4 }}>
                            <Card sx={{ mb: { xs: 2, md: 3 } }}>
                                <CardContent sx={{ p: { xs: 1.5, md: 2 } }}>
                                    <Typography variant="h6" gutterBottom sx={{ fontSize: { xs: '1rem', md: '1.25rem' } }}>
                                        Account Details
                                    </Typography>
                                    <Divider sx={{ mb: 1.5 }} />
                                    <Box sx={{ mb: 1.5 }}>
                                        <Typography variant="subtitle2" color="text.secondary" sx={{ fontSize: '0.75rem' }}> Role </Typography>
                                        <Chip label={user?.role?.toUpperCase() || 'USER'} color="primary" size="small" sx={{ mt: 0.5, height: 24, fontSize: '0.7rem' }} />
                                    </Box>
                                    <Box sx={{ mb: 1.5 }}>
                                        <Typography variant="subtitle2" color="text.secondary" sx={{ fontSize: '0.75rem' }}> Member Since </Typography>
                                        <Typography variant="body1" sx={{ fontSize: '0.9rem' }}>
                                            {(profileData.hireDate || profileData.createdAt) ? new Date(profileData.hireDate || profileData.createdAt).toLocaleDateString('en-US', { year: 'numeric', month: '2-digit', day: '2-digit' }) : 'N/A'}
                                        </Typography>
                                    </Box>
                                    <Box>
                                        <Typography variant="subtitle2" color="text.secondary" sx={{ fontSize: '0.75rem' }}> Status </Typography>
                                        <Chip label="Active" color="success" size="small" sx={{ mt: 0.5, height: 24, fontSize: '0.7rem' }} />
                                    </Box>
                                </CardContent>
                            </Card>

                            <Card>
                                <CardContent sx={{ p: { xs: 1.5, md: 2 } }}>
                                    <Typography variant="h6" gutterBottom sx={{ textAlign: { xs: 'center', md: 'left' }, fontSize: { xs: '1rem', md: '1.25rem' } }}>
                                        Change Password
                                    </Typography>
                                    <Divider sx={{ mb: 1.5 }} />

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
                                                            <IconButton
                                                                onClick={() => setShowPassword(!showPassword)}
                                                                edge="end"
                                                            >
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
                                                helperText={getHelperText(passwordErrors.newPassword) || "Minimum 6 characters"}
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
                                            <Button
                                                fullWidth
                                                variant="outlined"
                                                onClick={handlePasswordUpdate}
                                                disabled={loading}
                                            >
                                                Update Password
                                            </Button>
                                        </Grid>
                                    </Grid>
                                </CardContent>
                            </Card>
                        </Grid>

                        {/* Danger Zone */}
                        <Grid size={{ xs: 12 }}>
                            <Card sx={{ mt: 3, borderColor: 'error.main', borderWidth: 1, borderStyle: 'solid', bgcolor: alpha(theme.palette.error.main, 0.02) }}>
                                <CardContent sx={{ p: { xs: 2, md: 3 } }}>
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1, color: 'error.main' }}>
                                        <DeleteIcon />
                                        <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
                                            Danger Zone
                                        </Typography>
                                    </Box>
                                    <Divider sx={{ mb: 2 }} />
                                    <Grid container spacing={2} alignItems="center">
                                        <Grid size={{ xs: 12, md: 8 }}>
                                            <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
                                                Delete Account
                                            </Typography>
                                            <Typography variant="body2" color="text.secondary">
                                                Once you delete your account, there is no going back. All your personal data, saved addresses, and preferences will be permanently removed.
                                            </Typography>
                                        </Grid>
                                        <Grid size={{ xs: 12, md: 4 }} sx={{ display: 'flex', justifyContent: { xs: 'flex-start', md: 'flex-end' } }}>
                                            <Button 
                                                variant="contained" 
                                                color="error" 
                                                onClick={() => setDeleteAccountDialogOpen(true)}
                                                sx={{ px: 4 }}
                                            >
                                                Delete My Account
                                            </Button>
                                        </Grid>
                                    </Grid>
                                </CardContent>
                            </Card>
                        </Grid>
                    </Grid>
                )}
            </Box>

            {/* Account Deletion Confirmation Dialog */}
            <Dialog 
                open={deleteAccountDialogOpen} 
                onClose={() => !loading && setDeleteAccountDialogOpen(false)}
                maxWidth="xs"
                fullWidth
            >
                <DialogTitle sx={{ color: 'error.main', fontWeight: 'bold' }}>
                    Delete Account Permanently?
                </DialogTitle>
                <DialogContent>
                    <Typography variant="body2" sx={{ mb: 2 }}>
                        This action **cannot be undone**. This will permanently delete your profile, saved addresses, and all associated data.
                    </Typography>
                    <Typography variant="body2" sx={{ mb: 2, fontWeight: 'bold' }}>
                        To confirm, please type "DELETE" in the box below:
                    </Typography>
                    <TextField
                        fullWidth
                        size="small"
                        placeholder="DELETE"
                        value={deleteConfirmText}
                        onChange={(e) => setDeleteConfirmText(e.target.value.toUpperCase())}
                    />
                </DialogContent>
                <DialogActions sx={{ px: 3, pb: 2 }}>
                    <Button onClick={() => setDeleteAccountDialogOpen(false)} disabled={loading}>
                        Cancel
                    </Button>
                    <Button 
                        onClick={handleDeleteAccount} 
                        color="error" 
                        variant="contained"
                        disabled={loading || deleteConfirmText !== 'DELETE'}
                    >
                        {loading ? <CircularProgress size={24} /> : 'Permanently Delete Account'}
                    </Button>
                </DialogActions>
            </Dialog>

            {/* ── TAB 1: Saved Addresses (customer only) ── */}
            {activeRole === 'customer' && (
                <Box role="tabpanel" hidden={activeTab !== 1} id="profile-tabpanel-1" aria-labelledby="profile-tab-1">
                    {activeTab === 1 && (
                        <Paper sx={{ p: { xs: 2, md: 3 } }}>
                            <Box sx={{ 
                                display: 'flex', 
                                flexDirection: { xs: 'column', sm: 'row' },
                                justifyContent: 'space-between', 
                                alignItems: { xs: 'center', sm: 'center' }, 
                                gap: { xs: 1.5, sm: 0 },
                                mb: 2 
                            }}>
                                <Typography variant="h6" sx={{ fontSize: { xs: '1rem', md: '1.25rem' } }}>Saved Addresses</Typography>
                                <Button
                                    startIcon={<AddIcon />}
                                    variant="outlined"
                                    onClick={() => handleOpenAddressDialog()}
                                    size="small"
                                    sx={{ width: { xs: '100%', sm: 'auto' } }}
                                >
                                    Add New
                                </Button>
                            </Box>
                            <Divider sx={{ mb: { xs: 2, md: 3 } }} />

                            {savedAddresses.length === 0 ? (
                                <Box sx={{ textAlign: 'center', py: 4, color: 'text.secondary' }}>
                                    <LocationIcon sx={{ fontSize: 48, mb: 1, opacity: 0.5 }} />
                                    <Typography>No saved addresses yet. Add one to speed up your orders!</Typography>
                                </Box>
                            ) : (
                                <Grid container spacing={2}>
                                    {savedAddresses.map((addr, index) => (
                                        <Grid size={{ xs: 12, sm: 6, md: 4 }} key={index}>
                                            <Card variant="outlined" sx={{
                                                position: 'relative',
                                                borderColor: addr.isDefault ? 'primary.main' : 'divider',
                                                bgcolor: addr.isDefault ? 'action.hover' : 'background.paper'
                                            }}>
                                                <CardContent sx={{ pb: '16px !important' }}>
                                                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                                                        {addr.label === 'Home' ? <HomeIcon fontSize="small" sx={{ mr: 1 }} /> :
                                                            addr.label === 'Work' ? <WorkIcon fontSize="small" sx={{ mr: 1 }} /> :
                                                                <LocationIcon fontSize="small" sx={{ mr: 1 }} />}
                                                        <Typography variant="subtitle2" sx={{ fontWeight: 'bold' }}>
                                                            {addr.label}
                                                        </Typography>
                                                        {addr.isDefault && (
                                                            <Chip label="Default" size="small" color="primary" sx={{ ml: 1, height: 20, fontSize: '0.65rem' }} />
                                                        )}
                                                    </Box>
                                                    <Typography variant="body2" color="text.secondary">{addr.street}</Typography>
                                                    <Typography variant="body2" color="text.secondary">{addr.city}, {addr.state} {addr.zipCode}</Typography>
                                                    {addr.landmark && (
                                                        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5, fontStyle: 'italic' }}>
                                                            Landmark: {addr.landmark}
                                                        </Typography>
                                                    )}
                                                    <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 2 }}>
                                                        <Tooltip title={addr.isDefault ? 'Default Address' : 'Set as Default'}>
                                                            <IconButton size="small" onClick={() => handleSetDefaultAddress(index)} color={addr.isDefault ? 'primary' : 'default'}>
                                                                {addr.isDefault ? <StarIcon /> : <StarBorderIcon />}
                                                            </IconButton>
                                                        </Tooltip>
                                                        <IconButton size="small" onClick={() => handleOpenAddressDialog(index)}>
                                                            <EditIcon fontSize="small" />
                                                        </IconButton>
                                                        <IconButton size="small" color="error" onClick={() => handleDeleteAddress(index)}>
                                                            <DeleteIcon fontSize="small" />
                                                        </IconButton>
                                                    </Box>
                                                </CardContent>
                                            </Card>
                                        </Grid>
                                    ))}
                                </Grid>
                            )}
                        </Paper>
                    )}
                </Box>
            )}

            {/* ── TAB 2: Cards (customer only) ── */}
            {activeRole === 'customer' && (
                <Box role="tabpanel" hidden={activeTab !== 2} id="profile-tabpanel-2" aria-labelledby="profile-tab-2">
                    {activeTab === 2 && (
                        <Paper sx={{ p: { xs: 2, md: 3 } }}>
                            <Box sx={{ 
                                display: 'flex', 
                                flexDirection: { xs: 'column', sm: 'row' },
                                justifyContent: 'space-between', 
                                alignItems: { xs: 'center', sm: 'center' }, 
                                gap: { xs: 0.5, sm: 0 },
                                mb: 2 
                            }}>
                                <Typography variant="h6" sx={{ fontSize: { xs: '1rem', md: '1.25rem' } }}>Saved Cards</Typography>
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                                    <Typography variant="caption" color="text.secondary" sx={{ display: { xs: 'none', sm: 'block' } }}>
                                        Cards are saved for faster checkout
                                    </Typography>
                                    <Button
                                        variant="contained"
                                        startIcon={<AddIcon />}
                                        size="small"
                                        onClick={handleOpenCardDialog}
                                        sx={{ borderRadius: 2 }}
                                    >
                                        Add Card
                                    </Button>
                                </Box>
                            </Box>
                            <Divider sx={{ mb: { xs: 2, md: 3 } }} />
                            {savedCards.length === 0 ? (
                                <Box sx={{ textAlign: 'center', py: 6, color: 'text.secondary', bgcolor: 'grey.50', borderRadius: 2 }}>
                                    <CreditCardIcon sx={{ fontSize: 48, mb: 1, opacity: 0.5 }} />
                                    <Typography variant="body1">No saved cards yet.</Typography>
                                    <Typography variant="body2">You can save your card details during checkout for future use.</Typography>
                                </Box>
                            ) : (
                                <Grid container spacing={2}>
                                    {savedCards.map((card, index) => (
                                        <Grid size={{ xs: 12, sm: 6, md: 4 }} key={index}>
                                            <Card variant="outlined" sx={{ borderRadius: 2 }}>
                                                <CardContent>
                                                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
                                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                                            <PaymentIcon color="primary" />
                                                            <Typography variant="subtitle1" fontWeight="700">
                                                                {card.brand}
                                                            </Typography>
                                                        </Box>
                                                        <IconButton 
                                                            size="small" 
                                                            color="error"
                                                            onClick={() => handleDeleteCard(index)}
                                                        >
                                                            <DeleteIcon fontSize="small" />
                                                        </IconButton>
                                                    </Box>
                                                    <Typography variant="h6" letterSpacing={1} sx={{ mb: 1 }}>
                                                        •••• •••• •••• {card.last4}
                                                    </Typography>
                                                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
                                                        <Box>
                                                            <Typography variant="caption" color="text.secondary" display="block">
                                                                EXPIRES
                                                            </Typography>
                                                            <Typography variant="body2" fontWeight="500">
                                                                {card.expMonth}/{card.expYear}
                                                            </Typography>
                                                        </Box>
                                                        {card.isDefault && (
                                                            <Chip label="DEFAULT" size="small" variant="outlined" color="primary" sx={{ height: 20, fontSize: '0.65rem' }} />
                                                        )}
                                                    </Box>
                                                </CardContent>
                                            </Card>
                                        </Grid>
                                    ))}
                                </Grid>
                            )}
                        </Paper>
                    )}
                </Box>
            )}

            {/* Address Form Dialog */}
            <Dialog open={addressDialogOpen} onClose={() => setAddressDialogOpen(false)} maxWidth="sm" fullWidth>
                <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', pr: 1 }}>
                    {editingAddressIndex !== null ? 'Edit Address' : 'Add New Address'}
                    <IconButton
                        onClick={() => setAddressDialogOpen(false)}
                        sx={{
                            bgcolor: 'error.main',
                            color: '#fff',
                            '&:hover': { bgcolor: 'error.dark' },
                            borderRadius: 1,
                            p: '3px',
                            width: 24,
                            height: 24,
                        }}
                    >
                        <CloseIcon sx={{ fontSize: 16 }} />
                    </IconButton>
                </DialogTitle>
                <DialogContent dividers>
                    <Grid container spacing={2} sx={{ mt: 0.5 }}>
                        <Grid size={{ xs: 12, sm: 6 }}>
                            <FormControl fullWidth>
                                <InputLabel>Label</InputLabel>
                                <Select
                                    value={addressForm.label}
                                    label="Label"
                                    onChange={(e) => setAddressForm({ ...addressForm, label: e.target.value })}
                                >
                                    <MenuItem value="Home">Home</MenuItem>
                                    <MenuItem value="Work">Work</MenuItem>
                                    <MenuItem value="Office">Office</MenuItem>
                                    <MenuItem value="Other">Other</MenuItem>
                                </Select>
                            </FormControl>
                        </Grid>
                        <Grid size={{ xs: 12, sm: 6 }}>
                            <Button
                                fullWidth
                                variant={addressForm.isDefault ? "contained" : "outlined"}
                                color="primary"
                                onClick={() => setAddressForm(prev => ({ ...prev, isDefault: !prev.isDefault }))}
                                sx={{ height: '100%' }}
                            >
                                {addressForm.isDefault ? "Default Address" : "Set as Default"}
                            </Button>
                        </Grid>
                        <Grid size={{ xs: 12 }}>
                            <AddressAutocomplete
                                label="Search Address (Street, House No.)"
                                value={addressForm.street}
                                onChange={(val) => setAddressForm(prev => ({ ...prev, street: val }))}
                                onSelect={(addr) => setAddressForm(prev => ({
                                    ...prev,
                                    street: addr.street || addr.fullAddress,
                                    city: addr.city,
                                    state: addr.state,
                                    zipCode: addr.zipCode,
                                    landmark: addr.landmark,
                                }))}
                                apiKey={settings?.system?.googleMapsApiKey}
                            />
                        </Grid>
                        <Grid size={{ xs: 12, sm: 6 }}>
                            <TextField
                                fullWidth
                                label="City"
                                value={addressForm.city}
                                onChange={(e) => setAddressForm(prev => ({ ...prev, city: e.target.value }))}
                            />
                        </Grid>
                        <Grid size={{ xs: 12, sm: 6 }}>
                            <TextField
                                fullWidth
                                label="State"
                                value={addressForm.state}
                                onChange={(e) => setAddressForm(prev => ({ ...prev, state: e.target.value }))}
                            />
                        </Grid>
                        <Grid size={{ xs: 12, sm: 6 }}>
                            <TextField
                                fullWidth
                                label="Zip Code"
                                value={addressForm.zipCode}
                                onChange={(e) => setAddressForm(prev => ({ ...prev, zipCode: e.target.value }))}
                            />
                        </Grid>
                        <Grid size={{ xs: 12, sm: 6 }}>
                            <TextField
                                fullWidth
                                label="Landmark (Optional)"
                                value={addressForm.landmark}
                                onChange={(e) => setAddressForm(prev => ({ ...prev, landmark: e.target.value }))}
                            />
                        </Grid>
                    </Grid>
                </DialogContent>
                <DialogActions>
                    <Button onClick={handleSaveAddress} variant="contained" color="primary">
                        Save Address
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Delete Confirmation Dialog */}
            <Dialog
                open={deleteConfirm.open}
                onClose={() => setDeleteConfirm({ open: false, index: null })}
                maxWidth="xs"
                fullWidth
                PaperProps={{ sx: { borderRadius: 3, overflow: 'visible' } }}
            >
                <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', pb: 1 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Box sx={{
                            width: 36, height: 36, borderRadius: '50%',
                            bgcolor: 'error.light', display: 'flex',
                            alignItems: 'center', justifyContent: 'center',
                        }}>
                            <DeleteIcon sx={{ color: 'error.main', fontSize: 20 }} />
                        </Box>
                        <Typography fontWeight={700} fontSize="1.05rem">Delete Address</Typography>
                    </Box>
                    <IconButton
                        onClick={() => setDeleteConfirm({ open: false, index: null })}
                        sx={{
                            bgcolor: 'error.main', color: '#fff',
                            '&:hover': { bgcolor: 'error.dark' },
                            borderRadius: 1, p: '3px', width: 24, height: 24,
                        }}
                    >
                        <CloseIcon sx={{ fontSize: 16 }} />
                    </IconButton>
                </DialogTitle>
                <DialogContent>
                    <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                        Are you sure you want to delete this address? This action cannot be undone.
                    </Typography>
                </DialogContent>
                <DialogActions sx={{ px: 3, pb: 2, gap: 1 }}>
                    <Button
                        variant="outlined"
                        onClick={() => setDeleteConfirm({ open: false, index: null })}
                        sx={{ borderRadius: 2, flex: 1 }}
                    >
                        Cancel
                    </Button>
                    <Button
                        variant="contained"
                        color="error"
                        onClick={confirmDeleteAddress}
                        disabled={loading}
                        sx={{ borderRadius: 2, flex: 1 }}
                    >
                        Yes, Delete
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Card Delete Confirmation Dialog */}
            <Dialog
                open={cardDeleteConfirm.open}
                onClose={() => setCardDeleteConfirm({ open: false, index: null })}
                maxWidth="xs"
                fullWidth
                PaperProps={{ sx: { borderRadius: 3 } }}
            >
                <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <DeleteIcon color="error" />
                    <Typography fontWeight={700}>Remove Card</Typography>
                </DialogTitle>
                <DialogContent>
                    <Typography variant="body2" color="text.secondary">
                        Are you sure you want to remove this saved card? You will need to re-enter your details next time you order.
                    </Typography>
                </DialogContent>
                <DialogActions sx={{ p: 2, gap: 1 }}>
                    <Button
                        variant="outlined"
                        onClick={() => setCardDeleteConfirm({ open: false, index: null })}
                        sx={{ flex: 1 }}
                    >
                        Cancel
                    </Button>
                    <Button
                        variant="contained"
                        color="error"
                        onClick={confirmDeleteCard}
                        disabled={loading}
                        sx={{ flex: 1 }}
                    >
                        Remove
                    </Button>
                </DialogActions>
            </Dialog>
            <Dialog open={cardDialogOpen} onClose={() => setCardDialogOpen(false)} maxWidth="xs" fullWidth>
                <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', pr: 1 }}>
                    Add New Card
                    <IconButton
                        onClick={() => setCardDialogOpen(false)}
                        sx={{
                            bgcolor: 'error.main',
                            color: '#fff',
                            '&:hover': { bgcolor: 'error.dark' },
                            borderRadius: 1,
                            p: '3px',
                            width: 24,
                            height: 24,
                        }}
                    >
                        <CloseIcon sx={{ fontSize: 16 }} />
                    </IconButton>
                </DialogTitle>
                <DialogContent dividers>
                    <Box sx={{ mt: 1 }}>
                        <TextField
                            fullWidth
                            label="Card Number"
                            placeholder="0000 0000 0000 0000"
                            sx={{ mb: 2 }}
                            value={cardForm.cardNumber}
                            onChange={(e) => {
                                const val = e.target.value.replace(/\D/g, '').replace(/(.{4})/g, '$1 ').trim();
                                setCardForm({ ...cardForm, cardNumber: val.slice(0, 19) });
                            }}
                        />
                        <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
                            <TextField
                                fullWidth
                                label="Expiry Date"
                                placeholder="MM/YY"
                                value={cardForm.cardExpiry}
                                onChange={(e) => {
                                    let val = e.target.value.replace(/\D/g, '');
                                    if (val.length > 2) val = val.slice(0, 2) + '/' + val.slice(2, 4);
                                    setCardForm({ ...cardForm, cardExpiry: val.slice(0, 5) });
                                }}
                            />
                            <TextField
                                fullWidth
                                label="CVC"
                                placeholder="123"
                                value={cardForm.cardCvc}
                                onChange={(e) => setCardForm({ ...cardForm, cardCvc: e.target.value.replace(/\D/g, '').slice(0, 4) })}
                            />
                        </Box>
                        <FormControlLabel
                            control={
                                <Checkbox 
                                    checked={cardForm.isDefault} 
                                    onChange={(e) => setCardForm({ ...cardForm, isDefault: e.target.checked })} 
                                />
                            }
                            label="Set as default payment method"
                        />
                    </Box>
                </DialogContent>
                <DialogActions sx={{ p: 2 }}>
                    <Button onClick={() => setCardDialogOpen(false)}>Cancel</Button>
                    <Button 
                        variant="contained" 
                        onClick={handleSaveCard}
                        disabled={loading}
                        startIcon={loading && <CircularProgress size={20} color="inherit" />}
                    >
                        Save Card
                    </Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
};

export default ProfilePage;
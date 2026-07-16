import { useEffect, useState } from 'react';
import { toast } from 'react-hot-toast';
import Grid from '@mui/material/Grid2';
import { alpha } from '@mui/material/styles';
import {
  useTheme,
  useMediaQuery,
  Typography,
  Box,
  Card,
  CardContent,
  CardActions,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip,
  Switch,
  FormControlLabel,
  Tab,
  Tabs,
  IconButton,
  Avatar,
  Badge,
  Divider,
  Checkbox,
  Tooltip,
  Pagination,
  CircularProgress,
  Stack,
  InputAdornment,
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  AdminPanelSettings as AdminIcon,
  ManageAccounts as ManagerIcon,
  PointOfSale as CashierIcon,
  Restaurant as WaiterIcon,
  Kitchen as KitchenIcon,
  Lock as LockIcon,
  DeliveryDining as DeliveryDiningIcon,
  Close as CloseIcon,
  History as HistoryIcon,
  PersonAddAlt1 as ActivateIcon,
  PersonOff as DeactivateIcon,
  Person as CustomerIcon,
  Search as SearchIcon,
  DinnerDining as RunnerIcon,
  SettingsBackupRestore as RestoreIcon,
  Visibility as VisibilityIcon,
  VisibilityOff as VisibilityOffIcon,
} from '@mui/icons-material';
import { settingsAPI, usersAPI, supportAPI } from '../../services/api';
import { validateEmail, validatePhone, validateName, validatePassword, validateRequired, getHelperText, hasError } from '../../utils/validation';
import type { ValidationResult } from '../../utils/validation';
import AddressAutocomplete from '../../components/AddressAutocomplete';
import ActionHistoryList from '../../components/common/ActionHistoryList';
import { useAuth } from '../../context/AuthContext';
import { useSettings } from '../../context/SettingsContext';
import PhoneInput from '../../components/PhoneInput';

interface Address {
  street?: string;
  city?: string;
  state?: string;
  zipCode?: string;
}
interface EmergencyContact {
  name?: string;
  phone?: string;
  relationship?: string;
}
interface PermissionObj {
  module: string;
  actions: string[];
}
interface User {
  _id: string;
  firstName?: string;
  lastName?: string;
  email: string;
  phone?: string;
  countryCode?: string;
  role?: string; // deprecated
  roles?: string[];
  permissions?: (string | PermissionObj)[];
  isActive?: boolean;
  address?: Address;
  emergencyContact?: EmergencyContact;
  salary?: number;
  hireDate?: string;
  department?: string;

  shifts?: any;
  actionHistory?: any[];
  isPortalCustomer?: boolean;
  source?: string;
  isDeleted?: boolean;
  deletedAt?: string;
  deletedBy?: any;
}
const allPermissions = [
  'users.read', 'users.create', 'users.update', 'users.delete',
  'menu.read', 'menu.create', 'menu.update', 'menu.delete',
  'orders.read', 'orders.create', 'orders.update', 'orders.delete',
  'tables.read', 'tables.create', 'tables.update', 'tables.delete',
  'bookings.read', 'bookings.create', 'bookings.update', 'bookings.delete',
  'inventory.read', 'inventory.create', 'inventory.update', 'inventory.delete',
  'reports.read', 'reports.create', 'reports.export',
  'kot.read', 'kot.update',
  'pos.access', 'kitchen.access', 'settings.access',
  'dashboard.read', 'sales.read'
];

const getPermissionsForRoles = (selectedRoles: string[]) => {
  let mergedPermissions = new Set<string>();

  selectedRoles.forEach(role => {
    let rolePermissions: string[] = [];
    switch (role) {
      case 'admin':
        rolePermissions = [...allPermissions];
        break;
      case 'manager':
      case 'cashier':
        rolePermissions = allPermissions.filter(p => !p.startsWith('users.'));
        break;
      case 'waiter':
      case 'food_runner':
        rolePermissions = allPermissions.filter(p =>
          p.startsWith('orders.') ||
          p.startsWith('tables.') ||
          p.startsWith('bookings.') ||
          p === 'pos.access'
        );
        break;
      case 'kitchen_staff':
        rolePermissions = [
          'kitchen.access',
          'kot.read',
          'kot.update',
          'orders.read',
          'orders.update'
        ];
        break;
      case 'delivery':
        rolePermissions = ['orders.read', 'orders.update'];
        break;
      case 'customer':
        rolePermissions = ['orders.read', 'bookings.read'];
        break;
      default:
        rolePermissions = [];
    }
    rolePermissions.forEach(p => mergedPermissions.add(p));
  });

  return Array.from(mergedPermissions);
};

const DEPARTMENT_OPTIONS = [
  'Delivery',
  'Cleaning',
  'Accounts',
  'Kitchen',
  'Food Service',
  'Administration',
  'Customer'
];

const DEFAULT_ROLE = 'cashier';

const getRolesForUser = (user?: User | null): string[] => {
  if (!user) return [];

  if (Array.isArray(user.roles) && user.roles.length > 0) {
    return user.roles.filter(Boolean);
  }

  return user.role ? [user.role] : [];
};

const getPrimaryRole = (user?: User | null): string => getRolesForUser(user)[0] || DEFAULT_ROLE;

const isCustomerUser = (user?: User | null): boolean => {
  const roles = getRolesForUser(user);
  const isStrictlyCustomer = roles.length === 1 && roles.includes('customer');
  return isStrictlyCustomer || Boolean(user?.isPortalCustomer || user?.source === 'customer_portal');
};

const getPermissionStrings = (permissions?: User['permissions']): string[] => {
  if (!Array.isArray(permissions)) {
    return [];
  }

  return permissions.reduce((acc: string[], permission) => {
    if (typeof permission === 'string') {
      acc.push(permission);
      return acc;
    }

    if (permission?.module && Array.isArray(permission.actions)) {
      permission.actions.forEach((action) => {
        if (action) {
          acc.push(`${permission.module}.${action}`);
        }
      });
    }

    return acc;
  }, []);
};

const getSafeDateString = (value?: string, includeTime = false): string => {
  if (!value) return 'N/A';

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return 'N/A';
  }

  return includeTime ? date.toLocaleString() : date.toLocaleDateString();
};

const getDisplayName = (user?: User | null): string => {
  const fullName = `${user?.firstName || ''} ${user?.lastName || ''}`.trim();
  return fullName || user?.email || 'Unnamed user';
};

const extractUsersFromResponse = (payload: unknown): User[] => {
  if (Array.isArray(payload)) {
    return payload;
  }

  if (payload && typeof payload === 'object') {
    const candidate = payload as { data?: unknown; users?: unknown };

    if (Array.isArray(candidate.data)) {
      return candidate.data as User[];
    }

    if (Array.isArray(candidate.users)) {
      return candidate.users as User[];
    }
  }

  return [];
};

const UsersPage = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const headingFontSize = { xs: '1.12rem', sm: '1.4rem', md: '2.125rem' };
  const bodyFontSize = { xs: '0.78rem', sm: '0.88rem', md: '0.95rem' };
  const { settings } = useSettings();
  const { activeRole, user: currentUser } = useAuth();
  const [tabValue, setTabValue] = useState(0);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalRecords, setTotalRecords] = useState(0);
  const [counts, setCounts] = useState({ all: 0, management: 0, staff: 0, customers: 0, inactive: 0, deleted: 0 });
  const ROWS_PER_PAGE = 10;

  // Dialog states
  const [userDialog, setUserDialog] = useState(false);
  const [passwordDialog, setPasswordDialog] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showResetPassword, setShowResetPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [dialogTab, setDialogTab] = useState(0);

  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [openDeleteDialog, setOpenDeleteDialog] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null);
  const [openStatusDialog, setOpenStatusDialog] = useState(false);
  const [statusTarget, setStatusTarget] = useState<User | null>(null);
  const [openRestoreDialog, setOpenRestoreDialog] = useState(false);
  const [restoreTarget, setRestoreTarget] = useState<User | null>(null);
  const [showPermissions, setShowPermissions] = useState(false);

  // Form states
  const [userForm, setUserForm] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    countryCode: '',
    roles: [DEFAULT_ROLE] as string[],
    permissions: getPermissionsForRoles([DEFAULT_ROLE]) as string[],
    isActive: true,
    address: {
      street: '',
      city: '',
      state: '',
      zipCode: ''
    },
    emergencyContact: {
      name: '',
      phone: '',
      relationship: ''
    },
    salary: '',
    hireDate: new Date().toISOString().split('T')[0],
    department: '',
    password: ''
  });

  const [passwordForm, setPasswordForm] = useState({
    newPassword: '',
    confirmPassword: ''
  });

  const [userErrors, setUserErrors] = useState<Record<string, ValidationResult>>({});
  const [passwordErrors, setPasswordErrors] = useState<Record<string, ValidationResult>>({});

  const roles = [
    { value: 'admin', label: 'Administrator', icon: AdminIcon, color: '#f44336' },
    { value: 'manager', label: 'Manager', icon: ManagerIcon, color: '#ff9800' },
    { value: 'cashier', label: 'Cashier', icon: CashierIcon, color: '#2196f3' },
    { value: 'waiter', label: 'Waiter', icon: WaiterIcon, color: '#4caf50' },
    { value: 'kitchen_staff', label: 'Kitchen Staff', icon: KitchenIcon, color: '#9c27b0' },
    { value: 'food_runner', label: 'Food Runner', icon: RunnerIcon, color: '#8bc34a' },
    { value: 'delivery', label: 'Delivery', icon: DeliveryDiningIcon, color: '#795548' },
    { value: 'customer', label: 'Customer', icon: CustomerIcon, color: '#607d8b' },
  ];

  const [googleMapsApiKey, setGoogleMapsApiKey] = useState(import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '');

  useEffect(() => {
    fetchUsers();
    fetchSettings();
  }, [page, tabValue]);

  const fetchSettings = async () => {
    try {
      const response = await settingsAPI.getAll();
      if (Array.isArray(response.data)) {
        const systemSettings = response.data.find((s: any) => s.category === 'system')?.settings;
        if (systemSettings?.googleMapsApiKey) {
          setGoogleMapsApiKey(systemSettings.googleMapsApiKey);
        }
      } else if (response.data?.system?.googleMapsApiKey) {
        setGoogleMapsApiKey(response.data.system.googleMapsApiKey);
      }
    } catch (error) {
      console.error('Failed to fetch settings for API key', error);
    }
  };

  const fetchUsers = async () => {
    setLoading(true);
    try {
      let roleFilter: string | undefined = 'all';
      let activeFilter: boolean | undefined = undefined;
      let deletedFilter: boolean | undefined = undefined;

      switch (tabValue) {
        case 0:
          roleFilter = 'all';
          break;
        case 1:
          roleFilter = 'management';
          break;
        case 2:
          roleFilter = 'staff';
          break;
        case 3:
          roleFilter = 'customer';
          break;
        case 4:
          roleFilter = 'all';
          activeFilter = false;
          break;
        case 5:
          roleFilter = 'all';
          deletedFilter = true;
          break;
      }

      const response = await usersAPI.getUsers({
        page,
        limit: ROWS_PER_PAGE,
        role: roleFilter,
        isActive: activeFilter,
        isDeleted: deletedFilter
      });

      const extracted = extractUsersFromResponse(response.data);
      if (tabValue === 0) {
        // Show only staff in "All Staff"
        setUsers(extracted.filter(u => !isCustomerUser(u)));
      } else if (tabValue === 5) {
        // Show all deleted users
        setUsers(extracted);
      } else {
        const showCustomers = tabValue === 3;
        setUsers(extracted.filter(u => showCustomers ? isCustomerUser(u) : !isCustomerUser(u)));
      }
      setTotalRecords(response.data.total || response.data.totalRecords || extracted.length);
      setTotalPages(Math.ceil((response.data.total || response.data.totalRecords || extracted.length) / ROWS_PER_PAGE));
      if (response.data.counts) {
        setCounts(response.data.counts);
      }
    } catch (err: any) {
      toast.error('Failed to fetch users: ' + (err.response?.data?.message || err.message));
      setUsers([]);
    } finally {
      setLoading(false);
    }
  };

  const validateUserForm = (): boolean => {
    const isCustomer = userForm.roles.includes('customer');
    const newErrors: Record<string, ValidationResult> = {
      firstName: validateName(userForm.firstName, 'First name'),
      lastName: validateName(userForm.lastName, 'Last name'),
      email: validateEmail(userForm.email),
      phone: validatePhone(userForm.phone, userForm.countryCode),
      salary: isCustomer
        ? { isValid: true }
        : (!userForm.salary || userForm.salary.trim() === ''
          ? { isValid: false, message: 'Salary is required' }
          : parseFloat(userForm.salary) <= 0
            ? { isValid: false, message: 'Salary must be greater than 0' }
            : { isValid: true }),
      hireDate: isCustomer
        ? { isValid: true }
        : (!userForm.hireDate || userForm.hireDate.trim() === ''
          ? { isValid: false, message: 'Hire date is required' }
          : { isValid: true }),
      street: isCustomer ? validateRequired(userForm.address.street, 'Street Address') : { isValid: true },
      city: isCustomer ? validateRequired(userForm.address.city, 'City') : { isValid: true },
      state: isCustomer ? validateRequired(userForm.address.state, 'State') : { isValid: true },
      zipCode: isCustomer ? validateRequired(userForm.address.zipCode, 'Zip Code') : { isValid: true },
    };

    setUserErrors(newErrors);
    return Object.values(newErrors).every(v => v.isValid);
  };

  const validatePasswordForm = (): boolean => {
    const newErrors: Record<string, ValidationResult> = {
      newPassword: validatePassword(passwordForm.newPassword),
      confirmPassword: passwordForm.newPassword !== passwordForm.confirmPassword
        ? { isValid: false, message: 'Passwords do not match' }
        : validatePassword(passwordForm.confirmPassword),
    };

    setPasswordErrors(newErrors);
    return Object.values(newErrors).every(v => v.isValid);
  };

  const handleUserSubmit = async () => {
    if (submitting) return;
    // Validate critical fields
    if (!validateUserForm()) {
      toast.error('Please fill all the required fields');
      return;
    }

    try {
      setSubmitting(true);
      const convertedPermissions = userForm.permissions.reduce((acc: PermissionObj[], perm: string) => {
        const [module, action] = perm.split('.');
        const existingModule = acc.find(p => p.module === module);
        if (existingModule) {
          if (!existingModule.actions.includes(action)) {
            existingModule.actions.push(action);
          }
        } else {
          acc.push({ module, actions: [action] });
        }
        return acc;
      }, []);
      const formData: any = {
        firstName: userForm.firstName.trim(),
        lastName: userForm.lastName.trim(),
        email: userForm.email?.toLowerCase().trim(),
        phone: userForm.phone.trim(),
        countryCode: userForm.countryCode,
        roles: userForm.roles,
        permissions: convertedPermissions,
        isActive: userForm.isActive !== false,
        salary: userForm.salary ? parseFloat(userForm.salary) : 0,
        hireDate: userForm.hireDate ? new Date(userForm.hireDate).toISOString() : new Date().toISOString(),
        department: userForm.department?.trim() || '',
        password: userForm.password
      };
      if (userForm.address.street || userForm.address.city) {
        formData.address = {
          street: userForm.address.street?.trim() || '',
          city: userForm.address.city?.trim() || '',
          state: userForm.address.state?.trim() || '',
          zipCode: userForm.address.zipCode?.trim() || ''
        };
      }
      if (userForm.emergencyContact.name || userForm.emergencyContact.phone) {
        formData.emergencyContact = {
          name: userForm.emergencyContact.name?.trim() || '',
          phone: userForm.emergencyContact.phone?.trim() || '',
          relationship: userForm.emergencyContact.relationship?.trim() || ''
        };
      }
      if (editingUser) {
        await usersAPI.updateUser(editingUser._id, formData);
        toast.success('User updated successfully');
      } else {
        // Don't set password here, backend will handle welcome email
        await usersAPI.createUser(formData);
        toast.success('User created successfully');
      }
      closeUserDialog();
      resetUserForm();
      await fetchUsers();
    } catch (err: any) {
      console.error('User submit error:', err);
      // Prioritize 'error' field which contains subscription limit messages
      const errorMessage = err.response?.data?.error || err.response?.data?.message || err.message || 'Failed to save user';
      toast.error(errorMessage);
      if (err.response?.data?.validation) {
        const validationErrors = Object.entries(err.response.data.validation)
          .map(([field, message]) => `${field}: ${message}`)
          .join(', ');
        toast.error(`Validation errors: ${validationErrors}`);
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handlePasswordReset = async () => {
    if (submitting) return;
    if (!selectedUser?._id) {
      toast.error('No user selected for password reset');
      return;
    }

    if (!validatePasswordForm()) {
      toast.error('Please fix the errors in the form');
      return;
    }

    try {
      setSubmitting(true);
      await usersAPI.resetPassword(selectedUser._id, {
        newPassword: passwordForm.newPassword
      });
      toast.success('Password reset successfully');
      closePasswordDialog();
    } catch (err: any) {
      toast.error('Failed to reset password: ' + (err.response?.data?.message || err.message));
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleStatus = (user: User) => {
    setStatusTarget(user);
    setOpenStatusDialog(true);
  };

  const confirmToggleStatus = async (userId: string) => {
    if (submitting) return;
    setSubmitting(true);
    try {
      await usersAPI.toggleUserStatus(userId);
      toast.success('User status updated successfully');
      await fetchUsers();
    } catch (err: any) {
      toast.error('Failed to update user status: ' + (err.response?.data?.message || err.message));
    } finally {
      closeStatusDialog();
    }
  };

  const handleDeleteUser = (user: User) => {
    setDeleteTarget({ id: user._id, name: `${user.firstName} ${user.lastName}` });
    setOpenDeleteDialog(true);
  };

  const confirmDeleteUser = async () => {
    if (submitting) return;
    if (!deleteTarget) return;

    setSubmitting(true);
    try {
      // 1. Check if we should delete directly or raise a ticket
      // In theory, if the button was enabled, it depends on who is target and who is actor
      const targetUser = users.find(u => u._id === deleteTarget.id);
      const isSuperAdmin = activeRole === 'superadmin' || currentUser?.roles?.includes('superadmin');
      const isAdmin = activeRole === 'admin' || currentUser?.roles?.includes('admin');
      const targetIsAdmin = targetUser?.roles?.includes('admin') || targetUser?.role === 'admin';

      if (isSuperAdmin || (isAdmin && !targetIsAdmin)) {
        // DELETE DIRECTLY
        await usersAPI.deleteUser(deleteTarget.id);
        toast.success(`User "${deleteTarget.name}" deleted successfully`);
        await fetchUsers();
      } else {
        // RAISE TICKET (if an admin is trying to delete an admin, or other restricted case)
        await supportAPI.create({
          subject: `User Deletion Request: ${deleteTarget.name}`,
          category: 'User Deletion',
          priority: 'high',
          message: `I would like to request the permanent deletion of user "${deleteTarget.name}" (ID: ${deleteTarget.id}) from the system. Please review and confirm the request.`
        });
        toast.success('Deletion request has been sent to the Super Admin');
      }
      closeDeleteDialog();
    } catch (err: any) {
      toast.error('Deletion failed: ' + (err.response?.data?.message || err.message));
    } finally {
      setSubmitting(false);
    }
  };

  const handleRestoreUser = (user: User) => {
    setRestoreTarget(user);
    setOpenRestoreDialog(true);
  };

  const confirmRestoreUser = async () => {
    if (!restoreTarget || submitting) return;
    setSubmitting(true);
    try {
      await usersAPI.restoreUser(restoreTarget._id);
      toast.success(`User "${restoreTarget.firstName} ${restoreTarget.lastName}" restored successfully`);
      closeRestoreDialog();
      await fetchUsers();
    } catch (err: any) {
      toast.error('Failed to restore user: ' + (err.response?.data?.message || err.message));
    } finally {
      setSubmitting(false);
    }
  };

  const closeRestoreDialog = () => {
    setOpenRestoreDialog(false);
    setRestoreTarget(null);
  };

  const closeUserDialog = () => {
    setUserDialog(false);
    setDialogTab(0);
    setUserErrors({});
    setShowPermissions(false);
  };

  const closePasswordDialog = () => {
    setPasswordDialog(false);
    resetPasswordForm();
  };

  const closeDeleteDialog = () => {
    setOpenDeleteDialog(false);
    setDeleteTarget(null);
  };

  const closeStatusDialog = () => {
    setOpenStatusDialog(false);
    setStatusTarget(null);
  };

  const resetUserForm = () => {
    setUserForm({
      firstName: '',
      lastName: '',
      email: '',
      phone: '',
      countryCode: settings?.restaurant?.dialCode || '',
      roles: [DEFAULT_ROLE],
      permissions: getPermissionsForRoles([DEFAULT_ROLE]),
      isActive: true,
      address: {
        street: '',
        city: '',
        state: '',
        zipCode: ''
      },
      emergencyContact: {
        name: '',
        phone: '',
        relationship: ''
      },
      salary: '',
      hireDate: new Date().toISOString().split('T')[0],
      department: '',
      password: ''
    });
    setEditingUser(null);
    setDialogTab(0);
    setUserErrors({});
    setShowPermissions(false);
  };

  const resetPasswordForm = () => {
    setPasswordForm({
      newPassword: '',
      confirmPassword: ''
    });
    setPasswordErrors({});
    setSelectedUser(null);
  };

  const openEditUser = (user: User, initialTab: number = 0) => {
    const resolvedRoles = getRolesForUser(user);
    const convertedPermissions = getPermissionStrings(user.permissions);

    setUserForm({
      firstName: user.firstName || '',
      lastName: user.lastName || '',
      email: user.email || '',
      phone: user.phone || '',
      countryCode: user.countryCode || settings?.restaurant?.dialCode || '',
      roles: resolvedRoles,
      permissions: convertedPermissions.length > 0 ? convertedPermissions : getPermissionsForRoles(resolvedRoles),
      isActive: user.isActive !== false,
      address: {
        street: user.address?.street || '',
        city: user.address?.city || '',
        state: user.address?.state || '',
        zipCode: user.address?.zipCode || ''
      },
      emergencyContact: {
        name: user.emergencyContact?.name || '',
        phone: user.emergencyContact?.phone || '',
        relationship: user.emergencyContact?.relationship || ''
      },
      salary: user.salary?.toString() || '',
      hireDate: user.hireDate ? new Date(user.hireDate).toISOString().split('T')[0] : '',
      department: user.department || '',
      password: ''
    });
    setEditingUser(user);
    setDialogTab(initialTab);
    setUserErrors({});
    setShowPermissions(false);
    setUserDialog(true);
  };

  const openPasswordReset = (user: User) => {
    setSelectedUser(user);
    setPasswordDialog(true);
  };

  const getRoleInfo = (role: string) => {
    return roles.find(r => r.value === role) || roles[0];
  };

  const getUserName = (actor: string) => {
    if (!actor) return 'Unknown';

    // Extract email from "Name <email@domain.com>" format if present
    const emailMatch = actor.match(/<(.+?)>/);
    const actorEmail = emailMatch ? emailMatch[1] : actor;

    const searchEmail = actorEmail.trim()?.toLowerCase();
    const user = users.find(u => u.email?.trim()?.toLowerCase() === searchEmail);

    if (user) {
      if (user.firstName || user.lastName) {
        return `${user.firstName || ''} ${user.lastName || ''}`.trim();
      }
      return user.email;
    }

    // If not found as email, it might already be a name or a partial identifier
    return actor.split('<')[0].trim();
  };

  useEffect(() => {
    if (settings?.restaurant?.dialCode && !editingUser && !userForm.countryCode) {
      setUserForm(prev => ({ ...prev, countryCode: settings.restaurant.dialCode }));
    }
  }, [settings?.restaurant?.dialCode, editingUser]);



  const getStatusColor = (user: User) => {
    const primaryRole = getPrimaryRole(user);

    if (!user.isActive) return 'error';
    if (primaryRole === 'admin') return 'error';
    if (primaryRole === 'manager') return 'warning';
    return 'success';
  };

  const handleRolesChange = (selectedRoles: string[]) => {
    setUserForm(prev => ({
      ...prev,
      roles: selectedRoles,
      permissions: getPermissionsForRoles(selectedRoles)
    }));
  };
  
  const generateRandomPassword = () => {
    if (!userForm.firstName) {
      toast.error('Please enter first name first');
      return;
    }
    const trimmedName = userForm.firstName.trim();
    const randomDigits = Math.floor(100 + Math.random() * 900);
    const generated = `${trimmedName}${randomDigits}`;
    setUserForm(prev => ({ ...prev, password: generated }));
    toast.success('Password generated!');
  };

  return (
    <Box sx={{ 
      pb: { xs: 8, sm: 4 }, 
      px: { xs: 0, sm: 3 },
      pt: { xs: isMobile ? '20px' : 0, sm: 0 },
      bgcolor: { xs: alpha(theme.palette.background.default, 0.4), sm: 'transparent' },
      minHeight: '100vh'
    }}>
      <Box sx={{
        display: 'flex',
        flexDirection: { xs: 'column', sm: 'row' },
        justifyContent: 'space-between',
        alignItems: { xs: 'center', sm: 'center' },
        gap: { xs: 2.5, sm: 2 },
        mb: { xs: 2.5, sm: 4 },
        px: { xs: 2, sm: 0 }
      }}>
        <Box sx={{ textAlign: { xs: 'center', sm: 'left' } }}>
          <Typography
            variant="h4"
            sx={{
              fontWeight: 800,
              fontFamily: "'Outfit', sans-serif",
              fontSize: headingFontSize,
              color: { xs: '#000', sm: 'text.primary' },
              letterSpacing: '-0.02em',
              mb: 0.5
            }}
          >
            User Management
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 500, fontSize: bodyFontSize }}>
            Manage staff members and their permissions
          </Typography>
        </Box>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => {
            resetUserForm();
            if (tabValue === 3) {
              setUserForm(prev => ({
                ...prev,
                roles: ['customer'],
                permissions: getPermissionsForRoles(['customer'])
              }));
            }
            setUserDialog(true);
          }}
          sx={{ 
            width: { xs: '100%', sm: 'auto' },
            borderRadius: 3,
            py: { xs: 0.8, sm: 1 },
            px: { xs: 3, sm: 2.5 },
            textTransform: 'none',
            fontWeight: 800,
            fontFamily: "'Outfit', sans-serif",
            fontSize: bodyFontSize,
            boxShadow: `0 8px 16px ${alpha(theme.palette.primary.main, 0.25)}`,
            '&:hover': {
              boxShadow: `0 12px 20px ${alpha(theme.palette.primary.main, 0.35)}`,
            }
          }}
        >
          Add User
        </Button>
      </Box>
      <Tabs
        value={tabValue}
        onChange={(e, newValue) => {
          setTabValue(newValue);
          setPage(1);
        }}
        variant="scrollable"
        scrollButtons="auto"
        sx={{
          mb: { xs: 2, sm: 3 },
          mx: { xs: 2, sm: 0 },
          borderBottom: 1,
          borderColor: 'divider',
          '& .MuiTabs-scrollButtons': {
            '&.Mui-disabled': { opacity: 0.3 },
          },
          '& .MuiTab-root': {
            fontSize: bodyFontSize,
            minHeight: { xs: 42, sm: 48 },
            px: { xs: 1.4, sm: 2 },
            textTransform: 'none',
            fontWeight: 700,
            fontFamily: "'Outfit', sans-serif",
            color: 'text.secondary',
            '&.Mui-selected': {
              color: 'primary.main',
            }
          }
        }}
      >
        <Tab label={`All Staff (${counts.all})`} />
        <Tab label={`Management (${counts.management})`} />
        <Tab label={`Staff (${counts.staff})`} />
        <Tab label={`Customers (${counts.customers})`} />
        <Tab
          label={
            <Badge badgeContent={counts.inactive} color="error" sx={{ '& .MuiBadge-badge': { right: -10, top: 4 } }}>
              Inactive
            </Badge>
          }
        />
        <Tab
          label={
            <Badge badgeContent={counts.deleted || 0} color="warning" sx={{ '& .MuiBadge-badge': { right: -10, top: 4 } }}>
              Deleted
            </Badge>
          }
        />
      </Tabs>
      {/* Users Display */}
      <Box>
        {loading ? (
          <Box sx={{ 
            display: 'flex', 
            flexDirection: 'column', 
            alignItems: 'center', 
            justifyContent: 'center', 
            minHeight: '350px', 
            gap: 2,
            bgcolor: alpha(theme.palette.background.paper, 0.4),
            backdropFilter: 'blur(8px)',
            borderRadius: 4,
            border: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
            m: { xs: 2, sm: 0 },
            py: 6
          }}>
            <CircularProgress size={50} thickness={4.5} sx={{ color: 'primary.main' }} />
            <Typography variant="h6" sx={{ color: 'text.secondary', fontWeight: 700, fontFamily: "'Outfit', sans-serif" }}>
              Loading Users...
            </Typography>
          </Box>
        ) : users.length === 0 ? (
          <Box sx={{ 
            display: 'flex', 
            flexDirection: 'column', 
            alignItems: 'center', 
            justifyContent: 'center', 
            minHeight: '350px', 
            gap: 2,
            bgcolor: alpha(theme.palette.background.paper, 0.4),
            backdropFilter: 'blur(8px)',
            borderRadius: 4,
            border: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
            m: { xs: 2, sm: 0 },
            py: 6,
            textAlign: 'center',
            px: 3
          }}>
            <Box sx={{ 
              width: 80, 
              height: 80, 
              borderRadius: '50%', 
              bgcolor: alpha(theme.palette.text.disabled, 0.1), 
              color: 'text.disabled',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              mb: 1
            }}>
              <CustomerIcon sx={{ fontSize: 40 }} />
            </Box>
            <Typography variant="h6" sx={{ color: 'text.primary', fontWeight: 800, fontFamily: "'Outfit', sans-serif" }}>
              No Users Found
            </Typography>
            <Typography variant="body2" sx={{ color: 'text.secondary', fontWeight: 500, fontFamily: "'Outfit', sans-serif", maxWidth: 300 }}>
              There are no user accounts that match the selected filter or search criteria.
            </Typography>
          </Box>
        ) : (
          <>
        <Box sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          mb: { xs: 2.5, sm: 3 },
          px: { xs: 2, sm: 0 }
        }}>
          <Typography 
            variant="h6" 
            sx={{ 
              fontWeight: 800, 
              color: { xs: '#000', sm: 'text.primary' },
              fontFamily: "'Outfit', sans-serif",
              fontSize: headingFontSize,
              textAlign: { xs: 'center', sm: 'left' }
            }}
          >
            {tabValue === 0 && 'All Staff Members'}
            {tabValue === 1 && 'Management Team'}
            {tabValue === 2 && 'Staff Members'}
            {tabValue === 3 && 'Customers'}
            {tabValue === 4 && 'Inactive Users'}
            {tabValue === 5 && 'Deleted Users'}
          </Typography>
          <Box
            sx={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 800,
              color: 'primary.main',
              bgcolor: alpha(theme.palette.primary.main, 0.08),
              border: `1px solid ${alpha(theme.palette.primary.main, 0.18)}`,
              px: { xs: 1.1, sm: 1.4 },
              py: { xs: 0.45, sm: 0.55 },
              borderRadius: 999,
              fontSize: { xs: '0.7rem', sm: '0.75rem' },
              minWidth: { xs: 74, sm: 88 },
              lineHeight: 1.1,
            }}
          >
            {users.length} Total
          </Box>
        </Box>

        <Grid container spacing={{ xs: 2, sm: 3 }} sx={{ px: { xs: 2, sm: 0 } }}>
          {users.map((user) => {
            const primaryRole = tabValue === 3 ? 'customer' : getPrimaryRole(user);
            const roleInfo = getRoleInfo(primaryRole);
            const isPortalCustomer = Boolean(user.isPortalCustomer || user.source === 'customer_portal');
            const RoleIcon = roleInfo.icon;
            const statusColor = getStatusColor(user);
            const statusMain = theme.palette[statusColor as 'success' | 'error' | 'warning']?.main || theme.palette.grey[500];

            return (
              <Grid size={{ xs: 12, sm: 6, md: 4 }} key={user._id}>
                <Card sx={{ 
                  height: '100%', 
                  display: 'flex', 
                  flexDirection: 'column',
                  borderRadius: 4,
                  border: { xs: `1px solid ${alpha(theme.palette.divider, 0.08)}`, sm: 'none' },
                  boxShadow: { xs: '0 4px 12px rgba(0,0,0,0.03)', sm: 1 },
                  position: 'relative',
                  overflow: 'hidden',
                  '&:before': {
                    content: '""',
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: 4,
                    height: '100%',
                    bgcolor: statusMain,
                    opacity: 0.8
                  }
                }}>
                  <CardContent sx={{ 
                    flexGrow: 1, 
                    p: { xs: 0.75, sm: 2.5 }, 
                    '&:last-child': { pb: { xs: 0.75, sm: 2.5 } } 
                  }}>
                    <Box display="flex" alignItems="flex-start" mb={{ xs: 0.5, sm: 1.5 }}>
                      <Badge
                        overlap="circular"
                        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
                        variant="dot"
                        sx={{
                          '& .MuiBadge-badge': {
                            backgroundColor: user.isActive ? '#44b700' : '#ff1744',
                            color: user.isActive ? '#44b700' : '#ff1744',
                            boxShadow: `0 0 0 2px ${theme.palette.background.paper}`,
                            width: 10,
                            height: 10,
                            borderRadius: '50%',
                          },
                        }}
                      >
                        <Avatar
                          sx={{
                            bgcolor: alpha(roleInfo.color, 0.1),
                            color: roleInfo.color,
                            width: { xs: 32, sm: 56 },
                            height: { xs: 32, sm: 56 },
                            border: `2px solid ${alpha(roleInfo.color, 0.2)}`
                          }}
                        >
                          <RoleIcon sx={{ fontSize: { xs: '1rem', sm: '1.75rem' } }} />
                        </Avatar>
                      </Badge>
                      <Box flex={1} ml={1.5}>
                        <Typography 
                          variant="subtitle1" 
                          sx={{ 
                            fontWeight: 800, 
                            fontFamily: "'Outfit', sans-serif",
                            fontSize: { xs: '0.8rem', sm: '1rem' },
                            lineHeight: 1.2,
                            color: 'text.primary',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 1,
                            flexWrap: 'wrap'
                          }}
                        >
                          {getDisplayName(user)}
                          {user.isDeleted && (
                            <Chip
                              label="Deleted"
                              color="error"
                              size="small"
                              sx={{ height: 16, fontSize: '0.6rem', fontWeight: 900, px: 0.5, ml: 1 }}
                            />
                          )}
                          {/* Role Chips moved here for mobile */}
                          {getRolesForUser(user).slice(0, 1).map(r => {
                            const rInfo = getRoleInfo(r);
                            return (
                              <Chip
                                key={r}
                                label={rInfo.label}
                                sx={{
                                  backgroundColor: alpha(rInfo.color, 0.08),
                                  color: rInfo.color,
                                  fontWeight: 800,
                                  fontFamily: "'Outfit', sans-serif",
                                  fontSize: { xs: '0.6rem', sm: '0.65rem' },
                                  height: { xs: 18, sm: 22 },
                                  ml: { xs: 1, sm: 1 },
                                  border: `1px solid ${alpha(rInfo.color, 0.15)}`
                                }}
                                size="small"
                              />
                            );
                          })}
                        </Typography>
                        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: { xs: 0.5, sm: 1 }, alignItems: 'center', mt: 0.25 }}>
                          <Typography 
                            variant="caption" 
                            sx={{ 
                              fontWeight: 600, 
                              color: 'text.secondary',
                              fontSize: { xs: '0.65rem', sm: '0.75rem' },
                              lineHeight: 1
                            }}
                          >
                            {user.email}
                          </Typography>
                          <Typography variant="caption" sx={{ fontWeight: 700, color: 'primary.main', fontSize: { xs: '0.65rem', sm: '0.75rem' }, display: 'flex', alignItems: 'center', lineHeight: 1 }}>
                            <span style={{ opacity: 0.6 }}>{user.countryCode ? `+${user.countryCode}` : ''}</span> {user.phone}
                          </Typography>
                        </Box>
                      </Box>
                    </Box>

                    <Stack spacing={0}>
                      {user.department && (
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <Typography variant="caption" sx={{ fontWeight: 600, color: 'text.disabled', textTransform: 'uppercase', letterSpacing: '0.05em', fontSize: { xs: '0.6rem', sm: '0.75rem' } }}>Dept</Typography>
                          <Typography variant="caption" sx={{ fontWeight: 800, color: 'text.primary', fontSize: { xs: '0.65rem', sm: '0.75rem' } }}>{user.department}</Typography>
                        </Box>
                      )}
                      {!isCustomerUser(user) && user.hireDate && (
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <Typography variant="caption" sx={{ fontWeight: 600, color: 'text.disabled', textTransform: 'uppercase', letterSpacing: '0.05em', fontSize: { xs: '0.6rem', sm: '0.75rem' } }}>Hired</Typography>
                          <Typography variant="caption" sx={{ fontWeight: 800, color: 'text.primary', fontSize: { xs: '0.65rem', sm: '0.75rem' } }}>{getSafeDateString(user.hireDate)}</Typography>
                        </Box>
                      )}
                      {user.salary && !isCustomerUser(user) && (
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <Typography variant="caption" sx={{ fontWeight: 600, color: 'text.disabled', textTransform: 'uppercase', letterSpacing: '0.05em', fontSize: { xs: '0.6rem', sm: '0.75rem' } }}>Salary</Typography>
                          <Typography variant="caption" sx={{ fontWeight: 800, color: 'success.main', fontSize: { xs: '0.65rem', sm: '0.75rem' } }}>
                            {settings?.restaurant?.currencySymbol || '$'}{parseFloat(user.salary.toString()).toLocaleString()}
                          </Typography>
                        </Box>
                      )}
                    </Stack>

                    {user.isDeleted ? (
                      <Box sx={{ 
                        mt: { xs: 0.5, sm: 2 }, 
                        pt: { xs: 0.5, sm: 1.5 }, 
                        borderTop: `1px dashed ${alpha(theme.palette.divider, 0.5)}`,
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 0
                      }}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <Typography variant="caption" sx={{ fontWeight: 600, color: 'error.main', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Deleted On</Typography>
                          <Typography variant="caption" sx={{ fontWeight: 800, color: 'text.primary' }}>
                            {user.deletedAt ? new Date(user.deletedAt).toLocaleDateString('en-GB') : 'N/A'}
                          </Typography>
                        </Box>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <Typography variant="caption" sx={{ fontWeight: 600, color: 'error.main', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Deleted By</Typography>
                          <Typography variant="caption" sx={{ fontWeight: 800, color: 'text.primary' }}>
                            {user.deletedBy ? (typeof user.deletedBy === 'object' ? `${user.deletedBy.firstName || ''} ${user.deletedBy.lastName || ''}`.trim() : user.deletedBy) : 'System'}
                          </Typography>
                        </Box>
                      </Box>
                    ) : (
                      user.actionHistory && user.actionHistory.length > 0 && (
                        <Box sx={{ 
                          mt: { xs: 0.5, sm: 2 }, 
                          pt: { xs: 0.5, sm: 1.5 }, 
                          borderTop: `1px dashed ${alpha(theme.palette.divider, 0.5)}`,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between'
                        }}>
                          <Box>
                            <Typography variant="caption" sx={{ color: 'text.disabled', display: 'block', mb: 0.25, fontSize: { xs: '0.6rem', sm: '0.75rem' } }}>Created by</Typography>
                            <Typography variant="caption" sx={{ fontWeight: 700, color: 'text.secondary', fontSize: { xs: '0.65rem', sm: '0.75rem' } }}>
                              {(() => {
                                const createdAction = user.actionHistory.find((action: any) => action.action === 'CREATED');
                                return createdAction ? (createdAction.performedByName || getUserName(createdAction.performedBy)) : 'System';
                              })()}
                            </Typography>
                          </Box>

                          <Tooltip
                            title="View History"
                            slotProps={{
                              tooltip: {
                                sx: { p: 0, bgcolor: 'background.paper', boxShadow: 3, border: `1px solid ${theme.palette.divider}`, color: 'text.primary', maxWidth: 260 }
                              }
                            }}
                          >
                            <IconButton 
                              size="small" 
                              onClick={() => openEditUser(user, 1)}
                              sx={{ 
                                bgcolor: alpha(theme.palette.primary.main, 0.05),
                                color: 'primary.main',
                                '&:hover': { bgcolor: alpha(theme.palette.primary.main, 0.1) }
                              }}
                            >
                              <HistoryIcon sx={{ fontSize: '1.2rem' }} />
                            </IconButton>
                          </Tooltip>
                        </Box>
                      )
                    )}
                  </CardContent>

                  <Divider sx={{ opacity: 0.5 }} />
                  
                  <CardActions sx={{ 
                    bgcolor: alpha(theme.palette.background.default, 0.5), 
                    px: { xs: 0.5, sm: 2 }, 
                    py: { xs: 0.25, sm: 1 }, 
                    justifyContent: 'space-between' 
                  }}>
                    {tabValue === 5 || user.isDeleted ? (
                      <Button
                        variant="outlined"
                        color="success"
                        size="small"
                        startIcon={<RestoreIcon sx={{ fontSize: '1.1rem' }} />}
                        onClick={() => handleRestoreUser(user)}
                        sx={{ 
                          textTransform: 'none', 
                          fontWeight: 800, 
                          borderRadius: 2.5,
                          fontFamily: "'Outfit', sans-serif",
                          px: { xs: 1, sm: 2 },
                          py: { xs: 0.25, sm: 0.5 },
                          borderColor: alpha(theme.palette.success.main, 0.4),
                          color: 'success.main',
                          bgcolor: alpha(theme.palette.success.main, 0.02),
                          '&:hover': {
                            borderColor: 'success.main',
                            bgcolor: alpha(theme.palette.success.main, 0.08)
                          }
                        }}
                        disabled={submitting}
                      >
                        Restore User
                      </Button>
                    ) : (
                      <>
                        <Stack direction="row" spacing={0.5}>
                          <Tooltip title="Reset Password">
                            <IconButton 
                              size="small" 
                              onClick={() => openPasswordReset(user)}
                              sx={{ color: 'text.secondary', '&:hover': { color: 'primary.main', bgcolor: alpha(theme.palette.primary.main, 0.08) } }}
                            >
                              <LockIcon sx={{ fontSize: '1.1rem' }} />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Edit Profile">
                            <IconButton 
                              size="small" 
                              onClick={() => openEditUser(user)}
                              sx={{ color: 'text.secondary', '&:hover': { color: 'info.main', bgcolor: alpha(theme.palette.info.main, 0.08) } }}
                            >
                              <EditIcon sx={{ fontSize: '1.1rem' }} />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title={user.isActive ? 'Deactivate' : 'Activate'}>
                            <IconButton 
                              size="small" 
                              onClick={() => handleToggleStatus(user)}
                              sx={{ 
                                color: user.isActive ? 'success.main' : 'error.main',
                                bgcolor: user.isActive ? alpha(theme.palette.success.main, 0.05) : alpha(theme.palette.error.main, 0.05),
                                '&:hover': { bgcolor: user.isActive ? alpha(theme.palette.success.main, 0.1) : alpha(theme.palette.error.main, 0.1) }
                              }}
                            >
                              {user.isActive ? <ActivateIcon sx={{ fontSize: '1.1rem' }} /> : <DeactivateIcon sx={{ fontSize: '1.1rem' }} />}
                            </IconButton>
                          </Tooltip>
                        </Stack>

                        <IconButton 
                          size="small" 
                          onClick={() => handleDeleteUser(user)}
                          sx={{ color: 'error.light', '&:hover': { color: 'error.main', bgcolor: alpha(theme.palette.error.main, 0.08) } }}
                          disabled={!(activeRole === 'admin' || activeRole === 'superadmin' || currentUser?.roles?.includes('admin') || currentUser?.roles?.includes('superadmin'))}
                        >
                          <DeleteIcon sx={{ fontSize: '1.1rem' }} />
                        </IconButton>
                      </>
                    )}
                  </CardActions>
                </Card>
              </Grid>
            );
          })}
        </Grid>

        {/* Pagination Controls */}
        {totalRecords > 0 && (
          <Box sx={{ display: 'flex', justifyContent: 'center', mt: 6, mb: 4 }}>
            <Pagination
              count={totalPages}
              page={page}
              onChange={(_: React.ChangeEvent<unknown>, p: number) => setPage(p)}
              color="primary"
              size="large"
              sx={{
                '& .MuiPaginationItem-root': {
                  fontWeight: 'bold',
                  fontSize: '1.1rem',
                  mx: 0.5,
                  '&.Mui-selected': {
                    color: '#fff',
                    backgroundColor: 'primary.main',
                    '&:hover': {
                      backgroundColor: 'primary.dark',
                    },
                  },
                },
              }}
            />
          </Box>
        )}
          </>
        )}
      </Box>
      {/* Add/Edit User Dialog */}
      <Dialog 
        open={userDialog} 
        onClose={closeUserDialog} 
        maxWidth="md" 
        fullWidth
        PaperProps={{
          sx: { 
            borderRadius: { xs: 2, md: 4 }, 
            backgroundImage: 'none',
            m: { xs: 2, md: 4 },
            mt: { xs: '54px', md: 4 },
            mb: { xs: '70px', md: 4 },
            width: { xs: 'calc(100% - 32px)', md: '100%' },
            maxHeight: 'calc(100% - 124px)'
          }
        }}
      >
        <DialogTitle component="div" sx={{ 
          m: 0, 
          p: { xs: 1.5, sm: 3 },
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center',
          borderBottom: isMobile ? 'none' : `1px solid ${theme.palette.divider}`,
          bgcolor: isMobile ? 'primary.main' : 'transparent',
          color: isMobile ? 'white' : 'text.primary'
        }}>
          <Typography 
            variant="h6" 
            sx={{ 
              fontWeight: 800, 
              fontFamily: "'Outfit', sans-serif",
              fontSize: { xs: '1.25rem', sm: '1.5rem' }
            }}
          >
            {editingUser ? 'Edit User' : 'Add User'}
          </Typography>
          <IconButton
            onClick={closeUserDialog}
            size="small"
            sx={{
              color: isMobile ? 'white' : 'text.secondary',
              bgcolor: isMobile ? alpha('#fff', 0.15) : 'transparent',
              '&:hover': { bgcolor: isMobile ? alpha('#fff', 0.25) : alpha(theme.palette.divider, 0.1) }
            }}
          >
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent sx={{ 
          p: { xs: 1, sm: 4 }, 
          bgcolor: isMobile ? alpha(theme.palette.background.default, 0.8) : 'background.paper',
          '& .MuiFormLabel-asterisk': { color: 'red !important' }
        }}>
          {editingUser && (
            <Tabs
              value={dialogTab}
              onChange={(e, newValue) => setDialogTab(newValue)}
              sx={{ mb: 3, borderBottom: 1, borderColor: 'divider' }}
            >
              <Tab label="User Information" />
              <Tab label="Action History" />
            </Tabs>
          )}

          {dialogTab === 0 && (
            <Grid container spacing={{ xs: 1, sm: 3 }} sx={{ mt: { xs: 0.5, sm: 1 } }}>
              {/* Basic Information Section */}
              <Grid size={{ xs: 12 }}>
                <Card variant="outlined" sx={{ borderRadius: 3, border: `1px solid ${alpha(theme.palette.divider, 0.1)}`, bgcolor: 'background.paper' }}>
                  <CardContent sx={{ p: { xs: 1, sm: 3 }, '&:last-child': { pb: { xs: 1, sm: 3 } } }}>
                    <Typography 
                      variant="overline" 
                      sx={{ 
                        fontWeight: 800, 
                        color: 'primary.main', 
                        fontFamily: "'Outfit', sans-serif",
                        letterSpacing: '0.1em',
                        display: 'block',
                        lineHeight: 1.2,
                        mb: { xs: 1, sm: 2 }
                      }}
                    >
                      Basic Information
                    </Typography>
                    
                    <Grid container spacing={{ xs: 1, sm: 2 }}>
                      <Grid size={{ xs: 12, sm: 6 }}>
                        <TextField
                          fullWidth
                          size={isMobile ? "small" : "medium"}
                          label="First Name"
                          value={userForm.firstName}
                          onChange={(e) => {
                            const val = e.target.value.replace(/[^a-zA-Z\s]/g, '');
                            setUserForm({ ...userForm, firstName: val });
                            if (userErrors.firstName) setUserErrors(prev => ({ ...prev, firstName: { isValid: true } }));
                          }}
                          onBlur={() => {
                            const validation = validateName(userForm.firstName, 'First name');
                            setUserErrors(prev => ({ ...prev, firstName: validation }));
                          }}
                          error={hasError(userErrors.firstName)}
                          helperText={getHelperText(userErrors.firstName)}
                          required
                        />
                      </Grid>
                      <Grid size={{ xs: 12, sm: 6 }}>
                        <TextField
                          fullWidth
                          size={isMobile ? "small" : "medium"}
                          label="Last Name"
                          value={userForm.lastName}
                          onChange={(e) => {
                            const val = e.target.value.replace(/[^a-zA-Z\s]/g, '');
                            setUserForm({ ...userForm, lastName: val });
                            if (userErrors.lastName) setUserErrors(prev => ({ ...prev, lastName: { isValid: true } }));
                          }}
                          onBlur={() => {
                            const validation = validateName(userForm.lastName, 'Last name');
                            setUserErrors(prev => ({ ...prev, lastName: validation }));
                          }}
                          error={hasError(userErrors.lastName)}
                          helperText={getHelperText(userErrors.lastName)}
                          required
                        />
                      </Grid>
                      <Grid size={{ xs: 12, sm: 6 }}>
                        <TextField
                          fullWidth
                          size={isMobile ? "small" : "medium"}
                          label="Email Address"
                          type="email"
                          value={userForm.email}
                          onChange={(e) => {
                            setUserForm({ ...userForm, email: e.target.value?.toLowerCase() });
                            if (userErrors.email) setUserErrors(prev => ({ ...prev, email: { isValid: true } }));
                          }}
                          onBlur={() => {
                            const validation = validateEmail(userForm.email);
                            setUserErrors(prev => ({ ...prev, email: validation }));
                          }}
                          error={hasError(userErrors.email)}
                          helperText={getHelperText(userErrors.email)}
                          required
                        />
                      </Grid>
                      <Grid size={{ xs: 12, sm: 6 }}>
                        <PhoneInput
                          fullWidth
                          size={isMobile ? "small" : "medium"}
                          label="Phone Number"
                          value={userForm.phone}
                          onChange={(val) => {
                            const clean = val.replace(/\D/g, '').slice(0, 10);
                            setUserForm({ ...userForm, phone: clean });
                            if (userErrors.phone) setUserErrors(prev => ({ ...prev, phone: { isValid: true } }));
                          }}
                          dialCode={userForm.countryCode}
                          onDialCodeChange={(code) => setUserForm(prev => ({ ...prev, countryCode: code }))}
                          error={hasError(userErrors.phone)}
                          helperText={getHelperText(userErrors.phone) || "10-digit mobile number"}
                          required
                        />
                      </Grid>
                      <Grid size={{ xs: 12, sm: 6 }}>
                        <FormControl fullWidth size={isMobile ? "small" : "medium"}>
                          <InputLabel>System Roles</InputLabel>
                          <Select
                            multiple
                            value={userForm.roles}
                            onChange={(e) => {
                              const value = typeof e.target.value === 'string' ? e.target.value.split(',') : e.target.value;
                              handleRolesChange(value as string[]);
                            }}
                            label="System Roles"
                            renderValue={(selected) => (
                              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                                {(selected as string[]).map((value) => {
                                  const roleInfo = getRoleInfo(value);
                                  return (
                                    <Chip 
                                      key={value} 
                                      label={roleInfo.label} 
                                      size="small" 
                                      sx={{ 
                                        fontWeight: 700, 
                                        fontFamily: "'Outfit', sans-serif",
                                        bgcolor: alpha(roleInfo.color, 0.1),
                                        color: roleInfo.color
                                      }} 
                                    />
                                  );
                                })}
                              </Box>
                            )}
                          >
                            {roles.map((role) => (
                              <MenuItem key={role.value} value={role.value}>
                                <Box display="flex" alignItems="center" gap={1.5}>
                                  <role.icon fontSize="small" style={{ color: role.color }} />
                                  <Typography variant="body2" sx={{ fontWeight: 600 }}>{role.label}</Typography>
                                </Box>
                              </MenuItem>
                            ))}
                          </Select>
                        </FormControl>
                      </Grid>
                      {!editingUser && (
                        <Grid size={{ xs: 12, sm: 6 }}>
                          <TextField
                            fullWidth
                            size={isMobile ? "small" : "medium"}
                            label="Password"
                            type={showPassword ? 'text' : 'password'}
                            placeholder="Click icon to auto-generate"
                            value={userForm.password}
                            onChange={(e) => setUserForm({ ...userForm, password: e.target.value })}
                            InputProps={{
                              endAdornment: (
                                <InputAdornment position="end">
                                  <Tooltip title={showPassword ? 'Hide password' : 'Show password'}>
                                    <IconButton
                                      onClick={() => setShowPassword(!showPassword)}
                                      edge="end"
                                      sx={{ mr: 0.5 }}
                                    >
                                      {showPassword ? <VisibilityOffIcon fontSize="small" /> : <VisibilityIcon fontSize="small" />}
                                    </IconButton>
                                  </Tooltip>
                                  <Tooltip title="Auto-generate password">
                                    <IconButton onClick={generateRandomPassword} edge="end" color="primary">
                                      <LockIcon fontSize="small" />
                                    </IconButton>
                                  </Tooltip>
                                </InputAdornment>
                              )
                            }}
                            helperText="Recommended: firstName + 3 random digits"
                          />
                        </Grid>
                      )}
                    </Grid>
                  </CardContent>
                </Card>
              </Grid>
              {!userForm.roles.includes('customer') && (
                <Grid size={{ xs: 12 }}>
                  <Card variant="outlined" sx={{ borderRadius: 3, border: `1px solid ${alpha(theme.palette.divider, 0.1)}`, bgcolor: 'background.paper', mt: { xs: 0.5, sm: 1 } }}>
                    <CardContent sx={{ p: { xs: 1, sm: 3 }, '&:last-child': { pb: { xs: 1, sm: 3 } } }}>
                      <Typography 
                        variant="overline" 
                        sx={{ 
                          fontWeight: 800, 
                          color: 'primary.main', 
                          fontFamily: "'Outfit', sans-serif",
                          letterSpacing: '0.1em',
                          display: 'block',
                          lineHeight: 1.2,
                          mb: { xs: 1, sm: 2 }
                        }}
                      >
                        Employment Details
                      </Typography>
                      <Grid container spacing={{ xs: 1, sm: 2 }}>
                        <Grid size={{ xs: 12, sm: 6 }}>
                          <FormControl fullWidth size={isMobile ? "small" : "medium"}>
                            <InputLabel id="department-label">Department</InputLabel>
                            <Select
                              labelId="department-label"
                              value={userForm.department}
                              label="Department"
                              onChange={(e) => setUserForm({ ...userForm, department: e.target.value })}
                            >
                              <MenuItem value=""><Typography variant="body2" sx={{ color: 'text.disabled', fontStyle: 'italic' }}>No Department</Typography></MenuItem>
                              {DEPARTMENT_OPTIONS.map((dept) => (
                                <MenuItem key={dept} value={dept}>
                                  <Typography variant="body2" sx={{ fontWeight: 500 }}>{dept}</Typography>
                                </MenuItem>
                              ))}
                            </Select>
                          </FormControl>
                        </Grid>
                        <Grid size={{ xs: 12, sm: 6 }}>
                          <TextField
                            fullWidth
                            size={isMobile ? "small" : "medium"}
                            label={`Monthly Salary (${settings?.restaurant?.currencySymbol || '$'})`}
                            type="number"
                            value={userForm.salary}
                            onChange={(e) => {
                              let val = e.target.value;
                              if (val.length > 7) return;
                              if (/^0[0-9]+/.test(val)) { val = val.replace(/^0+/, ''); e.target.value = val; }
                              setUserForm({ ...userForm, salary: val });
                              if (userErrors.salary) setUserErrors(prev => ({ ...prev, salary: { isValid: true } }));
                            }}
                            onBlur={() => {
                              const isCustomer = userForm.roles.includes('customer');
                              const validation = isCustomer
                                ? { isValid: true }
                                : (!userForm.salary || userForm.salary.trim() === ''
                                  ? { isValid: false, message: 'Salary is required' }
                                  : parseFloat(userForm.salary) <= 0
                                    ? { isValid: false, message: 'Salary must be greater than 0' }
                                    : { isValid: true });
                              setUserErrors(prev => ({ ...prev, salary: validation }));
                            }}
                            error={hasError(userErrors.salary)}
                            helperText={getHelperText(userErrors.salary)}
                            required
                          />
                        </Grid>
                        <Grid size={{ xs: 12 }}>
                          <TextField
                            fullWidth
                            size={isMobile ? "small" : "medium"}
                            label="Date of Hire"
                            type="date"
                            value={userForm.hireDate}
                            onChange={(e) => {
                              setUserForm({ ...userForm, hireDate: e.target.value });
                              if (userErrors.hireDate) setUserErrors(prev => ({ ...prev, hireDate: { isValid: true } }));
                            }}
                            onBlur={() => {
                              const isCustomer = userForm.roles.includes('customer');
                              let hireDateValidation;
                              if (isCustomer) {
                                hireDateValidation = { isValid: true };
                              } else if (!userForm.hireDate || userForm.hireDate.trim() === '') {
                                hireDateValidation = { isValid: false, message: 'Hire date is required' };
                              } else {
                                hireDateValidation = { isValid: true };
                              }
                              setUserErrors(prev => ({ ...prev, hireDate: hireDateValidation }));
                            }}
                            error={hasError(userErrors.hireDate)}
                            helperText={getHelperText(userErrors.hireDate)}
                            InputLabelProps={{ shrink: true }}
                            required
                          />
                        </Grid>
                      </Grid>
                    </CardContent>
                  </Card>
                </Grid>
              )}
              {/* Address Information Section */}
              <Grid size={{ xs: 12 }}>
                <Card variant="outlined" sx={{ borderRadius: 3, border: `1px solid ${alpha(theme.palette.divider, 0.1)}`, bgcolor: 'background.paper', mt: { xs: 0.5, sm: 1 } }}>
                  <CardContent sx={{ p: { xs: 1, sm: 3 }, '&:last-child': { pb: { xs: 1, sm: 3 } } }}>
                    <Typography 
                      variant="overline" 
                      sx={{ 
                        fontWeight: 800, 
                        color: 'primary.main', 
                        fontFamily: "'Outfit', sans-serif",
                        letterSpacing: '0.1em',
                        display: 'block',
                        lineHeight: 1.2,
                        mb: { xs: 1, sm: 2 }
                      }}
                    >
                      Residential Address {userForm.roles.includes('customer') && <span style={{ color: 'red' }}>*</span>}
                    </Typography>
                    
                    <Grid container spacing={{ xs: 1, sm: 2 }}>
                      <Grid size={{ xs: 12 }}>
                        <AddressAutocomplete
                          label="Full Street Address"
                          size={isMobile ? "small" : "medium"}
                          value={userForm.address.street}
                          onChange={(val) => {
                            setUserForm(prev => ({
                              ...prev,
                              address: { ...prev.address, street: val }
                            }));
                            if (userErrors.street) setUserErrors(prev => ({ ...prev, street: { isValid: true } }));
                          }}
                          onBlur={() => {
                            const isCustomer = userForm.roles.includes('customer');
                            if (isCustomer) {
                              const validation = validateRequired(userForm.address.street, 'Street Address');
                              setUserErrors(prev => ({ ...prev, street: validation }));
                            }
                          }}
                          onSelect={(addr) => {
                            setUserForm(prev => ({
                              ...prev,
                              address: {
                                ...prev.address,
                                street: addr.fullAddress,
                                city: addr.city || '',
                                state: addr.state || '',
                                zipCode: addr.zipCode || ''
                              }
                            }));
                            if (userErrors.street) setUserErrors(prev => ({ ...prev, street: { isValid: true } }));
                            if (userErrors.city) setUserErrors(prev => ({ ...prev, city: { isValid: true } }));
                            if (userErrors.state) setUserErrors(prev => ({ ...prev, state: { isValid: true } }));
                            if (userErrors.zipCode) setUserErrors(prev => ({ ...prev, zipCode: { isValid: true } }));
                          }}
                          apiKey={googleMapsApiKey}
                          error={hasError(userErrors.street)}
                          helperText={getHelperText(userErrors.street)}
                          required={userForm.roles.includes('customer')}
                        />
                      </Grid>
                      <Grid size={{ xs: 12, sm: 4 }}>
                        <TextField
                          fullWidth
                          size={isMobile ? "small" : "medium"}
                          label="City"
                          value={userForm.address.city}
                          onChange={(e) => {
                            setUserForm({
                              ...userForm,
                              address: { ...userForm.address, city: e.target.value }
                            });
                            if (userErrors.city) setUserErrors(prev => ({ ...prev, city: { isValid: true } }));
                          }}
                          onBlur={() => {
                            const isCustomer = userForm.roles.includes('customer');
                            if (isCustomer) {
                              const validation = validateRequired(userForm.address.city, 'City');
                              setUserErrors(prev => ({ ...prev, city: validation }));
                            }
                          }}
                          error={hasError(userErrors.city)}
                          helperText={getHelperText(userErrors.city)}
                          required={userForm.roles.includes('customer')}
                        />
                      </Grid>
                      <Grid size={{ xs: 12, sm: 4 }}>
                        <TextField
                          fullWidth
                          size={isMobile ? "small" : "medium"}
                          label="State / Province"
                          value={userForm.address.state}
                          onChange={(e) => {
                            setUserForm({
                              ...userForm,
                              address: { ...userForm.address, state: e.target.value }
                            });
                            if (userErrors.state) setUserErrors(prev => ({ ...prev, state: { isValid: true } }));
                          }}
                          onBlur={() => {
                            const isCustomer = userForm.roles.includes('customer');
                            if (isCustomer) {
                              const validation = validateRequired(userForm.address.state, 'State / Province');
                              setUserErrors(prev => ({ ...prev, state: validation }));
                            }
                          }}
                          error={hasError(userErrors.state)}
                          helperText={getHelperText(userErrors.state)}
                          required={userForm.roles.includes('customer')}
                        />
                      </Grid>
                      <Grid size={{ xs: 12, sm: 4 }}>
                        <TextField
                          fullWidth
                          size={isMobile ? "small" : "medium"}
                          label="Zip Code"
                          value={userForm.address.zipCode}
                          onChange={(e) => {
                            setUserForm({
                              ...userForm,
                              address: { ...userForm.address, zipCode: e.target.value }
                            });
                            if (userErrors.zipCode) setUserErrors(prev => ({ ...prev, zipCode: { isValid: true } }));
                          }}
                          onBlur={() => {
                            const isCustomer = userForm.roles.includes('customer');
                            if (isCustomer) {
                              const validation = validateRequired(userForm.address.zipCode, 'Zip Code');
                              setUserErrors(prev => ({ ...prev, zipCode: validation }));
                            }
                          }}
                          error={hasError(userErrors.zipCode)}
                          helperText={getHelperText(userErrors.zipCode)}
                          required={userForm.roles.includes('customer')}
                        />
                      </Grid>
                    </Grid>
                  </CardContent>
                </Card>
              </Grid>
              {!userForm.roles.includes('customer') && (
                <>
                  {/* Emergency Contact */}
                  <Grid size={{ xs: 12 }}>
                    <Typography variant="h6" gutterBottom sx={{ mt: 2 }}>Emergency Contact</Typography>
                    <Divider sx={{ mb: 2 }} />
                  </Grid>
                  <Grid size={{ xs: 12, sm: 6 }}>
                    <TextField
                      fullWidth
                      label="Contact Name"
                      value={userForm.emergencyContact.name}
                      onChange={(e) => setUserForm({
                        ...userForm,
                        emergencyContact: { ...userForm.emergencyContact, name: e.target.value }
                      })}
                      margin="normal"
                    />
                  </Grid>
                  <Grid size={{ xs: 12, sm: 6 }}>
                    <TextField
                      fullWidth
                      label="Relationship"
                      value={userForm.emergencyContact.relationship}
                      onChange={(e) => {
                        const val = e.target.value.replace(/[^a-zA-Z\s]/g, '');
                        setUserForm({
                          ...userForm,
                          emergencyContact: { ...userForm.emergencyContact, relationship: val }
                        });
                      }}
                      margin="normal"
                    />
                  </Grid>
                </>
              )}
              {!userForm.roles.includes('customer') && (
                <>
                  {/* Permissions Section */}
                  <Grid size={{ xs: 12 }}>
                    <Typography variant="h6" gutterBottom sx={{ mt: 2 }}>Permissions</Typography>
                    <Divider sx={{ mb: 2 }} />

                    {/* Active/Selected Permissions (Always Visible) */}
                    <Grid container spacing={1}>
                      {allPermissions.filter(p => userForm.permissions.includes(p)).map((permission) => (
                        <Grid size={{ xs: 6, sm: 4, md: 3 }} key={permission}>
                          <FormControlLabel
                            control={
                              <Checkbox
                                checked={true}
                                onChange={(e) => {
                                  if (!e.target.checked) {
                                    setUserForm({
                                      ...userForm,
                                      permissions: userForm.permissions.filter(p => p !== permission)
                                    });
                                  }
                                }}
                                size="small"
                              />
                            }
                            label={<Typography variant="caption">{permission}</Typography>}
                            sx={{
                              margin: 0,
                              width: '100%',
                              '& .MuiFormControlLabel-label': {
                                fontSize: '0.75rem',
                                whiteSpace: 'nowrap',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis'
                              }
                            }}
                          />
                        </Grid>
                      ))}
                    </Grid>

                    {/* More Options Toggle */}
                    {allPermissions.length > userForm.permissions.length && (
                      <Box sx={{ display: 'flex', alignItems: 'center', mt: 2, mb: 1 }}>
                        <Button
                          size="small"
                          onClick={() => setShowPermissions(!showPermissions)}
                          sx={{
                            textTransform: 'none',
                            fontSize: '0.75rem',
                            color: 'primary.main',
                            '&:hover': { bgcolor: 'transparent', textDecoration: 'underline' }
                          }}
                        >
                          {showPermissions ? '- Show Less Options' : '+ Show More Options'}
                        </Button>
                      </Box>
                    )}

                    {/* Available/Unselected Permissions (Hidden by default) */}
                    {showPermissions && (
                      <Grid container spacing={1} sx={{ mt: 1, pt: 1, borderTop: '1px dashed rgba(0,0,0,0.1)' }}>
                        {allPermissions.filter(p => !userForm.permissions.includes(p)).map((permission) => (
                          <Grid size={{ xs: 6, sm: 4, md: 3 }} key={permission}>
                            <FormControlLabel
                              control={
                                <Checkbox
                                  checked={false}
                                  onChange={(e) => {
                                    if (e.target.checked) {
                                      setUserForm({
                                        ...userForm,
                                        permissions: [...userForm.permissions, permission]
                                      });
                                    }
                                  }}
                                  size="small"
                                />
                              }
                              label={<Typography variant="caption" sx={{ color: 'text.disabled' }}>{permission}</Typography>}
                              sx={{
                                margin: 0,
                                width: '100%',
                                '& .MuiFormControlLabel-label': {
                                  fontSize: '0.75rem',
                                  whiteSpace: 'nowrap',
                                  overflow: 'hidden',
                                  textOverflow: 'ellipsis'
                                }
                              }}
                            />
                          </Grid>
                        ))}
                      </Grid>
                    )}
                  </Grid>
                </>
              )}
              {editingUser && (
                <Grid size={{ xs: 12 }}>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={userForm.isActive}
                        onChange={(e) => setUserForm({ ...userForm, isActive: e.target.checked })}
                      />
                    }
                    label="Active User"
                  />
                </Grid>
              )}
            </Grid>
          )}

          {dialogTab === 1 && editingUser && (
            <Box mt={2} sx={{ maxHeight: { xs: 220, sm: 280 }, overflowY: 'auto' }}>
              <ActionHistoryList history={editingUser.actionHistory || []} emptyMessage="No history recorded for this user." />
            </Box>
          )}
        </DialogContent>
        <DialogActions sx={{ 
          p: { xs: 1, sm: 3 }, 
          pb: { xs: 1, sm: 3 },
          gap: { xs: 1, sm: 1.5 },
          borderTop: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
          bgcolor: 'background.paper'
        }}>
          <Button
            onClick={closeUserDialog}
            sx={{ 
              flex: 1,
              borderRadius: 2.5,
              py: { xs: 0.75, sm: 1.25 },
              textTransform: 'none',
              fontWeight: 700,
              fontFamily: "'Outfit', sans-serif",
              color: 'text.secondary',
              bgcolor: alpha(theme.palette.divider, 0.05),
              '&:hover': { bgcolor: alpha(theme.palette.divider, 0.1) }
            }}
          >
            Cancel
          </Button>
          <Button
            onClick={handleUserSubmit}
            variant="contained"
            sx={{ 
              flex: 1,
              borderRadius: 2.5,
              py: { xs: 0.75, sm: 1.25 },
              textTransform: 'none',
              fontWeight: 800,
              fontFamily: "'Outfit', sans-serif",
              boxShadow: `0 4px 12px ${alpha(theme.palette.primary.main, 0.2)}`
            }}
            disabled={submitting}
            startIcon={submitting && <CircularProgress size={20} color="inherit" />}
          >
            {submitting ? (editingUser ? 'Updating...' : 'Adding...') : (editingUser ? 'Update User' : 'Add User')}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Password Reset Dialog */}
      <Dialog 
        open={passwordDialog} 
        onClose={closePasswordDialog} 
        maxWidth="sm" 
        fullWidth
        fullScreen={isMobile}
        PaperProps={{
          sx: { borderRadius: { xs: 0, sm: 4 } }
        }}
      >
        <DialogTitle component="div" sx={{ 
          m: 0, 
          p: { xs: 2.5, sm: 2.5 }, 
          pt: { xs: isMobile ? '54px' : 2.5, sm: 2.5 },
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center',
          bgcolor: isMobile ? alpha(theme.palette.error.main, 1) : 'transparent',
          color: isMobile ? 'white' : 'text.primary'
        }}>
          <Typography 
            variant="h6" 
            sx={{ 
              fontWeight: 800, 
              fontFamily: "'Outfit', sans-serif",
              fontSize: { xs: '1.25rem', sm: '1.25rem' }
            }}
          >
            Reset Password
          </Typography>
          <IconButton
            onClick={closePasswordDialog}
            size="small"
            sx={{
              color: isMobile ? 'white' : 'text.secondary',
              bgcolor: isMobile ? alpha('#fff', 0.1) : 'transparent',
              '&:hover': { bgcolor: isMobile ? alpha('#fff', 0.2) : alpha(theme.palette.divider, 0.1) }
            }}
          >
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent sx={{ 
          p: { xs: 2.5, sm: 3 }, 
          pt: { xs: 3, sm: 1 },
          '& .MuiFormLabel-asterisk': { color: 'red !important' }
        }}>
          <TextField
            fullWidth
            label="New Password"
            type={showResetPassword ? 'text' : 'password'}
            value={passwordForm.newPassword}
            onChange={(e) => {
              setPasswordForm({ ...passwordForm, newPassword: e.target.value });
              if (passwordErrors.newPassword) setPasswordErrors(prev => ({ ...prev, newPassword: { isValid: true } }));
            }}
            onBlur={() => {
              const validation = validatePassword(passwordForm.newPassword);
              setPasswordErrors(prev => ({ ...prev, newPassword: validation }));
            }}
            error={hasError(passwordErrors.newPassword)}
            helperText={getHelperText(passwordErrors.newPassword) || "Minimum 6 characters"}
            margin="normal"
            required
            InputProps={{
              endAdornment: (
                <InputAdornment position="end">
                  <Tooltip title={showResetPassword ? 'Hide password' : 'Show password'}>
                    <IconButton onClick={() => setShowResetPassword(!showResetPassword)} edge="end">
                      {showResetPassword ? <VisibilityOffIcon fontSize="small" /> : <VisibilityIcon fontSize="small" />}
                    </IconButton>
                  </Tooltip>
                </InputAdornment>
              )
            }}
          />
          <TextField
            fullWidth
            label="Confirm Password"
            type={showConfirmPassword ? 'text' : 'password'}
            value={passwordForm.confirmPassword}
            onChange={(e) => {
              setPasswordForm({ ...passwordForm, confirmPassword: e.target.value });
              if (passwordErrors.confirmPassword) setPasswordErrors(prev => ({ ...prev, confirmPassword: { isValid: true } }));
            }}
            onBlur={() => {
              const validation = passwordForm.newPassword !== passwordForm.confirmPassword
                ? { isValid: false, message: 'Passwords do not match' }
                : validatePassword(passwordForm.confirmPassword);
              setPasswordErrors(prev => ({ ...prev, confirmPassword: validation }));
            }}
            error={hasError(passwordErrors.confirmPassword)}
            helperText={getHelperText(passwordErrors.confirmPassword)}
            margin="normal"
            required
            InputProps={{
              endAdornment: (
                <InputAdornment position="end">
                  <Tooltip title={showConfirmPassword ? 'Hide password' : 'Show password'}>
                    <IconButton onClick={() => setShowConfirmPassword(!showConfirmPassword)} edge="end">
                      {showConfirmPassword ? <VisibilityOffIcon fontSize="small" /> : <VisibilityIcon fontSize="small" />}
                    </IconButton>
                  </Tooltip>
                </InputAdornment>
              )
            }}
          />
        </DialogContent>
        <DialogActions sx={{ 
          p: { xs: 2.5, sm: 3 }, 
          pb: { xs: isMobile ? '32px' : 2.5, sm: 3 },
          gap: 1.5,
          borderTop: `1px solid ${alpha(theme.palette.divider, 0.1)}`
        }}>
          <Button
            onClick={closePasswordDialog}
            sx={{ 
              flex: 1,
              borderRadius: 2.5,
              py: 1.25,
              textTransform: 'none',
              fontWeight: 700,
              fontFamily: "'Outfit', sans-serif"
            }}
          >
            Cancel
          </Button>
          <Button
            onClick={handlePasswordReset}
            variant="contained"
            color="error"
            sx={{ 
              flex: 1,
              borderRadius: 2.5,
              py: 1.25,
              textTransform: 'none',
              fontWeight: 800,
              fontFamily: "'Outfit', sans-serif",
              boxShadow: `0 4px 12px ${alpha(theme.palette.error.main, 0.2)}`
            }}
            disabled={submitting}
            startIcon={submitting && <CircularProgress size={20} color="inherit" />}
          >
            {submitting ? 'Resetting...' : 'Confirm Reset'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete User Confirmation Dialog */}
      <Dialog
        open={openDeleteDialog}
        onClose={closeDeleteDialog}
        fullScreen={isMobile}
        PaperProps={{
          sx: { borderRadius: { xs: 0, sm: 4 }, backgroundImage: 'none' }
        }}
      >
        {(() => {
          const targetUser = users.find(u => u._id === deleteTarget?.id);
          const isSuperAdmin = activeRole === 'superadmin' || currentUser?.roles?.includes('superadmin');
          const isAdmin = activeRole === 'admin' || currentUser?.roles?.includes('admin');
          const targetIsAdmin = targetUser?.roles?.includes('admin') || targetUser?.role === 'admin';
          const willDeleteDirectly = isSuperAdmin || (isAdmin && !targetIsAdmin);

          return (
            <>
              <DialogTitle component="div" sx={{ 
                m: 0, 
                p: { xs: 2.5, sm: 3 }, 
                pt: { xs: isMobile ? '54px' : 2.5, sm: 3 },
                display: 'flex', 
                justifyContent: 'space-between', 
                alignItems: 'center',
                bgcolor: isMobile ? 'error.main' : 'transparent',
                color: isMobile ? 'white' : 'text.primary'
              }}>
                <Typography 
                  variant="h6" 
                  sx={{ 
                    fontWeight: 800, 
                    fontFamily: "'Outfit', sans-serif",
                    fontSize: { xs: '1.25rem', sm: '1.25rem' }
                  }}
                >
                  {willDeleteDirectly ? 'Delete Account' : 'Request Deletion'}
                </Typography>
                <IconButton
                  onClick={closeDeleteDialog}
                  size="small"
                  sx={{
                    color: isMobile ? 'white' : 'text.secondary',
                    bgcolor: isMobile ? alpha('#fff', 0.1) : 'transparent',
                    '&:hover': { bgcolor: isMobile ? alpha('#fff', 0.2) : alpha(theme.palette.divider, 0.1) }
                  }}
                >
                  <CloseIcon />
                </IconButton>
              </DialogTitle>
              <DialogContent sx={{ p: { xs: 3, sm: 4 }, textAlign: 'center' }}>
                <Box sx={{ 
                  width: 80, 
                  height: 80, 
                  borderRadius: '50%', 
                  bgcolor: alpha(theme.palette.error.main, 0.1), 
                  color: 'error.main',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  mx: 'auto',
                  mb: 3
                }}>
                  <DeleteIcon sx={{ fontSize: 40 }} />
                </Box>
                <Typography variant="h5" sx={{ fontWeight: 800, fontFamily: "'Outfit', sans-serif", mb: 2 }}>
                  Are you sure?
                </Typography>
                <Typography sx={{ color: 'text.secondary', fontWeight: 500, mb: 1 }}>
                  You are about to {willDeleteDirectly ? 'permanently delete' : 'request the deletion of'} 
                  <br />
                  <Box component="span" sx={{ color: 'text.primary', fontWeight: 800 }}>{deleteTarget?.name}</Box>
                </Typography>
                <Typography variant="body2" color="text.disabled" sx={{ mt: 2, fontStyle: 'italic' }}>
                  {willDeleteDirectly
                    ? 'This action cannot be undone and all data associated with this user will be purged.'
                    : 'A formal request will be sent to the Super Administrator for secondary verification.'}
                </Typography>
              </DialogContent>
              <DialogActions sx={{ 
                p: { xs: 2.5, sm: 3 }, 
                pb: { xs: isMobile ? '32px' : 2.5, sm: 3 },
                gap: 1.5,
                borderTop: `1px solid ${alpha(theme.palette.divider, 0.1)}`
              }}>
                <Button
                  onClick={closeDeleteDialog}
                  sx={{ 
                    flex: 1,
                    borderRadius: 2.5,
                    py: 1.25,
                    textTransform: 'none',
                    fontWeight: 700,
                    fontFamily: "'Outfit', sans-serif",
                    color: 'text.secondary'
                  }}
                >
                  Cancel
                </Button>
                <Button
                  onClick={confirmDeleteUser}
                  variant="contained"
                  color="error"
                  sx={{ 
                    flex: 1,
                    borderRadius: 2.5,
                    py: 1.25,
                    textTransform: 'none',
                    fontWeight: 800,
                    fontFamily: "'Outfit', sans-serif",
                    boxShadow: `0 8px 16px ${alpha(theme.palette.error.main, 0.3)}`
                  }}
                >
                  {willDeleteDirectly ? 'Delete Account' : 'Submit Request'}
                </Button>
              </DialogActions>
            </>
          );
        })()}
      </Dialog>
      {/* Deactivate Confirmation Dialog */}
      <Dialog
        open={openStatusDialog}
        onClose={closeStatusDialog}
        PaperProps={{
          sx: { borderRadius: 2, p: 1 }
        }}
      >
        <DialogTitle component="div" sx={{ textAlign: 'center', pb: 0 }}>
          <Typography variant="h6" fontWeight="bold">
            Confirm {statusTarget?.isActive ? 'Deactivation' : 'Activation'}
          </Typography>
        </DialogTitle>
        <DialogContent sx={{ textAlign: 'center', py: 2 }}>
          <Typography>
            Are you sure you want to {statusTarget?.isActive ? 'deactivate' : 'activate'} user <Box component="span" sx={{ fontWeight: 'bold' }}>{getDisplayName(statusTarget)}</Box>?
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            {statusTarget?.isActive
              ? 'This user will no longer be able to log in to the system.'
              : 'This user will regain access to the system.'}
          </Typography>
        </DialogContent>
        <DialogActions sx={{ justifyContent: 'center', pb: 2, gap: 2 }}>
          <Button
            onClick={closeStatusDialog}
            variant="outlined"
            sx={{ borderRadius: 2, minWidth: 100 }}
          >
            Cancel
          </Button>
          <Button
            onClick={() => statusTarget && confirmToggleStatus(statusTarget._id)}
            variant="contained"
            color={statusTarget?.isActive ? 'error' : 'success'}
            sx={{ borderRadius: 2, minWidth: 100 }}
          >
            {statusTarget?.isActive ? 'Deactivate' : 'Activate'}
          </Button>
        </DialogActions>
      </Dialog>
      
      {/* Restore Confirmation Dialog */}
      <Dialog
        open={openRestoreDialog}
        onClose={closeRestoreDialog}
        PaperProps={{
          sx: { borderRadius: 2, p: 1 }
        }}
      >
        <DialogTitle component="div" sx={{ textAlign: 'center', pb: 0 }}>
          <Typography variant="h6" fontWeight="bold">
            Confirm User Restoration
          </Typography>
        </DialogTitle>
        <DialogContent sx={{ textAlign: 'center', py: 2 }}>
          <Typography>
            Are you sure you want to restore user <Box component="span" sx={{ fontWeight: 'bold' }}>{restoreTarget ? `${restoreTarget.firstName} ${restoreTarget.lastName}` : ''}</Box>?
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            This will reactivate their account and restore their access to the system.
          </Typography>
        </DialogContent>
        <DialogActions sx={{ justifyContent: 'center', pb: 2, gap: 2 }}>
          <Button
            onClick={closeRestoreDialog}
            variant="outlined"
            sx={{ borderRadius: 2, minWidth: 100 }}
          >
            Cancel
          </Button>
          <Button
            onClick={confirmRestoreUser}
            variant="contained"
            color="success"
            sx={{ borderRadius: 2, minWidth: 100 }}
            disabled={submitting}
          >
            Restore
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default UsersPage;

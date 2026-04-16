import { useEffect, useState } from 'react';
import { toast } from 'react-hot-toast';
import Grid from '@mui/material/Grid2';
import {
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
  const { settings } = useSettings();
  const { activeRole, user: currentUser } = useAuth();
  const [tabValue, setTabValue] = useState(0);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalRecords, setTotalRecords] = useState(0);
  const [counts, setCounts] = useState({ all: 0, management: 0, staff: 0, customers: 0, inactive: 0 });
  const ROWS_PER_PAGE = 10;

  // Dialog states
  const [userDialog, setUserDialog] = useState(false);
  const [passwordDialog, setPasswordDialog] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [dialogTab, setDialogTab] = useState(0);

  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [openDeleteDialog, setOpenDeleteDialog] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null);
  const [openStatusDialog, setOpenStatusDialog] = useState(false);
  const [statusTarget, setStatusTarget] = useState<User | null>(null);
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
    department: ''
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
    { value: 'food_runner', label: 'Food Runner', icon: KitchenIcon, color: '#8bc34a' },
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
      }

      const response = await usersAPI.getUsers({
        page,
        limit: ROWS_PER_PAGE,
        role: roleFilter,
        isActive: activeFilter
      });

      const extracted = extractUsersFromResponse(response.data);
      if (tabValue === 0) {
        // Show only staff in "All Staff"
        setUsers(extracted.filter(u => !isCustomerUser(u)));
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
      phone: validatePhone(userForm.phone),
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
    // Validate critical fields
    if (!validateUserForm()) {
      toast.error('Please fill all the required fields');
      return;
    }

    try {
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
        email: userForm.email.toLowerCase().trim(),
        phone: userForm.phone.trim(),
        countryCode: userForm.countryCode,
        roles: userForm.roles,
        permissions: convertedPermissions,
        isActive: userForm.isActive !== false,
        salary: userForm.salary ? parseFloat(userForm.salary) : 0,
        hireDate: userForm.hireDate ? new Date(userForm.hireDate).toISOString() : new Date().toISOString(),
        department: userForm.department?.trim() || ''
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
    }
  };

  const handlePasswordReset = async () => {
    if (!selectedUser?._id) {
      toast.error('No user selected for password reset');
      return;
    }

    if (!validatePasswordForm()) {
      toast.error('Please fix the errors in the form');
      return;
    }

    try {
      await usersAPI.resetPassword(selectedUser._id, {
        newPassword: passwordForm.newPassword
      });
      toast.success('Password reset successfully');
      closePasswordDialog();
    } catch (err: any) {
      toast.error('Failed to reset password: ' + (err.response?.data?.message || err.message));
    }
  };

  const handleToggleStatus = (user: User) => {
    setStatusTarget(user);
    setOpenStatusDialog(true);
  };

  const confirmToggleStatus = async (userId: string) => {
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
    if (!deleteTarget) return;

    try {
      // 1. Check if we should delete directly or raise a ticket
      // In theory, if the button was enabled, it depends on who is target and who is actor
      const targetUser = users.find(u => u._id === deleteTarget.id);
      const isSuperAdmin = activeRole === 'superadmin' || currentUser?.roles?.includes('superadmin');
      const isAdmin = activeRole === 'admin' || currentUser?.roles?.includes('admin');
      const targetIsAdmin = targetUser?.roles?.includes('admin') || targetUser?.role === 'admin';

      if (isSuperAdmin || (isAdmin && !targetIsAdmin)) {
        // DELETE DIRECTLY
        await usersAPI.delete(deleteTarget.id);
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
    }
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
      department: ''
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

  const openEditUser = (user: User) => {
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
      department: user.department || ''
    });
    setEditingUser(user);
    setDialogTab(0);
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

    const searchEmail = actorEmail.trim().toLowerCase();
    const user = users.find(u => u.email?.trim().toLowerCase() === searchEmail);

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

  return (
    <Box>
      <Box sx={{
        display: 'flex',
        flexDirection: { xs: 'column', sm: 'row' },
        justifyContent: 'space-between',
        alignItems: { xs: 'stretch', sm: 'center' },
        gap: 2,
        mb: 3
      }}>
        <Typography variant="h4" fontWeight="bold" sx={{ textAlign: { xs: 'center', sm: 'left' } }}>
          User Management
        </Typography>
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
          sx={{ width: { xs: '100%', sm: 'auto' } }}
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
          mb: 3,
          borderBottom: 1,
          borderColor: 'divider',
          '& .MuiTabs-scrollButtons': {
            '&.Mui-disabled': { opacity: 0.3 },
          },
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
      </Tabs>

      {/* Users Display */}
      <Box>
        {loading && (
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Loading users...
          </Typography>
        )}
        <Box sx={{
          display: 'flex',
          flexDirection: { xs: 'column', sm: 'row' },
          justifyContent: 'space-between',
          alignItems: { xs: 'flex-start', sm: 'center' },
          gap: 1,
          mb: 3
        }}>
          <Typography variant="h6" fontWeight="medium" color="text.secondary">
            {tabValue === 0 && 'All Staff Members'}
            {tabValue === 1 && 'Management Team'}
            {tabValue === 2 && 'Staff Members'}
            {tabValue === 3 && 'Customers'}
            {tabValue === 4 && 'Inactive Users'}
          </Typography>
        </Box>
        <Grid container spacing={3}>
          {users.map((user) => {
            const primaryRole = tabValue === 3 ? 'customer' : getPrimaryRole(user);
            const roleInfo = getRoleInfo(primaryRole);
            const RoleIcon = roleInfo.icon;
            const isPortalCustomer = Boolean(user.isPortalCustomer || user.source === 'customer_portal');
            return (
              <Grid size={{ xs: 12, sm: 6, md: 4 }} key={user._id}>
                <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                  <CardContent sx={{ flexGrow: 1 }}>
                    <Box display="flex" alignItems="center" mb={2}>
                      <Avatar
                        sx={{
                          bgcolor: roleInfo.color,
                          mr: 2,
                          width: 56,
                          height: 56
                        }}
                      >
                        <RoleIcon />
                      </Avatar>
                      <Box flex={1}>
                        <Typography variant="h6">
                          {getDisplayName(user)}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          {user.email}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {user.phone}
                        </Typography>
                      </Box>
                      {!user.isActive && <LockIcon color="error" />}
                    </Box>
                    <Box mb={2} sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                      {getRolesForUser(user).map(r => {
                        const rInfo = getRoleInfo(r);
                        return (
                          <Chip
                            key={r}
                            label={rInfo.label}
                            sx={{
                              backgroundColor: rInfo.color + '20',
                              color: rInfo.color,
                              mb: 0.5
                            }}
                            size="small"
                          />
                        );
                      })}
                      <Chip
                        label={user.isActive ? 'Active' : 'Inactive'}
                        color={getStatusColor(user)}
                        size="small"
                        sx={{ mb: 0.5 }}
                      />
                    </Box>
                    {user.department && (
                      <Typography variant="body2" color="text.secondary">
                        Department: {user.department}
                      </Typography>
                    )}
                    {isPortalCustomer && (
                      <Typography variant="body2" color="text.secondary">
                        Source: Customer portal
                      </Typography>
                    )}

                    {!isCustomerUser(user) && user.hireDate && (
                      <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                        <strong>Hired:</strong> {getSafeDateString(user.hireDate)}
                      </Typography>
                    )}
                    {user.actionHistory && user.actionHistory.length > 0 && (
                      <>
                        {(() => {
                          const createdAction = user.actionHistory.find((action: any) => action.action === 'CREATED');
                          if (createdAction) {
                            return (
                              <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1, mt: 1 }}>
                                <Typography variant="body2" color="text.secondary" sx={{ flex: 1 }}>
                                  Created by: <strong>{createdAction.performedByName || getUserName(createdAction.performedBy)}</strong>
                                  <br />
                                  <Box component="span" sx={{ color: 'text.disabled', fontSize: '0.75rem' }}>
                                    {getSafeDateString(createdAction.timestamp, true)}
                                  </Box>
                                </Typography>
                                <Tooltip
                                  slotProps={{
                                    popper: {
                                      modifiers: [
                                        {
                                          name: 'preventOverflow',
                                          options: {
                                            boundary: 'viewport',
                                            padding: 16,
                                          },
                                        },
                                      ],
                                    },
                                    tooltip: {
                                      sx: {
                                        p: 0,
                                        bgcolor: 'background.paper',
                                        boxShadow: 3,
                                        border: '1px solid',
                                        borderColor: 'divider',
                                        color: 'text.primary',
                                        maxWidth: { xs: 220, sm: 260 }
                                      }
                                    }
                                  }}
                                  title={
                                    <Box>
                                      <Box sx={{ p: 1, borderBottom: '1px solid', borderColor: 'divider', bgcolor: 'action.hover' }}>
                                        <Typography variant="caption" fontWeight="bold">
                                          Action History
                                        </Typography>
                                      </Box>
                                      <Box sx={{ maxHeight: { xs: 160, sm: 200 }, overflowY: 'auto', p: 1 }}>
                                        {user.actionHistory?.slice().reverse().map((action: any, idx: number) => (
                                          <Box key={idx} sx={{
                                            mb: 1,
                                            pb: 1,
                                            borderBottom: idx < (user.actionHistory?.length || 0) - 1 ? '1px solid' : 'none',
                                            borderColor: 'divider'
                                          }}>
                                            <Typography variant="caption" sx={{ fontWeight: 'bold', color: 'primary.main', display: 'block', mb: 0.5 }}>
                                              {action.action.replace(/_/g, ' ')}
                                            </Typography>
                                            <Typography variant="caption" display="block" sx={{ fontWeight: 500 }}>
                                              By: {action.performedByName || getUserName(action.performedBy)}
                                            </Typography>
                                            <Typography variant="caption" display="block" color="text.secondary">
                                              {getSafeDateString(action.timestamp, true)}
                                            </Typography>
                                            <Typography variant="caption" display="block" sx={{ mt: 0.5, color: 'text.primary' }}>
                                              {action.details}
                                            </Typography>
                                          </Box>
                                        ))}
                                      </Box>
                                    </Box>
                                  }
                                  arrow
                                  placement="top"
                                  enterTouchDelay={0}
                                  leaveTouchDelay={5000}
                                >
                                  <IconButton size="small" color="primary">
                                    <HistoryIcon fontSize="small" />
                                  </IconButton>
                                </Tooltip>
                              </Box>
                            );
                          }
                          return null;
                        })()}
                      </>
                    )}
                    {user.permissions && user.permissions.length > 0 && (
                      <Typography variant="caption" color="text.secondary">
                        Permissions: {user.permissions.length}
                      </Typography>
                    )}
                  </CardContent>
                  <CardActions>
                    <IconButton onClick={() => openPasswordReset(user)} title="Reset Password" >
                      <LockIcon />
                    </IconButton>
                    <IconButton onClick={() => openEditUser(user)} title="Edit User">
                      <EditIcon />
                    </IconButton>
                    <IconButton
                      onClick={() => handleToggleStatus(user)}
                      title={user.isActive ? 'Deactivate' : 'Activate'}
                    >
                      {user.isActive ? <ActivateIcon /> : <DeactivateIcon />}
                    </IconButton>
                    <IconButton
                      onClick={() => handleDeleteUser(user)}
                      title={
                        (activeRole === 'superadmin' || currentUser?.roles?.includes('superadmin'))
                          ? 'Delete User'
                          : (user.roles?.includes('admin') || user.role === 'admin')
                            ? 'Admin deletion requires support ticket'
                            : 'Delete User'
                      }
                      disabled={
                        // Keep enabled for admins even if target is admin, but logic will change in confirmDeleteUser
                        // Actually, the requirement says "has to raise a ticket". 
                        // If we disable it, they can't even raise the ticket via this button.
                        // So let's keep it ENABLED for admins and superadmins.
                        !(activeRole === 'admin' || activeRole === 'superadmin' || currentUser?.roles?.includes('admin') || currentUser?.roles?.includes('superadmin'))
                      }
                    >
                      <DeleteIcon />
                    </IconButton>
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
      </Box>
      {/* Add/Edit User Dialog */}
      <Dialog open={userDialog} onClose={closeUserDialog} maxWidth="lg" fullWidth>
        <DialogTitle sx={{ m: 0, p: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="h6" fontWeight="bold">
            {editingUser ? 'Edit User' : 'Add User'}
          </Typography>
          <IconButton
            onClick={closeUserDialog}
            size="small"
            sx={{
              color: 'white',
              bgcolor: 'error.main',
              '&:hover': { bgcolor: 'error.dark' },
              width: 24,
              height: 24
            }}
          >
            <CloseIcon sx={{ fontSize: '1.1rem' }} />
          </IconButton>
        </DialogTitle>
        <DialogContent sx={{ minHeight: 400 }}>
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
            <Grid container spacing={2} sx={{ mt: 1 }}>
              {/* Basic Information */}
              <Grid size={{ xs: 12 }}>
                <Typography variant="h6" gutterBottom>Basic Information</Typography>
                <Divider sx={{ mb: 2 }} />
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField
                  fullWidth
                  label="First Name"
                  value={userForm.firstName}
                  onChange={(e) => {
                    setUserForm({ ...userForm, firstName: e.target.value });
                    if (userErrors.firstName) setUserErrors(prev => ({ ...prev, firstName: { isValid: true } }));
                  }}
                  onBlur={() => {
                    const validation = validateName(userForm.firstName, 'First name');
                    setUserErrors(prev => ({ ...prev, firstName: validation }));
                  }}
                  error={hasError(userErrors.firstName)}
                  helperText={getHelperText(userErrors.firstName)}
                  margin="normal"
                  required
                />
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField
                  fullWidth
                  label="Last Name"
                  value={userForm.lastName}
                  onChange={(e) => {
                    setUserForm({ ...userForm, lastName: e.target.value });
                    if (userErrors.lastName) setUserErrors(prev => ({ ...prev, lastName: { isValid: true } }));
                  }}
                  onBlur={() => {
                    const validation = validateName(userForm.lastName, 'Last name');
                    setUserErrors(prev => ({ ...prev, lastName: validation }));
                  }}
                  error={hasError(userErrors.lastName)}
                  helperText={getHelperText(userErrors.lastName)}
                  margin="normal"
                  required
                />
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField
                  fullWidth
                  label="Email"
                  type="email"
                  value={userForm.email}
                  onChange={(e) => {
                    setUserForm({ ...userForm, email: e.target.value });
                    if (userErrors.email) setUserErrors(prev => ({ ...prev, email: { isValid: true } }));
                  }}
                  onBlur={() => {
                    const validation = validateEmail(userForm.email);
                    setUserErrors(prev => ({ ...prev, email: validation }));
                  }}
                  error={hasError(userErrors.email)}
                  helperText={getHelperText(userErrors.email)}
                  margin="normal"
                  required
                />
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <PhoneInput
                  fullWidth
                  label="Phone"
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
                <FormControl fullWidth margin="normal">
                  <InputLabel>Roles</InputLabel>
                  <Select
                    multiple
                    value={userForm.roles}
                    onChange={(e) => {
                      const value = typeof e.target.value === 'string' ? e.target.value.split(',') : e.target.value;
                      handleRolesChange(value as string[]);
                    }}
                    label="Roles"
                    renderValue={(selected) => (
                      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                        {(selected as string[]).map((value) => {
                          const roleInfo = getRoleInfo(value);
                          return <Chip key={value} label={roleInfo.label} size="small" />;
                        })}
                      </Box>
                    )}
                  >
                    {roles.map((role) => (
                      <MenuItem key={role.value} value={role.value}>
                        <Box display="flex" alignItems="center" gap={1}>
                          <role.icon fontSize="small" style={{ color: role.color }} />
                          {role.label}
                        </Box>
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              {!userForm.roles.includes('customer') && (
                <>
                  <Grid size={{ xs: 12, sm: 6 }}>
                    <FormControl fullWidth margin="normal">
                      <InputLabel id="department-label">Department</InputLabel>
                      <Select
                        labelId="department-label"
                        value={userForm.department}
                        label="Department"
                        onChange={(e) => setUserForm({ ...userForm, department: e.target.value })}
                      >
                        <MenuItem value="">
                          <em>None</em>
                        </MenuItem>
                        {DEPARTMENT_OPTIONS.map((dept) => (
                          <MenuItem key={dept} value={dept}>
                            {dept}
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  </Grid>
                  {/* Employment Information */}
                  <Grid size={{ xs: 12 }}>
                    <Typography variant="h6" gutterBottom sx={{ mt: 2 }}>Employment Information</Typography>
                    <Divider sx={{ mb: 2 }} />
                  </Grid>
                  <Grid size={{ xs: 12, sm: 6 }}>
                    <TextField
                      fullWidth
                      label="Salary"
                      type="number"
                      value={userForm.salary}
                      onChange={(e) => {
                        setUserForm({ ...userForm, salary: e.target.value });
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
                      margin="normal"
                      required={!userForm.roles.includes('customer')}
                    />
                  </Grid>
                  <Grid size={{ xs: 12, sm: 6 }}>
                    <TextField
                      fullWidth
                      label="Hire Date"
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
                      margin="normal"
                      InputLabelProps={{ shrink: true }}
                      required={!userForm.roles.includes('customer')}
                    />
                  </Grid>
                </>
              )}
              {/* Address Information */}
              <Grid size={{ xs: 12 }}>
                <Typography variant="h6" gutterBottom sx={{ mt: 2 }}>Address {userForm.roles.includes('customer') && <span style={{ color: 'red' }}>*</span>}</Typography>
                <Divider sx={{ mb: 2 }} />
              </Grid>
              <Grid size={{ xs: 12 }}>
                <AddressAutocomplete
                  label="Street Address"
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
                  sx={userForm.roles.includes('customer') ? { '& .MuiInputLabel-asterisk': { color: 'error.main' } } : {}}
                />
              </Grid>
              <Grid size={{ xs: 12, sm: 4 }}>
                <TextField
                  fullWidth
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
                  margin="normal"
                  required={userForm.roles.includes('customer')}
                  sx={userForm.roles.includes('customer') ? { '& .MuiInputLabel-asterisk': { color: 'error.main' } } : {}}
                />
              </Grid>
              <Grid size={{ xs: 12, sm: 4 }}>
                <TextField
                  fullWidth
                  label="State"
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
                      const validation = validateRequired(userForm.address.state, 'State');
                      setUserErrors(prev => ({ ...prev, state: validation }));
                    }
                  }}
                  error={hasError(userErrors.state)}
                  helperText={getHelperText(userErrors.state)}
                  margin="normal"
                  required={userForm.roles.includes('customer')}
                  sx={userForm.roles.includes('customer') ? { '& .MuiInputLabel-asterisk': { color: 'error.main' } } : {}}
                />
              </Grid>
              <Grid size={{ xs: 12, sm: 4 }}>
                <TextField
                  fullWidth
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
                  margin="normal"
                  required={userForm.roles.includes('customer')}
                  sx={userForm.roles.includes('customer') ? { '& .MuiInputLabel-asterisk': { color: 'error.main' } } : {}}
                />
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
            </Grid>
          )}

          {dialogTab === 1 && editingUser && (
            <Box mt={2} sx={{ maxHeight: { xs: 220, sm: 280 }, overflowY: 'auto' }}>
              <ActionHistoryList history={editingUser.actionHistory || []} emptyMessage="No history recorded for this user." />
            </Box>
          )}
        </DialogContent>
        <DialogActions sx={{ p: 2, gap: 1 }}>
          <Button
            onClick={closeUserDialog}
            sx={{ flex: 1 }}
          >
            Cancel
          </Button>
          <Button
            onClick={handleUserSubmit}
            variant="contained"
            sx={{ flex: 1 }}
          >
            {editingUser ? 'Update' : 'Create'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Password Reset Dialog */}
      <Dialog open={passwordDialog} onClose={closePasswordDialog} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ m: 0, p: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="h6" fontWeight="bold">
            Reset Password - {getDisplayName(selectedUser)}
          </Typography>
          <IconButton
            onClick={closePasswordDialog}
            size="small"
            sx={{
              color: 'white',
              bgcolor: 'error.main',
              '&:hover': { bgcolor: 'error.dark' },
              width: 24,
              height: 24
            }}
          >
            <CloseIcon sx={{ fontSize: '1.1rem' }} />
          </IconButton>
        </DialogTitle>
        <DialogContent>
          <TextField
            fullWidth
            label="New Password"
            type="password"
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
          />
          <TextField
            fullWidth
            label="Confirm Password"
            type="password"
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
          />
        </DialogContent>
        <DialogActions sx={{ p: 2, gap: 1 }}>
          <Button
            onClick={closePasswordDialog}
            sx={{ flex: 1 }}
          >
            Cancel
          </Button>
          <Button
            onClick={handlePasswordReset}
            variant="contained"
            sx={{ flex: 1 }}
          >
            Reset Password
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={openDeleteDialog}
        onClose={closeDeleteDialog}
        PaperProps={{
          sx: { borderRadius: 2, p: 1 }
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
              <DialogTitle sx={{ textAlign: 'center', pb: 0 }}>
                <Typography variant="h6" fontWeight="bold">
                  {willDeleteDirectly ? 'Confirm User Deletion' : 'Request User Deletion'}
                </Typography>
              </DialogTitle>
              <DialogContent sx={{ textAlign: 'center', py: 2 }}>
                <Typography>
                  Are you sure you want to {willDeleteDirectly ? 'delete' : 'request the deletion of'} <Box component="span" sx={{ fontWeight: 'bold' }}>{deleteTarget?.name}</Box>?
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                  {willDeleteDirectly
                    ? 'This action is permanent and will remove the user from all system access immediately.'
                    : 'This will raise a priority ticket to the Super Admin for confirmation and manual processing.'}
                </Typography>
              </DialogContent>
              <DialogActions sx={{ justifyContent: 'center', pb: 2, gap: 2 }}>
                <Button
                  onClick={closeDeleteDialog}
                  variant="outlined"
                  sx={{ borderRadius: 2, minWidth: 100 }}
                >
                  Cancel
                </Button>
                <Button
                  onClick={confirmDeleteUser}
                  variant="contained"
                  color={willDeleteDirectly ? 'error' : 'primary'}
                  sx={{ borderRadius: 2, minWidth: 100 }}
                >
                  {willDeleteDirectly ? 'Delete Now' : 'Raise Request'}
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
        <DialogTitle sx={{ textAlign: 'center', pb: 0 }}>
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
    </Box>
  );
};

export default UsersPage;

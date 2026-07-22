import {
    Add as AddIcon,
    CheckCircle as CheckCircleIcon,
    CreditCard as CreditCardIcon,
    Delete as DeleteIcon,
    DeliveryDining as DeliveryDiningIcon,
    Edit as EditIcon,
    History as HistoryIcon,
    Login as LoginIcon,
    Logout as LogoutIcon,
    PlayArrow as PlayArrowIcon,
    PriceChange as PriceChangeIcon,
    Print as PrintIcon,
    Refresh as RefreshIcon,
    Save as SaveIcon,
    Sms as SmsIcon,
    Star as StarIcon,
    Terminal as TerminalIcon,
    Visibility,
    VisibilityOff
} from '@mui/icons-material';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import {
    Alert,
    Avatar,
    Box,
    Button,
    Checkbox,
    Chip,
    CircularProgress,
    Collapse,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    Divider,
    FormControlLabel,
    IconButton,
    InputAdornment,
    MenuItem,
    Paper,
    Radio,
    Stack,
    Switch,
    Tab,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TablePagination,
    TableRow,
    Tabs,
    TextField,
    Tooltip,
    Typography,
    alpha,
    useMediaQuery
} from '@mui/material';
import Grid from '@mui/material/Grid2';
import { useTheme } from '@mui/material/styles';
import React, { useEffect, useState } from 'react';
import { toast } from 'react-hot-toast';
import AddressAutocomplete from '../../components/AddressAutocomplete';
import PhoneInput from '../../components/PhoneInput';
import { useAuth } from '../../context/AuthContext';
import {
    IMPERIAL_UNITS,
    METRIC_UNITS,
    getDialCodeByCountry,
    getUnitSystem,
    useSettings,
    type BusinessHourDay,
    type NotificationSettings,
    type PaymentSettings,
    type PrinterConfig,
    type RestaurantGmailMailingSettings,
    type RestaurantMailingSettings,
    type RestaurantSettings,
    type RestaurantSmtpMailingSettings,
    type SettingsState,
    type SystemSettings,
    type TenantPrinterSettings,
    type UnitConfig
} from '../../context/SettingsContext';

import { apiBaseUrl, menuAPI, paymentsAPI, printersAPI, settingsAPI, smsAPI, tenantAPI, usersAPI } from '../../services/api';
import { printBillThermal } from '../../utils/printBillThermal';
import { printKotThermal } from '../../utils/kotThermal';
import { isThermalPrintAvailable, startPrintStation, stopPrintStation } from '../../services/thermalPrint';
import { connectUsbPrinter, disconnectUsbPrinter, isUsbPrintAvailable, isUsbPrinterConnected } from '../../services/usbPrint';

import { NOTIFICATION_SOUNDS, previewSound } from '../../utils/notificationSounds';
import type { ValidationResult } from '../../utils/validation';
import { getHelperText, hasError, validateAddress, validateCompanyName, validateEmail, validatePhone, validateRequired } from '../../utils/validation';

const countries = [
    {
        code: 'US',
        name: 'United States',
        currency: 'USD',
        currencySymbol: '$',
        timezones: [
            'America/New_York',
            'America/Chicago',
            'America/Denver',
            'America/Los_Angeles',
            'America/Phoenix',
            'America/Anchorage',
            'Pacific/Honolulu'
        ]
    },
    {
        code: 'IN',
        name: 'India',
        currency: 'INR',
        currencySymbol: '₹',
        timezones: ['Asia/Kolkata']
    },
    {
        code: 'GB',
        name: 'United Kingdom',
        currency: 'GBP',
        currencySymbol: '£',
        timezones: ['Europe/London']
    },
    {
        code: 'CA',
        name: 'Canada',
        currency: 'CAD',
        currencySymbol: 'C$',
        timezones: [
            'America/Toronto',
            'America/Vancouver',
            'America/Montreal',
            'America/Edmonton',
            'America/Winnipeg',
            'America/Halifax',
            'America/St_Johns'
        ]
    },
    {
        code: 'AU',
        name: 'Australia',
        currency: 'AUD',
        currencySymbol: 'A$',
        timezones: [
            'Australia/Sydney',
            'Australia/Melbourne',
            'Australia/Brisbane',
            'Australia/Perth',
            'Australia/Adelaide',
            'Australia/Darwin',
            'Australia/Hobart'
        ]
    },
    {
        code: 'SG',
        name: 'Singapore',
        currency: 'SGD',
        currencySymbol: 'S$',
        timezones: ['Asia/Singapore']
    },
    {
        code: 'AE',
        name: 'United Arab Emirates',
        currency: 'AED',
        currencySymbol: 'د.إ',
        timezones: ['Asia/Dubai']
    },
    {
        code: 'DE',
        name: 'Germany',
        currency: 'EUR',
        currencySymbol: '€',
        timezones: ['Europe/Berlin']
    },
    {
        code: 'FR',
        name: 'France',
        currency: 'EUR',
        currencySymbol: '€',
        timezones: ['Europe/Paris']
    },
    {
        code: 'JP',
        name: 'Japan',
        currency: 'JPY',
        currencySymbol: '¥',
        timezones: ['Asia/Tokyo']
    },
];


const isValidMailHost = (host: string) => {
    const value = String(host || '').trim();
    if (!value || /\s/.test(value)) {
        return false;
    }

    const hostnameRegex = /^(?=.{1,253}$)(?!-)[a-zA-Z0-9-]{1,63}(?<!-)(\.(?!-)[a-zA-Z0-9-]{1,63}(?<!-))+$/;
    const localhostRegex = /^localhost$/i;
    const ipv4Regex = /^(25[0-5]|2[0-4]\d|1?\d?\d)(\.(25[0-5]|2[0-4]\d|1?\d?\d)){3}$/;

    return hostnameRegex.test(value) || localhostRegex.test(value) || ipv4Regex.test(value);
};

const isLikelyGmailAppPassword = (password: string) =>
    /^[a-zA-Z0-9]{16}$/.test(String(password || '').replace(/\s+/g, ''));

interface TabPanelProps {
    children?: React.ReactNode;
    index: number;
    value: number;
}

function TabPanel(props: TabPanelProps) {
    const { children, value, index, ...other } = props;

    return (
        <div
            role="tabpanel"
            hidden={value !== index}
            id={`settings-tabpanel-${index}`}
            aria-labelledby={`settings-tab-${index}`}
            {...other}
        >
            {value === index && <Box sx={{ p: 3 }}>{children}</Box>}
        </div>
    );
}



const DEFAULT_BUSINESS_HOURS: BusinessHourDay[] = [
    { day: 'Monday', isOpen: false, slots: [{ openTime: '11:00', closeTime: '22:00' }] },
    { day: 'Tuesday', isOpen: true, slots: [{ openTime: '11:00', closeTime: '22:00' }] },
    { day: 'Wednesday', isOpen: true, slots: [{ openTime: '11:00', closeTime: '22:00' }] },
    { day: 'Thursday', isOpen: true, slots: [{ openTime: '11:00', closeTime: '22:00' }] },
    { day: 'Friday', isOpen: true, slots: [{ openTime: '11:00', closeTime: '23:00' }] },
    { day: 'Saturday', isOpen: true, slots: [{ openTime: '11:00', closeTime: '23:00' }] },
    { day: 'Sunday', isOpen: true, slots: [{ openTime: '12:00', closeTime: '21:00' }] },
];

const TIME_OPTIONS = Array.from({ length: 48 }, (_, i) => {
    const totalMinutes = i * 30;
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    const ampm = hours >= 12 ? 'PM' : 'AM';
    const displayHours = hours % 12 || 12;
    const displayMinutes = minutes.toString().padStart(2, '0');
    const value = `${hours.toString().padStart(2, '0')}:${displayMinutes}`;
    return {
        label: `${displayHours}:${displayMinutes} ${ampm}`,
        value,
        minutes: totalMinutes,
        group: hours < 12 ? 'Morning' : hours < 17 ? 'Afternoon' : hours < 21 ? 'Evening' : 'Night'
    };
});

/** Closing Time Options (includes EOD and supports wrap-around display logic) */
const CLOSING_TIME_OPTIONS = [
    ...TIME_OPTIONS,
    { label: '11:59 PM', value: '23:59', minutes: 1439, group: 'Night' }
];

// Add EOD value
TIME_OPTIONS.push({
    label: '11:59 PM',
    value: '23:59',
    minutes: 1439,
    group: 'Night'
});

/** Time Utility Functions */
const timeToMinutes = (time: string): number => {
    if (!time) return 0;
    const [h, m] = time.split(':').map(Number);
    return (h || 0) * 60 + (m || 0);
};

const formatTimeDisplay = (timeStr: string): string => {
    if (!timeStr) return '';
    const mins = timeToMinutes(timeStr);
    const hours = Math.floor(mins / 60);
    const minutes = mins % 60;
    const ampm = hours >= 12 ? 'PM' : 'AM';
    const h12 = hours % 12 || 12;
    return `${h12}:${minutes.toString().padStart(2, '0')} ${ampm}`;
};

/** Pure helper: given businessHours + IANA timezone, compute if currently open */
const isCurrentlyOpen = (hours: BusinessHourDay[], timezone: string): boolean => {
    try {
        const now = new Date();
        const todayName = now.toLocaleString('en-US', { weekday: 'long', timeZone: timezone });

        const timeOpts = { timeZone: timezone, hour: 'numeric', minute: 'numeric', hourCycle: 'h23' } as any;
        const timeParts = new Intl.DateTimeFormat('en-US', timeOpts).formatToParts(now);

        const hourStr = timeParts.find(p => p.type === 'hour')?.value || '0';
        const minuteStr = timeParts.find(p => p.type === 'minute')?.value || '0';
        const currentMinutes = parseInt(hourStr, 10) * 60 + parseInt(minuteStr, 10);

        const config = hours.find(h => h.day?.toLowerCase() === todayName?.toLowerCase());
        if (!config || !config.isOpen) return false;

        const slots = config.slots || (config.openTime && config.closeTime ? [{ openTime: config.openTime, closeTime: config.closeTime }] : []);

        return slots.some(slot => {
            const [oh, om] = slot.openTime.split(':').map(Number);
            const [ch, cm] = slot.closeTime.split(':').map(Number);
            const openMins = oh * 60 + om;
            const closeMins = ch * 60 + cm;
            if (closeMins < openMins) return currentMinutes >= openMins || currentMinutes < closeMins;
            return currentMinutes >= openMins && currentMinutes < closeMins;
        });
    } catch { return true; }
};

// Redundant local definition of RestaurantSettings removed


// Redundant local definitions removed


const createDefaultMailingSettings = (): RestaurantMailingSettings => ({
    enabled: false,
    provider: 'gmail',
    fromName: '',
    gmail: {
        email: '',
        fromEmail: '',
        appPassword: '',
    },
    smtp: {
        host: '',
        port: 587,
        secure: false,
        username: '',
        password: '',
        fromEmail: '',
    },
    status: {
        hasGmailAppPassword: false,
        hasSmtpPassword: false,
    },
});

const createDefaultSettings = (): SettingsState => ({
    restaurant: {
        name: '',
        address: '',
        city: '',
        state: '',
        zipCode: '',
        phone: '',
        email: '',
        currency: 'USD',
        currencySymbol: '$',
        taxRate: 5,
        taxBreakdown: {
            enabled: false,
            country: 5,
            state: 0,
            city: 0,
            county: 0
        },
        logo: '',
        country: 'United States',
        timezone: 'America/New_York',
        dialCode: '1',
        tablePricing: {
            enabled: true,
            sharedBaseRate: 100,
            privateBaseRate: 100
        },
        occasions: [
            "Birthday Party",
            "Sweet Sixteen Party",
            "Graduation Party",
            "Wedding Reception",
            "Engagement Party",
            "Baby Shower",
            "Business Meeting",

        ],
        deliveryRadius: 15,
        businessHours: DEFAULT_BUSINESS_HOURS,
        mailing: createDefaultMailingSettings(),
    },
    system: {
        theme: 'light',
        notifications: true,
        autoPrint: false,
        googleMapsApiKey: '',
        posPaymentMethods: {
            cash: true,
            card: true,
            zelle: true,
            venmo: true,
            cheque: true,
            creditCard: true,
            debitCard: true,
        }
    },
    payment: {
        stripePublishableKey: '',
        stripeSecretKey: '',
        stripeWebhookSecret: '',
        stripeMode: 'test',
    },
    notification: {
        sms: {
            enabled: false,
            provider: 'twilio',
            twilio: {
                accountSid: '',
                authToken: '',
                fromNumber: '',
            },
        },
        push: {
            roles: {
                // superadmin has its own separate portal and is never a target for
                // in-restaurant notifications, so it has no row here.
                admin: { orders: true, catering: true, inventory: true, bookings: true },
                manager: { orders: true, catering: true, inventory: true, bookings: true },
                cashier: { orders: true, catering: false, inventory: false, bookings: true },
                waiter: { orders: true, catering: false, inventory: false, bookings: true },
                kitchen_staff: { orders: false, catering: false, inventory: true, bookings: false },
                food_runner: { orders: false, catering: false, inventory: false, bookings: false },
                delivery: { orders: false, catering: false, inventory: false, bookings: false },
                customer: { orders: false, catering: false, inventory: false, bookings: false }
            },
            users: {}
        },
        sound: 'notification',
        soundDuration: 6,
    },
    printer: {
        enabled: false,
        preferredAgentId: '',
        billing: { name: 'Main Printer', type: 'none', ip: '', port: 80, paperWidth: 80, deviceId: 'local_printer' },
        kitchen: { name: 'Kitchen Printer', type: 'none', ip: '', port: 80, paperWidth: 80, deviceId: 'local_printer' },
    },
    rewards: {
        isEnabled: true,
        displayName: 'Points',
        pointValue: 0.05,
        earnRate: 1,
        calculationBase: 'total',
        minOrderValueToEarn: 0,
        welcomeBonus: 100,
        firstOrderBonus: 0,
        minPointsToRedeem: 100,
        maxRedemptionPercentage: 100,
        pointsPerRating: 0,
    },
    delivery: {
        builtIn: {
            enabled: false,
            minDeliveryRange: 0,
            maxDeliveryRange: 15,
            baseFee: 2.00,
            baseMiles: 2,
            perMileRate: 0.50,
        },
        doordash: {
            enabled: false,
            developerId: '',
            keyId: '',
            signingSecret: '',
            isSandbox: true,
        },
        ubereats: {
            enabled: false,
            clientId: '',
            clientSecret: '',
            customerId: '',
            storeId: '',
            isSandbox: true,
        }
    }
});

const mergeSettingsWithDefaults = (defaults: SettingsState, partial: Partial<SettingsState>): SettingsState => {
    const fetchedPayment = (partial.payment ?? {}) as Partial<PaymentSettings>;
    const fetchedSystem = (partial.system ?? {}) as Partial<SystemSettings>;

    const mergedSystem: SystemSettings = {
        theme: fetchedSystem.theme ?? defaults.system.theme,
        notifications: fetchedSystem.notifications ?? defaults.system.notifications,
        autoPrint: fetchedSystem.autoPrint ?? defaults.system.autoPrint,
        googleMapsApiKey: fetchedSystem.googleMapsApiKey ?? defaults.system.googleMapsApiKey,
        posPaymentMethods: {
            cash: fetchedSystem.posPaymentMethods?.cash ?? (defaults.system.posPaymentMethods?.cash ?? true),
            card: fetchedSystem.posPaymentMethods?.card ?? (defaults.system.posPaymentMethods?.card ?? true),
            zelle: fetchedSystem.posPaymentMethods?.zelle ?? (defaults.system.posPaymentMethods?.zelle ?? true),
            venmo: fetchedSystem.posPaymentMethods?.venmo ?? (defaults.system.posPaymentMethods?.venmo ?? true),
            cheque: fetchedSystem.posPaymentMethods?.cheque ?? (defaults.system.posPaymentMethods?.cheque ?? true),
            creditCard: fetchedSystem.posPaymentMethods?.creditCard ?? (defaults.system.posPaymentMethods?.creditCard ?? true),
            debitCard: fetchedSystem.posPaymentMethods?.debitCard ?? (defaults.system.posPaymentMethods?.debitCard ?? true),
        }
    };

    // Stripe settings come from tenant API; ensure defaults filled
    const mergedPayment: PaymentSettings = {
        stripePublishableKey: fetchedPayment.stripePublishableKey ?? defaults.payment.stripePublishableKey,
        stripeSecretKey: fetchedPayment.stripeSecretKey ?? defaults.payment.stripeSecretKey,
        stripeWebhookSecret: fetchedPayment.stripeWebhookSecret ?? defaults.payment.stripeWebhookSecret,
        stripeMode: fetchedPayment.stripeMode ?? defaults.payment.stripeMode,
    };

    const mergedPrinter: TenantPrinterSettings = {
        enabled: partial.printer?.enabled ?? false,
        preferredAgentId: partial.printer?.preferredAgentId ?? '',
        billing: partial.printer?.billing ?? { name: 'Main Printer', type: 'none', ip: '', port: 80, paperWidth: 80, deviceId: 'local_printer' },
        kitchen: partial.printer?.kitchen ?? { name: 'Kitchen Printer', type: 'none', ip: '', port: 80, paperWidth: 80, deviceId: 'local_printer' },
    };

    return {

        restaurant: {
            ...defaults.restaurant,
            ...((partial.restaurant as Partial<RestaurantSettings>) || {}),
            mailing: {
                ...createDefaultMailingSettings(),
                ...(((partial.restaurant as Partial<RestaurantSettings>) || {}).mailing || {}),
                gmail: {
                    ...createDefaultMailingSettings().gmail,
                    ...((((partial.restaurant as Partial<RestaurantSettings>) || {}).mailing || {}).gmail || {}),
                },
                smtp: {
                    ...createDefaultMailingSettings().smtp,
                    ...((((partial.restaurant as Partial<RestaurantSettings>) || {}).mailing || {}).smtp || {}),
                },
                status: {
                    ...createDefaultMailingSettings().status,
                    ...((((partial.restaurant as Partial<RestaurantSettings>) || {}).mailing || {}).status || {}),
                },
            },
        },
        system: mergedSystem,
        payment: mergedPayment,
        notification: {
            ...defaults.notification,
            ...((partial.notification as Partial<NotificationSettings>) || {}),
            sound: (partial.notification as Partial<NotificationSettings>)?.sound ?? defaults.notification.sound,
            soundDuration: (partial.notification as Partial<NotificationSettings>)?.soundDuration ?? defaults.notification.soundDuration,
            sms: {
                ...defaults.notification.sms,
                ...((partial.notification as Partial<NotificationSettings>)?.sms || {}),
                twilio: {
                    ...defaults.notification.sms.twilio,
                    ...((partial.notification as Partial<NotificationSettings>)?.sms?.twilio || {}),
                },
            },
        },
        printer: mergedPrinter,
        rewards: {
            ...defaults.rewards,
            ...(partial.rewards || {}),
        },
        delivery: {
            builtIn: {
                ...defaults.delivery!.builtIn,
                ...(partial.delivery?.builtIn || {}),
            },
            doordash: {
                ...defaults.delivery!.doordash,
                ...(partial.delivery?.doordash || {}),
            },
            ubereats: {
                ...defaults.delivery!.ubereats,
                ...(partial.delivery?.ubereats || {}),
            }
        }
    };
};


/**
 * Settings UI block for a wired (USB / WebUSB) printer. Lets the user grant access to the
 * physically connected printer and run a test print. WebUSB only exists in Chromium desktop
 * browsers (Chrome / Edge) on a secure context — hence the availability guard.
 */
const UsbPrinterSection: React.FC<{
    role: 'billing' | 'kitchen';
    connected: boolean;
    available: boolean;
    onConnect: () => void;
    onDisconnect: () => void;
    onTest: () => void;
}> = ({ connected, available, onConnect, onDisconnect, onTest }) => {
    if (!available) {
        return (
            <Grid size={{ xs: 12 }}>
                <Alert severity="warning">
                    Wired USB printing uses WebUSB, which is only supported in <strong>Chrome</strong> or <strong>Edge</strong> on a desktop.
                    It is not available in this browser, the mobile app, or on Clover devices.
                </Alert>
            </Grid>
        );
    }
    return (
        <>
            <Grid size={{ xs: 12 }}>
                <Alert severity={connected ? 'success' : 'info'}>
                    {connected
                        ? 'USB printer connected. Bills/KOTs will print to it directly.'
                        : 'Plug the printer into this computer via USB, then click "Connect USB Printer" and pick it from the list.'}
                </Alert>
            </Grid>
            <Grid size={{ xs: 12 }} sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', alignItems: 'center' }}>
                <Chip
                    label={connected ? 'Connected' : 'Not connected'}
                    color={connected ? 'success' : 'default'}
                    size="small"
                />
                <Button variant="outlined" onClick={onConnect} startIcon={<PrintIcon />}>
                    {connected ? 'Reconnect USB Printer' : 'Connect USB Printer'}
                </Button>
                {connected && (
                    <Button variant="text" color="error" onClick={onDisconnect}>
                        Disconnect
                    </Button>
                )}
                <Button variant="outlined" onClick={onTest} startIcon={<PrintIcon />}>
                    Send Test Print
                </Button>
            </Grid>
        </>
    );
};

const SettingsPage: React.FC = () => {
    const { user } = useAuth();
    const { updateSettings: updateGlobalSettings, formatCurrency } = useSettings();
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
    const headingFontSize = { xs: '1.12rem', sm: '1.4rem', md: '2.125rem' };
    const bodyFontSize = { xs: '0.78rem', sm: '0.86rem', md: '0.95rem' };
    const [tabValue, setTabValue] = useState(0);
    const [loading, setLoading] = useState(false);
    const [settings, setSettings] = useState<SettingsState>(() => createDefaultSettings());
    const [errors, setErrors] = useState<Record<string, ValidationResult>>({});
    const [fetchingTax, setFetchingTax] = useState(false);
    const [webhookUrl, setWebhookUrl] = useState<string>('');

    const [showTwilioAuthToken, setShowTwilioAuthToken] = useState(false);
    const [showStripeSecretKey, setShowStripeSecretKey] = useState(false);
    const [showStripeWebhookSecret, setShowStripeWebhookSecret] = useState(false);

    const [stripeStatus, setStripeStatus] = useState<{ stripeMode?: string; hasPublishableKey?: boolean; hasSecretKey?: boolean; hasWebhookSecret?: boolean }>({});
    const [usersList, setUsersList] = useState<any[]>([]);
    const [expandedDays, setExpandedDays] = useState<Record<string, boolean>>({});
    const [pairedAgents, setPairedAgents] = useState<any[]>([]);
    const [agentsLoading, setAgentsLoading] = useState(false);
    const [newToken, setNewToken] = useState<string | null>(null);
    const [userAlertsPage, setUserAlertsPage] = useState(0);
    const [userAlertsRowsPerPage, setUserAlertsRowsPerPage] = useState(10);
    const [totalUsers, setTotalUsers] = useState(0);

    const [smsLogs, setSmsLogs] = useState<any[]>([]);
    const [smsPage, setSmsPage] = useState(0);
    const [smsRowsPerPage, setSmsRowsPerPage] = useState(10);
    const [smsTotal, setSmsTotal] = useState(0);
    const [smsSummary, setSmsSummary] = useState<any[]>([]);

    const [smsLoading, setSmsLoading] = useState(false);

    // Menu Price Adjustment tab state
    const [priceCategories, setPriceCategories] = useState<any[]>([]);
    const [priceSelectedCategory, setPriceSelectedCategory] = useState<string>('all');
    const [pricePercentage, setPricePercentage] = useState<string>('');
    const [pricePreviewItems, setPricePreviewItems] = useState<{ _id: string; name: string; category: any; currentPrice: number; newPrice: number }[]>([]);
    const [pricePreviewLoading, setPricePreviewLoading] = useState(false);
    const [priceApplyLoading, setPriceApplyLoading] = useState(false);
    const [priceLogsOpen, setPriceLogsOpen] = useState(false);
    const [priceLogs, setPriceLogs] = useState<any[]>([]);
    const [priceLogsLoading, setPriceLogsLoading] = useState(false);

    const fetchPriceCategories = async () => {
        try {
            const res = await menuAPI.getAllCategories();
            setPriceCategories(res.data || []);
        } catch {
            toast.error('Failed to load categories');
        }
    };

    const handlePricePreview = async () => {
        const pct = parseFloat(pricePercentage);
        if (!pricePercentage || isNaN(pct)) {
            toast.error('Enter a valid percentage');
            return;
        }
        try {
            setPricePreviewLoading(true);
            setPricePreviewItems([]);
            const params: any = { limit: 1000 };
            if (priceSelectedCategory !== 'all') params.category = priceSelectedCategory;
            const res = await menuAPI.getAll(params);
            const items = res.data?.items || res.data || [];
            const multiplier = 1 + pct / 100;
            const preview = items.map((item: any) => ({
                _id: item._id,
                name: item.name,
                category: item.category,
                currentPrice: item.price,
                newPrice: Math.round(item.price * multiplier * 100) / 100,
            }));
            setPricePreviewItems(preview);
        } catch {
            toast.error('Failed to load preview');
        } finally {
            setPricePreviewLoading(false);
        }
    };

    const handlePriceApply = async () => {
        const pct = parseFloat(pricePercentage);
        if (!pricePreviewItems.length || isNaN(pct)) return;
        if (!window.confirm(`Apply ${pct > 0 ? '+' : ''}${pct}% price change to ${pricePreviewItems.length} item(s)? This cannot be undone.`)) return;
        try {
            setPriceApplyLoading(true);
            const res = await menuAPI.bulkPriceAdjust(pct, priceSelectedCategory !== 'all' ? priceSelectedCategory : undefined);
            toast.success(`Updated prices for ${res.data.updated} item(s)`);
            setPricePreviewItems([]);
            setPricePercentage('');
            // Refresh logs if panel is open
            if (priceLogsOpen) {
                fetchPriceLogs();
            }
        } catch {
            toast.error('Failed to apply price changes');
        } finally {
            setPriceApplyLoading(false);
        }
    };

    const fetchPriceLogs = async () => {
        try {
            setPriceLogsLoading(true);
            const res = await menuAPI.getPriceAdjustmentLogs();
            setPriceLogs(res.data || []);
        } catch {
            toast.error('Failed to load price adjustment logs');
        } finally {
            setPriceLogsLoading(false);
        }
    };

    const handleTogglePriceLogs = () => {
        if (!priceLogsOpen && priceLogs.length === 0) {
            fetchPriceLogs();
        }
        setPriceLogsOpen(prev => !prev);
    };

    const fetchUsers = async (page: number, limit: number) => {
        try {
            const res = await usersAPI.getUsers({
                page: page + 1,
                limit,
            });
            const allUsers = res.data?.data || res.data?.users || (Array.isArray(res.data) ? res.data : []);
            setUsersList(allUsers);
            setTotalUsers(res.data?.total || 0);
        } catch (error) {
            console.error('Error fetching users:', error);
        }
    };

    const fetchAgents = async () => {
        try {
            setAgentsLoading(true);
            const res = await printersAPI.listAgents();
            setPairedAgents(res.data.data || []);
        } catch (error) {
            console.error('Failed to fetch print agents', error);
        } finally {
            setAgentsLoading(false);
        }
    };

    const handleCreateAgent = async () => {
        const name = prompt('Enter a name for this agent (e.g. Front Desk)');
        if (!name) return;
        try {
            const res = await printersAPI.createAgent({ name });
            setNewToken(res.data.pairingToken);
            toast.success('Agent pairing token generated');
            fetchAgents();
        } catch (error) {
            toast.error('Failed to create agent');
        }
    };

    const handleRegenerateAgentToken = async (id: string) => {
        try {
            const res = await printersAPI.regenerateAgentToken(id);
            setNewToken(res.data.pairingToken);
            toast.success('New pairing token generated');
        } catch (error) {
            toast.error('Failed to regenerate token');
        }
    };

    const handleRevokeAgent = async (id: string) => {
        if (!confirm('Are you sure you want to revoke this agent? It will stop receiving print jobs.')) return;
        try {
            await printersAPI.revokeAgent(id);
            toast.success('Agent revoked');
            fetchAgents();
        } catch (error) {
            toast.error('Failed to revoke agent');
        }
    };

    const fetchSmsLogs = async (page: number, limit: number) => {
        try {
            setSmsLoading(true);
            const res = await smsAPI.getLogs({
                page: page + 1,
                limit,
            });
            setSmsLogs(res.data.logs || []);
            setSmsTotal(res.data.total || 0);
        } catch (error) {
            console.error('Error fetching SMS logs:', error);
        } finally {
            setSmsLoading(false);
        }
    };

    const fetchSmsSummary = async () => {
        try {
            const res = await smsAPI.getSummary();
            setSmsSummary(res.data || []);
        } catch (error) {
            console.error('Error fetching SMS summary:', error);
        }
    };

    const handlePrinterRootChange = (field: string, value: any) => {
        setSettings(prev => ({
            ...prev,
            printer: {
                ...prev.printer,
                [field]: value
            }
        }));
    };

    const fetchSettings = async () => {
        try {
            setLoading(true);
            const [response, webhookResp, stripeStatusResp] = await Promise.all([
                settingsAPI.getAll(),
                paymentsAPI.getWebhookUrl(),
                tenantAPI.getStripeSettings(),
            ]);
            const defaults = createDefaultSettings();

            if (Array.isArray(response.data)) {
                const fetched = (response?.data || []).reduce((acc, curr) => {
                    if (curr?.category && curr?.settings) {
                        acc[curr.category] = curr.settings;
                    }
                    return acc;
                }, {});
                const merged = mergeSettingsWithDefaults(defaults, fetched);
                const tenantObj = typeof user?.tenant === 'object' ? user.tenant : null;
                if (!merged.restaurant.name) merged.restaurant.name = tenantObj?.name || '';
                if (!merged.restaurant.logo) merged.restaurant.logo = tenantObj?.logo || '';
                if (!merged.restaurant.email) merged.restaurant.email = tenantObj?.contactEmail || user?.email || '';
                if (!merged.restaurant.phone) {
                    const phoneVal = tenantObj?.contactPhone || user?.phone || '';
                    merged.restaurant.phone = phoneVal.replace(/\D/g, '').slice(-10);
                }
                setSettings(merged);
                setWebhookUrl(webhookResp.data?.url || '');
                setStripeStatus(stripeStatusResp.data || {});
            } else if (response.data && typeof response.data === 'object') {
                const fetched = response.data;
                const merged = mergeSettingsWithDefaults(defaults, fetched);
                const tenantObj = typeof user?.tenant === 'object' ? user.tenant : null;
                if (!merged.restaurant.name) merged.restaurant.name = tenantObj?.name || '';
                if (!merged.restaurant.logo) merged.restaurant.logo = tenantObj?.logo || '';
                if (!merged.restaurant.email) merged.restaurant.email = tenantObj?.contactEmail || user?.email || '';
                if (!merged.restaurant.phone) {
                    const phoneVal = tenantObj?.contactPhone || user?.phone || '';
                    merged.restaurant.phone = String(phoneVal || '').replace(/\D/g, '');
                    if ((merged.restaurant.dialCode === '1' || merged.restaurant.dialCode === '+1') && merged.restaurant.phone.length > 10) {
                        merged.restaurant.phone = merged.restaurant.phone.slice(-10);
                    }
                }
                setSettings(merged);
                setWebhookUrl(webhookResp.data?.url || '');
                setStripeStatus(stripeStatusResp.data || {});
            } else {
                const tenantObj = typeof user?.tenant === 'object' ? user.tenant : null;
                defaults.restaurant.name = tenantObj?.name || '';
                defaults.restaurant.logo = tenantObj?.logo || '';
                defaults.restaurant.email = tenantObj?.contactEmail || user?.email || '';
                const phoneVal = tenantObj?.contactPhone || user?.phone || '';
                defaults.restaurant.phone = String(phoneVal || '').replace(/\D/g, '');
                if ((defaults.restaurant.dialCode === '1' || defaults.restaurant.dialCode === '+1') && defaults.restaurant.phone.length > 10) {
                    defaults.restaurant.phone = defaults.restaurant.phone.slice(-10);
                }
                setSettings(defaults);
                setWebhookUrl(webhookResp.data?.url || '');
                setStripeStatus(stripeStatusResp.data || {});
            }
        } catch (error) {
            console.error('Error fetching settings:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchSettings();
        fetchUsers(0, 10);
    }, []);

    useEffect(() => {
        fetchUsers(userAlertsPage, userAlertsRowsPerPage);
    }, [userAlertsPage, userAlertsRowsPerPage]);

    useEffect(() => {
        if (tabValue === 5) {
            fetchAgents();
        }
        if (tabValue === 3) {
            fetchSmsLogs(smsPage, smsRowsPerPage);
            fetchSmsSummary();
        }
    }, [tabValue, smsPage, smsRowsPerPage]);

    // MANUAL TAX REMOVED — auto-detecting/storing a manual tax rate is no longer used; TaxJar is the source of truth.
    // useEffect(() => {
    //     const zipCode = settings.restaurant.zipCode;
    //     const state = settings.restaurant.state;
    //     if (zipCode && zipCode.length >= 5) {
    //         const timer = setTimeout(async () => {
    //             try {
    //                 setFetchingTax(true);
    //                 const res = await settingsAPI.getTaxRate(zipCode, state);
    //                 if (res.data && typeof res.data.rate === 'number') {
    //                     if (res.data.breakdown) {
    //                         handleTaxBreakdownChange('enabled', true);
    //                         handleTaxBreakdownChange('country', res.data.breakdown.country.rate);
    //                         handleTaxBreakdownChange('state', res.data.breakdown.state.rate);
    //                         handleTaxBreakdownChange('city', res.data.breakdown.city.rate);
    //                         handleTaxBreakdownChange('county', res.data.breakdown.county.rate);
    //                     } else {
    //                         handleInputChange('restaurant', 'taxRate', res.data.rate);
    //                     }
    //                     console.log(`Auto-updated tax rate to ${res.data.rate}% for ZIP ${zipCode}, State: ${state || 'N/A'}`);
    //                 }
    //             } catch (error) {
    //                 console.warn('Auto tax rate fetch failed:', error);
    //             } finally {
    //                 setFetchingTax(false);
    //             }
    //         }, 500);
    //         return () => clearTimeout(timer);
    //     }
    // }, [settings.restaurant.zipCode, settings.restaurant.state]);

    const handleTabChange = (_: React.SyntheticEvent, newValue: number) => {
        setTabValue(newValue);
        if (newValue === 8 && priceCategories.length === 0) {
            fetchPriceCategories();
        }
    };

    const handleInputChange = (category: 'restaurant' | 'system' | 'rewards', field: string, value: any) => {
        // Prevent negative values for numeric inputs
        let finalValue = value;
        if (typeof value === 'number' && value < 0) {
            finalValue = 0;
        }

        setSettings(prev => {
            const newSettings = {
                ...prev,
                [category]: {
                    ...(prev[category] as any),
                    [field]: finalValue,
                },
            } as SettingsState;

            // Auto-select first timezone and currency when country changes
            if (category === 'restaurant' && field === 'country' && typeof value === 'string') {
                const selectedCountry = countries.find(c => c.name === value) as any;
                if (selectedCountry) {
                    if (selectedCountry.timezones?.length > 0) {
                        newSettings.restaurant.timezone = selectedCountry.timezones[0];
                    }
                    if (selectedCountry.currency) {
                        newSettings.restaurant.currency = selectedCountry.currency;
                    }
                    if (selectedCountry.currencySymbol) {
                        newSettings.restaurant.currencySymbol = selectedCountry.currencySymbol;
                    }
                }
                // Auto-update dial code
                newSettings.restaurant.dialCode = getDialCodeByCountry(value);
            }

            // Auto-update symbol when currency changes
            if (category === 'restaurant' && field === 'currency' && typeof value === 'string') {
                const currencySymbols: Record<string, string> = {
                    'USD': '$',
                    'INR': '₹',
                    'EUR': '€',
                    'GBP': '£',
                    'AUD': 'A$',
                    'CAD': 'C$',
                    'SGD': 'S$',
                    'AED': 'د.إ',
                    'JPY': '¥'
                };
                if (currencySymbols[value]) {
                    newSettings.restaurant.currencySymbol = currencySymbols[value];
                }
            }

            return newSettings;
        });
        const errorKey = `${category}_${field}`;
        if (category === 'restaurant' && errors[errorKey]) {
            setErrors(prevErrors => ({ ...prevErrors, [errorKey]: { isValid: true } }));
        }
    };

    const handleNotificationChange = (field: keyof NotificationSettings['sms']['twilio'], value: string) => {
        setSettings(prev => ({
            ...prev,
            notification: {
                ...prev.notification,
                sms: {
                    ...prev.notification.sms,
                    twilio: {
                        ...prev.notification.sms.twilio,
                        [field]: value,
                    },
                },
            },
        }));
    };

    const handleRestaurantMailingChange = (field: keyof RestaurantMailingSettings, value: any) => {
        setSettings(prev => ({
            ...prev,
            restaurant: {
                ...prev.restaurant,
                mailing: {
                    ...createDefaultMailingSettings(),
                    ...(prev.restaurant.mailing || {}),
                    [field]: value,
                },
            },
        }));
    };

    const handleRestaurantMailingNestedChange = (
        section: 'gmail' | 'smtp',
        field: keyof RestaurantGmailMailingSettings | keyof RestaurantSmtpMailingSettings,
        value: any,
    ) => {
        // Prevent negative values for numeric inputs
        let finalValue = value;
        if (typeof value === 'number' && value < 0) {
            finalValue = 0;
        }

        setSettings(prev => ({
            ...prev,
            restaurant: {
                ...prev.restaurant,
                mailing: {
                    ...createDefaultMailingSettings(),
                    ...(prev.restaurant.mailing || {}),
                    [section]: {
                        ...((prev.restaurant.mailing || {})[section] || {}),
                        [field]: finalValue,
                    },
                },
            },
        }));
    };

    const handleDeliveryChange = (provider: 'builtIn' | 'doordash' | 'ubereats', field: string, value: any) => {
        setSettings(prev => ({
            ...prev,
            delivery: {
                ...prev.delivery!,
                [provider]: {
                    ...prev.delivery![provider],
                    [field]: value
                }
            }
        }));
    };

    const handlePrinterChange = (role: 'billing' | 'kitchen', field: keyof PrinterConfig, value: any) => {
        setSettings(prev => ({
            ...prev,
            printer: {
                ...prev.printer,
                [role]: {
                    ...prev.printer[role]!,
                    [field]: value
                }
            }
        }));
    };

    const handleTestPrint = async (role: 'billing' | 'kitchen') => {
        const config = settings.printer[role];
        if (!config) {
            toast.error(`Please configure the ${role} printer first.`);
            return;
        }

        const sampleBill = {
            restaurant: {
                name: settings.restaurant.name || 'Test Restaurant',
                address: settings.restaurant.address,
                phone: settings.restaurant.phone,
            },
            orderNumber: 'TEST-0001',
            orderType: 'dine_in',
            createdAt: new Date().toISOString(),
            items: [
                { name: 'Test Item A', quantity: 2, price: 120, total: 240 },
                { name: 'Test Item B', quantity: 1, price: 80, total: 80 },
            ],
            subtotal: 320,
            totalAmount: 320,
            paymentStatus: 'paid',
            paymentMethod: 'cash',
        };

        // Wired USB printer (WebUSB, desktop browser). No IP needed.
        if (config.type === 'usb') {
            if (!isUsbPrintAvailable()) {
                toast.error('USB printing needs Chrome or Edge on a desktop. Not supported in this browser.');
                return;
            }
            try {
                if (!isUsbPrinterConnected()) {
                    toast.loading('Select your USB printer...', { id: 'test-print' });
                    await connectUsbPrinter();
                }
                toast.loading('Sending test print...', { id: 'test-print' });
                if (role === 'kitchen') {
                    await printKotThermal(sampleBill, { ...settings.printer, kitchen: config });
                } else {
                    await printBillThermal(sampleBill, { ...settings.printer, billing: config }, formatCurrency);
                }
                toast.success('Test print sent to USB printer', { id: 'test-print' });
            } catch (error: any) {
                console.error('USB test print failed:', error);
                toast.error(error?.message || 'Could not print to the USB printer.', { id: 'test-print' });
            }
            return;
        }

        if (!config.ip) {
            toast.error(`Please configure the ${role} printer IP first.`);
            return;
        }

        // Wi-Fi thermal printer: print directly from the device (the backend can't reach a LAN printer).
        if (config.type === 'escpos-tcp') {
            // ePOS-Print is plain HTTP and works from this browser. Raw ESC/POS / Star Line use a
            // TCP socket that only the native Android app can open. Default to epos-print to match
            // the dropdown's default display value (it shows ePOS-Print when commandMode is unset).
            const isEpos = (config.commandMode || 'epos-print') === 'epos-print';
            if (!isEpos && !isThermalPrintAvailable()) {
                toast.error('Raw ESC/POS & Star Line test prints only work inside the installed Android app. For the TM-m30III use Command Mode = ePOS-Print.');
                return;
            }
            try {
                toast.loading('Sending test print...', { id: 'test-print' });
                if (role === 'kitchen') {
                    // Kitchen receiver: print an actual KOT (kitchen ticket), not a bill.
                    await printKotThermal(sampleBill, { ...settings.printer, kitchen: config });
                } else {
                    await printBillThermal(sampleBill, { ...settings.printer, billing: config }, formatCurrency);
                }
                toast.success('Test print sent to printer', { id: 'test-print' });
            } catch (error: any) {
                console.error('Wi-Fi test print failed:', error);
                toast.error(error?.message || 'Could not reach the printer. Check Wi-Fi and IP.', { id: 'test-print' });
            }
            return;
        }

        try {
            toast.loading(`Sending test print to ${role}...`, { id: 'test-print' });
            const response = await printersAPI.testPrint(config);
            toast.success(response.data.message || 'Test print successful', { id: 'test-print' });
        } catch (error: any) {
            console.error(`Test print failed for ${role}:`, error);
            toast.error(error.response?.data?.message || `Failed to connect to ${role} printer`, { id: 'test-print' });
        }
    };

    // Wired USB printer (WebUSB) connection state — re-renders the "connected" status badge.
    const [usbConnected, setUsbConnected] = useState(isUsbPrinterConnected());
    const handleConnectUsb = async () => {
        try {
            const name = await connectUsbPrinter();
            setUsbConnected(true);
            toast.success(`Connected to ${name}`);
        } catch (e: any) {
            toast.error(e?.message || 'Could not connect to the USB printer.');
        }
    };
    const handleDisconnectUsb = async () => {
        await disconnectUsbPrinter();
        setUsbConnected(false);
        toast.success('USB printer disconnected.');
    };

    // Background print station (Android only): polls for new orders and prints them automatically.
    const [printStationOn, setPrintStationOn] = useState(() => localStorage.getItem('printStationOn') === '1');
    const handleTogglePrintStation = async (on: boolean) => {
        try {
            if (on) {
                const jwt = localStorage.getItem('jwt') || '';
                // apiBaseUrl includes a trailing /api; strip it since the station builds its own paths.
                const apiBase = apiBaseUrl.replace(/\/api$/, '');
                const billing = settings.printer.billing;
                const kitchen = settings.printer.kitchen;

                // Prefer billing printer; fall back to kitchen/KOT printer for KOT-only mode.
                const printerCfg = (billing?.ip) ? billing : kitchen;
                if (!printerCfg?.ip) {
                    toast.error('Set a printer IP in the Billing or Kitchen/KOT printer section first.');
                    return;
                }

                const kotOnly = !billing?.ip; // no billing IP → print KOT only
                await startPrintStation({
                    jwt,
                    apiBase,
                    printerIp: printerCfg.ip,
                    printerPort: printerCfg.port || 9100,
                    commandMode: printerCfg.commandMode || 'epos-print',
                    devId: printerCfg.deviceId || 'local_printer',
                    kotOnly,
                });
                setPrintStationOn(true);
                localStorage.setItem('printStationOn', '1');
                toast.success(kotOnly
                    ? 'Print station started — KOT only (no billing printer configured).'
                    : 'Print station started — KOT + bill will print in the background.');
            } else {
                await stopPrintStation();
                setPrintStationOn(false);
                localStorage.setItem('printStationOn', '0');
                toast.success('Print station stopped.');
            }
        } catch (e: any) {
            toast.error(e?.message || 'Failed to toggle print station.');
        }
    };


    const validateRestaurantMailingSettings = (): string | null => {
        const mailing = settings.restaurant.mailing || createDefaultMailingSettings();
        if (!mailing.enabled) {
            return null;
        }

        if (mailing.provider === 'gmail') {
            if (!validateEmail(mailing.gmail.email).isValid) {
                return 'Enter a valid Gmail address for the custom mailer';
            }

            if (!mailing.gmail.appPassword && !mailing.status?.hasGmailAppPassword) {
                return 'Enter a Gmail app password or keep the saved one';
            }

            if (mailing.gmail.appPassword && !isLikelyGmailAppPassword(mailing.gmail.appPassword)) {
                return 'Gmail app password must be 16 letters or numbers';
            }

            if (mailing.gmail.fromEmail && !validateEmail(mailing.gmail.fromEmail).isValid) {
                return 'Enter a valid Gmail from email address';
            }

            return null;
        }

        if (!mailing.smtp.host.trim()) {
            return 'Enter an SMTP host';
        }

        if (!isValidMailHost(mailing.smtp.host)) {
            return 'Enter a valid SMTP host or IP address';
        }

        if (!mailing.smtp.port || mailing.smtp.port <= 0 || mailing.smtp.port > 65535) {
            return 'Enter an SMTP port between 1 and 65535';
        }

        if (!mailing.smtp.username.trim()) {
            return 'Enter an SMTP username';
        }

        if (!mailing.smtp.password && !mailing.status?.hasSmtpPassword) {
            return 'Enter an SMTP password or keep the saved one';
        }

        const smtpFromEmail = mailing.smtp.fromEmail || mailing.smtp.username;
        if (!validateEmail(smtpFromEmail).isValid) {
            return 'Enter a valid SMTP from email address';
        }

        return null;
    };

    const buildRestaurantPayload = () => {
        const mailing = settings.restaurant.mailing || createDefaultMailingSettings();

        return {
            ...settings.restaurant,
            mailing: {
                enabled: mailing.enabled,
                provider: mailing.provider,
                fromName: mailing.fromName,
                gmail: {
                    email: mailing.gmail.email,
                    fromEmail: mailing.gmail.fromEmail,
                    appPassword: mailing.gmail.appPassword,
                },
                smtp: {
                    host: mailing.smtp.host.trim(),
                    port: Number(mailing.smtp.port) || 587,
                    secure: mailing.smtp.secure,
                    username: mailing.smtp.username.trim(),
                    password: mailing.smtp.password,
                    fromEmail: mailing.smtp.fromEmail.trim(),
                },
            },
        };
    };

    const handleTaxBreakdownChange = (field: string, val: number | string | boolean) => {
        // Prevent negative values for tax fields
        if (field !== 'enabled') {
            if (typeof val === 'number' && val < 0) return;
            if (typeof val === 'string' && val.trim().startsWith('-')) return;
        }

        setSettings(prev => {
            const currentBreakdown = prev.restaurant.taxBreakdown || { enabled: false, country: 0, state: 0, city: 0, county: 0 };
            const newBreakdown = {
                ...currentBreakdown,
                [field]: val
            };

            let newTaxRate = prev.restaurant.taxRate;

            // Only update total rate if the change is to a tax value (not just enabling/disabling)
            // Or if enabling, sync the rate immediately
            if (field !== 'enabled' || val === true) {
                const c = Number(newBreakdown.country) || 0;
                const s = Number(newBreakdown.state) || 0;
                const ci = Number(newBreakdown.city) || 0;
                const co = Number(newBreakdown.county) || 0;
                newTaxRate = c + s + ci + co;
            }

            return {
                ...prev,
                restaurant: {
                    ...prev.restaurant,
                    taxRate: newTaxRate,
                    taxBreakdown: newBreakdown
                }
            };
        });
    };


    const handleSlotChange = (dayIdx: number, slotIdx: number, field: 'openTime' | 'closeTime', value: string) => {
        const businessHours = settings.restaurant.businessHours || DEFAULT_BUSINESS_HOURS;
        const dayConfig = businessHours[dayIdx];
        const slots = [...(dayConfig.slots || [{ openTime: dayConfig.openTime || '09:00', closeTime: dayConfig.closeTime || '17:00' }])];

        let updatedSlot = { ...slots[slotIdx], [field]: value };

        // Ensure chronology if closeTime was changed to something before openTime
        if (field === 'closeTime') {
            const startMins = timeToMinutes(updatedSlot.openTime);
            const endMins = timeToMinutes(value);
            if (endMins <= startMins) {
                // Should be prevented by dropdown filtering, but as fallback:
                const nextValid = TIME_OPTIONS.find(o => o.minutes > startMins);
                updatedSlot.closeTime = nextValid ? nextValid.value : '23:59';
            }
        }

        // Chain subsequent slots if needed (optional Clover behavior: keep them strictly sequential)
        slots[slotIdx] = updatedSlot;

        // If a slot's close time changes, subsequent slots might need adjustment if they overlap
        for (let i = slotIdx + 1; i < slots.length; i++) {
            const prevClose = timeToMinutes(slots[i - 1].closeTime);
            const currentOpen = timeToMinutes(slots[i].openTime);
            if (currentOpen < prevClose) {
                slots[i].openTime = slots[i - 1].closeTime;
                const currentClose = timeToMinutes(slots[i].closeTime);
                if (currentClose <= prevClose) {
                    const nextClose = TIME_OPTIONS.find(o => o.minutes > prevClose);
                    slots[i].closeTime = nextClose ? nextClose.value : '23:59';
                }
            }
        }

        const updated = [...businessHours];
        updated[dayIdx] = { ...updated[dayIdx], slots, openTime: slots[0].openTime, closeTime: slots[0].closeTime };
        handleInputChange('restaurant', 'businessHours', updated);
    };

    const handleAddSlot = (dayIdx: number) => {
        const businessHours = settings.restaurant.businessHours || DEFAULT_BUSINESS_HOURS;
        const dayConfig = businessHours[dayIdx];
        const slots = [...(dayConfig.slots || [])];

        const lastSlot = slots[slots.length - 1];
        const prevCloseMins = lastSlot ? timeToMinutes(lastSlot.closeTime) : 540; // 9:00 AM default

        if (prevCloseMins >= 1439) {
            toast.error('Day is already fully scheduled.');
            return;
        }

        const nextOpenTime = lastSlot ? lastSlot.closeTime : '09:00';
        const nextOpenMins = timeToMinutes(nextOpenTime);
        let nextCloseMins = nextOpenMins + 60; // Default 1 hour slot
        if (nextCloseMins > 1439) nextCloseMins = 1439;

        const nextCloseTime = TIME_OPTIONS.find(o => o.minutes >= nextCloseMins)?.value || '23:59';

        slots.push({ openTime: nextOpenTime, closeTime: nextCloseTime });

        const updated = [...businessHours];
        updated[dayIdx] = { ...updated[dayIdx], slots, openTime: slots[0].openTime, closeTime: slots[0].closeTime };
        handleInputChange('restaurant', 'businessHours', updated);
    };

    // MANUAL TAX REMOVED — "Auto Detect" manual rate lookup is no longer used; TaxJar handles tax calculation.
    // const fetchTaxRate = async () => {
    //     if (!settings.restaurant.zipCode) {
    //         toast.error('Please enter a Zip Code first');
    //         return;
    //     }
    //     try {
    //         setFetchingTax(true);
    //         const res = await settingsAPI.getTaxRate(settings.restaurant.zipCode, settings.restaurant.state);
    //         if (res.data && typeof res.data.rate === 'number') {
    //             if (res.data.breakdown) {
    //                 handleTaxBreakdownChange('enabled', true);
    //                 handleTaxBreakdownChange('country', res.data.breakdown.country.rate);
    //                 handleTaxBreakdownChange('state', res.data.breakdown.state.rate);
    //                 handleTaxBreakdownChange('city', res.data.breakdown.city.rate);
    //                 handleTaxBreakdownChange('county', res.data.breakdown.county.rate);
    //             } else {
    //                 handleInputChange('restaurant', 'taxRate', res.data.rate);
    //             }
    //             toast.success(`Tax rate updated to ${res.data.rate}% based on ${settings.restaurant.zipCode}`);
    //         } else {
    //             toast.error('Could not fetch tax rate');
    //         }
    //     } catch (error) {
    //         toast.error('Failed to fetch tax rate');
    //     } finally {
    //         setFetchingTax(false);
    //     }
    // };

    const handleBlur = (field: keyof RestaurantSettings) => {
        let validation: ValidationResult = { isValid: true };

        switch (field) {
            case 'name':
                validation = validateCompanyName(String(settings.restaurant.name ?? ''));
                break;
            case 'email':
                validation = validateEmail(String(settings.restaurant.email ?? ''));
                break;
            case 'phone':
                validation = validatePhone(String(settings.restaurant.phone ?? ''), settings.restaurant.dialCode);
                break;
            case 'address':
                validation = validateAddress(String(settings.restaurant.address ?? ''));
                break;
            default:
                return;
        }

        setErrors(prev => ({ ...prev, [`restaurant_${field}`]: validation }));
    };

    const validateRestaurantForm = (): { isValid: boolean; message?: string } => {
        const newErrors: Record<string, ValidationResult> = {
            restaurant_name: validateCompanyName(settings.restaurant.name),
            restaurant_email: validateEmail(settings.restaurant.email),
            restaurant_phone: validatePhone(settings.restaurant.phone, settings.restaurant.dialCode),
            restaurant_address: validateAddress(settings.restaurant.address),
        };

        setErrors(newErrors);
        const firstInvalid = Object.values(newErrors).find(v => !v.isValid);
        return {
            isValid: !firstInvalid,
            message: firstInvalid?.message
        };
    };

    const handleSoundChange = async (soundId: string) => {
        setLoading(true);
        localStorage.setItem('notificationSoundId', soundId);

        // Optimistic local update
        const updatedSettings = {
            ...settings,
            notification: {
                ...settings.notification,
                sound: soundId
            }
        };
        setSettings(updatedSettings);

        try {
            const payload = {
                sms: {
                    enabled: settings.notification.sms.enabled,
                    provider: 'twilio',
                    twilio: {
                        accountSid: settings.notification.sms.twilio.accountSid,
                        authToken: settings.notification.sms.twilio.authToken,
                        fromNumber: settings.notification.sms.twilio.fromNumber,
                    },
                },
                // @ts-ignore
                push: settings.notification.push,
                sound: soundId,
                soundDuration: settings.notification.soundDuration || 6
            };
            await settingsAPI.update('notification', payload);
            updateGlobalSettings(updatedSettings);
            toast.success('Notification sound saved globally');
        } catch (error) {
            console.error('Error saving sound:', error);
            toast.error('Failed to save sound preference');
        } finally {
            setLoading(false);
        }
    };

    const handleSoundDurationChange = async (duration: number) => {
        setLoading(true);

        // Optimistic local update
        const updatedSettings = {
            ...settings,
            notification: {
                ...settings.notification,
                soundDuration: duration
            }
        };
        setSettings(updatedSettings);

        try {
            const payload = {
                sms: {
                    enabled: settings.notification.sms.enabled,
                    provider: 'twilio',
                    twilio: {
                        accountSid: settings.notification.sms.twilio.accountSid,
                        authToken: settings.notification.sms.twilio.authToken,
                        fromNumber: settings.notification.sms.twilio.fromNumber,
                    },
                },
                // @ts-ignore
                push: settings.notification.push,
                sound: settings.notification.sound || 'notification',
                soundDuration: duration
            };
            await settingsAPI.update('notification', payload);
            updateGlobalSettings(updatedSettings);
            toast.success('Notification duration saved globally');
        } catch (error) {
            console.error('Error saving duration:', error);
            toast.error('Failed to save duration preference');
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async (category: keyof SettingsState) => {
        if (loading) return;
        if (category === 'restaurant') {
            const validation = validateRestaurantForm();
            if (!validation.isValid) {
                toast.error(validation.message || 'Please fix the errors in the form');
                return;
            }
        }

        if (category === 'restaurant') {
            const mailingValidationError = validateRestaurantMailingSettings();
            if (mailingValidationError) {
                toast.error(mailingValidationError);
                return;
            }
        }

        try {
            setLoading(true);
            let successMessage = 'Setting updated successfully';

            if (category === 'restaurant') {
                const restaurantPayload = buildRestaurantPayload();
                await settingsAPI.update('restaurant', restaurantPayload);
                updateGlobalSettings(settings); // Update global context
                await fetchSettings();
                successMessage = 'Setting updated successfully';
            } else if (category === 'system') {
                await settingsAPI.update('system', settings.system);
                updateGlobalSettings(settings); // Update global context
                await fetchSettings();
                successMessage = 'Setting updated successfully';
            } else if (category === 'notification') {
                await settingsAPI.update('notification', {
                    sms: {
                        enabled: settings.notification.sms.enabled,
                        provider: 'twilio',
                        twilio: {
                            accountSid: settings.notification.sms.twilio.accountSid,
                            authToken: settings.notification.sms.twilio.authToken,
                            fromNumber: settings.notification.sms.twilio.fromNumber,
                        },
                    },
                    // @ts-ignore
                    push: settings.notification.push,
                    // @ts-ignore
                    sound: settings.notification.sound || 'notification',
                    soundDuration: settings.notification.soundDuration || 6
                });
                await fetchSettings();
                successMessage = 'Setting updated successfully';
            } else if (category === 'printer') {
                await settingsAPI.update('printer', settings.printer);
                updateGlobalSettings(settings);
                successMessage = 'Setting updated successfully';
            } else if (category === 'rewards') {
                await settingsAPI.update('rewards', settings.rewards);
                updateGlobalSettings(settings); // Update global context
                await fetchSettings();
                successMessage = 'Setting updated successfully';
            } else if (category === 'delivery') {
                await settingsAPI.update('delivery', settings.delivery);
                updateGlobalSettings(settings);
                await fetchSettings();
                successMessage = 'Setting updated successfully';
            }


            toast.success(successMessage);
        } catch (error) {
            console.error('Error saving settings:', error);
            toast.error((error as any)?.response?.data?.message || 'Failed to save settings');
        } finally {
            setLoading(false);
        }
    };

    const getActionColor = (action: string) => {
        switch (action) {
            case 'CREATED':
            case 'CLOCK_IN':
                return 'success';
            case 'UPDATED':
            case 'STATUS_UPDATE':
                return 'info';
            case 'DELETED':
            case 'CLOCK_OUT':
                return 'error';
            default:
                return 'default';
        }
    };

    const getActionIcon = (action: string) => {
        switch (action) {
            case 'CREATED':
                return <AddIcon fontSize="small" />;
            case 'CLOCK_IN':
                return <LoginIcon fontSize="small" />;
            case 'UPDATED':
            case 'STATUS_UPDATE':
                return <EditIcon fontSize="small" />;
            case 'DELETED':
                return <DeleteIcon fontSize="small" />;
            case 'CLOCK_OUT':
                return <LogoutIcon fontSize="small" />;
            default:
                return <HistoryIcon fontSize="small" />;
        }
    };

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleString();
    };

    const availableTimezones = countries.find(c => c.name === settings.restaurant.country)?.timezones || [];
    const restaurantMailing = settings.restaurant.mailing || createDefaultMailingSettings();

    if (loading && !settings.restaurant.name) {
        return (
            <Box sx={{ display: 'flex', justifyContent: 'center', p: 5 }}>
                <CircularProgress />
            </Box>
        );
    }

    return (
        <Box>
            <Typography
                variant="h4"
                gutterBottom
                sx={{
                    mt: { xs: 0.75, sm: 0 },
                    mb: { xs: 1.25, sm: 3 },
                    textAlign: { xs: 'center', md: 'left' },
                    fontWeight: 800,
                    fontFamily: "'Outfit', sans-serif",
                    color: { xs: '#000', md: 'text.primary' },
                    fontSize: headingFontSize
                }}
            >
                Settings
            </Typography>

            <Paper sx={{ width: '100%' }}>
                <Tabs
                    value={tabValue}
                    onChange={handleTabChange}
                    indicatorColor="primary"
                    textColor="primary"
                    variant="scrollable"
                    scrollButtons="auto"
                    sx={{
                        '& .MuiTabs-flexContainer': {
                            alignItems: 'center',
                        },
                        '& .MuiTab-root': {
                            fontWeight: 800,
                            fontFamily: "'Outfit', sans-serif",
                            fontSize: bodyFontSize,
                            minHeight: { xs: 44, sm: 64 },
                            px: { xs: 1.1, sm: 1.5 }
                        },
                        '& .MuiTab-iconWrapper, & .MuiTab-icon': {
                            fontSize: { xs: '0.95rem', sm: '1.1rem' }
                        }
                    }}
                >
                    <Tab label="Restaurant Profile" />
                    <Tab label="System Preferences" />
                    <Tab label="Inventory Settings" />
                    <Tab label="Notifications" icon={<SmsIcon />} iconPosition="start" />
                    <Tab label="Payment" icon={<CreditCardIcon />} iconPosition="start" />
                    <Tab label="Printers" icon={<PrintIcon />} iconPosition="start" />
                    <Tab label="Loyalty / Rewards" icon={<StarIcon />} iconPosition="start" />
                    <Tab label="Delivery" icon={<DeliveryDiningIcon />} iconPosition="start" />
                    <Tab label="Menu Prices" icon={<PriceChangeIcon />} iconPosition="start" />
                </Tabs>
                <Divider />

                <TabPanel value={tabValue} index={0}>
                    <Box sx={{ mb: 3 }}>
                        <Typography
                            variant="h6"
                            gutterBottom
                            sx={{
                                fontWeight: 800,
                                fontFamily: "'Outfit', sans-serif",
                                fontSize: headingFontSize,
                                textAlign: { xs: 'center', sm: 'left' },
                                color: { xs: '#000', sm: 'text.primary' },
                            }}
                        >
                            Restaurant Profile
                        </Typography>
                        <Typography
                            variant="body2"
                            color="text.secondary"
                            sx={{
                                fontWeight: 500,
                                fontFamily: "'Outfit', sans-serif",
                                fontSize: bodyFontSize,
                                textAlign: { xs: 'center', sm: 'left' },
                            }}
                        >
                            Manage your restaurant's public information, location, and contact details.
                        </Typography>
                    </Box>
                    <Grid container spacing={4}>
                        <Grid size={{ xs: 12, md: 8 }}>
                            <Grid container spacing={3}>
                                <Grid size={{ xs: 12, md: 6 }}>
                                    <TextField
                                        fullWidth
                                        label="Restaurant Name"
                                        value={settings.restaurant.name}
                                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleInputChange('restaurant', 'name', e.target.value)}
                                        onBlur={() => handleBlur('name')}
                                        error={hasError(errors.restaurant_name)}
                                        helperText={getHelperText(errors.restaurant_name)}
                                    />
                                </Grid>
                                <Grid size={{ xs: 12, md: 6 }}>
                                    <TextField
                                        fullWidth
                                        label="Email Address"
                                        value={settings.restaurant.email}
                                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleInputChange('restaurant', 'email', e.target.value)}
                                        onBlur={() => handleBlur('email')}
                                        error={hasError(errors.restaurant_email)}
                                        helperText={getHelperText(errors.restaurant_email)}
                                    />
                                </Grid>
                                <Grid size={{ xs: 12, md: 6 }}>
                                    <PhoneInput
                                        fullWidth
                                        label="Phone Number"
                                        value={settings.restaurant.phone}
                                        onChange={(val) => {
                                            const clean = val.replace(/\D/g, '').slice(0, 10);
                                            handleInputChange('restaurant', 'phone', clean);
                                        }}
                                        dialCode={settings.restaurant.dialCode}
                                        onDialCodeChange={(code) => handleInputChange('restaurant', 'dialCode', code)}
                                        error={hasError(errors.restaurant_phone)}
                                        helperText={getHelperText(errors.restaurant_phone) || "10-digit mobile number"}
                                        required
                                    />
                                </Grid>
                                <Grid size={{ xs: 12, md: 6 }}>
                                    <TextField
                                        select
                                        fullWidth
                                        label="Currency"
                                        value={settings.restaurant.currency}
                                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleInputChange('restaurant', 'currency', e.target.value)}
                                    >
                                        <MenuItem value="USD">USD ($)</MenuItem>
                                        <MenuItem value="INR">INR (₹)</MenuItem>
                                        <MenuItem value="EUR">EUR (€)</MenuItem>
                                        <MenuItem value="GBP">GBP (£)</MenuItem>
                                        <MenuItem value="AUD">AUD (A$)</MenuItem>
                                        <MenuItem value="CAD">CAD (C$)</MenuItem>
                                        <MenuItem value="SGD">SGD (S$)</MenuItem>
                                        <MenuItem value="AED">AED (د.إ)</MenuItem>
                                        <MenuItem value="JPY">JPY (¥)</MenuItem>
                                    </TextField>
                                </Grid>
                                <Grid size={{ xs: 12, md: 6 }}>
                                    <TextField
                                        select
                                        fullWidth
                                        label="Country"
                                        value={settings.restaurant.country || 'United States'}
                                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleInputChange('restaurant', 'country', e.target.value)}
                                    >
                                        {countries.map((option) => (
                                            <MenuItem key={option.code} value={option.name}>
                                                {option.name}
                                            </MenuItem>
                                        ))}
                                    </TextField>
                                </Grid>
                                <Grid size={{ xs: 12, md: 6 }}>
                                    <TextField
                                        select
                                        fullWidth
                                        label="Timezone"
                                        value={settings.restaurant.timezone || 'America/New_York'}
                                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleInputChange('restaurant', 'timezone', e.target.value)}
                                    >
                                        {availableTimezones.map((option) => (
                                            <MenuItem key={option} value={option}>
                                                {option}
                                            </MenuItem>
                                        ))}
                                    </TextField>
                                </Grid>
                                <Grid size={{ xs: 12, md: 6 }}>
                                    <TextField
                                        fullWidth
                                        label="Default Phone Prefix (Dial Code)"
                                        value={settings.restaurant.dialCode || ''}
                                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                                            const val = e.target.value.replace(/\D/g, '');
                                            handleInputChange('restaurant', 'dialCode', val);
                                        }}
                                        InputProps={{
                                            startAdornment: <InputAdornment position="start">+</InputAdornment>,
                                        }}
                                        helperText="Default prefix for phone number fields across the app"
                                    />
                                </Grid>
                                {/* <Grid size={{ xs: 12 }}>
                                    <AddressAutocomplete
                                        label="Restaurant Address *"
                                        value={settings.restaurant.address || ''}
                                        apiKey={settings.system.googleMapsApiKey}
                                        onChange={(val) => handleInputChange('restaurant', 'address', val)}
                                        onSelect={(addr) => {
                                            handleInputChange('restaurant', 'address', addr.fullAddress);
                                        }}
                                        required
                                    />
                                </Grid> */}
                            </Grid>
                        </Grid>

                        <Grid size={{ xs: 12, md: 4 }}>
                            <Paper variant="outlined" sx={{ p: 3, textAlign: 'center', height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'center', bgcolor: alpha('#4F46E5', 0.02), borderStyle: 'dashed', borderRadius: 4 }}>
                                <Typography variant="subtitle2" color="text.secondary" gutterBottom sx={{ textTransform: 'uppercase', letterSpacing: 1 }}>
                                    Storefront Preview
                                </Typography>
                                <Box sx={{ mt: 2, mb: 3 }}>
                                    {(settings.restaurant.logo || (user?.tenant as any)?.logo) ? (
                                        <Avatar
                                            src={settings.restaurant.logo || (user?.tenant as any)?.logo}
                                            alt="Logo"
                                            sx={{ width: 100, height: 100, mx: 'auto', boxShadow: '0 8px 16px rgba(0,0,0,0.1)', border: '4px solid #fff' }}
                                        />
                                    ) : (
                                        <Avatar sx={{ width: 100, height: 100, mx: 'auto', bgcolor: 'primary.main', fontSize: '2rem' }}>
                                            {settings.restaurant.name?.charAt(0) || 'R'}
                                        </Avatar>
                                    )}
                                </Box>
                                <Typography variant="h5" fontWeight="bold">
                                    {settings.restaurant.name || 'Your Restaurant Name'}
                                </Typography>
                                <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                                    {settings.restaurant.email}
                                </Typography>
                                <Typography variant="body2" color="text.secondary">
                                    {settings.restaurant.phone}
                                </Typography>
                                {/* <Box sx={{ mt: 3 }}>
                                    <Typography variant="caption" sx={{ color: 'primary.main', fontWeight: 'bold' }}>
                                        * Changes appear in Sidebar & Header
                                    </Typography>
                                </Box> */}
                            </Paper>
                        </Grid>
                        <Grid size={{ xs: 12 }}>
                            <Divider sx={{ my: 2 }} />
                            <Typography variant="subtitle2" gutterBottom>
                                Address Details
                            </Typography>
                        </Grid>
                        <Grid size={{ xs: 12 }}>
                            <AddressAutocomplete
                                label="Address"
                                value={settings.restaurant.address}
                                onChange={(val) => handleInputChange('restaurant', 'address', val)}
                                onSelect={(addr) => {
                                    handleInputChange('restaurant', 'address', addr.fullAddress);
                                    handleInputChange('restaurant', 'city', addr.city || '');
                                    handleInputChange('restaurant', 'state', addr.state || '');
                                    handleInputChange('restaurant', 'zipCode', addr.zipCode || '');
                                }}
                                apiKey={settings.system.googleMapsApiKey || import.meta.env.VITE_GOOGLE_MAPS_API_KEY}
                            />
                        </Grid>
                        <Grid size={{ xs: 12, md: 4 }}>
                            <TextField
                                fullWidth
                                label="City"
                                value={settings.restaurant.city || ''}
                                onChange={(e) => handleInputChange('restaurant', 'city', e.target.value)}
                            />
                        </Grid>
                        <Grid size={{ xs: 12, md: 4 }}>
                            <TextField
                                fullWidth
                                label="State"
                                value={settings.restaurant.state || ''}
                                onChange={(e) => handleInputChange('restaurant', 'state', e.target.value)}
                            />
                        </Grid>
                        <Grid size={{ xs: 12, md: 4 }}>
                            <TextField
                                fullWidth
                                label="Zip / Pincode"
                                value={settings.restaurant.zipCode || ''}
                                onChange={(e) => handleInputChange('restaurant', 'zipCode', e.target.value)}
                            />
                        </Grid>
                        <Grid size={{ xs: 12 }}>
                            <Divider sx={{ my: 2 }} />
                            <Typography variant="subtitle2" gutterBottom>
                                Restaurant Logo
                            </Typography>
                            <Stack direction="row" spacing={2} alignItems="center">
                                <Button
                                    variant="outlined"
                                    component="label"
                                    startIcon={<SaveIcon />}
                                >
                                    Upload Logo
                                    <input
                                        type="file"
                                        hidden
                                        accept="image/*"
                                        onChange={async (e: React.ChangeEvent<HTMLInputElement>) => {
                                            const file = e.target.files?.[0];
                                            if (file) {
                                                if (file.size > 15 * 1024 * 1024) {
                                                    toast.error('Image upload failed: Image size exceeds the 15MB limit.');
                                                    return;
                                                }
                                                try {
                                                    toast.loading('Uploading logo...');
                                                    const { uploadAPI } = await import('../../services/api');
                                                    const response = await uploadAPI.uploadImage(file);
                                                    toast.dismiss();
                                                    toast.success('Logo uploaded successfully!');
                                                    handleInputChange('restaurant', 'logo', response.data.url);
                                                } catch (error: any) {
                                                    toast.dismiss();
                                                    if (error?.response?.status === 413) {
                                                        toast.error('Image upload failed: Image size exceeds the 15MB limit.');
                                                    } else {
                                                        toast.error('Failed to upload logo');
                                                    }
                                                    console.error(error);
                                                }
                                            }
                                        }}
                                    />
                                </Button>
                                <TextField
                                    fullWidth
                                    label="Or paste Logo URL"
                                    value={settings.restaurant.logo || ''}
                                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleInputChange('restaurant', 'logo', e.target.value)}
                                    placeholder="https://example.com/logo.png"
                                    size="small"
                                />
                            </Stack>
                        </Grid>
                        <Grid size={{ xs: 12 }}>
                            <Divider sx={{ my: 2 }} />
                            <Typography variant="subtitle2" gutterBottom>
                                Restaurant Stamp (for Invoices)
                            </Typography>
                            <Stack direction="row" spacing={2} alignItems="center">
                                <Button
                                    variant="outlined"
                                    component="label"
                                    startIcon={<SaveIcon />}
                                >
                                    Upload Stamp
                                    <input
                                        type="file"
                                        hidden
                                        accept="image/*"
                                        onChange={async (e: React.ChangeEvent<HTMLInputElement>) => {
                                            const file = e.target.files?.[0];
                                            if (file) {
                                                if (file.size > 15 * 1024 * 1024) {
                                                    toast.error('Image upload failed: Image size exceeds the 15MB limit.');
                                                    return;
                                                }
                                                try {
                                                    toast.loading('Uploading stamp...');
                                                    const { uploadAPI } = await import('../../services/api');
                                                    const response = await uploadAPI.uploadImage(file);
                                                    toast.dismiss();
                                                    toast.success('Stamp uploaded successfully!');
                                                    handleInputChange('restaurant', 'stamp', response.data.url);
                                                } catch (error: any) {
                                                    toast.dismiss();
                                                    if (error?.response?.status === 413) {
                                                        toast.error('Image upload failed: Image size exceeds the 15MB limit.');
                                                    } else {
                                                        toast.error('Failed to upload stamp');
                                                    }
                                                    console.error(error);
                                                }
                                            }
                                        }}
                                    />
                                </Button>
                                <TextField
                                    fullWidth
                                    label="Or paste Stamp URL"
                                    value={settings.restaurant.stamp || ''}
                                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleInputChange('restaurant', 'stamp', e.target.value)}
                                    placeholder="https://example.com/stamp.png"
                                    size="small"
                                />
                            </Stack>
                            {settings.restaurant.stamp && (
                                <Box sx={{ mt: 2 }}>
                                    <Typography variant="caption" color="text.secondary" gutterBottom>
                                        Stamp Preview:
                                    </Typography>
                                    <Paper
                                        variant="outlined"
                                        sx={{
                                            p: 2,
                                            mt: 1,
                                            display: 'inline-block',
                                            borderRadius: 2,
                                            borderStyle: 'dashed'
                                        }}
                                    >
                                        <img
                                            src={settings.restaurant.stamp}
                                            alt="Stamp"
                                            style={{
                                                maxWidth: '150px',
                                                maxHeight: '150px',
                                                objectFit: 'contain'
                                            }}
                                            onError={(e) => {
                                                console.error('Stamp image failed to load');
                                                toast.error('Failed to load stamp image');
                                            }}
                                        />
                                    </Paper>
                                </Box>
                            )}
                        </Grid>
                        {/* MANUAL TAX REMOVED — tax is now calculated exclusively via the TaxJar engine.
                        <Grid size={{ xs: 12, md: 6 }}>
                            <TextField
                                fullWidth
                                type="number"
                                label="Default Tax Rate (%)"
                                value={settings.restaurant.taxRate ?? 5}
                                onChange={(e) => handleInputChange('restaurant', 'taxRate', parseFloat(e.target.value))}
                                slotProps={{ htmlInput: { min: 0, step: "0.01" } }}
                                helperText="Fallback tax rate if automatic lookup fails."
                                InputProps={{
                                    endAdornment: (
                                        <InputAdornment position="end">
                                            <Button
                                                size="small"
                                                onClick={fetchTaxRate}
                                                disabled={!settings.restaurant.zipCode || fetchingTax}
                                            >
                                                {fetchingTax ? <CircularProgress size={20} /> : 'Auto Detect'}
                                            </Button>
                                        </InputAdornment>
                                    )
                                }}
                            />
                        </Grid>
                        */}
                        <Grid size={{ xs: 12, md: 6 }}>
                            <TextField
                                fullWidth
                                type="number"
                                label="Processing Fee (%)"
                                value={settings.restaurant.processingFee ?? 3}
                                InputProps={{ readOnly: true }}
                                disabled
                                helperText="Set by the platform administrator. Contact support to change it."
                            />
                        </Grid>

                        {/* MANUAL TAX REMOVED — Tax Breakdown Configuration is replaced by the TaxJar engine.
                        <Grid size={{ xs: 12 }}>
                            <Divider sx={{ my: 2 }} />
                            <Typography variant="h6" gutterBottom>
                                Tax Breakdown Configuration
                            </Typography>
                            <FormControlLabel
                                control={
                                    <Switch
                                        checked={settings.restaurant.taxBreakdown?.enabled ?? false}
                                        onChange={(e) => handleTaxBreakdownChange('enabled', e.target.checked)}
                                    />
                                }
                                label="Enable Detailed Tax Breakdown (Overrides Default Rate)"
                            />
                        </Grid>
                        {settings.restaurant.taxBreakdown?.enabled && (
                            <Grid container spacing={2} sx={{ pl: 4, width: '100%' }}>
                                <Grid size={{ xs: 6, md: 3 }}>
                                    <TextField
                                        label="Country Tax (%)"
                                        type="number"
                                        fullWidth
                                        value={settings.restaurant.taxBreakdown?.country ?? 0}
                                        onChange={(e) => handleTaxBreakdownChange('country', e.target.value)}
                                        slotProps={{ htmlInput: { min: 0, step: "0.01" } }}
                                    />
                                </Grid>
                                <Grid size={{ xs: 6, md: 3 }}>
                                    <TextField
                                        label="State Tax (%)"
                                        type="number"
                                        fullWidth
                                        value={settings.restaurant.taxBreakdown?.state ?? 0}
                                        onChange={(e) => handleTaxBreakdownChange('state', e.target.value)}
                                        slotProps={{ htmlInput: { min: 0, step: "0.01" } }}
                                    />
                                </Grid>
                                <Grid size={{ xs: 6, md: 3 }}>
                                    <TextField
                                        label="City Tax (%)"
                                        type="number"
                                        fullWidth
                                        value={settings.restaurant.taxBreakdown?.city ?? 0}
                                        onChange={(e) => handleTaxBreakdownChange('city', e.target.value)}
                                        slotProps={{ htmlInput: { min: 0, step: "0.01" } }}
                                    />
                                </Grid>
                                <Grid size={{ xs: 6, md: 3 }}>
                                    <TextField
                                        label="County/Other (%)"
                                        type="number"
                                        fullWidth
                                        value={settings.restaurant.taxBreakdown?.county ?? 0}
                                        onChange={(e) => handleTaxBreakdownChange('county', e.target.value)}
                                        slotProps={{ htmlInput: { min: 0, step: "0.01" } }}
                                    />
                                </Grid>
                                <Grid size={{ xs: 12 }}>
                                    <Typography variant="body2" color="text.secondary">
                                        Total Effective Tax Rate: {
                                            ((Number(settings.restaurant.taxBreakdown?.country) || 0) +
                                                (Number(settings.restaurant.taxBreakdown?.state) || 0) +
                                                (Number(settings.restaurant.taxBreakdown?.city) || 0) +
                                                (Number(settings.restaurant.taxBreakdown?.county) || 0)).toFixed(2)
                                        }%
                                    </Typography>
                                </Grid>
                            </Grid>
                        )}
                        */}

                        {/* <Grid size={{ xs: 12 }}>
                            <Divider sx={{ my: 2 }} />
                            <Typography variant="h6" gutterBottom>
                                Table Charge Settings
                            </Typography>
                            <FormControlLabel
                                control={
                                    <Switch
                                        checked={settings.restaurant.tablePricing?.enabled ?? true}
                                        onChange={(e) => setSettings(prev => {
                                            const currentPricing = prev.restaurant.tablePricing || { enabled: true, sharedBaseRate: 100, privateBaseRate: 100 };
                                            return {
                                                ...prev,
                                                restaurant: {
                                                    ...prev.restaurant,
                                                    tablePricing: {
                                                        ...currentPricing,
                                                        enabled: e.target.checked
                                                    }
                                                }
                                            };
                                        })}
                                    />
                                }
                                label="Enable Automatic Table Charges"
                            />
                        </Grid>
                        {settings.restaurant.tablePricing?.enabled && (
                            <>
                                <Grid size={{ xs: 12, md: 6 }}>
                                    <TextField
                                        fullWidth
                                        type="number"
                                        label="Shared Table Rate (Per Person)"
                                        value={settings.restaurant.tablePricing?.sharedBaseRate ?? 100}
                                        onChange={(e) => setSettings(prev => {
                                            const currentPricing = prev.restaurant.tablePricing || { enabled: true, sharedBaseRate: 100, privateBaseRate: 100 };
                                            return {
                                                ...prev,
                                                restaurant: {
                                                    ...prev.restaurant,
                                                    tablePricing: {
                                                        ...currentPricing,
                                                        sharedBaseRate: Number(e.target.value)
                                                    }
                                                }
                                            };
                                        })}
                                        InputProps={{
                                            startAdornment: <Typography sx={{ mr: 1 }}>{settings.restaurant.currencySymbol}</Typography>
                                        }}
                                        helperText="Charge per guest for shared/partial occupancy"
                                    />
                                </Grid>
                                <Grid size={{ xs: 12, md: 6 }}>
                                    <TextField
                                        fullWidth
                                        type="number"
                                        label="Private Table Rate (Per Seat)"
                                        value={settings.restaurant.tablePricing?.privateBaseRate ?? 100}
                                        onChange={(e) => setSettings(prev => {
                                            const currentPricing = prev.restaurant.tablePricing || { enabled: true, sharedBaseRate: 100, privateBaseRate: 100 };
                                            return {
                                                ...prev,
                                                restaurant: {
                                                    ...prev.restaurant,
                                                    tablePricing: {
                                                        ...currentPricing,
                                                        privateBaseRate: Number(e.target.value)
                                                    }
                                                }
                                            };
                                        })}
                                        InputProps={{
                                            startAdornment: <Typography sx={{ mr: 1 }}>{settings.restaurant.currencySymbol}</Typography>
                                        }}
                                        helperText="Charge per table capacity unit (e.g. 4-seater x Rate)"
                                    />
                                </Grid>
                            </>
                        )} */}
                        {/* DELIVERY SETTINGS REMOVED
                        <Grid size={{ xs: 12 }}>
                            <Divider sx={{ my: 2 }} />
                            <Typography variant="h6" gutterBottom>
                                Delivery Settings
                            </Typography>
                            <Grid container spacing={3}>
                                <Grid size={{ xs: 12, md: 6 }}>
                                    <TextField
                                        fullWidth
                                        type="number"
                                        label="Delivery Radius (Miles)"
                                        value={settings.restaurant.deliveryRadius ?? 15}
                                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleInputChange('restaurant', 'deliveryRadius', parseFloat(e.target.value))}
                                        slotProps={{ htmlInput: { min: 0 } }}
                                        helperText="Maximum distance from restaurant for delivery orders (default 15 miles)"
                                        InputProps={{
                                            endAdornment: <InputAdornment position="end">Miles</InputAdornment>,
                                        }}
                                    />
                                </Grid>
                            </Grid>
                        </Grid>
                        */}
                        <Grid size={{ xs: 12 }}>
                            <Divider sx={{ my: 2 }} />
                            <Typography variant="h6" gutterBottom sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                                🕐 Business Hours
                                <Box
                                    component="span"
                                    sx={{
                                        ml: 1,
                                        px: 1.5, py: 0.3,
                                        borderRadius: 20,
                                        fontSize: '0.72rem',
                                        fontWeight: 700,
                                        letterSpacing: '0.06em',
                                        bgcolor: isCurrentlyOpen(
                                            settings.restaurant.businessHours || DEFAULT_BUSINESS_HOURS,
                                            settings.restaurant.timezone || 'America/New_York'
                                        ) ? 'success.light' : 'error.light',
                                        color: isCurrentlyOpen(
                                            settings.restaurant.businessHours || DEFAULT_BUSINESS_HOURS,
                                            settings.restaurant.timezone || 'America/New_York'
                                        ) ? 'success.dark' : 'error.dark',
                                    }}
                                >
                                    {isCurrentlyOpen(
                                        settings.restaurant.businessHours || DEFAULT_BUSINESS_HOURS,
                                        settings.restaurant.timezone || 'America/New_York'
                                    ) ? '● Currently Open' : '● Currently Closed'}
                                </Box>
                            </Typography>
                            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                                Set your weekly schedule. The restaurant will automatically appear as open or closed to customers based on these hours and your configured timezone ({settings.restaurant.timezone || 'America/New_York'}).
                            </Typography>

                            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                                {(settings.restaurant.businessHours || DEFAULT_BUSINESS_HOURS).map((dayConfig, idx) => (
                                    <Paper
                                        key={dayConfig.day}
                                        variant="outlined"
                                        sx={{
                                            px: { xs: 1.5, sm: 2.5 }, py: { xs: 1, sm: 1.5 },
                                            borderRadius: 3,
                                            display: 'flex',
                                            gap: { xs: 1, sm: 2 },
                                            flexWrap: 'wrap',
                                            flexDirection: 'row',
                                            alignItems: { xs: 'flex-start', sm: 'center' },
                                            borderColor: dayConfig.isOpen ? 'success.light' : 'divider',
                                            bgcolor: dayConfig.isOpen ? alpha('#22c55e', 0.03) : 'transparent',
                                            transition: 'all 0.2s ease',
                                        }}
                                    >
                                        {/* Day toggle */}
                                        <FormControlLabel
                                            sx={{ minWidth: { xs: '100%', sm: 130 }, m: 0 }}
                                            control={
                                                <Switch
                                                    size="small"
                                                    checked={dayConfig.isOpen}
                                                    color="success"
                                                    onChange={(e) => {
                                                        const updated = [...(settings.restaurant.businessHours || DEFAULT_BUSINESS_HOURS)];
                                                        updated[idx] = { ...updated[idx], isOpen: e.target.checked };
                                                        handleInputChange('restaurant', 'businessHours', updated);
                                                    }}
                                                />
                                            }
                                            label={
                                                <Typography
                                                    variant="body2"
                                                    fontWeight={600}
                                                    sx={{ color: dayConfig.isOpen ? 'text.primary' : 'text.disabled', minWidth: 90 }}
                                                >
                                                    {dayConfig.day}
                                                </Typography>
                                            }
                                        />

                                        {dayConfig.isOpen ? (() => {
                                            const slots = dayConfig.slots && dayConfig.slots.length > 0
                                                ? dayConfig.slots
                                                : [{ openTime: dayConfig.openTime || '09:00', closeTime: dayConfig.closeTime || '17:00' }];
                                            const isExpanded = expandedDays[dayConfig.day] || false;

                                            return (
                                                <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                                                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                                        <Box
                                                            sx={{
                                                                px: 1.5, py: 0.6,
                                                                borderRadius: 2,
                                                                bgcolor: alpha(theme.palette.success.main, 0.08),
                                                                color: 'success.dark',
                                                                fontSize: '0.82rem',
                                                                fontWeight: 700,
                                                                display: 'inline-flex',
                                                                alignItems: 'center',
                                                                gap: 1,
                                                                fontFamily: "'Outfit', sans-serif",
                                                                border: `1px solid ${alpha(theme.palette.success.main, 0.1)}`
                                                            }}
                                                        >
                                                            {slots.map((s, si) => (
                                                                <React.Fragment key={si}>
                                                                    {si > 0 && (
                                                                        <Typography component="span" sx={{ mx: 0.5, opacity: 0.4, fontWeight: 400 }}>
                                                                            •
                                                                        </Typography>
                                                                    )}
                                                                    <Box component="span">
                                                                        {formatTimeDisplay(s.openTime)} – {formatTimeDisplay(s.closeTime)}
                                                                    </Box>
                                                                </React.Fragment>
                                                            ))}
                                                        </Box>
                                                        <Tooltip title={isExpanded ? "Collapse" : "Edit Slots"}>
                                                            <IconButton
                                                                size="small"
                                                                onClick={() => setExpandedDays(prev => ({ ...prev, [dayConfig.day]: !isExpanded }))}
                                                                sx={{ transform: isExpanded ? 'rotate(180deg)' : 'none', transition: '0.3s' }}
                                                            >
                                                                <ExpandMoreIcon />
                                                            </IconButton>
                                                        </Tooltip>
                                                    </Box>
                                                    <Collapse in={isExpanded}>
                                                        <Box sx={{ mt: 2, display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                                                            {slots.map((slot, sIdx) => (
                                                                <Box key={sIdx} sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flexWrap: { xs: 'wrap', sm: 'nowrap' } }}>
                                                                    <TextField
                                                                        type="time"
                                                                        label="Opens"
                                                                        size="small"
                                                                        value={slot.openTime}
                                                                        onChange={(e) => handleSlotChange(idx, sIdx, 'openTime', e.target.value)}
                                                                        sx={{ width: { xs: '100%', sm: 160 }, flex: { xs: 1, sm: 'none' } }}
                                                                        InputLabelProps={{ shrink: true }}
                                                                        inputProps={{ step: 60 }}
                                                                    />
                                                                    <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 600 }}>to</Typography>
                                                                    <TextField
                                                                        type="time"
                                                                        label="Closes"
                                                                        size="small"
                                                                        value={slot.closeTime}
                                                                        onChange={(e) => handleSlotChange(idx, sIdx, 'closeTime', e.target.value)}
                                                                        sx={{ width: { xs: '100%', sm: 160 }, flex: { xs: 1, sm: 'none' } }}
                                                                        InputLabelProps={{ shrink: true }}
                                                                        inputProps={{ step: 60 }}
                                                                    />

                                                                    {slots.length > 1 && (
                                                                        <IconButton
                                                                            size="small"
                                                                            color="error"
                                                                            onClick={() => {
                                                                                const updated = [...(settings.restaurant.businessHours || DEFAULT_BUSINESS_HOURS)];
                                                                                const newSlots = slots.filter((_, i) => i !== sIdx);
                                                                                updated[idx] = { ...updated[idx], slots: newSlots, openTime: newSlots[0].openTime, closeTime: newSlots[0].closeTime };
                                                                                handleInputChange('restaurant', 'businessHours', updated);
                                                                            }}
                                                                        >
                                                                            <DeleteIcon fontSize="small" />
                                                                        </IconButton>
                                                                    )}
                                                                </Box>
                                                            ))}
                                                            {(() => {
                                                                const lastSlot = slots[slots.length - 1];
                                                                const isLastSlotValid = lastSlot && lastSlot.openTime && lastSlot.closeTime;
                                                                const isDayFull = lastSlot && timeToMinutes(lastSlot.closeTime) >= 1439;

                                                                return isLastSlotValid && !isDayFull && (
                                                                    <Button
                                                                        size="small"
                                                                        startIcon={<AddIcon />}
                                                                        onClick={() => handleAddSlot(idx)}
                                                                        sx={{
                                                                            alignSelf: 'flex-start',
                                                                            mt: 0.5,
                                                                            fontWeight: 700,
                                                                            fontFamily: "'Outfit', sans-serif",
                                                                            borderRadius: 2,
                                                                            textTransform: 'none'
                                                                        }}
                                                                    >
                                                                        Add Slot
                                                                    </Button>
                                                                );
                                                            })()}
                                                        </Box>
                                                    </Collapse>
                                                </Box>
                                            );
                                        })() : (
                                            <Typography variant="body2" color="text.disabled" sx={{ fontStyle: 'italic', ml: 2 }}>
                                                Closed all day
                                            </Typography>
                                        )}
                                    </Paper>
                                ))}
                            </Box>
                        </Grid>

                        {/* MAILING SETTINGS REMOVED
                        <Grid size={{ xs: 12 }}>
                            <Divider sx={{ my: 2 }} />
                            <Typography variant="h6" gutterBottom>
                                Mailing Settings
                            </Typography>
                            <Alert severity={restaurantMailing.enabled ? 'info' : 'success'} sx={{ mb: 2 }}>
                                {restaurantMailing.enabled
                                    ? 'Custom restaurant mail is enabled. Customer-facing emails will use the provider configured below for this restaurant.'
                                    : 'Default environment mail is active. Turn on custom mail only if this restaurant should send mail from its own Gmail or SMTP account.'}
                            </Alert>
                            <FormControlLabel
                                control={
                                    <Switch
                                        checked={restaurantMailing.enabled}
                                        onChange={(e) => handleRestaurantMailingChange('enabled', e.target.checked)}
                                    />
                                }
                                label={restaurantMailing.enabled ? 'Use Custom Restaurant Mailer' : 'Use Default Environment Mailer'}
                            />
                            <Grid container spacing={3} sx={{ mt: 0.5 }}>
                                <Grid size={{ xs: 12, md: 6 }}>
                                    <TextField
                                        select
                                        fullWidth
                                        label="Mail Provider"
                                        value={restaurantMailing.provider}
                                        onChange={(e) => handleRestaurantMailingChange('provider', e.target.value)}
                                        disabled={!restaurantMailing.enabled}
                                        helperText="Choose Gmail for a simple setup or SMTP for any custom mail server"
                                    >
                                        <MenuItem value="gmail">Gmail</MenuItem>
                                        <MenuItem value="smtp">Custom SMTP</MenuItem>
                                    </TextField>
                                </Grid>
                                <Grid size={{ xs: 12, md: 6 }}>
                                    <TextField
                                        fullWidth
                                        label="From Name"
                                        value={restaurantMailing.fromName}
                                        onChange={(e) => handleRestaurantMailingChange('fromName', e.target.value)}
                                        disabled={!restaurantMailing.enabled}
                                        helperText="Shown to recipients. Leave blank to use the restaurant name."
                                    />
                                </Grid>

                                {restaurantMailing.enabled && restaurantMailing.provider === 'gmail' && (
                                    <>
                                        <Grid size={{ xs: 12 }}>
                                            <Alert severity="warning">
                                                Use a Gmail app password here, not the normal Gmail account password.
                                            </Alert>
                                        </Grid>
                                        <Grid size={{ xs: 12, md: 6 }}>
                                            <TextField
                                                fullWidth
                                                label="Gmail Address"
                                                value={restaurantMailing.gmail.email}
                                                onChange={(e) => handleRestaurantMailingNestedChange('gmail', 'email', e.target.value)}
                                                helperText="This Gmail account will be used to send mail"
                                            />
                                        </Grid>
                                        <Grid size={{ xs: 12, md: 6 }}>
                                            <TextField
                                                fullWidth
                                                type="password"
                                                label="Gmail App Password"
                                                value={restaurantMailing.gmail.appPassword}
                                                onChange={(e) => handleRestaurantMailingNestedChange('gmail', 'appPassword', e.target.value)}
                                                helperText={
                                                    restaurantMailing.status?.hasGmailAppPassword
                                                        ? 'Leave blank to keep the saved app password.'
                                                        : 'Paste the Gmail app password for this mailbox.'
                                                }
                                            />
                                        </Grid>
                                        <Grid size={{ xs: 12, md: 6 }}>
                                            <TextField
                                                fullWidth
                                                label="From Email (Optional)"
                                                value={restaurantMailing.gmail.fromEmail}
                                                onChange={(e) => handleRestaurantMailingNestedChange('gmail', 'fromEmail', e.target.value)}
                                                helperText="Defaults to the Gmail address if left blank"
                                            />
                                        </Grid>
                                    </>
                                )}

                                {restaurantMailing.enabled && restaurantMailing.provider === 'smtp' && (
                                    <>
                                        <Grid size={{ xs: 12, md: 6 }}>
                                            <TextField
                                                fullWidth
                                                label="SMTP Host"
                                                value={restaurantMailing.smtp.host}
                                                onChange={(e) => handleRestaurantMailingNestedChange('smtp', 'host', e.target.value)}
                                                placeholder="smtp.example.com"
                                            />
                                        </Grid>
                                        <Grid size={{ xs: 12, md: 3 }}>
                                            <TextField
                                                fullWidth
                                                type="number"
                                                label="SMTP Port"
                                                value={restaurantMailing.smtp.port}
                                                onChange={(e) => handleRestaurantMailingNestedChange('smtp', 'port', Number(e.target.value))}
                                                slotProps={{ htmlInput: { min: 1, max: 65535 } }}
                                            />
                                        </Grid>
                                        <Grid size={{ xs: 12, md: 3 }}>
                                            <FormControlLabel
                                                sx={{ height: '100%', alignItems: 'center' }}
                                                control={
                                                    <Switch
                                                        checked={restaurantMailing.smtp.secure}
                                                        onChange={(e) => handleRestaurantMailingNestedChange('smtp', 'secure', e.target.checked)}
                                                    />
                                                }
                                                label="Use SSL / Secure SMTP"
                                            />
                                        </Grid>
                                        <Grid size={{ xs: 12, md: 6 }}>
                                            <TextField
                                                fullWidth
                                                label="SMTP Username"
                                                value={restaurantMailing.smtp.username}
                                                onChange={(e) => handleRestaurantMailingNestedChange('smtp', 'username', e.target.value)}
                                            />
                                        </Grid>
                                        <Grid size={{ xs: 12, md: 6 }}>
                                            <TextField
                                                fullWidth
                                                type="password"
                                                label="SMTP Password"
                                                value={restaurantMailing.smtp.password}
                                                onChange={(e) => handleRestaurantMailingNestedChange('smtp', 'password', e.target.value)}
                                                helperText={
                                                    restaurantMailing.status?.hasSmtpPassword
                                                        ? 'Leave blank to keep the saved SMTP password.'
                                                        : 'Enter the password for the SMTP account.'
                                                }
                                            />
                                        </Grid>
                                        <Grid size={{ xs: 12, md: 6 }}>
                                            <TextField
                                                fullWidth
                                                label="From Email"
                                                value={restaurantMailing.smtp.fromEmail}
                                                onChange={(e) => handleRestaurantMailingNestedChange('smtp', 'fromEmail', e.target.value)}
                                                helperText="If left blank, the SMTP username will be used"
                                            />
                                        </Grid>
                                    </>
                                )}
                            </Grid>
                        </Grid>
                        */}

                        <Grid size={{ xs: 12 }} sx={{ display: 'flex', justifyContent: { xs: 'center', md: 'flex-start' }, mt: { xs: 2.5, md: 0 } }}>
                            <Button
                                variant="contained"
                                size="medium"
                                startIcon={<SaveIcon />}
                                onClick={() => handleSave('restaurant')}
                                disabled={loading}
                                sx={{
                                    borderRadius: 2.5,
                                    px: { xs: 3, sm: 4 },
                                    fontWeight: 800,
                                    fontFamily: "'Outfit', sans-serif",
                                    width: { xs: 'auto', sm: 'auto' },
                                    minWidth: { xs: '140px', sm: 'auto' },
                                    boxShadow: `0 8px 16px ${alpha(theme.palette.primary.main, 0.2)}`
                                }}
                            >
                                Save Changes
                            </Button>
                        </Grid>
                    </Grid>
                </TabPanel>

                <TabPanel value={tabValue} index={1}>
                    <Box sx={{ mb: 3 }}>
                        <Typography variant="h6" gutterBottom sx={{ fontWeight: 800, fontFamily: "'Outfit', sans-serif" }}>
                            System Preferences
                        </Typography>
                        <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 500, fontFamily: "'Outfit', sans-serif" }}>
                            Configure global application settings, themes, and automated behavior.
                        </Typography>
                    </Box>
                    <Grid container spacing={3}>
                        <Grid size={{ xs: 12, md: 6 }}>
                            <TextField
                                select
                                fullWidth
                                label="Application Theme"
                                value={settings.system.theme || 'light'}
                                onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleInputChange('system', 'theme', e.target.value)}
                                helperText="Choose your preferred visual theme"
                            >
                                <MenuItem value="light">Light Mode</MenuItem>
                                <MenuItem value="dark">Dark Mode</MenuItem>
                                {/* <MenuItem value="system">Follow System</MenuItem> */}
                            </TextField>
                        </Grid>
                        <Grid size={{ xs: 12 }}>
                            <FormControlLabel
                                control={
                                    <Switch
                                        checked={settings.system.notifications}
                                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleInputChange('system', 'notifications', e.target.checked)}
                                    />
                                }
                                label="Enable Desktop Notifications"
                            />
                        </Grid>
                        <Grid size={{ xs: 12 }}>
                            <FormControlLabel
                                control={
                                    <Switch
                                        checked={settings.system.autoPrint}
                                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleInputChange('system', 'autoPrint', e.target.checked)}
                                    />
                                }
                                label="Auto-print receipts after payment"
                            />
                        </Grid>
                        <Grid size={{ xs: 12 }} sx={{ display: 'flex', justifyContent: { xs: 'center', md: 'flex-start' }, mt: { xs: 2.5, md: 0 } }}>
                            <Button
                                variant="contained"
                                size="medium"
                                startIcon={<SaveIcon />}
                                onClick={() => handleSave('system')}
                                disabled={loading}
                                sx={{
                                    borderRadius: 2.5,
                                    px: { xs: 3, sm: 4 },
                                    fontWeight: 800,
                                    fontFamily: "'Outfit', sans-serif",
                                    width: { xs: 'auto', sm: 'auto' },
                                    minWidth: { xs: '140px', sm: 'auto' },
                                    boxShadow: `0 8px 16px ${alpha(theme.palette.primary.main, 0.2)}`
                                }}
                            >
                                Save Preferences
                            </Button>
                        </Grid>
                        {/* EXTERNAL INTEGRATIONS REMOVED — Google Maps API key is managed via env (VITE_GOOGLE_MAPS_API_KEY) / stored value, not editable here.
                        <Grid size={{ xs: 12 }}>
                            <Divider sx={{ my: 2 }} />
                            <Typography variant="h6" gutterBottom sx={{ fontWeight: 800, fontFamily: "'Outfit', sans-serif" }}>
                                External Integrations
                            </Typography>
                            <TextField
                                fullWidth
                                label="Google Maps API Key"
                                value={settings.system.googleMapsApiKey || ''}
                                onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleInputChange('system', 'googleMapsApiKey', e.target.value)}
                                placeholder="Enter your Google Maps API Key for address autocomplete"
                                helperText="This key is used for address autocomplete in user creation and settings."
                                type="password"
                                autoComplete="new-password"
                            />
                        </Grid>
                        */}
                    </Grid>
                </TabPanel>

                {/* Inventory Settings Tab */}
                <TabPanel value={tabValue} index={2}>
                    <Typography variant="h6" gutterBottom sx={{ fontWeight: 800, fontFamily: "'Outfit', sans-serif" }}>
                        Measurement Units
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 3, fontWeight: 500, fontFamily: "'Outfit', sans-serif" }}>
                        Customize the units available for inventory management. These units will be available across the entire application.
                    </Typography>

                    {/* Current Units Display */}
                    <Paper variant="outlined" sx={{ p: 2, mb: 3 }}>
                        <Typography variant="subtitle2" gutterBottom>
                            Active Units ({(settings.restaurant.units || getUnitSystem(settings.restaurant.country) === 'imperial' ? IMPERIAL_UNITS : METRIC_UNITS).length})
                        </Typography>
                        <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap sx={{ mt: 2 }}>
                            {(settings.restaurant.units && settings.restaurant.units.length > 0
                                ? settings.restaurant.units
                                : (getUnitSystem(settings.restaurant.country) === 'imperial' ? IMPERIAL_UNITS : METRIC_UNITS)
                            ).map((unit, index) => (
                                <Paper
                                    key={unit.value}
                                    sx={{
                                        px: 2,
                                        py: 1,
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: 1,
                                        bgcolor: alpha('#4F46E5', 0.05),
                                        border: '1px solid',
                                        borderColor: alpha('#4F46E5', 0.2),
                                    }}
                                >
                                    <Typography variant="body2" fontWeight="medium">
                                        {unit.label}
                                    </Typography>
                                    {settings.restaurant.units && settings.restaurant.units.length > 0 && (
                                        <Button
                                            size="small"
                                            color="error"
                                            sx={{ minWidth: 'auto', p: 0.5 }}
                                            onClick={() => {
                                                const newUnits = settings.restaurant.units?.filter((_, i) => i !== index) || [];
                                                setSettings(prev => ({
                                                    ...prev,
                                                    restaurant: {
                                                        ...prev.restaurant,
                                                        units: newUnits
                                                    }
                                                }));
                                            }}
                                        >
                                            <DeleteIcon fontSize="small" />
                                        </Button>
                                    )}
                                </Paper>
                            ))}
                        </Stack>
                    </Paper>

                    {/* Add New Unit */}
                    <Paper variant="outlined" sx={{ p: 2, mb: 3 }}>
                        <Typography variant="subtitle2" gutterBottom>
                            Add Custom Unit
                        </Typography>
                        <Grid container spacing={2} sx={{ mt: 1 }}>
                            <Grid size={{ xs: 12, md: 3 }}>
                                <TextField
                                    fullWidth
                                    label="Unit Code"
                                    placeholder="e.g., cup, tbsp"
                                    size="small"
                                    id="new-unit-value"
                                />
                            </Grid>
                            <Grid size={{ xs: 12, md: 4 }}>
                                <TextField
                                    fullWidth
                                    label="Display Label"
                                    placeholder="e.g., Cups, Tablespoons"
                                    size="small"
                                    id="new-unit-label"
                                />
                            </Grid>
                            <Grid size={{ xs: 12, md: 3 }}>
                                <TextField
                                    select
                                    fullWidth
                                    label="Type"
                                    defaultValue="count"
                                    size="small"
                                    id="new-unit-type"
                                >
                                    <MenuItem value="weight">Weight</MenuItem>
                                    <MenuItem value="volume">Volume</MenuItem>
                                    <MenuItem value="count">Count</MenuItem>
                                </TextField>
                            </Grid>
                            <Grid size={{ xs: 12, md: 2 }}>
                                <Button
                                    fullWidth
                                    variant="contained"
                                    startIcon={<AddIcon />}
                                    onClick={() => {
                                        const valueInput = document.getElementById('new-unit-value') as HTMLInputElement;
                                        const labelInput = document.getElementById('new-unit-label') as HTMLInputElement;
                                        const typeInput = document.getElementById('new-unit-type')?.querySelector('input') as HTMLInputElement;

                                        const value = valueInput?.value?.trim()?.toLowerCase().replace(/\s+/g, '_');
                                        const label = labelInput?.value?.trim();
                                        const type = (typeInput?.value || 'count') as 'weight' | 'volume' | 'count';

                                        if (!value || !label) {
                                            toast.error('Please enter both unit code and label');
                                            return;
                                        }

                                        const currentUnits: UnitConfig[] = settings.restaurant.units ||
                                            (getUnitSystem(settings.restaurant.country) === 'imperial' ? IMPERIAL_UNITS : METRIC_UNITS);

                                        if (currentUnits.some(u => u.value === value)) {
                                            toast.error('A unit with this code already exists');
                                            return;
                                        }

                                        const newUnits: UnitConfig[] = [...currentUnits, { value, label, type }];
                                        setSettings(prev => ({
                                            ...prev,
                                            restaurant: {
                                                ...prev.restaurant,
                                                units: newUnits
                                            }
                                        }));

                                        // Clear inputs
                                        if (valueInput) valueInput.value = '';
                                        if (labelInput) labelInput.value = '';

                                        toast.success(`Unit "${label}" added`);
                                    }}
                                    sx={{ height: '100%' }}
                                >
                                    Add
                                </Button>
                            </Grid>
                        </Grid>
                    </Paper>

                    {/* Reset to Defaults */}
                    <Stack
                        direction={{ xs: 'column', sm: 'row' }}
                        spacing={2}
                        alignItems="center"
                        justifyContent={{ xs: 'center', md: 'flex-start' }}
                        sx={{ mt: 2 }}
                    >
                        <Button
                            variant="outlined"
                            size="medium"
                            onClick={() => {
                                const defaultUnits = getUnitSystem(settings.restaurant.country) === 'imperial'
                                    ? IMPERIAL_UNITS.map(u => ({ ...u, type: 'weight' as const }))
                                    : METRIC_UNITS.map(u => ({ ...u, type: 'weight' as const }));
                                setSettings(prev => ({
                                    ...prev,
                                    restaurant: {
                                        ...prev.restaurant,
                                        units: defaultUnits
                                    }
                                }));
                                toast.success('Units reset to country defaults');
                            }}
                            sx={{
                                borderRadius: 2,
                                textTransform: 'none',
                                fontWeight: 700,
                                fontFamily: "'Outfit', sans-serif",
                                width: { xs: 'auto', sm: 'auto' },
                                px: { xs: 3, sm: 4 },
                                minWidth: { xs: '120px', sm: 'auto' }
                            }}
                        >
                            Reset to Defaults
                        </Button>
                        <Button
                            variant="contained"
                            size="medium"
                            startIcon={<SaveIcon />}
                            onClick={() => handleSave('restaurant')}
                            disabled={loading}
                            sx={{
                                borderRadius: 2.5,
                                px: { xs: 3, sm: 4 },
                                fontWeight: 800,
                                fontFamily: "'Outfit', sans-serif",
                                width: { xs: 'auto', sm: 'auto' },
                                minWidth: { xs: '120px', sm: 'auto' },
                                boxShadow: `0 8px 16px ${alpha(theme.palette.primary.main, 0.2)}`
                            }}
                        >
                            Save Units
                        </Button>
                    </Stack>
                </TabPanel>

                <TabPanel value={tabValue} index={3}>
                    <Grid container spacing={3}>
                        {/* TWILIO SMS SETTINGS REMOVED — SMS is now handled via the credits top-up feature.
                        <Grid size={{ xs: 12 }}>
                            <Paper
                                variant="outlined"
                                sx={{
                                    p: 2.5,
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'space-between',
                                    borderRadius: 3,
                                    bgcolor: settings.notification.sms.status?.isConnected ? alpha('#22c55e', 0.08) : alpha('#f59e0b', 0.08),
                                    borderColor: settings.notification.sms.status?.isConnected ? alpha('#22c55e', 0.3) : alpha('#f59e0b', 0.3),
                                }}
                            >
                                <Stack direction="row" spacing={2} alignItems="center">
                                    <Avatar sx={{ bgcolor: '#fff', color: '#0f172a' }}>
                                        <SmsIcon />
                                    </Avatar>
                                    <Box>
                                        <Typography variant="subtitle1" fontWeight={700}>
                                            Twilio SMS
                                        </Typography>
                                        <Typography variant="body2" color="text.secondary">
                                            {settings.notification.sms.status?.isConnected ? 'Configured and connected' : 'Not connected'}
                                        </Typography>
                                    </Box>
                                </Stack>
                                {settings.notification.sms.status?.isConnected ? <CheckCircleIcon sx={{ color: '#16a34a' }} /> : null}
                            </Paper>
                        </Grid>
                        <Grid size={{ xs: 12 }}>
                            <Typography variant="h6" gutterBottom sx={{ fontWeight: 800, fontFamily: "'Outfit', sans-serif" }}>
                                SMS Settings
                            </Typography>
                            <Typography color="text.secondary" sx={{ fontWeight: 500, fontFamily: "'Outfit', sans-serif" }}>
                                Customer-facing SMS for this restaurant will use these Twilio credentials. Stored credentials are never shown back in the UI.
                            </Typography>
                        </Grid>
                        <Grid size={{ xs: 12 }}>
                            <FormControlLabel
                                control={
                                    <Switch
                                        checked={settings.notification.sms.enabled}
                                        onChange={(e) => setSettings(prev => ({
                                            ...prev,
                                            notification: {
                                                ...prev.notification,
                                                sms: {
                                                    ...prev.notification.sms,
                                                    enabled: e.target.checked,
                                                },
                                            },
                                        }))}
                                    />
                                }
                                label="Enable restaurant SMS"
                            />
                        </Grid>
                        <Grid size={{ xs: 12, md: 4 }}>
                            <TextField
                                fullWidth
                                label="Twilio Account SID"
                                value={settings.notification.sms.twilio.accountSid}
                                onChange={(e) => handleNotificationChange('accountSid', e.target.value.trim())}
                                placeholder="AC..."
                                disabled={!settings.notification.sms.enabled}
                                helperText={settings.notification.sms.status?.hasAccountSid ? 'A Twilio SID is already saved.' : ''}
                            />
                        </Grid>
                        <Grid size={{ xs: 12, md: 4 }}>
                            <TextField
                                fullWidth
                                type={showTwilioAuthToken ? "text" : "password"}
                                label="Twilio Auth Token"
                                value={settings.notification.sms.twilio.authToken}
                                onChange={(e) => handleNotificationChange('authToken', e.target.value.trim())}
                                disabled={!settings.notification.sms.enabled}
                                autoComplete="new-password"
                                helperText={settings.notification.sms.status?.hasAuthToken ? 'A Twilio auth token is already saved.' : ''}
                                InputProps={{
                                    endAdornment: (
                                        <InputAdornment position="end">
                                            <IconButton onClick={() => setShowTwilioAuthToken(!showTwilioAuthToken)} edge="end" disabled={!settings.notification.sms.enabled}>
                                                {showTwilioAuthToken ? <Visibility /> : <VisibilityOff />}
                                            </IconButton>
                                        </InputAdornment>
                                    )
                                }}
                            />
                        </Grid>
                        <Grid size={{ xs: 12, md: 4 }}>
                            <TextField
                                fullWidth
                                label="Twilio From Number"
                                value={settings.notification.sms.twilio.fromNumber}
                                onChange={(e) => handleNotificationChange('fromNumber', e.target.value.trim())}
                                placeholder="+17325551234"
                                disabled={!settings.notification.sms.enabled}
                                helperText={settings.notification.sms.status?.hasFromNumber ? 'A Twilio from number is already saved.' : 'Use the Twilio number assigned to this restaurant.'}
                            />
                        </Grid>
                        <Grid size={{ xs: 12 }}>
                            <Alert severity="info">
                                These credentials are tenant-specific. Customer portal OTP, booking SMS, order updates, catering verification, and coupon SMS will use this restaurant’s settings.
                            </Alert>
                        </Grid>
                        <Grid size={{ xs: 12 }}>
                            <Divider sx={{ my: 1 }} />
                        </Grid>
                        */}

                        {/* ── Notification Sound Picker ── */}
                        <Grid size={{ xs: 12 }}>
                            <Typography variant="h6" gutterBottom>
                                🔔 Notification Sound
                            </Typography>
                            <Typography color="text.secondary" sx={{ mb: 2 }}>
                                Select the alert sound that plays for new orders and status updates.
                                Click <strong>▶ Preview</strong> to hear a sound before selecting it.
                            </Typography>

                            <Stack direction="row" flexWrap="wrap" gap={2}>
                                {NOTIFICATION_SOUNDS.map((sound) => {
                                    // @ts-ignore
                                    const isSelected =
                                        (settings.notification?.sound || 'notification') === sound.id;
                                    return (
                                        <Paper
                                            key={sound.id}
                                            variant="outlined"
                                            sx={{
                                                p: 2.5,
                                                borderRadius: 3,
                                                cursor: 'pointer',
                                                minWidth: { xs: 'calc(50% - 8px)', sm: 0 },
                                                flex: '1 1 0px',
                                                transition: 'all 0.2s ease',
                                                bgcolor: isSelected ? alpha('#4F46E5', 0.08) : '#fff',
                                                borderColor: isSelected ? 'transparent' : alpha('#E2E8F0', 0.8),
                                                boxShadow: 'none',
                                                '&:hover': {
                                                    boxShadow: 'none',
                                                    borderColor: isSelected ? 'transparent' : alpha('#4F46E5', 0.4),
                                                },
                                            }}
                                            onClick={() => handleSoundChange(sound.id)}
                                        >
                                            <Box display="flex" alignItems="center" gap={1.5}>
                                                <Radio
                                                    checked={isSelected}
                                                    size="small"
                                                    sx={{
                                                        p: 0,
                                                        color: isSelected ? '#4F46E5' : 'text.secondary',
                                                        '&.Mui-checked': {
                                                            color: '#4F46E5',
                                                        }
                                                    }}
                                                    onClick={(e) => e.stopPropagation()}
                                                    onChange={() => handleSoundChange(sound.id)}
                                                />
                                                <Typography variant="body2" fontWeight={600} color="text.primary">
                                                    {sound.label}
                                                </Typography>
                                            </Box>

                                            <Box mt={2} display="flex">
                                                <Button
                                                    size="small"
                                                    variant="outlined"
                                                    startIcon={<PlayArrowIcon sx={{ fontSize: '1rem !important' }} />}
                                                    sx={{
                                                        fontSize: '0.75rem',
                                                        px: 2,
                                                        py: 0.5,
                                                        borderRadius: 2,
                                                        borderColor: '#4F46E5',
                                                        color: '#4F46E5',
                                                        textTransform: 'none',
                                                        '&:hover': {
                                                            borderColor: '#4338CA',
                                                            bgcolor: alpha('#4F46E5', 0.04),
                                                        },
                                                        '& .MuiButton-startIcon': {
                                                            marginRight: '4px'
                                                        }
                                                    }}
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        previewSound(sound.id);
                                                    }}
                                                >
                                                    Preview
                                                </Button>
                                            </Box>
                                        </Paper>
                                    );
                                })}
                            </Stack>

                            <Grid container spacing={3} sx={{ mt: 1 }}>
                                <Grid size={{ xs: 12, md: 6 }}>
                                    <TextField
                                        select
                                        fullWidth
                                        label="Sound Duration"
                                        value={settings.notification.soundDuration || 6}
                                        onChange={(e) => handleSoundDurationChange(Number(e.target.value))}
                                        helperText="Choose how long the alert sound plays for new notifications."
                                        sx={{ mt: 2 }}
                                    >
                                        <MenuItem value={3}>3 Seconds</MenuItem>
                                        <MenuItem value={6}>6 Seconds</MenuItem>
                                        <MenuItem value={10}>10 Seconds</MenuItem>
                                        <MenuItem value={15}>15 Seconds (Medium)</MenuItem>
                                        <MenuItem value={30}>30 Seconds (Long)</MenuItem>
                                        <MenuItem value={60}>60 Seconds (Looping)</MenuItem>
                                    </TextField>
                                </Grid>
                            </Grid>
                        </Grid>

                        {/* 
                        <Grid size={{ xs: 12 }}>
                            <Divider sx={{ my: 1 }} />
                        </Grid> */}

                        {/* 
                        <Grid size={{ xs: 12 }}>
                            <Typography variant="h6" gutterBottom>
                                Role Notification Alerts (Default)
                            </Typography>
                            <Typography color="text.secondary" sx={{ mb: 2 }}>
                                Set global fallback alerts across discrete modules per user role title.
                            </Typography>
                            
                            <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 3, mb: 3 }}>
                                <Table size="small">
                                    <TableHead sx={{ bgcolor: alpha('#94a3b8', 0.05) }}>
                                        <TableRow>
                                            <TableCell sx={{ fontWeight: 700 }}>Role Title</TableCell>
                                            <TableCell align="center" sx={{ fontWeight: 700 }}>Orders</TableCell>
                                            <TableCell align="center" sx={{ fontWeight: 700 }}>Catering</TableCell>
                                            <TableCell align="center" sx={{ fontWeight: 700 }}>Inventory</TableCell>
                                        </TableRow>
                                    </TableHead>
                                    <TableBody>
                                        {Object.entries(settings.notification.push?.roles || {}).map(([role, config]: any) => (
                                            <TableRow key={role} hover>
                                                <TableCell sx={{ textTransform: 'capitalize', fontWeight: 500 }}>
                                                    {role.replace('_', ' ')}
                                                </TableCell>
                                                <TableCell align="center">
                                                    <Switch
                                                        size="small"
                                                        checked={Boolean(config.orders)}
                                                        onChange={(e) => setSettings((prev: any) => ({
                                                            ...prev,
                                                            notification: {
                                                                ...prev.notification,
                                                                push: {
                                                                    ...prev.notification.push,
                                                                    roles: {
                                                                        ...prev.notification.push?.roles,
                                                                        [role]: {
                                                                            ...prev.notification.push?.roles?.[role],
                                                                            orders: e.target.checked
                                                                        }
                                                                    }
                                                                }
                                                            }
                                                        }))}
                                                    />
                                                </TableCell>
                                                <TableCell align="center">
                                                    <Switch
                                                        size="small"
                                                        checked={Boolean(config.catering)}
                                                        onChange={(e) => setSettings((prev: any) => ({
                                                            ...prev,
                                                            notification: {
                                                                ...prev.notification,
                                                                push: {
                                                                    ...prev.notification.push,
                                                                    roles: {
                                                                        ...prev.notification.push?.roles,
                                                                        [role]: {
                                                                            ...prev.notification.push?.roles?.[role],
                                                                            catering: e.target.checked
                                                                        }
                                                                    }
                                                                }
                                                            }
                                                        }))}
                                                    />
                                                </TableCell>
                                                <TableCell align="center">
                                                    <Switch
                                                        size="small"
                                                        checked={Boolean(config.inventory)}
                                                        onChange={(e) => setSettings((prev: any) => ({
                                                            ...prev,
                                                            notification: {
                                                                ...prev.notification,
                                                                push: {
                                                                    ...prev.notification.push,
                                                                    roles: {
                                                                        ...prev.notification.push?.roles,
                                                                        [role]: {
                                                                            ...prev.notification.push?.roles?.[role],
                                                                            inventory: e.target.checked
                                                                        }
                                                                    }
                                                                }
                                                            }
                                                        }))}
                                                    />
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </TableContainer>
                        </Grid>
                        */}

                        <Grid size={{ xs: 12 }}>
                            <Divider sx={{ my: 1 }} />
                        </Grid>

                        <Grid size={{ xs: 12 }}>
                            <Typography variant="h6" gutterBottom>
                                User Specific Notification Alerts
                            </Typography>
                            <Typography color="text.secondary" sx={{ mb: 3 }}>
                                Customize overrides for individual users that override role defaults above.
                            </Typography>

                            <Typography variant="caption" color="text.secondary" sx={{ mb: 1, display: 'block' }}>
                                &nbsp;
                            </Typography>

                            {isMobile ? (
                                /* MOBILE CARD VIEW */
                                usersList.length === 0 ? (
                                    <Box sx={{ textAlign: 'center', py: 6 }}>
                                        <Typography variant="body2" color="text.secondary">No staff members found</Typography>
                                    </Box>
                                ) : (
                                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                                        {usersList.map((u: any) => {
                                            const userRole = Array.isArray(u.roles) ? u.roles[0] : 'cashier';
                                            const config = settings.notification.push?.users?.[u._id] ||
                                                settings.notification.push?.roles?.[userRole] ||
                                                { orders: true, catering: true, inventory: true };
                                            return (
                                                <Paper key={u._id} variant="outlined" sx={{ borderRadius: 3, p: 2 }}>
                                                    {/* Name + Role */}
                                                    <Box sx={{ mb: 1.5 }}>
                                                        <Typography fontWeight={600} variant="body2">
                                                            {u.firstName && u.lastName ? `${u.firstName} ${u.lastName}` : u.firstName || u.email || 'Staff Member'}
                                                        </Typography>
                                                        <Typography variant="caption" color="text.secondary" sx={{ textTransform: 'capitalize' }}>
                                                            {Array.isArray(u.roles) ? u.roles.map((r: string) => r.replace('_', ' ')).join(', ') : 'Staff'}
                                                        </Typography>
                                                    </Box>

                                                    {/* Toggles */}
                                                    <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                                                        {[
                                                            { label: 'Orders', key: 'orders' },
                                                            { label: 'Catering', key: 'catering' },
                                                            { label: 'Inventory', key: 'inventory' },
                                                        ].map(({ label, key }) => (
                                                            <Box key={key} sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flex: 1 }}>
                                                                <Typography variant="caption" color="text.secondary" fontWeight={700}>{label}</Typography>
                                                                <Switch
                                                                    size="small"
                                                                    checked={Boolean(config[key])}
                                                                    onChange={(e) => setSettings((prev: any) => ({
                                                                        ...prev,
                                                                        notification: {
                                                                            ...prev.notification,
                                                                            push: {
                                                                                ...prev.notification.push,
                                                                                users: {
                                                                                    ...prev.notification.push?.users,
                                                                                    [u._id]: {
                                                                                        ...prev.notification.push?.users?.[u._id] || config,
                                                                                        [key]: e.target.checked
                                                                                    }
                                                                                }
                                                                            }
                                                                        }
                                                                    }))}
                                                                />
                                                            </Box>
                                                        ))}
                                                    </Box>
                                                </Paper>
                                            );
                                        })}
                                    </Box>
                                )
                            ) : (
                                /* TABLET / DESKTOP — original table unchanged */
                                <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 3 }}>
                                    <Table size="small">
                                        <TableHead sx={{ bgcolor: alpha('#94a3b8', 0.05) }}>
                                            <TableRow>
                                                <TableCell sx={{ fontWeight: 700 }}>Staff Name</TableCell>
                                                <TableCell sx={{ fontWeight: 700 }}>System Role</TableCell>
                                                <TableCell align="center" sx={{ fontWeight: 700 }}>Orders</TableCell>
                                                <TableCell align="center" sx={{ fontWeight: 700 }}>Catering</TableCell>
                                                <TableCell align="center" sx={{ fontWeight: 700 }}>Inventory</TableCell>
                                                <TableCell align="center" sx={{ fontWeight: 700 }}>Bookings</TableCell>
                                            </TableRow>
                                        </TableHead>
                                        <TableBody>
                                            {usersList.map((u: any) => {
                                                const userRole = Array.isArray(u.roles) ? u.roles[0] : 'cashier';
                                                const config = settings.notification.push?.users?.[u._id] ||
                                                    settings.notification.push?.roles?.[userRole] ||
                                                    { orders: true, catering: true, inventory: true, bookings: true };
                                                return (
                                                    <TableRow key={u._id} hover>
                                                        <TableCell sx={{ fontWeight: 500 }}>
                                                            {u.firstName && u.lastName ? `${u.firstName} ${u.lastName}` : u.firstName || u.email || 'Staff Member'}
                                                        </TableCell>
                                                        <TableCell sx={{ textTransform: 'capitalize', color: 'text.secondary', fontSize: '0.8rem' }}>
                                                            {Array.isArray(u.roles) ? u.roles.map((r: string) => r.replace('_', ' ')).join(', ') : 'Staff'}
                                                        </TableCell>
                                                        <TableCell align="center">
                                                            <Switch
                                                                size="small"
                                                                checked={Boolean(config.orders)}
                                                                onChange={(e) => setSettings((prev: any) => ({
                                                                    ...prev,
                                                                    notification: {
                                                                        ...prev.notification,
                                                                        push: {
                                                                            ...prev.notification.push,
                                                                            users: {
                                                                                ...prev.notification.push?.users,
                                                                                [u._id]: {
                                                                                    ...prev.notification.push?.users?.[u._id] || config,
                                                                                    orders: e.target.checked
                                                                                }
                                                                            }
                                                                        }
                                                                    }
                                                                }))}
                                                            />
                                                        </TableCell>
                                                        <TableCell align="center">
                                                            <Switch
                                                                size="small"
                                                                checked={Boolean(config.catering)}
                                                                onChange={(e) => setSettings((prev: any) => ({
                                                                    ...prev,
                                                                    notification: {
                                                                        ...prev.notification,
                                                                        push: {
                                                                            ...prev.notification.push,
                                                                            users: {
                                                                                ...prev.notification.push?.users,
                                                                                [u._id]: {
                                                                                    ...prev.notification.push?.users?.[u._id] || config,
                                                                                    catering: e.target.checked
                                                                                }
                                                                            }
                                                                        }
                                                                    }
                                                                }))}
                                                            />
                                                        </TableCell>
                                                        <TableCell align="center">
                                                            <Switch
                                                                size="small"
                                                                checked={Boolean(config.inventory)}
                                                                onChange={(e) => setSettings((prev: any) => ({
                                                                    ...prev,
                                                                    notification: {
                                                                        ...prev.notification,
                                                                        push: {
                                                                            ...prev.notification.push,
                                                                            users: {
                                                                                ...prev.notification.push?.users,
                                                                                [u._id]: {
                                                                                    ...prev.notification.push?.users?.[u._id] || config,
                                                                                    inventory: e.target.checked
                                                                                }
                                                                            }
                                                                        }
                                                                    }
                                                                }))}
                                                            />
                                                        </TableCell>
                                                        <TableCell align="center">
                                                            <Switch
                                                                size="small"
                                                                checked={config.bookings !== false}
                                                                onChange={(e) => setSettings((prev: any) => ({
                                                                    ...prev,
                                                                    notification: {
                                                                        ...prev.notification,
                                                                        push: {
                                                                            ...prev.notification.push,
                                                                            users: {
                                                                                ...prev.notification.push?.users,
                                                                                [u._id]: {
                                                                                    ...prev.notification.push?.users?.[u._id] || config,
                                                                                    bookings: e.target.checked
                                                                                }
                                                                            }
                                                                        }
                                                                    }
                                                                }))}
                                                            />
                                                        </TableCell>
                                                    </TableRow>
                                                );
                                            })}
                                        </TableBody>
                                    </Table>
                                </TableContainer>
                            )}
                            <TablePagination
                                rowsPerPageOptions={[5, 10, 25, 50]}
                                component="div"
                                count={totalUsers}
                                rowsPerPage={userAlertsRowsPerPage}
                                page={userAlertsPage}
                                onPageChange={(_: any, newPage: number) => setUserAlertsPage(newPage)}
                                onRowsPerPageChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                                    setUserAlertsRowsPerPage(parseInt(e.target.value, 10));
                                    setUserAlertsPage(0);
                                }}
                            />
                        </Grid>
                        <Grid size={{ xs: 12 }}>
                            <Divider sx={{ my: 1 }} />
                        </Grid>
                        <Grid size={{ xs: 12 }} sx={{ display: 'flex', justifyContent: { xs: 'center', md: 'flex-start' }, mt: { xs: 2.5, md: 0 } }}>
                            <Button
                                variant="contained"
                                size="medium"
                                startIcon={<SaveIcon />}
                                onClick={() => handleSave('notification')}
                                disabled={loading}
                                sx={{
                                    borderRadius: 2.5,
                                    px: { xs: 3, sm: 4 },
                                    fontWeight: 800,
                                    fontFamily: "'Outfit', sans-serif",
                                    width: { xs: 'auto', sm: 'auto' },
                                    minWidth: { xs: '140px', sm: 'auto' },
                                    boxShadow: `0 8px 16px ${alpha(theme.palette.primary.main, 0.2)}`
                                }}
                            >
                                Save Notification Settings
                            </Button>
                        </Grid>
                    </Grid>
                </TabPanel>

                <TabPanel value={tabValue} index={4}>
                    <Box sx={{ mb: 4 }}>
                        <Typography variant="h6" sx={{ mb: 1, fontWeight: 800, fontFamily: "'Outfit', sans-serif" }}>
                            Point of Sale Payment Methods
                        </Typography>
                        <Typography color="text.secondary" sx={{ mb: 3, fontWeight: 500, fontFamily: "'Outfit', sans-serif" }}>
                            Enable or disable payment methods that will be available at the Point of Sale interface.
                        </Typography>

                        <Paper variant="outlined" sx={{ p: 3, borderRadius: 3, mb: 2 }}>
                            <Grid container spacing={2}>
                                {['cash', 'card', 'zelle', 'venmo', 'cheque'].map((method) => (
                                    <Grid size={{ xs: 6, sm: 3 }} key={method}>
                                        <FormControlLabel
                                            control={
                                                <Checkbox
                                                    checked={settings.system.posPaymentMethods?.[method as keyof typeof settings.system.posPaymentMethods] ?? true}
                                                    onChange={(e) => {
                                                        const isChecked = e.target.checked;
                                                        setSettings(prev => {
                                                            const currentMethods = prev.system.posPaymentMethods || { cash: true, card: true, zelle: true, venmo: true, cheque: true };
                                                            return {
                                                                ...prev,
                                                                system: {
                                                                    ...prev.system,
                                                                    posPaymentMethods: {
                                                                        ...currentMethods,
                                                                        [method]: isChecked
                                                                    }
                                                                }
                                                            };
                                                        });
                                                    }}
                                                />
                                            }
                                            label={<Typography sx={{ textTransform: 'capitalize' }}>{method}</Typography>}
                                        />
                                    </Grid>
                                ))}
                            </Grid>

                            {/* Card sub-types — shown only when Card is enabled */}
                            {(settings.system.posPaymentMethods?.card ?? true) && (
                                <Box sx={{ mt: 1, pl: { xs: 1, sm: 4 }, pt: 2, borderTop: '1px dashed', borderColor: 'divider' }}>
                                    <Typography variant="body2" color="text.secondary" sx={{ mb: 1, fontWeight: 600 }}>
                                        Accepted Card Types
                                    </Typography>
                                    <Grid container spacing={2}>
                                        {[{ key: 'creditCard', label: 'Credit Card' }, { key: 'debitCard', label: 'Debit Card' }].map((ct) => (
                                            <Grid size={{ xs: 6, sm: 3 }} key={ct.key}>
                                                <FormControlLabel
                                                    control={
                                                        <Checkbox
                                                            checked={settings.system.posPaymentMethods?.[ct.key as keyof typeof settings.system.posPaymentMethods] ?? true}
                                                            onChange={(e) => {
                                                                const isChecked = e.target.checked;
                                                                setSettings(prev => {
                                                                    const currentMethods = prev.system.posPaymentMethods || { cash: true, card: true, zelle: true, venmo: true, cheque: true, creditCard: true, debitCard: true };
                                                                    return {
                                                                        ...prev,
                                                                        system: {
                                                                            ...prev.system,
                                                                            posPaymentMethods: {
                                                                                ...currentMethods,
                                                                                [ct.key]: isChecked
                                                                            }
                                                                        }
                                                                    };
                                                                });
                                                            }}
                                                        />
                                                    }
                                                    label={<Typography>{ct.label}</Typography>}
                                                />
                                            </Grid>
                                        ))}
                                    </Grid>
                                </Box>
                            )}
                        </Paper>

                        <Box sx={{ mt: 4, display: 'flex', justifyContent: { xs: 'center', md: 'flex-start' } }}>
                            <Button
                                variant="contained"
                                size={isMobile ? "medium" : "large"}
                                startIcon={<SaveIcon />}
                                onClick={() => handleSave('system')}
                                disabled={loading}
                                sx={{
                                    borderRadius: 2.5,
                                    px: 4,
                                    fontWeight: 800,
                                    fontFamily: "'Outfit', sans-serif",
                                    width: { xs: '100%', sm: 'auto' },
                                    maxWidth: { xs: '320px', sm: 'none' },
                                    boxShadow: `0 8px 16px ${alpha(theme.palette.primary.main, 0.25)}`
                                }}
                            >
                                Save POS Methods
                            </Button>
                        </Box>
                    </Box>

                    <Divider sx={{ my: 4 }} />

                    <Paper
                        variant="outlined"
                        sx={{
                            p: 2.5,
                            mb: 3,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            borderRadius: 3,
                            bgcolor: (stripeStatus?.hasPublishableKey && stripeStatus?.hasSecretKey) ? alpha('#22c55e', 0.08) : alpha('#f59e0b', 0.08),
                            borderColor: (stripeStatus?.hasPublishableKey && stripeStatus?.hasSecretKey) ? alpha('#22c55e', 0.3) : alpha('#f59e0b', 0.3),
                        }}
                    >
                        <Stack direction="row" spacing={2} alignItems="center">
                            <Avatar sx={{ bgcolor: '#635bff', color: '#fff' }}>
                                <CreditCardIcon />
                            </Avatar>
                            <Box>
                                <Typography variant="subtitle1" fontWeight={700}>
                                    Stripe Payments
                                </Typography>
                                <Typography variant="body2" color="text.secondary">
                                    {(stripeStatus?.hasPublishableKey && stripeStatus?.hasSecretKey) ? 'Configured and connected' : 'Not connected'}
                                </Typography>
                            </Box>
                        </Stack>
                        {(stripeStatus?.hasPublishableKey && stripeStatus?.hasSecretKey) ? <CheckCircleIcon sx={{ color: '#16a34a' }} /> : null}
                    </Paper>
                    <Typography variant="h6" sx={{ mb: 1, fontWeight: 800, fontFamily: "'Outfit', sans-serif" }}>
                        Stripe Payments
                    </Typography>
                    <Typography color="text.secondary" sx={{ mb: 3, fontWeight: 500, fontFamily: "'Outfit', sans-serif" }}>
                        Configure your restaurant’s Stripe keys. These are tenant-specific and used for in-restaurant transactions.
                    </Typography>
                    <Grid container spacing={3}>
                        {(stripeStatus?.hasPublishableKey || stripeStatus?.hasSecretKey || stripeStatus?.hasWebhookSecret) && (
                            <Grid size={{ xs: 12 }}>
                                <Alert severity="info" sx={{ mb: 2 }}>
                                    Stripe credentials are stored securely. Existing values are never shown back in the client. Enter new values only when you want to replace them.
                                </Alert>
                            </Grid>
                        )}
                        <Grid size={{ xs: 12 }}>
                            <TextField
                                fullWidth
                                label="Webhook URL (paste into Stripe)"
                                value={webhookUrl || 'Loading...'}
                                InputProps={{
                                    readOnly: true,
                                    endAdornment: (
                                        <InputAdornment position="end">
                                            <IconButton
                                                aria-label="Copy webhook URL"
                                                onClick={() => {
                                                    if (webhookUrl) {
                                                        navigator.clipboard.writeText(webhookUrl);
                                                        toast.success('Webhook URL copied to clipboard');
                                                    }
                                                }}
                                                edge="end"
                                                disabled={!webhookUrl}
                                            >
                                                <ContentCopyIcon fontSize="small" />
                                            </IconButton>
                                        </InputAdornment>
                                    ),
                                }}
                                helperText="Stripe Dashboard → Developers → Webhooks → Add endpoint"
                            />
                        </Grid>
                        <Grid size={{ xs: 12, md: 6 }}>
                            <TextField
                                fullWidth
                                label="Publishable Key"
                                value={settings.payment.stripePublishableKey || ''}
                                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSettings(prev => ({
                                    ...prev,
                                    payment: { ...prev.payment, stripePublishableKey: e.target.value.trim() }
                                }))}
                                placeholder="pk_test_..."
                                autoComplete="off"
                                helperText={stripeStatus.hasPublishableKey ? 'Already set. Leave blank to keep current key.' : ''}
                            />
                        </Grid>
                        <Grid size={{ xs: 12, md: 6 }}>
                            <TextField
                                fullWidth
                                label="Secret Key"
                                type={showStripeSecretKey ? "text" : "password"}
                                value={settings.payment.stripeSecretKey || ''}
                                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSettings(prev => ({
                                    ...prev,
                                    payment: { ...prev.payment, stripeSecretKey: e.target.value.trim() }
                                }))}
                                placeholder="sk_test_..."
                                autoComplete="new-password"
                                helperText={stripeStatus.hasSecretKey ? 'Already set. Leave blank to keep current key.' : ''}
                                InputProps={{
                                    endAdornment: (
                                        <InputAdornment position="end">
                                            <IconButton onClick={() => setShowStripeSecretKey(!showStripeSecretKey)} edge="end">
                                                {showStripeSecretKey ? <Visibility /> : <VisibilityOff />}
                                            </IconButton>
                                        </InputAdornment>
                                    )
                                }}
                            />
                        </Grid>
                        <Grid size={{ xs: 12, md: 6 }}>
                            <TextField
                                fullWidth
                                label="Webhook Signing Secret"
                                type={showStripeWebhookSecret ? "text" : "password"}
                                value={settings.payment.stripeWebhookSecret || ''}
                                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSettings(prev => ({
                                    ...prev,
                                    payment: { ...prev.payment, stripeWebhookSecret: e.target.value.trim() }
                                }))}
                                placeholder="whsec_..."
                                autoComplete="new-password"
                                helperText={stripeStatus.hasWebhookSecret
                                    ? 'Already set. Leave blank to keep current key.'
                                    : 'Found in Stripe Dashboard → Developers → Webhooks'}
                                InputProps={{
                                    endAdornment: (
                                        <InputAdornment position="end">
                                            <IconButton onClick={() => setShowStripeWebhookSecret(!showStripeWebhookSecret)} edge="end">
                                                {showStripeWebhookSecret ? <Visibility /> : <VisibilityOff />}
                                            </IconButton>
                                        </InputAdornment>
                                    )
                                }}
                            />
                        </Grid>
                        <Grid size={{ xs: 12, md: 6 }}>
                            <TextField
                                select
                                fullWidth
                                label="Mode"
                                value={settings.payment.stripeMode || 'test'}
                                onChange={(e) => setSettings(prev => ({
                                    ...prev,
                                    payment: { ...prev.payment, stripeMode: e.target.value as 'test' | 'live' }
                                }))}
                            >
                                <MenuItem value="test">Test</MenuItem>
                                <MenuItem value="live">Live</MenuItem>
                            </TextField>
                        </Grid>
                        <Grid size={{ xs: 12 }}>
                            <Alert severity="warning" sx={{ mb: 2 }}>
                                Keep your Secret and Webhook keys safe. Only admins should update these.
                            </Alert>
                            <Button
                                variant="contained"
                                startIcon={<SaveIcon />}
                                onClick={async () => {
                                    if (loading) return;
                                    try {
                                        setLoading(true);
                                        const payload: any = {};
                                        const pk = settings.payment.stripePublishableKey?.trim();
                                        const sk = settings.payment.stripeSecretKey?.trim();
                                        const wh = settings.payment.stripeWebhookSecret?.trim();
                                        if (pk) payload.stripePublishableKey = pk;
                                        if (sk) payload.stripeSecretKey = sk;
                                        if (wh) payload.stripeWebhookSecret = wh;
                                        if (settings.payment.stripeMode && settings.payment.stripeMode !== stripeStatus.stripeMode) {
                                            payload.stripeMode = settings.payment.stripeMode;
                                        }

                                        if (Object.keys(payload).length === 0) {
                                            toast.error('No changes to save');
                                            return;
                                        }

                                        await tenantAPI.updateStripeSettings(payload);
                                        toast.success('Stripe settings saved');
                                        // Refresh status flags
                                        const statusResp = await tenantAPI.getStripeSettings();
                                        setStripeStatus(statusResp.data || {});
                                        // Clear sensitive fields after save so they are never re-displayed
                                        setSettings(prev => ({
                                            ...prev,
                                            payment: {
                                                ...prev.payment,
                                                stripePublishableKey: '',
                                                stripeSecretKey: '',
                                                stripeWebhookSecret: '',
                                            },
                                        }));
                                    } catch (error) {
                                        console.error('Failed to save Stripe settings', error);
                                        toast.error((error as any)?.response?.data?.message || 'Failed to save Stripe settings');
                                    } finally {
                                        setLoading(false);
                                    }
                                }}
                                size="medium"
                                disabled={loading}
                                sx={{
                                    borderRadius: 2.5,
                                    px: { xs: 3, sm: 4 },
                                    fontWeight: 800,
                                    fontFamily: "'Outfit', sans-serif",
                                    width: { xs: 'auto', sm: 'auto' },
                                    minWidth: { xs: '140px', sm: 'auto' },
                                    boxShadow: `0 8px 16px ${alpha(theme.palette.primary.main, 0.2)}`,
                                    mt: { xs: 2, md: 0 }
                                }}
                            >
                                Save Stripe Settings
                            </Button>
                        </Grid>
                    </Grid>
                </TabPanel>

                {/* Printers Tab */}
                <TabPanel value={tabValue} index={5}>
                    <Typography variant="h6" gutterBottom sx={{ fontWeight: 800, fontFamily: "'Outfit', sans-serif" }}>
                        Printers Settings
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 3, fontWeight: 500, fontFamily: "'Outfit', sans-serif" }}>
                        Configure automated billing and kitchen printing for this restaurant.
                        Enable the "Print Automation" switch to start auto-printing when an order is created.
                    </Typography>

                    <Grid container spacing={4}>
                        <Grid size={{ xs: 12 }}>
                            <Paper
                                variant="outlined"
                                sx={{
                                    p: 2.5,
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'space-between',
                                    borderRadius: 3,
                                    bgcolor: settings.printer.enabled ? alpha('#4f46e5', 0.08) : 'transparent',
                                    borderColor: settings.printer.enabled ? alpha('#4f46e5', 0.3) : 'divider',
                                }}
                            >
                                <Stack direction="row" spacing={2} alignItems="center">
                                    <Avatar sx={{ bgcolor: settings.printer.enabled ? '#4f46e5' : '#94a3b8', color: '#fff' }}>
                                        <PrintIcon />
                                    </Avatar>
                                    <Box>
                                        <Typography variant="subtitle1" fontWeight={700}>
                                            Print Automation
                                        </Typography>
                                        <Typography variant="body2" color="text.secondary">
                                            Auto-print KOT and billing receipts upon order creation.
                                        </Typography>
                                    </Box>
                                </Stack>
                                <Switch
                                    checked={settings.printer.enabled}
                                    onChange={(e) => setSettings(prev => ({
                                        ...prev,
                                        printer: { ...prev.printer, enabled: e.target.checked }
                                    }))}
                                />
                            </Paper>
                        </Grid>

                        {/* Background Print Station (mobile app only) */}
                        {isThermalPrintAvailable() && (
                            <Grid size={{ xs: 12 }}>
                                <Paper variant="outlined" sx={{ p: 2.5, borderRadius: 3, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                    <Box>
                                        <Typography variant="subtitle1" fontWeight={700}>
                                            Run as Print Station (Background)
                                        </Typography>
                                        <Typography variant="body2" color="text.secondary">
                                            Keeps printing KOT (and bill if configured) for all orders even when the app is in the background or screen is off. Uses Billing printer if set, otherwise uses the KOT/Kitchen printer for KOT-only mode.
                                        </Typography>
                                    </Box>
                                    <Switch
                                        checked={printStationOn}
                                        onChange={(e) => handleTogglePrintStation(e.target.checked)}
                                    />
                                </Paper>
                            </Grid>
                        )}

                        {/* Billing Printer Section */}
                        <Grid size={{ xs: 12, md: 6 }}>
                            <Box sx={{ p: 3, borderRadius: 3, border: '1px solid', borderColor: 'divider' }}>
                                <Typography variant="subtitle1" fontWeight={700} gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                    <PrintIcon fontSize="small" color="primary" /> Billing Receiver
                                </Typography>
                                <Divider sx={{ mb: 2 }} />

                                <Grid container spacing={2}>
                                    <Grid size={{ xs: 12 }}>
                                        <TextField
                                            select
                                            fullWidth
                                            label="Printer Type"
                                            value={settings.printer.billing?.type || 'none'}
                                            onChange={(e) => handlePrinterChange('billing', 'type', e.target.value)}
                                        >
                                            <MenuItem value="none">None (Disabled)</MenuItem>
                                            <MenuItem value="print-agent">Print Agent (Electron)</MenuItem>
                                            <MenuItem value="escpos-tcp">Wi-Fi Thermal Printer (Mobile App)</MenuItem>
                                            <MenuItem value="usb">Wired USB Printer (Desktop browser)</MenuItem>
                                        </TextField>
                                    </Grid>

                                    {settings.printer.billing?.type === 'usb' && (
                                        <UsbPrinterSection
                                            role="billing"
                                            connected={usbConnected}
                                            available={isUsbPrintAvailable()}
                                            onConnect={handleConnectUsb}
                                            onDisconnect={handleDisconnectUsb}
                                            onTest={() => handleTestPrint('billing')}
                                        />
                                    )}

                                    {/* Wi-Fi / LAN thermal printer (Android app): direct TCP to printer IP:9100 */}
                                    {settings.printer.billing?.type === 'escpos-tcp' && (
                                        <>
                                            <Grid size={{ xs: 12, md: 8 }}>
                                                <TextField
                                                    fullWidth
                                                    label="Printer IP Address"
                                                    placeholder="192.168.1.50"
                                                    value={settings.printer.billing?.ip || ''}
                                                    onChange={(e) => handlePrinterChange('billing', 'ip', e.target.value.trim())}
                                                    helperText="The Wi-Fi/LAN IP of the printer. Power off, hold FEED, power on to print the SP700's network config."
                                                />
                                            </Grid>
                                            <Grid size={{ xs: 12, md: 4 }}>
                                                <TextField
                                                    fullWidth
                                                    type="number"
                                                    label="Port"
                                                    value={settings.printer.billing?.port ?? 9100}
                                                    onChange={(e) => handlePrinterChange('billing', 'port', parseInt(e.target.value, 10) || 9100)}
                                                    helperText="Usually 9100"
                                                />
                                            </Grid>
                                            <Grid size={{ xs: 12, md: 6 }}>
                                                <TextField
                                                    select
                                                    fullWidth
                                                    label="Command Mode"
                                                    value={settings.printer.billing?.commandMode || 'epos-print'}
                                                    onChange={(e) => handlePrinterChange('billing', 'commandMode', e.target.value)}
                                                    helperText="Epson TM-m30III = ePOS-Print. Star SP700/SP742 = Star Line. Generic = ESC/POS."
                                                >
                                                    <MenuItem value="epos-print">ePOS-Print (Epson TM-m30III / TM series)</MenuItem>
                                                    <MenuItem value="escpos">ESC/POS raw (generic, port 9100)</MenuItem>
                                                    <MenuItem value="star-line">Star Line (Star printers)</MenuItem>
                                                </TextField>
                                            </Grid>
                                            <Grid size={{ xs: 12, md: 6 }}>
                                                <TextField
                                                    select
                                                    fullWidth
                                                    label="Paper Width"
                                                    value={settings.printer.billing?.paperWidth ?? 76}
                                                    onChange={(e) => handlePrinterChange('billing', 'paperWidth', parseInt(e.target.value, 10))}
                                                >
                                                    <MenuItem value={58}>58mm (2 inch)</MenuItem>
                                                    <MenuItem value={76}>76mm / 3 inch (SP700)</MenuItem>
                                                    <MenuItem value={80}>80mm</MenuItem>
                                                </TextField>
                                            </Grid>
                                            <Grid size={{ xs: 12 }}>
                                                <Alert severity="info">
                                                    {settings.printer.billing?.commandMode === 'epos-print' ? (
                                                        <>ePOS-Print (Epson TM-m30III) prints over the network from <strong>this browser</strong> — works on the laptop and Clover, no app needed. This device and the printer must be on the same network. Turn on <strong>Auto-print</strong> to print bills automatically.</>
                                                    ) : (
                                                        <>Raw ESC/POS & Star Line printing runs from the installed mobile app (Android). The phone and printer must be on the same Wi-Fi network. Turn on <strong>Auto-print</strong> under General settings to print bills automatically.</>
                                                    )}
                                                </Alert>
                                            </Grid>
                                            <Grid size={{ xs: 12 }}>
                                                <Button
                                                    variant="outlined"
                                                    fullWidth
                                                    onClick={() => handleTestPrint('billing')}
                                                    startIcon={<PrintIcon />}
                                                    disabled={!settings.printer.billing?.ip}
                                                >
                                                    Send Test Print
                                                </Button>
                                            </Grid>
                                        </>
                                    )}

                                    {settings.printer.billing?.type === 'print-agent' && (
                                        <>
                                            <Grid size={{ xs: 12, md: 6 }}>
                                                <TextField
                                                    select
                                                    fullWidth
                                                    label="Preferred Paired Agent"
                                                    value={settings.printer.preferredAgentId || ''}
                                                    onChange={(e) => handlePrinterRootChange('preferredAgentId', e.target.value || undefined)}
                                                    helperText="Optional. Leave blank to allow any online paired agent for this restaurant."
                                                >
                                                    <MenuItem value="">Any online paired agent</MenuItem>
                                                    {pairedAgents
                                                        .filter(agent => agent.status === 'active')
                                                        .map((agent) => (
                                                            <MenuItem key={agent._id} value={agent._id}>
                                                                {agent.name}
                                                            </MenuItem>
                                                        ))}
                                                </TextField>
                                            </Grid>
                                            <Grid size={{ xs: 12, md: 6 }}>
                                                <Alert severity="info" sx={{ height: '100%', display: 'flex', alignItems: 'center' }}>
                                                    The paired agent decides which local receipt printer to use. This setting only enables receipt events for the selected agent.
                                                </Alert>
                                            </Grid>
                                            <Grid size={{ xs: 12 }}>
                                                <Button
                                                    variant="outlined"
                                                    fullWidth
                                                    onClick={() => handleTestPrint('billing')}
                                                    startIcon={<PrintIcon />}
                                                >
                                                    Send Test Print
                                                </Button>
                                            </Grid>
                                        </>
                                    )}
                                </Grid>
                            </Box>
                        </Grid>

                        {/* Kitchen Printer Section */}
                        <Grid size={{ xs: 12, md: 6 }}>
                            <Box sx={{ p: 3, borderRadius: 3, border: '1px solid', borderColor: 'divider' }}>
                                <Typography variant="subtitle1" fontWeight={700} gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                    <PrintIcon fontSize="small" color="secondary" /> Kitchen Receiver (KOT)
                                </Typography>
                                <Divider sx={{ mb: 2 }} />

                                <Grid container spacing={2}>
                                    <Grid size={{ xs: 12 }}>
                                        <TextField
                                            select
                                            fullWidth
                                            label="Printer Type"
                                            value={settings.printer.kitchen?.type || 'none'}
                                            onChange={(e) => handlePrinterChange('kitchen', 'type', e.target.value)}
                                        >
                                            <MenuItem value="none">None (Disabled)</MenuItem>
                                            <MenuItem value="print-agent">Print Agent (Electron)</MenuItem>
                                            <MenuItem value="escpos-tcp">Wi-Fi Thermal Printer (Mobile App)</MenuItem>
                                            <MenuItem value="usb">Wired USB Printer (Desktop browser)</MenuItem>
                                        </TextField>
                                    </Grid>

                                    {settings.printer.kitchen?.type === 'usb' && (
                                        <UsbPrinterSection
                                            role="kitchen"
                                            connected={usbConnected}
                                            available={isUsbPrintAvailable()}
                                            onConnect={handleConnectUsb}
                                            onDisconnect={handleDisconnectUsb}
                                            onTest={() => handleTestPrint('kitchen')}
                                        />
                                    )}

                                    {/* Wi-Fi / LAN kitchen thermal printer (Android app) */}
                                    {settings.printer.kitchen?.type === 'escpos-tcp' && (
                                        <>
                                            <Grid size={{ xs: 12, md: 8 }}>
                                                <TextField
                                                    fullWidth
                                                    label="Kitchen Printer IP"
                                                    placeholder="192.168.1.51"
                                                    value={settings.printer.kitchen?.ip || ''}
                                                    onChange={(e) => handlePrinterChange('kitchen', 'ip', e.target.value.trim())}
                                                    helperText="The Wi-Fi/LAN IP of the kitchen printer."
                                                />
                                            </Grid>
                                            <Grid size={{ xs: 12, md: 4 }}>
                                                <TextField
                                                    fullWidth
                                                    type="number"
                                                    label="Port"
                                                    value={settings.printer.kitchen?.port ?? 9100}
                                                    onChange={(e) => handlePrinterChange('kitchen', 'port', parseInt(e.target.value, 10) || 9100)}
                                                    helperText="Usually 9100"
                                                />
                                            </Grid>
                                            <Grid size={{ xs: 12, md: 6 }}>
                                                <TextField
                                                    select
                                                    fullWidth
                                                    label="Command Mode"
                                                    value={settings.printer.kitchen?.commandMode || 'epos-print'}
                                                    onChange={(e) => handlePrinterChange('kitchen', 'commandMode', e.target.value)}
                                                    helperText="Epson TM-m30III = ePOS-Print. Star = Star Line. Generic = ESC/POS."
                                                >
                                                    <MenuItem value="epos-print">ePOS-Print (Epson TM-m30III / TM series)</MenuItem>
                                                    <MenuItem value="escpos">ESC/POS raw (generic, port 9100)</MenuItem>
                                                    <MenuItem value="star-line">Star Line (Star printers)</MenuItem>
                                                </TextField>
                                            </Grid>
                                            <Grid size={{ xs: 12, md: 6 }}>
                                                <TextField
                                                    select
                                                    fullWidth
                                                    label="Paper Width"
                                                    value={settings.printer.kitchen?.paperWidth ?? 76}
                                                    onChange={(e) => handlePrinterChange('kitchen', 'paperWidth', parseInt(e.target.value, 10))}
                                                >
                                                    <MenuItem value={58}>58mm (2 inch)</MenuItem>
                                                    <MenuItem value={76}>76mm / 3 inch (SP700)</MenuItem>
                                                    <MenuItem value={80}>80mm</MenuItem>
                                                </TextField>
                                            </Grid>
                                            <Grid size={{ xs: 12 }}>
                                                <Button
                                                    variant="outlined"
                                                    fullWidth
                                                    onClick={() => handleTestPrint('kitchen')}
                                                    startIcon={<PrintIcon />}
                                                    disabled={!settings.printer.kitchen?.ip}
                                                >
                                                    Send Test Print
                                                </Button>
                                            </Grid>
                                        </>
                                    )}

                                    {settings.printer.kitchen?.type === 'print-agent' && (
                                        <>
                                            <Grid size={{ xs: 12, md: 6 }}>
                                                <TextField
                                                    select
                                                    fullWidth
                                                    label="Preferred Paired Agent"
                                                    value={settings.printer.preferredAgentId || ''}
                                                    onChange={(e) => handlePrinterRootChange('preferredAgentId', e.target.value || undefined)}
                                                    helperText="Optional. Leave blank to allow any online paired agent for this restaurant."
                                                >
                                                    <MenuItem value="">Any online paired agent</MenuItem>
                                                    {pairedAgents
                                                        .filter(agent => agent.status === 'active')
                                                        .map((agent) => (
                                                            <MenuItem key={agent._id} value={agent._id}>
                                                                {agent.name}
                                                            </MenuItem>
                                                        ))}
                                                </TextField>
                                            </Grid>
                                            <Grid size={{ xs: 12, md: 6 }}>
                                                <Alert severity="info" sx={{ height: '100%', display: 'flex', alignItems: 'center' }}>
                                                    Kitchen jobs are sent to the agent only. The agent uses its own default kitchen printer configured on that machine.
                                                </Alert>
                                            </Grid>
                                            <Grid size={{ xs: 12 }}>
                                                <Button
                                                    variant="outlined"
                                                    fullWidth
                                                    onClick={() => handleTestPrint('kitchen')}
                                                    startIcon={<PrintIcon />}
                                                >
                                                    Send Test Print
                                                </Button>
                                            </Grid>
                                        </>
                                    )}
                                </Grid>
                            </Box>
                        </Grid>

                        <Grid size={{ xs: 12 }}>
                            <Divider sx={{ my: 1 }} />
                        </Grid>

                        {/* Decentralized Print Agents (Electron) Section */}
                        <Grid size={{ xs: 12 }}>
                            <Box sx={{ p: 4, borderRadius: 4, border: '1px solid', borderColor: 'divider', bgcolor: alpha('#4f46e5', 0.02) }}>
                                <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" alignItems={{ xs: 'flex-start', sm: 'center' }} gap={{ xs: 2, sm: 0 }} sx={{ mb: 3 }}>
                                    <Box>
                                        <Typography variant="h6" fontWeight={800} sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                                            <TerminalIcon color="primary" /> Decentralized Print Agents
                                        </Typography>
                                        <Typography variant="body2" color="text.secondary">
                                            Connect local hardware (USB/Spooler) using the Electron Print Agent app.
                                        </Typography>
                                    </Box>
                                    <Button
                                        variant="contained"
                                        startIcon={<AddIcon />}
                                        onClick={handleCreateAgent}
                                        sx={{ borderRadius: 2, px: 3, width: { xs: '100%', sm: 'auto' } }}
                                    >
                                        Pair New Agent
                                    </Button>
                                </Stack>

                                {agentsLoading ? (
                                    <Box sx={{ py: 4, textAlign: 'center' }}>
                                        <CircularProgress size={24} />
                                    </Box>
                                ) : pairedAgents.length === 0 ? (
                                    <Alert severity="info" sx={{ borderRadius: 2 }}>
                                        No print agents paired yet. Download the Electron app and use a pairing token to get started.
                                    </Alert>
                                ) :
                                    isMobile ? (
                                        /* MOBILE CARD VIEW */
                                        pairedAgents.length === 0 ? (
                                            <Box sx={{ textAlign: 'center', py: 6 }}>
                                                <Typography variant="body2" color="text.secondary">No agents paired yet</Typography>
                                            </Box>
                                        ) : (
                                            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                                                {pairedAgents.map((agent: any) => (
                                                    <Paper key={agent._id} variant="outlined" sx={{ borderRadius: 3, p: 2 }}>
                                                        {/* Name + Status */}
                                                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.5 }}>
                                                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                                                                <Avatar sx={{ width: 32, height: 32, bgcolor: alpha('#4f46e5', 0.1), color: '#4f46e5' }}>
                                                                    <TerminalIcon sx={{ fontSize: 18 }} />
                                                                </Avatar>
                                                                <Typography variant="subtitle2" fontWeight={600}>{agent.name}</Typography>
                                                            </Box>
                                                            <Chip
                                                                size="small"
                                                                label={agent.status}
                                                                color={agent.status === 'active' ? 'success' : 'default'}
                                                                variant="filled"
                                                                sx={{ fontWeight: 600, textTransform: 'uppercase', fontSize: '0.65rem' }}
                                                            />
                                                        </Box>

                                                        {/* Last Seen */}
                                                        <Typography variant="caption" color="text.secondary">
                                                            Last seen: {agent.lastSeenAt ? new Date(agent.lastSeenAt).toLocaleString() : 'Never'}
                                                        </Typography>

                                                        {/* Actions */}
                                                        <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 0.5, mt: 1 }}>
                                                            <Tooltip title="Copy Token">
                                                                <IconButton
                                                                    size="small"
                                                                    onClick={() => {
                                                                        const token = agent.token || agent.pairingToken;
                                                                        if (token) {
                                                                            navigator.clipboard.writeText(token);
                                                                            toast.success('Token copied to clipboard');
                                                                        }
                                                                    }}
                                                                    disabled={!agent.token && !agent.pairingToken}
                                                                    sx={{ color: 'primary.main' }}
                                                                >
                                                                    <ContentCopyIcon fontSize="small" />
                                                                </IconButton>
                                                            </Tooltip>
                                                            <Tooltip title="Regenerate Token">
                                                                <IconButton size="small" onClick={() => handleRegenerateAgentToken(agent._id)} sx={{ color: 'primary.main' }}>
                                                                    <RefreshIcon fontSize="small" />
                                                                </IconButton>
                                                            </Tooltip>
                                                            <Tooltip title="Revoke Agent">
                                                                <IconButton size="small" onClick={() => handleRevokeAgent(agent._id)} sx={{ color: 'error.main' }}>
                                                                    <DeleteIcon fontSize="small" />
                                                                </IconButton>
                                                            </Tooltip>
                                                        </Box>
                                                    </Paper>
                                                ))}
                                            </Box>
                                        )
                                    ) : (
                                        /* TABLET / DESKTOP — original table unchanged */
                                        <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 3 }}>
                                            <Table size="small">
                                                <TableHead sx={{ bgcolor: 'action.hover' }}>
                                                    <TableRow>
                                                        <TableCell sx={{ fontWeight: 700 }}>Agent Name</TableCell>
                                                        <TableCell sx={{ fontWeight: 700 }}>Status</TableCell>
                                                        <TableCell sx={{ fontWeight: 700 }}>Last Seen</TableCell>
                                                        <TableCell align="right" sx={{ fontWeight: 700 }}>Actions</TableCell>
                                                    </TableRow>
                                                </TableHead>
                                                <TableBody>
                                                    {pairedAgents.map((agent: any) => (
                                                        <TableRow key={agent._id} hover>
                                                            <TableCell sx={{ py: 2 }}>
                                                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                                                                    <Avatar sx={{ width: 32, height: 32, bgcolor: alpha('#4f46e5', 0.1), color: '#4f46e5' }}>
                                                                        <TerminalIcon sx={{ fontSize: 18 }} />
                                                                    </Avatar>
                                                                    <Typography variant="subtitle2" fontWeight={600}>{agent.name}</Typography>
                                                                </Box>
                                                            </TableCell>
                                                            <TableCell>
                                                                <Chip
                                                                    size="small"
                                                                    label={agent.status}
                                                                    color={agent.status === 'active' ? 'success' : 'default'}
                                                                    variant="filled"
                                                                    sx={{ fontWeight: 600, textTransform: 'uppercase', fontSize: '0.65rem' }}
                                                                />
                                                            </TableCell>
                                                            <TableCell>
                                                                <Typography variant="caption" color="text.secondary">
                                                                    {agent.lastSeenAt ? new Date(agent.lastSeenAt).toLocaleString() : 'Never'}
                                                                </Typography>
                                                            </TableCell>
                                                            <TableCell align="right">
                                                                <Tooltip title="Copy Token">
                                                                    <IconButton
                                                                        size="small"
                                                                        onClick={() => {
                                                                            const token = agent.token || agent.pairingToken;
                                                                            if (token) {
                                                                                navigator.clipboard.writeText(token);
                                                                                toast.success('Token copied to clipboard');
                                                                            }
                                                                        }}
                                                                        disabled={!agent.token && !agent.pairingToken}
                                                                        sx={{ color: 'primary.main' }}
                                                                    >
                                                                        <ContentCopyIcon fontSize="small" />
                                                                    </IconButton>
                                                                </Tooltip>
                                                                <Tooltip title="Regenerate Token">
                                                                    <IconButton size="small" onClick={() => handleRegenerateAgentToken(agent._id)} sx={{ color: 'primary.main' }}>
                                                                        <RefreshIcon fontSize="small" />
                                                                    </IconButton>
                                                                </Tooltip>
                                                                <Tooltip title="Revoke Agent">
                                                                    <IconButton size="small" onClick={() => handleRevokeAgent(agent._id)} sx={{ color: 'error.main' }}>
                                                                        <DeleteIcon fontSize="small" />
                                                                    </IconButton>
                                                                </Tooltip>
                                                            </TableCell>
                                                        </TableRow>
                                                    ))}
                                                </TableBody>
                                            </Table>
                                        </TableContainer>
                                    )}

                            </Box>
                        </Grid>

                        <Grid size={{ xs: 12 }} sx={{ display: 'flex', justifyContent: { xs: 'center', md: 'flex-start' }, mt: { xs: 2.5, md: 0 } }}>
                            <Button
                                variant="contained"
                                size="medium"
                                startIcon={<SaveIcon />}
                                onClick={() => handleSave('printer')}
                                disabled={loading}
                                sx={{
                                    borderRadius: 2.5,
                                    px: { xs: 3, sm: 4 },
                                    fontWeight: 800,
                                    fontFamily: "'Outfit', sans-serif",
                                    width: { xs: 'auto', sm: 'auto' },
                                    minWidth: { xs: '140px', sm: 'auto' },
                                    boxShadow: `0 8px 16px ${alpha(theme.palette.primary.main, 0.2)}`
                                }}
                            >
                                Save Printer Settings
                            </Button>
                        </Grid>
                    </Grid>
                </TabPanel>



                <TabPanel value={tabValue} index={6}>
                    <Box sx={{ mb: 4, maxWidth: 800 }}>
                        <Typography variant="h6" gutterBottom sx={{ fontWeight: 800, fontFamily: "'Outfit', sans-serif" }}>
                            Loyalty & Reward Points
                        </Typography>
                        <Typography variant="body2" color="text.secondary" sx={{ mb: 3, fontWeight: 500, fontFamily: "'Outfit', sans-serif" }}>
                            Configure how customers earn and redeem points.
                        </Typography>

                        <Paper sx={{ p: 3, mb: 3 }} variant="outlined">
                            <FormControlLabel
                                control={
                                    <Switch
                                        checked={settings.rewards?.isEnabled ?? false}
                                        onChange={(e) => handleInputChange('rewards', 'isEnabled', e.target.checked)}
                                        color="primary"
                                    />
                                }
                                label={<Typography fontWeight="bold">Enable Rewards System</Typography>}
                                sx={{ mb: 2 }}
                            />

                            <Collapse in={settings.rewards?.isEnabled ?? false}>
                                <Grid container spacing={3}>
                                    <Grid size={{ xs: 12, md: 6 }}>
                                        <TextField
                                            fullWidth
                                            label="Display Name"
                                            value={settings.rewards?.displayName || 'Points'}
                                            onChange={(e) => handleInputChange('rewards', 'displayName', e.target.value)}
                                            helperText="e.g., Points, Coins, Stars"
                                        />
                                    </Grid>
                                    <Grid size={{ xs: 12, md: 6 }}>
                                        <TextField
                                            fullWidth
                                            type="number"
                                            label="Point Value ($)"
                                            value={settings.rewards?.pointValue ?? 0.05}
                                            onChange={(e) => {
                                                let val = e.target.value;
                                                if (val.length > 4) return;
                                                if (/^0[0-9]+/.test(val)) { val = val.replace(/^0+/, ''); e.target.value = val; }
                                                handleInputChange('rewards', 'pointValue', Number(val) || 0);
                                            }}
                                            slotProps={{ htmlInput: { min: 0, step: "0.01" } }}
                                            helperText="Value of 1 point in dollars (e.g. 0.05 = $5 for 100 pts)"
                                        />
                                    </Grid>

                                    <Grid size={{ xs: 12 }}>
                                        <Divider sx={{ my: 1 }} />
                                        <Typography variant="subtitle2" sx={{ mb: 2 }}>Earning Rules</Typography>
                                    </Grid>

                                    <Grid size={{ xs: 12, md: 4 }}>
                                        <TextField
                                            fullWidth
                                            type="number"
                                            label="Points per $1 Spent"
                                            value={settings.rewards?.earnRate ?? 1}
                                            onChange={(e) => {
                                                let val = e.target.value;
                                                if (val.length > 4) return;
                                                if (/^0[0-9]+/.test(val)) { val = val.replace(/^0+/, ''); e.target.value = val; }
                                                handleInputChange('rewards', 'earnRate', Number(val) || 0);
                                            }}
                                            slotProps={{ htmlInput: { min: 0 } }}
                                        />
                                    </Grid>
                                    <Grid size={{ xs: 12, md: 4 }}>
                                        <TextField
                                            fullWidth
                                            select
                                            label="Calculation Base"
                                            value={settings.rewards?.calculationBase || 'total'}
                                            onChange={(e) => handleInputChange('rewards', 'calculationBase', e.target.value)}
                                        >
                                            <MenuItem value="subtotal">Subtotal</MenuItem>
                                            <MenuItem value="total_after_discount">After Discount</MenuItem>
                                            <MenuItem value="total">Final Total</MenuItem>
                                        </TextField>
                                    </Grid>
                                    <Grid size={{ xs: 12, md: 4 }}>
                                        <TextField
                                            fullWidth
                                            type="number"
                                            label="Min Order to Earn"
                                            value={settings.rewards?.minOrderValueToEarn ?? 0}
                                            onChange={(e) => {
                                                let val = e.target.value;
                                                if (val.length > 4) return;
                                                if (/^0[0-9]+/.test(val)) { val = val.replace(/^0+/, ''); e.target.value = val; }
                                                handleInputChange('rewards', 'minOrderValueToEarn', Number(val) || 0);
                                            }}
                                            slotProps={{ htmlInput: { min: 0 } }}
                                            InputProps={{ startAdornment: <InputAdornment position="start">$</InputAdornment> }}
                                        />
                                    </Grid>

                                    <Grid size={{ xs: 12 }}>
                                        <Divider sx={{ my: 1 }} />
                                        <Typography variant="subtitle2" sx={{ mb: 2 }}>Bonuses</Typography>
                                    </Grid>

                                    <Grid size={{ xs: 12, md: 4 }}>
                                        <TextField
                                            fullWidth
                                            type="number"
                                            label="Welcome Bonus"
                                            value={settings.rewards?.welcomeBonus ?? 100}
                                            onChange={(e) => {
                                                let val = e.target.value;
                                                if (val.length > 4) return;
                                                if (/^0[0-9]+/.test(val)) { val = val.replace(/^0+/, ''); e.target.value = val; }
                                                handleInputChange('rewards', 'welcomeBonus', Number(val) || 0);
                                            }}
                                            slotProps={{ htmlInput: { min: 0 } }}
                                            helperText="Points given on sign up"
                                        />
                                    </Grid>
                                    <Grid size={{ xs: 12, md: 4 }}>
                                        <TextField
                                            fullWidth
                                            type="number"
                                            label="First Order Bonus"
                                            value={settings.rewards?.firstOrderBonus ?? 0}
                                            onChange={(e) => {
                                                let val = e.target.value;
                                                if (val.length > 4) return;
                                                if (/^0[0-9]+/.test(val)) { val = val.replace(/^0+/, ''); e.target.value = val; }
                                                handleInputChange('rewards', 'firstOrderBonus', Number(val) || 0);
                                            }}
                                            slotProps={{ htmlInput: { min: 0 } }}
                                        />
                                    </Grid>
                                    <Grid size={{ xs: 12, md: 4 }}>
                                        <TextField
                                            fullWidth
                                            type="number"
                                            label="Feedback/Rating Bonus"
                                            value={settings.rewards?.pointsPerRating ?? 0}
                                            onChange={(e) => {
                                                let val = e.target.value;
                                                if (val.length > 4) return;
                                                if (/^0[0-9]+/.test(val)) { val = val.replace(/^0+/, ''); e.target.value = val; }
                                                handleInputChange('rewards', 'pointsPerRating', Number(val) || 0);
                                            }}
                                            slotProps={{ htmlInput: { min: 0 } }}
                                            helperText="Points per submitted rating"
                                        />
                                    </Grid>

                                    <Grid size={{ xs: 12 }}>
                                        <Divider sx={{ my: 1 }} />
                                        <Typography variant="subtitle2" sx={{ mb: 2 }}>Redemption Rules</Typography>
                                    </Grid>

                                    <Grid size={{ xs: 12, md: 6 }}>
                                        <TextField
                                            fullWidth
                                            type="number"
                                            label="Min Points to Redeem"
                                            value={settings.rewards?.minPointsToRedeem ?? 100}
                                            onChange={(e) => {
                                                let val = e.target.value;
                                                if (val.length > 7) return;
                                                if (/^0[0-9]+/.test(val)) { val = val.replace(/^0+/, ''); e.target.value = val; }
                                                handleInputChange('rewards', 'minPointsToRedeem', Number(val) || 0);
                                            }}
                                            slotProps={{ htmlInput: { min: 0 } }}
                                        />
                                    </Grid>
                                    <Grid size={{ xs: 12, md: 6 }}>
                                        <TextField
                                            fullWidth
                                            type="number"
                                            label="Max Redemption % of Bill"
                                            value={settings.rewards?.maxRedemptionPercentage ?? 100}
                                            onChange={(e) => {
                                                let val = e.target.value;
                                                if (val.length > 3) return;
                                                if (/^0[0-9]+/.test(val)) { val = val.replace(/^0+/, ''); e.target.value = val; }
                                                handleInputChange('rewards', 'maxRedemptionPercentage', Math.min(100, Number(val) || 0));
                                            }}
                                            slotProps={{ htmlInput: { min: 0, max: 100 } }}
                                            InputProps={{ endAdornment: <InputAdornment position="end">%</InputAdornment> }}
                                            helperText="Cap points usage to X% of the order total"
                                        />
                                    </Grid>

                                    <Grid size={{ xs: 12 }} sx={{ display: 'flex', justifyContent: { xs: 'center', md: 'flex-start' }, mt: { xs: 2, md: 0 } }}>
                                        <Button
                                            variant="contained"
                                            size={isMobile ? "medium" : "large"}
                                            startIcon={<SaveIcon />}
                                            onClick={() => handleSave('rewards')}
                                            disabled={loading}
                                            sx={{
                                                borderRadius: 2.5,
                                                px: 4,
                                                fontWeight: 800,
                                                fontFamily: "'Outfit', sans-serif",
                                                width: { xs: '100%', sm: 'auto' },
                                                maxWidth: { xs: '320px', sm: 'none' },
                                                boxShadow: `0 8px 16px ${alpha(theme.palette.primary.main, 0.25)}`
                                            }}
                                        >
                                            Save Loyalty Rules
                                        </Button>
                                    </Grid>
                                </Grid>
                            </Collapse>

                            {!(settings.rewards?.isEnabled ?? false) && (
                                <Box sx={{ mt: 2, display: 'flex', justifyContent: { xs: 'center', md: 'flex-start' } }}>
                                    <Button
                                        variant="contained"
                                        size="medium"
                                        startIcon={<SaveIcon />}
                                        onClick={() => handleSave('rewards')}
                                        disabled={loading}
                                        sx={{
                                            borderRadius: 2.5,
                                            px: { xs: 3, sm: 4 },
                                            fontWeight: 800,
                                            fontFamily: "'Outfit', sans-serif",
                                            width: { xs: 'auto', sm: 'auto' },
                                            minWidth: { xs: '140px', sm: 'auto' },
                                            boxShadow: `0 8px 16px ${alpha(theme.palette.primary.main, 0.2)}`
                                        }}
                                    >
                                        Save Loyalty Status
                                    </Button>
                                </Box>
                            )}
                        </Paper>
                    </Box>
                </TabPanel>

                <TabPanel value={tabValue} index={7}>
                    <Box sx={{ mb: 4 }}>
                        <Typography variant="h6" gutterBottom sx={{ fontWeight: 800, fontFamily: "'Outfit', sans-serif", display: 'flex', alignItems: 'center', gap: 1 }}>
                            <DeliveryDiningIcon color="primary" /> Delivery Integration
                        </Typography>
                        <Alert severity="info" sx={{ mb: 3 }}>
                            Configure your DoorDash and Uber Eats accounts to enable automated delivery dispatch from your POS and Storefront.
                        </Alert>

                        <Grid container spacing={4}>
                            {/* Built-in Delivery Section */}
                            <Grid size={{ xs: 12 }}>
                                <Paper variant="outlined" sx={{ p: 3, borderRadius: 4, borderColor: settings.delivery?.builtIn?.enabled ? 'primary.main' : 'divider', bgcolor: settings.delivery?.builtIn?.enabled ? alpha('#4F46E5', 0.02) : 'background.paper' }}>
                                    <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
                                        <Typography variant="h6" fontWeight="bold">Built-in Delivery</Typography>
                                        <FormControlLabel
                                            control={
                                                <Switch
                                                    checked={settings.delivery?.builtIn?.enabled || false}
                                                    onChange={(e) => handleDeliveryChange('builtIn', 'enabled', e.target.checked)}
                                                />
                                            }
                                            label={settings.delivery?.builtIn?.enabled ? 'Enabled' : 'Disabled'}
                                        />
                                    </Stack>
                                    <Divider sx={{ mb: 2 }} />
                                    <Typography variant="body2" color="text.secondary">
                                        Use the platform's built-in delivery system to manage and dispatch deliveries directly without a third-party provider.
                                    </Typography>
                                    {settings.delivery?.builtIn?.enabled && (
                                        <Grid container spacing={3} sx={{ mt: 2 }}>
                                            <Grid size={{ xs: 12, sm: 6 }}>
                                                <TextField
                                                    fullWidth
                                                    type="number"
                                                    label="Minimum Delivery Range"
                                                    value={settings.delivery.builtIn.minDeliveryRange ?? 0}
                                                    onChange={(e) => {
                                                        let val = e.target.value;
                                                        if (val.length > 4) return;
                                                        if (/^0[0-9]+/.test(val)) { val = val.replace(/^0+/, ''); e.target.value = val; }
                                                        handleDeliveryChange('builtIn', 'minDeliveryRange', parseFloat(val) || 0);
                                                    }}
                                                    slotProps={{ htmlInput: { min: 0 } }}
                                                    helperText="Minimum distance required for delivery orders"
                                                    InputProps={{
                                                        endAdornment: <InputAdornment position="end">Miles</InputAdornment>,
                                                    }}
                                                />
                                            </Grid>
                                            <Grid size={{ xs: 12, sm: 6 }}>
                                                <TextField
                                                    fullWidth
                                                    type="number"
                                                    label="Maximum Delivery Range"
                                                    value={settings.delivery.builtIn.maxDeliveryRange ?? 15}
                                                    onChange={(e) => {
                                                        let val = e.target.value;
                                                        if (val.length > 4) return;
                                                        if (/^0[0-9]+/.test(val)) { val = val.replace(/^0+/, ''); e.target.value = val; }
                                                        handleDeliveryChange('builtIn', 'maxDeliveryRange', parseFloat(val) || 0);
                                                    }}
                                                    slotProps={{ htmlInput: { min: 0 } }}
                                                    helperText="Maximum distance allowed for delivery orders"
                                                    InputProps={{
                                                        endAdornment: <InputAdornment position="end">Miles</InputAdornment>,
                                                    }}
                                                />
                                            </Grid>
                                            <Grid size={{ xs: 12, sm: 4 }}>
                                                <TextField
                                                    fullWidth
                                                    type="number"
                                                    label="Base Delivery Fee"
                                                    value={settings.delivery.builtIn.baseFee ?? 2.00}
                                                    onChange={(e) => {
                                                        let val = e.target.value;
                                                        if (val.length > 4) return;
                                                        if (/^0[0-9]+/.test(val)) { val = val.replace(/^0+/, ''); e.target.value = val; }
                                                        handleDeliveryChange('builtIn', 'baseFee', parseFloat(val) || 0);
                                                    }}
                                                    slotProps={{ htmlInput: { min: 0, step: 0.01 } }}
                                                    helperText="Flat fee charged on every delivery order"
                                                    InputProps={{
                                                        startAdornment: <InputAdornment position="start">$</InputAdornment>,
                                                    }}
                                                />
                                            </Grid>
                                            <Grid size={{ xs: 12, sm: 4 }}>
                                                <TextField
                                                    fullWidth
                                                    type="number"
                                                    label="Base Miles Covered"
                                                    value={settings.delivery.builtIn.baseMiles ?? 2}
                                                    onChange={(e) => {
                                                        let val = e.target.value;
                                                        if (val.length > 4) return;
                                                        if (/^0[0-9]+/.test(val)) { val = val.replace(/^0+/, ''); e.target.value = val; }
                                                        handleDeliveryChange('builtIn', 'baseMiles', parseFloat(val) || 0);
                                                    }}
                                                    slotProps={{ htmlInput: { min: 0, step: 0.5 } }}
                                                    error={(settings.delivery.builtIn.baseMiles ?? 2) > (settings.delivery.builtIn.maxDeliveryRange ?? 15)}
                                                    helperText={
                                                        (settings.delivery.builtIn.baseMiles ?? 2) > (settings.delivery.builtIn.maxDeliveryRange ?? 15)
                                                            ? "Base miles covered cannot exceed the maximum delivery range"
                                                            : "Miles included in the base fee before per-mile charges apply"
                                                    }
                                                    InputProps={{
                                                        endAdornment: <InputAdornment position="end">Miles</InputAdornment>,
                                                    }}
                                                />
                                            </Grid>
                                            <Grid size={{ xs: 12, sm: 4 }}>
                                                <TextField
                                                    fullWidth
                                                    type="number"
                                                    label="Per Mile Rate"
                                                    value={settings.delivery.builtIn.perMileRate ?? 0.50}
                                                    onChange={(e) => {
                                                        let val = e.target.value;
                                                        if (val.length > 4) return;
                                                        if (/^0[0-9]+/.test(val)) { val = val.replace(/^0+/, ''); e.target.value = val; }
                                                        handleDeliveryChange('builtIn', 'perMileRate', parseFloat(val) || 0);
                                                    }}
                                                    slotProps={{ htmlInput: { min: 0, step: 0.01 } }}
                                                    helperText="Charge per additional mile beyond base miles (rounded up)"
                                                    InputProps={{
                                                        startAdornment: <InputAdornment position="start">$</InputAdornment>,
                                                        endAdornment: <InputAdornment position="end">/ mile</InputAdornment>,
                                                    }}
                                                />
                                            </Grid>
                                        </Grid>
                                    )}
                                    <Box sx={{ mt: 4, display: 'flex', justifyContent: { xs: 'center', md: 'flex-start' } }}>
                                        <Button
                                            variant="contained"
                                            size={isMobile ? "medium" : "large"}
                                            startIcon={<SaveIcon />}
                                            onClick={() => {
                                                if ((settings.delivery?.builtIn?.baseMiles ?? 2) > (settings.delivery?.builtIn?.maxDeliveryRange ?? 15)) {
                                                    toast.error('Base miles covered cannot exceed the maximum delivery range');
                                                    return;
                                                }
                                                handleSave('delivery');
                                            }}
                                            disabled={loading || (settings.delivery?.builtIn?.baseMiles ?? 2) > (settings.delivery?.builtIn?.maxDeliveryRange ?? 15)}
                                            sx={{
                                                borderRadius: 2.5,
                                                px: 4,
                                                fontWeight: 800,
                                                fontFamily: "'Outfit', sans-serif",
                                                width: { xs: '100%', sm: 'auto' },
                                                maxWidth: { xs: '320px', sm: 'none' },
                                                boxShadow: `0 8px 16px ${alpha(theme.palette.primary.main, 0.25)}`
                                            }}
                                        >
                                            Save
                                        </Button>
                                    </Box>
                                </Paper>
                            </Grid>

                            {/* DoorDash Section */}
                            <Grid size={{ xs: 12, md: 6 }}>
                                <Paper variant="outlined" sx={{ p: 3, borderRadius: 4, height: '100%', borderColor: settings.delivery?.doordash?.enabled ? 'primary.main' : 'divider', bgcolor: settings.delivery?.doordash?.enabled ? alpha('#4F46E5', 0.02) : 'background.paper' }}>
                                    <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
                                        <Typography variant="h6" fontWeight="bold">DoorDash Drive</Typography>
                                        <FormControlLabel
                                            control={
                                                <Switch
                                                    checked={settings.delivery?.doordash?.enabled || false}
                                                    onChange={(e) => handleDeliveryChange('doordash', 'enabled', e.target.checked)}
                                                />
                                            }
                                            label={settings.delivery?.doordash?.enabled ? 'Enabled' : 'Disabled'}
                                        />
                                    </Stack>
                                    <Divider sx={{ mb: 2 }} />
                                    <Typography variant="body2" color="text.secondary">
                                        DoorDash Drive credentials are configured by your platform administrator. Toggle to enable or disable DoorDash delivery for your store.
                                    </Typography>
                                    <Box sx={{ mt: 4, display: 'flex', justifyContent: { xs: 'center', md: 'flex-start' } }}>
                                        <Button
                                            variant="contained"
                                            size={isMobile ? "medium" : "large"}
                                            startIcon={<SaveIcon />}
                                            onClick={() => handleSave('delivery')}
                                            disabled={loading}
                                            sx={{
                                                borderRadius: 2.5,
                                                px: 4,
                                                fontWeight: 800,
                                                fontFamily: "'Outfit', sans-serif",
                                                width: { xs: '100%', sm: 'auto' },
                                                maxWidth: { xs: '320px', sm: 'none' },
                                                boxShadow: `0 8px 16px ${alpha(theme.palette.primary.main, 0.25)}`
                                            }}
                                        >
                                            Save
                                        </Button>
                                    </Box>
                                </Paper>
                            </Grid>

                            {/* Uber Eats Section */}
                            <Grid size={{ xs: 12, md: 6 }}>
                                <Paper variant="outlined" sx={{ p: 3, borderRadius: 4, height: '100%', borderColor: settings.delivery?.ubereats?.enabled ? 'primary.main' : 'divider', bgcolor: settings.delivery?.ubereats?.enabled ? alpha('#4F46E5', 0.02) : 'background.paper' }}>
                                    <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
                                        <Typography variant="h6" fontWeight="bold">Uber Direct</Typography>
                                        <FormControlLabel
                                            control={
                                                <Switch
                                                    checked={settings.delivery?.ubereats?.enabled || false}
                                                    onChange={(e) => handleDeliveryChange('ubereats', 'enabled', e.target.checked)}
                                                />
                                            }
                                            label={settings.delivery?.ubereats?.enabled ? 'Enabled' : 'Disabled'}
                                        />
                                    </Stack>
                                    <Divider sx={{ mb: 2 }} />
                                    <Typography variant="body2" color="text.secondary">
                                        Uber Direct credentials are configured by your platform administrator. Toggle to enable or disable Uber Direct delivery for your store.
                                    </Typography>
                                    <Box sx={{ mt: 4, display: 'flex', justifyContent: { xs: 'center', md: 'flex-end' } }}>
                                        <Button
                                            variant="contained"
                                            size={isMobile ? "medium" : "large"}
                                            startIcon={<SaveIcon />}
                                            onClick={() => handleSave('delivery')}
                                            disabled={loading}
                                            sx={{
                                                borderRadius: 2.5,
                                                px: 4,
                                                fontWeight: 800,
                                                fontFamily: "'Outfit', sans-serif",
                                                width: { xs: '100%', sm: 'auto' },
                                                maxWidth: { xs: '320px', sm: 'none' },
                                                boxShadow: `0 8px 16px ${alpha(theme.palette.primary.main, 0.25)}`
                                            }}
                                        >
                                            Save
                                        </Button>
                                    </Box>
                                </Paper>
                            </Grid>
                        </Grid>

                    </Box>
                </TabPanel>

                {/* Menu Prices Tab */}
                <TabPanel value={tabValue} index={8}>
                    <Box sx={{ mb: 3 }}>
                        <Typography variant="h6" gutterBottom sx={{ fontWeight: 800, fontFamily: "'Outfit', sans-serif", display: 'flex', alignItems: 'center', gap: 1 }}>
                            <PriceChangeIcon color="primary" /> Bulk Menu Price Adjustment
                        </Typography>
                        <Alert severity="info" sx={{ mb: 3 }}>
                            Adjust prices for all menu items or by category by a percentage. Preview changes before applying.
                        </Alert>

                        <Grid container spacing={3} sx={{ mb: 3 }}>
                            <Grid size={{ xs: 12, sm: 4 }}>
                                <TextField
                                    select
                                    fullWidth
                                    label="Category"
                                    value={priceSelectedCategory}
                                    onChange={e => { setPriceSelectedCategory(e.target.value); setPricePreviewItems([]); }}
                                    size="small"
                                >
                                    <MenuItem value="all">All Categories</MenuItem>
                                    {priceCategories.map((cat: any) => (
                                        <MenuItem key={cat._id} value={cat._id}>{cat.name}</MenuItem>
                                    ))}
                                </TextField>
                            </Grid>
                            <Grid size={{ xs: 12, sm: 4 }}>
                                <TextField
                                    fullWidth
                                    label="Adjustment %"
                                    placeholder="e.g. 10 or -5"
                                    value={pricePercentage}
                                    onChange={e => { setPricePercentage(e.target.value); setPricePreviewItems([]); }}
                                    size="small"
                                    type="number"
                                    InputProps={{ endAdornment: <InputAdornment position="end">%</InputAdornment> }}
                                />
                            </Grid>
                            <Grid size={{ xs: 12, sm: 4 }}>
                                <Button
                                    variant="outlined"
                                    fullWidth
                                    onClick={handlePricePreview}
                                    disabled={pricePreviewLoading || !pricePercentage}
                                    startIcon={pricePreviewLoading ? <CircularProgress size={16} /> : undefined}
                                    sx={{ height: 40 }}
                                >
                                    {pricePreviewLoading ? 'Loading…' : 'Preview Changes'}
                                </Button>
                            </Grid>
                        </Grid>

                        {pricePreviewItems.length > 0 && (
                            <Box>
                                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.5 }}>
                                    <Typography variant="subtitle2" color="text.secondary">
                                        {pricePreviewItems.length} item(s) will be updated
                                    </Typography>
                                    <Button
                                        variant="contained"
                                        color="warning"
                                        onClick={handlePriceApply}
                                        disabled={priceApplyLoading}
                                        startIcon={priceApplyLoading ? <CircularProgress size={16} color="inherit" /> : undefined}
                                    >
                                        {priceApplyLoading ? 'Applying…' : `Apply ${pricePercentage}% to ${pricePreviewItems.length} items`}
                                    </Button>
                                </Box>
                                <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 2 }}>
                                    <Table size="small">
                                        <TableHead>
                                            <TableRow sx={{ bgcolor: 'grey.50' }}>
                                                <TableCell><strong>Item</strong></TableCell>
                                                <TableCell><strong>Category</strong></TableCell>
                                                <TableCell align="right"><strong>Current Price</strong></TableCell>
                                                <TableCell align="right"><strong>New Price</strong></TableCell>
                                            </TableRow>
                                        </TableHead>
                                        <TableBody>
                                            {pricePreviewItems.map(item => (
                                                <TableRow key={item._id} hover>
                                                    <TableCell>{item.name}</TableCell>
                                                    <TableCell>{typeof item.category === 'object' ? item.category?.name : item.category}</TableCell>
                                                    <TableCell align="right">{item.currentPrice.toFixed(2)}</TableCell>
                                                    <TableCell align="right" sx={{ color: parseFloat(pricePercentage) > 0 ? 'success.main' : 'error.main', fontWeight: 600 }}>
                                                        {item.newPrice.toFixed(2)}
                                                    </TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                </TableContainer>
                            </Box>
                        )}

                        {/* Price Adjustment Logs */}
                        <Box sx={{ mt: 3 }}>
                            <Button
                                variant="text"
                                startIcon={<HistoryIcon />}
                                endIcon={<ExpandMoreIcon sx={{ transform: priceLogsOpen ? 'rotate(180deg)' : 'rotate(0deg)', transition: '0.2s' }} />}
                                onClick={handleTogglePriceLogs}
                                sx={{ textTransform: 'none', fontWeight: 600 }}
                            >
                                Logs
                            </Button>
                            <Collapse in={priceLogsOpen}>
                                <Box sx={{ mt: 1.5 }}>
                                    {priceLogsLoading ? (
                                        <Box sx={{ display: 'flex', justifyContent: 'center', py: 3 }}>
                                            <CircularProgress size={24} />
                                        </Box>
                                    ) : priceLogs.length === 0 ? (
                                        <Typography variant="body2" color="text.secondary" sx={{ py: 2 }}>
                                            No price adjustments recorded yet.
                                        </Typography>
                                    ) : (
                                        <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 2 }}>
                                            <Table size="small">
                                                <TableHead>
                                                    <TableRow sx={{ bgcolor: 'grey.50' }}>
                                                        <TableCell><strong>Updated By</strong></TableCell>
                                                        <TableCell><strong>Adjustment</strong></TableCell>
                                                        <TableCell><strong>Category</strong></TableCell>
                                                        <TableCell align="right"><strong>Items</strong></TableCell>
                                                        <TableCell><strong>Date &amp; Time</strong></TableCell>
                                                    </TableRow>
                                                </TableHead>
                                                <TableBody>
                                                    {priceLogs.map((log: any) => (
                                                        <TableRow key={log._id} hover>
                                                            <TableCell>
                                                                <Typography variant="body2" fontWeight={600}>{log.performedBy?.name || '—'}</Typography>
                                                                {log.performedBy?.email && (
                                                                    <Typography variant="caption" color="text.secondary">{log.performedBy.email}</Typography>
                                                                )}
                                                            </TableCell>
                                                            <TableCell sx={{ color: log.percentage > 0 ? 'success.main' : 'error.main', fontWeight: 600 }}>
                                                                {log.percentage > 0 ? '+' : ''}{log.percentage}%
                                                            </TableCell>
                                                            <TableCell>{log.categoryName || 'All Categories'}</TableCell>
                                                            <TableCell align="right">{log.itemsUpdated}</TableCell>
                                                            <TableCell>
                                                                {new Date(log.createdAt).toLocaleString('en-US', {
                                                                    month: '2-digit',
                                                                    day: '2-digit',
                                                                    year: 'numeric',
                                                                    hour: 'numeric',
                                                                    minute: '2-digit',
                                                                    hour12: true,
                                                                })}
                                                            </TableCell>
                                                        </TableRow>
                                                    ))}
                                                </TableBody>
                                            </Table>
                                        </TableContainer>
                                    )}
                                </Box>
                            </Collapse>
                        </Box>
                    </Box>
                </TabPanel>
            </Paper >

            {/* Print Agent Pairing Token Modal */}
            <Dialog
                open={!!newToken}
                onClose={() => setNewToken(null)}
                PaperProps={{
                    sx: { borderRadius: 3, width: '100%', maxWidth: 450 }
                }}
            >
                <DialogTitle sx={{ fontWeight: 800, pb: 1 }}>
                    Agent Pairing Token
                </DialogTitle>
                <DialogContent>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                        Copy this code and paste it into the <strong>NexZenPOS Print Agent</strong> app on your computer.
                        This code is your secure link between the restaurant and that computer.
                    </Typography>

                    <TextField
                        fullWidth
                        label="Connection Code"
                        value={newToken || ''}
                        InputProps={{
                            readOnly: true,
                            sx: { fontFamily: 'monospace', bgcolor: alpha('#4f46e5', 0.03) },
                            endAdornment: (
                                <InputAdornment position="end">
                                    <IconButton
                                        onClick={() => {
                                            if (newToken) {
                                                navigator.clipboard.writeText(newToken);
                                                toast.success('Token copied to clipboard');
                                            }
                                        }}
                                        edge="end"
                                        color="primary"
                                    >
                                        <ContentCopyIcon />
                                    </IconButton>
                                </InputAdornment>
                            ),
                        }}
                    />

                    <Alert severity="warning" sx={{ mt: 3, borderRadius: 2 }}>
                        Keep this code private. Do not share it with anyone outside your trusted team.
                    </Alert>
                </DialogContent>
                <DialogActions sx={{ p: 2, pt: 0 }}>
                    <Button
                        fullWidth
                        variant="contained"
                        onClick={() => setNewToken(null)}
                        sx={{ borderRadius: 2, height: 48, fontWeight: 700 }}
                    >
                        I've Copied the Code
                    </Button>
                </DialogActions>
            </Dialog>
        </Box >
    );
};

export default SettingsPage;

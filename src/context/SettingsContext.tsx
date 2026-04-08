import React, { createContext, useContext, useState, useEffect } from 'react';
import { settingsAPI } from '../services/api';
import { useAuth } from './AuthContext';

// Unit configuration for inventory
export interface UnitConfig {
    value: string;
    label: string;
    type: 'weight' | 'volume' | 'count';
}

export interface TimeSlot {
    openTime: string;
    closeTime: string;
}

export interface BusinessHourDay {
    day: string;
    isOpen: boolean;
    openTime?: string;
    closeTime?: string;
    slots?: TimeSlot[];
}

export interface RestaurantMailingStatus {
    hasGmailAppPassword?: boolean;
    hasSmtpPassword?: boolean;
}

export interface RestaurantGmailMailingSettings {
    email: string;
    fromEmail?: string;
    appPassword: string;
}

export interface RestaurantSmtpMailingSettings {
    host: string;
    port: number;
    secure: boolean;
    username: string;
    password: string;
    fromEmail: string;
}

export interface RestaurantMailingSettings {
    enabled: boolean;
    provider: 'gmail' | 'smtp';
    fromName: string;
    gmail: RestaurantGmailMailingSettings;
    smtp: RestaurantSmtpMailingSettings;
    status?: RestaurantMailingStatus;
}

export interface RestaurantSettings {
    name: string;
    address: string;
    phone: string;
    email: string;
    currency: string;
    currencySymbol: string;
    taxRate: number;
    logo: string;
    stamp?: string;
    country: string;
    timezone: string;
    dialCode: string;
    city?: string;
    state?: string;
    zipCode?: string;
    taxBreakdown?: {
        enabled: boolean;
        country: number | string;
        state: number | string;
        city: number | string;
        county: number | string;
    };
    tablePricing?: {
        enabled: boolean;
        sharedBaseRate: number;
        privateBaseRate: number;
    };
    units?: UnitConfig[];
    occasions?: string[];
    deliveryRadius: number;
    businessHours?: BusinessHourDay[];
    mailing?: RestaurantMailingSettings;
}

export interface SystemSettings {
    theme: string;
    notifications: boolean;
    autoPrint: boolean;
    googleMapsApiKey?: string;
    posPaymentMethods?: {
        cash?: boolean;
        card?: boolean;
        zelle?: boolean;
        venmo?: boolean;
    };
}

export interface PaymentSettings {
    stripePublishableKey?: string;
    stripeSecretKey?: string;
    stripeWebhookSecret?: string;
    stripeMode?: 'test' | 'live';
}

export interface NotificationSettings {
    sms: {
        enabled: boolean;
        provider: 'twilio';
        twilio: {
            accountSid: string;
            authToken: string;
            fromNumber: string;
        };
        status?: {
            hasAccountSid?: boolean;
            hasAuthToken?: boolean;
            hasFromNumber?: boolean;
            isConnected?: boolean;
        };
    };
    sound?: string;
    push?: any;
}

export interface PrinterConfig {
    name: string;
    type: 'epson-epos' | 'escpos-tcp' | 'print-agent' | 'none';
    ip: string;
    port: number;
    paperWidth: number;
    deviceId?: string;
}

export interface TenantPrinterSettings {
    enabled: boolean;
    preferredAgentId?: string;
    billing?: PrinterConfig;
    kitchen?: PrinterConfig;
}

export interface DeliverySettings {
    doordash: {
        enabled: boolean;
        developerId: string;
        keyId: string;
        signingSecret: string;
        isSandbox: boolean;
    };
    ubereats: {
        enabled: boolean;
        clientId: string;
        clientSecret: string;
        customerId: string;
        isSandbox: boolean;
    };
}

export interface RewardSettings {
    isEnabled: boolean;
    displayName: string;
    pointValue: number;
    earnRate: number;
    calculationBase: string;
    minOrderValueToEarn: number;
    welcomeBonus: number;
    firstOrderBonus: number;
    minPointsToRedeem: number;
    maxRedemptionPercentage: number;
}

export interface SettingsState {
    restaurant: RestaurantSettings;
    system: SystemSettings;
    payment: PaymentSettings;
    notification: NotificationSettings;
    printer: TenantPrinterSettings;
    rewards: RewardSettings;
    delivery?: DeliverySettings;
}

// Default settings
const defaultSettings: SettingsState = {
    restaurant: {
        name: '',
        address: '',
        phone: '',
        email: '',
        currency: 'USD',
        currencySymbol: '$',
        taxRate: 5,
        city: '',
        state: '',
        zipCode: '',
        taxBreakdown: {
            enabled: false,
            country: 0,
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
        businessHours: [
            { day: 'Monday', isOpen: true, slots: [{ openTime: '11:00', closeTime: '22:00' }] },
            { day: 'Tuesday', isOpen: true, slots: [{ openTime: '11:00', closeTime: '22:00' }] },
            { day: 'Wednesday', isOpen: true, slots: [{ openTime: '11:00', closeTime: '22:00' }] },
            { day: 'Thursday', isOpen: true, slots: [{ openTime: '11:00', closeTime: '22:00' }] },
            { day: 'Friday', isOpen: true, slots: [{ openTime: '11:00', closeTime: '23:00' }] },
            { day: 'Saturday', isOpen: true, slots: [{ openTime: '11:00', closeTime: '23:00' }] },
            { day: 'Sunday', isOpen: true, slots: [{ openTime: '12:00', closeTime: '21:00' }] },
        ],
        mailing: {
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
        },
    },
    system: {
        theme: 'light',
        notifications: true,
        autoPrint: false,
        googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '',
        posPaymentMethods: {
            cash: true,
            card: true,
            zelle: true,
            venmo: true,
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
        sound: 'notification',
    },
    printer: {
        enabled: false,
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
    },
    delivery: {
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
            isSandbox: true,
        }
    }
};

interface SettingsContextType {
    settings: SettingsState;
    loading: boolean;
    refreshSettings: () => Promise<void>;
    updateSettings: (newSettings: SettingsState) => void;
    formatCurrency: (amount: number) => string;
    getUnits: () => UnitConfig[];
    unitSystem: UnitSystem;
    defaultDialCode: string; // Dynamic dial code based on setting
}

const SettingsContext = createContext<SettingsContextType | null>(null);

export const useSettings = () => {
    const context = useContext(SettingsContext);
    if (!context) {
        throw new Error('useSettings must be used within a SettingsProvider');
    }
    return context;
};

// Helper to get symbol from code
export const getCurrencySymbol = (currencyCode: string): string => {
    switch (currencyCode) {
        case 'USD': return '$';
        case 'INR': return '₹';
        case 'EUR': return '€';
        case 'GBP': return '£';
        case 'AUD': return 'A$';
        case 'CAD': return 'C$';
        case 'SGD': return 'S$';
        case 'JPY': return '¥';
        case 'CNY': return '¥';
        default: return currencyCode;
    }
};

// Map of common countries to their dial codes
export const COUNTRY_DIAL_CODES: Record<string, string> = {
    'United States': '1',
    'India': '91',
    'United Kingdom': '44',
    'Canada': '1',
    'Australia': '61',
    'Singapore': '65',
    'United Arab Emirates': '971',
    'Germany': '49',
    'France': '33',
    'Japan': '81',
};

// Helper to get dial code by country name
export const getDialCodeByCountry = (countryName: string): string => {
    return COUNTRY_DIAL_CODES[countryName] || '1'; // Default to 1 if not found
};

// Countries that use Imperial system
const IMPERIAL_COUNTRIES = [
    'United States', 'USA', 'US', 'America',
    'Liberia',
    'Myanmar', 'Burma'
];

// Unit system types
export type UnitSystem = 'metric' | 'imperial';

// Metric units (India, most of the world)
export const METRIC_UNITS: UnitConfig[] = [
    { value: 'kg', label: 'Kilograms (kg)', type: 'weight' },
    { value: 'g', label: 'Grams (g)', type: 'weight' },
    { value: 'l', label: 'Liters (l)', type: 'volume' },
    { value: 'ml', label: 'Milliliters (ml)', type: 'volume' },
    { value: 'pieces', label: 'Pieces', type: 'count' },
    { value: 'packets', label: 'Packets', type: 'count' },
    { value: 'boxes', label: 'Boxes', type: 'count' },
    { value: 'bottles', label: 'Bottles', type: 'count' },
];

// Imperial units (USA, Liberia, Myanmar)
export const IMPERIAL_UNITS: UnitConfig[] = [
    { value: 'lb', label: 'Pounds (lb)', type: 'weight' },
    { value: 'oz', label: 'Ounces (oz)', type: 'weight' },
    { value: 'gallon', label: 'Gallons', type: 'volume' },
    { value: 'quart', label: 'Quarts', type: 'volume' },
    { value: 'pint', label: 'Pints', type: 'volume' },
    { value: 'fl_oz', label: 'Fluid Ounces (fl oz)', type: 'volume' },
    { value: 'each', label: 'Each', type: 'count' },
    { value: 'dozen', label: 'Dozen', type: 'count' },
    { value: 'pieces', label: 'Pieces', type: 'count' },
    { value: 'boxes', label: 'Boxes', type: 'count' },
];

// Determine unit system from country
export const getUnitSystem = (country: string): UnitSystem => {
    const normalizedCountry = country?.trim()?.toLowerCase() || '';
    return IMPERIAL_COUNTRIES.some(c => normalizedCountry.includes(c.toLowerCase()))
        ? 'imperial'
        : 'metric';
};

// Get appropriate units based on country
export const getUnitsForCountry = (country: string): { value: string; label: string }[] => {
    return getUnitSystem(country) === 'imperial' ? IMPERIAL_UNITS : METRIC_UNITS;
};

// Get all valid unit values (for backend validation)
export const ALL_VALID_UNITS = [
    // Metric
    'kg', 'g', 'l', 'ml', 'pieces', 'packets', 'boxes', 'bottles',
    // Imperial
    'lb', 'oz', 'gallon', 'quart', 'pint', 'fl_oz', 'each', 'dozen'
];

export const SettingsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const { user } = useAuth();
    const [settings, setSettings] = useState<SettingsState>(defaultSettings);
    const [loading, setLoading] = useState<boolean>(true);

    const refreshSettings = async () => {
        try {
            setLoading(true);
            const response = await settingsAPI.getAll();

            let fetched: Partial<SettingsState> = {};

            if (Array.isArray(response.data)) {
                fetched = response.data.reduce((acc: Partial<SettingsState>, curr: any) => {
                    if (curr?.category && curr?.settings) {
                        acc[curr.category as keyof SettingsState] = curr.settings;
                    }
                    return acc;
                }, {});
            } else if (response.data && typeof response.data === 'object') {
                fetched = response.data as Partial<SettingsState>;
            }

            const merged: SettingsState = {
                restaurant: {
                    ...defaultSettings.restaurant,
                    ...(fetched.restaurant || {}),
                    mailing: {
                        ...defaultSettings.restaurant.mailing,
                        ...(fetched.restaurant?.mailing || {}),
                        enabled: fetched.restaurant?.mailing?.enabled ?? defaultSettings.restaurant.mailing?.enabled ?? false,
                        provider: fetched.restaurant?.mailing?.provider ?? defaultSettings.restaurant.mailing?.provider ?? 'gmail',
                        fromName: fetched.restaurant?.mailing?.fromName ?? defaultSettings.restaurant.mailing?.fromName ?? '',
                        gmail: {
                            ...defaultSettings.restaurant.mailing?.gmail!,
                            ...(fetched.restaurant?.mailing?.gmail || {}),
                            email: fetched.restaurant?.mailing?.gmail?.email || defaultSettings.restaurant.mailing?.gmail.email || '',
                        },
                        smtp: {
                            ...defaultSettings.restaurant.mailing?.smtp!,
                            ...(fetched.restaurant?.mailing?.smtp || {}),
                            host: fetched.restaurant?.mailing?.smtp?.host || defaultSettings.restaurant.mailing?.smtp.host || '',
                            username: fetched.restaurant?.mailing?.smtp?.username || defaultSettings.restaurant.mailing?.smtp.username || '',
                            password: fetched.restaurant?.mailing?.smtp?.password || defaultSettings.restaurant.mailing?.smtp.password || '',
                            fromEmail: fetched.restaurant?.mailing?.smtp?.fromEmail || defaultSettings.restaurant.mailing?.smtp.fromEmail || '',
                        },
                        status: {
                            ...defaultSettings.restaurant.mailing?.status,
                            ...(fetched.restaurant?.mailing?.status || {}),
                        },
                    },
                },
                system: {
                    ...defaultSettings.system,
                    ...(fetched.system || {}),
                    googleMapsApiKey: (fetched.system?.googleMapsApiKey) || defaultSettings.system.googleMapsApiKey,
                    posPaymentMethods: {
                        ...defaultSettings.system.posPaymentMethods,
                        ...(fetched.system?.posPaymentMethods || {})
                    }
                },
                payment: {
                    ...defaultSettings.payment,
                    ...(fetched.payment || {}),
                },
                notification: {
                    ...defaultSettings.notification,
                    ...(fetched.notification || {}),
                    sms: {
                        ...defaultSettings.notification.sms,
                        ...(fetched.notification?.sms || {}),
                        twilio: {
                            ...defaultSettings.notification.sms.twilio,
                            ...(fetched.notification?.sms?.twilio || {}),
                        },
                    },
                },
                printer: {
                    ...defaultSettings.printer,
                    ...(fetched.printer || {}),
                    billing: {
                        ...defaultSettings.printer.billing!,
                        ...(fetched.printer?.billing || {}),
                    },
                    kitchen: {
                        ...defaultSettings.printer.kitchen!,
                        ...(fetched.printer?.kitchen || {}),
                    }
                },
                rewards: {
                    ...defaultSettings.rewards,
                    ...(fetched.rewards || {}),
                },
                delivery: {
                    doordash: {
                        ...defaultSettings.delivery!.doordash,
                        ...(fetched.delivery?.doordash || {}),
                    },
                    ubereats: {
                        ...defaultSettings.delivery!.ubereats,
                        ...(fetched.delivery?.ubereats || {}),
                    }
                }
            };

            // Recalculate symbol based on fetched currency
            merged.restaurant.currencySymbol = getCurrencySymbol(merged.restaurant.currency);

            if (!merged.restaurant.name && user?.tenant) {
                merged.restaurant.name = (user.tenant as any).name || '';
            }
            if (!merged.restaurant.logo && user?.tenant) {
                merged.restaurant.logo = (user.tenant as any).logo || '';
            }
            if (!merged.restaurant.email && user?.tenant) {
                merged.restaurant.email = (user.tenant as any).contactEmail || user?.email || '';
            }
            if (!merged.restaurant.phone && user?.tenant) {
                const phoneVal = (user.tenant as any).contactPhone || user?.phone || '';
                merged.restaurant.phone = phoneVal.replace(/\D/g, '').slice(-10);
            }

            setSettings(merged);
        } catch (error) {
            console.error('Error fetching global settings:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (user) {
            refreshSettings();
        } else {
            setLoading(false);
        }
    }, [user]);

    const updateSettings = (newSettings: SettingsState) => {
        const updated = { ...newSettings };
        updated.restaurant.currencySymbol = getCurrencySymbol(updated.restaurant.currency);
        setSettings(updated);
    };

    const formatCurrency = (amount: number): string => {
        return `${settings.restaurant.currencySymbol}${amount.toFixed(2)}`;
    };

    const unitSystem = getUnitSystem(settings.restaurant.country);

    const getUnits = (): UnitConfig[] => {
        if (settings.restaurant.units && settings.restaurant.units.length > 0) {
            return settings.restaurant.units;
        }
        return unitSystem === 'imperial' ? IMPERIAL_UNITS : METRIC_UNITS;
    };

    return (
        <SettingsContext.Provider value={{
            settings,
            loading,
            refreshSettings,
            updateSettings,
            formatCurrency,
            getUnits,
            unitSystem,
            defaultDialCode: settings.restaurant.dialCode || '1'
        }}>
            {children}
        </SettingsContext.Provider>
    );
};

import React, { useState, useMemo, useRef } from 'react';
import {
    TextField,
    Popover,
    Box,
    Typography,
    InputAdornment,
    Button,
    List,
    ListItemButton,
    ListItemText,
    Divider,
} from '@mui/material';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';

// ─── Flag Image Helper ────────────────────────────────────────────────────────
// Uses flagcdn.com - renders real flag images, works on ALL platforms including Windows

const FlagImg: React.FC<{ iso2: string; size?: number }> = ({ iso2, size = 20 }) => (
    <Box
        component="img"
        src={`https://flagcdn.com/w40/${iso2?.toLowerCase()}.png`}
        alt={iso2}
        sx={{
            width: size,
            height: size * 0.667,   // 3:2 flag ratio
            objectFit: 'cover',
            borderRadius: '2px',
            flexShrink: 0,
            display: 'block',
        }}
        onError={(e: any) => { e.currentTarget.style.display = 'none'; }}
    />
);

// ─── Country Data ─────────────────────────────────────────────────────────────

const COUNTRIES = [
    { name: 'Afghanistan', iso2: 'AF', dialCode: '93' },
    { name: 'Albania', iso2: 'AL', dialCode: '355' },
    { name: 'Algeria', iso2: 'DZ', dialCode: '213' },
    { name: 'Andorra', iso2: 'AD', dialCode: '376' },
    { name: 'Angola', iso2: 'AO', dialCode: '244' },
    { name: 'Argentina', iso2: 'AR', dialCode: '54' },
    { name: 'Armenia', iso2: 'AM', dialCode: '374' },
    { name: 'Australia', iso2: 'AU', dialCode: '61' },
    { name: 'Austria', iso2: 'AT', dialCode: '43' },
    { name: 'Azerbaijan', iso2: 'AZ', dialCode: '994' },
    { name: 'Bahamas', iso2: 'BS', dialCode: '1242' },
    { name: 'Bahrain', iso2: 'BH', dialCode: '973' },
    { name: 'Bangladesh', iso2: 'BD', dialCode: '880' },
    { name: 'Belarus', iso2: 'BY', dialCode: '375' },
    { name: 'Belgium', iso2: 'BE', dialCode: '32' },
    { name: 'Belize', iso2: 'BZ', dialCode: '501' },
    { name: 'Benin', iso2: 'BJ', dialCode: '229' },
    { name: 'Bhutan', iso2: 'BT', dialCode: '975' },
    { name: 'Bolivia', iso2: 'BO', dialCode: '591' },
    { name: 'Bosnia and Herzegovina', iso2: 'BA', dialCode: '387' },
    { name: 'Botswana', iso2: 'BW', dialCode: '267' },
    { name: 'Brazil', iso2: 'BR', dialCode: '55' },
    { name: 'Brunei', iso2: 'BN', dialCode: '673' },
    { name: 'Bulgaria', iso2: 'BG', dialCode: '359' },
    { name: 'Burkina Faso', iso2: 'BF', dialCode: '226' },
    { name: 'Burundi', iso2: 'BI', dialCode: '257' },
    { name: 'Cambodia', iso2: 'KH', dialCode: '855' },
    { name: 'Cameroon', iso2: 'CM', dialCode: '237' },
    { name: 'Canada', iso2: 'CA', dialCode: '1' },
    { name: 'Cape Verde', iso2: 'CV', dialCode: '238' },
    { name: 'Central African Republic', iso2: 'CF', dialCode: '236' },
    { name: 'Chad', iso2: 'TD', dialCode: '235' },
    { name: 'Chile', iso2: 'CL', dialCode: '56' },
    { name: 'China', iso2: 'CN', dialCode: '86' },
    { name: 'Colombia', iso2: 'CO', dialCode: '57' },
    { name: 'Comoros', iso2: 'KM', dialCode: '269' },
    { name: 'Congo', iso2: 'CG', dialCode: '242' },
    { name: 'Costa Rica', iso2: 'CR', dialCode: '506' },
    { name: 'Croatia', iso2: 'HR', dialCode: '385' },
    { name: 'Cuba', iso2: 'CU', dialCode: '53' },
    { name: 'Cyprus', iso2: 'CY', dialCode: '357' },
    { name: 'Czech Republic', iso2: 'CZ', dialCode: '420' },
    { name: 'Denmark', iso2: 'DK', dialCode: '45' },
    { name: 'Djibouti', iso2: 'DJ', dialCode: '253' },
    { name: 'Dominican Republic', iso2: 'DO', dialCode: '1809' },
    { name: 'Ecuador', iso2: 'EC', dialCode: '593' },
    { name: 'Egypt', iso2: 'EG', dialCode: '20' },
    { name: 'El Salvador', iso2: 'SV', dialCode: '503' },
    { name: 'Equatorial Guinea', iso2: 'GQ', dialCode: '240' },
    { name: 'Eritrea', iso2: 'ER', dialCode: '291' },
    { name: 'Estonia', iso2: 'EE', dialCode: '372' },
    { name: 'Ethiopia', iso2: 'ET', dialCode: '251' },
    { name: 'Fiji', iso2: 'FJ', dialCode: '679' },
    { name: 'Finland', iso2: 'FI', dialCode: '358' },
    { name: 'France', iso2: 'FR', dialCode: '33' },
    { name: 'Gabon', iso2: 'GA', dialCode: '241' },
    { name: 'Gambia', iso2: 'GM', dialCode: '220' },
    { name: 'Georgia', iso2: 'GE', dialCode: '995' },
    { name: 'Germany', iso2: 'DE', dialCode: '49' },
    { name: 'Ghana', iso2: 'GH', dialCode: '233' },
    { name: 'Greece', iso2: 'GR', dialCode: '30' },
    { name: 'Guatemala', iso2: 'GT', dialCode: '502' },
    { name: 'Guinea', iso2: 'GN', dialCode: '224' },
    { name: 'Guinea-Bissau', iso2: 'GW', dialCode: '245' },
    { name: 'Guyana', iso2: 'GY', dialCode: '592' },
    { name: 'Haiti', iso2: 'HT', dialCode: '509' },
    { name: 'Honduras', iso2: 'HN', dialCode: '504' },
    { name: 'Hungary', iso2: 'HU', dialCode: '36' },
    { name: 'Iceland', iso2: 'IS', dialCode: '354' },
    { name: 'India', iso2: 'IN', dialCode: '91' },
    { name: 'Indonesia', iso2: 'ID', dialCode: '62' },
    { name: 'Iran', iso2: 'IR', dialCode: '98' },
    { name: 'Iraq', iso2: 'IQ', dialCode: '964' },
    { name: 'Ireland', iso2: 'IE', dialCode: '353' },
    { name: 'Israel', iso2: 'IL', dialCode: '972' },
    { name: 'Italy', iso2: 'IT', dialCode: '39' },
    { name: 'Jamaica', iso2: 'JM', dialCode: '1876' },
    { name: 'Japan', iso2: 'JP', dialCode: '81' },
    { name: 'Jordan', iso2: 'JO', dialCode: '962' },
    { name: 'Kazakhstan', iso2: 'KZ', dialCode: '7' },
    { name: 'Kenya', iso2: 'KE', dialCode: '254' },
    { name: 'Kuwait', iso2: 'KW', dialCode: '965' },
    { name: 'Kyrgyzstan', iso2: 'KG', dialCode: '996' },
    { name: 'Laos', iso2: 'LA', dialCode: '856' },
    { name: 'Latvia', iso2: 'LV', dialCode: '371' },
    { name: 'Lebanon', iso2: 'LB', dialCode: '961' },
    { name: 'Lesotho', iso2: 'LS', dialCode: '266' },
    { name: 'Liberia', iso2: 'LR', dialCode: '231' },
    { name: 'Libya', iso2: 'LY', dialCode: '218' },
    { name: 'Liechtenstein', iso2: 'LI', dialCode: '423' },
    { name: 'Lithuania', iso2: 'LT', dialCode: '370' },
    { name: 'Luxembourg', iso2: 'LU', dialCode: '352' },
    { name: 'Madagascar', iso2: 'MG', dialCode: '261' },
    { name: 'Malawi', iso2: 'MW', dialCode: '265' },
    { name: 'Malaysia', iso2: 'MY', dialCode: '60' },
    { name: 'Maldives', iso2: 'MV', dialCode: '960' },
    { name: 'Mali', iso2: 'ML', dialCode: '223' },
    { name: 'Malta', iso2: 'MT', dialCode: '356' },
    { name: 'Mauritania', iso2: 'MR', dialCode: '222' },
    { name: 'Mauritius', iso2: 'MU', dialCode: '230' },
    { name: 'Mexico', iso2: 'MX', dialCode: '52' },
    { name: 'Moldova', iso2: 'MD', dialCode: '373' },
    { name: 'Monaco', iso2: 'MC', dialCode: '377' },
    { name: 'Mongolia', iso2: 'MN', dialCode: '976' },
    { name: 'Montenegro', iso2: 'ME', dialCode: '382' },
    { name: 'Morocco', iso2: 'MA', dialCode: '212' },
    { name: 'Mozambique', iso2: 'MZ', dialCode: '258' },
    { name: 'Myanmar', iso2: 'MM', dialCode: '95' },
    { name: 'Namibia', iso2: 'NA', dialCode: '264' },
    { name: 'Nepal', iso2: 'NP', dialCode: '977' },
    { name: 'Netherlands', iso2: 'NL', dialCode: '31' },
    { name: 'New Zealand', iso2: 'NZ', dialCode: '64' },
    { name: 'Nicaragua', iso2: 'NI', dialCode: '505' },
    { name: 'Niger', iso2: 'NE', dialCode: '227' },
    { name: 'Nigeria', iso2: 'NG', dialCode: '234' },
    { name: 'North Korea', iso2: 'KP', dialCode: '850' },
    { name: 'North Macedonia', iso2: 'MK', dialCode: '389' },
    { name: 'Norway', iso2: 'NO', dialCode: '47' },
    { name: 'Oman', iso2: 'OM', dialCode: '968' },
    { name: 'Pakistan', iso2: 'PK', dialCode: '92' },
    { name: 'Panama', iso2: 'PA', dialCode: '507' },
    { name: 'Papua New Guinea', iso2: 'PG', dialCode: '675' },
    { name: 'Paraguay', iso2: 'PY', dialCode: '595' },
    { name: 'Peru', iso2: 'PE', dialCode: '51' },
    { name: 'Philippines', iso2: 'PH', dialCode: '63' },
    { name: 'Poland', iso2: 'PL', dialCode: '48' },
    { name: 'Portugal', iso2: 'PT', dialCode: '351' },
    { name: 'Qatar', iso2: 'QA', dialCode: '974' },
    { name: 'Romania', iso2: 'RO', dialCode: '40' },
    { name: 'Russia', iso2: 'RU', dialCode: '7' },
    { name: 'Rwanda', iso2: 'RW', dialCode: '250' },
    { name: 'Saudi Arabia', iso2: 'SA', dialCode: '966' },
    { name: 'Senegal', iso2: 'SN', dialCode: '221' },
    { name: 'Serbia', iso2: 'RS', dialCode: '381' },
    { name: 'Sierra Leone', iso2: 'SL', dialCode: '232' },
    { name: 'Singapore', iso2: 'SG', dialCode: '65' },
    { name: 'Slovakia', iso2: 'SK', dialCode: '421' },
    { name: 'Slovenia', iso2: 'SI', dialCode: '386' },
    { name: 'Somalia', iso2: 'SO', dialCode: '252' },
    { name: 'South Africa', iso2: 'ZA', dialCode: '27' },
    { name: 'South Korea', iso2: 'KR', dialCode: '82' },
    { name: 'South Sudan', iso2: 'SS', dialCode: '211' },
    { name: 'Spain', iso2: 'ES', dialCode: '34' },
    { name: 'Sri Lanka', iso2: 'LK', dialCode: '94' },
    { name: 'Sudan', iso2: 'SD', dialCode: '249' },
    { name: 'Suriname', iso2: 'SR', dialCode: '597' },
    { name: 'Sweden', iso2: 'SE', dialCode: '46' },
    { name: 'Switzerland', iso2: 'CH', dialCode: '41' },
    { name: 'Syria', iso2: 'SY', dialCode: '963' },
    { name: 'Taiwan', iso2: 'TW', dialCode: '886' },
    { name: 'Tajikistan', iso2: 'TJ', dialCode: '992' },
    { name: 'Tanzania', iso2: 'TZ', dialCode: '255' },
    { name: 'Thailand', iso2: 'TH', dialCode: '66' },
    { name: 'Timor-Leste', iso2: 'TL', dialCode: '670' },
    { name: 'Togo', iso2: 'TG', dialCode: '228' },
    { name: 'Trinidad and Tobago', iso2: 'TT', dialCode: '1868' },
    { name: 'Tunisia', iso2: 'TN', dialCode: '216' },
    { name: 'Turkey', iso2: 'TR', dialCode: '90' },
    { name: 'Turkmenistan', iso2: 'TM', dialCode: '993' },
    { name: 'Uganda', iso2: 'UG', dialCode: '256' },
    { name: 'Ukraine', iso2: 'UA', dialCode: '380' },
    { name: 'United Arab Emirates', iso2: 'AE', dialCode: '971' },
    { name: 'United Kingdom', iso2: 'GB', dialCode: '44' },
    { name: 'United States', iso2: 'US', dialCode: '1' },
    { name: 'Uruguay', iso2: 'UY', dialCode: '598' },
    { name: 'Uzbekistan', iso2: 'UZ', dialCode: '998' },
    { name: 'Venezuela', iso2: 'VE', dialCode: '58' },
    { name: 'Vietnam', iso2: 'VN', dialCode: '84' },
    { name: 'Yemen', iso2: 'YE', dialCode: '967' },
    { name: 'Zambia', iso2: 'ZM', dialCode: '260' },
    { name: 'Zimbabwe', iso2: 'ZW', dialCode: '263' },
];

const DEFAULT_COUNTRY = COUNTRIES.find((c) => c.iso2 === 'US')!;

// ─── Types ────────────────────────────────────────────────────────────────────

interface Country {
    name: string;
    iso2: string;
    dialCode: string;
}

interface PhoneInputProps {
    value: string;
    onChange: (value: string) => void;
    dialCode?: string;
    onDialCodeChange?: (dialCode: string) => void;
    label?: string;
    name?: string;
    required?: boolean;
    error?: boolean;
    helperText?: React.ReactNode;
    disabled?: boolean;
    size?: 'small' | 'medium';
    fullWidth?: boolean;
    placeholder?: string;
    onBlur?: () => void;
    inputProps?: React.InputHTMLAttributes<HTMLInputElement>;
    InputLabelProps?: object;
}

import { useSettings } from '../context/SettingsContext';
import { validatePhone } from '../utils/validation';

// ─── Component ────────────────────────────────────────────────────────────────

const PhoneInput: React.FC<PhoneInputProps> = ({
    value,
    onChange,
    dialCode,
    onDialCodeChange,
    label = 'Phone Number',
    name,
    required = false,
    error = false,
    helperText,
    disabled = false,
    size = 'medium',
    fullWidth = true,
    placeholder = 'Enter phone number',
    onBlur,
    inputProps,
    InputLabelProps,
}) => {
    const { defaultDialCode } = useSettings();
    const effectiveDialCode = dialCode || defaultDialCode || '1';

    // Live validation evaluation as user types
    const liveValidation = useMemo(() => {
        const rawDigits = String(value || '').replace(/\D/g, '');
        if (!rawDigits || rawDigits.trim() === '') {
            return { isValid: true };
        }
        return validatePhone(rawDigits, effectiveDialCode);
    }, [value, effectiveDialCode]);

    const isInvalidLive = Boolean(value && String(value).trim().length > 0 && !liveValidation.isValid);
    const hasError = Boolean(error) || isInvalidLive;
    const effectiveHelperText = isInvalidLive ? liveValidation.message : (helperText || '');

    // Format phone numbers dynamically
    const formatPhone = (val: string, dCode: string) => {
        const digits = String(val || '').replace(/\D/g, '');
        if (dCode === '1') {
            const localDigits = digits.slice(0, 10);
            if (localDigits.length <= 3) {
                return localDigits ? `(${localDigits}` : '';
            }
            if (localDigits.length <= 6) {
                return `(${localDigits.slice(0, 3)}) ${localDigits.slice(3)}`;
            }
            return `(${localDigits.slice(0, 3)}) ${localDigits.slice(3, 6)}-${localDigits.slice(6)}`;
        }
        return digits.slice(0, 15);
    };

    const displayValue = effectiveDialCode === '1' ? formatPhone(value, effectiveDialCode) : value.replace(/\D/g, '').slice(0, 15);

    const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);
    const [search, setSearch] = useState('');
    const searchRef = useRef<HTMLInputElement>(null);

    const selectedCountry: Country =
        COUNTRIES.find((c) => c.dialCode === effectiveDialCode && c.iso2 === 'US') ??
        COUNTRIES.find((c) => c.dialCode === effectiveDialCode) ??
        DEFAULT_COUNTRY;

    const filtered = useMemo(() => {
        const q = search?.toLowerCase().trim();
        if (!q) {
            // Show USA first, then India, then rest of countries
            const usaCountry = COUNTRIES.filter(c => c.iso2 === 'US');
            const indiaCountry = COUNTRIES.filter(c => c.iso2 === 'IN');
            const otherCountries = COUNTRIES.filter(c => c.iso2 !== 'US' && c.iso2 !== 'IN');
            return [...usaCountry, ...indiaCountry, ...otherCountries];
        }
        return COUNTRIES.filter(
            (c) =>
                c.name?.toLowerCase().includes(q) ||
                c.dialCode.includes(q) ||
                c.iso2?.toLowerCase().includes(q)
        );
    }, [search]);

    const handleOpen = (e: React.MouseEvent<HTMLElement>) => {
        if (disabled) return;
        setAnchorEl(e.currentTarget);
        setSearch('');
        setTimeout(() => searchRef.current?.focus(), 50);
    };

    const handleClose = () => {
        setAnchorEl(null);
        setSearch('');
    };

    const handleSelect = (country: Country) => {
        onDialCodeChange?.(country.dialCode);
        handleClose();
    };

    const open = Boolean(anchorEl);

    return (
        <>
            <TextField
                fullWidth={fullWidth}
                label={label}
                name={name}
                value={displayValue}
                onChange={(e) => {
                    const raw = e.target.value.replace(/\D/g, '');
                    onChange(raw);
                }}
                required={required}
                error={hasError}
                helperText={effectiveHelperText}
                disabled={disabled}
                size={size}
                placeholder={placeholder}
                onBlur={onBlur}
                inputProps={{
                    inputMode: 'tel',
                    maxLength: effectiveDialCode === '1' ? 14 : 15, // 14 allows (XXX) XXX-XXXX format
                    ...inputProps,
                }}
                InputLabelProps={{
                    sx: {
                        '& .MuiFormLabel-asterisk': {
                            color: 'error.main',
                        },
                    },
                    ...InputLabelProps,
                }}
                InputProps={{
                    startAdornment: (
                        <InputAdornment position="start" sx={{ mr: 0 }}>
                            <Button
                                onClick={handleOpen}
                                disabled={disabled}
                                size="small"
                                sx={{
                                    minWidth: 'unset',
                                    px: 1,
                                    py: 0.5,
                                    mr: 1,
                                    color: 'text.primary',
                                    fontWeight: 600,
                                    fontSize: size === 'small' ? 13 : 14,
                                    textTransform: 'none',
                                    border: '1px solid',
                                    borderColor: 'divider',
                                    borderRadius: '6px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '6px',
                                    bgcolor: 'background.paper',
                                    '&:hover': { bgcolor: 'action.hover' },
                                }}
                            >
                                {/* Real flag image — works on Windows & all platforms */}
                                <FlagImg iso2={selectedCountry.iso2} size={size === 'small' ? 18 : 22} />
                                <Box component="span">+{selectedCountry.dialCode}</Box>



                                {/* Chevron */}
                                <KeyboardArrowDownIcon
                                    sx={{
                                        fontSize: 14,
                                        transform: open ? 'rotate(180deg)' : 'none',
                                        transition: 'transform 0.2s',
                                    }}
                                />
                            </Button>
                        </InputAdornment>
                    ),
                }}
            />

            {/* Dropdown Popover */}
            <Popover
                open={open}
                anchorEl={anchorEl}
                onClose={handleClose}
                anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
                transformOrigin={{ vertical: 'top', horizontal: 'left' }}
                PaperProps={{
                    sx: {
                        width: 300,
                        maxHeight: 380,
                        display: 'flex',
                        flexDirection: 'column',
                        borderRadius: 2,
                        boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
                        overflow: 'hidden',
                    },
                }}
            >
                {/* Search */}
                <Box sx={{ p: 1.5, borderBottom: '1px solid', borderColor: 'divider' }}>
                    <TextField
                        inputRef={searchRef}
                        fullWidth
                        size="small"
                        placeholder="Search by code or ISO (e.g. 91, IN)..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        autoComplete="off"
                    />
                </Box>

                {/* List */}
                <List dense disablePadding sx={{ overflowY: 'auto', flex: 1 }}>
                    {filtered.length === 0 ? (
                        <Box sx={{ p: 2, textAlign: 'center' }}>
                            <Typography variant="body2" color="text.secondary">
                                No results
                            </Typography>
                        </Box>
                    ) : (
                        filtered.map((country, index) => {
                            const isSearching = search.trim() !== '';
                            const shouldShowDivider = !isSearching && index === 1; // After USA and India
                            
                            return (
                                <React.Fragment key={`${country.iso2}-${country.dialCode}`}>
                                    <ListItemButton
                                        selected={
                                            country.dialCode === selectedCountry.dialCode &&
                                            country.iso2 === selectedCountry.iso2
                                        }
                                        onClick={() => handleSelect(country)}
                                        sx={{
                                            py: 0.75,
                                            px: 1.5,
                                            gap: 1.5,
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'flex-start',
                                            '&.Mui-selected': { bgcolor: 'action.selected' },
                                        }}
                                    >
                                        {/* Flag image in dropdown */}
                                        <FlagImg iso2={country.iso2} size={22} />

                                        <Typography variant="body2" sx={{ fontWeight: 600 }}>
                                            +{country.dialCode}
                                        </Typography>
                                    </ListItemButton>
                                    {shouldShowDivider && (
                                    <Divider 
                                        sx={{ 
                                            my: 1,
                                            mx: 1.5,
                                            borderColor: 'grey.300'
                                        }} 
                                    />
                                )}
                                </React.Fragment>
                            );
                        })
                    )}
                </List>
            </Popover>
        </>
    );
};

export default PhoneInput;
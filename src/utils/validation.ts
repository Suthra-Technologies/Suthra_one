// Form validation utilities for the entire application

export interface ValidationResult {
    isValid: boolean;
    message?: string;
}

// Email validation. Pass required=false for optional fields (empty passes).
export const validateEmail = (email: string, required: boolean = true): ValidationResult => {
    const trimmed = (email || '').trim();
    if (trimmed === '') {
        return required
            ? { isValid: false, message: 'Email is required' }
            : { isValid: true };
    }

    // RFC 5321 practical limits: 254 total, 64 before the @, 63 per domain label
    if (trimmed.length > 254) {
        return { isValid: false, message: 'Email is too long (max 254 characters)' };
    }

    const atIndex = trimmed.lastIndexOf('@');
    const localPart = atIndex > -1 ? trimmed.slice(0, atIndex) : trimmed;
    if (localPart.length > 64) {
        return { isValid: false, message: 'Email is too long before the @ (max 64 characters)' };
    }
    if (localPart.startsWith('.') || localPart.endsWith('.') || localPart.includes('..')) {
        return { isValid: false, message: 'Please enter a valid email address' };
    }

    // Domain: labels of 1-63 alphanumeric/hyphen chars (no leading/trailing hyphen),
    // ending in an alphabetic TLD of 2-24 chars
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*\.[a-zA-Z]{2,24}$/;
    if (!emailRegex.test(trimmed)) {
        return { isValid: false, message: 'Please enter a valid email address' };
    }

    return { isValid: true };
};

// Format a stored phone number consistently for display, regardless of how it
// was captured (POS stores "+14654654564", online orders store "(203) 456-7890").
export const formatPhoneDisplay = (phone?: string | number | null): string => {
    const raw = String(phone ?? '').trim();
    if (!raw) return '';

    const hasPlus = raw.startsWith('+');
    const digits = raw.replace(/\D/g, '');
    if (!digits) return raw;

    // US/Canada: local 10 digits, or 11 digits with leading 1
    if (digits.length === 10 && !hasPlus) {
        return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
    }
    if (digits.length === 11 && digits.startsWith('1')) {
        return `+1 (${digits.slice(1, 4)}) ${digits.slice(4, 7)}-${digits.slice(7)}`;
    }

    // India: 12 digits with leading 91 → +91 XXXXX XXXXX
    if (digits.length === 12 && digits.startsWith('91')) {
        return `+91 ${digits.slice(2, 7)} ${digits.slice(7)}`;
    }

    // Other international numbers: keep the dial code visible
    return hasPlus ? `+${digits}` : raw;
};

// Phone number validation
export const validatePhone = (phone: string | number, dialCode?: string): ValidationResult => {
    const phoneStr = String(phone || '');
    if (!phoneStr || phoneStr.trim() === '') {
        return { isValid: false, message: 'Phone number is required' };
    }

    // Keep only digits
    const digits = String(phone).replace(/\D/g, '');

    // By default, if dialCode is '1' or not provided, enforce strict US validation.
    // If it's explicitly something else, allow 7-15 digits.
    if (!dialCode || dialCode === '1' || dialCode === '+1') {
        if (digits.length !== 10) {
            return { isValid: false, message: 'Please enter a valid phone number' };
        }
        if (digits[0] === '0' || digits[0] === '1') {
            return { isValid: false, message: 'Please enter a valid phone number' };
        }
        if (digits[3] === '0' || digits[3] === '1') {
            return { isValid: false, message: 'Please enter a valid phone number' };
        }
        return { isValid: true };
    }

    // Generic international validation
    if (digits.length < 7 || digits.length > 15) {
        return { isValid: false, message: 'Please enter a valid phone number (7-15 digits)' };
    }

    return { isValid: true };
};

// Name validation (first name, last name, etc.)
export const validateName = (name: string, fieldName: string = 'Name'): ValidationResult => {
    if (!name || name.trim() === '') {
        return { isValid: false, message: `${fieldName} is required` };
    }

    if (name.trim().length < 2) {
        return { isValid: false, message: `${fieldName} must be at least 2 characters` };
    }

    if (name.trim().length > 50) {
        return { isValid: false, message: `${fieldName} must not exceed 50 characters` };
    }

    // Allow letters, spaces, hyphens, and apostrophes
    const nameRegex = /^[a-zA-Z\s'-]+$/;
    if (!nameRegex.test(name.trim())) {
        return { isValid: false, message: `${fieldName} can only contain letters, spaces, hyphens, and apostrophes` };
    }

    return { isValid: true };
};

// Password validation
export const validatePassword = (password: string): ValidationResult => {
    if (!password || password.trim() === '') {
        return { isValid: false, message: 'Password is required' };
    }

    if (password.length < 8) {
        return { isValid: false, message: 'Password must be at least 8 characters long' };
    }

    if (password.length > 128) {
        return { isValid: false, message: 'Password must not exceed 128 characters' };
    }

    if (!/[A-Z]/.test(password)) {
        return { isValid: false, message: 'Password must contain at least one uppercase letter' };
    }

    if (!/[a-z]/.test(password)) {
        return { isValid: false, message: 'Password must contain at least one lowercase letter' };
    }

    if (!/\d/.test(password)) {
        return { isValid: false, message: 'Password must contain at least one number' };
    }

    if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
        return { isValid: false, message: 'Password must contain at least one special character' };
    }

    return { isValid: true };
};

// Username validation
export const validateUsername = (username: string): ValidationResult => {
    if (!username || username.trim() === '') {
        return { isValid: false, message: 'Username is required' };
    }

    if (username.trim().length < 3) {
        return { isValid: false, message: 'Username must be at least 3 characters' };
    }

    if (username.trim().length > 30) {
        return { isValid: false, message: 'Username must not exceed 30 characters' };
    }

    // Allow letters, numbers, underscores, and hyphens
    const usernameRegex = /^[a-zA-Z0-9_-]+$/;
    if (!usernameRegex.test(username.trim())) {
        return { isValid: false, message: 'Username can only contain letters, numbers, underscores, and hyphens' };
    }

    return { isValid: true };
};

// Restaurant/Company name validation
export const validateCompanyName = (name: string): ValidationResult => {
    if (!name || name.trim() === '') {
        return { isValid: false, message: 'Restaurant name is required' };
    }

    if (name.trim().length < 2) {
        return { isValid: false, message: 'Restaurant name must be at least 2 characters' };
    }

    if (name.trim().length > 100) {
        return { isValid: false, message: 'Restaurant name must not exceed 100 characters' };
    }

    return { isValid: true };
};

// Address validation
export const validateAddress = (address: string): ValidationResult => {
    if (!address || address.trim() === '') {
        return { isValid: false, message: 'Address is required' };
    }

    if (address.trim().length < 5) {
        return { isValid: false, message: 'Please enter a complete address (at least 5 characters)' };
    }

    if (address.trim().length > 200) {
        return { isValid: false, message: 'Address must not exceed 200 characters' };
    }

    return { isValid: true };
};

// Number validation (for quantities, prices, etc.)
export const validateNumber = (value: number | string, fieldName: string = 'Value', min: number = 0, max?: number): ValidationResult => {
    const numValue = typeof value === 'string' ? parseFloat(value) : value;

    if (isNaN(numValue)) {
        return { isValid: false, message: `${fieldName} must be a valid number` };
    }

    if (numValue < min) {
        return { isValid: false, message: `${fieldName} must be at least ${min}` };
    }

    if (max !== undefined && numValue > max) {
        return { isValid: false, message: `${fieldName} must not exceed ${max}` };
    }

    return { isValid: true };
};

// SKU/Code validation
export const validateSKU = (sku: string): ValidationResult => {
    if (!sku || sku.trim() === '') {
        return { isValid: false, message: 'SKU is required' };
    }

    if (sku.trim().length < 2) {
        return { isValid: false, message: 'SKU must be at least 2 characters' };
    }

    if (sku.trim().length > 50) {
        return { isValid: false, message: 'SKU must not exceed 50 characters' };
    }

    // Allow letters, numbers, hyphens, and underscores
    const skuRegex = /^[a-zA-Z0-9_-]+$/;
    if (!skuRegex.test(sku.trim())) {
        return { isValid: false, message: 'SKU can only contain letters, numbers, hyphens, and underscores' };
    }

    return { isValid: true };
};

// Generic required field validation
export const validateRequired = (value: any, fieldName: string = 'This field'): ValidationResult => {
    if (value === null || value === undefined || (typeof value === 'string' && value.trim() === '')) {
        return { isValid: false, message: `${fieldName} is required` };
    }

    return { isValid: true };
};

// URL validation
export const validateURL = (url: string): ValidationResult => {
    if (!url || url.trim() === '') {
        return { isValid: true }; // Optional field
    }

    try {
        new URL(url);
        return { isValid: true };
    } catch {
        return { isValid: false, message: 'Please enter a valid URL' };
    }
};

// Helper function to get error helper text
export const getHelperText = (validationResult: ValidationResult | undefined): string => {
    return validationResult && !validationResult.isValid ? validationResult.message || '' : '';
};

// Helper function to check if field has error
export const hasError = (validationResult: ValidationResult | undefined): boolean => {
    return validationResult !== undefined && !validationResult.isValid;
};

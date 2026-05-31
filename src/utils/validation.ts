// Form validation utilities for the entire application

export interface ValidationResult {
    isValid: boolean;
    message?: string;
}

// Email validation
export const validateEmail = (email: string): ValidationResult => {
    if (!email || email.trim() === '') {
        return { isValid: false, message: 'Email is required' };
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
        return { isValid: false, message: 'Please enter a valid email address' };
    }

    return { isValid: true };
};

// Phone number validation (Indian format)
export const validatePhone = (phone: string): ValidationResult => {
    if (!phone || phone.trim() === '') {
        return { isValid: false, message: 'Phone number is required' };
    }

    // Keep only digits
    const digits = phone.replace(/\D/g, '');

    if (digits.length !== 10) {
        return { isValid: false, message: 'Please enter exactly 10 digits' };
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

    if (password.length < 6) {
        return { isValid: false, message: 'Password must be at least 6 characters long' };
    }

    if (password.length > 128) {
        return { isValid: false, message: 'Password must not exceed 128 characters' };
    }

    // Optional: Check for at least one number and one letter
    // if (!/\d/.test(password) || !/[a-zA-Z]/.test(password)) {
    //   return { isValid: false, message: 'Password must contain both letters and numbers' };
    // }

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
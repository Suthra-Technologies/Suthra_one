/**
 * Utility functions for sanitizing input strings based on input type.
 */
import { validateEmail as validateEmailStrict } from './validation';

export type InputType = 'name' | 'alphanumeric' | 'code' | 'phone' | 'email' | 'number' | 'textarea' | 'text' | 'password';

export const sanitizeName = (value: string): string => {
  if (!value) return '';
  // Allow only alphabets and spaces
  let sanitized = value.replace(/[^a-zA-Z\s]/g, '');
  // Trim leading spaces
  sanitized = sanitized.replace(/^\s+/g, '');
  // Replace multiple spaces with a single space
  sanitized = sanitized.replace(/\s{2,}/g, ' ');
  return sanitized;
};

export const sanitizeAlphanumeric = (value: string): string => {
  if (!value) return '';
  // Allow alphabets, numbers, and spaces
  let sanitized = value.replace(/[^a-zA-Z0-9\s]/g, '');
  sanitized = sanitized.replace(/^\s+/g, '');
  sanitized = sanitized.replace(/\s{2,}/g, ' ');
  return sanitized;
};

export const sanitizeCode = (value: string): string => {
  if (!value) return '';
  // Strictly allow ONLY alphabets and numbers (no spaces, no symbols)
  return value.replace(/[^a-zA-Z0-9]/g, '');
};

export const sanitizePhone = (value: string): string => {
  if (!value) return '';
  // Allow only digits, max 10 digits
  const sanitized = value.replace(/\D/g, '').slice(0, 10);
  return sanitized;
};

export const sanitizeEmail = (value: string): string => {
  if (!value) return '';
  // Auto convert to lowercase, remove all spaces
  return value?.toLowerCase().replace(/\s/g, '');
};

export const sanitizeNumber = (value: string, allowDecimals: boolean = true): string => {
  if (!value) return '';
  // Remove anything that's not a digit or decimal point
  let sanitized = value.replace(allowDecimals ? /[^0-9.]/g : /[^0-9]/g, '');
  
  if (allowDecimals) {
    // Prevent multiple decimal points
    const parts = sanitized.split('.');
    if (parts.length > 2) {
      sanitized = parts[0] + '.' + parts.slice(1).join('');
    }
  }
  return sanitized;
};

export const sanitizeTextarea = (value: string): string => {
  if (!value) return '';
  // Basic pass-through for textarea, but can be expanded to filter dangerous characters if needed
  return value;
};

/**
 * Main switch to apply sanitization based on the input type.
 */
export const applySanitization = (
  value: string, 
  type: InputType, 
  allowDecimals: boolean = true, 
  customRegex?: RegExp
): string => {
  // Optional regex override support
  if (customRegex) {
    return value.replace(customRegex, '');
  }

  switch (type) {
    case 'name':
      return sanitizeName(value);
    case 'alphanumeric':
      return sanitizeAlphanumeric(value);
    case 'code':
      return sanitizeCode(value);
    case 'phone':
      return sanitizePhone(value);
    case 'email':
      return sanitizeEmail(value);
    case 'number':
      return sanitizeNumber(value, allowDecimals);
    case 'textarea':
      return sanitizeTextarea(value);
    default:
      return value;
  }
};

/**
 * Validates if the email is in a valid format.
 * Delegates to the shared validator (RFC length limits included).
 */
export const validateEmail = (email: string): boolean => {
  return validateEmailStrict(email).isValid;
};

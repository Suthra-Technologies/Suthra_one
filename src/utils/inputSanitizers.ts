/**
 * Utility functions for sanitizing input strings based on input type.
 */

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

export const getPhoneMaxLength = (dialCode?: string): number => {
  const code = dialCode?.replace(/\D/g, '') || '1';
  return (code === '1' || code === '91') ? 10 : 15;
};

export const sanitizePhone = (value: string, dialCode?: string): string => {
  if (!value) return '';
  let sanitized = value.replace(/\D/g, '');
  const code = dialCode?.replace(/\D/g, '') || '1';
  
  if (code === '1' && sanitized.startsWith('1') && sanitized.length > 10) {
      sanitized = sanitized.substring(1);
  }
  
  const limit = getPhoneMaxLength(dialCode);
  return sanitized.slice(0, limit);
};

export const formatPhoneForInput = (value: string, dialCode?: string): string => {
  let cleaned = value.replace(/\D/g, '');
  const code = dialCode?.replace(/\D/g, '') || '1';
  if (code === '1') {
      if (cleaned.startsWith('1') && cleaned.length > 10) {
          cleaned = cleaned.substring(1);
      }
      cleaned = cleaned.slice(0, 10);
      if (cleaned.length === 0) return '';
      if (cleaned.length <= 3) return `(${cleaned}`;
      if (cleaned.length <= 6) return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3)}`;
      return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6, 10)}`;
  }
  return cleaned.slice(0, 15);
};

export const formatDisplayPhone = (phone?: string): string => {
    if (!phone) return '';
    let p = phone.trim();
    // remove duplicate +1 combinations
    p = p.replace(/^(\+1\s*){2,}/, '+1 ');
    p = p.replace(/^(\+1)(\+1)+/, '+1');
    p = p.replace(/^\+1\s*1(\d{10})$/, '+1 $1');
    p = p.replace(/^1(\d{10})$/, '+1 $1');
    p = p.replace(/^\+1(\d{10})$/, '+1 $1');

    // format as +1 (555) 123-4567 if it's a 10 digit number with/without +1
    const match = p.match(/^\+1\s*(\d{3})(\d{3})(\d{4})$/);
    if (match) return `+1 (${match[1]}) ${match[2]}-${match[3]}`;
    
    const matchNoCode = p.match(/^(\d{3})(\d{3})(\d{4})$/);
    if (matchNoCode) return `(${matchNoCode[1]}) ${matchNoCode[2]}-${matchNoCode[3]}`;
    
    return p;
};


export const sanitizeEmail = (value: string): string => {
  if (!value) return '';
  // Auto convert to lowercase, remove all spaces
  return value.toLowerCase().replace(/\s/g, '');
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
 */
export const validateEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

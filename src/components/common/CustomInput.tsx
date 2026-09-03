import React, { useState } from 'react';
import { TextField } from '@mui/material';
import type { TextFieldProps } from '@mui/material';
import { applySanitization, validateEmail } from '../../utils/inputSanitizers';
import { validatePhone } from '../../utils/validation';
import type { InputType } from '../../utils/inputSanitizers';

export type CustomInputProps = Omit<TextFieldProps, 'type' | 'onChange'> & {
  type?: InputType;
  onChange?: (value: string, e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void;
  allowDecimals?: boolean;
  customRegex?: RegExp;
  maxLength?: number;
  showCounter?: boolean;
};

const CustomInput: React.FC<CustomInputProps> = ({
  type = 'text',
  onChange,
  onPaste,
  onBlur,
  allowDecimals = true,
  customRegex,
  maxLength,
  showCounter = false,
  value,
  error,
  helperText,
  ...rest
}) => {
  const [internalError, setInternalError] = useState<string>('');

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    let rawValue = e.target.value;
    
    // 1. Apply max length restriction directly at the input level
    if (maxLength && rawValue.length > maxLength) {
      rawValue = rawValue.slice(0, maxLength);
    }

    // 2. Apply strict sanitization (prevents invalid typing)
    const sanitizedValue = applySanitization(rawValue, type, allowDecimals, customRegex);
    
    // Fix: Force the DOM node to instantly reflect the sanitized value.
    if (e.target.value !== sanitizedValue) {
        e.target.value = sanitizedValue;
    }

    // 3. Fire custom onChange event passing the clean string
    if (onChange) {
      onChange(sanitizedValue, e);
    }
    
    // 4. Perform real-time validation on typing for phone
    if (type === 'phone') {
      if (sanitizedValue && sanitizedValue.trim().length > 0) {
        const res = validatePhone(sanitizedValue);
        setInternalError(res.isValid ? '' : (res.message || 'Please enter a valid phone number'));
      } else {
        setInternalError('');
      }
    } else if (internalError) {
      setInternalError('');
    }
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLDivElement>) => {
    const pastedText = e.clipboardData.getData('text');
    const sanitizedPasted = applySanitization(pastedText, type, allowDecimals, customRegex);
    if (onPaste) onPaste(e);
  };

  const handleBlur = (e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    // Perform blur-time validations
    if (type === 'email' && e.target.value) {
      if (!validateEmail(e.target.value)) {
        setInternalError('Please enter a valid email address');
      } else {
        setInternalError('');
      }
    } else if (type === 'phone' && e.target.value) {
      const res = validatePhone(e.target.value);
      setInternalError(res.isValid ? '' : (res.message || 'Please enter a valid phone number'));
    } else if (type === 'name' && e.target.value) {
        // Automatically trim trailing spaces on blur for names
        const trimmed = e.target.value.trim();
        if (trimmed !== e.target.value && onChange) {
            e.target.value = trimmed;
            onChange(trimmed, e);
        }
    }

    if (onBlur) onBlur(e);
  };

  // Determine standard properties based on type
  const isTextarea = type === 'textarea';
  const displayError = Boolean(error) || Boolean(internalError);
  
  // Manage helper text output (supports combining validation errors and counters)
  let finalHelperText = internalError || helperText;
  
  if (showCounter && maxLength) {
      const currentLength = (value as string)?.length || 0;
      const counterText = `${currentLength}/${maxLength}`;
      if (finalHelperText) {
         // If there is an error, show both error and counter (optional formatting)
         finalHelperText = <span style={{ display: 'flex', justifyContent: 'space-between', width: '100%' }}><span>{finalHelperText}</span><span>{counterText}</span></span>;
      } else {
         finalHelperText = counterText;
      }
  }

  // Determine proper HTML type to pass down to TextField
  let htmlType = 'text';
  if (type === 'password') htmlType = 'password';
  if (type === 'email') htmlType = 'email';
  // We keep 'number' as 'text' to ensure we can sanitize natively without the browser hiding invalid chars.

  // Determine input modes for better mobile keyboard experiences
  let mobileInputMode: "text" | "none" | "tel" | "url" | "email" | "numeric" | "decimal" | "search" | undefined = undefined;
  if (type === 'number') {
    mobileInputMode = allowDecimals ? 'decimal' : 'numeric';
  } else if (type === 'phone') {
    mobileInputMode = 'tel';
  } else if (type === 'email') {
    mobileInputMode = 'email';
  }

  return (
    <TextField
      {...rest}
      type={htmlType}
      value={value}
      onChange={handleChange}
      onPaste={handlePaste}
      onBlur={handleBlur}
      error={displayError}
      helperText={finalHelperText}
      multiline={isTextarea || rest.multiline}
      FormHelperTextProps={
         (showCounter && maxLength && !internalError && !helperText) 
            ? { sx: { textAlign: 'right', ...rest.FormHelperTextProps?.sx } } 
            : rest.FormHelperTextProps
      }
      inputProps={{
        inputMode: mobileInputMode,
        ...rest.inputProps,
        maxLength: maxLength,
      }}
    />
  );
};

export default CustomInput;

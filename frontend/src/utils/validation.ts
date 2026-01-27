/**
 * Validation utility functions
 */

/**
 * Email validation regex
 */
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Username validation regex (alphanumeric, underscore, dash, 3-20 chars)
 */
const USERNAME_REGEX = /^[a-zA-Z0-9_-]{3,20}$/;

/**
 * Password validation regex (at least 8 chars, 1 uppercase, 1 lowercase, 1 number)
 */
const PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[a-zA-Z\d@$!%*?&]{8,}$/;

/**
 * Validate email address
 */
export const isValidEmail = (email: unknown): boolean => {
  if (typeof email !== 'string') return false;
  return EMAIL_REGEX.test(email.trim());
};

/**
 * Validate username
 */
export const isValidUsername = (username: unknown): boolean => {
  if (typeof username !== 'string') return false;
  return USERNAME_REGEX.test(username.trim());
};

/**
 * Validate password strength
 */
export const isValidPassword = (password: unknown): boolean => {
  if (typeof password !== 'string') return false;
  return PASSWORD_REGEX.test(password);
};

/**
 * Get password strength score (0-4)
 */
export const getPasswordStrength = (password: string | null | undefined): number => {
  if (!password) return 0;

  let score = 0;

  if (password.length >= 8) score++;
  if (password.length >= 12) score++;

  if (/[a-z]/.test(password)) score++;
  if (/[A-Z]/.test(password)) score++;
  if (/\d/.test(password)) score++;
  if (/[@$!%*?&]/.test(password)) score++;

  return Math.min(score, 4);
};

/**
 * Validate required field
 */
export const isRequired = (value: any): boolean => {
  if (value == null) return false;
  if (typeof value === 'string') return value.trim().length > 0;
  if (Array.isArray(value)) return value.length > 0;
  return true;
};

/**
 * Validate minimum length
 */
export const hasMinLength = (value: unknown, minLength: number): boolean => {
  if (typeof value !== 'string') return false;
  return value.trim().length >= minLength;
};

/**
 * Validate maximum length
 */
export const hasMaxLength = (value: unknown, maxLength: number): boolean => {
  if (typeof value !== 'string') return true; // Пустые строки разрешены
  return value.trim().length <= maxLength;
};

/**
 * Validate numeric value
 */
export const isNumeric = (value: unknown): boolean => {
  if (value == null || value === '') return false;
  return !isNaN(Number(value)) && !isNaN(parseFloat(String(value)));
};

/**
 * Validate integer value
 */
export const isInteger = (value: unknown): boolean => {
  if (!isNumeric(value)) return false;
  return Number.isInteger(Number(value));
};

/**
 * Validate value in range
 */
export const isInRange = (value: unknown, min: number, max: number): boolean => {
  if (!isNumeric(value)) return false;
  const num = Number(value);
  return num >= min && num <= max;
};

/**
 * Validate array contains value
 */
export const isInArray = <T>(value: T, allowedValues: T[]): boolean => {
  return Array.isArray(allowedValues) && allowedValues.includes(value);
};

/**
 * Validator function type
 */
export type Validator<T = any> = (value: T) => boolean | string;

/**
 * Run multiple validations and collect errors
 */
export const validateMultiple = <T>(value: T, validators: Validator<T>[]): string[] => {
  const errors: string[] = [];

  validators.forEach((validator) => {
    const result = validator(value);
    if (result !== true) {
      errors.push(typeof result === 'string' ? result : 'Validation failed');
    }
  });

  return errors;
};

/**
 * Common validation rules
 */
export const validationRules = {
  required: (value: any): string | true =>
    isRequired(value) || 'This field is required',

  email: (value: any): string | true =>
    isValidEmail(value) || 'Please enter a valid email address',

  username: (value: any): string | true =>
    isValidUsername(value) || 'Username must be 3-20 characters, letters, numbers, underscore or dash',

  password: (value: any): string | true =>
    isValidPassword(value) || 'Password must be at least 8 characters with uppercase, lowercase, and number',

  minLength: (min: number) => (value: any): string | true =>
    hasMinLength(value, min) || `Must be at least ${min} characters`,

  maxLength: (max: number) => (value: any): string | true =>
    hasMaxLength(value, max) || `Must be no more than ${max} characters`,

  numeric: (value: any): string | true =>
    isNumeric(value) || 'Must be a number',

  integer: (value: any): string | true =>
    isInteger(value) || 'Must be a whole number',

  range: (min: number, max: number) => (value: any): string | true =>
    isInRange(value, min, max) || `Must be between ${min} and ${max}`,

  inArray: <T>(allowed: T[]) => (value: T): string | true =>
    isInArray(value, allowed) || `Must be one of: ${allowed.join(', ')}`,
};

/**
 * Form errors type
 */
export type FormErrors<T> = Partial<Record<keyof T, string[]>>;

/**
 * Validate form data against rules
 */
export const validateForm = <T extends Record<string, any>>(
  formData: T,
  rules: Partial<Record<keyof T, Validator<T[keyof T]> | Validator<T[keyof T]>[]>>
): FormErrors<T> => {
  const errors: FormErrors<T> = {};

  (Object.keys(rules) as (keyof T)[]).forEach((fieldName) => {
    const value = formData[fieldName];
    const fieldRules = Array.isArray(rules[fieldName])
      ? rules[fieldName]
      : [rules[fieldName]];

    if (fieldRules) {
      const fieldErrors = validateMultiple(value, fieldRules as Validator<any>[]);
      if (fieldErrors.length > 0) {
        errors[fieldName] = fieldErrors;
      }
    }
  });

  return errors;
};

/**
 * Check if form has any errors
 */
export const hasFormErrors = <T>(errors: FormErrors<T>): boolean => {
  return Object.keys(errors).length > 0;
};

export const formatSeconds = (totalSeconds: number): string => {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
};
/**
 * Input validation helpers for Story Kids
 * Use these to validate user input before processing
 */

// Email validation regex (RFC 5322 compliant, simplified)
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Phone validation regex (international format)
const PHONE_REGEX = /^\+?[1-9]\d{6,14}$/;

export interface ValidationResult {
  valid: boolean;
  error?: string;
}

/**
 * Validate email address
 */
export function validateEmail(email: string): ValidationResult {
  if (!email || email.trim().length === 0) {
    return { valid: false, error: "Email is required" };
  }

  const trimmed = email.trim();

  if (trimmed.length > 254) {
    return { valid: false, error: "Email is too long" };
  }

  if (!EMAIL_REGEX.test(trimmed)) {
    return { valid: false, error: "Invalid email format" };
  }

  return { valid: true };
}

/**
 * Validate password strength
 */
export function validatePassword(password: string): ValidationResult {
  if (!password) {
    return { valid: false, error: "Password is required" };
  }

  if (password.length < 8) {
    return { valid: false, error: "Password must be at least 8 characters" };
  }

  if (password.length > 128) {
    return { valid: false, error: "Password is too long" };
  }

  // Optional: Uncomment for stricter password requirements
  // if (!/[A-Z]/.test(password)) {
  //   return { valid: false, error: "Password must contain at least one uppercase letter" };
  // }
  // if (!/[a-z]/.test(password)) {
  //   return { valid: false, error: "Password must contain at least one lowercase letter" };
  // }
  // if (!/[0-9]/.test(password)) {
  //   return { valid: false, error: "Password must contain at least one number" };
  // }

  return { valid: true };
}

/**
 * Validate phone number (optional field)
 */
export function validatePhone(phone: string | undefined): ValidationResult {
  if (!phone || phone.trim().length === 0) {
    // Phone is optional
    return { valid: true };
  }

  // Remove common formatting characters
  const cleaned = phone.replace(/[\s\-\(\)]/g, "");

  if (!PHONE_REGEX.test(cleaned)) {
    return { valid: false, error: "Invalid phone number format" };
  }

  return { valid: true };
}

/**
 * Validate string length
 */
export function validateStringLength(
  value: string | undefined,
  fieldName: string,
  minLength: number,
  maxLength: number
): ValidationResult {
  if (!value) {
    if (minLength > 0) {
      return { valid: false, error: `${fieldName} is required` };
    }
    return { valid: true };
  }

  const trimmed = value.trim();

  if (trimmed.length < minLength) {
    return {
      valid: false,
      error: `${fieldName} must be at least ${minLength} characters`,
    };
  }

  if (trimmed.length > maxLength) {
    return {
      valid: false,
      error: `${fieldName} must be at most ${maxLength} characters`,
    };
  }

  return { valid: true };
}

/**
 * Sanitize string input
 * - Trims whitespace
 * - Truncates to max length
 * - Optionally removes HTML tags
 */
export function sanitizeString(
  value: string,
  maxLength: number = 1000,
  stripHtml: boolean = false
): string {
  let result = value.trim();

  if (stripHtml) {
    // Remove HTML tags
    result = result.replace(/<[^>]*>/g, "");
  }

  if (result.length > maxLength) {
    result = result.substring(0, maxLength);
  }

  return result;
}

/**
 * Validate name field
 */
export function validateName(name: string | undefined): ValidationResult {
  if (!name || name.trim().length === 0) {
    // Name is optional
    return { valid: true };
  }

  return validateStringLength(name, "Name", 1, 100);
}

/**
 * Combine multiple validation results
 */
export function combineValidations(
  ...results: ValidationResult[]
): ValidationResult {
  for (const result of results) {
    if (!result.valid) {
      return result;
    }
  }
  return { valid: true };
}

/**
 * File validation, formatting, and transfer ID generation.
 */

const ALLOWED_TYPES: Record<string, string> = {
  'text/plain': '.txt',
  'image/jpeg': '.jpg',
  'image/png': '.png',
};

const MAX_FILE_SIZE = 20 * 1024 * 1024; // 20 MB

export interface FileValidationResult {
  valid: boolean;
  error?: string;
}

/** Validate file type and size before sending. */
export function validateFile(file: File): FileValidationResult {
  if (!ALLOWED_TYPES[file.type]) {
    return { valid: false, error: 'Unsupported file type.' };
  }
  if (file.size > MAX_FILE_SIZE) {
    return { valid: false, error: 'File is too large. Maximum file size is 20 MB.' };
  }
  return { valid: true };
}

/** Format bytes into a human-readable string (B, KB, MB). */
export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/** Generate a 6-digit numeric transfer ID (e.g. 582914). */
export function generateTransferId(): string {
  const digits = Math.floor(100000 + Math.random() * 900000).toString();
  return digits;
}

/** Returns the accept string for the file input element. */
export function getAcceptString(): string {
  return '.txt,.jpg,.jpeg,.png,text/plain,image/jpeg,image/png';
}

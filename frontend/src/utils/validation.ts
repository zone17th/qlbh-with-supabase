export interface ValidationResult {
  valid: boolean;
  message?: string;
}

export function required(value: unknown, message: string): ValidationResult {
  if (typeof value === "string" && value.trim().length > 0) return { valid: true };
  if (typeof value === "number" && Number.isFinite(value)) return { valid: true };
  return { valid: false, message };
}

export function minNumber(value: number, min: number, message: string): ValidationResult {
  return Number.isFinite(value) && value >= min ? { valid: true } : { valid: false, message };
}

export function positiveNumber(value: number, message: string): ValidationResult {
  return Number.isFinite(value) && value > 0 ? { valid: true } : { valid: false, message };
}

export function firstError(results: ValidationResult[]): string | null {
  return results.find((result) => !result.valid)?.message ?? null;
}

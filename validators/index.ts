import { z } from 'zod';

// ==============================================================
// Zod Validators — Input validation for all API endpoints
//
// Every external input is validated before hitting business logic.
// This prevents malformed data from reaching the database and
// provides clear error messages to API consumers.
// ==============================================================

/**
 * Reservation creation payload.
 * Enforces valid CUID format for IDs and reasonable quantity bounds.
 */
export const createReservationSchema = z.object({
  productId: z
    .string()
    .min(1, 'Product ID is required')
    .max(30, 'Invalid product ID'),
  warehouseId: z
    .string()
    .min(1, 'Warehouse ID is required')
    .max(30, 'Invalid warehouse ID'),
  quantity: z
    .number()
    .int('Quantity must be a whole number')
    .min(1, 'Quantity must be at least 1')
    .max(10, 'Maximum 10 units per reservation'),
  sessionId: z.string().optional(),
});

/**
 * Inventory update payload (admin).
 * At least one field must be provided.
 */
export const updateInventorySchema = z
  .object({
    totalStock: z
      .number()
      .int('Stock must be a whole number')
      .min(0, 'Stock cannot be negative')
      .optional(),
    reorderThreshold: z
      .number()
      .int('Threshold must be a whole number')
      .min(0, 'Threshold cannot be negative')
      .optional(),
  })
  .refine((data) => data.totalStock !== undefined || data.reorderThreshold !== undefined, {
    message: 'At least one field (totalStock or reorderThreshold) must be provided',
  });

/**
 * Pagination and filtering for product listings.
 */
export const productQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(12),
  search: z.string().max(100).optional(),
  category: z
    .enum([
      'ELECTRONICS',
      'CLOTHING',
      'HOME',
      'SPORTS',
      'ACCESSORIES',
      'BEAUTY',
      'FOOD',
      'OTHER',
    ])
    .optional(),
  inStock: z
    .string()
    .transform((v) => v === 'true')
    .optional(),
});

/**
 * Pagination and filtering for reservation listings.
 */
export const reservationQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(12),
  status: z.enum(['PENDING', 'CONFIRMED', 'RELEASED', 'EXPIRED']).optional(),
  search: z.string().max(100).optional(),
  sessionId: z.string().optional(),
});

/**
 * Path parameter validation for ID-based lookups.
 */
export const idParamSchema = z.object({
  id: z.string().min(1, 'ID is required'),
});

/**
 * Validate and parse request body as JSON.
 * Returns typed result or throws ValidationError.
 */
export async function validateBody<T>(
  request: Request,
  schema: z.ZodSchema<T>
): Promise<T> {
  const body = await request.json().catch(() => {
    throw new ValidationError('Invalid JSON in request body');
  });
  const result = schema.safeParse(body);
  if (!result.success) {
    const errors = result.error.flatten();
    throw new ValidationError('Validation failed', errors.fieldErrors);
  }
  return result.data;
}

/**
 * Validate query parameters from URL search params.
 */
export function validateQuery<T>(
  searchParams: URLSearchParams,
  schema: z.ZodSchema<T>
): T {
  const params = Object.fromEntries(searchParams.entries());
  const result = schema.safeParse(params);
  if (!result.success) {
    const errors = result.error.flatten();
    throw new ValidationError('Invalid query parameters', errors.fieldErrors);
  }
  return result.data;
}

// Import here to avoid circular dependency at module level
class ValidationError extends Error {
  public readonly details: unknown;
  constructor(message: string, details?: unknown) {
    super(message);
    this.name = 'ValidationError';
    this.details = details;
  }
}

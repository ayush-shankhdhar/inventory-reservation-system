import { generateTraceId } from '@/utils';
import { NextResponse } from 'next/server';
import type { ApiErrorResponse } from '@/types';

/**
 * Custom error hierarchy for the application.
 *
 * Each error type maps to a specific HTTP status code and error code.
 * The API route handler catches these and converts them to structured
 * JSON responses. This keeps business logic clean — services throw
 * domain errors, API layer translates to HTTP semantics.
 */

export class AppError extends Error {
  public readonly statusCode: number;
  public readonly code: string;
  public readonly details?: unknown;
  public readonly isOperational: boolean;

  constructor(
    message: string,
    statusCode: number = 500,
    code: string = 'INTERNAL_ERROR',
    details?: unknown
  ) {
    super(message);
    this.name = 'AppError';
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
    this.isOperational = true; // Distinguishes expected errors from bugs

    // Preserve proper stack trace in V8
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * HTTP 400 — Client sent invalid data.
 */
export class ValidationError extends AppError {
  constructor(message: string = 'Validation failed', details?: unknown) {
    super(message, 400, 'VALIDATION_ERROR', details);
    this.name = 'ValidationError';
  }
}

/**
 * HTTP 404 — Requested resource doesn't exist.
 */
export class NotFoundError extends AppError {
  constructor(resource: string = 'Resource', id?: string) {
    const message = id ? `${resource} with ID "${id}" not found` : `${resource} not found`;
    super(message, 404, 'NOT_FOUND');
    this.name = 'NotFoundError';
  }
}

/**
 * HTTP 409 — Conflict, typically concurrent modification.
 * This is the key error for the reservation system:
 * two requests for the last unit → one gets 409.
 */
export class ConflictError extends AppError {
  constructor(message: string = 'Resource conflict') {
    super(message, 409, 'CONFLICT');
    this.name = 'ConflictError';
  }
}

/**
 * HTTP 410 — Gone, resource was there but has been permanently removed or expired.
 * Explicitly required by assignment to return for expired reservations.
 */
export class GoneError extends AppError {
  constructor(message: string = 'Resource has expired') {
    super(message, 410, 'GONE');
    this.name = 'GoneError';
  }
}

/**
 * HTTP 429 — Rate limit exceeded.
 */
export class RateLimitError extends AppError {
  constructor(retryAfterMs?: number) {
    super('Rate limit exceeded. Please try again later.', 429, 'RATE_LIMITED', {
      retryAfterMs,
    });
    this.name = 'RateLimitError';
  }
}

/**
 * HTTP 422 — Request understood but cannot be processed (business rule violation).
 */
export class UnprocessableError extends AppError {
  constructor(message: string) {
    super(message, 422, 'UNPROCESSABLE');
    this.name = 'UnprocessableError';
  }
}

/**
 * Convert any error to a structured JSON response.
 * 
 * Operational errors (thrown intentionally) include their message.
 * Non-operational errors (bugs) return a generic message to avoid
 * leaking internal details.
 */
export function errorToResponse(error: unknown, traceId?: string): NextResponse<ApiErrorResponse> {
  const trace = traceId ?? generateTraceId();

  if (error instanceof AppError) {
    return NextResponse.json(
      {
        success: false as const,
        error: {
          code: error.code,
          message: error.message,
          details: error.details,
        },
        traceId: trace,
        timestamp: new Date().toISOString(),
      },
      { status: error.statusCode }
    );
  }

  // Unknown error — log full details, return generic response
  console.error(`[${trace}] Unhandled error:`, error);

  return NextResponse.json(
    {
      success: false as const,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'An unexpected error occurred. Please try again later.',
      },
      traceId: trace,
      timestamp: new Date().toISOString(),
    },
    { status: 500 }
  );
}

/**
 * Create a success response with consistent structure.
 */
export function successResponse<T>(
  data: T,
  traceId: string,
  status: number = 200,
  meta?: Record<string, unknown>
): NextResponse {
  return NextResponse.json(
    {
      success: true,
      data,
      ...(meta && { meta }),
      traceId,
      timestamp: new Date().toISOString(),
    },
    { status }
  );
}

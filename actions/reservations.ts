'use server';

import { createReservation, confirmReservation, releaseReservation } from '@/lib/reservations/reservation-service';
import { revalidatePath } from 'next/cache';

/**
 * Server Actions for reservation operations.
 * These are called directly from client components without going through API routes.
 */

export async function createReservationAction(
  productId: string,
  warehouseId: string,
  quantity: number,
  sessionId?: string
) {
  try {
    const reservation = await createReservation(productId, warehouseId, quantity, sessionId);
    revalidatePath('/products');
    revalidatePath('/reservations');
    revalidatePath('/dashboard');
    return { success: true, data: reservation };
  } catch (error: any) {
    return {
      success: false,
      error: error.message || 'Failed to create reservation',
      code: error.code || 'UNKNOWN',
    };
  }
}

export async function confirmReservationAction(reservationId: string) {
  try {
    const reservation = await confirmReservation(reservationId);
    revalidatePath('/reservations');
    revalidatePath('/dashboard');
    revalidatePath('/products');
    return { success: true, data: reservation };
  } catch (error: any) {
    return {
      success: false,
      error: error.message || 'Failed to confirm reservation',
      code: error.code || 'UNKNOWN',
    };
  }
}

export async function releaseReservationAction(reservationId: string) {
  try {
    const reservation = await releaseReservation(reservationId);
    revalidatePath('/reservations');
    revalidatePath('/dashboard');
    revalidatePath('/products');
    return { success: true, data: reservation };
  } catch (error: any) {
    return {
      success: false,
      error: error.message || 'Failed to release reservation',
      code: error.code || 'UNKNOWN',
    };
  }
}

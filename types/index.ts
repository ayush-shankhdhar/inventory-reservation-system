import { type ReservationStatus, type ProductCategory } from '@prisma/client';
import type { Decimal } from '@prisma/client/runtime/library';

// ==============================================================
// API Response Types
// ==============================================================

export interface ApiResponse<T = unknown> {
  success: boolean;
  data: T;
  meta?: ResponseMeta;
  traceId: string;
  timestamp: string;
}

export interface ApiErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
  traceId: string;
  timestamp: string;
}

export interface ResponseMeta {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

export interface PaginationParams {
  page: number;
  pageSize: number;
}

// ==============================================================
// Domain Types — Serialized for API consumption
// (Prisma types use Decimal/Date objects, these are JSON-safe)
// ==============================================================

export interface ProductDTO {
  id: string;
  sku: string;
  slug: string;
  name: string;
  description: string | null;
  image: string | null;
  category: ProductCategory;
  price: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  inventories?: InventoryDTO[];
}

export interface WarehouseDTO {
  id: string;
  name: string;
  code: string;
  city: string;
  address: string;
  isActive: boolean;
  createdAt: string;
  inventoryCount?: number;
  totalStock?: number;
}

export interface InventoryDTO {
  id: string;
  productId: string;
  warehouseId: string;
  totalStock: number;
  reservedStock: number;
  availableStock: number;
  reorderThreshold: number;
  createdAt: string;
  updatedAt: string;
  product?: ProductDTO;
  warehouse?: WarehouseDTO;
}

export interface ReservationDTO {
  id: string;
  reservationNumber: string;
  productId: string;
  warehouseId: string;
  quantity: number;
  status: ReservationStatus;
  expiresAt: string;
  confirmedAt: string | null;
  releasedAt: string | null;
  sessionId: string | null;
  createdAt: string;
  updatedAt: string;
  product?: ProductDTO;
  warehouse?: WarehouseDTO;
}

export interface AuditLogDTO {
  id: string;
  action: string;
  entityType: string;
  entityId: string;
  metadata: unknown;
  createdAt: string;
}

// ==============================================================
// Analytics Types
// ==============================================================

export interface DashboardStats {
  totalProducts: number;
  totalWarehouses: number;
  activeReservations: number;
  confirmedToday: number;
  expiredToday: number;
  lowStockCount: number;
  totalStockValue: number;
  reservationsByStatus: { status: string; count: number }[];
  recentActivity: AuditLogDTO[];
}

// ==============================================================
// Request Types
// ==============================================================

export interface CreateReservationRequest {
  productId: string;
  warehouseId: string;
  quantity: number;
  sessionId?: string;
}

export interface UpdateInventoryRequest {
  totalStock?: number;
  reorderThreshold?: number;
}

// ==============================================================
// Filter Types
// ==============================================================

export interface ProductFilters {
  search?: string;
  category?: ProductCategory;
  inStock?: boolean;
  page?: number;
  pageSize?: number;
}

export interface ReservationFilters {
  status?: ReservationStatus;
  search?: string;
  sessionId?: string;
  page?: number;
  pageSize?: number;
}

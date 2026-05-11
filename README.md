# StockReserve — Multi-Warehouse Inventory Reservation System

![License](https://img.shields.io/badge/license-MIT-blue)
![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue)
![Next.js](https://img.shields.io/badge/Next.js-16-black)
![Prisma](https://img.shields.io/badge/Prisma-7.8-teal)
![Coverage](https://img.shields.io/badge/Tests-Passed-green)

StockReserve is an enterprise-grade inventory reservation platform engineered for high-concurrency ecommerce scenarios. It ensures data consistency and absolute accuracy when reserving stock across multiple geographically distributed warehouses, utilizing a combination of distributed locking, atomic row-level database operations, and idempotent APIs.

## 🚀 Core Features

- **Three-Layer Concurrency Protection**: Uses Redis distributed locks, interactive PostgreSQL transactions, and `SELECT FOR UPDATE` row locking to guarantee no overselling occurs, even on the very last item under severe load.
- **Multi-Warehouse Stock Allocation**: Seamlessly view available inventory from individual warehouses and track aggregate global availability.
- **Atomic Lifecycle Management**: 
  - **Reserve**: Temporarily increment `reservedStock` and set a time-bound lock.
  - **Confirm**: Permanently reduce both `totalStock` and `reservedStock` upon successful purchase.
  - **Release / Expire**: Decrement `reservedStock` to release inventory back into general availability.
- **Automated Expiry Engine**: Automated batch cleanup for abandoned reservations via lightweight CRON background processes.
- **Idempotency Controls**: Protects against transient network errors and duplicate clicks using deterministic payload hashing cached in Redis.
- **Real-Time Dashboard**: Live activity feed, inventory status alerts, and automated stock-level triggers.

---

## 🛠 Technology Stack

### Core Backend
- **Next.js 16 (App Router)**: Edge-ready APIs and Server Actions.
- **Prisma ORM v7**: Advanced type-safe queries and driver-adapter configuration.
- **PostgreSQL**: Highly reliable relational data store.
- **Node-Postgres Adapter (`pg`)**: Connection pooling optimized for extended query protocols used in interactive transactions.
- **Upstash Redis**: Zero-latency distributed locking, caching, and serverless rate-limiting.

### Dynamic Frontend
- **TypeScript**: Rigid static typing across models, payloads, and application logic.
- **Tailwind CSS**: Expressive and consistent utility-first styling.
- **shadcn/ui + Radix**: Pre-designed, accessible components.
- **Framer Motion**: Micro-interactions and hardware-accelerated transitions.

### Reliability & Testing
- **Vitest**: Blazing-fast unit and logic testing framework.
- **Zod**: Runtime schema validation preventing malformed inputs.
- **GitHub Actions**: Comprehensive CI/CD flow validating types, formatting, and testing.

---

## ⚙️ Local Development Installation

### 1. Prerequisites
- **Node.js v20+**
- A running **PostgreSQL** instance (or a Supabase Project)
- A running **Redis** instance (or Upstash account)

### 2. Clone & Install
```bash
git clone https://github.com/your-org/stock-reserve.git
cd stock-reserve
npm install
```

### 3. Environment Setup
Create a `.env` file in the root directory:
```env
# Database Connection 
DATABASE_URL="your-postgresql-connection-string"
DIRECT_URL="your-direct-postgresql-connection-string"

# Redis Connection
UPSTASH_REDIS_REST_URL="your-redis-url"
UPSTASH_REDIS_REST_TOKEN="your-redis-token"

# App
NEXT_PUBLIC_APP_URL="http://localhost:3000"
NODE_ENV="development"
CRON_SECRET="generate-a-secure-key-here"
```

### 4. Initialize & Seed Database
Prisma v7 uses driver adapters, so the structure is decoupled from the schema file.
```bash
# Generate the Prisma Client with configured types
npx prisma generate

# Sync the schema onto your PostgreSQL Instance
npx prisma db push

# Inject production-realistic mockup dataset
npm run db:seed
```

### 5. Launch Development Server
```bash
npm run dev
```
Access the dashboard via [http://localhost:3000](http://localhost:3000).

---

## 🧪 Verification & Validation

### Running Tests
We rigorously validate core math, edge cases, and race-condition handling.
```bash
npm test
```

### Core Test Coverage Include:
- **Concurrency Scenarios**: Validate logical consistency when `N` requests fight for `M` items.
- **Stock Arithmetic**: Confirm `reservedStock` vs `totalStock` math on Create, Confirm, and Expire.
- **Utility Suite**: Rigorous testing of payload hashing algorithms and generator formats.

---

## 📐 Architectural Decisions

### Why `DIRECT_URL` is mandatory in `lib/db/prisma.ts`?
We explicitly define `DIRECT_URL` because our core reservation mechanism uses `prisma.$transaction` with `FOR UPDATE` row locks. Traditional connection poolers like PgBouncer in *Transaction Pooling Mode* truncate transaction sessions and do not support prepared statements utilized by these locking queries. Using the direct adapter ensures we always hold valid locks without dropping sessions mid-transaction.

### The 10-Minute Reservation Lock
Reservations automatically append a 10-minute `expiresAt` TTL. To avoid scanning large tables constantly, our scheduled `/api/cron/expire-reservations` worker reads indexed expiration targets and releases lock volumes every 60 seconds in memory-optimized batch operations.

---

## 📋 Allo Take-Home Requirements & Implementation Notes

### 1. Concurrency Guarantees
The core requirement of "exactly one succeeds for the last item" is managed by tiered locking strategy in `lib/reservations/reservation-service.ts`:
*   **Redis Distributed Lock**: Provides optimistic, high-throughput concurrency blocking at the edge.
*   **PostgreSQL `SELECT FOR UPDATE`**: Absolute source-of-truth lock. We serialize the read-and-write state INSIDE the atomic transaction ensuring accurate inventory subtraction without dirty reads.

### 2. Reservation Expiry Mechanism (Production Approach)
Implemented as a **Vercel Cron job / Scheduled Worker** located at `app/api/cron/expire-reservations/route.ts`.
*   **How it works**: It periodically runs a batched update that queries for `PENDING` reservations where `expiresAt < now`. 
*   **Atomic Restore**: It handles returning stock logic sequentially to prevent fragmented inventory inconsistencies.
*   **Production refinement**: In a heavy production scenario, I would transition from periodic polling to utilizing **Redis TTL Keyspace Notifications** or a true message broker (SQS delay queues) to trigger instantaneous release hooks exactly at the second of expiration.

### 3. Idempotency (Bonus Feature)
Designed and integrated via `lib/reservations/idempotency-service.ts` and utilized on reservation mutative endpoints.
*   **Flow**: Uses `Idempotency-Key` header provided by the client. 
*   **Storage**: Checks Upstash Redis (fast-path) then queries PostgreSQL `IdempotencyKey` table (durable fallback).
*   **Safety**: Hashes the incoming request payload. If the same key arrives but with a different payload, we throw an explicit `400 ValidationError` preventing accidental reuse across different business actions.

### 4. Trade-offs & Future Enhancements
*   **Synchronous Image Serving**: Currently, local assets are served via `/public`. Ideally, this would flow through a cloud storage provider (AWS S3/Cloudinary) coupled with Next/Image sharp-loading.
*   **Polling UI**: The frontend tracks countdown timers on the client. For enterprise usage, hooking up WebSockets or Server-Sent Events (SSE) for global broadcast of inventory depleted/restored events would keep other viewing users strictly accurate in real-time.
*   **Global Distribution**: Currently bounded to a single region. Multi-region Postgres write clusters could reduce latency for geographically separated users, though creating data sharding challenges.

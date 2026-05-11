import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';

const pool = new pg.Pool({ connectionString: process.env.DIRECT_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log('🌱 Seeding database...\n');

  // Clean existing data
  await prisma.auditLog.deleteMany();
  await prisma.idempotencyKey.deleteMany();
  await prisma.reservation.deleteMany();
  await prisma.inventory.deleteMany();
  await prisma.product.deleteMany();
  await prisma.warehouse.deleteMany();
  await prisma.userSession.deleteMany();

  // ============================================================
  // WAREHOUSES
  // ============================================================
  const warehouses = await Promise.all([
    prisma.warehouse.create({
      data: {
        name: 'East Coast Distribution',
        code: 'WH-NYC',
        city: 'New York',
        address: '45 Commerce Blvd, Brooklyn, NY 11201',
      },
    }),
    prisma.warehouse.create({
      data: {
        name: 'West Coast Fulfillment',
        code: 'WH-LAX',
        city: 'Los Angeles',
        address: '1200 Harbor Dr, Long Beach, CA 90802',
      },
    }),
    prisma.warehouse.create({
      data: {
        name: 'Central Hub',
        code: 'WH-CHI',
        city: 'Chicago',
        address: '888 Industrial Park Way, Chicago, IL 60601',
      },
    }),
    prisma.warehouse.create({
      data: {
        name: 'Southern Depot',
        code: 'WH-ATL',
        city: 'Atlanta',
        address: '2500 Peachtree Industrial Blvd, Atlanta, GA 30301',
      },
    }),
    prisma.warehouse.create({
      data: {
        name: 'Pacific Northwest',
        code: 'WH-SEA',
        city: 'Seattle',
        address: '700 Waterfront Pkwy, Seattle, WA 98101',
      },
    }),
  ]);

  console.log(`✅ Created ${warehouses.length} warehouses`);

  // ============================================================
  // PRODUCTS
  // ============================================================
  const products = await Promise.all([
    prisma.product.create({
      data: {
        sku: 'ELEC-WH-1000X',
        slug: 'wireless-noise-cancelling-headphones',
        name: 'Wireless Noise-Cancelling Headphones',
        description: 'Premium over-ear headphones with active noise cancellation, 30-hour battery life, and multipoint Bluetooth connectivity.',
        category: 'ELECTRONICS',
        price: 349.99,
        image: '/images/products/headphones.png',
      },
    }),
    prisma.product.create({
      data: {
        sku: 'ELEC-MB-PRO16',
        slug: 'ultrabook-pro-16',
        name: 'UltraBook Pro 16" Laptop',
        description: 'High-performance laptop with M3 chip, 32GB RAM, 1TB SSD, and stunning Liquid Retina display.',
        category: 'ELECTRONICS',
        price: 2499.00,
        image: '/images/products/laptop.png',
      },
    }),
    prisma.product.create({
      data: {
        sku: 'ELEC-SW-ULTRA',
        slug: 'smartwatch-ultra',
        name: 'SmartWatch Ultra',
        description: 'Rugged smartwatch with titanium case, GPS, cellular, and 72-hour battery life.',
        category: 'ELECTRONICS',
        price: 799.99,
        image: '/images/products/smartwatch.png',
      },
    }),
    prisma.product.create({
      data: {
        sku: 'CLTH-JKT-ALPM',
        slug: 'alpine-performance-jacket',
        name: 'Alpine Performance Jacket',
        description: 'Waterproof, breathable shell jacket with GORE-TEX membrane for all-weather protection.',
        category: 'CLOTHING',
        price: 289.00,
        image: '/images/products/jacket.png',
      },
    }),
    prisma.product.create({
      data: {
        sku: 'CLTH-SNK-RUN3',
        slug: 'cloud-runner-3',
        name: 'Cloud Runner 3.0 Shoes',
        description: 'Lightweight running shoes with carbon fiber plate and responsive CloudTec cushioning.',
        category: 'CLOTHING',
        price: 179.95,
        image: '/images/products/shoes.png',
      },
    }),
    prisma.product.create({
      data: {
        sku: 'HOME-CFM-ERGX',
        slug: 'ergonomic-office-chair',
        name: 'ErgoMax Pro Office Chair',
        description: 'Full mesh ergonomic chair with lumbar support, 4D armrests, and tilt lock mechanism.',
        category: 'HOME',
        price: 699.00,
        image: '/images/products/chair.png',
      },
    }),
    prisma.product.create({
      data: {
        sku: 'HOME-APR-BREW',
        slug: 'precision-espresso-machine',
        name: 'Precision Espresso Machine',
        description: 'Dual boiler espresso machine with PID temperature control and integrated grinder.',
        category: 'HOME',
        price: 1299.00,
        image: '/images/products/espresso.png',
      },
    }),
    prisma.product.create({
      data: {
        sku: 'SPRT-BKE-CARB',
        slug: 'carbon-road-bike',
        name: 'Carbon Aero Road Bike',
        description: 'Full carbon road bike with electronic shifting, disc brakes, and aero-optimized frameset.',
        category: 'SPORTS',
        price: 4299.00,
        image: '/images/products/bike.png',
      },
    }),
    prisma.product.create({
      data: {
        sku: 'SPRT-YGA-PREM',
        slug: 'premium-yoga-mat',
        name: 'Premium Alignment Yoga Mat',
        description: 'Natural rubber yoga mat with alignment markings, 5mm thickness, and non-slip surface.',
        category: 'SPORTS',
        price: 89.99,
        image: '/images/products/yoga.png',
      },
    }),
    prisma.product.create({
      data: {
        sku: 'ACCS-BAG-TRVL',
        slug: 'travel-backpack-40l',
        name: 'Explorer 40L Travel Backpack',
        description: 'Carry-on compliant travel backpack with laptop compartment, compression straps, and hidden pockets.',
        category: 'ACCESSORIES',
        price: 199.00,
        image: '/images/products/backpack.png',
      },
    }),
    prisma.product.create({
      data: {
        sku: 'ELEC-KBD-TACT',
        slug: 'artisan-tactile-keyboard',
        name: 'Artisan Series Mechanical Keyboard',
        description: 'A custom-built 75% keyboard feat. pre-lubed tactile switches, thick dye-sub PBT retro keycaps, and a brass internal weights for an incredibly solid typing acoustic profile.',
        category: 'ELECTRONICS',
        price: 245.00,
        image: '/images/products/keyboard.png',
      },
    }),
    prisma.product.create({
      data: {
        sku: 'ELEC-CAM-35MM',
        slug: 'vintage-film-camera',
        name: 'Heritage 35mm Film Camera',
        description: 'Fully restored mechanical SLR body paired with a fast 50mm f/1.4 manual lens. Fully inspected shutter speeds and light-seals. Ready to shoot 35mm analog film.',
        category: 'ELECTRONICS',
        price: 420.00,
        image: '/images/products/camera.png',
      },
    }),

  ]);

  console.log(`✅ Created ${products.length} products`);

  // ============================================================
  // INVENTORY — varied stock levels across warehouses
  // ============================================================
  const inventoryData: Array<{
    productIdx: number;
    warehouseIdx: number;
    totalStock: number;
    reservedStock: number;
    reorderThreshold: number;
  }> = [
    // Headphones — well stocked
    { productIdx: 0, warehouseIdx: 0, totalStock: 150, reservedStock: 12, reorderThreshold: 20 },
    { productIdx: 0, warehouseIdx: 1, totalStock: 200, reservedStock: 8, reorderThreshold: 25 },
    { productIdx: 0, warehouseIdx: 2, totalStock: 100, reservedStock: 5, reorderThreshold: 15 },
    // Laptop — limited stock
    { productIdx: 1, warehouseIdx: 0, totalStock: 25, reservedStock: 3, reorderThreshold: 10 },
    { productIdx: 1, warehouseIdx: 1, totalStock: 30, reservedStock: 5, reorderThreshold: 10 },
    { productIdx: 1, warehouseIdx: 4, totalStock: 15, reservedStock: 2, reorderThreshold: 5 },
    // SmartWatch — some low stock
    { productIdx: 2, warehouseIdx: 0, totalStock: 50, reservedStock: 4, reorderThreshold: 15 },
    { productIdx: 2, warehouseIdx: 1, totalStock: 8, reservedStock: 6, reorderThreshold: 10 }, // LOW!
    { productIdx: 2, warehouseIdx: 3, totalStock: 35, reservedStock: 1, reorderThreshold: 10 },
    // Alpine Jacket
    { productIdx: 3, warehouseIdx: 0, totalStock: 80, reservedStock: 3, reorderThreshold: 15 },
    { productIdx: 3, warehouseIdx: 2, totalStock: 60, reservedStock: 2, reorderThreshold: 10 },
    { productIdx: 3, warehouseIdx: 4, totalStock: 45, reservedStock: 0, reorderThreshold: 10 },
    // Running Shoes
    { productIdx: 4, warehouseIdx: 0, totalStock: 120, reservedStock: 8, reorderThreshold: 20 },
    { productIdx: 4, warehouseIdx: 1, totalStock: 90, reservedStock: 3, reorderThreshold: 15 },
    { productIdx: 4, warehouseIdx: 3, totalStock: 70, reservedStock: 1, reorderThreshold: 10 },
    // Office Chair — low stock
    { productIdx: 5, warehouseIdx: 0, totalStock: 12, reservedStock: 10, reorderThreshold: 5 }, // LOW!
    { productIdx: 5, warehouseIdx: 2, totalStock: 20, reservedStock: 3, reorderThreshold: 8 },
    // Espresso Machine
    { productIdx: 6, warehouseIdx: 1, totalStock: 18, reservedStock: 2, reorderThreshold: 5 },
    { productIdx: 6, warehouseIdx: 4, totalStock: 10, reservedStock: 1, reorderThreshold: 3 },
    // Road Bike — very limited
    { productIdx: 7, warehouseIdx: 0, totalStock: 5, reservedStock: 3, reorderThreshold: 3 }, // LOW!
    { productIdx: 7, warehouseIdx: 1, totalStock: 3, reservedStock: 1, reorderThreshold: 2 },
    // Yoga Mat — well stocked
    { productIdx: 8, warehouseIdx: 0, totalStock: 300, reservedStock: 5, reorderThreshold: 30 },
    { productIdx: 8, warehouseIdx: 1, totalStock: 250, reservedStock: 3, reorderThreshold: 25 },
    { productIdx: 8, warehouseIdx: 2, totalStock: 200, reservedStock: 2, reorderThreshold: 20 },
    { productIdx: 8, warehouseIdx: 3, totalStock: 180, reservedStock: 0, reorderThreshold: 20 },
    // Travel Backpack
    { productIdx: 9, warehouseIdx: 0, totalStock: 75, reservedStock: 4, reorderThreshold: 15 },
    { productIdx: 9, warehouseIdx: 1, totalStock: 60, reservedStock: 2, reorderThreshold: 10 },
    { productIdx: 9, warehouseIdx: 3, totalStock: 40, reservedStock: 1, reorderThreshold: 8 },
    // Artisan Keyboard
    { productIdx: 10, warehouseIdx: 2, totalStock: 30, reservedStock: 2, reorderThreshold: 10 },
    { productIdx: 10, warehouseIdx: 4, totalStock: 15, reservedStock: 0, reorderThreshold: 5 },
    // Film Camera
    { productIdx: 11, warehouseIdx: 0, totalStock: 12, reservedStock: 3, reorderThreshold: 5 },
    { productIdx: 11, warehouseIdx: 1, totalStock: 8, reservedStock: 1, reorderThreshold: 3 },
  ];

  const inventories = await Promise.all(
    inventoryData.map((inv) =>
      prisma.inventory.create({
        data: {
          productId: products[inv.productIdx].id,
          warehouseId: warehouses[inv.warehouseIdx].id,
          totalStock: inv.totalStock,
          reservedStock: inv.reservedStock,
          reorderThreshold: inv.reorderThreshold,
        },
      })
    )
  );

  console.log(`✅ Created ${inventories.length} inventory records`);

  // ============================================================
  // RESERVATIONS — mix of statuses
  // ============================================================
  const now = new Date();
  const reservations = await Promise.all([
    // Active PENDING reservations
    prisma.reservation.create({
      data: {
        reservationNumber: 'RSV-20260511-A1B2C3',
        productId: products[0].id,
        warehouseId: warehouses[0].id,
        quantity: 2,
        status: 'PENDING',
        expiresAt: new Date(now.getTime() + 8 * 60 * 1000), // expires in 8 min
      },
    }),
    prisma.reservation.create({
      data: {
        reservationNumber: 'RSV-20260511-D4E5F6',
        productId: products[1].id,
        warehouseId: warehouses[1].id,
        quantity: 1,
        status: 'PENDING',
        expiresAt: new Date(now.getTime() + 3 * 60 * 1000), // expires in 3 min
      },
    }),
    // CONFIRMED reservations
    prisma.reservation.create({
      data: {
        reservationNumber: 'RSV-20260510-G7H8I9',
        productId: products[4].id,
        warehouseId: warehouses[0].id,
        quantity: 1,
        status: 'CONFIRMED',
        expiresAt: new Date(now.getTime() - 2 * 60 * 60 * 1000),
        confirmedAt: new Date(now.getTime() - 2 * 60 * 60 * 1000),
      },
    }),
    prisma.reservation.create({
      data: {
        reservationNumber: 'RSV-20260510-J1K2L3',
        productId: products[2].id,
        warehouseId: warehouses[0].id,
        quantity: 1,
        status: 'CONFIRMED',
        expiresAt: new Date(now.getTime() - 5 * 60 * 60 * 1000),
        confirmedAt: new Date(now.getTime() - 4 * 60 * 60 * 1000),
      },
    }),
    // EXPIRED reservations
    prisma.reservation.create({
      data: {
        reservationNumber: 'RSV-20260509-M4N5O6',
        productId: products[7].id,
        warehouseId: warehouses[0].id,
        quantity: 1,
        status: 'EXPIRED',
        expiresAt: new Date(now.getTime() - 24 * 60 * 60 * 1000),
        releasedAt: new Date(now.getTime() - 24 * 60 * 60 * 1000),
      },
    }),
    // RELEASED reservations
    prisma.reservation.create({
      data: {
        reservationNumber: 'RSV-20260509-P7Q8R9',
        productId: products[3].id,
        warehouseId: warehouses[2].id,
        quantity: 2,
        status: 'RELEASED',
        expiresAt: new Date(now.getTime() - 12 * 60 * 60 * 1000),
        releasedAt: new Date(now.getTime() - 12.5 * 60 * 60 * 1000),
      },
    }),
  ]);

  console.log(`✅ Created ${reservations.length} reservations`);

  // ============================================================
  // AUDIT LOGS
  // ============================================================
  await prisma.auditLog.createMany({
    data: [
      {
        action: 'RESERVATION_CREATED',
        entityType: 'Reservation',
        entityId: reservations[0].id,
        metadata: { quantity: 2, product: 'Wireless Headphones' },
      },
      {
        action: 'RESERVATION_CREATED',
        entityType: 'Reservation',
        entityId: reservations[1].id,
        metadata: { quantity: 1, product: 'UltraBook Pro' },
      },
      {
        action: 'RESERVATION_CONFIRMED',
        entityType: 'Reservation',
        entityId: reservations[2].id,
        metadata: { quantity: 1, product: 'Cloud Runner 3.0' },
      },
      {
        action: 'RESERVATION_EXPIRED',
        entityType: 'Reservation',
        entityId: reservations[4].id,
        metadata: { quantity: 1, product: 'Carbon Road Bike' },
      },
      {
        action: 'INVENTORY_UPDATED',
        entityType: 'Inventory',
        entityId: inventories[0].id,
        metadata: { previousStock: 120, newStock: 150 },
      },
    ],
  });

  console.log('✅ Created audit logs');
  console.log('\n🎉 Seed complete!\n');
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());

import { PrismaClient } from "@/app/generated/prisma/client"
import { PrismaPg } from '@prisma/adapter-pg'
import 'dotenv/config'
import bcrypt from 'bcryptjs';
import { SaleStatus } from "@/app/generated/prisma/client";

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL as string,
})

const prisma = new PrismaClient({
  adapter,
});

async function main() {
  console.log("Starting seed...");

  const passHash = await bcrypt.hash('admin', 10);
  const pinHash = await bcrypt.hash("1234", 10);

  // 1. USERS (5 filas)
  const userData = [
    { id: 1, email: 'admin@comal.com', username: 'admin', password: passHash, role: 'ADMIN', name: 'Administrador', active: true },
    { id: 2, name: 'Juan Perez', username: 'juanp', pin: pinHash, role: 'STAFF', active: true },
    { id: 3, name: 'Maria Lopez', username: 'marial', pin: pinHash, role: 'STAFF', active: true },
    { id: 4, name: 'Pedro Gomez', username: 'pedrog', pin: pinHash, role: 'STAFF', active: true },
    { id: 5, name: 'Ana Ruiz', username: 'anar', pin: pinHash, role: 'STAFF', active: false },
  ];

  for (const u of userData) {
    await prisma.users.upsert({ where: { id: u.id }, update: {}, create: u });
  }

  // 2. CUSTOMER (5 filas)
  const customerData = [
    { id: 1, customerName: 'Maria Garcia', phone: '2221234567', alias: 'Mari', currentBalance: 0, registeredDate: new Date('2025-12-01') },
    { id: 2, customerName: 'Ricardo Soto', phone: '2229876543', alias: 'Richie', currentBalance: 150.50, registeredDate: new Date('2025-12-15') },
    { id: 3, customerName: 'Elena Paz', phone: '2224445566', alias: 'Elena', currentBalance: 0, registeredDate: new Date('2026-01-05') },
    { id: 4, customerName: 'Jorge Luis', phone: '2227778899', alias: 'Georgie', currentBalance: 300.00, registeredDate: new Date('2026-01-10') },
    { id: 5, customerName: 'Sofia Ruiz', phone: '2221112233', alias: 'Sofi', currentBalance: 50.00, registeredDate: new Date('2026-02-01') },
  ];

  for (const c of customerData) {
    await prisma.customer.upsert({ where: { id: c.id }, update: {}, create: c });
  }

  // 3. PRODUCTS (5 filas)
  const productData = [
    { id: 1, name: 'Tacos al Pastor (Orden)', price: 75.00 },
    { id: 2, name: 'Tacos de Bistec (Orden)', price: 85.00 },
    { id: 3, name: 'Gringa de Pastor', price: 60.00 },
    { id: 4, name: 'Volcán de Queso', price: 45.00 },
    { id: 5, name: 'Agua de Horchata 1L', price: 35.00 },
  ];

  for (const p of productData) {
    await prisma.products.upsert({ where: { id: p.id }, update: {}, create: p });
  }

  // 4. SUPPLIES (5 filas)
  const supplyData = [
    { id: 1, name: 'Tortillas', measureUnit: 'kg', currentStock: 20, unitCost: 22.00 },
    { id: 2, name: 'Carne Pastor', measureUnit: 'kg', currentStock: 15, unitCost: 140.00 },
    { id: 3, name: 'Queso Asadero', measureUnit: 'kg', currentStock: 5, unitCost: 160.00 },
    { id: 4, name: 'Piña', measureUnit: 'pza', currentStock: 10, unitCost: 25.00 },
    { id: 5, name: 'Carne Bistec', measureUnit: 'kg', currentStock: 12, unitCost: 180.00 },
  ];

  for (const s of supplyData) {
    await prisma.supplies.upsert({ where: { id: s.id }, update: {}, create: s });
  }

  // 5. RECIPES (5 filas)
  const recipeData = [
    { productID: 1, supplyID: 1, quantityUsed: 0.150 }, // Tacos Pastor -> Tortillas
    { productID: 1, supplyID: 2, quantityUsed: 0.200 }, // Tacos Pastor -> Carne
    { productID: 3, supplyID: 1, quantityUsed: 0.050 }, // Gringa -> Tortilla
    { productID: 3, supplyID: 3, quantityUsed: 0.080 }, // Gringa -> Queso
    { productID: 4, supplyID: 3, quantityUsed: 0.100 }, // Volcan -> Queso
  ];

  for (const r of recipeData) {
    await prisma.recipes.upsert({
      where: { productID_supplyID: { productID: r.productID, supplyID: r.supplyID } },
      update: {},
      create: r
    });
  }

  // 6. SALES (5 filas)
  const salesData = [
    { id: 1, total: 175.00, status: SaleStatus.PAID, source_type: 'VENTA_LIBRE', customerID: 1, placedBy: 2, createdAt: new Date('2026-02-10T14:00:00Z') },
    { id: 2, total: 245.50, status: SaleStatus.UNPAID, source_type: 'VENTA_LIBRE', customerID: 2, placedBy: 3, createdAt: new Date('2026-02-11T15:00:00Z') },
    { id: 3, total: 110.00, status: SaleStatus.PAID, source_type: 'MESA_1', customerID: 3, placedBy: 2, createdAt: new Date('2026-02-12T16:30:00Z') },
    { id: 4, total: 300.00, status: SaleStatus.UNPAID, source_type: 'MESA_1', customerID: 4, placedBy: 4, createdAt: new Date('2026-02-13T19:00:00Z') },
    { id: 5, total: 95.00, status: SaleStatus.PAID, source_type: 'MESA_4', customerID: 5, placedBy: 3, createdAt: new Date('2026-02-14T20:00:00Z') },
  ];

  for (const sa of salesData) {
    await prisma.sales.upsert({ where: { id: sa.id }, update: {}, create: sa });
  }

  // 7. SALE_ITEMS (5 filas)
  const saleItemsData = [
    { id: 1, saleID: 1, productID: 1, quantity: 2, unitPrice: 75.00, subtotal: 150.00 },
    { id: 2, saleID: 1, productID: 5, quantity: 1, unitPrice: 25.00, subtotal: 25.00 },
    { id: 3, saleID: 2, productID: 2, quantity: 2, unitPrice: 85.00, subtotal: 170.00 },
    { id: 4, saleID: 4, productID: 3, quantity: 5, unitPrice: 60.00, subtotal: 300.00 },
    { id: 5, saleID: 5, productID: 4, quantity: 2, unitPrice: 45.00, subtotal: 90.00 },
  ];

  for (const si of saleItemsData) {
    await prisma.sale_items.upsert({ where: { id: si.id }, update: {}, create: si });
  }

  // 8. DEBTORS (5 filas)
  const debtorsData = [
    { id: 1, saleID: 2, customerID: 2, amount: 150.50, status: SaleStatus.DEBT },
    { id: 2, saleID: 4, customerID: 4, amount: 300.00, status: SaleStatus.DEBT },
    { id: 3, saleID: 5, customerID: 5, amount: 50.00, status: SaleStatus.DEBT },
    { id: 4, saleID: 1, customerID: 1, amount: 0.00, status: SaleStatus.PAID },
    { id: 5, saleID: 3, customerID: 3, amount: 0.00, status: SaleStatus.PAID },
  ];

  for (const d of debtorsData) {
    await prisma.debtors.upsert({ where: { id: d.id }, update: {}, create: d });
  }

  // 9. BILL (5 filas)
  const billData = [
    { id: 1, description: 'Renta Enero', amount: 5000, category: 'RENT', date: new Date('2026-01-01'), registered_by: 1 },
    { id: 2, description: 'Luz Comercial', amount: 1200, category: 'SERVICES', date: new Date('2026-01-15'), registered_by: 1 },
    { id: 3, description: 'Compra Gas LP', amount: 850, category: 'SUPPLIES', date: new Date('2026-01-20'), registered_by: 1 },
    { id: 4, description: 'Internet y Teléfono', amount: 600, category: 'SERVICES', date: new Date('2026-02-01'), registered_by: 1 },
    { id: 5, description: 'Mantenimiento Parrilla', amount: 450, category: 'MAINTENANCE', date: new Date('2026-02-05'), registered_by: 1 },
  ];

  for (const b of billData) {
    await prisma.bill.upsert({ where: { id: b.id }, update: {}, create: b });
  }

  // 10. SALARY (5 filas)
  const salaryData = [
    { id: 1, userID: 2, amount: 1200, payDate: new Date('2026-02-07'), period: 'WEEKLY_01' },
    { id: 2, userID: 3, amount: 1200, payDate: new Date('2026-02-07'), period: 'WEEKLY_01' },
    { id: 3, userID: 4, amount: 1300, payDate: new Date('2026-02-07'), period: 'WEEKLY_01' },
    { id: 4, userID: 2, amount: 1200, payDate: new Date('2026-02-14'), period: 'WEEKLY_02' },
    { id: 5, userID: 3, amount: 1200, payDate: new Date('2026-02-14'), period: 'WEEKLY_02' },
  ];

  for (const sal of salaryData) {
    await prisma.salary.upsert({ where: { id: sal.id }, update: {}, create: sal });
  }

  console.log("Seed finished successfully!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
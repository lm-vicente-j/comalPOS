import { PrismaClient, SaleStatus, JornadaStatus, PaymentMethod, SavingsMovementType, GoalStatus } from "@/app/generated/prisma/client"
import { PrismaPg } from '@prisma/adapter-pg'
import 'dotenv/config'
import bcrypt from 'bcryptjs';

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL as string,
})

const prisma = new PrismaClient({
  adapter,
});

const randomInt = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min;
const randomFloat = (min: number, max: number, decimals = 2) => parseFloat((Math.random() * (max - min) + min).toFixed(decimals));
const randomDate = (start: Date, end: Date) => new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
const randomElement = <T>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];

async function main() {
  console.log("Iniciando seed con grandes volúmenes de datos...");

  console.log("Limpiando registros existentes...");
  await prisma.sale_items.deleteMany({});
  await prisma.debtors.deleteMany({});
  await prisma.sales.deleteMany({});
  await prisma.recipes.deleteMany({});
  await prisma.products.deleteMany({});
  await prisma.supplies.deleteMany({});
  await prisma.bill.deleteMany({});
  await prisma.salary.deleteMany({});
  await prisma.savings_movement.deleteMany({});
  await prisma.goal_contribution.deleteMany({});
  await prisma.savings_goal.deleteMany({});
  await prisma.jornada.deleteMany({});
  await prisma.customer.deleteMany({});
  await prisma.users.deleteMany({});

  const passHash = await bcrypt.hash('Djw9zfq33nl7dgy', 10);
  const pinHash = await bcrypt.hash("1234", 10);

  const NUM_USERS = 20;
  const NUM_CUSTOMERS = 1000;
  const NUM_PRODUCTS = 200;
  const NUM_SUPPLIES = 300;
  const NUM_JORNADAS = 100;
  const NUM_SALES = 10000;
  const NUM_BILLS = 2000;


  console.log(`Generando ${NUM_USERS} usuarios...`);
  
  
  const users: any[] = [
    { 
      id: 1, 
      email: 'admin@bonfood.com', 
      username: 'admin', 
      password: passHash, 
      pin: null,
      role: 'ADMIN', 
      name: 'Administrador', 
      active: true 
    }
  ];

  for (let i = 2; i <= NUM_USERS; i++) {
    users.push({ 
      id: i, 
      email: `user${i}@test.com`, 
      username: `user${i}`, 
      password: passHash, 
      pin: pinHash, 
      role: 'STAFF', 
      name: `Staff ${i}`, 
      active: true 
    });
  }
  await prisma.users.createMany({ data: users });

  console.log(`Generando ${NUM_CUSTOMERS} clientes...`);
  const customers = [];
  for (let i = 1; i <= NUM_CUSTOMERS; i++) {
    customers.push({
      id: i,
      customerName: `Cliente Demo ${i}`,
      phone: `222${randomInt(1000000, 9999999)}`,
      alias: `Alias ${i}`,
      currentBalance: randomFloat(0, 500),
      registeredDate: randomDate(new Date('2024-01-01'), new Date('2025-12-31')),
      lastConsumption: randomDate(new Date('2025-01-01'), new Date('2026-05-01')),
    });
  }
  await prisma.customer.createMany({ data: customers });

  console.log(`Generando ${NUM_SUPPLIES} insumos y ${NUM_PRODUCTS} productos...`);
  const supplies = Array.from({ length: NUM_SUPPLIES }).map((_, i) => ({
    id: i + 1, name: `Insumo ${i + 1}`, measureUnit: randomElement(['kg', 'litro', 'pza', 'gr']), currentStock: randomFloat(10, 1000), unitCost: randomFloat(5, 200), active: true
  }));
  const products = Array.from({ length: NUM_PRODUCTS }).map((_, i) => ({
    id: i + 1, name: `Producto ${i + 1} ${Math.random().toString(36).substring(7)}`, price: randomFloat(20, 500)
  }));
  await prisma.supplies.createMany({ data: supplies });
  await prisma.products.createMany({ data: products });

  console.log("Generando recetas...");
  const recipes = [];
  for (let i = 1; i <= NUM_PRODUCTS; i++) {
    const numIngredients = randomInt(1, 5);
    const usedSupplies = new Set<number>();
    for (let j = 0; j < numIngredients; j++) {
      let supplyId = randomInt(1, NUM_SUPPLIES);
      while (usedSupplies.has(supplyId)) supplyId = randomInt(1, NUM_SUPPLIES);
      usedSupplies.add(supplyId);
      recipes.push({ productID: i, supplyID: supplyId, quantityUsed: randomFloat(0.01, 2) });
    }
  }
  await prisma.recipes.createMany({ data: recipes });

  console.log(`Generando ${NUM_JORNADAS} jornadas...`);
  const jornadas = Array.from({ length: NUM_JORNADAS }).map((_, i) => ({
    id: i + 1,
    openedAt: randomDate(new Date('2025-01-01'), new Date('2026-05-01')),
    openedBy: randomInt(1, NUM_USERS),
    status: randomElement([JornadaStatus.CLOSED, JornadaStatus.AUTO_CLOSED, JornadaStatus.OPEN]),
    openingAmount: randomFloat(500, 2000),
    expectedClosingAmount: randomFloat(2000, 10000),
    actualClosingAmount: randomFloat(2000, 10000),
  }));
  await prisma.jornada.createMany({ data: jornadas });

  console.log(`Generando ${NUM_SALES} ventas y sus detalles (esto puede tardar un poco)...`);
  const sales = [];
  const saleItems = [];
  let currentSaleItemId = 1;

  for (let i = 1; i <= NUM_SALES; i++) {
    const isPaid = Math.random() > 0.2; 
    const totalVenta = randomFloat(50, 1500);
    
    sales.push({
      id: i,
      total: totalVenta,
      source_type: randomElement(['VENTA_LIBRE', 'MESA_1', 'MESA_2', 'MESA_3', 'RAPPI']),
      customerID: randomInt(1, NUM_CUSTOMERS),
      placedBy: randomInt(1, NUM_USERS),
      jornadaId: randomInt(1, NUM_JORNADAS),
      createdAt: randomDate(new Date('2025-01-01'), new Date('2026-05-26')),
      status: isPaid ? SaleStatus.PAID : randomElement([SaleStatus.UNPAID, SaleStatus.DEBT]),
      payment_method: isPaid ? randomElement(['CASH', 'TRANSFER']) : null,
    });

    const numItems = randomInt(1, 5);
    for (let j = 0; j < numItems; j++) {
      const pPrice = randomFloat(20, 500);
      const qty = randomInt(1, 4);
      saleItems.push({
        id: currentSaleItemId++, saleID: i, productID: randomInt(1, NUM_PRODUCTS), quantity: qty, unitPrice: pPrice, subtotal: pPrice * qty
      });
    }
  }

  for (let i = 0; i < sales.length; i += 2000) {
    await prisma.sales.createMany({ data: sales.slice(i, i + 2000) });
  }
  for (let i = 0; i < saleItems.length; i += 5000) {
    await prisma.sale_items.createMany({ data: saleItems.slice(i, i + 5000) });
  }

  console.log(`Generando ${NUM_BILLS} gastos...`);
  const bills = Array.from({ length: NUM_BILLS }).map((_, i) => ({
    id: i + 1,
    description: `Gasto operativo ${i}`,
    amount: randomFloat(50, 5000),
    category: randomElement(['RENT', 'SERVICES', 'SUPPLIES', 'MAINTENANCE', 'OTHER']),
    date: randomDate(new Date('2025-01-01'), new Date('2026-05-26')),
    registered_by: randomInt(1, NUM_USERS),
    jornadaId: randomInt(1, NUM_JORNADAS)
  }));
  for (let i = 0; i < bills.length; i += 1000) {
    await prisma.bill.createMany({ data: bills.slice(i, i + 1000) });
  }


  console.log("Sincronizando secuencias de PostgreSQL...");
  const tables = ['users', 'customer', 'products', 'supplies', 'jornada', 'sales', 'sale_items', 'bill', 'debtors', 'salary', 'savings_movement', 'savings_goal', 'goal_contribution'];
  for (const table of tables) {
    await prisma.$executeRawUnsafe(`SELECT setval(pg_get_serial_sequence('"${table}"', 'id'), coalesce(max(id)+1, 1), false) FROM "${table}";`);
  }

  console.log("¡Seed de gran volumen finalizado con éxito! 🚀");
}

main()
  .catch((e) => {
    console.error("Error durante el seed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
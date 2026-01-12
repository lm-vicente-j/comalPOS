import { PrismaClient } from "@/app/generated/prisma/client"
import { PrismaPg } from '@prisma/adapter-pg'
import 'dotenv/config'
import bcrypt from 'bcryptjs';

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL as string,
})

const prisma = new PrismaClient({
  adapter,
});

async function main() {
  console.log("Starting seed...");

  const passHash = await bcrypt.hash('admin123', 10);
  const pinHash = await bcrypt.hash("1234", 10);

  const admin = await prisma.user.upsert({
  where: { id: 1 }, // Usa el ID en lugar del email
  update: {},
  create: {
    id: 1,
    email: 'admin@comal.com',
    username: 'admin',
    password: passHash,
    role: 'ADMIN',
    name: 'Administrador',
    active: true
  },
});

  const staff = await prisma.user.upsert({
    where: { id: 2 },
    update: {},
    create: {
      id: 2,
      name: 'Juan Perez',
      username: 'juanp',
      pin: pinHash,
      role: 'STAFF',
      active: true
    }
  });

  await prisma.customer.upsert({
    where: { id: 1 },
    update: {},
    create: {
      id: 1,
      customerName: 'Maria Garcia',
      phone: '2221234567',
      alias: 'Mari',
      currentBalance: 0,
      registeredDate: new Date('2025-12-01')
    }
  });

  const customerDebtor = await prisma.customer.upsert({
    where: { id: 2 },
    update: {},
    create: {
      id: 2,
      customerName: 'Ricardo Soto',
      phone: '2229876543',
      alias: 'Richie',
      currentBalance: 150.50,
      registeredDate: new Date('2025-12-15')
    }
  });

  const taco = await prisma.products.upsert({
    where: { id: 1 },
    update: {},
    create: { id: 1, name: 'Tacos al Pastor (Orden)', price: 75.00 }
  });

  const tortilla = await prisma.supplies.upsert({
    where: { id: 1 },
    update: {},
    create: { id: 1, name: 'Tortillas', measureUnit: 'kg', currentStock: 10.5 }
  });


await prisma.recipes.upsert({
  where: {
    productID_supplyID: {
      productID: taco.id,
      supplyID: tortilla.id,
    }
  },
  update: {},
  create: {
    productID: taco.id,
    supplyID: tortilla.id,
    quantityUsed: 0.150
  }
});

  const venta = await prisma.sales.create({
    data: {
      id: 1,
      total: 175.00,
      status: 'PAID',
      source_type: 'DINE_IN',
      customerID: 1,
      placedBy: staff.id,
      createdAt: new Date()
    }
  });

  await prisma.sale_items.create({
    data: {
      saleID: venta.id,
      productID: taco.id,
      quantity: 2,
      unitPrice: 75.00,
      subtotal: 150.00
    }
  });

  await prisma.bill.create({
    data: {
      id: 1,
      description: 'Renta Enero',
      amount: 5000,
      category: 'RENT',
      date: new Date('2026-01-01'),
      registered_by: admin.id
    }
  });

await prisma.salary.create({
  data: {
    userID: staff.id,
    amount: 1200,
    payDate: new Date(),
    period: 'WEEKLY_01'
  }
});

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
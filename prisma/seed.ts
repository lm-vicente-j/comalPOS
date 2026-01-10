import { PrismaClient, Prisma } from "@/app/generated/prisma/client"
import { PrismaClientOptions } from "@prisma/client/runtime/client"
import { PrismaPg } from '@prisma/adapter-pg'
import 'dotenv/config'

import bcrypt from 'bcryptjs';

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL,
})

const prisma = new PrismaClient({
  adapter,
});

async function main() {

  const passHash = await bcrypt.hash('admin', 10);
  const pinHash = await bcrypt.hash("1234", 10);
  
  await prisma.user.upsert({
    where: { email: 'admin@comal.com' },
    update: {},
    create: {
      email: 'admin@comal.com',
      password: passHash,
      role: 'ADMIN',
      name: 'Administrador'
    },
  })

  await prisma.user.create({
    data: {
      pin: pinHash, 
      role: 'STAFF',
      name: 'Juan Perez'
    }
  })
}



main()
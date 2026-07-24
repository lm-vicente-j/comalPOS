import { PrismaClient } from '../app/generated/prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'

const globalForPrisma = global as unknown as {
    prisma: PrismaClient
}

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL,
  // Serverless: keep each instance to a single pooled connection and let the
  // database pooler (e.g. Supabase's transaction pooler on :6543) fan out.
  // Without this, node-postgres opens up to 10 per instance and concurrent
  // invocations exhaust the pooler's client limit.
  max: 1,
})

const prisma = globalForPrisma.prisma || new PrismaClient({
  adapter,
})

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma

export default prisma
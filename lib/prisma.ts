import { PrismaClient } from '../app/generated/prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'

const globalForPrisma = global as unknown as {
    prisma: PrismaClient
}

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL,
  // Serverless against a transaction pooler (e.g. Supabase's :6543), which
  // absorbs far more clients than a direct connection would. A small pool
  // per instance lets parallel queries (the POS page loads in one
  // Promise.all batch) actually overlap; max: 1 serialized every query on a
  // single socket and made each reload pay ~15 round-trips in a queue.
  max: 4,
})

const prisma = globalForPrisma.prisma || new PrismaClient({
  adapter,
})

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma

export default prisma
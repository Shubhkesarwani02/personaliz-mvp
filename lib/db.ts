import { PrismaClient } from "@prisma/client"
import { neon } from "@neondatabase/serverless"

// Global Prisma client for ORM operations
declare global {
  var prisma: PrismaClient | undefined
}

export const prisma = globalThis.prisma || new PrismaClient()

if (process.env.NODE_ENV !== "production") {
  globalThis.prisma = prisma
}

// Raw SQL client for complex queries (keeping existing functionality)
let _sql: ReturnType<typeof neon> | null = null

export function getDb() {
  if (!_sql) {
    const url = process.env.DATABASE_URL
    if (!url) {
      throw new Error("DATABASE_URL is not set")
    }
    _sql = neon(url)
  }
  return _sql
}

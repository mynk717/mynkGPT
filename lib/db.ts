import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "./generated/prisma/client";
import pg from "pg";



const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

/**
 * Creates a Prisma client backed by the PostgreSQL adapter.
 *
 * @throws {Error} When `DATABASE_URL` is not set.
 */
function createPrismaClient() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error("DATABASE_URL is not set");
  }

  
  const pool = new pg.Pool({ connectionString: url });
  const adapter = new PrismaPg(pool);
  return new PrismaClient({ adapter });
}


/** Singleton Prisma client; reused in development to avoid hot-reload connection leaks. */
export const prisma = globalForPrisma.prisma ?? createPrismaClient();


if(process.env.NODE_ENV !== "production"){
    globalForPrisma.prisma = prisma;
}
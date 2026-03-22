import { PrismaClient } from "@/app/generated/prisma/client";
import { PrismaNeonHttp } from "@prisma/adapter-neon";

const globalForPrisma = global as unknown as { prisma: PrismaClient };

function createPrismaClient() {
  return new PrismaClient({
    adapter: new PrismaNeonHttp(process.env.DATABASE_URL!, { arrayMode: false, fullResults: false }),
  });
}

export const prisma = globalForPrisma.prisma || createPrismaClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;

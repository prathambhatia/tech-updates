import { PrismaClient } from "@prisma/client";
import { withAccelerate } from "@prisma/extension-accelerate";

import { env } from "@/lib/env";

const globalForPrisma = globalThis as unknown as {
  prisma?: PrismaClient;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    datasources: {
      db: {
        url: env.DATABASE_URL
      }
    }
  });

export const prismaRead = env.PRISMA_DATABASE_URL
  ? new PrismaClient({
      datasources: {
        db: {
          url: env.PRISMA_DATABASE_URL
        }
      }
    }).$extends(withAccelerate())
  : null;

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}

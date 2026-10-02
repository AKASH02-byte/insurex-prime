import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../generated/prisma/client.js";

export type Database = PrismaClient;

export function createDatabase(databaseUrl: string, poolMax?: number): Database {
  const adapter = new PrismaPg({
    connectionString: databaseUrl,
    ...(poolMax ? { max: poolMax } : {}),
  });
  return new PrismaClient({ adapter });
}

export async function isDatabaseReachable(db: Database): Promise<boolean> {
  try {
    await db.$queryRaw`SELECT 1`;
    return true;
  } catch {
    return false;
  }
}

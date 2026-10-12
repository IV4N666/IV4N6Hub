import { PrismaClient } from "@prisma/client";

function getNormalizedDatabaseUrl(): string | undefined {
  let url = process.env.DATABASE_URL;
  if (!url) return undefined;

  // Supabase pooler requires pgbouncer=true to disable prepared statements (fixes PostgresError 26000)
  if (
    (url.includes("pooler.supabase.com") || url.includes(":6543")) &&
    !url.includes("pgbouncer=true")
  ) {
    const sep = url.includes("?") ? "&" : "?";
    url = `${url}${sep}pgbouncer=true`;
  }
  return url;
}

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

const normalizedUrl = getNormalizedDatabaseUrl();

export const db =
  globalForPrisma.prisma ??
  new PrismaClient({
    datasources: normalizedUrl ? { db: { url: normalizedUrl } } : undefined,
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });

globalForPrisma.prisma = db;


import { PrismaClient } from '@prisma/client';
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { resolveDatabaseUrl } = require('./databaseUrl.js') as { resolveDatabaseUrl: () => string | undefined };

const globalForPrisma = globalThis as typeof globalThis & { prisma?: PrismaClient };

function createPrismaClient(): PrismaClient {
  const url = resolveDatabaseUrl();
  return new PrismaClient({
    log: ['warn', 'error'],
    ...(url ? { datasourceUrl: url } : {}),
  });
}

/**
 * In development, `globalForPrisma.prisma` can outlive `prisma generate`. The old
 * client then has no delegate for new models (e.g. hallBookingSettings), which breaks
 * at runtime until the dev server is restarted. Recreate the client when we detect that.
 */
function getPrismaClient(): PrismaClient {
  let client = globalForPrisma.prisma;
  if (!client) {
    // Always reuse one client. (Previously production skipped this cache, so every query
    // opened a new connection pool and the database quickly ran out of connections.)
    client = createPrismaClient();
    globalForPrisma.prisma = client;
    return client;
  }
  const c = client as unknown as {
    hallBookingSettings?: { findUnique: unknown };
    churchBankAccount?: { findUnique: unknown };
    processAttachment?: { findMany: unknown };
  };
  if (
    process.env.NODE_ENV !== 'production' &&
    (typeof c.hallBookingSettings?.findUnique !== 'function' ||
      typeof c.churchBankAccount?.findUnique !== 'function' ||
      typeof c.processAttachment?.findMany !== 'function')
  ) {
    void client.$disconnect().catch(() => {});
    client = createPrismaClient();
    globalForPrisma.prisma = client;
  }
  return client;
}

/** Proxy so every access runs getPrismaClient() and can refresh a stale dev singleton. */
export const prisma: PrismaClient = new Proxy({} as PrismaClient, {
  get(_target, prop, _receiver) {
    const client = getPrismaClient();
    const value = Reflect.get(client, prop, client);
    if (typeof value === 'function') {
      return value.bind(client);
    }
    return value;
  }
});

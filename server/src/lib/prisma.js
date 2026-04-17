import { PrismaClient } from '@prisma/client';

// The default client (connected to the main/control database)
const centralPrisma = new PrismaClient();

// Cache for tenant-specific Prisma clients to avoid re-instantiating on every request
const clientCache = new Map();

/**
 * Factory function to get or create a Prisma client for a specific studio
 * @param {string} databaseUrl - The connection string for the studio's database
 * @returns {PrismaClient}
 */
export const getTenantClient = (databaseUrl) => {
  if (!databaseUrl) {
    // If no specific URL is provided, fall back to the central database
    // (Useful for development or shared-hosting scenarios)
    return centralPrisma;
  }

  if (clientCache.has(databaseUrl)) {
    return clientCache.get(databaseUrl);
  }

  const tenantPrisma = new PrismaClient({
    datasources: {
      db: {
        url: databaseUrl,
      },
    },
  });

  clientCache.set(databaseUrl, tenantPrisma);
  return tenantPrisma;
};

export default centralPrisma;
export { centralPrisma };

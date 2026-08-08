import "dotenv/config";

import { defineConfig } from "prisma/config";

// Prisma 7 removed `url` from the schema's datasource block — the connection
// string lives here instead, and .env is no longer auto-loaded, hence the
// explicit dotenv import above.
export default defineConfig({
  schema: "prisma/schema.prisma",
  datasource: {
    url: process.env.DATABASE_URL,
  },
  migrations: {
    seed: "node --experimental-strip-types prisma/seed.ts",
  },
});

import "dotenv/config";
import { config } from "dotenv";
config({ path: ".env.local", override: true }); // .env.local takes precedence over .env
import { defineConfig } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    // Unpooled connection required for migrations (Neon pgbouncer doesn't support DDL)
    url: process.env["DATABASE_URL_UNPOOLED"] ?? process.env["DATABASE_URL"],
  },
});

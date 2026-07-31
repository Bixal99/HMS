import "dotenv/config";
import { defineConfig } from "prisma/config";

/**
 * Do not use env("DATABASE_URL") here — it throws when the var is unset, and
 * every Prisma CLI command loads this file (including `prisma generate` in
 * postinstall / Vercel install). Generate does not need a real DB URL; migrate
 * and runtime still require DATABASE_URL via process.env.
 */
export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "tsx prisma/seed.ts",
  },
  datasource: {
    url: process.env.DATABASE_URL ?? "",
  },
});

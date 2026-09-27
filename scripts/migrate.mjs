import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { neon } from "@neondatabase/serverless";

for (const file of [".env.local", ".env"]) {
  const path = resolve(file);
  if (existsSync(path)) process.loadEnvFile(path);
}

const connectionString = process.env.DATABASE_URL_UNPOOLED || process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("DATABASE_URL_UNPOOLED atau DATABASE_URL wajib tersedia.");
}

const sql = neon(connectionString);
const migration = await readFile(resolve("migrations/001_initial_schema.sql"), "utf8");

await sql.transaction(migration.split(";").map((statement) => statement.trim()).filter(Boolean).map((statement) => sql.query(statement)));
console.log("Migration database selesai.");

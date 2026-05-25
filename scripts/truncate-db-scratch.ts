import { neon } from "@neondatabase/serverless";
import * as dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

async function run() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    console.error("DATABASE_URL not set");
    return;
  }
  const sql = neon(url);
  console.log("Truncating workspaces table...");
  await sql`TRUNCATE TABLE workspaces CASCADE;`;
  console.log("Truncated successfully!");
}

run().catch(console.error);

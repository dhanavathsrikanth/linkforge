import { db, scanScreenshots } from "../src/lib/db";
import { uploadToR2WithKey, getFromR2 } from "../src/lib/r2";
import { isNotNull, isNull, eq } from "drizzle-orm";
import { config } from "dotenv";

config({ path: ".env.local" });

const BATCH_SIZE = 20;

async function migrate() {
  if (!process.env.CLOUDFLARE_R2_ACCESS_KEY_ID) {
    console.error("R2 not configured");
    process.exit(1);
  }

  let offset = 0;
  let migrated = 0;
  let skipped = 0;

  while (true) {
    const rows = await db.query.scanScreenshots.findMany({
      where: isNotNull(scanScreenshots.bytes),
      limit: BATCH_SIZE,
      offset,
      orderBy: (t, { asc }) => [asc(t.createdAt)],
    });

    if (rows.length === 0) break;

    for (const row of rows) {
      const r2Key = `screenshots/${row.scanId}/${row.resolution}.png`;
      const existing = await getFromR2(r2Key).catch(() => null);
      if (existing) {
        skipped++;
        continue;
      }

      if (!row.bytes) {
        skipped++;
        continue;
      }
      try {
        await uploadToR2WithKey(r2Key, row.bytes, row.mimeType);
        await db.update(scanScreenshots)
          .set({ r2Key, bytes: null })
          .where(eq(scanScreenshots.id, row.id));
        migrated++;
        console.log(`Migrated: ${row.id} (${row.scanId}/${row.resolution}) -> ${r2Key}`);
      } catch (err) {
        console.error(`Failed: ${row.id}:`, err);
      }
    }

    offset += BATCH_SIZE;
  }

  console.log(`\nDone: ${migrated} migrated, ${skipped} already in R2`);
}

migrate().catch(console.error);

import { db, linkGalleryAssets } from "../src/lib/db";
import { uploadToR2 } from "../src/lib/r2";
import { eq, isNotNull } from "drizzle-orm";
import { config } from "dotenv";

config({ path: ".env.local" });

const R2_PREFIX = "r2:";
const BATCH_SIZE = 50;

async function migrate() {
  if (!process.env.CLOUDFLARE_R2_ACCESS_KEY_ID) {
    console.error("R2 not configured. Set CLOUDFLARE_R2_ACCESS_KEY_ID, CLOUDFLARE_R2_SECRET_ACCESS_KEY, and CLOUDFLARE_R2_ACCOUNT_ID");
    process.exit(1);
  }

  let offset = 0;
  let migrated = 0;
  let skipped = 0;

  while (true) {
    const assets = await db.query.linkGalleryAssets.findMany({
      where: isNotNull(linkGalleryAssets.data),
      limit: BATCH_SIZE,
      offset,
      orderBy: (t, { asc }) => [asc(t.createdAt)],
    });

    if (assets.length === 0) break;

    for (const asset of assets) {
      if (asset.data.startsWith(R2_PREFIX)) {
        skipped++;
        continue;
      }

      const rawBase64 = asset.data.includes(",") ? asset.data.split(",")[1] : asset.data;
      const binary = Buffer.from(rawBase64, "base64");

      try {
        const key = await uploadToR2(asset.id, asset.filename, binary, asset.mimeType);
        await db.update(linkGalleryAssets)
          .set({ data: `${R2_PREFIX}${key}` })
          .where(eq(linkGalleryAssets.id, asset.id));
        migrated++;
        console.log(`Migrated: ${asset.id} (${asset.filename}) -> ${key}`);
      } catch (err) {
        console.error(`Failed: ${asset.id} (${asset.filename}):`, err);
      }
    }

    offset += BATCH_SIZE;
  }

  console.log(`\nDone: ${migrated} migrated, ${skipped} already in R2`);
}

migrate().catch(console.error);

import "dotenv/config";
import { Svix } from "svix";
import { EVENT_TYPES } from "../src/lib/svix/event-types";

const apiKey = process.env.SVIX_API_KEY;
const serverUrl = process.env.SVIX_SERVER_URL || "https://api.svix.com";

if (!apiKey) {
  console.error("SVIX_API_KEY is required");
  process.exit(1);
}

const svix = new Svix(apiKey, { serverUrl });

async function seedEventTypes() {
  console.log("Registering event types with Svix...");

  for (const et of EVENT_TYPES) {
    const featureFlags = "featureFlags" in et ? [...et.featureFlags] : undefined;

    try {
      const existing = await svix.eventType.get(et.name);
      await svix.eventType.update(et.name, {
        description: et.description,
        schemas: et.schemas,
        archived: et.archived,
        featureFlag: featureFlags?.[0] ?? null,
      });
      console.log(`  Updated: ${et.name}`);
    } catch {
      await svix.eventType.create({
        name: et.name,
        description: et.description,
        schemas: et.schemas,
        archived: et.archived,
        featureFlags,
      });
      console.log(`  Created: ${et.name}`);
    }
  }

  console.log("Done! All event types registered.");
}

seedEventTypes().catch((err) => {
  console.error("Failed to seed event types:", err);
  process.exit(1);
});

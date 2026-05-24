import { db } from "@/lib/db";
import { workspaceTags } from "@/lib/db/schema";
import { sql } from "drizzle-orm";

export async function syncTagsToWorkspace(workspaceId: string, tags: string[]) {
  if (!tags || tags.length === 0) return;

  // 1. Insert any missing tags into workspace_tags
  for (const raw of tags) {
    const name = raw.toLowerCase().trim();
    if (!name) continue;

    await db
      .insert(workspaceTags)
      .values({
        workspaceId,
        name,
        color: "#433BFF",
        usageCount: 0,
      })
      .onConflictDoNothing();
  }

  // 2. Recalculate usage counts for all tags in this workspace to keep it 100% accurate!
  try {
    const counts = (await db.execute(
      sql`
        SELECT tag, COUNT(*)::int as count 
        FROM links, unnest(tags) as tag 
        WHERE workspace_id = ${workspaceId}::uuid
        GROUP BY tag
      `
    )) as unknown as { rows: { tag: string; count: number }[] };

    // Reset usage counts to 0 first
    await db.execute(
      sql`UPDATE workspace_tags SET usage_count = 0 WHERE workspace_id = ${workspaceId}::uuid`
    );

    // Update with exact counts
    for (const row of counts.rows) {
      await db.execute(
        sql`
          UPDATE workspace_tags 
          SET usage_count = ${row.count} 
          WHERE workspace_id = ${workspaceId}::uuid AND name = ${row.tag.toLowerCase()}
        `
      );
    }
  } catch (error) {
    console.error("Failed to recalculate tag usage counts:", error);
  }
}

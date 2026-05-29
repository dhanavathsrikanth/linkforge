import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db, linkGalleryBlocks } from "@/lib/db";
import { getOrCreateDbUser } from "@/lib/auth";
import { eq } from "drizzle-orm";
import { validateBlockData } from "@/lib/bio/blocks";

// PATCH /api/bio/blocks/:blockId/data — update block data with Zod validation
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ blockId: string }> }
) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const dbUser = await getOrCreateDbUser();
  if (!dbUser) return NextResponse.json({ error: "User not found" }, { status: 401 });

  const { blockId } = await params;

  const block = await db.query.linkGalleryBlocks.findFirst({
    where: eq(linkGalleryBlocks.id, blockId),
  });
  if (!block) {
    return NextResponse.json({ error: "Block not found" }, { status: 404 });
  }

  const body = await req.json();

  const validation = validateBlockData(block.type, body);
  if (!validation.success) {
    return NextResponse.json(
      { error: validation.error ?? "Invalid block data" },
      { status: 400 }
    );
  }

  const [updated] = await db
    .update(linkGalleryBlocks)
    .set({
      data: validation.data ?? {},
      updatedAt: new Date(),
    })
    .where(eq(linkGalleryBlocks.id, blockId))
    .returning();

  return NextResponse.json({
    id: updated.id,
    updatedAt: updated.updatedAt,
  });
}

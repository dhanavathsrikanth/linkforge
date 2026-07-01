import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { clicks } from "@/lib/db/schema";
import { sql } from "drizzle-orm";

/**
 * GET  /api/internal/cleanup-country — diagnostic: show country distribution
 * POST /api/internal/cleanup-country — cleanup: reset invalid countries to NULL
 *
 * Protected by WORKER_SECRET.
 */
export async function GET(req: Request) {
  const secret = req.headers.get("x-worker-secret");
  if (!secret || secret !== process.env.WORKER_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const distribution = await db
      .select({
        country: clicks.country,
        count: sql<number>`count(*)::int`,
      })
      .from(clicks)
      .groupBy(clicks.country)
      .orderBy(sql`count(*) DESC`)
      .limit(20);

    const [total] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(clicks);

    return NextResponse.json({
      totalClicks: total?.count ?? 0,
      countryDistribution: distribution,
    });
  } catch (err) {
    console.error("[cleanup-country] GET error:", err);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const secret = req.headers.get("x-worker-secret");
  if (!secret || secret !== process.env.WORKER_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // Step 1: Count bad rows before cleanup
    const [before] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(clicks)
      .where(
        sql`${clicks.country} = 'Unknown' OR ${clicks.country} = 'XX' OR ${clicks.country} = '' OR ${clicks.country} IS NULL`
      );

    // Step 2: Set all invalid country values to NULL
    await db.execute(sql`
      UPDATE clicks
      SET country = NULL
      WHERE country = 'Unknown'
         OR country = 'XX'
         OR country = ''
    `);

    // Step 3: Count remaining rows with valid country codes
    const [total] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(clicks);

    const [withCountry] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(clicks)
      .where(sql`${clicks.country} IS NOT NULL`);

    return NextResponse.json({
      ok: true,
      cleanedRows: before?.count ?? 0,
      totalRows: total?.count ?? 0,
      rowsWithCountry: withCountry?.count ?? 0,
    });
  } catch (err) {
    console.error("[cleanup-country]", err);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

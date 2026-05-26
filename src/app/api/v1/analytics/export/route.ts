import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { clicks, links } from "@/lib/db/schema";
import { authenticateApiKey } from "@/lib/api-auth";
import { sql, eq, and, gte, lte } from "drizzle-orm";

export async function GET(request: Request) {
  const auth = await authenticateApiKey(request);
  if (auth instanceof NextResponse) return auth;

  const { searchParams } = new URL(request.url);
  const range = searchParams.get("range") || "30d";
  const linkId = searchParams.get("linkId") || undefined;

  const end = new Date();
  const days = range === "7d" ? 7 : range === "30d" ? 30 : range === "90d" ? 90 : 30;
  const start = new Date();
  start.setDate(start.getDate() - days);

  const conditions = [
    eq(clicks.workspaceId, auth.workspaceId),
    gte(clicks.createdAt, start),
    lte(clicks.createdAt, end),
  ];
  if (linkId) conditions.push(eq(clicks.linkId, linkId));

  const rows = await db
    .select({
      date: sql<string>`to_char(${clicks.createdAt}, 'YYYY-MM-DD')`,
      linkId: clicks.linkId,
      slug: links.slug,
      destination: links.destination,
      device: clicks.device,
      browser: clicks.browser,
      os: clicks.os,
      country: clicks.country,
      referrer: clicks.referrer,
    })
    .from(clicks)
    .leftJoin(links, eq(clicks.linkId, links.id))
    .where(and(...conditions))
    .orderBy(sql`${clicks.createdAt} desc`);

  const header = "date,linkId,slug,destination,device,browser,os,country,referrer\n";
  const csv = header + rows
    .map((r) =>
      [r.date, r.linkId, r.slug, `"${(r.destination || "").replace(/"/g, '""')}"`, r.device, r.browser, r.os, r.country, `"${(r.referrer || "").replace(/"/g, '""')}"`].join(",")
    )
    .join("\n");

  return new NextResponse(csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv",
      "Content-Disposition": `attachment; filename="pivoturl-analytics-${range}.csv"`,
    },
  });
}

import { NextResponse } from "next/server";
import { aiComplete } from "@/lib/ai/client";
import { db } from "@/lib/db";
import { clicks, links } from "@/lib/db/schema";
import { eq, gte, count, sql } from "drizzle-orm";

export async function POST(req: Request) {
  try {
    const { workspaceId, question } = await req.json();
    if (!workspaceId || !question) {
      return NextResponse.json({ error: "workspaceId and question required" }, { status: 400 });
    }

    // Gather analytics data for the AI to reason over
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const [clickCount, uniqueVisitors, topLinks, deviceBreakdown] = await Promise.all([
      db
        .select({ total: count() })
        .from(clicks)
        .where(eq(clicks.workspaceId, workspaceId)),
      db
        .select({ unique: sql<number>`count(distinct ${clicks.ip})` })
        .from(clicks)
        .where(eq(clicks.workspaceId, workspaceId)),
      db
        .select({
          slug: links.slug,
          clicks: links.totalClicks,
          title: links.title,
        })
        .from(links)
        .where(eq(links.workspaceId, workspaceId))
        .orderBy(sql`${links.totalClicks} desc`)
        .limit(10),
      db
        .select({
          device: clicks.device,
          count: count(),
        })
        .from(clicks)
        .where(sql`${clicks.createdAt} >= ${sevenDaysAgo}`)
        .groupBy(clicks.device),
    ]);

    const recentClicks = clickCount[0]?.total ?? 0;
    const uniqueClicks = uniqueVisitors[0]?.unique ?? 0;

    const ctx = {
      totalClicks: recentClicks,
      uniqueClicks,
      topLinks: topLinks.map((l) => ({
        slug: l.slug,
        title: l.title,
        clicks: l.clicks,
      })),
      deviceBreakdown: deviceBreakdown.map((d) => ({
        device: d.device,
        clicks: d.count,
      })),
      period: "all time (top links), last 7 days (device breakdown)",
    };

    const answer = await aiComplete(
      [
        {
          role: "system",
          content: `You are an analytics assistant. Answer the user's question concisely using the provided analytics data.
If the question asks about something not in the data, say so.
Keep answers under 3 sentences. Reference specific numbers.`,
        },
        {
          role: "user",
          content: `Analytics data:\n${JSON.stringify(ctx)}\n\nQuestion: ${question}`,
        },
      ],
      { maxTokens: 300, temperature: 0.2 }
    );

    return NextResponse.json({
      question,
      answer,
      data: ctx,
    });
  } catch (err) {
    console.error("[POST /api/ai/analytics-query]", err);
    return NextResponse.json({ error: "Query failed" }, { status: 500 });
  }
}

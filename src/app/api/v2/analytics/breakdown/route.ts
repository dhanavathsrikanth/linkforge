import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { clicks } from "@/lib/db/schema";
import { authenticateApiKey } from "@/lib/api-auth";
import { sql, eq, and, gte, lte, desc } from "drizzle-orm";

const countryNames: Record<string, string> = {
  US: "United States", GB: "United Kingdom", DE: "Germany", FR: "France",
  CA: "Canada", AU: "Australia", JP: "Japan", BR: "Brazil", IN: "India",
  MX: "Mexico", ES: "Spain", IT: "Italy", NL: "Netherlands", SE: "Sweden",
  NO: "Norway", DK: "Denmark", FI: "Finland", CH: "Switzerland", AT: "Austria",
  BE: "Belgium", IE: "Ireland", PT: "Portugal", PL: "Poland", CZ: "Czech Republic",
  RU: "Russia", CN: "China", KR: "South Korea", SG: "Singapore", HK: "Hong Kong",
  AE: "United Arab Emirates", SA: "Saudi Arabia", ZA: "South Africa", NG: "Nigeria",
  EG: "Egypt", AR: "Argentina", CL: "Chile", CO: "Colombia", PE: "Peru",
  NZ: "New Zealand", ID: "Indonesia", MY: "Malaysia", TH: "Thailand", PH: "Philippines",
  VN: "Vietnam", TR: "Turkey", UA: "Ukraine", RO: "Romania", HU: "Hungary",
  GR: "Greece", IL: "Israel", PK: "Pakistan", BD: "Bangladesh",
};

function countryCodeToEmoji(countryCode: string): string {
  if (!countryCode || countryCode === "Unknown") return "🌍";
  const codePoints = countryCode.toUpperCase().split("").map(c => 127397 + c.charCodeAt(0));
  return String.fromCodePoint(...codePoints);
}

function getCountryName(code: string): string {
  return countryNames[code || ""] || code || "Unknown";
}

function getDateRange(range: string, from?: string, to?: string): { start: Date; end: Date } {
  if (range === "custom" && from && to) return { start: new Date(from), end: new Date(to) };
  const end = new Date();
  const days = range === "7d" ? 7 : range === "30d" ? 30 : range === "90d" ? 90 : 7;
  const start = new Date();
  start.setDate(start.getDate() - days);
  return { start, end };
}

export async function GET(request: Request) {
  const auth = await authenticateApiKey(request);
  if (auth instanceof NextResponse) return auth;

  const { searchParams } = new URL(request.url);
  const linkId = searchParams.get("linkId") || undefined;
  const range = searchParams.get("range") || "7d";
  const dimension = searchParams.get("dimension") || "country";
  const from = searchParams.get("from") || undefined;
  const to = searchParams.get("to") || undefined;

  const { start, end } = getDateRange(range, from, to);

  const baseWhere = linkId
    ? and(
        eq(clicks.workspaceId, auth.workspaceId),
        eq(clicks.linkId, linkId),
        gte(clicks.createdAt, start),
        lte(clicks.createdAt, end)
      )
    : and(
        eq(clicks.workspaceId, auth.workspaceId),
        gte(clicks.createdAt, start),
        lte(clicks.createdAt, end)
      );

  const [totalResult] = await db
    .select({ total: sql<number>`count(*)::int` })
    .from(clicks)
    .where(baseWhere);
  const totalClicks = totalResult?.total || 1;

  let groupColumn: any;
  let labelField: any;

  switch (dimension) {
    case "country":
      groupColumn = clicks.country;
      labelField = sql<string>`COALESCE(${clicks.country}, 'Unknown')`;
      break;
    case "device":
      groupColumn = clicks.device;
      labelField = sql<string>`COALESCE(${clicks.device}, 'Unknown')`;
      break;
    case "browser":
      groupColumn = clicks.browser;
      labelField = sql<string>`COALESCE(${clicks.browser}, 'Unknown')`;
      break;
    case "os":
      groupColumn = clicks.os;
      labelField = sql<string>`COALESCE(${clicks.os}, 'Unknown')`;
      break;
    case "referrer":
      groupColumn = clicks.referrerDomain;
      labelField = sql<string>`COALESCE(${clicks.referrerDomain}, 'Direct')`;
      break;
    default:
      groupColumn = clicks.country;
      labelField = sql<string>`COALESCE(${clicks.country}, 'Unknown')`;
  }

  const breakdownData = await db
    .select({
      label: labelField,
      clicks: sql<number>`count(*)::int`,
    })
    .from(clicks)
    .where(baseWhere)
    .groupBy(groupColumn)
    .orderBy(desc(sql`count(*)`))
    .limit(20);

  const result = breakdownData.map((item) => ({
    label: dimension === "country"
      ? `${getCountryName(item.label)} ${countryCodeToEmoji(item.label)}`
      : item.label,
    clicks: item.clicks,
    percentage: Math.round((item.clicks / totalClicks) * 1000) / 10,
  }));

  return NextResponse.json({ data: result });
}

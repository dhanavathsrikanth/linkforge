import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { clicks, users, workspaces, workspaceMembers } from "@/lib/db/schema";
import { sql, eq, and, gte, lte, desc } from "drizzle-orm";

interface BreakdownData {
  label: string;
  clicks: number;
  percentage: number;
}

function getDateRange(
  range: string,
  from?: string,
  to?: string
): { start: Date; end: Date } {
  const now = new Date();
  const end = now;

  if (range === "custom" && from && to) {
    return { start: new Date(from), end: new Date(to) };
  }

  const days = range === "7d" ? 7 : range === "30d" ? 30 : range === "90d" ? 90 : 7;
  const start = new Date();
  start.setDate(start.getDate() - days);

  return { start, end };
}

// Country code to emoji mapping
function countryCodeToEmoji(countryCode: string): string {
  if (!countryCode || countryCode === "Unknown") return "🌍";
  const codePoints = countryCode
    .toUpperCase()
    .split("")
    .map(char => 127397 + char.charCodeAt(0));
  return String.fromCodePoint(...codePoints);
}

// Country code to full name mapping
const countryNames: Record<string, string> = {
  US: "United States",
  GB: "United Kingdom",
  DE: "Germany",
  FR: "France",
  CA: "Canada",
  AU: "Australia",
  JP: "Japan",
  BR: "Brazil",
  IN: "India",
  MX: "Mexico",
  ES: "Spain",
  IT: "Italy",
  NL: "Netherlands",
  SE: "Sweden",
  NO: "Norway",
  DK: "Denmark",
  FI: "Finland",
  CH: "Switzerland",
  AT: "Austria",
  BE: "Belgium",
  IE: "Ireland",
  PT: "Portugal",
  PL: "Poland",
  CZ: "Czech Republic",
  RU: "Russia",
  CN: "China",
  KR: "South Korea",
  SG: "Singapore",
  HK: "Hong Kong",
  AE: "United Arab Emirates",
  SA: "Saudi Arabia",
  ZA: "South Africa",
  NG: "Nigeria",
  EG: "Egypt",
  AR: "Argentina",
  CL: "Chile",
  CO: "Colombia",
  PE: "Peru",
  NZ: "New Zealand",
  ID: "Indonesia",
  MY: "Malaysia",
  TH: "Thailand",
  PH: "Philippines",
  VN: "Vietnam",
  TR: "Turkey",
  UA: "Ukraine",
  RO: "Romania",
  HU: "Hungary",
  GR: "Greece",
  IL: "Israel",
  PK: "Pakistan",
  BD: "Bangladesh",
};

function getCountryName(code: string): string {
  return countryNames[code || ""] || code || "Unknown";
}

export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const workspaceId = searchParams.get("workspaceId");
    const linkId = searchParams.get("linkId") || undefined;
    const range = searchParams.get("range") || "7d";
    const dimension = searchParams.get("dimension") || "country";
    const from = searchParams.get("from") || undefined;
    const to = searchParams.get("to") || undefined;

    if (!workspaceId) {
      return NextResponse.json({ error: "workspaceId is required" }, { status: 400 });
    }

    // Verify workspace ownership
    const workspace = await db.query.workspaces.findFirst({
      where: eq(workspaces.id, workspaceId),
    });

    const dbUser = await db.query.users.findFirst({
      where: eq(users.clerkId, userId),
    });
    if (!workspace || !dbUser) {
      return NextResponse.json({ error: "Workspace not found" }, { status: 404 });
    }

    // Allow access if user is owner OR a workspace member
    if (workspace.ownerId !== dbUser.id) {
      const [membership] = await db
        .select({ id: workspaceMembers.id })
        .from(workspaceMembers)
        .where(
          and(
            eq(workspaceMembers.workspaceId, workspace.id),
            eq(workspaceMembers.userId, dbUser.id)
          )
        )
        .limit(1);
      if (!membership) {
        return NextResponse.json({ error: "Workspace not found" }, { status: 404 });
      }
    }

    const { start, end } = getDateRange(range, from, to);

    // Optional source filter so the dashboard can pull "QR-only" breakdowns
    // separately from the link's other click sources.
    const sourceFilter = searchParams.get("source");
    const qrOnly = sourceFilter === "qr";

    // Build the where clause
    const baseWhere = linkId
      ? and(
          eq(clicks.workspaceId, workspaceId),
          eq(clicks.linkId, linkId),
          gte(clicks.createdAt, start),
          lte(clicks.createdAt, end),
          ...(qrOnly ? [eq(clicks.isQrScan, true)] : [])
        )
      : and(
          eq(clicks.workspaceId, workspaceId),
          gte(clicks.createdAt, start),
          lte(clicks.createdAt, end),
          ...(qrOnly ? [eq(clicks.isQrScan, true)] : [])
        );

    // Build the query based on dimension
    let groupColumn: any;
    let dimensionFilters: any[] = [];

    switch (dimension) {
      case "country":
        groupColumn = clicks.country;
        dimensionFilters = [
          sql`${clicks.country} IS NOT NULL`,
          sql`${clicks.country} != 'XX'`,
          sql`${clicks.country} != 'Unknown'`,
        ];
        break;
      case "city":
        groupColumn = clicks.city;
        dimensionFilters = [
          sql`${clicks.city} IS NOT NULL`,
          sql`${clicks.city} != ''`,
        ];
        break;
      case "region":
        groupColumn = clicks.region;
        dimensionFilters = [
          sql`${clicks.region} IS NOT NULL`,
          sql`${clicks.region} != ''`,
        ];
        break;
      case "device":
        groupColumn = clicks.device;
        dimensionFilters = [
          sql`${clicks.device} IS NOT NULL`,
          sql`${clicks.device} != 'unknown'`,
          sql`${clicks.device} != 'bot'`,
        ];
        break;
      case "browser":
        groupColumn = clicks.browser;
        dimensionFilters = [sql`${clicks.browser} IS NOT NULL`];
        break;
      case "os":
        groupColumn = clicks.os;
        dimensionFilters = [sql`${clicks.os} IS NOT NULL`];
        break;
      case "referrer":
        groupColumn = clicks.referrerDomain;
        dimensionFilters = [sql`${clicks.referrerDomain} IS NOT NULL`];
        break;
      default:
        groupColumn = clicks.country;
        dimensionFilters = [
          sql`${clicks.country} IS NOT NULL`,
          sql`${clicks.country} != 'XX'`,
          sql`${clicks.country} != 'Unknown'`,
        ];
    }

    const whereWithDimension = dimensionFilters.length > 0
      ? and(baseWhere, ...dimensionFilters)
      : baseWhere;

    // Get total clicks for percentage calculation using the same filters as breakdown data
    const totalResult = await db
      .select({
        total: sql<number>`count(*)::int`,
      })
      .from(clicks)
      .where(whereWithDimension);

    const totalClicks = totalResult[0]?.total || 1;

    // Use the raw column in both SELECT and GROUP BY to avoid
    // drizzle-orm GROUP BY + expression mismatch. Null handling is
    // done in app code below.
    const breakdownData = await db
      .select({
        label: groupColumn,
        clicks: sql<number>`count(*)::int`,
      })
      .from(clicks)
      .where(whereWithDimension)
      .groupBy(sql`${groupColumn}`)
      .orderBy(desc(sql`count(*)`))
      .limit(20);

    // Format the response with percentages
    const result = breakdownData.map((item) => {
      let label = item.label;
      if (label === null || label === undefined || label === "" || label === "XX") {
        label = dimension === "referrer" ? "Direct" : "Unknown";
      }
      if (dimension === "device" && label === "bot") label = "unknown";
      const countryCode = dimension === "country" && label !== "Unknown" ? label : undefined;
      return {
        label: dimension === "country" ? `${countryCodeToEmoji(label)} ${getCountryName(label)}` : label,
        clicks: item.clicks,
        percentage: Math.round((item.clicks / totalClicks) * 1000) / 10,
        ...(countryCode ? { countryCode } : {}),
      };
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error("Analytics breakdown error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
import { NextRequest, NextResponse } from "next/server";
import { setSessionData, getSessionData, deleteSessionData } from "@/lib/redis";
import { rateLimiters } from "@/lib/rate-limiter";

// POST - Create or update session
export async function POST(request: NextRequest) {
  const rateLimitResult = await rateLimiters.api(request);
  if (rateLimitResult instanceof NextResponse) {
    return rateLimitResult;
  }

  try {
    const { sessionId, data } = await request.json();

    if (!sessionId || !data) {
      return NextResponse.json(
        { error: "sessionId and data are required" },
        { status: 400 }
      );
    }

    // Store session data with 24-hour TTL
    await setSessionData(sessionId, data, 86400);

    return NextResponse.json({
      success: true,
      message: "Session data stored successfully",
      sessionId,
    });
  } catch (error) {
    console.error("Session POST error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// GET - Retrieve session data
export async function GET(request: NextRequest) {
  const rateLimitResult = await rateLimiters.api(request);
  if (rateLimitResult instanceof NextResponse) {
    return rateLimitResult;
  }

  try {
    const { searchParams } = new URL(request.url);
    const sessionId = searchParams.get("sessionId");

    if (!sessionId) {
      return NextResponse.json(
        { error: "sessionId is required" },
        { status: 400 }
      );
    }

    const sessionData = await getSessionData(sessionId);

    if (!sessionData) {
      return NextResponse.json(
        { error: "Session not found or expired" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      sessionId,
      data: sessionData,
    });
  } catch (error) {
    console.error("Session GET error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// DELETE - Remove session data
export async function DELETE(request: NextRequest) {
  const rateLimitResult = await rateLimiters.api(request);
  if (rateLimitResult instanceof NextResponse) {
    return rateLimitResult;
  }

  try {
    const { searchParams } = new URL(request.url);
    const sessionId = searchParams.get("sessionId");

    if (!sessionId) {
      return NextResponse.json(
        { error: "sessionId is required" },
        { status: 400 }
      );
    }

    await deleteSessionData(sessionId);

    return NextResponse.json({
      success: true,
      message: "Session deleted successfully",
      sessionId,
    });
  } catch (error) {
    console.error("Session DELETE error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

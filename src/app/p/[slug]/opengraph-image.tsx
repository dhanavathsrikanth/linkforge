import { ImageResponse } from "next/og";
import { db } from "@/lib/db";

export const runtime = "nodejs";
export const revalidate = 3600; // 1 hour

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function OgImage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  const gallery = await db.query.linkGallery.findFirst({
    where: (g, { and, eq }) => and(eq(g.slug, slug), eq(g.isPublished, true)),
  });

  // Fallback card when page not found or not published
  if (!gallery) {
    return new ImageResponse(
      (
        <div
          style={{
            width: "100%",
            height: "100%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: "linear-gradient(135deg, #0f172a 0%, #1e1b4b 100%)",
          }}
        >
          <span style={{ color: "#433BFF", fontSize: 64, fontWeight: 700 }}>
            PivotUrl
          </span>
        </div>
      ),
      { width: 1200, height: 630 }
    );
  }

  const displayName = gallery.displayName ?? slug;
  const bio = gallery.bio ?? "";
  const avatarUrl = gallery.avatarUrl ?? null;
  const initials = gallery.avatarInitials ?? displayName.slice(0, 2).toUpperCase();
  const avatarBg = gallery.avatarBgColor ?? "#433BFF";

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          background: "linear-gradient(135deg, #0f172a 0%, #1e1b4b 60%, #0f172a 100%)",
          padding: "64px 80px",
          fontFamily: "system-ui, -apple-system, sans-serif",
          position: "relative",
        }}
      >
        {/* Background grid pattern */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            backgroundImage:
              "radial-gradient(circle at 1px 1px, rgba(67,59,255,0.15) 1px, transparent 0)",
            backgroundSize: "40px 40px",
          }}
        />

        {/* Content */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            flex: 1,
            position: "relative",
            zIndex: 1,
          }}
        >
          {/* Avatar + Name row */}
          <div style={{ display: "flex", alignItems: "center", gap: 32, marginBottom: 32 }}>
            {/* Avatar */}
            {avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={avatarUrl}
                width={120}
                height={120}
                style={{ borderRadius: "50%", objectFit: "cover", border: "4px solid rgba(67,59,255,0.5)" }}
                alt={displayName}
              />
            ) : (
              <div
                style={{
                  width: 120,
                  height: 120,
                  borderRadius: "50%",
                  background: avatarBg,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 44,
                  fontWeight: 700,
                  color: "#fff",
                  border: "4px solid rgba(255,255,255,0.2)",
                }}
              >
                {initials}
              </div>
            )}

            {/* Name + slug */}
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <span
                style={{
                  fontSize: 56,
                  fontWeight: 800,
                  color: "#ffffff",
                  lineHeight: 1.1,
                  letterSpacing: "-0.02em",
                }}
              >
                {displayName}
              </span>
              <span
                style={{
                  fontSize: 24,
                  color: "rgba(255,255,255,0.5)",
                  fontWeight: 400,
                }}
              >
                pivoturl.com/p/{slug}
              </span>
            </div>
          </div>

          {/* Bio */}
          {bio && (
            <p
              style={{
                fontSize: 28,
                color: "rgba(255,255,255,0.75)",
                lineHeight: 1.5,
                maxWidth: 900,
                margin: 0,
                marginBottom: 40,
                // Clamp to 2 lines
                display: "-webkit-box",
                WebkitLineClamp: 2,
                WebkitBoxOrient: "vertical",
                overflow: "hidden",
              }}
            >
              {bio}
            </p>
          )}

          {/* Spacer */}
          <div style={{ flex: 1 }} />

          {/* Footer */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            {/* PivotUrl brand */}
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <div
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 10,
                  background: "#433BFF",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <svg
                  width="22"
                  height="22"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="white"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
                  <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
                </svg>
              </div>
              <span
                style={{
                  fontSize: 26,
                  fontWeight: 700,
                  color: "rgba(255,255,255,0.9)",
                  letterSpacing: "-0.01em",
                }}
              >
                PivotUrl
              </span>
            </div>

            {/* CTA pill */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                background: "rgba(67,59,255,0.25)",
                border: "1px solid rgba(67,59,255,0.5)",
                borderRadius: 9999,
                padding: "10px 24px",
              }}
            >
              <span style={{ fontSize: 20, color: "#a5b4fc", fontWeight: 600 }}>
                View all links →
              </span>
            </div>
          </div>
        </div>
      </div>
    ),
    { width: 1200, height: 630 }
  );
}

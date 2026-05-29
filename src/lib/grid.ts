// ─── Grid utilities for the bio page editor ──────────────────────────────────

export const GRID_COLS = 6;
export const GRID_ROW_HEIGHT = 60;
export const GRID_GAP = 8;

export const BLOCK_DEFAULT_SIZES: Record<string, { w: number; h: number }> = {
  header: { w: 6, h: 4 },
  "link-bar": { w: 6, h: 2 },
  "link-box": { w: 3, h: 2 },
  content: { w: 6, h: 3 },
  image: { w: 3, h: 4 },
  reaction: { w: 6, h: 2 },
  youtube: { w: 6, h: 5 },
  "spotify-embed": { w: 6, h: 5 },
  "spotify-playing-now": { w: 6, h: 3 },
  "tiktok-latest-post": { w: 3, h: 6 },
  "tiktok-follower-count": { w: 3, h: 2 },
  "instagram-latest-post": { w: 3, h: 4 },
  "instagram-follower-count": { w: 3, h: 2 },
  "threads-follower-count": { w: 3, h: 2 },
  "github-commits-this-month": { w: 6, h: 3 },
  stack: { w: 6, h: 3 },
  map: { w: 6, h: 5 },
  "waitlist-email": { w: 6, h: 3 },
  qr: { w: 3, h: 4 },
};

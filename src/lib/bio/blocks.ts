import { z } from "zod";

// ─── Individual Block Schemas ────────────────────────────────────────────

export const HeaderBlockDataSchema = z.object({
  title: z.string().min(1, "Please provide a title"),
  description: z.string().min(1, "Please provide a description"),
  avatar: z.object({ src: z.string().url("Invalid avatar URL").or(z.literal("")) }).optional(),
  showVerifiedBadge: z.boolean().optional(),
  verifiedPageTitle: z.string().optional(),
  alignment: z.enum(["left", "center", "right"]).optional(),
});

export const LinkBarBlockDataSchema = z.object({
  links: z.array(
    z.object({
      link: z.string().url("Please provide a valid URL"),
      icon: z.object({ src: z.string().min(1, "Please provide an icon") }),
      label: z.string().optional(),
    })
  ).min(1, "Please add at least one link"),
});

export const LinkBoxBlockDataSchema = z.object({
  title: z.string().min(1, "Please provide a title"),
  label: z.string().optional(),
  icon: z.object({ src: z.string().min(1, "Please provide an icon") }),
  link: z.string().url("Please provide a valid URL"),
  showPreview: z.boolean().optional(),
});

export const ContentBlockDataSchema = z.object({
  content: z.string().min(1, "Please provide content"),
  alignment: z.enum(["left", "center", "right"]).optional(),
});

export const ImageBlockDataSchema = z.object({
  src: z.string().min(1, "Please provide an image URL"),
  alt: z.string().optional(),
  caption: z.string().optional(),
  width: z.enum(["full", "auto"]).optional(),
  borderRadius: z.enum(["none", "sm", "md", "lg", "xl", "full"]).optional(),
});

export const ReactionBlockDataSchema = z.object({
  enabled: z.boolean().optional(),
  allowedReactions: z.array(z.string()).min(1).optional(),
});

export const YouTubeBlockDataSchema = z.object({
  videoId: z.string().min(1, "Please provide a video ID"),
  autoplay: z.boolean().optional(),
  showTitle: z.boolean().optional(),
});

export const SpotifyBlockDataSchema = z.object({
  embedUrl: z.string().url("Please provide a valid Spotify URL"),
  type: z.enum(["track", "playlist", "album"]).optional(),
});

export const WaitlistBlockDataSchema = z.object({
  title: z.string().min(1, "Please provide a title"),
  description: z.string().min(1, "Please provide a description"),
  buttonText: z.string().min(1, "Please provide button text"),
  successMessage: z.string().optional(),
  emailPlaceholder: z.string().optional(),
});

export const StackBlockDataSchema = z.object({
  title: z.string().min(1, "Please provide a title"),
  items: z.array(
    z.object({
      title: z.string().min(1, "Please provide a title"),
      label: z.string().optional(),
      link: z.string().url("Please provide a valid URL").optional(),
      icon: z.object({ src: z.string().min(1, "Please provide an icon") }),
    })
  ).min(1, "Please add at least one item"),
});

export const MapBlockDataSchema = z.object({
  latitude: z.number().min(-90).max(90, "Invalid latitude"),
  longitude: z.number().min(-180).max(180, "Invalid longitude"),
  zoom: z.number().min(1).max(20).optional(),
  markerTitle: z.string().optional(),
  mapStyle: z.enum(["default", "satellite", "terrain"]).optional(),
});

export const GitHubCommitsBlockDataSchema = z.object({
  githubUsername: z.string().min(1, "Please provide a GitHub username"),
});

export const InstagramLatestPostBlockDataSchema = z.object({
  numberOfPosts: z.number().int().min(1).max(10).optional(),
});

export const InstagramFollowerCountBlockDataSchema = z.object({}).optional();

export const ThreadsFollowerCountBlockDataSchema = z.object({}).optional();

export const TikTokFollowerCountBlockDataSchema = z.object({}).optional();

export const TikTokLatestPostBlockDataSchema = z.object({}).optional();

export const SpotifyPlayingNowBlockDataSchema = z.object({}).optional();

export const QRBlockDataSchema = z.object({
  url: z.string().optional(),
  useGalleryUrl: z.boolean().optional(),
  fgColor: z.string().optional(),
  bgColor: z.string().optional(),
  errorLevel: z.enum(["L", "M", "Q", "H"]).optional(),
  size: z.number().int().positive().optional(),
  margin: z.number().int().min(0).optional(),
  frameStyle: z.enum(["none", "scan-me"]).optional(),
  rounded: z.boolean().optional(),
});

// ─── Block Registry ──────────────────────────────────────────────────────

export const BLOCK_SCHEMAS: Record<string, z.ZodTypeAny> = {
  header: HeaderBlockDataSchema,
  "link-bar": LinkBarBlockDataSchema,
  "link-box": LinkBoxBlockDataSchema,
  content: ContentBlockDataSchema,
  image: ImageBlockDataSchema,
  reaction: ReactionBlockDataSchema,
  youtube: YouTubeBlockDataSchema,
  "spotify-embed": SpotifyBlockDataSchema,
  "spotify-playing-now": SpotifyPlayingNowBlockDataSchema,
  "waitlist-email": WaitlistBlockDataSchema,
  stack: StackBlockDataSchema,
  map: MapBlockDataSchema,
  qr: QRBlockDataSchema,
  "github-commits-this-month": GitHubCommitsBlockDataSchema,
  "instagram-latest-post": InstagramLatestPostBlockDataSchema,
  "instagram-follower-count": InstagramFollowerCountBlockDataSchema,
  "threads-follower-count": ThreadsFollowerCountBlockDataSchema,
  "tiktok-follower-count": TikTokFollowerCountBlockDataSchema,
  "tiktok-latest-post": TikTokLatestPostBlockDataSchema,
};

// ─── Validation Helpers ──────────────────────────────────────────────────

export function validateBlockData(blockType: string, data: unknown): {
  success: boolean;
  data?: Record<string, unknown>;
  error?: string;
} {
  const schema = BLOCK_SCHEMAS[blockType];
  if (!schema) {
    return { success: true, data: data as Record<string, unknown> };
  }

  const result = schema.safeParse(data);
  if (!result.success) {
    const firstError = result.error.issues[0];
    return {
      success: false,
      error: firstError?.message ?? "Invalid block data",
    };
  }

  return { success: true, data: result.data as Record<string, unknown> };
}

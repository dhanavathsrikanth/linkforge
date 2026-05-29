import { z } from "zod";

export const IntegrationTypeSchema = z.enum([
  "instagram",
  "spotify",
  "github",
  "tiktok",
  "threads",
]);

export type IntegrationType = z.infer<typeof IntegrationTypeSchema>;

export const IntegrationConfigSchema = z.record(z.string(), z.unknown());

// Per-integration config validation shapes
export const InstagramIntegrationConfigSchema = z.object({
  accessToken: z.string().min(1),
  instagramUserId: z.string().min(1),
  accountType: z.enum(["BUSINESS", "CREATOR"]).optional(),
  username: z.string().optional(),
});

export const SpotifyIntegrationConfigSchema = z.object({
  accessToken: z.string().min(1),
  refreshToken: z.string().min(1),
});

export const GitHubIntegrationConfigSchema = z.object({
  accessToken: z.string().min(1),
  username: z.string().min(1),
});

export const TikTokIntegrationConfigSchema = z.object({
  accessToken: z.string().min(1),
  refreshToken: z.string().min(1),
});

export const ThreadsIntegrationConfigSchema = z.object({
  accessToken: z.string().min(1),
  threadsUserId: z.string().min(1),
});

export function validateIntegrationConfig(
  type: string,
  config: unknown
): { success: boolean; error?: string } {
  const schemas: Record<string, z.ZodTypeAny> = {
    instagram: InstagramIntegrationConfigSchema,
    spotify: SpotifyIntegrationConfigSchema,
    github: GitHubIntegrationConfigSchema,
    tiktok: TikTokIntegrationConfigSchema,
    threads: ThreadsIntegrationConfigSchema,
  };

  const schema = schemas[type];
  if (!schema) {
    return { success: true };
  }

  const result = schema.safeParse(config);
  if (!result.success) {
    return {
      success: false,
      error: result.error.issues[0]?.message ?? "Invalid integration config",
    };
  }

  return { success: true };
}

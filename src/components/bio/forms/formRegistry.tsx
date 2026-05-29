import type { ComponentType } from "react";
import { HeaderForm } from "./HeaderForm";
import { LinkBoxForm } from "./LinkBoxForm";
import { LinkBarForm } from "./LinkBarForm";
import { LinksForm } from "./LinksForm";
import { ContentForm } from "./ContentForm";
import { ImageForm } from "./ImageForm";
import { StackForm } from "./StackForm";
import { YouTubeForm } from "./YouTubeForm";
import { SpotifyEmbedForm } from "./SpotifyEmbedForm";
import { MapForm } from "./MapForm";
import { WaitlistForm } from "./WaitlistForm";
import { GitHubForm } from "./GitHubForm";
import {
  SpotifyPlayingForm,
  InstagramLatestForm,
  InstagramFollowersForm,
  TikTokLatestForm,
  TikTokFollowersForm,
  ThreadsFollowersForm,
  ReactionsForm,
} from "./IntegrationForms";

export interface BlockFormProps {
  config: Record<string, unknown>;
  onSave: (config: Record<string, unknown>) => void;
  onCancel: () => void;
  /** Gallery ID — passed to FileUpload for asset association */
  galleryId: string;
  /** Block ID — passed to FileUpload to associate assets with the block */
  blockId: string;
}

export const BLOCK_FORM_REGISTRY: Record<string, ComponentType<BlockFormProps>> = {
  "header":                       HeaderForm,
  "link-box":                     LinkBoxForm,
  "link-bar":                     LinkBarForm,
  "links":                        LinksForm,
  "content":                      ContentForm,
  "image":                        ImageForm,
  "stack":                        StackForm,
  "youtube":                      YouTubeForm,
  "spotify-embed":                SpotifyEmbedForm,
  "spotify-playing-now":          SpotifyPlayingForm,
  "map":                          MapForm,
  "reaction":                     ReactionsForm,
  "waitlist-email":               WaitlistForm,
  "github-commits-this-month":    GitHubForm,
  "instagram-latest-post":        InstagramLatestForm,
  "instagram-follower-count":     InstagramFollowersForm,
  "threads-follower-count":       ThreadsFollowersForm,
  "tiktok-latest-post":           TikTokLatestForm,
  "tiktok-follower-count":        TikTokFollowersForm,
};

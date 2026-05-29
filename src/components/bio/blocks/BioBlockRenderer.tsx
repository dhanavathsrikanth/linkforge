"use client";

import type { BioBlock } from "@/components/bio/BioCanvas";
import { HeaderBlock } from "./HeaderBlock";
import { LinkBoxBlock } from "./LinkBoxBlock";
import { LinkBarBlock } from "./LinkBarBlock";
import { LinksBlock } from "./LinksBlock";
import { ContentBlock } from "./ContentBlock";
import { ImageBlock } from "./ImageBlock";
import { StackBlock } from "./StackBlock";
import { YouTubeBlock } from "./YouTubeBlock";
import { SpotifyEmbedBlock } from "./SpotifyEmbedBlock";
import { SpotifyPlayingBlock } from "./SpotifyPlayingBlock";
import { MapBlock } from "./MapBlock";
import { ReactionBlock } from "./ReactionBlock";
import { WaitlistBlock } from "./WaitlistBlock";
import { GitHubCommitsBlock } from "./GitHubCommitsBlock";
import { InstagramLatestBlock } from "./InstagramLatestBlock";
import { InstagramFollowersBlock } from "./InstagramFollowersBlock";
import { ThreadsFollowersBlock } from "./ThreadsFollowersBlock";
import { TikTokLatestBlock } from "./TikTokLatestBlock";
import { TikTokFollowersBlock } from "./TikTokFollowersBlock";

interface BioBlockRendererProps {
  block: BioBlock;
  isEditable: boolean;
  onDelete?: (id: string) => void;
}

export function BioBlockRenderer({ block, isEditable, onDelete }: BioBlockRendererProps) {
  const props = { block, isEditable, onDelete };

  switch (block.type) {
    case "header":
      return <HeaderBlock {...props} />;
    case "link-box":
      return <LinkBoxBlock {...props} />;
    case "link-bar":
      return <LinkBarBlock {...props} />;
    case "links":
      return <LinksBlock {...props} />;
    case "content":
      return <ContentBlock {...props} />;
    case "image":
      return <ImageBlock {...props} />;
    case "stack":
      return <StackBlock {...props} />;
    case "youtube":
      return <YouTubeBlock {...props} />;
    case "spotify-embed":
      return <SpotifyEmbedBlock {...props} />;
    case "spotify-playing-now":
      return <SpotifyPlayingBlock {...props} />;
    case "map":
      return <MapBlock {...props} />;
    case "reaction":
      return <ReactionBlock {...props} />;
    case "waitlist-email":
      return <WaitlistBlock {...props} />;
    case "github-commits-this-month":
      return <GitHubCommitsBlock {...props} />;
    case "instagram-latest-post":
      return <InstagramLatestBlock {...props} />;
    case "instagram-follower-count":
      return <InstagramFollowersBlock {...props} />;
    case "threads-follower-count":
      return <ThreadsFollowersBlock {...props} />;
    case "tiktok-latest-post":
      return <TikTokLatestBlock {...props} />;
    case "tiktok-follower-count":
      return <TikTokFollowersBlock {...props} />;
    default:
      return (
        <div className="w-full h-full flex items-center justify-center rounded-3xl bg-sys-bg-secondary border border-sys-bg-border text-sys-label-secondary text-sm">
          Unknown block: {block.type}
        </div>
      );
  }
}

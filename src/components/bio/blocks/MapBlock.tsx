"use client";

import { MapPin } from "lucide-react";
import { CoreBlock } from "@/components/bio/CoreBlock";
import type { BioBlock } from "@/components/bio/BioCanvas";

interface MapBlockConfig {
  latitude?: number;
  longitude?: number;
  zoom?: number;
  markerTitle?: string;
  mapStyle?: "default" | "satellite" | "terrain";
}

interface Props {
  block: BioBlock;
  isEditable: boolean;
  onDelete?: (id: string) => void;
}

/**
 * Build an OpenStreetMap embed URL.
 *
 * OSM's `embed.html` endpoint takes a bounding box rather than a zoom
 * level, so we compute a zoom-equivalent bbox. The longitude span at
 * zoom z (for a typical viewport ~3 tiles wide) is roughly:
 *
 *   span ≈ (360 / 2^z) × viewportTileMultiplier
 *
 * We also shrink the latitude span via the Mercator approximation so the
 * map looks right at high latitudes.
 */
function buildStaticMapUrl(lat: number, lng: number, zoom = 13): string {
  // Clamp zoom to a sensible range
  const z = Math.max(1, Math.min(20, Math.round(zoom)));
  // ~3 tiles wide for a typical bio card; tweak the multiplier to taste.
  const lonSpan = (360 / Math.pow(2, z)) * 3;
  // Latitude span shrinks with cos(lat) under Mercator
  const latSpan = lonSpan * Math.cos((lat * Math.PI) / 180);
  const minLng = lng - lonSpan / 2;
  const maxLng = lng + lonSpan / 2;
  const minLat = lat - latSpan / 2;
  const maxLat = lat + latSpan / 2;
  return (
    `https://www.openstreetmap.org/export/embed.html` +
    `?bbox=${minLng},${minLat},${maxLng},${maxLat}` +
    `&layer=mapnik` +
    `&marker=${lat},${lng}`
  );
}

export function MapBlock({ block, isEditable, onDelete }: Props) {
  const config = block.config as MapBlockConfig;
  const { latitude, longitude, zoom = 13, markerTitle } = config;

  const hasCoords =
    typeof latitude === "number" &&
    typeof longitude === "number" &&
    Number.isFinite(latitude) &&
    Number.isFinite(longitude);

  return (
    <CoreBlock
      blockId={block.id}
      blockType={block.type}
      isEditable={isEditable}
      className="relative !p-0 overflow-hidden"
      onDelete={onDelete}
    >
      {hasCoords ? (
        <>
          <iframe
            src={buildStaticMapUrl(latitude, longitude, zoom)}
            width="100%"
            height="100%"
            frameBorder={0}
            scrolling="no"
            title={markerTitle ?? "Map"}
            className="absolute inset-0 w-full h-full border-0"
            // `referrerPolicy` keeps OSM happy with cross-origin embeds,
            // and `loading=lazy` defers the iframe until in view.
            referrerPolicy="no-referrer-when-downgrade"
            loading="lazy"
          />
          {/* In editor mode, block all pointer events on the map so drag
              handlers on the grid item work and panning the map can't
              hijack a block-drag. The overlay sits on top of the iframe. */}
          {isEditable && (
            <div className="absolute inset-0 z-10" aria-hidden />
          )}
          {/* Marker title pill — overlays the map so the user sees what
              location is being shown without having to read tiny OSM text. */}
          {markerTitle && (
            <div className="absolute bottom-3 left-3 right-3 z-20 pointer-events-none flex justify-start">
              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/95 backdrop-blur-sm shadow-md text-stone-800 text-xs font-medium max-w-full">
                <MapPin className="w-3 h-3 shrink-0 text-stone-500" />
                <span className="truncate">{markerTitle}</span>
              </div>
            </div>
          )}
          {/* "Open in maps" link in view mode so visitors can jump to a
              real maps app. Suppressed in editor mode. */}
          {!isEditable && (
            <a
              href={`https://www.openstreetmap.org/?mlat=${latitude}&mlon=${longitude}#map=${Math.round(zoom)}/${latitude}/${longitude}`}
              target="_blank"
              rel="noopener noreferrer"
              className="absolute top-3 right-3 z-20 inline-flex items-center gap-1 px-2 py-1 rounded-full bg-white/95 backdrop-blur-sm shadow text-stone-700 hover:text-stone-900 text-[10px] font-semibold transition-colors"
              aria-label="Open in OpenStreetMap"
            >
              Open
            </a>
          )}
        </>
      ) : (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-sys-bg-secondary gap-2">
          <MapPin className="w-8 h-8 text-sys-label-tertiary" />
          <span className="text-sm text-sys-label-secondary text-center px-4">
            Edit this block to set a location.
          </span>
        </div>
      )}
    </CoreBlock>
  );
}

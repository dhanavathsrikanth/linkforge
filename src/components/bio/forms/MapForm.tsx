"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Search, MapPin, LocateFixed, Loader2 } from "lucide-react";
import { Field, TextInput, FormFooter } from "./shared";
import type { BlockFormProps } from "./formRegistry";

interface MapConfig {
  latitude?: number;
  longitude?: number;
  zoom?: number;
  markerTitle?: string;
}

interface NominatimResult {
  display_name: string;
  lat: string;
  lon: string;
  place_id?: number;
}

export function MapForm({ config: raw, onSave, onCancel }: BlockFormProps) {
  const init = raw as MapConfig;
  const [search, setSearch] = useState(init.markerTitle ?? "");
  const [results, setResults] = useState<NominatimResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [showResults, setShowResults] = useState(false);
  const [latitude, setLatitude] = useState<number | "">(init.latitude ?? "");
  const [longitude, setLongitude] = useState<number | "">(init.longitude ?? "");
  const [zoom, setZoom] = useState(init.zoom ?? 13);
  const [markerTitle, setMarkerTitle] = useState(init.markerTitle ?? "");
  const [locating, setLocating] = useState(false);
  const [saving, setSaving] = useState(false);

  // Debounced search-as-you-type. Nominatim's usage policy asks for ≤1
  // req/sec, so 400ms keeps us well under the limit.
  const searchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastQueryRef = useRef<string>("");

  // Track whether the user just selected a result so we don't re-trigger
  // a search from the resulting setSearch() call.
  const justSelectedRef = useRef(false);

  useEffect(() => {
    if (justSelectedRef.current) {
      justSelectedRef.current = false;
      return;
    }
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    const q = search.trim();
    if (q.length < 2) {
      setResults([]);
      setShowResults(false);
      setSearching(false);
      return;
    }
    searchTimerRef.current = setTimeout(() => {
      void runSearch(q);
    }, 400);
    return () => {
      if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  async function runSearch(q: string) {
    if (q === lastQueryRef.current) return;
    lastQueryRef.current = q;
    setSearching(true);
    setSearchError(null);
    setShowResults(true);
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(q)}&format=json&addressdetails=0&limit=8`,
        { headers: { "Accept-Language": "en" } }
      );
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data: NominatimResult[] = await res.json();
      // Drop late responses for older queries
      if (lastQueryRef.current !== q) return;
      setResults(data);
      if (data.length === 0) setSearchError("No matching places found.");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "search failed";
      setSearchError(`Couldn't reach the location service (${msg}).`);
      setResults([]);
    } finally {
      if (lastQueryRef.current === q) setSearching(false);
    }
  }

  function selectResult(r: NominatimResult) {
    const niceName = r.display_name.split(",")[0]?.trim() || r.display_name;
    justSelectedRef.current = true;
    setLatitude(parseFloat(r.lat));
    setLongitude(parseFloat(r.lon));
    setMarkerTitle(niceName);
    setSearch(niceName);
    setResults([]);
    setShowResults(false);
    setSearchError(null);
  }

  // Use the device's geolocation. Falls back gracefully on denial / no
  // browser support and reverse-geocodes the result so we can pre-fill
  // the marker title with a human-readable label.
  function useMyLocation() {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      setSearchError("Your browser doesn't support geolocation.");
      return;
    }
    setLocating(true);
    setSearchError(null);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude: lat, longitude: lng } = pos.coords;
        setLatitude(lat);
        setLongitude(lng);
        // Reverse geocode for a label — best-effort; ignore failures.
        try {
          const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&zoom=14`,
            { headers: { "Accept-Language": "en" } }
          );
          if (res.ok) {
            const body = (await res.json()) as { display_name?: string };
            const niceName = body.display_name?.split(",")[0]?.trim();
            if (niceName) {
              setMarkerTitle(niceName);
              justSelectedRef.current = true;
              setSearch(niceName);
            }
          }
        } catch {
          /* ignore — user can edit the marker title manually */
        } finally {
          setLocating(false);
        }
      },
      (err) => {
        setLocating(false);
        const msg =
          err.code === err.PERMISSION_DENIED
            ? "Location permission denied. You can still search or enter coordinates."
            : "Couldn't read your location.";
        setSearchError(msg);
      },
      { enableHighAccuracy: false, timeout: 10000, maximumAge: 60000 }
    );
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (latitude === "" || longitude === "") return;
    setSaving(true);
    onSave({
      latitude: Number(latitude),
      longitude: Number(longitude),
      zoom,
      markerTitle: markerTitle || undefined,
    });
  }

  // Build the preview src once per render so React doesn't see a fresh
  // string on every keystroke (saves an iframe reload).
  const previewSrc = useMemo(() => {
    if (latitude === "" || longitude === "") return null;
    const z = Math.max(1, Math.min(20, Math.round(zoom)));
    const lonSpan = (360 / Math.pow(2, z)) * 3;
    const latSpan = lonSpan * Math.cos((Number(latitude) * Math.PI) / 180);
    const minLng = Number(longitude) - lonSpan / 2;
    const maxLng = Number(longitude) + lonSpan / 2;
    const minLat = Number(latitude) - latSpan / 2;
    const maxLat = Number(latitude) + latSpan / 2;
    return `https://www.openstreetmap.org/export/embed.html?bbox=${minLng},${minLat},${maxLng},${maxLat}&layer=mapnik&marker=${latitude},${longitude}`;
  }, [latitude, longitude, zoom]);

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      {/* Location search — live as you type */}
      <Field label="Search location" htmlFor="map-search">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <TextInput
              id="map-search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onFocus={() => {
                if (results.length > 0) setShowResults(true);
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  if (results[0]) selectResult(results[0]);
                }
                if (e.key === "Escape") setShowResults(false);
              }}
              placeholder="Try “Eiffel Tower” or “Brooklyn Bridge”"
              autoComplete="off"
            />
            {searching ? (
              <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400 animate-spin pointer-events-none" />
            ) : (
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400 pointer-events-none" />
            )}
          </div>
          <button
            type="button"
            onClick={useMyLocation}
            disabled={locating}
            title="Use my current location"
            className="px-3 py-2 rounded-xl bg-stone-100 border border-stone-200 text-stone-600 hover:bg-stone-200 transition-colors cursor-pointer shrink-0 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {locating ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <LocateFixed className="w-4 h-4" />
            )}
          </button>
        </div>
      </Field>

      {/* Search results dropdown */}
      {showResults && (results.length > 0 || searching || searchError) && (
        <div className="-mt-2 flex flex-col bg-white border border-stone-200 rounded-xl overflow-hidden shadow-sm max-h-64 overflow-y-auto">
          {searching && results.length === 0 && (
            <div className="px-3 py-3 text-xs text-stone-400 flex items-center gap-2">
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              Searching…
            </div>
          )}
          {!searching && searchError && (
            <div className="px-3 py-3 text-xs text-stone-500">{searchError}</div>
          )}
          {results.map((r, i) => (
            <button
              key={r.place_id ?? i}
              type="button"
              onClick={() => selectResult(r)}
              className="flex items-start gap-2 px-3 py-2.5 text-left hover:bg-stone-50 transition-colors cursor-pointer border-b border-stone-100 last:border-0"
            >
              <MapPin className="w-3.5 h-3.5 text-stone-400 mt-0.5 shrink-0" />
              <span className="text-xs text-stone-700 line-clamp-2">{r.display_name}</span>
            </button>
          ))}
        </div>
      )}

      {/* Manual coordinates */}
      <div className="grid grid-cols-2 gap-3">
        <Field label="Latitude" htmlFor="map-lat">
          <TextInput
            id="map-lat"
            type="number"
            step="any"
            value={latitude}
            onChange={(e) => setLatitude(e.target.value === "" ? "" : parseFloat(e.target.value))}
            placeholder="40.7128"
          />
        </Field>
        <Field label="Longitude" htmlFor="map-lng">
          <TextInput
            id="map-lng"
            type="number"
            step="any"
            value={longitude}
            onChange={(e) => setLongitude(e.target.value === "" ? "" : parseFloat(e.target.value))}
            placeholder="-74.0060"
          />
        </Field>
      </div>

      <Field label="Zoom level" htmlFor="map-zoom" hint="1 (world) → 20 (street)">
        <div className="flex items-center gap-3">
          <input
            id="map-zoom"
            type="range"
            min={1}
            max={20}
            value={zoom}
            onChange={(e) => setZoom(Number(e.target.value))}
            className="flex-1 accent-primary"
          />
          <span className="text-sm font-mono text-stone-600 w-6 text-right">{zoom}</span>
        </div>
      </Field>

      <Field label="Marker title (optional)" htmlFor="map-marker">
        <TextInput
          id="map-marker"
          value={markerTitle}
          onChange={(e) => setMarkerTitle(e.target.value)}
          placeholder="Our office"
        />
      </Field>

      {/* Preview — interactive: clicking OSM's native +/- zoom controls
          and dragging to pan all work. Note: changes you make inside
          the preview are exploratory; the saved zoom is the slider
          value above. */}
      {previewSrc && (
        <div className="space-y-1.5">
          <div className="rounded-xl overflow-hidden border border-stone-200 h-44">
            <iframe
              src={previewSrc}
              width="100%"
              height="100%"
              frameBorder="0"
              scrolling="no"
              title="Map preview"
              loading="lazy"
            />
          </div>
          <p className="text-[11px] text-stone-400 px-1">
            Use the map controls to explore. The slider above is what gets saved.
          </p>
        </div>
      )}

      <FormFooter onCancel={onCancel} saving={saving} />
    </form>
  );
}

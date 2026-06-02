"use client";

import { useState } from "react";
import {
  ShieldAlert,
  ShieldOff,
  AlertTriangle,
  Globe2,
  Server,
  Calendar,
  ExternalLink,
  ArrowLeft,
} from "lucide-react";
import { TrustBadge, type TrustBand } from "@/components/safety/TrustBadge";

interface Props {
  slug: string;
  destination: string;
  destinationHost: string;
  reason: "flagged-malicious" | "blocked-by-owner";
  categories: string[];
  phishing: string[];
  asn: string | null;
  asnName: string | null;
  country: string | null;
  scannedAt: Date | null;
  trustScore: number | null;
  trustBand: TrustBand;
}

/**
 * Interstitial shown to visitors when a short link's destination has been
 * flagged as malicious by Cloudflare URL Scanner (or manually blocked by
 * the owner). The "Continue anyway" path sets a bypass cookie scoped to
 * this slug so re-clicks during the same session don't loop through here.
 */
export function BlockedInterstitial({
  slug,
  destination,
  destinationHost,
  reason,
  categories,
  phishing,
  asn,
  asnName,
  country,
  scannedAt,
  trustScore,
  trustBand,
}: Props) {
  const [bypassing, setBypassing] = useState(false);

  function handleContinue() {
    if (bypassing) return;
    setBypassing(true);
    // 5-minute bypass cookie — long enough to dismiss the warning and
    // navigate, short enough not to keep someone in a permanently
    // unprotected state.
    document.cookie = `safety_ack_${slug}=true; path=/; max-age=300; samesite=lax`;
    window.location.href = `/s/${slug}`;
  }

  const headerLabel =
    reason === "blocked-by-owner"
      ? "Link disabled by owner"
      : "Warning — this link may be unsafe";

  const headerSub =
    reason === "blocked-by-owner"
      ? "The owner of this short link has temporarily taken it offline."
      : "Cloudflare URL Scanner flagged the destination as potentially malicious.";

  const Icon = reason === "blocked-by-owner" ? ShieldOff : ShieldAlert;

  return (
    <div className="min-h-screen bg-stone-50 flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-xl rounded-2xl border border-red-200 bg-white shadow-xl shadow-red-200/40 overflow-hidden">
        {/* Header band */}
        <div className="bg-gradient-to-r from-red-600 to-rose-600 px-6 py-5 text-white">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-white/15 backdrop-blur">
              <Icon className="h-6 w-6" />
            </div>
            <div className="min-w-0">
              <h1 className="text-lg font-bold tracking-tight">{headerLabel}</h1>
              <p className="text-xs text-red-100/90 mt-0.5">{headerSub}</p>
            </div>
          </div>
        </div>

        {/* Body */}
        <div className="px-6 py-6 space-y-5">
          <div className="rounded-xl border border-stone-200 bg-stone-50/50 px-4 py-3">
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold uppercase tracking-wider text-stone-500">
                Destination
              </p>
              <TrustBadge score={trustScore} band={trustBand} size="sm" />
            </div>
            <p className="mt-1 font-mono text-sm text-stone-900 break-all">
              {destination}
            </p>
            <p className="mt-1 text-xs text-stone-500">
              Host: <span className="font-mono">{destinationHost}</span>
            </p>
          </div>

          {reason === "flagged-malicious" && (
            <div className="space-y-3">
              <div className="flex items-start gap-2 text-sm text-stone-700">
                <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5 text-amber-500" />
                <p>
                  Continuing may expose you to phishing, malware, or other
                  harmful content. We recommend going back unless you trust
                  this destination.
                </p>
              </div>

              {(categories.length > 0 || phishing.length > 0) && (
                <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 space-y-2">
                  {phishing.length > 0 && (
                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-wider text-amber-700">
                        Phishing detected
                      </p>
                      <p className="mt-0.5 text-sm text-amber-900">
                        {phishing.join(", ")}
                      </p>
                    </div>
                  )}
                  {categories.length > 0 && (
                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-wider text-amber-700">
                        Categories
                      </p>
                      <p className="mt-0.5 text-sm text-amber-900">
                        {categories.join(", ")}
                      </p>
                    </div>
                  )}
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
                {country && (
                  <div className="rounded-lg border border-stone-200 bg-stone-50 px-3 py-2">
                    <span className="flex items-center gap-1 text-stone-500 font-semibold uppercase tracking-wider">
                      <Globe2 className="h-3 w-3" /> Country
                    </span>
                    <span className="block mt-0.5 text-stone-900">{country}</span>
                  </div>
                )}
                {asn && (
                  <div className="rounded-lg border border-stone-200 bg-stone-50 px-3 py-2">
                    <span className="flex items-center gap-1 text-stone-500 font-semibold uppercase tracking-wider">
                      <Server className="h-3 w-3" /> ASN
                    </span>
                    <span className="block mt-0.5 text-stone-900 truncate">
                      {asn} {asnName ? `· ${asnName}` : ""}
                    </span>
                  </div>
                )}
                {scannedAt && (
                  <div className="rounded-lg border border-stone-200 bg-stone-50 px-3 py-2">
                    <span className="flex items-center gap-1 text-stone-500 font-semibold uppercase tracking-wider">
                      <Calendar className="h-3 w-3" /> Scanned
                    </span>
                    <span className="block mt-0.5 text-stone-900">
                      {new Date(scannedAt).toLocaleDateString(undefined, {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}

          <div className="flex flex-col-reverse sm:flex-row gap-2 pt-2">
            <a
              href="/"
              className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold border border-stone-300 bg-white text-stone-800 hover:bg-stone-50 transition-colors duration-200 cursor-pointer"
            >
              <ArrowLeft className="h-4 w-4" />
              Go back
            </a>
            {reason === "flagged-malicious" && (
              <button
                type="button"
                onClick={handleContinue}
                disabled={bypassing}
                className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold bg-red-600 text-white hover:bg-red-700 transition-colors duration-200 cursor-pointer disabled:opacity-60"
              >
                <ExternalLink className="h-4 w-4" />
                {bypassing ? "Continuing…" : "Continue anyway"}
              </button>
            )}
          </div>

          <p className="text-[11px] text-stone-400 text-center pt-2">
            Powered by Cloudflare URL Scanner
          </p>
        </div>
      </div>
    </div>
  );
}

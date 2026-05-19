"use client";

import { useRef, useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { Download, Settings2, QrCode, Scan } from "lucide-react";
import { cn } from "@/lib/utils";
import type { QRSettings } from "@/types/qr";
import { DEFAULT_QR_SETTINGS } from "@/types/qr";
import { QRCustomizePanel } from "./QRCustomizePanel";
import { downloadPNG } from "./qrDownload";

interface Props {
  link: {
    id: string;
    slug: string;
    destination: string;
    title: string | null;
    totalClicks: number;
    qrSettings?: QRSettings | null;
  };
  defaultDomain?: string;
}
import { getDefaultDomain } from "@/lib/utils";

export function QRCard({ link, defaultDomain = getDefaultDomain() }: Props) {
  const shortUrl = `https://${defaultDomain}/${link.slug}`;
  const qrTargetUrl = `${shortUrl}?source=qr`;
  const settings: QRSettings = link.qrSettings ?? DEFAULT_QR_SETTINGS;
  const svgRef = useRef<SVGSVGElement | null>(null);

  const [panelOpen, setPanelOpen] = useState(false);
  const [currentSettings, setCurrentSettings] = useState<QRSettings>(settings);
  const [downloading, setDownloading] = useState(false);

  async function handleQuickDownload() {
    setDownloading(true);
    try {
      await downloadPNG(qrTargetUrl, link.slug, currentSettings);
    } catch {
      // silent — user can use the panel for more control
    } finally {
      setDownloading(false);
    }
  }

  return (
    <>
      <div className="group relative flex flex-col overflow-hidden rounded-2xl border border-border bg-card transition-all hover:border-primary/30 hover:shadow-lg hover:shadow-primary/5">
        {/* QR Preview area */}
        <div
          className="flex flex-col items-center justify-center gap-2 p-6 pb-4"
          style={{ backgroundColor: currentSettings.bgColor === "transparent" ? "transparent" : currentSettings.bgColor }}
        >
          <QRCodeSVG
            ref={svgRef as React.Ref<SVGSVGElement>}
            value={qrTargetUrl}
            size={140}
            fgColor={currentSettings.fgColor}
            bgColor={currentSettings.bgColor === "transparent" ? "transparent" : currentSettings.bgColor}
            level={currentSettings.errorLevel}
            imageSettings={
              currentSettings.logoUrl
                ? {
                    src: currentSettings.logoUrl,
                    height: 28,
                    width: 28,
                    excavate: true,
                  }
                : undefined
            }
          />
          {currentSettings.frameStyle === "scan-me" && (
            <p className="text-[10px] font-bold tracking-widest uppercase"
               style={{ color: currentSettings.fgColor }}>
              SCAN ME
            </p>
          )}
        </div>

        {/* Link info */}
        <div className="flex flex-1 flex-col gap-3 border-t border-border p-4">
          <div className="min-w-0">
            <h3 className="truncate text-sm font-semibold text-foreground">
              {link.title || link.destination.replace(/^https?:\/\//, "")}
            </h3>
            <p className="mt-0.5 truncate font-mono text-xs text-primary">
              {defaultDomain}/{link.slug}
            </p>
          </div>

          {/* Stats */}
          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <Scan className="h-3 w-3" />
              {link.totalClicks} total clicks
            </span>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2 pt-1">
            <button
              type="button"
              onClick={() => setPanelOpen(true)}
              className="flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-border py-2 text-xs font-medium text-muted-foreground transition-colors hover:border-primary/40 hover:bg-primary/5 hover:text-primary"
            >
              <Settings2 className="h-3.5 w-3.5" />
              Customize
            </button>
            <button
              type="button"
              onClick={handleQuickDownload}
              disabled={downloading}
              className={cn(
                "flex items-center justify-center gap-1.5 rounded-lg border border-border px-3 py-2 text-xs font-medium transition-colors",
                downloading
                  ? "opacity-50 cursor-not-allowed"
                  : "text-muted-foreground hover:border-primary/40 hover:bg-primary/5 hover:text-primary"
              )}
              title="Download PNG"
            >
              <Download className="h-3.5 w-3.5" />
              PNG
            </button>
          </div>
        </div>
      </div>

      <QRCustomizePanel
        open={panelOpen}
        onOpenChange={setPanelOpen}
        linkId={link.id}
        linkSlug={link.slug}
        shortUrl={shortUrl}
        linkTitle={link.title ?? link.slug}
        initialSettings={currentSettings}
        onSaved={(s) => setCurrentSettings(s)}
      />
    </>
  );
}

/**
 * Bio section layout — passthrough.
 *
 * The bio section has multiple visual treatments depending on the
 * sub-route:
 *
 *   /dashboard/bio                     List page — standard dashboard chrome.
 *   /dashboard/bio/integrations        Standard dashboard chrome.
 *   /dashboard/bio/[id]/edit           Full-page editor (handled by [id]/layout.tsx → BioByIdShell).
 *   /dashboard/bio/[id]/settings       Sub-nav + content   (handled by [id]/layout.tsx → BioByIdShell).
 *   /dashboard/bio/[id]/analytics      Sub-nav + content   (handled by [id]/layout.tsx → BioByIdShell).
 *
 * All visual decisions for `[id]/*` routes happen inside `BioByIdShell`.
 * Keeping this outer layout as a passthrough means we never stack two
 * negative-margin resets — that combination previously broke the
 * editor's scroll chain.
 */
export default function BioLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}

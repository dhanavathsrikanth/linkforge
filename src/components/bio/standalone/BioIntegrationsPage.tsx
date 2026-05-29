"use client";

import { SidebarIntegrations } from "@/components/bio/sidebar/SidebarIntegrations";

/**
 * Standalone integrations page.
 *
 * Wraps the existing `SidebarIntegrations` panel which already handles
 * the OAuth initiation, status checking, and disconnect flows. We
 * promote it from a 280px sidebar pane to a full-page layout — the
 * inner component already uses flex layouts that scale up cleanly.
 */
export function BioIntegrationsPage() {
  return <SidebarIntegrations />;
}

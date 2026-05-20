"use client";

import { useQuery } from "@tanstack/react-query";
import { useWorkspace } from "@/providers/WorkspaceProvider";
import { History, Loader2 } from "lucide-react";

type AuditLog = {
  id: string;
  action: string;
  entityType: string;
  entityId: string | null;
  metadata: Record<string, unknown> | null;
  createdAt: string;
};

export default function AuditLogsPage() {
  const { workspace } = useWorkspace();

  const { data, isLoading } = useQuery<{ logs: AuditLog[] }>({
    queryKey: ["audit-logs", workspace?.id],
    queryFn: async () => {
      const res = await fetch(`/api/workspaces/${workspace!.id}/audit-logs?limit=100`);
      if (!res.ok) throw new Error("Failed to fetch");
      return res.json();
    },
    enabled: !!workspace?.id,
  });

  const logs = data?.logs ?? [];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold tracking-tight text-foreground">Audit Logs</h2>
        <p className="text-sm text-muted-foreground">
          Track changes made to links and workspace settings.
        </p>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : logs.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border py-12 text-center">
          <History className="h-8 w-8 text-muted-foreground/50" />
          <p className="mt-3 text-sm text-muted-foreground">No audit events yet.</p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/30 text-left text-xs uppercase tracking-wider text-muted-foreground">
                <th className="px-4 py-3 font-semibold">Action</th>
                <th className="px-4 py-3 font-semibold">Type</th>
                <th className="px-4 py-3 font-semibold hidden sm:table-cell">Details</th>
                <th className="px-4 py-3 font-semibold text-right">Date</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((log) => (
                <tr key={log.id} className="border-b border-border last:border-0 hover:bg-muted/20 transition-colors">
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold uppercase ${
                      log.action === "delete" ? "bg-red-50 text-red-700" :
                      log.action === "create" ? "bg-emerald-50 text-emerald-700" :
                      "bg-blue-50 text-blue-700"
                    }`}>
                      {log.action}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{log.entityType.replace("_", " ")}</td>
                  <td className="px-4 py-3 text-muted-foreground hidden sm:table-cell max-w-[300px] truncate">
                    {log.metadata ? JSON.stringify(log.metadata) : "—"}
                  </td>
                  <td className="px-4 py-3 text-right text-muted-foreground whitespace-nowrap">
                    {new Date(log.createdAt).toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

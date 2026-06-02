"use client";

import { useWorkspace } from "@/providers/WorkspaceProvider";
import { FeatureFlagPanel } from "@/components/durable-objects/FeatureFlagToggle";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Workflow, History } from "lucide-react";
import { useState, useEffect } from "react";

export default function FeatureFlagsPage() {
  const { workspace, isLoading } = useWorkspace();

  if (isLoading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center rounded-xl border border-dashed border-border">
        <div className="text-sm text-muted-foreground">Loading...</div>
      </div>
    );
  }

  if (!workspace?.id) return null;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold tracking-tight text-foreground">Feature Flags</h2>
        <p className="text-sm text-muted-foreground">
          Manage workspace-level feature flags. Changes propagate instantly via Durable Objects.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <FeatureFlagPanel />
        <ScheduledTasksPanel workspaceId={workspace.id} />
      </div>

      <WorkflowPanel />
    </div>
  );
}

function ScheduledTasksPanel({ workspaceId }: { workspaceId: string }) {
  const [tasks, setTasks] = useState<any[]>([]);

  useEffect(() => {
    const fetchTasks = async () => {
      try {
        const res = await fetch("/do/scheduler/default");
        if (res.ok) setTasks(await res.json());
      } catch {}
    };
    fetchTasks();
    const interval = setInterval(fetchTasks, 10000);
    return () => clearInterval(interval);
  }, [workspaceId]);

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-sm font-medium">
          <History className="h-4 w-4 text-primary" />
          Scheduled Tasks
        </CardTitle>
      </CardHeader>
      <CardContent>
        {tasks.length === 0 ? (
          <p className="text-xs text-muted-foreground">No scheduled tasks</p>
        ) : (
          <div className="space-y-2">
            {tasks.map((task) => (
              <div key={task.tag} className="rounded-md border border-border/50 px-3 py-2 text-xs">
                <div className="flex items-center justify-between">
                  <span className="font-medium">{task.action}</span>
                  <span className="text-muted-foreground">{new Date(task.scheduledAt).toLocaleString()}</span>
                </div>
                <span className="text-muted-foreground">
                  {task.executed ? "Executed" : "Pending"}
                </span>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function WorkflowPanel() {
  const [workflows, setWorkflows] = useState<any[]>([]);

  useEffect(() => {
    const fetchWorkflows = async () => {
      try {
        const res = await fetch("/do/workflow/default/list");
        if (res.ok) setWorkflows(await res.json());
      } catch {}
    };
    fetchWorkflows();
    const interval = setInterval(fetchWorkflows, 5000);
    return () => clearInterval(interval);
  }, []);

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-sm font-medium">
          <Workflow className="h-4 w-4 text-primary" />
          Active Workflows
        </CardTitle>
      </CardHeader>
      <CardContent>
        {workflows.length === 0 ? (
          <p className="text-xs text-muted-foreground">No active workflows</p>
        ) : (
          <div className="space-y-2">
            {workflows.map((wf) => (
              <div key={wf.id} className="rounded-md border border-border/50 px-3 py-2 text-xs">
                <div className="flex items-center justify-between">
                  <span className="font-medium">{wf.type}</span>
                  <span className={wf.status === "completed" ? "text-emerald-500" : wf.status === "failed" ? "text-red-500" : "text-muted-foreground"}>
                    {wf.status}
                  </span>
                </div>
                <div className="text-muted-foreground">
                  Progress: {wf.progress}% · {new Date(wf.createdAt).toLocaleString()}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

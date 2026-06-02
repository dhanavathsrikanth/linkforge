'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/Badge';
import { motion, AnimatePresence } from 'framer-motion';
import { Workflow, CheckCircle2, XCircle, Clock, Play } from 'lucide-react';

const statusConfig: Record<string, { label: string; icon: any; color: string }> = {
  pending: { label: 'Pending', icon: Clock, color: 'text-muted-foreground' },
  running: { label: 'Running', icon: Play, color: 'text-blue-500' },
  completed: { label: 'Completed', icon: CheckCircle2, color: 'text-emerald-500' },
  failed: { label: 'Failed', icon: XCircle, color: 'text-red-500' },
  cancelled: { label: 'Cancelled', icon: XCircle, color: 'text-muted-foreground' },
};

export function WorkflowProgress({ workflowId }: { workflowId: string }) {
  const [workflow, setWorkflow] = useState<any>(null);

  useEffect(() => {
    const fetchWorkflow = async () => {
      try {
        const res = await fetch(`/do/workflow/${workflowId}/get/${workflowId}`);
        if (res.ok) setWorkflow(await res.json());
      } catch {}
    };
    fetchWorkflow();
    const interval = setInterval(fetchWorkflow, 2000);
    return () => clearInterval(interval);
  }, [workflowId]);

  if (!workflow) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-sm font-medium">
            <Workflow className="h-4 w-4 text-primary" />
            Workflow Progress
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-xs text-muted-foreground">Loading...</p>
        </CardContent>
      </Card>
    );
  }

  const config = statusConfig[workflow.status] || statusConfig.pending;
  const StatusIcon = config.icon;

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-sm font-medium">
            <Workflow className="h-4 w-4 text-primary" />
            {workflow.type.replace(/_/g, ' ')}
          </CardTitle>
          <Badge variant="outline" className={`gap-1 ${config.color}`}>
            <StatusIcon className="h-3 w-3" />
            {config.label}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="space-y-1">
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">Progress</span>
            <span className="font-mono tabular-nums">{workflow.progress}%</span>
          </div>
          <Progress value={workflow.progress} className="h-2" />
        </div>
        {workflow.result && (
          <div className="rounded-md bg-muted/50 p-2">
            <pre className="text-[10px] text-muted-foreground overflow-auto max-h-24">
              {JSON.stringify(workflow.result, null, 2)}
            </pre>
          </div>
        )}
        {workflow.error && (
          <div className="rounded-md bg-red-500/10 p-2 text-[10px] text-red-500">
            {workflow.error}
          </div>
        )}
        <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
          <span>Created {new Date(workflow.createdAt).toLocaleString()}</span>
          <span>·</span>
          <span>Updated {new Date(workflow.updatedAt).toLocaleString()}</span>
        </div>
      </CardContent>
    </Card>
  );
}

'use client';

import { useFeatureFlags } from '@/hooks/use-feature-flags';
import { useWorkspace } from '@/providers/WorkspaceProvider';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { useState } from 'react';
import { Flag, Plus, Trash2 } from 'lucide-react';

export function FeatureFlagPanel() {
  const { workspace, isLoading } = useWorkspace();
  const { flags, getFlag, setFlag, deleteFlag } = useFeatureFlags(workspace?.id || '');
  const [newKey, setNewKey] = useState('');
  const [newVal, setNewVal] = useState('true');

  if (isLoading || !workspace) return null;

  const entries = Object.entries(flags);

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-sm font-medium">
            <Flag className="h-4 w-4 text-primary" />
            Feature Flags
          </CardTitle>
          <Badge variant="secondary" className="text-xs">{entries.length} flags</Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {entries.length === 0 && (
          <p className="text-xs text-muted-foreground">No feature flags configured</p>
        )}
        {entries.map(([key, value]) => (
          <div key={key} className="flex items-center justify-between rounded-md border border-border/50 px-3 py-2">
            <div className="min-w-0 flex-1">
              <span className="text-xs font-medium">{key}</span>
              <div className="text-[10px] text-muted-foreground">
                {typeof value === 'boolean' ? (value ? 'enabled' : 'disabled') : JSON.stringify(value)}
              </div>
            </div>
            <div className="flex items-center gap-2">
              {typeof value === 'boolean' && (
                <Switch
                  checked={value}
                  onCheckedChange={(v) => setFlag(key, v)}
                  className="scale-75"
                />
              )}
              <button
                onClick={() => deleteFlag(key)}
                className="text-muted-foreground hover:text-red-500 transition-colors"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        ))}
        <div className="flex items-center gap-2 pt-1">
          <Input
            placeholder="flag_key"
            value={newKey}
            onChange={(e) => setNewKey(e.target.value)}
            className="h-7 text-xs"
          />
          <Input
            placeholder="true"
            value={newVal}
            onChange={(e) => setNewVal(e.target.value)}
            className="h-7 w-16 text-xs"
          />
          <Button
            size="sm"
            variant="ghost"
            onClick={() => {
              if (newKey) {
                const val = newVal === 'true' ? true : newVal === 'false' ? false : newVal;
                setFlag(newKey, val);
                setNewKey('');
                setNewVal('true');
              }
            }}
            className="h-7 shrink-0"
          >
            <Plus className="h-3.5 w-3.5" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

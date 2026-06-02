'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/Badge';
import { motion } from 'framer-motion';
import { FlaskConical, TrendingUp } from 'lucide-react';

interface ABResult {
  winProb: number;
  conversionRate: number;
}

interface ABState {
  totalClicks: number;
  variants: Record<string, { weight: number; clicks: number; conversions: number }>;
  results: Record<string, ABResult>;
}

export function LiveABTestResults({ linkId }: { linkId: string }) {
  const [state, setState] = useState<ABState | null>(null);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    const protocol = location.protocol === 'https:' ? 'wss:' : 'ws:';
    const ws = new WebSocket(`${protocol}//${location.host}/do/abtest/ab:${linkId}/ws`);

    ws.addEventListener('open', () => {
      setConnected(true);
      ws.send(JSON.stringify({ type: 'subscribe', testId: linkId }));
    });

    ws.addEventListener('message', (e) => {
      try {
        const data = JSON.parse(e.data);
        if (data.type === 'initial' || data.type === 'update') {
          setState(data.state || { totalClicks: data.totalClicks, variants: data.variants, results: data.results });
        }
      } catch {}
    });

    ws.addEventListener('close', () => setConnected(false));
    return () => ws.close();
  }, [linkId]);

  if (!state || !state.results) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-sm font-medium">
            <FlaskConical className="h-4 w-4 text-primary" />
            A/B Test Results
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-xs text-muted-foreground">No A/B test data yet</p>
        </CardContent>
      </Card>
    );
  }

  const variants = Object.entries(state.results);
  const sorted = variants.sort(([, a], [, b]) => b.winProb - a.winProb);

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-sm font-medium">
            <FlaskConical className="h-4 w-4 text-primary" />
            A/B Test Results
            <Badge variant={connected ? 'default' : 'secondary'} className="ml-1 h-5 px-1.5 text-[10px]">
              {connected ? 'LIVE' : 'OFFLINE'}
            </Badge>
          </CardTitle>
          <span className="text-xs text-muted-foreground tabular-nums">
            {state.totalClicks} clicks
          </span>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {sorted.map(([id, result], i) => {
          const isWinning = i === 0 && sorted.length > 1;
          return (
            <motion.div
              key={id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.1 }}
              className="space-y-1"
            >
              <div className="flex items-center justify-between text-xs">
                <span className="flex items-center gap-1.5 font-medium">
                  Variant {id.slice(0, 8)}
                  {isWinning && <TrendingUp className="h-3 w-3 text-emerald-500" />}
                </span>
                <span className="text-muted-foreground tabular-nums">
                  {state.variants[id]?.clicks ?? 0} clicks
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Progress
                  value={result.winProb * 100}
                  className={`h-2 ${isWinning ? 'bg-emerald-500/20' : ''}`}
                />
                <span className="w-12 text-right text-xs font-mono tabular-nums text-muted-foreground">
                  {(result.winProb * 100).toFixed(1)}%
                </span>
              </div>
            </motion.div>
          );
        })}
      </CardContent>
    </Card>
  );
}

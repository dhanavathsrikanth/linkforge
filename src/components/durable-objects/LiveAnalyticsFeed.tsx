'use client';

import { useLiveAnalytics, LiveClickEvent } from '@/hooks/use-live-analytics';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { motion, AnimatePresence } from 'framer-motion';
import { Globe, Monitor, Smartphone, Tablet, MousePointerClick, Activity } from 'lucide-react';

function deviceIcon(device: string) {
  switch (device) {
    case 'mobile': return <Smartphone className="h-3 w-3" />;
    case 'tablet': return <Tablet className="h-3 w-3" />;
    case 'desktop': return <Monitor className="h-3 w-3" />;
    default: return <Globe className="h-3 w-3" />;
  }
}

export function LiveAnalyticsFeed({ linkId }: { linkId: string }) {
  const { clicks, clickCount, connected, reconnecting, subscribeToLink } = useLiveAnalytics(linkId);

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-sm font-medium">
            <Activity className="h-4 w-4 text-primary" />
            Live Clicks
            <Badge variant={connected ? 'default' : 'secondary'} className="ml-1 h-5 px-1.5 text-[10px]">
              {connected ? 'LIVE' : reconnecting ? 'RECONNECTING' : 'OFFLINE'}
            </Badge>
          </CardTitle>
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <MousePointerClick className="h-3 w-3" />
            <span className="font-mono tabular-nums">{clickCount}</span>
          </div>
        </div>
        {!connected && !reconnecting && (
          <button onClick={subscribeToLink} className="text-xs text-primary hover:underline mt-1">
            Connect live feed
          </button>
        )}
      </CardHeader>
      <CardContent className="max-h-[400px] overflow-y-auto p-0">
        <AnimatePresence initial={false}>
          {clicks.length === 0 && (
            <div className="flex flex-col items-center py-8 text-muted-foreground">
              <MousePointerClick className="mb-2 h-6 w-6" />
              <p className="text-xs">Waiting for clicks...</p>
            </div>
          )}
          {clicks.slice(0, 50).map((click, i) => (
            <motion.div
              key={`${click.timestamp}-${i}`}
              initial={{ opacity: 0, height: 0, marginTop: 0 }}
              animate={{ opacity: 1, height: 'auto', marginTop: 0 }}
              exit={{ opacity: 0, height: 0, marginTop: 0 }}
              transition={{ duration: 0.2 }}
              className="flex items-center gap-2 border-b border-border/40 px-4 py-2 text-xs last:border-0"
            >
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-primary">
                {deviceIcon(click.device)}
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                  <span className="font-medium">{click.country}</span>
                  {click.city && <span className="text-muted-foreground">· {click.city}</span>}
                </div>
                <div className="text-muted-foreground">
                  {click.browser && <span>{click.browser} </span>}
                  {click.os && <span>· {click.os}</span>}
                  {click.referrer && <span>· {new URL(click.referrer).hostname}</span>}
                </div>
              </div>
              <span className="shrink-0 font-mono text-[10px] text-muted-foreground tabular-nums">
                {new Date(click.timestamp).toLocaleTimeString()}
              </span>
            </motion.div>
          ))}
        </AnimatePresence>
      </CardContent>
    </Card>
  );
}

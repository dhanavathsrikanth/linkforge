'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { motion, AnimatePresence } from 'framer-motion';
import { QrCode, MapPin, Globe, Monitor, Smartphone } from 'lucide-react';

interface ScanEvent {
  qrId: string;
  data: {
    device?: string;
    country?: string;
    city?: string;
    browser?: string;
    os?: string;
  };
  timestamp: number;
}

export function QRScanStream({ qrId }: { qrId: string }) {
  const [scans, setScans] = useState<ScanEvent[]>([]);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    const protocol = location.protocol === 'https:' ? 'wss:' : 'ws:';
    const ws = new WebSocket(`${protocol}//${location.host}/do/qr/${qrId}/ws`);

    ws.addEventListener('open', () => {
      setConnected(true);
      ws.send(JSON.stringify({ type: 'subscribe', qrId }));
    });

    ws.addEventListener('message', (e) => {
      try {
        const data = JSON.parse(e.data);
        if (data.type === 'scan') {
          setScans((prev) => [data, ...prev].slice(0, 50));
        }
      } catch {}
    });

    ws.addEventListener('close', () => setConnected(false));
    return () => ws.close();
  }, [qrId]);

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-sm font-medium">
            <QrCode className="h-4 w-4 text-primary" />
            Live QR Scans
            <Badge variant={connected ? 'default' : 'secondary'} className="ml-1 h-5 px-1.5 text-[10px]">
              {connected ? 'LIVE' : 'OFFLINE'}
            </Badge>
          </CardTitle>
          <span className="text-xs text-muted-foreground tabular-nums">
            {scans.length} scans
          </span>
        </div>
      </CardHeader>
      <CardContent className="max-h-[300px] overflow-y-auto p-0">
        <AnimatePresence initial={false}>
          {scans.length === 0 && (
            <div className="flex flex-col items-center py-8 text-muted-foreground">
              <QrCode className="mb-2 h-6 w-6" />
              <p className="text-xs">Waiting for scans...</p>
            </div>
          )}
          {scans.map((scan, i) => (
            <motion.div
              key={`${scan.timestamp}-${i}`}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="flex items-center gap-2 border-b border-border/40 px-4 py-2 text-xs last:border-0"
            >
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-primary">
                {scan.data.device === 'mobile' ? <Smartphone className="h-3 w-3" /> : <Monitor className="h-3 w-3" />}
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                  {scan.data.country && (
                    <span className="flex items-center gap-1">
                      <Globe className="h-3 w-3 text-muted-foreground" />
                      {scan.data.country}
                    </span>
                  )}
                  {scan.data.city && (
                    <span className="flex items-center gap-1 text-muted-foreground">
                      <MapPin className="h-3 w-3" />
                      {scan.data.city}
                    </span>
                  )}
                </div>
                {scan.data.browser && (
                  <span className="text-muted-foreground">
                    {scan.data.browser} {scan.data.os && `· ${scan.data.os}`}
                  </span>
                )}
              </div>
              <span className="shrink-0 font-mono text-[10px] text-muted-foreground tabular-nums">
                {new Date(scan.timestamp).toLocaleTimeString()}
              </span>
            </motion.div>
          ))}
        </AnimatePresence>
      </CardContent>
    </Card>
  );
}

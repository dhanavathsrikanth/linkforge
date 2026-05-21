import { useState, useEffect, useRef } from "react";
import type { QRSettings } from "@/types/qr";
import { DEFAULT_QR_SETTINGS } from "@/types/qr";

interface UseQROptionsReturn {
  options: QRSettings;
  debounced: QRSettings;
  setFgColor: (v: string) => void;
  setBgColor: (v: string) => void;
  setErrorLevel: (v: QRSettings["errorLevel"]) => void;
  setSize: (v: number) => void;
  setLogoUrl: (v: string | undefined) => void;
  setLogoOpacity: (v: number) => void;
  setLogoSize: (v: QRSettings["logoSize"]) => void;
  setRounded: (v: boolean) => void;
  setFrameStyle: (v: QRSettings["frameStyle"]) => void;
  setFrameText: (v: string | undefined) => void;
  setMarginSize: (v: number) => void;
  setBoostLevel: (v: boolean) => void;
  setMinVersion: (v: number) => void;
  reset: () => void;
}

export function useQROptions(initial: QRSettings = DEFAULT_QR_SETTINGS): UseQROptionsReturn {
  const [options, setOptions] = useState<QRSettings>(initial);
  const [debounced, setDebounced] = useState<QRSettings>(initial);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      setDebounced(options);
    }, 200);
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [options]);

  const update = (patch: Partial<QRSettings>) =>
    setOptions((prev) => ({ ...prev, ...patch }));

  return {
    options,
    debounced,
    setFgColor: (v) => update({ fgColor: v }),
    setBgColor: (v) => update({ bgColor: v }),
    setErrorLevel: (v) => update({ errorLevel: v }),
    setSize: (v) => update({ size: v }),
    setLogoUrl: (v) => update({ logoUrl: v }),
    setLogoOpacity: (v) => update({ logoOpacity: v }),
    setLogoSize: (v) => update({ logoSize: v }),
    setRounded: (v) => update({ rounded: v }),
    setFrameStyle: (v) => update({ frameStyle: v }),
    setFrameText: (v) => update({ frameText: v }),
    setMarginSize: (v) => update({ marginSize: v }),
    setBoostLevel: (v) => update({ boostLevel: v }),
    setMinVersion: (v) => update({ minVersion: v }),
    reset: () => {
      setOptions(DEFAULT_QR_SETTINGS);
      setDebounced(DEFAULT_QR_SETTINGS);
    },
  };
}

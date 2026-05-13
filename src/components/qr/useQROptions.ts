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
  setRounded: (v: boolean) => void;
  setFrameStyle: (v: QRSettings["frameStyle"]) => void;
  setFrameText: (v: string | undefined) => void;
  reset: () => void;
}

/**
 * Manages QR customization state with a 200 ms debounce on the preview
 * so the QR code only re-renders after the user pauses, not on every
 * individual keystroke / slider tick.
 */
export function useQROptions(initial: QRSettings = DEFAULT_QR_SETTINGS): UseQROptionsReturn {
  const [options, setOptions] = useState<QRSettings>(initial);
  const [debounced, setDebounced] = useState<QRSettings>(initial);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Debounce: update the preview value 200 ms after the last change
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
    setRounded: (v) => update({ rounded: v }),
    setFrameStyle: (v) => update({ frameStyle: v }),
    setFrameText: (v) => update({ frameText: v }),
    reset: () => {
      setOptions(DEFAULT_QR_SETTINGS);
      setDebounced(DEFAULT_QR_SETTINGS);
    },
  };
}

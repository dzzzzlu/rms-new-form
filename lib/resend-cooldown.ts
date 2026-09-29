"use client";

import { useCallback, useEffect, useState } from "react";

export const RESEND_COOLDOWN = 50;

export function useResendCooldown() {
  const [seconds, setSeconds] = useState(RESEND_COOLDOWN);

  useEffect(() => {
    if (seconds <= 0) return;
    const id = setTimeout(() => setSeconds((s) => s - 1), 1000);
    return () => clearTimeout(id);
  }, [seconds]);

  const restart = useCallback(() => setSeconds(RESEND_COOLDOWN), []);

  return { seconds, disabled: seconds > 0, restart };
}
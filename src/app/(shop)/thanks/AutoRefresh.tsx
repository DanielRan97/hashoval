"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

/** The provider tells the site about a payment a moment after the customer returns; check again every few seconds for a minute. */
export function AutoRefresh({ every = 3000, times = 20 }: { every?: number; times?: number }) {
  const router = useRouter();
  useEffect(() => {
    let n = 0;
    const timer = setInterval(() => {
      n += 1;
      router.refresh();
      if (n >= times) clearInterval(timer);
    }, every);
    return () => clearInterval(timer);
  }, [router, every, times]);
  return null;
}

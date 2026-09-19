"use client";

import { useEffect } from "react";

/** Reports one view per product per browser session. */
export function ViewTracker({ productId }: { productId: number }) {
  useEffect(() => {
    const key = `viewed_${productId}`;
    try {
      if (sessionStorage.getItem(key)) return;
      sessionStorage.setItem(key, "1");
    } catch {}
    fetch(`/api/view/${productId}`, { method: "POST", keepalive: true }).catch(() => {});
  }, [productId]);
  return null;
}

"use client";

import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

const POLL_MS = 30_000;

/**
 * The count of paid orders waiting to be shipped, next to "Orders". The admin layout is not re-rendered
 * when moving between admin pages, so a number computed on the server would go stale; this keeps it
 * current: it re-checks on every page change, when the tab is shown again, and every 30 seconds.
 */
export function OrdersBadge({ initial }: { initial: number }) {
  const [count, setCount] = useState(initial);
  const pathname = usePathname();

  useEffect(() => {
    let stopped = false;
    const load = async () => {
      try {
        const res = await fetch("/admin/orders-count", { cache: "no-store" });
        if (res.ok && !stopped) setCount((await res.json()).toShip);
      } catch {}
    };
    load();
    const timer = setInterval(load, POLL_MS);
    const onShow = () => document.visibilityState === "visible" && load();
    document.addEventListener("visibilitychange", onShow);
    window.addEventListener("focus", load);
    return () => {
      stopped = true;
      clearInterval(timer);
      document.removeEventListener("visibilitychange", onShow);
      window.removeEventListener("focus", load);
    };
  }, [pathname]);

  if (count <= 0) return null;
  return (
    <span className="nav-count inline" title="הזמנות ששולמו וממתינות למשלוח">
      {count}
      <span className="sr-only"> הזמנות ממתינות למשלוח</span>
    </span>
  );
}

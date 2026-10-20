"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { todayInIndia } from "@/lib/performance";

// Pages are drawn for one day (today's limits, "this month", streaks). A tab
// left open past midnight would keep the old day, so reload the page's data
// once whenever the date in India moves on. It compares the device's own
// date with itself, so a device with a wrong clock can't cause reload loops.
export function DayChangeRefresh() {
  const router = useRouter();
  const lastSeen = useRef<string | null>(null);

  useEffect(() => {
    lastSeen.current ??= todayInIndia();
    const check = () => {
      const today = todayInIndia();
      if (document.visibilityState === "visible" && today !== lastSeen.current) {
        lastSeen.current = today;
        router.refresh();
      }
    };
    document.addEventListener("visibilitychange", check);
    window.addEventListener("focus", check);
    const timer = window.setInterval(check, 60_000);
    return () => {
      document.removeEventListener("visibilitychange", check);
      window.removeEventListener("focus", check);
      window.clearInterval(timer);
    };
  }, [router]);

  return null;
}

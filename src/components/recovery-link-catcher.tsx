"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";

// A password-reset link can land on any page (Supabase falls back to its Site
// URL, and a signed-in browser then gets redirected to a dashboard). Wherever
// it lands, hand it to the page that knows what to do with it.
export function RecoveryLinkCatcher() {
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (pathname === "/reset-password") return;
    const hash = window.location.hash;
    if (hash.includes("type=recovery") || hash.includes("error_code=otp_expired")) {
      router.replace(`/reset-password${hash}`);
    }
  }, [pathname, router]);

  return null;
}

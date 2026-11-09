"use client";

import type { ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";
import SiteShell from "@/components/SiteShell";

/** Connects the shared site shell to the Next.js router. */
export default function NextShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  return (
    <SiteShell pathname={pathname} push={(p) => router.push(p, { scroll: false })} prefetch={(p) => router.prefetch(p)}>
      {children}
    </SiteShell>
  );
}

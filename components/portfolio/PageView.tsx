"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";
import { track } from "@/lib/analytics-client";

export function PageView({ projectSlug }: { projectSlug?: string }) {
  const path = usePathname();
  useEffect(() => {
    track("PAGE_VIEW", path);
    if (projectSlug) track("PROJECT_VIEW", path, { projectSlug });
  }, [path, projectSlug]);
  return null;
}

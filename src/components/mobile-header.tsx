"use client";

import { SidebarTrigger } from "@/components/ui/sidebar";
import { useIsMobile } from "@/hooks/use-mobile";
import { usePathname } from "next/navigation";
import { useMemo } from "react";
import { Bot } from 'lucide-react';

const pageTitles: { [key: string]: string } = {
  "/calculator": "Calculator",
  "/chat": "AI Math Assistant",
  "/graph": "Graph Calculator",
  "/history": "History",
};

export function MobileHeader() {
  const isMobile = useIsMobile();
  const pathname = usePathname();

  const title = useMemo(() => {
    return pageTitles[pathname] || "GeoCalc AI";
  }, [pathname]);

  if (!isMobile) {
    return null;
  }

  return (
    <header className="fixed top-0 left-0 right-0 z-20 flex h-16 items-center justify-between border-b bg-background px-4 md:hidden">
      <div className="flex items-center gap-4">
        <SidebarTrigger />
        <div className="flex items-center gap-2">
            <Bot className="h-6 w-6 text-primary" />
            <h1 className="text-lg font-semibold tracking-tight">{title}</h1>
        </div>
      </div>
    </header>
  );
}

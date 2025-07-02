"use client";

import {
  Sidebar,
  SidebarHeader,
  SidebarContent,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarFooter,
} from "@/components/ui/sidebar";
import { Calculator, MessageSquare, FunctionSquare, History, Bot } from "lucide-react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { useSidebar } from "@/components/ui/sidebar";

const menuItems = [
  { href: "/calculator", label: "Calculator", icon: Calculator },
  { href: "/chat", label: "AI Chat", icon: MessageSquare },
  { href: "/graph", label: "Graph", icon: FunctionSquare },
  { href: "/history", label: "History", icon: History },
];

export function MainSidebar() {
  const pathname = usePathname();
  const { state } = useSidebar();

  return (
    <Sidebar>
      <SidebarHeader>
        <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" className="h-10 w-10 shrink-0 rounded-lg">
                <Bot className="h-6 w-6 text-primary" />
            </Button>
            {state === 'expanded' && <h1 className="text-xl font-semibold tracking-tighter">GeoCalc AI</h1>}
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarMenu>
          {menuItems.map((item) => (
            <SidebarMenuItem key={item.href}>
              <SidebarMenuButton
                asChild
                size="lg"
                isActive={pathname.startsWith(item.href)}
                tooltip={{ children: item.label, side: "right", align: "center" }}
              >
                <Link href={item.href}>
                  <item.icon className="h-5 w-5" />
                  <span>{item.label}</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </SidebarContent>
      <SidebarFooter>
         {/* Could add a settings or user profile button here */}
      </SidebarFooter>
    </Sidebar>
  );
}

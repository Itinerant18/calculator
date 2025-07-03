import { MainSidebar } from "@/components/main-sidebar";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { MobileHeader } from "@/components/mobile-header";

export default function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <SidebarProvider>
      <MainSidebar />
      <SidebarInset>
        <MobileHeader />
        <div className="h-screen w-full overflow-y-auto pt-16 md:pt-0">
          {children}
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}

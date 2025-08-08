import { PropsWithChildren, useEffect } from "react";
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import AppSidebar from "@/components/AppSidebar";
import { Button } from "@/components/ui/button";
import { Bell, DownloadCloud } from "lucide-react";
import { AppProvider } from "@/context/AppContext";

export default function AppLayout({ children }: PropsWithChildren) {
  useEffect(() => {
    document.title = "SecureCare Training Dashboard";
  }, []);

  return (
    <AppProvider>
      <SidebarProvider>
        <div className="flex min-h-screen w-full">
          <AppSidebar />
          <SidebarInset>
            <header className="sticky top-0 z-10 border-b bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60">
              <div className="flex h-14 items-center gap-2 px-4">
                <SidebarTrigger />
                <div className="ml-1 font-medium">Welcome</div>
                <div className="ml-auto flex items-center gap-2">
                  <Button variant="outline" size="sm" className="hover-scale">
                    <DownloadCloud className="mr-2" /> Export
                  </Button>
                  <Button variant="ghost" size="icon" aria-label="Notifications">
                    <Bell />
                  </Button>
                </div>
              </div>
            </header>
            <main className="p-4 md:p-6">
              {children}
            </main>
          </SidebarInset>
        </div>
      </SidebarProvider>
    </AppProvider>
  );
}

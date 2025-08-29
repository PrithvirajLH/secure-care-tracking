import { PropsWithChildren, useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { Sidebar, SidebarBody } from "@/components/ui/sidebar";
import AppSidebar from "@/components/AppSidebar";
import { AppProvider } from "@/context/AppContext";

export default function AppLayout({ children }: PropsWithChildren) {
  useEffect(() => {
    document.title = "SecureCare Training Dashboard";
  }, []);

  return (
    <AppProvider>
      <div className="bg-white min-h-screen w-full">
        <div className="grid grid-cols-[auto_1fr] min-h-screen w-full">
          <div className="sticky top-0 h-screen">
            <Sidebar>
              <SidebarBody>
                <AppSidebar />
              </SidebarBody>
            </Sidebar>
          </div>
          <div className="flex flex-col min-w-0">
            <main className="p-4 md:p-6">
              {children}
            </main>
          </div>
        </div>
      </div>
    </AppProvider>
  );
}

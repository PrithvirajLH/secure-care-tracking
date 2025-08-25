import { PropsWithChildren, useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import AppSidebar from "@/components/AppSidebar";
import { Button } from "@/components/ui/button";
import { Bell, DownloadCloud, Users, Award, Star, GraduationCap, TrendingUp, BarChart3, Settings } from "lucide-react";
import { AppProvider } from "@/context/AppContext";

export default function AppLayout({ children }: PropsWithChildren) {
  const location = useLocation();
  const [currentLevel, setCurrentLevel] = useState<string>("");
  
  useEffect(() => {
    document.title = "SecureCare Training Dashboard";
  }, []);

  // Listen for level changes from Training page
  useEffect(() => {
    const handleLevelChange = (event: CustomEvent) => {
      if (event.detail && event.detail.level) {
        setCurrentLevel(event.detail.level);
      }
    };

    window.addEventListener('levelChange' as any, handleLevelChange);
    return () => {
      window.removeEventListener('levelChange' as any, handleLevelChange);
    };
  }, []);

  // Page configuration for dynamic titles
  const getPageConfig = (pathname: string) => {
    switch (pathname) {
      case "/":
        return { title: "Dashboard", icon: BarChart3, color: "text-blue-600" };
      case "/employees":
        return { title: "Employees", icon: Users, color: "text-green-600" };
      case "/training":
        const levelConfig = {
          "care-partner": { title: "Level 1", icon: Users, color: "text-blue-600" },
          "associate": { title: "Level 2", icon: Award, color: "text-green-600" },
          "champion": { title: "Level 3", icon: Star, color: "text-purple-600" },
          "consultant": { title: "Consultant", icon: GraduationCap, color: "text-orange-600" },
          "coach": { title: "Coach", icon: TrendingUp, color: "text-teal-600" }
        };
        const levelInfo = levelConfig[currentLevel as keyof typeof levelConfig];
        return { 
          title: levelInfo ? `${levelInfo.title} Training` : "Training", 
          icon: levelInfo?.icon || Award, 
          color: levelInfo?.color || "text-purple-600" 
        };
      case "/advisors":
        return { title: "Advisors", icon: GraduationCap, color: "text-orange-600" };
      case "/analytics":
        return { title: "Analytics", icon: TrendingUp, color: "text-teal-600" };
      case "/settings":
        return { title: "Settings", icon: Settings, color: "text-gray-600" };
      default:
        return { title: "Page", icon: BarChart3, color: "text-gray-600" };
    }
  };

  const pageConfig = getPageConfig(location.pathname);

  return (
    <AppProvider>
      <SidebarProvider>
        <div className="flex min-h-screen w-full">
          <AppSidebar />
          <SidebarInset>
            <header className="sticky top-0 z-10 border-b bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60">
              <div className="flex h-14 items-center gap-2 px-4">
                <SidebarTrigger />
                <div className="flex items-center gap-3 ml-1">
                  <div className={`p-1.5 rounded-md ${pageConfig.color.replace('text-', 'bg-').replace('-600', '-100')}`}>
                    <pageConfig.icon className={`w-4 h-4 ${pageConfig.color}`} />
                  </div>
                  <div className="font-medium">{pageConfig.title}</div>
                </div>
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

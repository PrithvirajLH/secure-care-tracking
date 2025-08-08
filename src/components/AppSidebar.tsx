import { NavLink, useLocation } from "react-router-dom";
import { BarChart3, Users2, GraduationCap, CalendarClock, Settings, Home } from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";

export default function AppSidebar() {
  const location = useLocation();
  const items = [
    { title: "Dashboard", url: "/", icon: Home },
    { title: "Employees", url: "/employees", icon: Users2 },
    { title: "Training", url: "/training", icon: GraduationCap },
    { title: "Advisors", url: "/advisors", icon: CalendarClock },
    { title: "Analytics", url: "/analytics", icon: BarChart3 },
    { title: "Settings", url: "/settings", icon: Settings },
  ];

  return (
    <Sidebar>
      <SidebarHeader>
        <div className="px-2 py-1.5">
          <div className="text-lg font-semibold">SecureCare</div>
          <div className="text-xs text-muted-foreground">Training Dashboard</div>
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Main</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {items.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild isActive={location.pathname === item.url}>
                    <NavLink to={item.url} end>
                      <item.icon />
                      <span>{item.title}</span>
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}

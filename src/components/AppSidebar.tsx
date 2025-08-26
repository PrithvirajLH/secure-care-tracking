import { NavLink } from "react-router-dom";
import { BarChart3, Users2, GraduationCap, CalendarClock, Settings, Home } from "lucide-react";
import { useSidebar } from "@/components/ui/sidebar";
import { motion } from "motion/react";

export default function AppSidebar() {
  const { open, animate } = useSidebar();
  const items = [
    { title: "Dashboard", to: "/", Icon: Home },
    { title: "Employees", to: "/employees", Icon: Users2 },
    { title: "Training", to: "/training", Icon: GraduationCap },
    { title: "Advisors", to: "/advisors", Icon: CalendarClock },
    { title: "Analytics", to: "/analytics", Icon: BarChart3 },
    { title: "Settings", to: "/settings", Icon: Settings },
  ];

  return (
    <div className="h-full flex flex-col">
            <div className="py-2">
                           <div className="flex items-center justify-center min-w-[80px]">
           <div className="h-20 w-20 flex items-center justify-center flex-shrink-0">
             <img src="/logo.svg" alt="SecureCare" className="h-20 w-20" />
           </div>
         </div>
        {/* Removed tagline per request */}
      </div>
             <nav className="mt-2 space-y-1">
         {items.map(({ title, to, Icon }) => (
           <NavLink
             key={title}
             to={to}
             end={to === "/"}
             className={({ isActive }) =>
               `flex items-center justify-center gap-3 rounded-md px-2 py-2 text-sm transition-colors ${
                 isActive ? "bg-accent text-accent-foreground" : "hover:bg-accent/60"
               }`
             }
           >
             <Icon className="h-6 w-6" />
            <motion.span
              animate={{
                display: animate ? (open ? "inline-block" : "none") : "inline-block",
                opacity: animate ? (open ? 1 : 0) : 1,
              }}
              className="whitespace-pre text-base font-medium tracking-tight"
            >
              {title}
            </motion.span>
          </NavLink>
        ))}
      </nav>
    </div>
  );
}

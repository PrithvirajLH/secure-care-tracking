import { NavLink } from "react-router-dom";
import { Users2, GraduationCap, CalendarClock, Home, FileText, Database, ClipboardList } from "lucide-react";
import { useSidebar } from "@/components/ui/sidebar";
import { motion } from "motion/react";
import { useEditCompletedDatePermission } from "@/hooks/usePermissions";

export default function AppSidebar() {
  const { open, animate } = useSidebar();
  const { data: permissionData } = useEditCompletedDatePermission();
  const hasAuditAccess = permissionData?.hasPermission ?? false;

  const baseItems = [
    { title: "Dashboard", to: "/", Icon: Home },
    { title: "Employees", to: "/employees", Icon: Users2 },
    { title: "Training", to: "/training", Icon: GraduationCap },
    { title: "Advisors", to: "/advisors", Icon: CalendarClock },
    { title: "Completions", to: "/completions", Icon: FileText },
    { title: "Award Readiness", to: "/employee-data", Icon: Database },
  ];

  // Only show Audit Log for users with edit-completed-date permission
  const items = hasAuditAccess 
    ? [...baseItems, { title: "Audit Log", to: "/audit-log", Icon: ClipboardList }]
    : baseItems;

  return (
    <div className="h-full flex flex-col">
            <div className="py-2">
                                       <div className="flex items-center justify-center w-full">
            <div className="h-20 w-20 flex items-center justify-center flex-shrink-0">
              <img src="/logo.svg" alt="SecureCare" className="h-20 w-20" />
            </div>
          </div>
        {/* Removed tagline per request */}
      </div>
                           <nav className="mt-2 space-y-1 flex flex-col items-center">
         {items.map(({ title, to, Icon }) => (
           <NavLink
             key={title}
             to={to}
             end={to === "/"}
                           className={({ isActive }) =>
                `flex items-center justify-center gap-2 rounded-md px-3 py-2 text-sm transition-colors w-full max-w-[220px] ${
                  isActive ? "bg-purple-100 text-purple-700 shadow-sm" : "hover:bg-purple-50"
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

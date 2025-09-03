import React from "react";
import { CalendarClock } from "lucide-react";
import AdvisorManagement from "@/components/AdvisorManagement";
import PageHeader from "@/components/PageHeader";

export default function Advisors() {
  return (
    <div className="space-y-6">
      <PageHeader
        icon={CalendarClock}
        title="Advisor Management"
        description="Manage advisor assignments and track performance"
      />
      
      <AdvisorManagement />
    </div>
  );
}

import React from "react";
import AdvisorManagement from "@/components/AdvisorManagement";

export default function Advisors() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Advisor Management</h1>
          <p className="text-muted-foreground">Manage advisor assignments and track performance</p>
        </div>
      </div>
      
      <AdvisorManagement />
    </div>
  );
}

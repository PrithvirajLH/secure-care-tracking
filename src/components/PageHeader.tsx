import React from "react";
import { LucideIcon } from "lucide-react";

interface PageHeaderProps {
  icon: LucideIcon;
  title: string;
  description: string;
  className?: string;
}

export default function PageHeader({ icon: Icon, title, description, className = "" }: PageHeaderProps) {
  return (
    <div className={`mb-6 space-y-4 bg-white/80 backdrop-blur-sm rounded-xl p-6 shadow-lg border border-gray-200/50 ${className}`}>
      <div className="flex items-center gap-2">
        <Icon className="h-6 w-6 text-blue-600" />
        <h1 className="text-3xl font-bold text-gray-900">{title}</h1>
      </div>
      <p className="text-gray-700 text-lg mt-2">{description}</p>
    </div>
  );
}

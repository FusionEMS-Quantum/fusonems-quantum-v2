"use client";

import React, { ReactNode } from "react";

interface PortalStatCardProps {
  value: string | number;
  label: string;
  icon: ReactNode;
  badge?: string;
  badgeVariant?: "green" | "red" | "blue" | "orange" | "purple" | "amber";
}

const badgeClasses: Record<string, string> = {
  green: "bg-green-500/10 text-green-500 border-green-500/20",
  red: "bg-red-500/10 text-red-500 border-red-500/20",
  blue: "bg-blue-500/10 text-blue-500 border-blue-500/20",
  orange: "bg-orange-500/10 text-orange-500 border-orange-500/20",
  purple: "bg-purple-500/10 text-purple-500 border-purple-500/20",
  amber: "bg-amber-500/10 text-amber-500 border-amber-500/20",
};

export default function PortalStatCard({ value, label, icon, badge, badgeVariant = "green" }: PortalStatCardProps) {
  return (
    <div className="portal-stat-card rounded-2xl border border-white/10 bg-white/5 p-6 shadow-lg shadow-black/20 backdrop-blur-sm transition-all hover:border-white/20 hover:shadow-xl hover:shadow-black/25">
      <div className="flex items-center justify-between mb-4">
        <div className="portal-stat-icon flex h-12 w-12 items-center justify-center rounded-xl border border-white/15 bg-white/5">
          {icon}
        </div>
        {badge && (
          <span className={`px-3 py-1 rounded-lg text-xs font-bold border ${badgeClasses[badgeVariant]}`}>
            {badge}
          </span>
        )}
      </div>
      <p className="text-3xl font-black tracking-tight text-white mb-1">{value}</p>
      <p className="text-sm text-zinc-400">{label}</p>
    </div>
  );
}

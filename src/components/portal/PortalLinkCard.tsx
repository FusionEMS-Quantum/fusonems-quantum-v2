"use client";

import React, { ReactNode } from "react";
import Link from "next/link";

interface PortalLinkCardProps {
  href: string;
  title: string;
  description: string;
  icon: ReactNode;
  cardGradient: string; // e.g. "from-red-500/10 to-orange-500/10"
  iconGradient: string;  // e.g. "from-red-500 to-orange-500"
  borderColor?: string;
}

export default function PortalLinkCard({
  href,
  title,
  description,
  icon,
  cardGradient,
  iconGradient,
  borderColor = "border-white/20",
}: PortalLinkCardProps) {
  return (
    <Link
      href={href}
      className={`portal-link-card group block rounded-2xl border ${borderColor} bg-gradient-to-br ${cardGradient} p-8 shadow-lg shadow-black/20 backdrop-blur-sm transition-all hover:scale-[1.02] hover:shadow-xl hover:shadow-black/25`}
    >
      <div
        className={`mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br ${iconGradient} text-white shadow-md transition-transform group-hover:scale-110`}
      >
        {icon}
      </div>
      <h3 className="text-2xl font-black tracking-tight text-white mb-3">{title}</h3>
      <p className="text-zinc-400 leading-relaxed">{description}</p>
    </Link>
  );
}

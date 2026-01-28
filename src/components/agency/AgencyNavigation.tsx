"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"

const navSections = [
  {
    title: "Incidents & Claims",
    items: [
      { href: "/agency", label: "Dashboard" },
      { href: "/agency/incidents", label: "Incidents" },
      { href: "/agency/claims", label: "Claims" },
    ],
  },
  {
    title: "Claim Status",
    items: [
      { href: "/agency/claims", label: "All Claims" },
    ],
  },
  {
    title: "Documentation",
    items: [
      { href: "/agency/incidents", label: "View by Incident" },
    ],
  },
  {
    title: "Payments",
    items: [
      { href: "/agency/payments", label: "Payment History" },
    ],
  },
  {
    title: "Messages",
    items: [
      { href: "/agency/messages", label: "Inbox" },
    ],
  },
  {
    title: "Reports",
    items: [
      { href: "/agency", label: "Coming Soon" },
    ],
  },
]

export default function AgencyNavigation() {
  const pathname = usePathname()

  return (
    <aside className="w-64 bg-gray-900/50 border-r border-gray-800 min-h-screen p-6">
      <div className="mb-8">
        <h2 className="text-xl font-bold text-white">Agency Portal</h2>
        <p className="text-xs text-gray-400 mt-1">Transparency & Status</p>
      </div>

      <nav className="space-y-6">
        {navSections.map((section) => (
          <div key={section.title}>
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
              {section.title}
            </h3>
            <ul className="space-y-1">
              {section.items.map((item) => {
                const isActive = pathname === item.href
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      className={`block px-3 py-2 rounded-lg text-sm transition-colors ${
                        isActive
                          ? "bg-orange-500/20 text-orange-400 font-semibold"
                          : "text-gray-400 hover:bg-gray-800/50 hover:text-white"
                      }`}
                    >
                      {item.label}
                    </Link>
                  </li>
                )
              })}
            </ul>
          </div>
        ))}
      </nav>
    </aside>
  )
}

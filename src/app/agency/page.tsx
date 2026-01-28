"use client"

import Link from "next/link"
import { AgencyNavigation } from "@/components/agency"

export default function AgencyDashboard() {
  const quickStats = [
    { label: "Active Incidents", value: "12", href: "/agency/incidents" },
    { label: "Pending Claims", value: "8", href: "/agency/claims" },
    { label: "Recent Payments", value: "$24,350", href: "/agency/payments" },
  ]

  return (
    <div className="flex min-h-screen bg-black">
      <AgencyNavigation />

      <main className="flex-1 p-8">
        <div className="max-w-6xl mx-auto">
          <div className="mb-8">
            <h1 className="text-4xl font-bold text-white mb-2">
              Agency Portal Dashboard
            </h1>
            <p className="text-gray-400">
              Welcome to your transparency portal. Track incidents, claims, payments, and documentation in real-time.
            </p>
          </div>

          <div className="bg-gradient-to-br from-blue-500/10 to-purple-500/10 border-2 border-blue-500/30 rounded-xl p-6 mb-8">
            <h2 className="text-xl font-bold text-white mb-3">
              Welcome to Your Agency Portal
            </h2>
            <p className="text-gray-300 leading-relaxed">
              This portal gives you full visibility into your EMS billing operations. 
              Track every incident from dispatch to payment, view documentation status, 
              monitor claims progress, and communicate securely with our billing team. 
              All information is updated in real-time.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            {quickStats.map((stat) => (
              <Link
                key={stat.label}
                href={stat.href}
                className="bg-gray-900/50 border border-gray-800 rounded-xl p-6 hover:border-orange-500/50 transition-colors"
              >
                <div className="text-3xl font-bold text-white mb-2">
                  {stat.value}
                </div>
                <div className="text-sm text-gray-400">{stat.label}</div>
              </Link>
            ))}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-6">
              <h3 className="text-lg font-bold text-white mb-4">
                Quick Actions
              </h3>
              <div className="space-y-3">
                <Link
                  href="/agency/incidents"
                  className="block px-4 py-3 bg-orange-500/10 border border-orange-500/30 rounded-lg text-orange-400 hover:bg-orange-500/20 transition-colors"
                >
                  View All Incidents
                </Link>
                <Link
                  href="/agency/claims"
                  className="block px-4 py-3 bg-orange-500/10 border border-orange-500/30 rounded-lg text-orange-400 hover:bg-orange-500/20 transition-colors"
                >
                  Check Claim Status
                </Link>
                <Link
                  href="/agency/payments"
                  className="block px-4 py-3 bg-orange-500/10 border border-orange-500/30 rounded-lg text-orange-400 hover:bg-orange-500/20 transition-colors"
                >
                  View Payment History
                </Link>
                <Link
                  href="/agency/messages"
                  className="block px-4 py-3 bg-orange-500/10 border border-orange-500/30 rounded-lg text-orange-400 hover:bg-orange-500/20 transition-colors"
                >
                  Send Message
                </Link>
              </div>
            </div>

            <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-6">
              <h3 className="text-lg font-bold text-white mb-4">
                Recent Activity
              </h3>
              <div className="space-y-3 text-sm">
                <div className="flex items-start gap-3">
                  <div className="w-2 h-2 bg-green-500 rounded-full mt-2"></div>
                  <div>
                    <div className="text-gray-300">Claim #12345 paid</div>
                    <div className="text-gray-500 text-xs">2 hours ago</div>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-2 h-2 bg-blue-500 rounded-full mt-2"></div>
                  <div>
                    <div className="text-gray-300">Documentation received for Incident #67890</div>
                    <div className="text-gray-500 text-xs">5 hours ago</div>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-2 h-2 bg-yellow-500 rounded-full mt-2"></div>
                  <div>
                    <div className="text-gray-300">New message from billing team</div>
                    <div className="text-gray-500 text-xs">1 day ago</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}

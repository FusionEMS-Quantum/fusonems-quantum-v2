"use client"

import Link from "next/link"

export default function Topbar() {
  return (
    <header className="h-16 bg-[#0a0a0a]/95 backdrop-blur-xl border-b border-white/5 flex items-center justify-between px-6" aria-label="Platform controls">
      <div>
        <p className="text-[10px] uppercase tracking-widest text-orange-500 font-semibold mb-0.5">Command Gate</p>
        <h1 className="text-lg font-bold text-white">Platform Control</h1>
      </div>
      
      <div className="flex-1 max-w-xl mx-8">
        <div className="relative">
          <input 
            type="search" 
            placeholder="Search portals, audits, roles..." 
            aria-label="Search platform"
            className="w-full h-10 pl-10 pr-4 rounded-lg bg-white/5 border border-white/10 text-sm text-white placeholder:text-gray-500 focus:outline-none focus:border-orange-500/50 focus:bg-white/[0.07] transition-all"
          />
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>
      </div>
      
      <div className="flex items-center gap-4">
        <div className="px-3 py-1.5 rounded-lg bg-orange-500/10 border border-orange-500/20">
          <span className="text-xs text-orange-500 font-semibold">Orion EMS</span>
        </div>
        
        <button className="relative p-2 rounded-lg hover:bg-white/5 transition-colors" aria-label="Notifications">
          <svg className="w-5 h-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
          </svg>
          <span className="absolute top-1 right-1 w-2 h-2 bg-orange-500 rounded-full"></span>
        </button>
        
        <div className="flex items-center gap-3 pl-4 border-l border-white/10">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-gray-700 to-gray-800 flex items-center justify-center">
            <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
          </div>
          <Link 
            href="/logout" 
            className="text-sm text-gray-400 hover:text-white transition-colors"
          >
            Logout
          </Link>
        </div>
      </div>
    </header>
  )
}

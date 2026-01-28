import Link from "next/link"
import Logo from "@/components/Logo"

export default function ModulePage() {
  return (
    <div className="min-h-screen bg-black text-white">
      <header className="fixed top-0 w-full z-50 border-b border-white/10 bg-black/80 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center">
            <Logo variant="header" height={40} />
          </Link>
          <Link href="/" className="text-sm text-gray-400 hover:text-white transition">
            ← Back to Home
          </Link>
        </div>
      </header>

      <main className="pt-32 pb-20 px-6">
        <div className="max-w-5xl mx-auto text-center">
          <h1 className="text-5xl font-black mb-4 capitalize">compliance Module</h1>
          <p className="text-xl text-gray-400 mb-12">
            Module details coming soon
          </p>
          <Link 
            href="/demo" 
            className="inline-block px-8 py-4 bg-gradient-to-r from-orange-500 to-red-600 text-white font-bold rounded-lg hover:shadow-2xl hover:shadow-orange-500/50 transition"
          >
            Request Demo
          </Link>
        </div>
      </main>
    </div>
  )
}

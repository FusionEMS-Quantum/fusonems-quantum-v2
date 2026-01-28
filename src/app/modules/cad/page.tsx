import Link from "next/link"
import Logo from "@/components/Logo"

export default function CADModule() {
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
        <div className="max-w-5xl mx-auto">
          <div className="text-6xl mb-6">🚨</div>
          <h1 className="text-5xl font-black mb-4">CAD - Computer-Aided Dispatch</h1>
          <p className="text-xl text-gray-400 mb-12">
            Real-time dispatch with AI-powered routing optimization and automated resource allocation
          </p>

          <div className="grid md:grid-cols-2 gap-8">
            <div className="p-8 rounded-2xl border border-white/10 bg-white/5">
              <h2 className="text-2xl font-bold mb-4">Key Features</h2>
              <ul className="space-y-3 text-gray-400">
                <li className="flex items-start gap-3">
                  <span className="text-orange-500">•</span>
                  <span>Real-time unit tracking and status management</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-orange-500">•</span>
                  <span>AI-powered routing and resource optimization</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-orange-500">•</span>
                  <span>Multi-unit coordination and automatic dispatch</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-orange-500">•</span>
                  <span>Integration with 911 systems and emergency alerting</span>
                </li>
              </ul>
            </div>

            <div className="p-8 rounded-2xl border border-white/10 bg-white/5">
              <h2 className="text-2xl font-bold mb-4">Benefits</h2>
              <ul className="space-y-3 text-gray-400">
                <li className="flex items-start gap-3">
                  <span className="text-green-500">✓</span>
                  <span>Reduce response times by up to 35%</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-green-500">✓</span>
                  <span>Optimize resource allocation automatically</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-green-500">✓</span>
                  <span>Improve crew coordination and safety</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-green-500">✓</span>
                  <span>Real-time visibility across all units</span>
                </li>
              </ul>
            </div>
          </div>

          <div className="mt-12 text-center">
            <Link 
              href="/demo" 
              className="inline-block px-8 py-4 bg-gradient-to-r from-orange-500 to-red-600 text-white font-bold rounded-lg hover:shadow-2xl hover:shadow-orange-500/50 transition transform hover:scale-105"
            >
              Request Demo
            </Link>
          </div>
        </div>
      </main>
    </div>
  )
}

"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "./auth-context"
import { motion } from "framer-motion"
import { Shield, AlertCircle } from "lucide-react"

export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const { isAuthenticated, loading } = useAuth()

  useEffect(() => {
    if (!loading && !isAuthenticated) {
      router.push("/login")
    }
  }, [isAuthenticated, loading, router])

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.3 }}
          className="flex flex-col items-center gap-4"
        >
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
            className="w-16 h-16 border-4 border-orange-500/30 border-t-orange-500 rounded-full"
          />
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="text-zinc-400 font-medium"
          >
            Authenticating...
          </motion.p>
        </motion.div>
      </div>
    )
  }

  if (!isAuthenticated) {
    return null
  }

  return <>{children}</>
}

export function RoleGate({
  children,
  allowedRoles,
}: {
  children: React.ReactNode
  allowedRoles: string[]
}) {
  const { user } = useAuth()
  const router = useRouter()

  if (!user || !allowedRoles.includes(user.role)) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center p-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="max-w-md w-full bg-zinc-900 border border-red-500/20 rounded-2xl p-8"
        >
          <div className="flex items-center justify-center w-16 h-16 bg-red-500/10 rounded-full mx-auto mb-6">
            <AlertCircle className="w-8 h-8 text-red-400" />
          </div>
          
          <h1 className="text-3xl font-bold text-red-400 text-center mb-4">
            Access Denied
          </h1>
          
          <p className="text-zinc-400 text-center mb-8">
            You don't have permission to access this page. Contact your administrator if you believe this is an error.
          </p>

          <div className="space-y-3">
            <button
              onClick={() => router.back()}
              className="w-full py-3 px-4 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-xl transition-all font-medium border border-zinc-700"
            >
              Go Back
            </button>
            <button
              onClick={() => router.push("/dashboard")}
              className="w-full py-3 px-4 bg-gradient-to-r from-orange-600 to-red-600 text-white font-semibold rounded-xl hover:shadow-lg hover:shadow-orange-500/20 transition-all"
            >
              Go to Dashboard
            </button>
          </div>
        </motion.div>
      </div>
    )
  }

  return <>{children}</>
}

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "./auth-context"

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
      <main className="page-shell">
        <div className="page-container">
          <p style={{ color: "rgba(247, 246, 243, 0.72)" }}>Loading...</p>
        </div>
      </main>
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

  if (!user || !allowedRoles.includes(user.role)) {
    return (
      <main className="page-shell">
        <div className="page-container">
          <div className="glass-panel" style={{ maxWidth: "480px", margin: "auto" }}>
            <h1 style={{ fontSize: "1.875rem", marginBottom: "16px", color: "#ff4d4f" }}>
              Access Denied
            </h1>
            <p style={{ color: "rgba(247, 246, 243, 0.72)" }}>
              You do not have permission to access this page.
            </p>
          </div>
        </div>
      </main>
    )
  }

  return <>{children}</>
}

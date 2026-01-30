"use client"

import { apiFetch } from "@/lib/api"
import EnterpriseLoginShell from "@/components/portal/EnterpriseLoginShell"

export default function FusionCareProviderLogin() {
  const handleLogin = async (email: string, password: string) => {
    const response = await apiFetch<{ access_token: string }>("/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    })
    localStorage.setItem("token", response.access_token)
    localStorage.setItem("portal", "carefusion_provider")
  }

  return (
    <EnterpriseLoginShell
      portalName="FusionCare Provider"
      portalTagline="Secure access to patient charts, prescriptions, and dispatch-linked missions."
      portalGradient="from-cyan-600 via-cyan-700 to-blue-600"
      portalIcon="M11 4a7 7 0 00-7 7v2a3 3 0 003 3h8a3 3 0 003-3v-2a7 7 0 00-7-7m-4 7a4 4 0 118 0v2a1 1 0 01-1 1H8a1 1 0 01-1-1v-2zm2 8h6v2H9v-2z"
      onSubmit={handleLogin}
      redirectPath="/portals/carefusion/provider/dashboard"
      features={[
        "View assigned patients and active missions",
        "eRx with formulary and allergy checks",
        "Dispatch-linked visit timelines",
        "Role-based access and audit trails",
      ]}
    />
  )
}

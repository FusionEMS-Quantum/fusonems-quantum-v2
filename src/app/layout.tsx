import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "../lib/auth-context";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: "FusionEMS Quantum | The Regulated EMS Operating System",
  description:
    "Enterprise EMS operating system unifying CAD, ePCR, billing, compliance, and operational automation. NEMSIS-compliant, HIPAA-aligned, mission-critical support.",
  keywords: "EMS software, CAD system, ePCR, NEMSIS, HIPAA, EMS billing, ambulance dispatch, emergency medical services",
  openGraph: {
    title: "FusionEMS Quantum | The Regulated EMS Operating System",
    description: "Enterprise EMS platform for CAD, ePCR, billing, and compliance.",
    images: ['/assets/logo-social.svg'],
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: "FusionEMS Quantum | Regulated EMS OS",
    description: "Enterprise EMS operating system. NEMSIS-compliant. HIPAA-aligned.",
    images: ['/assets/logo-social.svg'],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${inter.variable} antialiased`}>
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  )
}

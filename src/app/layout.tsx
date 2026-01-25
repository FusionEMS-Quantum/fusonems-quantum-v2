import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "../lib/auth-context";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: "FusionEMS Quantum • The Regulated EMS OS",
  description:
    "FusionEMS Quantum is the cinematic portal for compliant EMS operations, telemetry, billing, and compliance.",
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

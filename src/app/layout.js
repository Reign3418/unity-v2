import { Geist, Geist_Mono } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import AuthProvider from "@/components/providers/AuthProvider";
import DashboardLayout from "@/components/layout/DashboardLayout";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata = {
  title: "Un.ty",
  description: "Advanced Data Visualization and Calculation Engine built for Kingdom Leadership.",
  icons: {
    icon: '/logo-smooth-dark.png'
  }
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased bg-[#0a0c0f]`}>
        <AuthProvider>
          <DashboardLayout>
            {children}
          </DashboardLayout>
        </AuthProvider>
        <Analytics />
      </body>
    </html>
  );
}

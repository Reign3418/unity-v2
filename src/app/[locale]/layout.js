import { Geist, Geist_Mono } from "next/font/google";
import AuthProvider from "@/components/providers/AuthProvider";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Analytics } from "@vercel/analytics/react";
import "../globals.css";
import { NextIntlClientProvider } from 'next-intl';
import { getMessages, setRequestLocale } from 'next-intl/server';

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

export default async function RootLayout({ children, params }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const messages = await getMessages();

  return (
    <html lang={locale}>
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased bg-[#0a0c0f]`}>
        <NextIntlClientProvider messages={messages}>
          <AuthProvider>
            <DashboardLayout>
              {children}
              <Analytics />
            </DashboardLayout>
          </AuthProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}

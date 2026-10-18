import { Geist, Geist_Mono } from "next/font/google";
import AuthProvider from "@/components/providers/AuthProvider";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { ValheonCommandProvider } from "@/components/command/ValheonCommandProvider";
import ValheonOmniBar from "@/components/command/ValheonOmniBar";
import ForensicsDrawer from "@/components/command/ForensicsDrawer";
import OpticsFloatingDock from "@/components/command/OpticsFloatingDock";
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
    <html lang={locale} dir={locale === 'ar' ? 'rtl' : 'ltr'}>
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased bg-[#0a0c0f]`}>
        <NextIntlClientProvider messages={messages}>
          <AuthProvider>
            <ValheonCommandProvider>
              <DashboardLayout>
                {children}
                <Analytics />
              </DashboardLayout>
              <ValheonOmniBar />
              <ForensicsDrawer />
              <OpticsFloatingDock />
            </ValheonCommandProvider>
          </AuthProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}

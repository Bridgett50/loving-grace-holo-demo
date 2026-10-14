import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { AppShell } from "@/components/app-shell";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { botHealth } from "@/lib/server/bot";
import { isDemoMode } from "@/lib/server/current-user";
import "./globals.css";
import { BRAND } from "@/lib/brand";

const geistSans = Geist({ variable: "--font-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export const metadata: Metadata = {
  title: `${BRAND.name} by ${BRAND.company}`,
  description: "Your verified, always-disclosed AI meeting twin for Google Meet, Zoom and Microsoft Teams.",
};

export const dynamic = "force-dynamic";

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const health = await botHealth();
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}>
      <body className="min-h-full">
        <TooltipProvider>
          <AppShell demoMode={isDemoMode} botOnline={health.ok}>
            {children}
          </AppShell>
          <Toaster richColors position="top-center" />
        </TooltipProvider>
      </body>
    </html>
  );
}

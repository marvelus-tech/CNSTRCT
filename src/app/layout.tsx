import type { Metadata } from "next";
import type { ReactNode } from "react";
import { Inter_Tight } from "next/font/google";
import { BillingDevBanner } from "@/components/billing-dev-banner";
import { HostedDemoBanner } from "@/components/hosted-demo-banner";
import { HOME_DESCRIPTION, HOME_TITLE, siteUrl } from "@/lib/seo";
import "./globals.css";

const interTight = Inter_Tight({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-inter-tight",
});

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl()),
  title: { default: HOME_TITLE, template: "%s" },
  description: HOME_DESCRIPTION,
  applicationName: "BizOS",
  openGraph: {
    title: HOME_TITLE,
    description: HOME_DESCRIPTION,
    siteName: "BizOS",
    type: "website",
  },
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className={`${interTight.variable} h-full`}>
      <body className="min-h-full antialiased">
        <HostedDemoBanner />
        <BillingDevBanner />
        {children}
      </body>
    </html>
  );
}

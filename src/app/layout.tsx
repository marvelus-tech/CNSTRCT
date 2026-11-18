import type { Metadata } from "next";
import type { ReactNode } from "react";
import { Outfit } from "next/font/google";
import { HostedDemoBanner } from "@/components/hosted-demo-banner";
import { HOME_DESCRIPTION, HOME_TITLE, siteUrl } from "@/lib/seo";
import "./globals.css";

const outfit = Outfit({ subsets: ["latin"], variable: "--font-outfit" });

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl()),
  title: { default: HOME_TITLE, template: "%s" },
  description: HOME_DESCRIPTION,
  applicationName: "CNSTRCT",
  openGraph: {
    title: HOME_TITLE,
    description: HOME_DESCRIPTION,
    siteName: "CNSTRCT",
    type: "website",
  },
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className={`${outfit.variable} h-full`}>
      <body className="min-h-full antialiased">
        <HostedDemoBanner />
        {children}
      </body>
    </html>
  );
}

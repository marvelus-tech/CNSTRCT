import type { Metadata } from "next";
import Link from "next/link";
import { LandingHero } from "@/components/landing-hero";
import { LandingFoundingTeam } from "@/components/landing-founding-team";
import { LandingConnectors } from "@/components/landing-connectors";
import { LandingPricing } from "@/components/landing-pricing";
import { LandingProofStrip } from "@/components/landing-proof-strip";
import { LandingSection } from "@/components/landing-section";
import { SiteFooter } from "@/components/site-footer";
import { Wordmark } from "@/components/wordmark";
import { FAQS } from "@/lib/faq";
import { HOME_DESCRIPTION, HOME_TITLE } from "@/lib/seo";

export const metadata: Metadata = {
  title: { absolute: HOME_TITLE },
  description: HOME_DESCRIPTION,
  alternates: { canonical: "/" },
};

export default function HomePage() {
  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "SoftwareApplication",
        name: "BizOS",
        applicationCategory: "BusinessApplication",
        operatingSystem: "Web",
        description: HOME_DESCRIPTION,
        offers: [
          { "@type": "Offer", name: "Starter", price: "75", priceCurrency: "USD" },
          { "@type": "Offer", name: "Pro", price: "149", priceCurrency: "USD" },
          { "@type": "Offer", name: "Scale", price: "400", priceCurrency: "USD" },
        ],
      },
      {
        "@type": "FAQPage",
        mainEntity: FAQS.map((item) => ({
          "@type": "Question",
          name: item.question,
          acceptedAnswer: { "@type": "Answer", text: item.answer },
        })),
      },
    ],
  };

  return (
    <div className="min-h-full bg-card">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <header className="flex items-center justify-between px-4 py-4 sm:px-5 md:px-10">
        <Wordmark />
        <nav className="flex items-center gap-4 text-sm">
          <Link href="/login?next=/command-center" className="text-muted">
            Log in
          </Link>
          <Link href="/triage" className="font-medium">
            Start a BIZ
          </Link>
        </nav>
      </header>
      <main>
        <LandingHero />
        <LandingFoundingTeam />
        <LandingProofStrip />
        <LandingConnectors />
        <LandingPricing />
        <LandingSection variant="plain">
          <div className="mx-auto max-w-3xl">
            <p className="landing-eyebrow">FAQ</p>
            <h2 className="landing-section-title mt-2">Questions people ask first</h2>
            <div className="mt-8 flex flex-col gap-6">
              {FAQS.map((item) => (
                <article key={item.question} className="py-1">
                  <h3 className="text-lg font-medium">{item.question}</h3>
                  <p className="landing-section-lead mt-2">{item.answer}</p>
                </article>
              ))}
            </div>
          </div>
        </LandingSection>
      </main>
      <SiteFooter className="border-t-0 bg-card" />
    </div>
  );
}
import type { Metadata } from "next";
import Link from "next/link";
import { HeroCrosshairShowcase } from "@/components/hero-crosshair-showcase";
import { LandingFoundingTeam } from "@/components/landing-founding-team";
import { LandingConnectors } from "@/components/landing-connectors";
import { LandingPricing } from "@/components/landing-pricing";
import { LandingProofStrip } from "@/components/landing-proof-strip";
import { LandingSection } from "@/components/landing-section";
import { Button } from "@/components/ui/button";
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
          { "@type": "Offer", name: "Starter", price: "39", priceCurrency: "USD" },
          { "@type": "Offer", name: "Pro", price: "79", priceCurrency: "USD" },
          { "@type": "Offer", name: "Scale", price: "200", priceCurrency: "USD" },
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
    <div className="min-h-full">
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
        <section className="px-4 pb-12 pt-6 sm:px-5 sm:pb-16 sm:pt-8 md:px-10 md:pt-16">
          <div className="mx-auto grid max-w-6xl items-center gap-10 md:grid-cols-2 md:gap-12">
            <div className="rise">
              <p className="landing-eyebrow">
                <span className="text-accent">Business</span> operating system
              </p>
              <h1 className="mt-3 max-w-xl text-[1.75rem] leading-[1.15] tracking-tight text-foreground sm:text-4xl sm:leading-[1.12] md:text-5xl md:leading-[1.1]">
                Your founding team ships on day one.
              </h1>
              <p className="mt-4 max-w-lg text-base font-normal leading-[1.55] text-muted sm:text-lg sm:leading-[1.6]">
                BizOS finds a business that fits you, then starts your bots. They do the work. You approve it.
              </p>
              <div className="mt-8">
                <Button size="lg" asChild>
                  <Link href="/triage">Start a BIZ</Link>
                </Button>
              </div>
            </div>
            <div className="rise w-full md:justify-self-end">
              <HeroCrosshairShowcase />
            </div>
          </div>
        </section>
        <LandingFoundingTeam />
        <LandingProofStrip />
        <LandingConnectors />
        <LandingPricing />
        <LandingSection variant="plain">
          <div className="mx-auto max-w-3xl">
            <p className="landing-eyebrow">FAQ</p>
            <h2 className="landing-section-title mt-2">Questions people ask first</h2>
            <div className="mt-8 divide-y divide-border">
              {FAQS.map((item) => (
                <article key={item.question} className="py-5">
                  <h3 className="text-lg font-medium">{item.question}</h3>
                  <p className="landing-section-lead mt-2">{item.answer}</p>
                </article>
              ))}
            </div>
          </div>
        </LandingSection>
      </main>
      <SiteFooter />
    </div>
  );
}
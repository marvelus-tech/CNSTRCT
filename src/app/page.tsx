import type { Metadata } from "next";
import Link from "next/link";
import { HeroCrosshairShowcase } from "@/components/hero-crosshair-showcase";
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
        name: "CNSTRCT",
        applicationCategory: "BusinessApplication",
        operatingSystem: "Web",
        description: HOME_DESCRIPTION,
        offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
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
            Start
          </Link>
        </nav>
      </header>
      <main>
        <section className="px-4 pb-12 pt-6 sm:px-5 sm:pb-16 sm:pt-8 md:px-10 md:pt-16">
          <div className="mx-auto grid max-w-6xl items-center gap-10 md:grid-cols-2 md:gap-12">
            <div className="rise">
              <h1 className="max-w-xl text-[1.75rem] font-semibold leading-[1.12] tracking-tight text-foreground sm:text-4xl sm:leading-[1.08] md:text-6xl md:leading-[1.05]">
                Spin up a real business from almost nothing.
              </h1>
              <div className="mt-8">
                <Button size="lg" asChild>
                  <Link href="/triage">See what fits you</Link>
                </Button>
              </div>
            </div>
            <div className="rise w-full md:justify-self-end">
              <HeroCrosshairShowcase />
            </div>
          </div>
        </section>
        <section className="border-y border-border bg-card px-5 py-14 md:px-10">
          <ol className="mx-auto grid max-w-5xl gap-8 md:grid-cols-3">
            {[
              [
                "Tell us your interest and situation",
                "A short triage on your skills, resources, and what you want to explore.",
              ],
              [
                "Custom engine matches and presents suitable business ideas",
                "CNSTRCT surfaces paths that fit you—not a one-size-fits-all template.",
              ],
              [
                "Build it and start your business journey",
                "Set up your business, approve what the agents draft, and launch when you are ready.",
              ],
            ].map(([title, body], index) => (
              <li key={title}>
                <p className="text-sm font-medium text-accent">0{index + 1}</p>
                <h2 className="mt-2 text-2xl font-semibold tracking-tight">{title}</h2>
                <p className="mt-2 text-muted">{body}</p>
              </li>
            ))}
          </ol>
        </section>
        <section className="px-5 py-16 md:px-10">
          <div className="mx-auto max-w-3xl">
            <h2 className="text-3xl font-semibold tracking-tight md:text-4xl">Questions people ask first</h2>
            <div className="mt-8 divide-y divide-border">
              {FAQS.map((item) => (
                <article key={item.question} className="py-5">
                  <h3 className="text-lg font-medium">{item.question}</h3>
                  <p className="mt-2 text-muted">{item.answer}</p>
                </article>
              ))}
            </div>
          </div>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
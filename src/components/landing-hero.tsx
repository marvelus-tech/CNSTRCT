import Link from "next/link";
import { BusinessHexMark } from "@/components/business-hex-mark";
import { Button } from "@/components/ui/button";

export function LandingHero() {
  return (
    <section
      className="overflow-x-hidden px-4 pb-12 pt-6 sm:px-5 sm:pb-16 sm:pt-8 md:px-10 md:pt-16"
      aria-label="BizOS introduction"
    >
      <div className="rise mx-auto flex w-full max-w-3xl flex-col items-center text-center">
        <div className="hero-overlap-stage">
          <div className="hero-overlap-brand-stack">
            <div className="hero-overlap-brand-core">
              <h1 className="hero-overlap-brand hero-gradient-brand">BizOS</h1>
              <div className="hero-overlap-hex" aria-hidden="true">
                <BusinessHexMark
                  className="hero-overlap-hex__mark"
                  shapeClassName="hero-brandmark__shape"
                  aria-hidden
                />
              </div>
            </div>
            <div className="hero-overlap-hex-spacer" aria-hidden="true" />
          </div>
        </div>
        <div className="hero-overlap-copy-stack w-full max-w-lg shrink-0">
          <p className="text-base font-normal leading-[1.55] text-muted sm:text-lg sm:leading-[1.6]">
            BizOS matches a business that fits you, gives you a founding team, so you can start being
            productive on day one.
          </p>
          <div className="mt-8 flex justify-center">
            <Button size="lg" asChild>
              <Link href="/triage">Start a BIZ</Link>
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}
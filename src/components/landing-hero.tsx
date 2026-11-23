import Link from "next/link";
import { BusinessHexMark } from "@/components/business-hex-mark";
import { Button } from "@/components/ui/button";

export function LandingHero() {
  return (
    <section
      className="overflow-x-hidden px-4 pb-12 pt-6 sm:px-5 sm:pb-16 sm:pt-8 md:px-10 md:pt-16"
      aria-label="BizOS introduction"
    >
      <div className="rise mx-auto flex max-w-3xl flex-col items-center text-center">
        <div className="hero-overlap-stage">
          <span className="hero-overlap-brand hero-gradient-brand" aria-hidden="true">
            BizOS
          </span>
          <div className="hero-overlap-hex">
            <BusinessHexMark
              className="hero-overlap-hex__mark"
              shapeClassName="hero-brandmark__shape"
              aria-hidden
            />
          </div>
        </div>
        <div className="mt-2 w-full max-w-lg sm:mt-4">
          <h1 className="text-[1.75rem] leading-[1.15] tracking-tight text-foreground sm:text-4xl sm:leading-[1.12] md:text-5xl md:leading-[1.1]">
            Your founding team ships on day one.
          </h1>
          <p className="mt-4 text-base font-normal leading-[1.55] text-muted sm:text-lg sm:leading-[1.6]">
            BizOS finds a business that fits you, then starts your bots. They do the work. You approve it.
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
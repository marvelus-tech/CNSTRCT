import Link from "next/link";
import { isEphemeralHostedDemo, SEEDED_DEMO_DESK_SLUG } from "@/lib/hosted-demo";

export function HostedDemoBanner() {
  if (!isEphemeralHostedDemo()) return null;
  return (
    <div className="border-b border-amber-500/30 bg-amber-500/10 px-4 py-2.5 text-center text-sm text-foreground" role="status">
      <p>
        <span className="font-medium">Hosted demo.</span> Data lives in serverless temp storage. Your session, triage, and workspace may reset
        after a cold start or deploy. The seeded public desk{" "}
        <Link href={`/b/${SEEDED_DEMO_DESK_SLUG}`} className="underline underline-offset-2">
          /b/{SEEDED_DEMO_DESK_SLUG}
        </Link>{" "}
        always loads with sample content. No login required.
      </p>
    </div>
  );
}
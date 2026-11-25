import Link from "next/link";
import { Wordmark } from "@/components/wordmark";

export const metadata = {
  title: "Privacy",
  description: "How BizOS handles account data on CNSTRCT.",
};

export default function PrivacyPage() {
  return (
    <div className="min-h-full bg-background px-5 py-10 md:px-10">
      <Wordmark />
      <h1 className="mt-8 text-3xl font-semibold tracking-tight">Privacy</h1>
      <div className="mt-6 max-w-xl space-y-4 text-sm leading-7 text-muted">
        <p>
          BizOS stores account email, businesses, and agent data in a Postgres database on production. Session cookies keep you signed in on this origin.
        </p>
        <p>
          To request account deletion, email the address listed on your BizOS welcome mail once transactional email is enabled, or contact the team through your Marvelus support channel.
        </p>
        <p>We do not sell personal data. Orgo and Composio credentials never ship to the browser.</p>
      </div>
      <Link href="/" className="mt-8 inline-block text-sm underline">
        Home
      </Link>
    </div>
  );
}
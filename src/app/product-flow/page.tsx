import Link from "next/link";
import { Wordmark } from "@/components/wordmark";

export const metadata = {
  title: "How BizOS works",
  description: "Account, command center, workspace, and your public business site.",
};

export default function ProductFlowPage() {
  return (
    <div className="min-h-full bg-background px-5 py-10 md:px-10">
      <Wordmark />
      <h1 className="mt-8 text-3xl font-semibold tracking-tight">How BizOS fits together</h1>
      <ol className="mt-6 max-w-xl list-decimal space-y-4 pl-5 text-sm leading-7 text-muted">
        <li>
          <strong className="text-foreground">Account.</strong> Sign in with a magic link or demo session. Your profile and businesses live in Neon on production.
        </li>
        <li>
          <strong className="text-foreground">Command center.</strong> List ventures, start a new business, and see provisioning status for Orgo, Treg, and Composio.
        </li>
        <li>
          <strong className="text-foreground">Workspace.</strong> Chat with your orchestrator and specialists on BizOS. Shell commands run on the shared Orgo workspace VM.
        </li>
        <li>
          <strong className="text-foreground">Public site.</strong> Customers visit <code className="text-foreground">/b/your-slug</code> for leads and contact.
        </li>
      </ol>
      <p className="mt-8 text-sm text-muted">
        Full technical notes:{" "}
        <a href="https://github.com/marvelus-tech/CNSTRCT/blob/main/docs/product-flow.md" className="underline">
          docs/product-flow.md
        </a>
      </p>
      <p className="mt-4">
        <Link href="/command-center" className="text-sm underline">
          Back to command center
        </Link>
      </p>
    </div>
  );
}
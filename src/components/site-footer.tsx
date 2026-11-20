import Link from "next/link";

export function SiteFooter() {
  return (
    <footer className="border-t border-border px-5 py-8 text-sm text-muted md:px-10">
      <div className="mx-auto flex max-w-5xl flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p>BizOS. A custom small business builder.</p>
        <nav className="flex gap-4">
          <Link href="/triage" className="hover:text-foreground">
            Start
          </Link>
          <Link href="/b/harbor-tradie-desk" className="hover:text-foreground">
            Sample business
          </Link>
        </nav>
      </div>
    </footer>
  );
}

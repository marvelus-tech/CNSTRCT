export function SiteFooter() {
  const year = new Date().getFullYear();

  return (
    <footer className="border-t border-border px-5 py-8 text-sm text-muted md:px-10">
      <div className="mx-auto flex max-w-5xl flex-col gap-2">
        <p className="landing-section-lead text-sm">BizOS. Custom Business operating system.</p>
        <p className="text-sm">
          © {year} BizOS. All rights reserved.
        </p>
      </div>
    </footer>
  );
}
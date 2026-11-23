import { cn } from "@/lib/utils";

type SiteFooterProps = {
  className?: string;
};

export function SiteFooter({ className }: SiteFooterProps) {
  const year = new Date().getFullYear();

  return (
    <footer className={cn("border-t border-border bg-background px-5 py-8 text-muted md:px-10", className)}>
      <div className="mx-auto flex max-w-5xl flex-col items-center gap-2 text-center">
        <p className="landing-fine-print">BizOS. Custom Business operating system.</p>
        <p className="landing-fine-print">
          © {year} BizOS. All rights reserved.
        </p>
      </div>
    </footer>
  );
}
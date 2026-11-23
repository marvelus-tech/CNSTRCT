import Link from "next/link";

export function Wordmark({ href = "/" }: { href?: string }) {
  return (
    <Link href={href} className="inline-flex items-center gap-2 text-sm font-medium tracking-tight">
      BizOS
    </Link>
  );
}

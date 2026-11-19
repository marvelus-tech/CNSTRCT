import type { Metadata } from "next";
import { Suspense } from "react";
import { OpportunityBoard } from "@/components/opportunity-board";
import { OPPORTUNITIES_DESCRIPTION, OPPORTUNITIES_TITLE } from "@/lib/seo";

export const metadata: Metadata = {
  title: { absolute: OPPORTUNITIES_TITLE },
  description: OPPORTUNITIES_DESCRIPTION,
  alternates: { canonical: "/opportunities" },
  robots: { index: false, follow: false },
};

export default function OpportunitiesPage() {
  return (
    <Suspense fallback={<div className="min-h-full bg-background" />}>
      <OpportunityBoard />
    </Suspense>
  );
}

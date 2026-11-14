import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { DashboardApp } from "@/components/dashboard-app";
import { DASHBOARD_DESCRIPTION, DASHBOARD_TITLE } from "@/lib/seo";
import { currentUser } from "@/lib/session";
import { getBusiness } from "@/lib/store";

export const metadata: Metadata = {
  title: { absolute: DASHBOARD_TITLE },
  description: DASHBOARD_DESCRIPTION,
  robots: { index: false, follow: false },
};

export default async function WorkspacePage({ params }: { params: Promise<{ businessId: string }> }) {
  const { businessId } = await params;
  const user = await currentUser();
  if (!user) redirect(`/login?next=/workspace/${businessId}`);
  const business = getBusiness(businessId);
  if (!business || business.userId !== user.id) notFound();
  return <DashboardApp businessId={businessId} />;
}
import { redirect } from "next/navigation";
import { currentUser } from "@/lib/session";
import { getBusinessForUser } from "@/lib/store";

export default async function DashboardPage() {
  const user = await currentUser();
  if (!user) redirect("/login?next=/dashboard");
  const business = await getBusinessForUser(user.id);
  if (!business) redirect("/command-center");
  redirect(`/workspace/${business.id}`);
}
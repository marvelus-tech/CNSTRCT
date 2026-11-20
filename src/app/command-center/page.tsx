import type { Metadata } from "next";
import { CommandCenterApp } from "@/components/command-center-app";

export const metadata: Metadata = {
  title: { absolute: "BizOS command center | Your businesses" },
  description: "List every business you constructed on BizOS and open its agent workspace.",
  alternates: { canonical: "/command-center" },
  robots: { index: false, follow: false },
};

export default function CommandCenterPage() {
  return <CommandCenterApp />;
}
import { NextResponse } from "next/server";
import { z } from "zod";

import { emailConfigured, sendTransactional, welcomeEmailContent } from "@/lib/email";

export const runtime = "nodejs";

function authorized(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const header = request.headers.get("authorization");
  if (header === `Bearer ${secret}`) return true;
  return request.headers.get("x-cron-secret") === secret;
}

const bodySchema = z.object({
  to: z.string().email(),
  template: z.enum(["welcome"]).default("welcome"),
});

export async function POST(request: Request) {
  if (!authorized(request)) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }
  if (!emailConfigured()) {
    return NextResponse.json({ error: "Email provider not configured." }, { status: 503 });
  }

  let json: unknown;
  try {
    json = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400 });
  }

  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid body.", details: parsed.error.flatten() }, { status: 400 });
  }

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") || "http://localhost:3000";
  const content =
    parsed.data.template === "welcome"
      ? welcomeEmailContent({ siteUrl: `${siteUrl}/command-center` })
      : welcomeEmailContent({ siteUrl: `${siteUrl}/command-center` });

  const result = await sendTransactional({
    to: parsed.data.to,
    subject: content.subject,
    text: content.text,
    html: content.html,
    tags: [{ name: "template", value: parsed.data.template }],
  });

  if (!result.ok) {
    return NextResponse.json({ ok: false, reason: result.reason, message: result.message }, { status: 502 });
  }

  return NextResponse.json({ ok: true, id: result.id });
}
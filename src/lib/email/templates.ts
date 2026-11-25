export type WelcomeEmailInput = {
  siteUrl: string;
};

export type DeskReadyEmailInput = {
  businessName: string;
  workspaceUrl: string;
  commandCenterUrl: string;
};

export function deskReadyEmailContent(input: DeskReadyEmailInput) {
  const subject = `Your ${input.businessName} desk is ready`;
  const text = [
    `Your BizOS desk for ${input.businessName} is ready.`,
    "",
    "Open your workspace:",
    input.workspaceUrl,
    "",
    "Command center:",
    input.commandCenterUrl,
  ].join("\n");
  const html = `<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"><title>${subject}</title></head>
<body style="font-family:system-ui,sans-serif;line-height:1.5;color:#111;">
  <p>Your BizOS desk for <strong>${input.businessName}</strong> is ready.</p>
  <p><a href="${input.workspaceUrl}">Open your workspace</a></p>
  <p><a href="${input.commandCenterUrl}">Back to command center</a></p>
</body>
</html>`;
  return { subject, text, html };
}

export function welcomeEmailContent(input: WelcomeEmailInput) {
  const subject = "Welcome to BizOS";
  const text = [
    "Welcome to BizOS.",
    "",
    "Your account is ready. Open your command center to create a business workspace:",
    input.siteUrl,
    "",
    "If you did not sign up, you can ignore this message.",
  ].join("\n");
  const html = `<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"><title>${subject}</title></head>
<body style="font-family:system-ui,sans-serif;line-height:1.5;color:#111;">
  <p>Welcome to BizOS.</p>
  <p>Your account is ready. <a href="${input.siteUrl}">Open your command center</a> to create a business workspace.</p>
  <p style="color:#555;font-size:14px;">If you did not sign up, you can ignore this message.</p>
</body>
</html>`;
  return { subject, text, html };
}
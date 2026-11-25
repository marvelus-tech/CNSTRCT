export type WelcomeEmailInput = {
  siteUrl: string;
};

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
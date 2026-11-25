/** Product transactional mail (Resend). Magic links stay on Supabase. */

export function emailConfigured() {
  return Boolean(process.env.RESEND_API_KEY?.trim() && process.env.EMAIL_FROM?.trim());
}

export function emailFromAddress() {
  const from = process.env.EMAIL_FROM?.trim();
  if (!from) return null;
  return from;
}
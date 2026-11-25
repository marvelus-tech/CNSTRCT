/** Redact email addresses before they appear in logs or audit rows. */
export function redactEmailAddress(address: string) {
  const trimmed = address.trim();
  const at = trimmed.lastIndexOf("@");
  if (at <= 0) return "[redacted]";
  const local = trimmed.slice(0, at);
  const domain = trimmed.slice(at + 1);
  if (local.length <= 1) return `*@${domain}`;
  return `${local[0]}***@${domain}`;
}
/** Strip tokens and connection secrets before they reach logs, audits, or provision_error. */
export function redactProvisioningError(message: string) {
  let text = message;
  for (const name of ["ORGO_API_KEY", "TREG_TOKEN", "COMPOSIO_API_KEY", "DATABASE_URL", "POSTGRES_URL"] as const) {
    const value = process.env[name];
    if (value && value.length >= 8) text = text.split(value).join("[redacted]");
  }
  return text
    .replace(/Bearer\s+\S+/gi, "Bearer [redacted]")
    .replace(/\bsk_[A-Za-z0-9_-]+\b/g, "[redacted]")
    .replace(/postgres(?:ql)?:\/\/\S+/gi, "postgres://[redacted]");
}
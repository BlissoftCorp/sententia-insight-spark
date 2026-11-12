/**
 * Configurable list of internal/test emails excluded from every Tracking metric.
 * Set EXCLUDED_EMAILS in the service environment, comma-separated:
 *   EXCLUDED_EMAILS="prueba@blissoft.co,admin@sententia.co"
 */
export function getExcludedEmails(): string[] {
  return (process.env.EXCLUDED_EMAILS || "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
}

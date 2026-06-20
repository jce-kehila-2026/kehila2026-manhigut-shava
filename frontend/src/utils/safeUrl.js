const ALLOWED = /^https?:\/\//i;

export function safeUrl(raw) {
  if (!raw) return "";
  const trimmed = raw.trim();
  if (ALLOWED.test(trimmed)) return trimmed;
  // Prepend https:// only for bare domain inputs (no scheme at all)
  if (!trimmed.includes(":")) return "https://" + trimmed;
  // Anything with a non-http scheme (javascript:, data:, vbscript:, ...) is rejected
  return "";
}

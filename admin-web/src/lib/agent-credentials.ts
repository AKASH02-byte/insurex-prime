/**
 * Display-only mirror of the server's default agent password rule (the server is the
 * source of truth and does the hashing): first 5 letters of the first name + "@" + phone digits.
 * "Rajesh Verma" + "9876543210" -> "Rajes@9876543210".
 */
export function previewDefaultPassword(fullName: string, phone: string): string {
  const firstName = fullName.trim().split(/\s+/)[0] ?? "";
  const prefix = firstName.replace(/[^\p{L}]/gu, "").slice(0, 5);
  const digits = phone.replace(/\D/g, "");
  if (!prefix || !digits) return "";
  return `${prefix}@${digits}`;
}

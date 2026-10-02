/** Case-insensitive "contains" across fields, e.g. searchAny(["fullName", "phone"], term). */
export function containsInsensitive(term: string) {
  return { contains: term, mode: "insensitive" as const };
}

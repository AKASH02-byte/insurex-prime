/** Public landing page (public-web). No trailing slash. */
export const PUBLIC_SITE_URL = (
  import.meta.env["VITE_PUBLIC_SITE_URL"] ?? "http://localhost:3000"
).replace(/\/+$/, "");

/** Base URL of the admin portal (admin-web), where /login lives. No trailing slash. */
export const ADMIN_WEB_URL = (
  import.meta.env["VITE_ADMIN_WEB_URL"] ?? "http://localhost:8080"
).replace(/\/+$/, "");

export const LOGIN_URL = `${ADMIN_WEB_URL}/login`;

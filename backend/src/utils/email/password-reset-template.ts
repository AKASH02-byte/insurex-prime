import type { EmailMessage } from "./send.js";

export interface PasswordResetEmailInput {
  /** First name, or the agency's contact name; falls back to a plain greeting. */
  name?: string | undefined;
  /** Agency the account belongs to, shown under the greeting. */
  agencyName?: string | undefined;
  temporaryPassword: string;
  /** Opens the reset page; the reset only happens after the user confirms there. */
  resetUrl: string;
  /** Public origin of the admin web app, used for the logo and the sign-in link. */
  webBaseUrl: string;
  expiresInMinutes: number;
  year?: number;
}

// InsuroX brand, same blues as the sign-in page.
const BRAND = "#0265DC";
const BRAND_DARK = "#0154bc";
const NAVY = "#05234d";
const INK = "#0f172a";
const MUTED = "#475569";
const SOFT = "#94a3b8";
const PAGE_BG = "#f1f5fb";
const PANEL_BG = "#f4f8ff";
const SANS = "'Inter', 'Segoe UI', Roboto, Arial, Helvetica, sans-serif";
const MONO = "'SFMono-Regular', Menlo, Consolas, 'Courier New', monospace";

export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function step(number: number, title: string, body: string): string {
  return `
    <tr>
      <td width="40" valign="top" style="padding:0 0 14px;">
        <div style="width:26px;height:26px;line-height:26px;border-radius:13px;background:${BRAND};font-family:${SANS};font-size:12px;font-weight:700;color:#ffffff;text-align:center;">${number}</div>
      </td>
      <td valign="top" style="padding:2px 0 14px;font-family:${SANS};font-size:14px;line-height:1.5;color:${MUTED};">
        <strong style="color:${INK};">${title}</strong><br />${body}
      </td>
    </tr>`;
}

/**
 * Forgot-password email: a button to confirm the reset plus the temporary password the
 * account will have afterwards. Table layout with inline styles, because Gmail and Outlook
 * drop <style> blocks, flexbox and scripts.
 */
export function renderPasswordResetEmail(
  input: PasswordResetEmailInput,
): Omit<EmailMessage, "to"> {
  const base = input.webBaseUrl.replace(/\/+$/, "");
  const logoUrl = `${base}/insurox-icon.png`;
  const loginUrl = `${base}/login`;
  const year = input.year ?? new Date().getFullYear();
  const greeting = input.name ? `Hi ${escapeHtml(input.name)},` : "Hello,";
  const minutes = input.expiresInMinutes;
  const password = escapeHtml(input.temporaryPassword);
  const resetUrl = escapeHtml(input.resetUrl);

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta name="color-scheme" content="light" />
  <title>Reset your InsuroX password</title>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet" />
</head>
<body style="margin:0;padding:0;background:${PAGE_BG};">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;">Confirm your password reset. Your temporary password is inside. The link expires in ${minutes} minutes.</div>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${PAGE_BG};">
    <tr><td align="center" style="padding:28px 12px;">
      <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="width:100%;max-width:600px;background:#ffffff;border-radius:20px;overflow:hidden;border:1px solid #dbe4f3;">

        <tr><td height="5" style="height:5px;line-height:5px;font-size:0;background:${BRAND};background-image:linear-gradient(to right,${NAVY},${BRAND},#22d3ee);">&nbsp;</td></tr>

        <tr><td style="padding:26px 32px 20px;">
          <table role="presentation" cellpadding="0" cellspacing="0"><tr>
            <td valign="middle"><img src="${logoUrl}" width="40" height="40" alt="InsuroX" style="display:block;width:40px;height:40px;border:0;border-radius:10px;" /></td>
            <td valign="middle" style="padding-left:10px;font-family:${SANS};font-size:22px;font-weight:800;letter-spacing:-0.3px;color:${NAVY};">InsuroX</td>
            <td valign="middle" style="padding-left:10px;">
              <span style="display:inline-block;padding:3px 10px;border:1px solid #dbe4f3;border-radius:999px;background:#f1f5f9;font-family:${SANS};font-size:11px;font-weight:600;color:${MUTED};">Prime Portal</span>
            </td>
          </tr></table>
        </td></tr>

        <tr><td style="padding:8px 32px 0;">
          <div style="font-family:${SANS};font-size:11px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;color:${BRAND};">Password reset</div>
          <h1 style="margin:8px 0 12px;font-family:${SANS};font-size:26px;line-height:1.25;font-weight:800;color:${INK};">Reset your password</h1>
          <p style="margin:0 0 6px;font-family:${SANS};font-size:15px;line-height:1.6;color:${MUTED};">${greeting}</p>
          ${input.agencyName ? `<p style="margin:0 0 6px;font-family:${SANS};font-size:13px;color:${SOFT};">${escapeHtml(input.agencyName)}</p>` : ""}
          <p style="margin:10px 0 0;font-family:${SANS};font-size:15px;line-height:1.6;color:${MUTED};">We received a request to reset the password for your InsuroX account. Confirm the reset with the button below. Your account then gets the temporary password shown here.</p>
        </td></tr>

        <tr><td style="padding:24px 32px 4px;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
            <tr><td align="center" style="padding:22px 16px;background:${PANEL_BG};border:1px solid #cfe0fb;border-radius:16px;">
              <div style="margin-bottom:12px;font-family:${SANS};font-size:11px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;color:${BRAND_DARK};">Your temporary password</div>
              <table role="presentation" cellpadding="0" cellspacing="0" align="center"><tr>
                <td style="padding:12px 20px;background:#ffffff;border:2px dashed ${BRAND};border-radius:12px;">
                  <span style="-webkit-user-select:all;user-select:all;font-family:${MONO};font-size:26px;font-weight:700;letter-spacing:2px;color:${NAVY};">${password}</span>
                </td>
              </tr></table>
              <div style="margin-top:10px;font-family:${SANS};font-size:12px;color:${SOFT};">Double-click or long-press the password to select it</div>
            </td></tr>
          </table>
        </td></tr>

        <tr><td align="center" style="padding:24px 32px 8px;">
          <table role="presentation" cellpadding="0" cellspacing="0" align="center"><tr>
            <td bgcolor="${BRAND}" style="border-radius:12px;">
              <a href="${resetUrl}" style="display:inline-block;padding:14px 32px;font-family:${SANS};font-size:15px;font-weight:700;color:#ffffff;text-decoration:none;border-radius:12px;">Reset my password &rarr;</a>
            </td>
          </tr></table>
          <p style="margin:12px 0 0;font-family:${SANS};font-size:12px;color:${SOFT};">This link expires in <strong style="color:${MUTED};">${minutes} minutes</strong> and works once.</p>
        </td></tr>

        <tr><td style="padding:20px 32px 0;">
          <div style="margin-bottom:12px;font-family:${SANS};font-size:11px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;color:${SOFT};">What happens next</div>
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
            ${step(1, "Confirm the reset", "Click the button and confirm on the page that opens.")}
            ${step(2, "Sign in", `Use your usual ID or email and the temporary password above on the <a href="${loginUrl}" style="color:${BRAND};text-decoration:none;font-weight:600;">sign-in page</a>.`)}
            ${step(3, "Choose a new password", "You will be asked to set your own password before you continue.")}
          </table>
        </td></tr>

        <tr><td style="padding:8px 32px 0;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
            <tr><td style="padding:14px 16px;background:#fffbeb;border:1px solid #fde68a;border-radius:12px;font-family:${SANS};font-size:13px;line-height:1.55;color:#78350f;">
              <strong>Didn't ask for this?</strong> You can ignore this email. Nothing changes until the button above is used, and your current password keeps working. Never share this password with anyone, including InsuroX support.
            </td></tr>
          </table>
        </td></tr>

        <tr><td style="padding:22px 32px 0;">
          <p style="margin:0;font-family:${SANS};font-size:12px;line-height:1.6;color:${SOFT};">Button not working? Copy this link into your browser:<br /><a href="${resetUrl}" style="color:${BRAND};word-break:break-all;">${resetUrl}</a></p>
        </td></tr>

        <tr><td style="padding:26px 32px 0;"><div style="height:1px;line-height:1px;font-size:0;background:#e2e8f0;">&nbsp;</div></td></tr>
        <tr><td align="center" style="padding:18px 32px 28px;font-family:${SANS};font-size:12px;line-height:1.6;color:${SOFT};">
          <div style="font-weight:700;color:${MUTED};">InsuroX Prime</div>
          <div style="margin-top:8px;">&copy; ${year} Vikaas Infina Technologies Pvt Ltd. All rights reserved.</div>
        </td></tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`;

  const text = [
    input.name ? `Hi ${input.name},` : "Hello,",
    "",
    "We received a request to reset the password for your InsuroX account.",
    "",
    `Temporary password: ${input.temporaryPassword}`,
    "",
    `Confirm the reset (link expires in ${minutes} minutes and works once):`,
    input.resetUrl,
    "",
    "Then sign in with your usual ID or email and the temporary password, and choose a new password when asked:",
    loginUrl,
    "",
    "Didn't ask for this? Ignore this email. Nothing changes until the link is used, and your current password keeps working.",
    "Never share this password with anyone, including InsuroX support.",
    "",
    `InsuroX Prime, ${year} Vikaas Infina Technologies Pvt Ltd.`,
  ].join("\n");

  return { subject: "Reset your InsuroX password", text, html };
}

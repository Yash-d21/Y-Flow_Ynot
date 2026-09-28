import nodemailer from "nodemailer";

function getTransport() {
  const host = process.env.SMTP_HOST;
  const user = process.env.SMTP_USER;
  if (!host || !user) return null;

  // Gmail app passwords are often pasted with spaces — strip them
  const pass = (process.env.SMTP_PASS || "").replace(/\s+/g, "");

  return nodemailer.createTransport({
    host,
    port: Number(process.env.SMTP_PORT || 587),
    secure: process.env.SMTP_SECURE === "true",
    requireTLS: process.env.SMTP_SECURE !== "true",
    auth: {
      user,
      pass,
    },
  });
}

export async function sendMail(opts: {
  to: string | string[];
  subject: string;
  text: string;
  html?: string;
}) {
  const from =
    process.env.SMTP_FROM || "Y Not Manufacturing <tarsnetworks@gmail.com>";
  const transport = getTransport();

  if (!transport) {
    console.log("[mail:dry-run]", { from, ...opts });
    return { ok: true, dryRun: true as const };
  }

  try {
    const info = await transport.sendMail({
      from,
      to: opts.to,
      subject: opts.subject,
      text: opts.text,
      html:
        opts.html ||
        `<div style="font-family:system-ui,sans-serif;line-height:1.5;color:#0f172a">
          <p style="white-space:pre-wrap">${opts.text
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")}</p>
          <p style="margin-top:24px;font-size:12px;color:#64748b">Y Not Manufacturing · Y-Flow</p>
        </div>`,
    });
    console.log("[mail:sent]", info.messageId, "→", opts.to);
    return { ok: true, dryRun: false as const };
  } catch (err) {
    console.error("[mail:error]", err);
    return { ok: false, dryRun: false as const, error: String(err) };
  }
}

/** Quick SMTP check — call from a one-off script or API */
export async function verifySmtp() {
  const transport = getTransport();
  if (!transport) return { ok: false, error: "SMTP not configured" };
  try {
    await transport.verify();
    return { ok: true };
  } catch (err) {
    return { ok: false, error: String(err) };
  }
}

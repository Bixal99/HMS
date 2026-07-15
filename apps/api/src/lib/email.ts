import { Resend } from "resend";

export type SendEmailInput = {
  to: string;
  subject: string;
  text: string;
  html?: string;
};

export type SendEmailResult =
  | { delivered: true; mode: "resend" }
  | { delivered: false; mode: "logged" };

/**
 * Shared Resend sender. Falls back to console logging when RESEND_API_KEY is unset
 * so local/dev flows stay usable without a mail provider.
 */
export async function sendEmail(input: SendEmailInput): Promise<SendEmailResult> {
  const apiKey = process.env.RESEND_API_KEY;
  const from =
    process.env.RESEND_FROM_EMAIL || "MediCore <onboarding@resend.dev>";

  if (!apiKey) {
    console.info("[email] mail fallback (no Resend key)", {
      to: input.to,
      subject: input.subject,
      text: input.text,
    });
    return { delivered: false, mode: "logged" };
  }

  const resend = new Resend(apiKey);
  await resend.emails.send({
    from,
    to: input.to,
    subject: input.subject,
    text: input.text,
    ...(input.html ? { html: input.html } : {}),
  });
  return { delivered: true, mode: "resend" };
}

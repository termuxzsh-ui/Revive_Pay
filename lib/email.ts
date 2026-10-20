import { Resend } from "resend";

type DunningEmailInput = {
  to: string;
  customerName: string | null;
  amountDue: number;
  currency: string;
  invoiceUrl: string;
};

type RecoveryEmailInput = {
  to: string;
  customerName: string | null;
  amountRecovered: number;
  currency: string;
  invoiceId: string;
};

let resendClient: Resend | undefined;

function getResend() {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    throw new Error("Missing RESEND_API_KEY environment variable.");
  }

  resendClient ??= new Resend(apiKey);
  return resendClient;
}

function getFromAddress() {
  const from = process.env.RESEND_FROM_EMAIL;
  if (!from) {
    throw new Error("Missing RESEND_FROM_EMAIL environment variable.");
  }
  return from;
}

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (character) => {
    const entities: Record<string, string> = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;",
    };
    return entities[character];
  });
}

export function formatCurrency(amount: number, currency: string) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency.toUpperCase(),
  }).format(amount / 100);
}

export async function sendDunningEmail({
  to,
  customerName,
  amountDue,
  currency,
  invoiceUrl,
}: DunningEmailInput) {
  const name = customerName?.trim() || "there";
  const safeName = escapeHtml(name);
  const amount = formatCurrency(amountDue, currency);
  const { data, error } = await getResend().emails.send({
    from: getFromAddress(),
    to,
    subject: "A quick note about your recent payment",
    text: `Hi ${name},\n\nWe couldn't process your ${amount} payment. Please update your payment details or pay your invoice securely here: ${invoiceUrl}\n\nIf you've already taken care of this, thank you!`,
    html: `<!doctype html>
<html lang="en">
  <head><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="x-apple-disable-message-reformatting"><title>Payment update needed</title></head>
  <body style="margin:0;background:#f1f5f8;padding:32px 16px;font-family:Arial,Helvetica,sans-serif;color:#202832;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:560px;margin:0 auto;background:#fff;border:1px solid #dce5eb;border-radius:16px;overflow:hidden;">
      <tr><td style="padding:28px 32px 12px;font-size:14px;font-weight:700;letter-spacing:.04em;color:#087eae;">PAYMENT UPDATE</td></tr>
      <tr><td style="padding:4px 32px 0;"><h1 style="margin:0 0 14px;font-size:26px;line-height:1.25;color:#17212a;">Let's get your account back on track</h1><p style="margin:0;color:#5b6872;font-size:16px;line-height:1.65;">Hi ${safeName}, we couldn't process your recent payment of <strong style="color:#202832;">${escapeHtml(amount)}</strong>. This can happen when a card expires or a bank declines a charge.</p></td></tr>
      <tr><td style="padding:26px 32px 8px;"><a href="${escapeHtml(invoiceUrl)}" style="display:inline-block;padding:14px 22px;border-radius:9px;background:#13b9f3;color:#06131b;text-decoration:none;font-size:15px;font-weight:700;">Update payment details</a></td></tr>
      <tr><td style="padding:12px 32px 30px;color:#74818b;font-size:13px;line-height:1.6;">The secure link above will take you to your invoice. If you've already taken care of this, thank you — you can ignore this email.</td></tr>
    </table>
    <p style="max-width:560px;margin:16px auto 0;color:#89949c;text-align:center;font-size:12px;">This payment notice was sent by the service you subscribe to.</p>
  </body>
</html>`,
  });

  if (error) {
    throw new Error(`Resend could not send the dunning email: ${error.message}`);
  }
  return data;
}

export async function sendRecoveryEmail({
  to,
  customerName,
  amountRecovered,
  currency,
  invoiceId,
}: RecoveryEmailInput) {
  const amount = formatCurrency(amountRecovered, currency);
  const customer = customerName?.trim() || "A customer";
  const safeCustomer = escapeHtml(customer);
  const safeInvoiceId = escapeHtml(invoiceId);
  const { data, error } = await getResend().emails.send({
    from: getFromAddress(),
    to,
    subject: `Payment recovered — ${amount}`,
    text: `${customer} just paid ${amount}. Invoice ${invoiceId} is recovered.`,
    html: `<div style="margin:0 auto;max-width:560px;padding:32px;font-family:Arial,Helvetica,sans-serif;color:#202832;"><p style="color:#087eae;font-size:13px;font-weight:700;letter-spacing:.06em;">REVIVEPAY RECOVERY</p><h1 style="font-size:26px;">Payment recovered</h1><p style="font-size:16px;line-height:1.6;"><strong>${safeCustomer}</strong> just paid <strong>${escapeHtml(amount)}</strong>.</p><p style="color:#65727c;font-size:13px;">Invoice ${safeInvoiceId} has been marked as recovered.</p></div>`,
  });

  if (error) {
    throw new Error(`Resend could not send the recovery notification: ${error.message}`);
  }
  return data;
}

import type Stripe from "stripe";
import { NextResponse } from "next/server";
import {
  sendDunningEmail,
  sendRecoveryEmail,
} from "@/lib/email";
import { createAdminClient } from "@/lib/supabase/admin";
import { getStripeForConnectedAccount } from "@/lib/stripe-connect";
import { expectsLiveStripeEvents } from "@/lib/stripe-mode";
import { getStripe } from "@/lib/stripe";

type Owner = {
  id: string;
  email: string;
  notification_email: string | null;
  stripe_account_id: string | null;
};

async function findOwner(
  accountId: string | null,
  userId: string | null,
): Promise<Owner | null> {
  const supabase = createAdminClient();
  const query = supabase
    .from("users")
    .select("id, email, notification_email, stripe_account_id");

  const { data, error } = accountId
    ? await query.eq("stripe_account_id", accountId).maybeSingle()
    : userId
      ? await query.eq("id", userId).maybeSingle()
      : { data: null, error: null };

  if (error) {
    throw new Error(`Could not find Stripe account owner: ${error.message}`);
  }
  return data as Owner | null;
}

async function getCustomerDetails(
  invoice: Stripe.Invoice,
  accountId: string | null,
) {
  let email = invoice.customer_email ?? null;
  let name = invoice.customer_name ?? null;

  if ((!email || !name) && typeof invoice.customer === "string") {
    const connectedStripe = accountId
      ? await getStripeForConnectedAccount(accountId)
      : { stripe: getStripe(), options: undefined };
    const customer = await connectedStripe.stripe.customers.retrieve(
      invoice.customer,
      {},
      connectedStripe.options,
    );
    if (!customer.deleted) {
      email ??= customer.email ?? null;
      name ??= customer.name ?? null;
    }
  }

  return { email, name };
}

async function logEmail(
  failedInvoiceId: string,
  status:
    | "dunning_sent"
    | "dunning_failed"
    | "recovered"
    | "founder_notification_sent"
    | "founder_notification_failed",
  sent: boolean,
) {
  const { error } = await createAdminClient().from("recovery_logs").insert({
    failed_invoice_id: failedInvoiceId,
    email_sent_at: sent ? new Date().toISOString() : null,
    status,
  });
  if (error) {
    throw new Error(`Could not write recovery log: ${error.message}`);
  }
}

async function deliverDunningEmail(
  invoiceRecord: {
    id: string;
    customer_email: string | null;
    customer_name: string | null;
    amount_due: number;
    currency: string;
    hosted_invoice_url: string | null;
  },
) {
  if (!invoiceRecord.customer_email || !invoiceRecord.hosted_invoice_url) {
    await logEmail(invoiceRecord.id, "dunning_failed", false);
    return false;
  }

  try {
    await sendDunningEmail({
      to: invoiceRecord.customer_email,
      customerName: invoiceRecord.customer_name,
      amountDue: Number(invoiceRecord.amount_due),
      currency: invoiceRecord.currency,
      invoiceUrl: invoiceRecord.hosted_invoice_url,
    });
  } catch (error) {
    console.error("Dunning email delivery failed.", error);
    await logEmail(invoiceRecord.id, "dunning_failed", false);
    return false;
  }

  await logEmail(invoiceRecord.id, "dunning_sent", true);
  return true;
}

async function handlePaymentFailed(
  invoice: Stripe.Invoice,
  accountId: string | null,
  failedAt: number,
) {
  const owner = await findOwner(
    accountId,
    invoice.metadata?.revivepay_user_id ?? null,
  );
  if (!owner) {
    return NextResponse.json(
      { error: "No RevivePay user is linked to this Stripe account." },
      { status: 500 },
    );
  }

  const { email, name } = await getCustomerDetails(invoice, accountId);
  const supabase = createAdminClient();
  const { data: inserted, error: insertError } = await supabase
    .from("failed_invoices")
    .upsert(
      {
        user_id: owner.id,
        stripe_invoice_id: invoice.id,
        customer_email: email,
        customer_name: name,
        amount_due: invoice.amount_due,
        currency: invoice.currency,
        attempt_count: invoice.attempt_count ?? 1,
        hosted_invoice_url: invoice.hosted_invoice_url,
        status: "pending",
        created_at: new Date(failedAt * 1000).toISOString(),
      },
      {
        onConflict: "user_id,stripe_invoice_id",
        ignoreDuplicates: true,
      },
    )
    .select("id, customer_email, customer_name, amount_due, currency, hosted_invoice_url")
    .maybeSingle();

  if (insertError) {
    throw new Error(`Could not save failed invoice: ${insertError.message}`);
  }

  let invoiceRecord = inserted;
  if (!invoiceRecord) {
    const { data: existing, error: lookupError } = await supabase
      .from("failed_invoices")
      .select("id, customer_email, customer_name, amount_due, currency, hosted_invoice_url")
      .eq("user_id", owner.id)
      .eq("stripe_invoice_id", invoice.id)
      .maybeSingle();

    if (lookupError || !existing) {
      throw new Error(
        `Could not load failed invoice after duplicate delivery: ${lookupError?.message ?? "record not found"}`,
      );
    }

    const { data: priorFailure, error: logLookupError } = await supabase
      .from("recovery_logs")
      .select("id")
      .eq("failed_invoice_id", existing.id)
      .eq("status", "dunning_failed")
      .limit(1)
      .maybeSingle();

    if (logLookupError) {
      throw new Error(`Could not inspect prior email delivery: ${logLookupError.message}`);
    }
    if (!priorFailure) {
      return NextResponse.json({ received: true });
    }
    invoiceRecord = existing;
  }

  const delivered = await deliverDunningEmail(invoiceRecord);
  if (!delivered) {
    return NextResponse.json(
      { error: "Failed invoice was recorded, but its dunning email could not be delivered." },
      { status: 500 },
    );
  }

  return NextResponse.json({ received: true });
}

async function handlePaymentSucceeded(
  invoice: Stripe.Invoice,
  accountId: string | null,
) {
  const supabase = createAdminClient();
  const { data: invoiceRecord, error: lookupError } = await supabase
    .from("failed_invoices")
    .select("id, user_id, stripe_invoice_id, customer_name, amount_due, currency, status")
    .eq("stripe_invoice_id", invoice.id)
    .maybeSingle();

  if (lookupError) {
    throw new Error(`Could not look up recovered invoice: ${lookupError.message}`);
  }
  if (!invoiceRecord) {
    return NextResponse.json({ received: true });
  }

  if (accountId) {
    const owner = await findOwner(accountId, null);
    if (!owner || owner.id !== invoiceRecord.user_id) {
      return NextResponse.json(
        { error: "The invoice does not belong to the sending Stripe account." },
        { status: 403 },
      );
    }
  }

  if (invoiceRecord.status !== "recovered") {
    const { error: updateError } = await supabase
      .from("failed_invoices")
      .update({ status: "recovered" })
      .eq("id", invoiceRecord.id);

    if (updateError) {
      throw new Error(`Could not mark invoice as recovered: ${updateError.message}`);
    }

    await logEmail(invoiceRecord.id, "recovered", false);
  }

  const { data: sentLog, error: sentLogError } = await supabase
    .from("recovery_logs")
    .select("id")
    .eq("failed_invoice_id", invoiceRecord.id)
    .eq("status", "founder_notification_sent")
    .limit(1)
    .maybeSingle();

  if (sentLogError) {
    throw new Error(`Could not inspect recovery notification history: ${sentLogError.message}`);
  }
  if (sentLog) {
    return NextResponse.json({ received: true });
  }

  const owner = await findOwner(accountId, invoiceRecord.user_id);
  if (!owner) {
    throw new Error("No RevivePay user exists for the recovered invoice.");
  }
  const destination = owner.notification_email || owner.email;

  try {
    await sendRecoveryEmail({
      to: destination,
      customerName: invoiceRecord.customer_name,
      amountRecovered: Number(invoiceRecord.amount_due),
      currency: invoiceRecord.currency,
      invoiceId: invoiceRecord.stripe_invoice_id,
    });
  } catch (error) {
    console.error("Founder recovery notification failed.", error);
    await logEmail(invoiceRecord.id, "founder_notification_failed", false);
    return NextResponse.json(
      { error: "Payment was recovered, but the founder notification could not be delivered." },
      { status: 500 },
    );
  }

  await logEmail(invoiceRecord.id, "founder_notification_sent", true);
  return NextResponse.json({ received: true });
}

export async function POST(request: Request) {
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!webhookSecret) {
    console.error("Missing STRIPE_WEBHOOK_SECRET environment variable.");
    return NextResponse.json({ error: "Webhook is not configured." }, { status: 500 });
  }

  const signature = request.headers.get("stripe-signature");
  if (!signature) {
    return NextResponse.json({ error: "Missing Stripe signature." }, { status: 400 });
  }

  let event: Stripe.Event;
  try {
    event = getStripe().webhooks.constructEvent(
      await request.text(),
      signature,
      webhookSecret,
    );
  } catch (error) {
    console.error("Stripe webhook signature verification failed.", error);
    return NextResponse.json({ error: "Invalid Stripe webhook signature." }, { status: 400 });
  }

  if (event.livemode !== expectsLiveStripeEvents()) {
    console.warn("Ignoring connected-account Stripe event from the wrong mode.", {
      eventId: event.id,
      livemode: event.livemode,
    });
    return NextResponse.json({ received: true, ignored: "wrong_mode" });
  }

  if (event.type === "account.application.deauthorized" && event.account) {
    const admin = createAdminClient();
    const { error: profileError } = await admin
      .from("users")
      .update({ stripe_account_id: null })
      .eq("stripe_account_id", event.account);

    if (profileError) {
      console.error("Could not unlink a revoked Stripe account.", profileError);
      return NextResponse.json({ error: "Could not unlink Stripe account." }, { status: 500 });
    }

    const { error: connectionError } = await admin
      .from("stripe_connections")
      .delete()
      .eq("stripe_account_id", event.account);

    if (connectionError) {
      console.error("Could not remove revoked Stripe authorization.", connectionError);
      return NextResponse.json({ error: "Could not remove Stripe authorization." }, { status: 500 });
    }
    return NextResponse.json({ received: true });
  }

  const accountId = event.account ?? null;
  if (event.type === "invoice.payment_failed") {
    return handlePaymentFailed(
      event.data.object as Stripe.Invoice,
      accountId,
      event.created,
    );
  }

  if (event.type === "invoice.payment_succeeded") {
    return handlePaymentSucceeded(event.data.object as Stripe.Invoice, accountId);
  }

  return NextResponse.json({ received: true });
}

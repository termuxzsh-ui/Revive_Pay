import { NextResponse } from "next/server";
import { sendDunningEmail } from "@/lib/email";
import { createClient } from "@/lib/supabase/server";

export async function POST(
  _request: Request,
  { params }: RouteContext<"/api/invoices/[id]/retry">,
) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  }

  const { data: profile, error: profileError } = await supabase
    .from("users")
    .select("stripe_subscription_status")
    .eq("id", user.id)
    .maybeSingle();

  if (profileError) {
    console.error("Could not verify subscription before retrying email.", profileError);
    return NextResponse.json({ error: "Could not verify your subscription." }, { status: 500 });
  }
  if (!profile || !["active", "trialing"].includes(profile.stripe_subscription_status)) {
    return NextResponse.json(
      { error: "An active RevivePay subscription is required." },
      { status: 403 },
    );
  }

  const { data: invoice, error } = await supabase
    .from("failed_invoices")
    .select("id, customer_email, customer_name, amount_due, currency, hosted_invoice_url, status")
    .eq("id", id)
    .in("status", ["pending", "failed"])
    .maybeSingle();

  if (error) {
    console.error("Could not load invoice for retry.", error);
    return NextResponse.json({ error: "Could not load this invoice." }, { status: 500 });
  }
  if (!invoice) {
    return NextResponse.json({ error: "Active invoice not found." }, { status: 404 });
  }
  if (!invoice.customer_email || !invoice.hosted_invoice_url) {
    return NextResponse.json(
      { error: "This invoice is missing a customer email or hosted invoice link." },
      { status: 422 },
    );
  }

  try {
    await sendDunningEmail({
      to: invoice.customer_email,
      customerName: invoice.customer_name,
      amountDue: Number(invoice.amount_due),
      currency: invoice.currency,
      invoiceUrl: invoice.hosted_invoice_url,
    });
  } catch (sendError) {
    console.error("Manual dunning email delivery failed.", sendError);
    const { error: logError } = await supabase.from("recovery_logs").insert({
      failed_invoice_id: invoice.id,
      email_sent_at: null,
      status: "dunning_failed",
    });
    if (logError) {
      console.error("Could not log failed manual email attempt.", logError);
    }
    return NextResponse.json({ error: "The retry email could not be sent." }, { status: 502 });
  }

  const { error: logError } = await supabase.from("recovery_logs").insert({
    failed_invoice_id: invoice.id,
    email_sent_at: new Date().toISOString(),
    status: "dunning_sent",
  });
  if (logError) {
    console.error("Could not log manual email attempt.", logError);
    return NextResponse.json(
      { error: "Email was sent, but its delivery could not be recorded." },
      { status: 500 },
    );
  }

  return NextResponse.json({ sent: true });
}

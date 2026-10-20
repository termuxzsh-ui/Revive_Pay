import type Stripe from "stripe";
import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { expectsLiveStripeEvents } from "@/lib/stripe-mode";
import { getStripe } from "@/lib/stripe";

async function updateSubscription(
  userId: string,
  customerId: string,
  subscriptionId: string,
  status: Stripe.Subscription.Status,
) {
  const admin = createAdminClient();
  const { data: profile, error: lookupError } = await admin
    .from("users")
    .select("stripe_customer_id")
    .eq("id", userId)
    .maybeSingle();

  if (lookupError) {
    throw new Error(`Could not find billing profile: ${lookupError.message}`);
  }
  if (!profile) {
    throw new Error("Billing profile from Stripe event does not exist.");
  }
  if (profile.stripe_customer_id && profile.stripe_customer_id !== customerId) {
    throw new Error("Stripe subscription customer does not match the RevivePay profile.");
  }

  const { error: updateError } = await admin
    .from("users")
    .update({
      stripe_customer_id: customerId,
      stripe_subscription_id: subscriptionId,
      stripe_subscription_status: status,
    })
    .eq("id", userId);

  if (updateError) {
    throw new Error(`Could not update subscription status: ${updateError.message}`);
  }
}

function getUserId(metadata: Stripe.Metadata | null | undefined) {
  const userId = metadata?.supabase_user_id;
  return userId && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(userId)
    ? userId
    : null;
}

export async function POST(request: Request) {
  const webhookSecret = process.env.STRIPE_BILLING_WEBHOOK_SECRET;
  if (!webhookSecret) {
    console.error("Missing STRIPE_BILLING_WEBHOOK_SECRET environment variable.");
    return NextResponse.json({ error: "Billing webhook is not configured." }, { status: 500 });
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
    console.error("Stripe billing webhook signature verification failed.", error);
    return NextResponse.json({ error: "Invalid Stripe webhook signature." }, { status: 400 });
  }

  if (event.account) {
    return NextResponse.json(
      { error: "Connected-account events are not accepted by the billing endpoint." },
      { status: 400 },
    );
  }
  if (event.livemode !== expectsLiveStripeEvents()) {
    console.warn("Ignoring Stripe billing event from the wrong mode.", {
      eventId: event.id,
      livemode: event.livemode,
    });
    return NextResponse.json({ received: true, ignored: "wrong_mode" });
  }

  try {
    if (event.type === "checkout.session.completed") {
      const session = event.data.object as Stripe.Checkout.Session;
      if (session.mode !== "subscription" || !session.subscription || !session.customer) {
        return NextResponse.json({ received: true });
      }

      const userId = getUserId(session.metadata) ?? session.client_reference_id;
      if (!userId) {
        throw new Error("Checkout session is missing the RevivePay user reference.");
      }

      const subscription = await getStripe().subscriptions.retrieve(
        typeof session.subscription === "string"
          ? session.subscription
          : session.subscription.id,
      );
      await updateSubscription(
        userId,
        typeof session.customer === "string" ? session.customer : session.customer.id,
        subscription.id,
        subscription.status,
      );
    } else if (
      event.type === "customer.subscription.created" ||
      event.type === "customer.subscription.updated" ||
      event.type === "customer.subscription.deleted"
    ) {
      const subscription = event.data.object as Stripe.Subscription;
      const userId = getUserId(subscription.metadata);
      if (!userId) {
        throw new Error("Stripe subscription is missing the RevivePay user reference.");
      }
      const customerId =
        typeof subscription.customer === "string"
          ? subscription.customer
          : subscription.customer.id;
      await updateSubscription(
        userId,
        customerId,
        subscription.id,
        subscription.status,
      );
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("Could not process Stripe billing event.", error);
    return NextResponse.json({ error: "Could not process billing event." }, { status: 500 });
  }
}

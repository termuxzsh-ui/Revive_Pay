import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { getAppOrigin } from "@/lib/site-url";
import { getStripe } from "@/lib/stripe";

export async function POST() {
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  }

  const priceId = process.env.STRIPE_SUBSCRIPTION_PRICE_ID;
  if (!priceId) {
    return NextResponse.json(
      { error: "Subscription billing is not configured yet." },
      { status: 503 },
    );
  }

  const stripe = getStripe();
  const admin = createAdminClient();
  const { data: profile, error: profileError } = await admin
    .from("users")
    .select("id, email, stripe_customer_id, stripe_subscription_status")
    .eq("id", user.id)
    .maybeSingle();

  if (profileError) {
    console.error("Could not load user before starting subscription checkout.", profileError);
    return NextResponse.json({ error: "Could not start subscription checkout." }, { status: 500 });
  }
  if (!profile) {
    return NextResponse.json({ error: "RevivePay profile not found." }, { status: 404 });
  }
  if (["active", "trialing"].includes(profile.stripe_subscription_status)) {
    return NextResponse.json({ error: "Your subscription is already active." }, { status: 409 });
  }

  try {
    const price = await stripe.prices.retrieve(priceId);
    if (
      !price.active ||
      price.unit_amount === null ||
      price.unit_amount <= 0 ||
      price.recurring?.interval !== "month"
    ) {
      return NextResponse.json(
        { error: "The configured Stripe Price must be active and billed monthly." },
        { status: 503 },
      );
    }

    const customer = profile.stripe_customer_id
      ? profile.stripe_customer_id
      : (
          await stripe.customers.create(
            {
              email: profile.email,
              metadata: { supabase_user_id: user.id },
            },
            { idempotencyKey: `revivepay-customer-${user.id}` },
          )
        ).id;

    if (!profile.stripe_customer_id) {
      const { error: customerUpdateError } = await admin
        .from("users")
        .update({ stripe_customer_id: customer })
        .eq("id", user.id);
      if (customerUpdateError) {
        throw new Error(`Could not save Stripe customer ID: ${customerUpdateError.message}`);
      }
    }

    const origin = getAppOrigin();
    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      customer,
      client_reference_id: user.id,
      metadata: { supabase_user_id: user.id },
      subscription_data: {
        metadata: { supabase_user_id: user.id },
      },
      line_items: [{ price: price.id, quantity: 1 }],
      success_url: `${origin}/setup?billing=success`,
      cancel_url: `${origin}/setup?billing=cancelled`,
    });

    if (!session.url) {
      throw new Error("Stripe did not return a Checkout URL.");
    }
    return NextResponse.json({ url: session.url });
  } catch (error) {
    console.error("Could not create subscription checkout session.", error);
    return NextResponse.json(
      { error: "Could not start subscription checkout. Please try again later." },
      { status: 502 },
    );
  }
}

import type { Metadata } from "next";
import Image from "next/image";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import SetupActions from "./setup-actions";
import { createAdminClient } from "@/lib/supabase/admin";
import { getStripe } from "@/lib/stripe";

export const metadata: Metadata = {
  title: "Set up your account",
};

export const instant = false;

function formatPrice(amount: number, currency: string, intervalCount: number) {
  const fractionDigits =
    new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency.toUpperCase(),
    }).resolvedOptions().maximumFractionDigits ?? 2;
  const formatted = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency.toUpperCase(),
  }).format(amount / 10 ** fractionDigits);

  return intervalCount === 1
    ? `${formatted} per month`
    : `${formatted} every ${intervalCount} months`;
}

export default async function SetupPage({
  searchParams,
}: PageProps<"/setup">) {
  const params = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    redirect("/login");
  }

  const { data: profile, error: profileError } = await supabase
    .from("users")
    .select(
      "email, stripe_account_id, stripe_customer_id, stripe_subscription_status",
    )
    .eq("id", user.id)
    .maybeSingle();

  if (profileError) {
    throw new Error(`Could not load your RevivePay setup: ${profileError.message}`);
  }
  if (!profile) {
    throw new Error("Your RevivePay profile was not found. Contact support.");
  }

  let connectedAccountReady = false;
  if (profile.stripe_account_id) {
    const { data: connection, error: connectionError } = await createAdminClient()
      .from("stripe_connections")
      .select("scope")
      .eq("user_id", user.id)
      .maybeSingle();

    if (connectionError) {
      throw new Error(`Could not load your Stripe connection: ${connectionError.message}`);
    }
    connectedAccountReady = Boolean(connection);
  }

  let priceLabel: string | null = null;
  const priceId = process.env.STRIPE_SUBSCRIPTION_PRICE_ID;
  if (priceId && process.env.STRIPE_SECRET_KEY) {
    const price = await getStripe().prices.retrieve(priceId);
    if (
      price.active &&
      price.unit_amount !== null &&
      price.unit_amount > 0 &&
      price.recurring?.interval === "month"
    ) {
      priceLabel = formatPrice(
        price.unit_amount ?? 0,
        price.currency,
        price.recurring.interval_count ?? 1,
      );
    }
  }

  const subscriptionActive = ["active", "trialing"].includes(
    profile.stripe_subscription_status,
  );
  if (subscriptionActive && connectedAccountReady) {
    redirect("/dashboard");
  }

  return (
    <main className="min-h-screen bg-[#080f16] px-5 py-12 text-[#eef4f7]">
      <div className="mx-auto w-full max-w-3xl">
        <a href="/setup" className="mb-9 flex items-center gap-3">
          <Image
            alt="RevivePay shield logo"
            className="size-11 rounded-xl border border-white/10 object-cover"
            height={44}
            priority
            src="/revivepay-logo.jpg"
            width={44}
          />
          <span className="text-lg font-semibold tracking-tight">RevivePay</span>
        </a>

        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#55cafa]">
          Account setup
        </p>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight">
          Get your recovery workspace ready
        </h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-[#969d95]">
          Subscribe to RevivePay, then securely connect the Stripe account where
          your customer subscriptions and invoices live.
        </p>

        <SetupActions
          connectedAccount={connectedAccountReady ? profile.stripe_account_id : null}
          connectStatus={typeof params.connect === "string" ? params.connect : ""}
          hasBillingCustomer={Boolean(profile.stripe_customer_id)}
          priceLabel={priceLabel}
          subscriptionActive={subscriptionActive}
          subscriptionStatus={profile.stripe_subscription_status}
          billingStatus={typeof params.billing === "string" ? params.billing : ""}
        />

        <p className="mt-7 text-center text-xs leading-5 text-[#737a73]">
          Stripe handles subscription checkout and account authorization. RevivePay
          does not see or store your Stripe password or card details.
        </p>
      </div>
    </main>
  );
}

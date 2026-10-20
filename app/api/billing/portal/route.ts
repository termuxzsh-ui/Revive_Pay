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

  const { data: profile, error } = await createAdminClient()
    .from("users")
    .select("stripe_customer_id")
    .eq("id", user.id)
    .maybeSingle();

  if (error) {
    console.error("Could not load billing customer.", error);
    return NextResponse.json({ error: "Could not open billing settings." }, { status: 500 });
  }
  if (!profile?.stripe_customer_id) {
    return NextResponse.json({ error: "No billing customer exists yet." }, { status: 404 });
  }

  try {
    const session = await getStripe().billingPortal.sessions.create({
      customer: profile.stripe_customer_id,
      return_url: `${getAppOrigin()}/setup`,
    });
    return NextResponse.json({ url: session.url });
  } catch (portalError) {
    console.error("Could not create Stripe billing portal session.", portalError);
    return NextResponse.json(
      { error: "Could not open billing settings. Please try again later." },
      { status: 502 },
    );
  }
}

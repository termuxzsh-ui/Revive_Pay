import { randomBytes } from "node:crypto";
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getAppOrigin } from "@/lib/site-url";

const STATE_COOKIE = "stripe_connect_oauth_state";
const USER_COOKIE = "stripe_connect_oauth_user";

export async function POST() {
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  }

  const clientId = process.env.STRIPE_CONNECT_CLIENT_ID;
  if (!clientId) {
    return NextResponse.json(
      { error: "Stripe Connect is not configured yet." },
      { status: 503 },
    );
  }

  const { data: profile, error: profileError } = await supabase
    .from("users")
    .select("stripe_account_id, stripe_subscription_status")
    .eq("id", user.id)
    .maybeSingle();

  if (profileError) {
    console.error("Could not load profile before starting Stripe Connect.", profileError);
    return NextResponse.json({ error: "Could not connect Stripe right now." }, { status: 500 });
  }
  if (!profile || !["active", "trialing"].includes(profile.stripe_subscription_status)) {
    return NextResponse.json(
      { error: "An active RevivePay subscription is required before connecting Stripe." },
      { status: 403 },
    );
  }
  const origin = getAppOrigin();
  const state = randomBytes(32).toString("hex");
  const authorizeUrl = new URL("https://connect.stripe.com/oauth/authorize");
  authorizeUrl.searchParams.set("response_type", "code");
  authorizeUrl.searchParams.set("client_id", clientId);
  authorizeUrl.searchParams.set("scope", "read_only");
  authorizeUrl.searchParams.set("redirect_uri", `${origin}/api/connect/callback`);
  authorizeUrl.searchParams.set("state", state);

  const response = NextResponse.json({ url: authorizeUrl.toString() });
  response.cookies.set(STATE_COOKIE, state, {
    httpOnly: true,
    maxAge: 600,
    path: "/api/connect/callback",
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
  });
  response.cookies.set(USER_COOKIE, user.id, {
    httpOnly: true,
    maxAge: 600,
    path: "/api/connect/callback",
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
  });
  return response;
}

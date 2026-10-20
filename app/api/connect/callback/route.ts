import { cookies } from "next/headers";
import { NextResponse, type NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { encryptStripeToken } from "@/lib/stripe-connect-token";
import { getAppOrigin } from "@/lib/site-url";
import { expectsLiveStripeEvents } from "@/lib/stripe-mode";
import { getStripe } from "@/lib/stripe";

const STATE_COOKIE = "stripe_connect_oauth_state";
const USER_COOKIE = "stripe_connect_oauth_user";

function clearOAuthCookies(response: NextResponse) {
  response.cookies.delete(STATE_COOKIE);
  response.cookies.delete(USER_COOKIE);
  return response;
}

function setupRedirect(code: string) {
  return NextResponse.redirect(new URL(`/setup?connect=${code}`, getAppOrigin()));
}

export async function GET(request: NextRequest) {
  const cookieStore = await cookies();
  const savedState = cookieStore.get(STATE_COOKIE)?.value;
  const returnedState = request.nextUrl.searchParams.get("state");
  const oauthError = request.nextUrl.searchParams.get("error");
  const code = request.nextUrl.searchParams.get("code");

  if (oauthError) {
    return clearOAuthCookies(setupRedirect("cancelled"));
  }
  const savedUserId = cookieStore.get(USER_COOKIE)?.value;
  if (!savedState || !returnedState || savedState !== returnedState || !code) {
    return clearOAuthCookies(setupRedirect("invalid_state"));
  }

  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();
  if (authError || !user) {
    return clearOAuthCookies(
      NextResponse.redirect(new URL("/login", getAppOrigin())),
    );
  }
  if (!savedUserId || savedUserId !== user.id) {
    return clearOAuthCookies(setupRedirect("invalid_state"));
  }

  try {
    const stripe = getStripe();
    const token = await stripe.oauth.token({
      grant_type: "authorization_code",
      code,
    });
    const accountId = token.stripe_user_id;

    if (!accountId || !token.access_token || !token.scope) {
      throw new Error("Stripe OAuth response was missing required connection details.");
    }
    if (token.livemode !== expectsLiveStripeEvents()) {
      throw new Error("The connected Stripe account does not match this deployment's configured mode.");
    }

    const admin = createAdminClient();
    const { data: profile, error: profileError } = await admin
      .from("users")
      .select("stripe_account_id, stripe_subscription_status")
      .eq("id", user.id)
      .maybeSingle();

    if (profileError) {
      throw new Error(`Could not load RevivePay profile: ${profileError.message}`);
    }
    if (!profile || !["active", "trialing"].includes(profile.stripe_subscription_status)) {
      throw new Error("An active RevivePay subscription is required to connect Stripe.");
    }
    if (profile.stripe_account_id && profile.stripe_account_id !== accountId) {
      throw new Error("A different Stripe account is already linked. Contact support to change it.");
    }

    const accessToken = encryptStripeToken(token.access_token);
    const refreshToken = token.refresh_token
      ? encryptStripeToken(token.refresh_token)
      : null;
    const { error: connectionError } = await admin
      .from("stripe_connections")
      .upsert(
        {
          user_id: user.id,
          stripe_account_id: accountId,
          access_token_ciphertext: accessToken.ciphertext,
          access_token_iv: accessToken.iv,
          access_token_tag: accessToken.tag,
          refresh_token_ciphertext: refreshToken?.ciphertext ?? null,
          refresh_token_iv: refreshToken?.iv ?? null,
          refresh_token_tag: refreshToken?.tag ?? null,
          scope: token.scope,
          livemode: token.livemode,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "user_id" },
      );

    if (connectionError) {
      throw new Error(`Could not save the Stripe connection: ${connectionError.message}`);
    }

    const { error: profileUpdateError } = await admin
      .from("users")
      .update({ stripe_account_id: accountId })
      .eq("id", user.id);

    if (profileUpdateError) {
      throw new Error(`Could not link Stripe account to profile: ${profileUpdateError.message}`);
    }

    return clearOAuthCookies(setupRedirect("connected"));
  } catch (error) {
    console.error("Stripe Connect authorization failed.", error);
    return clearOAuthCookies(setupRedirect("error"));
  }
}

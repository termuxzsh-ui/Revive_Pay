import "server-only";

import Stripe from "stripe";
import { createAdminClient } from "@/lib/supabase/admin";
import { decryptStripeToken } from "@/lib/stripe-connect-token";
import { getStripe } from "@/lib/stripe";

export async function getStripeForConnectedAccount(accountId: string) {
  const { data: connection, error } = await createAdminClient()
    .from("stripe_connections")
    .select(
      "access_token_ciphertext, access_token_iv, access_token_tag",
    )
    .eq("stripe_account_id", accountId)
    .maybeSingle();

  if (error) {
    throw new Error(`Could not load connected Stripe authorization: ${error.message}`);
  }

  if (!connection) {
    return {
      stripe: getStripe(),
      options: { stripeAccount: accountId },
    };
  }

  const accessToken = decryptStripeToken({
    ciphertext: connection.access_token_ciphertext,
    iv: connection.access_token_iv,
    tag: connection.access_token_tag,
  });

  return {
    stripe: new Stripe(accessToken),
    options: undefined,
  };
}

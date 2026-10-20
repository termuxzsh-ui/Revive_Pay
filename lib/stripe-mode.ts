export function expectsLiveStripeEvents() {
  const configuredMode = process.env.STRIPE_EXPECT_LIVEMODE;

  if (configuredMode === "true") {
    return true;
  }
  if (configuredMode === "false") {
    return false;
  }
  if (process.env.NODE_ENV === "production") {
    throw new Error("Set STRIPE_EXPECT_LIVEMODE to true or false for this deployment.");
  }
  return false;
}

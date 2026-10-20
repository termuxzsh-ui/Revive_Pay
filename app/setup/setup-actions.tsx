"use client";

import { useState } from "react";
import { CheckCircle2, CreditCard, ExternalLink, LoaderCircle, ShieldCheck } from "lucide-react";

type SetupActionsProps = {
  connectedAccount: string | null;
  connectStatus: string;
  hasBillingCustomer: boolean;
  priceLabel: string | null;
  subscriptionActive: boolean;
  subscriptionStatus: string;
  billingStatus: string;
};

const buttonClass =
  "inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-[#13b9f3] px-4 text-sm font-semibold text-[#06131b] transition hover:bg-[#38c8fa] disabled:cursor-wait disabled:opacity-60";

export default function SetupActions({
  connectedAccount,
  connectStatus,
  hasBillingCustomer,
  priceLabel,
  subscriptionActive,
  subscriptionStatus,
  billingStatus,
}: SetupActionsProps) {
  const [loading, setLoading] = useState<"checkout" | "portal" | "connect" | null>(null);
  const [error, setError] = useState("");

  async function openStripe(
    action: "checkout" | "portal" | "connect",
    path: string,
    body?: Record<string, string>,
  ) {
    setLoading(action);
    setError("");
    try {
      const response = await fetch(path, {
        method: "POST",
        headers: body ? { "content-type": "application/json" } : undefined,
        body: body ? JSON.stringify(body) : undefined,
      });
      const result = (await response.json()) as { error?: string; url?: string };
      if (!response.ok || !result.url) {
        throw new Error(result.error || "Stripe could not start this step.");
      }
      window.location.assign(result.url);
    } catch (actionError) {
      setError(
        actionError instanceof Error
          ? actionError.message
          : "Something went wrong. Please try again.",
      );
      setLoading(null);
    }
  }

  const connectMessage: Record<string, string> = {
    connected: "Your Stripe account is connected.",
    cancelled: "Stripe connection was cancelled. You can try again when ready.",
    invalid_state: "The connection request expired or could not be verified. Start again.",
    error: "Stripe could not finish connecting. Check your setup or contact support.",
  };

  return (
    <div className="mt-8 space-y-5">
      {billingStatus === "success" && !subscriptionActive ? (
        <p className="rounded-lg border border-[#17415a] bg-[#102534] px-4 py-3 text-sm leading-6 text-[#9cdefa]">
          Checkout completed. Stripe is confirming your subscription; refresh this page
          in a moment if the status has not updated.
        </p>
      ) : null}
      {billingStatus === "cancelled" ? (
        <p className="rounded-lg border border-white/[0.08] bg-white/[0.03] px-4 py-3 text-sm text-[#b9c2c8]">
          Checkout was cancelled; you have not been subscribed.
        </p>
      ) : null}
      {connectStatus && connectMessage[connectStatus] ? (
        <p
          className="rounded-lg border border-[#17415a] bg-[#102534] px-4 py-3 text-sm text-[#9cdefa]"
          role="status"
        >
          {connectMessage[connectStatus]}
        </p>
      ) : null}
      {error ? (
        <p
          className="rounded-lg border border-[#6b302b] bg-[#2c1717] px-4 py-3 text-sm text-[#ffb2a9]"
          role="alert"
        >
          {error}
        </p>
      ) : null}

      <section className="rounded-2xl border border-white/[0.08] bg-[#101b25] p-6 sm:p-7">
        <div className="flex items-start gap-4">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-[#123044] text-[#64cafa]">
            <CreditCard aria-hidden="true" size={19} />
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-base font-semibold">1. RevivePay subscription</h2>
              {subscriptionActive ? (
                <span className="rounded-full border border-[#174b64] bg-[#102431] px-2.5 py-1 text-[11px] font-medium capitalize text-[#8bdcff]">
                  {subscriptionStatus}
                </span>
              ) : null}
            </div>
            {subscriptionActive ? (
              <>
                <p className="mt-2 text-sm leading-6 text-[#969d95]">
                  Your RevivePay subscription is active. Manage billing securely through
                  Stripe whenever you need to update your payment method or cancel.
                </p>
                <button
                  className={`${buttonClass} mt-4`}
                  disabled={loading !== null}
                  onClick={() => openStripe("portal", "/api/billing/portal")}
                  type="button"
                >
                  {loading === "portal" ? <LoaderCircle className="animate-spin" size={16} /> : null}
                  Manage subscription
                  <ExternalLink aria-hidden="true" size={15} />
                </button>
              </>
            ) : (
              <>
                <p className="mt-2 text-sm leading-6 text-[#969d95]">
                  Choose the configured monthly plan and pay through Stripe Checkout.
                  RevivePay does not receive or store your card number.
                </p>
                {priceLabel ? (
                  <p className="mt-3 text-sm font-semibold text-[#dce7ed]">{priceLabel}</p>
                ) : (
                  <p className="mt-3 text-xs text-[#e8c576]">
                    Billing is not fully configured. Contact the RevivePay administrator.
                  </p>
                )}
                <button
                  className={`${buttonClass} mt-4`}
                  disabled={loading !== null || !priceLabel}
                  onClick={() => openStripe("checkout", "/api/billing/checkout")}
                  type="button"
                >
                  {loading === "checkout" ? <LoaderCircle className="animate-spin" size={16} /> : null}
                  Start monthly subscription
                  <ExternalLink aria-hidden="true" size={15} />
                </button>
              </>
            )}
          </div>
        </div>
      </section>

      <section
        className={`rounded-2xl border p-6 sm:p-7 ${subscriptionActive ? "border-white/[0.08] bg-[#101b25]" : "border-white/[0.05] bg-[#0c151d] opacity-65"}`}
      >
        <div className="flex items-start gap-4">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-[#123044] text-[#64cafa]">
            <ShieldCheck aria-hidden="true" size={19} />
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-base font-semibold">2. Connect your Stripe account</h2>
              {connectedAccount ? (
                <span className="inline-flex items-center gap-1 rounded-full border border-[#174b64] bg-[#102431] px-2.5 py-1 text-[11px] font-medium text-[#8bdcff]">
                  <CheckCircle2 aria-hidden="true" size={12} />
                  Connected
                </span>
              ) : null}
            </div>
            {connectedAccount ? (
              <p className="mt-2 text-sm leading-6 text-[#969d95]">
                Connected account <span className="font-mono text-[#dce7ed]">{connectedAccount}</span>.
                RevivePay has read-only access to the Stripe data it needs to monitor invoices.
              </p>
            ) : (
              <p className="mt-2 text-sm leading-6 text-[#969d95]">
                Authorize the Stripe account where your customer subscriptions and invoices
                already exist. Stripe will handle sign-in and consent; RevivePay never asks
                for your Stripe password.
              </p>
            )}
            {!connectedAccount ? (
              <button
                className={`${buttonClass} mt-4`}
                disabled={!subscriptionActive || loading !== null}
                onClick={() => openStripe("connect", "/api/connect/start")}
                type="button"
              >
                {loading === "connect" ? <LoaderCircle className="animate-spin" size={16} /> : null}
                {subscriptionActive ? "Connect with Stripe" : "Subscribe first to continue"}
                {subscriptionActive ? <ExternalLink aria-hidden="true" size={15} /> : null}
              </button>
            ) : null}
          </div>
        </div>
      </section>

      {hasBillingCustomer && !subscriptionActive ? (
        <button
          className="text-xs font-medium text-[#8bdcff] underline underline-offset-4 disabled:opacity-60"
          disabled={loading !== null}
          onClick={() => openStripe("portal", "/api/billing/portal")}
          type="button"
        >
          {loading === "portal" ? "Opening billing settings..." : "Open existing billing settings"}
        </button>
      ) : null}
    </div>
  );
}

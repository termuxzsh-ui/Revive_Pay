import type { Metadata } from "next";
import Image from "next/image";
import { redirect } from "next/navigation";
import {
  ArrowDownRight,
  ArrowUpRight,
  Bell,
  CircleHelp,
  CreditCard,
  LayoutDashboard,
  LifeBuoy,
  LogOut,
  MoreHorizontal,
  ShieldCheck,
  Sparkles,
  Wallet,
} from "lucide-react";
import { signOut } from "@/app/actions/auth";
import RetryEmailButton from "./retry-email-button";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "Dashboard",
};

export const instant = false;

type Invoice = {
  id: string;
  customer_email: string | null;
  customer_name: string | null;
  amount_due: number;
  currency: string;
  attempt_count: number;
  status: "pending" | "recovered" | "failed";
  created_at: string;
};

function currency(amount: number, code: string) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: code.toUpperCase(),
  }).format(amount / 100);
}

function dateLabel(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(value));
}

function statusLabel(status: Invoice["status"]) {
  if (status === "recovered") return "Recovered";
  if (status === "failed") return "Past due";
  return "Action needed";
}

export default async function DashboardPage() {
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
      "email, notification_email, stripe_account_id, stripe_subscription_status",
    )
    .eq("id", user.id)
    .maybeSingle();

  if (profileError) {
    throw new Error(`Could not load your RevivePay profile: ${profileError.message}`);
  }
  if (!profile) {
    throw new Error("Your RevivePay profile was not found. Contact support.");
  }
  if (!["active", "trialing"].includes(profile.stripe_subscription_status)) {
    redirect("/setup");
  }

  const { data: invoices, error: invoicesError } = await supabase
    .from("failed_invoices")
    .select(
      "id, customer_email, customer_name, amount_due, currency, attempt_count, status, created_at",
    )
    .order("created_at", { ascending: false });

  if (invoicesError) {
    throw new Error(`Could not load failed invoices: ${invoicesError.message}`);
  }

  const rows = (invoices ?? []) as Invoice[];
  const recovered = rows.filter((invoice) => invoice.status === "recovered");
  const active = rows.filter(
    (invoice) => invoice.status === "pending" || invoice.status === "failed",
  );
  const recoveryRate =
    rows.length === 0 ? 0 : Math.round((recovered.length / rows.length) * 100);
  const recoveredUsd = recovered
    .filter((invoice) => invoice.currency.toLowerCase() === "usd")
    .reduce((sum, invoice) => sum + Number(invoice.amount_due), 0);
  const accountEmail = profile?.notification_email || profile?.email || user.email;
  const initials = (accountEmail || "R").slice(0, 1).toUpperCase();

  return (
    <div className="min-h-screen bg-[#080f16] text-[#eef4f7]">
      <aside className="fixed inset-y-0 left-0 z-20 hidden w-[236px] flex-col border-r border-white/[0.07] bg-[#0b141d] px-4 py-6 lg:flex">
        <a href="/dashboard" className="flex items-center gap-3 px-2">
          <Image
            alt="RevivePay shield logo"
            className="size-10 rounded-lg border border-white/10 object-cover"
            height={40}
            src="/revivepay-logo.jpg"
            width={40}
          />
          <span className="text-[17px] font-semibold tracking-tight">RevivePay</span>
        </a>

        <div className="mt-10 px-3 text-[10px] font-semibold uppercase tracking-[0.18em] text-[#6d746c]">
          Workspace
        </div>
        <nav aria-label="Main navigation" className="mt-3 space-y-1">
          <a
            className="flex h-10 items-center gap-3 rounded-lg bg-[#102938] px-3 text-sm font-medium text-[#8bdcff]"
            href="/dashboard"
          >
            <LayoutDashboard aria-hidden="true" size={17} />
            Overview
          </a>
          <a
            className="flex h-10 items-center gap-3 rounded-lg px-3 text-sm text-[#969d95] transition hover:bg-white/[0.04] hover:text-white"
            href="#invoices"
          >
            <CreditCard aria-hidden="true" size={17} />
            Failed invoices
            {active.length > 0 ? (
              <span className="ml-auto rounded-md bg-white/[0.08] px-1.5 py-0.5 text-[10px] text-[#c2c8c0]">
                {active.length}
              </span>
            ) : null}
          </a>
        </nav>

        <div className="mt-auto">
          <div className="rounded-xl border border-white/[0.08] bg-[#101b25] p-4">
            <div className="flex size-8 items-center justify-center rounded-lg bg-[#123044] text-[#64cafa]">
              <ShieldCheck aria-hidden="true" size={16} />
            </div>
            <p className="mt-3 text-sm font-medium">Your recovery engine</p>
            <p className="mt-1 text-xs leading-5 text-[#858d83]">
              Failed payments are monitored around the clock.
            </p>
          </div>
          <div className="mt-5 flex items-center gap-3 border-t border-white/[0.07] pt-5">
            <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-[#173448] text-xs font-semibold text-[#a9e4fb]">
              {initials}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-xs font-medium text-[#d8ddd6]">
                {accountEmail || "Your account"}
              </span>
              <span className="mt-0.5 block text-[11px] text-[#737a72]">
                Founder account
              </span>
            </span>
            <form action={signOut}>
              <button
                aria-label="Sign out"
                className="rounded-md p-1.5 text-[#777f76] transition hover:bg-white/[0.06] hover:text-white"
                title="Sign out"
                type="submit"
              >
                <LogOut aria-hidden="true" size={15} />
              </button>
            </form>
          </div>
        </div>
      </aside>

      <main className="min-h-screen lg:pl-[236px]">
        <header className="sticky top-0 z-10 flex h-[66px] items-center justify-between border-b border-white/[0.07] bg-[#080f16]/90 px-5 backdrop-blur-xl sm:px-8">
          <div className="flex items-center gap-3">
            <Image
              alt="RevivePay shield logo"
              className="size-8 rounded-lg border border-white/10 object-cover lg:hidden"
              height={32}
              src="/revivepay-logo.jpg"
              width={32}
            />
            <span className="text-sm font-medium text-[#d6dbd4]">Overview</span>
            <span className="hidden text-[#51584f] sm:inline">/</span>
            <span className="hidden text-sm text-[#7b8279] sm:inline">Dashboard</span>
          </div>
          <div className="flex items-center gap-3">
            <span
              className={`hidden items-center gap-2 rounded-full border px-3 py-1.5 text-[11px] font-medium sm:flex $              {profile.stripe_account_id ? "border-[#174b64] bg-[#102431] text-[#8bdcff]" : "border-[#514327] bg-[#211e16] text-[#e8c576]"}`}
            >
              <span
                className={`size-1.5 rounded-full ${profile.stripe_account_id ? "bg-[#13b9f3]" : "bg-[#e5b84f]"}`}
              />
              {profile.stripe_account_id ? "Stripe connected" : "Stripe setup needed"}
            </span>
            <button
              aria-label="Notifications"
              className="flex size-9 items-center justify-center rounded-lg border border-white/[0.08] text-[#929990] transition hover:bg-white/[0.05] hover:text-white"
              type="button"
            >
              <Bell aria-hidden="true" size={16} />
            </button>
            <span className="flex size-8 items-center justify-center rounded-full bg-[#173448] text-xs font-semibold text-[#a9e4fb] lg:hidden">
              {initials}
            </span>
          </div>
        </header>

        <div className="mx-auto max-w-[1440px] px-5 pb-12 pt-8 sm:px-8 sm:pt-10">
          <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
            <div>
              <p className="flex items-center gap-2 text-xs text-[#8d958b]">
                <span>Workspace</span>
                <span className="text-[#535a52]">/</span>
                <span className="text-[#c0c7bd]">Overview</span>
              </p>
              <h1 className="mt-3 text-[27px] font-semibold tracking-[-0.04em] sm:text-[32px]">
                Good to see you again.
              </h1>
              <p className="mt-1.5 text-sm text-[#8c948a]">
                Here&apos;s what&apos;s happening with your payment recovery.
              </p>
            </div>
            <a
              className="inline-flex h-10 items-center justify-center gap-2 self-start rounded-lg bg-[#13b9f3] px-4 text-xs font-semibold text-[#06131b] transition hover:bg-[#38c8fa] sm:self-auto"
              href="#invoices"
            >
              <Sparkles aria-hidden="true" size={15} />
              Review failed payments
            </a>
          </div>

          {!profile.stripe_account_id ? (
            <section className="mt-7 flex flex-col gap-4 rounded-xl border border-[#514327] bg-[#1a1914] p-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
              <div className="flex gap-3">
                <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-[#292619] text-[#e8c576]">
                  <CreditCard aria-hidden="true" size={17} />
                </span>
                <div>
                  <h2 className="text-sm font-medium text-[#eee4c9]">
                    Connect your Stripe account to start recovering payments
                  </h2>
                  <p className="mt-1 text-xs leading-5 text-[#a49a7b]">
                    Finish connecting the Stripe account where your customer invoices are managed.
                  </p>
                </div>
              </div>
              <a
                className="shrink-0 text-xs font-semibold text-[#d9b95f] underline decoration-[#6c5a30] underline-offset-4 hover:text-[#f4d782]"
                href="/setup"
              >
                Finish setup
              </a>
            </section>
          ) : null}

          <section aria-label="Payment recovery metrics" className="mt-7 grid gap-4 md:grid-cols-3">
            <MetricCard
              description="USD invoices · all time"
              icon={<Wallet aria-hidden="true" size={17} />}
              label="Recovered revenue"
              value={currency(recoveredUsd, "usd")}
              trendIcon={<ArrowUpRight aria-hidden="true" size={15} />}
              trendLabel={`${recovered.length} recovered`}
              tone="blue"
            />
            <MetricCard
              description="Invoices needing attention"
              icon={<CreditCard aria-hidden="true" size={17} />}
              label="Active failed invoices"
              value={String(active.length)}
              trendIcon={<ArrowDownRight aria-hidden="true" size={15} />}
              trendLabel={active.length ? "Needs follow-up" : "All clear"}
              tone={active.length ? "amber" : "blue"}
            />
            <MetricCard
              description="Recovered from all failed invoices"
              icon={<Sparkles aria-hidden="true" size={17} />}
              label="Recovery rate"
              value={`${recoveryRate}%`}
              trendIcon={<ArrowUpRight aria-hidden="true" size={15} />}
              trendLabel={`${recovered.length} of ${rows.length} invoices`}
              tone="blue"
            />
          </section>

          <section
            className="mt-8 overflow-hidden rounded-xl border border-white/[0.08] bg-[#0e1821]"
            id="invoices"
          >
            <div className="flex flex-col gap-3 border-b border-white/[0.07] px-5 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-6">
              <div>
                <div className="flex items-center gap-2.5">
                  <h2 className="text-[15px] font-semibold">Failed invoices</h2>
                  <span className="rounded-md border border-white/[0.08] bg-white/[0.04] px-2 py-0.5 text-[10px] font-medium text-[#a7aea4]">
                    {rows.length} total
                  </span>
                </div>
                <p className="mt-1 text-xs text-[#7d857b]">
                  Keep an eye on payments that need a little extra attention.
                </p>
              </div>
              <div className="flex items-center gap-2 self-start rounded-lg border border-white/[0.08] bg-[#121e28] px-3 py-2 text-xs text-[#afb6ac] sm:self-auto">
                <span className="size-1.5 rounded-full bg-[#13b9f3]" />
                Live data
                <MoreHorizontal aria-hidden="true" className="ml-2 text-[#788075]" size={15} />
              </div>
            </div>

            {rows.length === 0 ? (
              <div className="flex flex-col items-center px-5 py-16 text-center">
                <span className="flex size-12 items-center justify-center rounded-2xl border border-white/[0.08] bg-[#14212c] text-[#97a8b4]">
                  <CreditCard aria-hidden="true" size={20} />
                </span>
                <h3 className="mt-4 text-sm font-medium">No failed payments yet</h3>
                <p className="mt-1.5 max-w-sm text-xs leading-5 text-[#7d857b]">
                  Once your Stripe webhook is connected, failed invoices will appear here automatically.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[850px] border-collapse text-left">
                  <thead>
                    <tr className="border-b border-white/[0.06] text-[10px] font-semibold uppercase tracking-[0.1em] text-[#6f776d]">
                      <th className="px-6 py-3.5">Customer</th>
                      <th className="px-5 py-3.5">Amount due</th>
                      <th className="px-5 py-3.5">Status</th>
                      <th className="px-5 py-3.5">Date failed</th>
                      <th className="px-5 py-3.5">Attempt</th>
                      <th className="px-6 py-3.5 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/[0.05]">
                    {rows.map((invoice) => (
                      <tr
                        className="transition hover:bg-white/[0.018]"
                        key={invoice.id}
                      >
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-[#173448] text-xs font-semibold text-[#a9e4fb]">
                              {(invoice.customer_name || invoice.customer_email || "?")
                                .slice(0, 1)
                                .toUpperCase()}
                            </span>
                            <div className="min-w-0">
                              <p className="truncate text-xs font-medium text-[#e0e5dd]">
                                {invoice.customer_name || "Customer"}
                              </p>
                              <p className="mt-1 truncate text-[11px] text-[#7f877d]">
                                {invoice.customer_email || "Email unavailable"}
                              </p>
                            </div>
                          </div>
                        </td>
                        <td className="px-5 py-4 text-xs font-medium text-[#e1e6df]">
                          {currency(Number(invoice.amount_due), invoice.currency)}
                        </td>
                        <td className="px-5 py-4">
                          <StatusBadge status={invoice.status} />
                        </td>
                        <td className="px-5 py-4 text-xs text-[#9ba298]">
                          {dateLabel(invoice.created_at)}
                        </td>
                        <td className="px-5 py-4 text-xs text-[#9ba298]">
                          {invoice.attempt_count}
                          {invoice.attempt_count === 1 ? "st" : invoice.attempt_count === 2 ? "nd" : invoice.attempt_count === 3 ? "rd" : "th"}{" "}
                          attempt
                        </td>
                        <td className="px-6 py-4 text-right">
                          {invoice.status === "recovered" ? (
                            <span className="text-xs font-medium text-[#64cafa]">
                              Recovered
                            </span>
                          ) : (
                            <RetryEmailButton invoiceId={invoice.id} />
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            <div className="flex items-center justify-between border-t border-white/[0.06] px-5 py-3.5 text-[11px] text-[#777f75] sm:px-6">
              <span>Showing {rows.length} invoice{rows.length === 1 ? "" : "s"}</span>
              <span className="flex items-center gap-1.5">
                <ShieldCheck aria-hidden="true" size={13} />
                Protected by Stripe
              </span>
            </div>
          </section>

          <footer className="mt-7 flex flex-col items-center justify-between gap-3 text-[11px] text-[#6d746b] sm:flex-row">
            <span>© 2026 RevivePay. Recover revenue with confidence.</span>
            <div className="flex items-center gap-5">
              <a
                className="inline-flex items-center gap-1.5 transition hover:text-[#c7cec4]"
                href="mailto:support@revivepay.com"
              >
                <LifeBuoy aria-hidden="true" size={13} />
                Support
              </a>
              <a
                className="inline-flex items-center gap-1.5 transition hover:text-[#c7cec4]"
                href="https://docs.stripe.com/webhooks"
                rel="noreferrer"
                target="_blank"
              >
                <CircleHelp aria-hidden="true" size={13} />
                Help center
              </a>
            </div>
          </footer>
        </div>
      </main>
    </div>
  );
}

function MetricCard({
  description,
  icon,
  label,
  value,
  trendIcon,
  trendLabel,
  tone,
}: {
  description: string;
  icon: React.ReactNode;
  label: string;
  value: string;
  trendIcon: React.ReactNode;
  trendLabel: string;
  tone: "blue" | "amber";
}) {
  const color =
    tone === "blue"
      ? "text-[#64cafa] bg-[#123044]"
      : "text-[#e6bf68] bg-[#292418]";

  return (
    <article className="rounded-xl border border-white/[0.08] bg-[#0e1821] p-5 sm:p-5">
      <div className="flex items-start justify-between">
        <div className={`flex size-9 items-center justify-center rounded-lg ${color}`}>
          {icon}
        </div>
        <button
          aria-label={`More about ${label}`}
          className="rounded-md p-1 text-[#657064] transition hover:bg-white/[0.05] hover:text-white"
          title={description}
          type="button"
        >
          <MoreHorizontal aria-hidden="true" size={17} />
        </button>
      </div>
      <p className="mt-5 text-xs text-[#939b91]">{label}</p>
      <div className="mt-1.5 flex items-end justify-between gap-3">
        <p className="text-[27px] font-semibold tracking-[-0.04em]">{value}</p>
        <span
          className={`mb-1 inline-flex items-center gap-1 whitespace-nowrap text-[10px] font-medium ${tone === "blue" ? "text-[#64cafa]" : "text-[#e3bd69]"}`}
        >
          {trendIcon}
          {trendLabel}
        </span>
      </div>
      <p className="mt-2 text-[11px] text-[#6f776d]">{description}</p>
    </article>
  );
}

function StatusBadge({ status }: { status: Invoice["status"] }) {
  const recovered = status === "recovered";
  const styles = recovered
    ? "border-[#174b64] bg-[#102431] text-[#8bdcff]"
    : status === "failed"
      ? "border-[#5b392d] bg-[#261914] text-[#f0a382]"
      : "border-[#5b4a28] bg-[#262115] text-[#e8c576]";

  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-medium ${styles}`}>
      <span
        className={`size-1.5 rounded-full ${recovered ? "bg-[#13b9f3]" : status === "failed" ? "bg-[#f19876]" : "bg-[#e8c576]"}`}
      />
      {statusLabel(status)}
    </span>
  );
}

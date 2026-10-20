import Image from "next/image";
import { notFound } from "next/navigation";
import {
  ArrowUpRight,
  Bell,
  CircleHelp,
  CreditCard,
  LayoutDashboard,
  LifeBuoy,
  MoreHorizontal,
  ShieldCheck,
  Sparkles,
  Wallet,
} from "lucide-react";

export const metadata = {
  title: "Dashboard preview",
};

export const instant = false;

const sampleInvoices = [
  {
    name: "Olivia Rhye",
    email: "olivia@acmecorp.com",
    amount: "$249.00",
    status: "Action needed",
    date: "Oct 16, 2026",
    attempt: "2nd attempt",
    initials: "O",
  },
  {
    name: "Phoenix Baker",
    email: "phoenix@linear.co",
    amount: "$89.00",
    status: "Action needed",
    date: "Oct 15, 2026",
    attempt: "1st attempt",
    initials: "P",
  },
  {
    name: "Lana Steiner",
    email: "lana@layers.to",
    amount: "$149.00",
    status: "Recovered",
    date: "Oct 14, 2026",
    attempt: "3rd attempt",
    initials: "L",
  },
  {
    name: "Demi Wilkinson",
    email: "demi@circooles.com",
    amount: "$59.00",
    status: "Past due",
    date: "Oct 12, 2026",
    attempt: "4th attempt",
    initials: "D",
  },
];

export default function PreviewPage() {
  if (process.env.NODE_ENV !== "development") {
    notFound();
  }

  return (
    <div className="min-h-screen bg-[#080f16] text-[#eef4f7]">
      <aside className="fixed inset-y-0 left-0 z-20 hidden w-[236px] flex-col border-r border-white/[0.07] bg-[#0b141d] px-4 py-6 lg:flex">
        <div className="flex items-center gap-3 px-2">
          <Image
            alt="RevivePay shield logo"
            className="size-10 rounded-lg border border-white/10 object-cover"
            height={40}
            src="/revivepay-logo.jpg"
            width={40}
          />
          <span className="text-[17px] font-semibold tracking-tight">RevivePay</span>
        </div>
        <p className="mt-10 px-3 text-[10px] font-semibold uppercase tracking-[0.18em] text-[#6d8290]">
          Workspace
        </p>
        <nav aria-label="Main navigation" className="mt-3 space-y-1">
          <a className="flex h-10 items-center gap-3 rounded-lg bg-[#102938] px-3 text-sm font-medium text-[#8bdcff]" href="#overview">
            <LayoutDashboard aria-hidden="true" size={17} />
            Overview
          </a>
          <a className="flex h-10 items-center gap-3 rounded-lg px-3 text-sm text-[#96a5af] hover:bg-white/[0.04]" href="#invoices">
            <CreditCard aria-hidden="true" size={17} />
            Failed invoices
            <span className="ml-auto rounded-md bg-white/[0.08] px-1.5 py-0.5 text-[10px]">3</span>
          </a>
        </nav>
        <div className="mt-auto rounded-xl border border-white/[0.08] bg-[#101b25] p-4">
          <div className="flex size-8 items-center justify-center rounded-lg bg-[#123044] text-[#64cafa]">
            <ShieldCheck aria-hidden="true" size={16} />
          </div>
          <p className="mt-3 text-sm font-medium">Your recovery engine</p>
          <p className="mt-1 text-xs leading-5 text-[#8796a0]">
            Failed payments are monitored around the clock.
          </p>
          <div className="mt-5 flex items-center gap-3 border-t border-white/[0.07] pt-4">
            <span className="flex size-9 items-center justify-center rounded-full bg-[#173448] text-xs font-semibold text-[#a9e4fb]">
              S
            </span>
            <span className="text-xs text-[#d8e1e6]">sam@acmecorp.com</span>
          </div>
        </div>
      </aside>

      <main className="min-h-screen lg:pl-[236px]" id="overview">
        <header className="sticky top-0 z-10 flex h-[66px] items-center justify-between border-b border-white/[0.07] bg-[#080f16]/90 px-5 backdrop-blur-xl sm:px-8">
          <div className="flex items-center gap-3">
            <Image
              alt="RevivePay shield logo"
              className="size-8 rounded-lg border border-white/10 object-cover lg:hidden"
              height={32}
              src="/revivepay-logo.jpg"
              width={32}
            />
            <span className="text-sm font-medium text-[#d6e0e6]">Overview</span>
            <span className="hidden text-[#515f69] sm:inline">/</span>
            <span className="hidden text-sm text-[#91a0aa] sm:inline">Dashboard</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="hidden items-center gap-2 rounded-full border border-[#174b64] bg-[#102431] px-3 py-1.5 text-[11px] font-medium text-[#8bdcff] sm:flex">
              <span className="size-1.5 rounded-full bg-[#13b9f3]" />
              Stripe connected
            </span>
            <button aria-label="Notifications" className="flex size-9 items-center justify-center rounded-lg border border-white/[0.08] text-[#929fa7]" type="button">
              <Bell aria-hidden="true" size={16} />
            </button>
          </div>
        </header>

        <div className="mx-auto max-w-[1440px] px-5 pb-12 pt-8 sm:px-8 sm:pt-10">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-[#174b64] bg-[#102431] px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-[#8bdcff]">
            <span className="size-1.5 rounded-full bg-[#13b9f3]" />
            Sample dashboard preview
          </div>
          <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
            <div>
              <p className="flex items-center gap-2 text-xs text-[#8d9ba4]">
                <span>Workspace</span><span className="text-[#535f68]">/</span><span className="text-[#c0cbd1]">Overview</span>
              </p>
              <h1 className="mt-3 text-[27px] font-semibold tracking-[-0.04em] sm:text-[32px]">
                Good to see you again.
              </h1>
              <p className="mt-1.5 text-sm text-[#929fa7]">
                Here&apos;s what&apos;s happening with your payment recovery.
              </p>
            </div>
            <a className="inline-flex h-10 items-center justify-center gap-2 self-start rounded-lg bg-[#13b9f3] px-4 text-xs font-semibold text-[#06131b] transition hover:bg-[#38c8fa] sm:self-auto" href="#invoices">
              <Sparkles aria-hidden="true" size={15} />
              Review failed payments
            </a>
          </div>

          <section aria-label="Payment recovery metrics" className="mt-7 grid gap-4 md:grid-cols-3">
            <Metric label="Recovered revenue" value="$1,284.00" note="4 invoices recovered" icon={<Wallet aria-hidden="true" size={17} />} />
            <Metric label="Active failed invoices" value="3" note="Needs follow-up" icon={<CreditCard aria-hidden="true" size={17} />} />
            <Metric label="Recovery rate" value="68%" note="8 of 12 invoices" icon={<Sparkles aria-hidden="true" size={17} />} />
          </section>

          <section className="mt-8 overflow-hidden rounded-xl border border-white/[0.08] bg-[#0e1821]" id="invoices">
            <div className="flex flex-col gap-3 border-b border-white/[0.07] px-5 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-6">
              <div>
                <div className="flex items-center gap-2.5">
                  <h2 className="text-[15px] font-semibold">Failed invoices</h2>
                  <span className="rounded-md border border-white/[0.08] bg-white/[0.04] px-2 py-0.5 text-[10px] text-[#a7b2b9]">12 total</span>
                </div>
                <p className="mt-1 text-xs text-[#8997a0]">Keep an eye on payments that need a little extra attention.</p>
              </div>
              <div className="flex items-center gap-2 self-start rounded-lg border border-white/[0.08] bg-[#121e28] px-3 py-2 text-xs text-[#afb9bf] sm:self-auto">
                <span className="size-1.5 rounded-full bg-[#13b9f3]" />
                Live data
                <MoreHorizontal aria-hidden="true" className="ml-2 text-[#788791]" size={15} />
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[850px] border-collapse text-left">
                <thead>
                  <tr className="border-b border-white/[0.06] text-[10px] font-semibold uppercase tracking-[0.1em] text-[#84929b]">
                    <th className="px-6 py-3.5">Customer</th>
                    <th className="px-5 py-3.5">Amount due</th>
                    <th className="px-5 py-3.5">Status</th>
                    <th className="px-5 py-3.5">Date failed</th>
                    <th className="px-5 py-3.5">Attempt</th>
                    <th className="px-6 py-3.5 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.05]">
                  {sampleInvoices.map((invoice) => (
                    <tr className="transition hover:bg-white/[0.018]" key={invoice.email}>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-[#173448] text-xs font-semibold text-[#a9e4fb]">{invoice.initials}</span>
                          <div>
                            <p className="text-xs font-medium text-[#e0e7eb]">{invoice.name}</p>
                            <p className="mt-1 text-[11px] text-[#8b99a1]">{invoice.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-4 text-xs font-medium text-[#e1e8ec]">{invoice.amount}</td>
                      <td className="px-5 py-4">
                        <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-medium ${invoice.status === "Recovered" ? "border-[#174b64] bg-[#102431] text-[#8bdcff]" : invoice.status === "Past due" ? "border-[#5b392d] bg-[#261914] text-[#f0a382]" : "border-[#5b4a28] bg-[#262115] text-[#e8c576]"}`}>
                          <span className={`size-1.5 rounded-full ${invoice.status === "Recovered" ? "bg-[#13b9f3]" : invoice.status === "Past due" ? "bg-[#f19876]" : "bg-[#e8c576]"}`} />
                          {invoice.status}
                        </span>
                      </td>
                      <td className="px-5 py-4 text-xs text-[#a3afb6]">{invoice.date}</td>
                      <td className="px-5 py-4 text-xs text-[#a3afb6]">{invoice.attempt}</td>
                      <td className="px-6 py-4 text-right">
                        {invoice.status === "Recovered" ? (
                          <span className="text-xs font-medium text-[#64cafa]">Recovered</span>
                        ) : (
                          <button className="rounded-lg border border-white/[0.1] bg-[#121e28] px-3 py-2 text-xs font-medium text-[#dbe5eb] hover:border-[#1688b4] hover:text-[#8bdcff]" type="button">Retry email</button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="flex items-center justify-between border-t border-white/[0.06] px-5 py-3.5 text-[11px] text-[#8996a0] sm:px-6">
              <span>Showing 4 of 12 invoices</span>
              <span className="flex items-center gap-1.5"><ShieldCheck aria-hidden="true" size={13} />Protected by Stripe</span>
            </div>
          </section>
          <footer className="mt-7 flex flex-col items-center justify-between gap-3 text-[11px] text-[#829099] sm:flex-row">
            <span>© 2026 RevivePay. Recover revenue with confidence.</span>
            <div className="flex items-center gap-5">
              <a className="inline-flex items-center gap-1.5 hover:text-[#c7d4db]" href="mailto:support@revivepay.com"><LifeBuoy aria-hidden="true" size={13} />Support</a>
              <a className="inline-flex items-center gap-1.5 hover:text-[#c7d4db]" href="https://docs.stripe.com/webhooks" rel="noreferrer" target="_blank"><CircleHelp aria-hidden="true" size={13} />Help center</a>
            </div>
          </footer>
        </div>
      </main>
    </div>
  );
}

function Metric({
  label,
  value,
  note,
  icon,
}: {
  label: string;
  value: string;
  note: string;
  icon: React.ReactNode;
}) {
  return (
    <article className="rounded-xl border border-white/[0.08] bg-[#0e1821] p-5">
      <div className="flex items-start justify-between">
        <div className="flex size-9 items-center justify-center rounded-lg bg-[#123044] text-[#64cafa]">{icon}</div>
        <MoreHorizontal aria-hidden="true" className="text-[#788791]" size={17} />
      </div>
      <p className="mt-5 text-xs text-[#9aa7ae]">{label}</p>
      <div className="mt-1.5 flex items-end justify-between gap-3">
        <p className="text-[27px] font-semibold tracking-[-0.04em]">{value}</p>
        <span className="mb-1 inline-flex items-center gap-1 whitespace-nowrap text-[10px] font-medium text-[#64cafa]">
          <ArrowUpRight aria-hidden="true" size={15} />
          {note}
        </span>
      </div>
      <p className="mt-2 text-[11px] text-[#87949b]">Compared with all failed invoices</p>
    </article>
  );
}

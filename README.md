# RevivePay

RevivePay helps subscription businesses recover Stripe failed payments. It uses Next.js App Router, Supabase Auth/Postgres with row-level security, Stripe webhooks, and Resend.

The interface and email accents follow the RevivePay logo's electric-blue, silver, and charcoal palette. The supplied logo is served from `public/revivepay-logo.jpg`.

## Requirements

- Node.js 20+
- A Supabase project
- A Stripe platform account with Connect enabled
- A Resend account and verified sending domain

## Local setup

1. Install dependencies with `npm install`.
2. Copy `.env.example` to `.env.local` and fill in the project secrets.
3. Apply `supabase/migrations/20261017000000_initial_schema.sql` in the Supabase SQL editor.
4. In Supabase Auth settings, set the site URL and allowed redirect URLs for your local and production domains. Set email confirmation according to your account policy.
5. Run `npm run dev` and create an account at `/login`.
6. Link each user profile to their Stripe Connect account ID. For this MVP, set `stripe_account_id` on that user's `public.users` row through a trusted Supabase admin workflow; do not expose a Stripe secret key to the browser or store a connected account's secret key.
7. Create a Stripe webhook endpoint at `https://<your-domain>/api/webhooks/stripe`, enable events from connected accounts, and subscribe to `invoice.payment_failed` and `invoice.payment_succeeded`. Use the endpoint signing secret as `STRIPE_WEBHOOK_SECRET`.

The connected account ID is used to associate Stripe Connect events with a RevivePay user. Standard Stripe webhook signatures are verified against the unmodified request body before any processing. Failed invoice writes are idempotent by user and Stripe invoice ID.

## Environment variables

| Variable | Description |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase publishable/anon key |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service-role key, server-side only; bypasses RLS for verified webhooks |
| `STRIPE_SECRET_KEY` | Stripe platform secret key, server-side only |
| `STRIPE_WEBHOOK_SECRET` | Signing secret for the Stripe webhook endpoint |
| `RESEND_API_KEY` | Resend API key |
| `RESEND_FROM_EMAIL` | Verified sender, for example `RevivePay <billing@your-domain.com>` |

Never prefix private keys with `NEXT_PUBLIC_`. Supabase's service-role key and Stripe/Resend keys must only be configured in server environments.

## Useful commands

```bash
npm run dev
npm run lint
npm run build
```

## Operational notes

- Supabase Auth creates the matching `public.users` row with a database trigger. The SQL migration enables RLS for user profiles, failed invoices, and recovery logs.
- The dashboard uses the authenticated Supabase session and can only read that user's invoices. Manual retry requests are authenticated and rely on the same RLS policy.
- Stripe `amount_due` values are stored in the currency's smallest unit. Invoice amounts in the table are formatted using the invoice currency; the recovered revenue KPI explicitly totals USD invoices only and does not perform foreign-exchange conversion.
- Customer emails use Stripe's hosted invoice URL so customers can securely resolve the payment without RevivePay collecting payment details.
- Founder alerts go to `notification_email` when set, and otherwise to the user's verified account email.

# RevivePay

RevivePay helps subscription businesses recover Stripe failed payments. It uses Next.js App Router, Supabase Auth/Postgres with row-level security, Stripe Connect and Billing, and Resend.

## What the customer flow does

1. A customer signs up and confirms their email if Supabase confirmation is enabled.
2. They subscribe to the configured monthly RevivePay plan through Stripe Checkout.
3. After Stripe confirms the subscription, the customer authorizes their existing Stripe Standard account through Stripe Connect OAuth. RevivePay asks for read-only access.
4. The customer lands on the dashboard. Failed and recovered invoices arrive through the connected-account webhook. RevivePay sends customer/founder messages through Resend.
5. Customers can manage or cancel their RevivePay subscription through the Stripe Billing Portal.

The Stripe Billing subscription is the fee the customer pays RevivePay. It is separate from subscriptions and invoices the customer manages in their own connected Stripe account.

## Deploying for production

### 1. Create production Supabase

Create a Supabase project and run these migrations once each, in timestamp order, in the project SQL Editor:

1. `supabase/migrations/20261017000000_initial_schema.sql`
2. `supabase/migrations/20261020000000_billing_connect.sql`

The second migration adds the RevivePay billing fields and a private `stripe_connections` table. That table stores encrypted Stripe OAuth tokens and has no authenticated-user policies; only the server-side Supabase service-role client can access it.

In **Authentication → URL Configuration**, set the Site URL to the production site origin (for example `https://app.example.com`) and add `https://app.example.com/**` to allowed redirect URLs. Keep `http://localhost:3000/**` only if local development needs it.

From the Supabase API settings, obtain the project URL, anon/publishable key, and service-role key. Keep the service-role key private.

### 2. Configure Resend

Add a domain you control in Resend, publish the exact DNS records Resend provides, and wait for verification. Create an API key and choose a sender on that domain, for example `RevivePay <billing@example.com>`. Check existing SPF/DMARC records instead of publishing conflicting records.

### 3. Configure Stripe Connect for existing accounts

The app is designed to connect the customer's existing Stripe account because its invoices already exist there. It does not create a new Express account and never asks a customer for their Stripe password. The OAuth implementation requests `read_only` access, which is the least privilege needed to retrieve invoice/customer data.

1. Complete and verify the RevivePay platform's Stripe business account.
2. Contact Stripe and confirm that your platform is eligible to use Connect OAuth with `read_only` scope for an app that reads existing connected-account invoices. Stripe documents `read_only` OAuth as restricted to Stripe Apps/extensions; OAuth is not recommended for most new Connect platforms. Do not assume the OAuth code can be used in live mode until Stripe approves your use case.
3. If Stripe confirms eligibility, configure the Connect OAuth onboarding settings and register the exact callback URL:
   `https://<production-host>/api/connect/callback`
4. Copy the **live** Connect client ID (`ca_...`) to `STRIPE_CONNECT_CLIENT_ID`.
5. Customers authorize the correct existing Stripe account. Stripe's live connected-account events must be enabled for the platform webhook.

If Stripe does not approve read-only OAuth for this platform, stop before launching customer onboarding. Creating a new connected account with Account Links is a different integration and will not automatically provide access to historical invoices in a customer's separate existing Stripe account. Do not silently substitute wider `read_write` access.

Stripe's available Connect products and requirements depend on the platform's region/business model. Review Stripe Connect's terms, capabilities, and platform responsibilities before onboarding customers. See [OAuth scope restrictions](https://docs.stripe.com/connect/oauth-reference) and [Stripe Connect OAuth guidance](https://docs.stripe.com/connect/oauth-standard-accounts).

### 4. Create RevivePay's Stripe subscription price

In the Stripe platform account's **live mode**, create a Product for the RevivePay SaaS plan and an active, fixed per-unit recurring monthly Price with a positive amount. Metered, tiered, zero-cost, and non-monthly prices are not supported by this checkout flow. Record the Price ID (`price_...`) as `STRIPE_SUBSCRIPTION_PRICE_ID`.

Configure the Stripe Customer Portal in live mode so customers can update payment methods and cancel their subscriptions. RevivePay uses Stripe Checkout to start subscriptions and the portal for self-service billing management.

### 5. Import the GitHub repo into Vercel

Import `termuxzsh-ui/Revive_Pay` from the Vercel dashboard. Framework should be Next.js, Root Directory `./`, and Production Branch `main`. Keep the detected install/build settings. Add the environment variables below directly in Vercel—never commit secrets.

| Variable | Value | Environment |
| --- | --- | --- |
| `NEXT_PUBLIC_APP_URL` | Final site origin, such as `https://app.example.com`, without a trailing path | Production |
| `NEXT_PUBLIC_SUPABASE_URL` | Production Supabase Project URL | Production |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Production Supabase anon/publishable key | Production |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service-role key; server-only | Production Secret |
| `STRIPE_SECRET_KEY` | Live platform API secret key (`sk_live_...`) | Production Secret |
| `STRIPE_CONNECT_CLIENT_ID` | Live Connect OAuth client ID (`ca_...`) | Production |
| `STRIPE_SUBSCRIPTION_PRICE_ID` | Active monthly Stripe Price ID (`price_...`) | Production |
| `STRIPE_CONNECT_TOKEN_ENCRYPTION_KEY` | Base64 encoding of a randomly generated 32-byte key | Production Secret |
| `STRIPE_EXPECT_LIVEMODE` | `true` for live Production, `false` for Preview/local test mode | Every environment |
| `STRIPE_WEBHOOK_SECRET` | Live connected-account webhook signing secret (`whsec_...`) | Production Secret |
| `STRIPE_BILLING_WEBHOOK_SECRET` | Live platform-billing webhook signing secret (`whsec_...`) | Production Secret |
| `RESEND_API_KEY` | Production Resend API key | Production Secret |
| `RESEND_FROM_EMAIL` | Verified sender, e.g. `RevivePay <billing@example.com>` | Production |

Generate a separate 32-byte encryption key for production and keep a secure backup. For example, with Node.js:

```bash
node -e "console.log(require('node:crypto').randomBytes(32).toString('base64'))"
```

Run that command in a trusted terminal and paste its output directly into Vercel as the encryption key. Do not commit it or send it in chat. Losing this key means stored OAuth credentials can no longer be decrypted and connected customers will need to reconnect.

Never put secret keys in `NEXT_PUBLIC_` variables. Keep all live credentials scoped to Production, not Preview.

Set `STRIPE_EXPECT_LIVEMODE=true` only for the live Production deployment. Set it to `false` for local or test/Preview deployments that use Stripe test credentials. Production builds fail the Stripe OAuth flow if this variable is missing, and both webhook handlers ignore events whose `livemode` does not match the configured mode.

### 6. Deploy and set the final URL

Deploy the project and confirm the build succeeds. Vercel provides a `*.vercel.app` URL. If you use a custom domain, add it in Vercel **Settings → Domains**, publish the exact DNS values Vercel displays, and wait for HTTPS to activate. Set `NEXT_PUBLIC_APP_URL` to the final origin and redeploy if it changes.

The OAuth redirect URL must match the callback registered in Stripe exactly. In Stripe Connect OAuth settings register:

`<NEXT_PUBLIC_APP_URL>/api/connect/callback`

### 7. Configure two separate live webhooks

Both endpoints use the same `STRIPE_SECRET_KEY` platform account, but each has its own signing secret and purpose.

**Connected-account invoice events**

- URL: `<NEXT_PUBLIC_APP_URL>/api/webhooks/stripe`
- Events from connected accounts
- Snapshot event format
- Events: `invoice.payment_failed`, `invoice.payment_succeeded`, and `account.application.deauthorized`
- Save the endpoint signing secret as `STRIPE_WEBHOOK_SECRET`

**RevivePay subscription billing events**

- URL: `<NEXT_PUBLIC_APP_URL>/api/webhooks/stripe-billing`
- Events from the platform's own account (not connected accounts)
- Snapshot event format
- Events: `checkout.session.completed`, `customer.subscription.created`, `customer.subscription.updated`, `customer.subscription.deleted`
- Save this endpoint's separate signing secret as `STRIPE_BILLING_WEBHOOK_SECRET`

Add the two webhook secrets in Vercel and redeploy. Never swap the secrets between endpoints or modes. Stripe signs events using the exact endpoint's secret.

### 8. Verify Supabase redirects and customer onboarding

In Supabase Auth URL Configuration, confirm the Site URL and allowed redirects use the final HTTPS origin. Then test:

1. Sign up at `<NEXT_PUBLIC_APP_URL>/login` with an address you control.
2. Confirm email if enabled, then sign in.
3. The app sends the user to `/setup`. Checkout is unavailable until Vercel has a valid monthly Price ID.
4. Start Checkout and complete a subscription using an authorized payment method. Stripe calls the billing webhook; it updates the app profile status. Refresh setup if Stripe has not yet delivered the event.
5. Select **Connect with Stripe**. The customer signs in at Stripe, chooses their existing account, and grants read-only access.
6. Stripe redirects to `/api/connect/callback`. The app verifies a one-use state cookie tied to the signed-in user, exchanges the authorization code, encrypts the OAuth tokens with AES-256-GCM, and records the account association.
7. Once both subscription and connection are complete, the user reaches `/dashboard`.
8. Verify the account receives connected-account events at `/api/webhooks/stripe` and invoice records appear only for that customer.
9. Use **Manage subscription** to confirm the Stripe Billing Portal works.

The app requires `active` or `trialing` subscription status to access the dashboard and retry-email API. Cancellation, payment failure, or other non-active status returns the customer to setup/billing.

### 9. Launch checklist

- [ ] Both migrations applied successfully, in order, to the production database.
- [ ] Production Supabase Auth URL and redirects use the final HTTPS origin.
- [ ] Vercel Production has all variables above; Preview has no live secrets.
- [ ] The OAuth callback URL registered in Stripe exactly matches the deployed host.
- [ ] Stripe Connect OAuth uses the live client ID and read-only scope.
- [ ] The monthly Price is active, in the correct currency/amount, and the customer portal is configured.
- [ ] Both live webhooks have the correct event sources, snapshot format, URLs, event selections, and separate secrets.
- [ ] Signup, confirmation, checkout, billing webhook, OAuth, dashboard gate, portal, and connected invoice events have been verified.
- [ ] Resend sender is verified and test email delivery has been confirmed.
- [ ] Logs, database backups/restoration, support contact, privacy policy, terms, and incident response are ready.
- [ ] A controlled end-to-end check was performed without sending unauthorized email or charging an unintended customer.

## Environment variables

The local template is `.env.example`. Private keys and OAuth encryption material must remain server-side. Never expose them through a `NEXT_PUBLIC_` variable or commit real values.

## Local development

1. Install dependencies: `npm install`.
2. Copy `.env.example` to `.env.local`; fill in sandbox/test values privately. For Stripe OAuth testing, use the test Connect client ID and register `http://localhost:3000/api/connect/callback` in the Stripe sandbox OAuth settings.
3. Apply both migrations to a dedicated development Supabase project, in order.
4. Run `npm run dev`.
5. Use Stripe sandbox/test keys, a test monthly Price, and separate test webhook secrets. Do not use production credentials locally.

## Operational notes

- Auth signup triggers creation of a `public.users` row.
- A separate billing webhook updates subscription status; invoice events from connected accounts use the existing invoice webhook.
- OAuth tokens are encrypted before storage. The encryption key must be backed up securely.
- `stripe_connections` has RLS enabled and no authenticated policies; only the service-role server client can access it.
- The dashboard's retry action resends the dunning email. It does not retry a Stripe payment.
- Customer emails use Stripe-hosted invoice URLs; RevivePay does not collect customer payment details.
- Invoice amounts are stored in Stripe's smallest currency unit. The recovered revenue KPI currently totals USD invoices only and does not convert other currencies.
